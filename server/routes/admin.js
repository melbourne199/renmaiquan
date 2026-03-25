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
