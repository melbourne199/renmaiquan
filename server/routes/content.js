const express = require('express');
const { Group, EnterpriseLike, Project, HelpRequest, GovernmentResource } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// 所有内容路由都需要登录
router.use(authenticate);

// ===== 发布群码 =====

router.post('/groups', async (req, res) => {
  try {
    const { name, qrcode, owner_qrcode, industry_id, region, description, tags, member_count } = req.body;
    if (!name) return res.status(400).json({ error: '群名称不能为空' });
    if (!qrcode) return res.status(400).json({ error: '请上传群二维码' });

    const group = await Group.create({
      name, qrcode, owner_qrcode, industry_id, region,
      description, tags, member_count,
      user_id: req.user.id,
      status: 0,
      expire_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 默认30天
    });
    res.json({ success: true, group });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== 获取我的群码 =====

router.get('/groups', async (req, res) => {
  try {
    const groups = await Group.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']]
    });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== 删除群码 =====

router.delete('/groups/:id', async (req, res) => {
  try {
    const group = await Group.findOne({
      where: { id: req.params.id, user_id: req.user.id }
    });
    if (!group) return res.status(404).json({ error: '群码不存在或无权删除' });
    await group.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== 发布企业资源 =====

router.post('/enterprise-likes', async (req, res) => {
  try {
    const like = await EnterpriseLike.create({ ...req.body, user_id: req.user.id, status: 0 });
    res.json({ success: true, like });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== 发布项目 =====

router.post('/projects', async (req, res) => {
  try {
    const project = await Project.create({ ...req.body, user_id: req.user.id, status: 0 });
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== 发布求助 =====

router.post('/helps', async (req, res) => {
  try {
    const help = await HelpRequest.create({ ...req.body, user_id: req.user.id, status: 0 });
    res.json({ success: true, help });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== 发布政务资源 =====

router.post('/government', async (req, res) => {
  try {
    const gov = await GovernmentResource.create({ ...req.body, user_id: req.user.id, status: 0 });
    res.json({ success: true, gov });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
