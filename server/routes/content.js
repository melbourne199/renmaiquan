const express = require('express');
const { Group, EnterpriseLike, Project, HelpRequest, GovernmentResource } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// 所有内容路由都需要登录
router.use(authenticate);

// ===== 发布群码 =====

router.post('/groups', async (req, res) => {
  try {
    const group = await Group.create({ ...req.body, user_id: req.user.id, status: 0 });
    res.json({ success: true, group });
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
