const express = require('express');
const { sequelize, Group, EnterpriseLike, Project, HelpRequest, GovernmentResource, Referral } = require('../models');

const router = express.Router();

// ===== 公开内容（已审核通过的） =====

// 获取已通过的群码
router.get('/groups', async (req, res) => {
  try {
    const { industry_id, sort, id } = req.query;
    const where = { status: 1 };
    if (industry_id && industry_id !== 'all') {
      where.industry_id = industry_id;
    }
    if (id) {
      where.id = id;
    }

    let groups;
    if (sort === 'hot') {
      groups = await Group.findAll({
        where,
        order: [['view_count', 'DESC']]
      });
      // 按创建时间二次排序（在JS中处理）
      groups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else {
      groups = await Group.findAll({
        where,
        order: [['id', 'DESC']]
      });
    }
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取单个群码详情
router.get('/groups/:id', async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group || group.status !== 1) {
      return res.status(404).json({ error: '群码不存在或已下架' });
    }
    // 增加浏览次数
    group.view_count = (group.view_count || 0) + 1;
    await group.save();
    res.json(group);
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
