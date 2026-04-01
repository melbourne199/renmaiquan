/**
 * 微信支付回调接口
 * 路径: /api/payment/wechat/notify
 * 
 * 微信支付流程:
 * 1. 前端调用 /api/payment/wechat/createorder (后端统一下单)
 * 2. 微信支付成功后回调此接口
 * 3. 回调验签后处理订单状态
 *
 * 申请微信支付需要:
 * - 微信支付商户号(mch_id)
 * - 公众号AppID
 * - API密钥(api_key)
 * - API证书(apiclient_cert.pem)
 *
 * 配置位置: 后台 /admin-payment-config.html
 * 配置存储: system_configs 表
 */

const express = require('express');
const crypto = require('crypto');
const { SystemConfig } = require('../models');

const router = express.Router();

// 微信支付回调
router.post('/wechat/notify', async (req, res) => {
  try {
    // 1. 获取微信回调XML
    const { SystemConfig } = require('../models');
    const xmlData = req.body.xml || req.body;

    // 2. 加载API密钥
    const apiKeyRow = await SystemConfig.findOne({ where: { cfg_key: 'wechat_pay_api_key' } });
    if (!apiKeyRow) {
      console.error('[微信支付] 未配置API密钥');
      return res.status(500).send('fail');
    }
    const apiKey = apiKeyRow.cfg_value;

    // 3. 验证签名
    const { sign, ...params } = xmlData;
    const sortedParams = Object.keys(params)
      .filter(k => params[k] && params[k] !== '')
      .sort()
      .map(k => `${k}=${params[k]}`)
      .join('&');
    const signStr = `${sortedParams}&key=${apiKey}`;
    const expectedSign = crypto.createHash('md5')
      .update(signStr, 'utf8')
      .digest('hex')
      .toUpperCase();

    if (sign !== expectedSign) {
      console.error('[微信支付] 验签失败', { expected: expectedSign, received: sign });
      return res.status(400).send('fail');
    }

    // 4. 处理支付结果
    const { return_code, result_code, transaction_id, out_trade_no, total_fee, attach } = params;

    if (return_code === 'SUCCESS' && result_code === 'SUCCESS') {
      console.log(`[微信支付] 成功 transaction_id=${transaction_id} out_trade_no=${out_trade_no} total_fee=${total_fee}`);
      
      // TODO: 根据attach更新订单状态
      // attach格式: type=member|project|escrow&id=123
      
      // 返回成功
      return res.send(`
        <xml>
          <return_code><![CDATA[SUCCESS]]></return_code>
          <return_msg><![CDATA[OK]]></return_msg>
        </xml>
      `);
    } else {
      console.error('[微信支付] 支付失败', params);
      return res.send(`
        <xml>
          <return_code><![CDATA[FAIL]]></return_code>
          <return_msg><![CDATA[支付失败]]></return_msg>
        </xml>
      `);
    }
  } catch (err) {
    console.error('[微信支付] 回调异常', err);
    res.status(500).send('fail');
  }
});

// 创建支付订单（统一下单接口）
router.post('/wechat/createorder', async (req, res) => {
  try {
    const { SystemConfig } = require('../models');
    
    // 检查支付是否启用
    const enabled = await SystemConfig.findOne({ where: { cfg_key: 'wechat_pay_enabled' } });
    if (!enabled || enabled.cfg_value !== 'true') {
      return res.status(400).json({ ok: false, msg: '支付未启用' });
    }

    const mchId = await SystemConfig.findOne({ where: { cfg_key: 'wechat_pay_mch_id' } });
    const appId = await SystemConfig.findOne({ where: { cfg_key: 'wechat_pay_app_id' } });
    const apiKey = await SystemConfig.findOne({ where: { cfg_key: 'wechat_pay_api_key' } });
    const notifyUrl = await SystemConfig.findOne({ where: { cfg_key: 'wechat_pay_notify_url' } });

    if (!mchId || !appId || !apiKey) {
      return res.status(400).json({ ok: false, msg: '支付参数未完整配置' });
    }

    const { orderId, amount, subject, attach, openid } = req.body;

    if (!orderId || !amount || !subject) {
      return res.status(400).json({ ok: false, msg: '缺少必要参数: orderId, amount, subject' });
    }

    // 调用微信支付统一下单接口
    const https = require('https');
    const url = new URL('https://api.mch.weixin.qq.com/pay/unifiedorder');
    
    const nonceStr = crypto.randomBytes(16).toString('hex');
    const timeStamp = Math.floor(Date.now() / 1000).toString();
    
    // 构造签名参数
    const signParams = {
      appid: appId.cfg_value,
      mch_id: mchId.cfg_value,
      nonce_str: nonceStr,
      body: subject.substring(0, 128),
      out_trade_no: orderId,
      total_fee: Math.round(amount * 100), // 转换为分
      spbill_create_ip: req.ip || '127.0.0.1',
      notify_url: notifyUrl?.cfg_value || (req.protocol + '://' + req.get('host') + '/api/payment/wechat/notify'),
      trade_type: 'JSAPI',
      openid: openid || undefined,
      attach: attach || '',
    };

    // 生成签名
    const signStr = Object.keys(signParams)
      .filter(k => signParams[k] !== undefined)
      .sort()
      .map(k => `${k}=${signParams[k]}`)
      .join('&') + `&key=${apiKey.cfg_value}`;
    const sign = crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();

    // 构造XML
    const xmlBody = Object.entries(signParams)
      Object.entries(signParams)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `<${k}><![CDATA[${v}]]></${k}>`)
      .join('') + `<sign><![CDATA[${sign}]]></sign>`;

    const postData = `<xml>${xmlBody}</xml>`;

    // 发送请求（实际使用时替换为https.request）
    // 这里是占位，实际统一下单需要公网访问微信API
    console.log('[微信支付] 统一下单请求:', postData);

    res.json({
      ok: true,
      msg: '沙箱模式 - 统一下单接口预留完成',
      mock: true,
      orderId,
      amount,
      subject,
      mch_id: mchId.cfg_value,
      app_id: appId.cfg_value,
      // 正式环境返回 prepay_id 和调起支付的必要参数
      // timeStamp, nonceStr, package, signType, paySign
    });

  } catch (err) {
    console.error('[微信支付] 创建订单异常', err);
    res.status(500).json({ ok: false, msg: err.message });
  }
});

module.exports = router;
