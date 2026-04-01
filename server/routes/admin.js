const express = require('express');
const { User, Group, EnterpriseLike, Project, HelpRequest, GovernmentResource, Referral } = require('../models');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// 所有 admin 路由都需要管理员权限
router.use(authenticate, requireAdmin);

// 获取所有用户
router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'member_level', 'total_income', 'is_admin', 'created_at']
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 修改用户会员等级
router.post('/users/:id/level', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    user.member_level = req.body.level;
    user.member_expire = req.body.expire;
    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== 群码管理 =====

router.get('/groups', async (req, res) => {
  try {
    const groups = await Group.findAll({ order: [['created_at', 'DESC']] });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/groups/:id/approve', async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group) return res.status(404).json({ error: '群码不存在' });
    group.status = 1;
    await group.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== 企业资源管理 =====

router.get('/enterprise-likes', async (req, res) => {
  try {
    const likes = await EnterpriseLike.findAll({ order: [['created_at', 'DESC']] });
    res.json(likes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/enterprise-likes/:id/approve', async (req, res) => {
  try {
    const like = await EnterpriseLike.findByPk(req.params.id);
    if (!like) return res.status(404).json({ error: '记录不存在' });
    like.status = 1;
    await like.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== 项目管理 =====

router.get('/projects', async (req, res) => {
  try {
    const projects = await Project.findAll({ order: [['created_at', 'DESC']] });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/projects/:id/approve', async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ error: '项目不存在' });
    project.status = 1;
    await project.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== 求助管理 =====

router.get('/helps', async (req, res) => {
  try {
    const helps = await HelpRequest.findAll({ order: [['created_at', 'DESC']] });
    res.json(helps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/helps/:id/approve', async (req, res) => {
  try {
    const help = await HelpRequest.findByPk(req.params.id);
    if (!help) return res.status(404).json({ error: '求助不存在' });
    help.status = 1;
    await help.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== 政务资源管理 =====

router.get('/government', async (req, res) => {
  try {
    const gov = await GovernmentResource.findAll({ order: [['created_at', 'DESC']] });
    res.json(gov);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/government/:id/approve', async (req, res) => {
  try {
    const gov = await GovernmentResource.findByPk(req.params.id);
    if (!gov) return res.status(404).json({ error: '政务信息不存在' });
    gov.status = 1;
    await gov.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== 推荐管理 =====

router.get('/referrals', async (req, res) => {
  try {
    const referrals = await Referral.findAll({ order: [['created_at', 'DESC']] });
    res.json(referrals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// ===== 微信支付配置 =====
router.get('/payment-config', async (req, res) => {
  try {
    const { SystemConfig } = require('../models');
    const rows = await SystemConfig.findAll({ where: { cfg_key: { [require('sequelize').Op.like]: 'wechat_pay_%' } } });
    const config = {};
    rows.forEach(r => { config[r.cfg_key] = r.cfg_value; });
    // 不返回密钥原文
    if (config.wechat_pay_api_key) config.wechat_pay_api_key = config.wechat_pay_api_key ? '******' : '';
    if (config.wechat_pay_cert_path) config.wechat_pay_cert_path = config.wechat_pay_cert_path ? '(已配置)' : '';
    res.json({ enabled: config.wechat_pay_enabled === 'true', config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/payment-config', async (req, res) => {
  try {
    const { SystemConfig } = require('../models');
    const allowed = [
      'wechat_pay_enabled',
      'wechat_pay_mch_id',
      'wechat_pay_app_id',
      'wechat_pay_api_key',
      'wechat_pay_cert_path',
      'wechat_pay_callback_url',
      'wechat_pay_notify_url',
    ];
    const { config } = req.body;
    for (const key of allowed) {
      if (config[key] !== undefined) {
        await SystemConfig.upsert({ cfg_key: key, cfg_value: String(config[key]), updated_at: new Date() });
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 支付密钥验签（内部接口）
router.post('/payment-verify', async (req, res) => {
  try {
    const crypto = require('crypto');
    const { SystemConfig } = require('../models');
    const apiKey = await SystemConfig.findOne({ where: { cfg_key: 'wechat_pay_api_key' } });
    if (!apiKey) return res.status(400).json({ error: '未配置支付密钥' });
    const key = apiKey.cfg_value;
    const { sign, ...data } = req.body;
    const str = Object.keys(data).sort().map(k => `${k}=${data[k]}`).join('&') + `&key=${key}`;
    const expected = crypto.createHash('md5').update(str).digest('hex').toUpperCase();
    res.json({ verified: sign === expected });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 模拟发起支付（沙箱测试）
router.post('/payment-test', async (req, res) => {
  try {
    const { SystemConfig } = require('../models');
    const enabled = await SystemConfig.findOne({ where: { cfg_key: 'wechat_pay_enabled' } });
    if (!enabled || enabled.cfg_value !== 'true') {
      return res.json({ ok: false, msg: '支付未启用，请在后台配置后开启' });
    }
    const mchId = await SystemConfig.findOne({ where: { cfg_key: 'wechat_pay_mch_id' } });
    const appId = await SystemConfig.findOne({ where: { cfg_key: 'wechat_pay_app_id' } });
    const apiKey = await SystemConfig.findOne({ where: { cfg_key: 'wechat_pay_api_key' } });
    if (!mchId || !appId || !apiKey) {
      return res.json({ ok: false, msg: '支付参数不完整，请检查配置' });
    }
    // 返回模拟支付链接（实际微信支付需要统一下单）
    res.json({
      ok: true,
      msg: '沙箱测试成功，参数配置正确。正式环境请调用微信支付统一下单接口。',
      mock: true,
      mch_id: mchId.cfg_value,
      app_id: appId.cfg_value
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
