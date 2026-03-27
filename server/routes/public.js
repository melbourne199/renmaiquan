const express = require('express');
const { Group, EnterpriseLike, Project, HelpRequest, GovernmentResource, Referral } = require('../models');

const router = express.Router();

// ===== 公开内容（已审核通过的） =====

// 获取已通过的群码
router.get('/groups', async (req, res) => {
  try {
    const { industry_id, sort } = req.query;
    const where = { status: 1 };
    if (industry_id && industry_id !== 'all') {
      where.industry_id = industry_id;
    }
    const order = sort === 'hot'
      ? [['view_count', 'DESC'], ['created_at', 'DESC']]
      : [['created_at', 'DESC']];

    const groups = await Group.findAll({ where, order });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取已通过的企业资源
router.get('/enterprise-likes', async (req, res) => {
  try {
    const likes = await EnterpriseLike.findAll({ where: { status: 1 } });
    res.json(likes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取已通过的项目
router.get('/projects', async (req, res) => {
  try {
    const projects = await Project.findAll({ where: { status: 1 } });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取已通过的求助
router.get('/helps', async (req, res) => {
  try {
    const helps = await HelpRequest.findAll({ where: { status: 1 } });
    res.json(helps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取已通过的政务资源
router.get('/government', async (req, res) => {
  try {
    const gov = await GovernmentResource.findAll({ where: { status: 1 } });
    res.json(gov);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
