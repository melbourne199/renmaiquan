const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// 提交站长申请
router.post('/apply', async (req, res) => {
  try {
    const { name, mobile, wechat, region, background } = req.body;

    if (!name || !mobile) {
      return res.status(400).json({ error: '姓名和手机号不能为空' });
    }
    if (!/^1[0-9]{10}$/.test(mobile)) {
      return res.status(400).json({ error: '请输入正确的11位手机号' });
    }

    // 生成申请编号
    const applyId = 'ZZ' + Date.now();
    const applyTime = new Date();

    // TODO: 存入数据库
    // const apply = await StationApply.create({ applyId, name, mobile, wechat, region, background, applyTime, status: 'pending' });

    // 临时返回成功
    res.json({
      success: true,
      message: '申请已提交，请添加管理员微信确认',
      applyId,
      applyTime: applyTime.toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取申请状态（需要登录）
router.get('/status', authenticate, async (req, res) => {
  try {
    // TODO: 从数据库查询申请状态
    res.json({ status: 'pending', message: '审核中' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
