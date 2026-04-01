const express = require('express');
const { sequelize, Group, EnterpriseLike, Project, HelpRequest, GovernmentResource, Referral, User } = require('../models');

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

// 搜索资源（行业、企业名称、部门、城市、职位/关键词）
router.get('/search', async (req, res) => {
  try {
    const { keyword } = req.query;
    if (!keyword || keyword.trim() === '') {
      return res.json({ success: false, message: '请输入搜索关键词' });
    }

    const kw = keyword.trim();
    const results = [];

    // 搜索企业资源（匹配行业、企业名称、部门、地区）
    const enterprises = await EnterpriseLike.findAll({ where: { status: 1 } });
    for (const ent of enterprises) {
      const matchScore = [
        ent.industry || '',
        ent.company_name || '',
        ent.department || '',
        ent.region || ''
      ].filter(field => field.toLowerCase().includes(kw.toLowerCase())).length;

      if (matchScore > 0) {
        results.push({
          type: 'enterprise',
          id: ent.id,
          title: `${ent.industry || '未知行业'} - ${ent.region || '未知地区'} - ${ent.department || '未知部门'}`,
          industry: ent.industry,
          region: ent.region,
          department: ent.department,
          company_name: ent.company_name,
          user_id: ent.user_id,
          matchScore
        });
      }
    }

    // 搜索求助信息（匹配描述、目标企业、地区、行业）
    const helps = await HelpRequest.findAll({ where: { status: 1 } });
    for (const help of helps) {
      const matchScore = [
        help.description || '',
        help.target_company || '',
        help.region || '',
        help.business_type || ''
      ].filter(field => field.toLowerCase().includes(kw.toLowerCase())).length;

      if (matchScore > 0) {
        results.push({
          type: 'help',
          id: help.id,
          title: `${help.region || '未知地区'} - ${help.business_type || '未知行业'} - 求助`,
          region: help.region,
          business_type: help.business_type,
          description: help.description,
          user_id: help.user_id,
          matchScore
        });
      }
    }

    // 按匹配度排序
    results.sort((a, b) => b.matchScore - a.matchScore);

    res.json({
      success: true,
      keyword: kw,
      count: results.length,
      results: results.slice(0, 10) // 最多返回10条
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取资源详情（包含发布者会员状态）
router.get('/resource/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    let resource;
    let userId;

    if (type === 'enterprise') {
      resource = await EnterpriseLike.findByPk(id);
      if (resource) userId = resource.user_id;
    } else if (type === 'help') {
      resource = await HelpRequest.findByPk(id);
      if (resource) userId = resource.user_id;
    } else {
      return res.status(400).json({ error: '无效的资源类型' });
    }

    if (!resource || resource.status !== 1) {
      return res.status(404).json({ error: '资源不存在或未审核' });
    }

    // 获取发布者会员状态
    const user = await User.findByPk(userId);
    const isMember = user && user.member_level > 0 && new Date(user.member_expire) > new Date();

    res.json({
      success: true,
      resource,
      isMember,
      contact_qrcode: isMember ? resource.contact_qrcode : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// 获取迁移的资源数据(yigehui) - 兼容enterprise-list格式
router.get('/resources', async (req, res) => {
  try {
    const { sequelize } = require('../models');
    
    try {
      const [results] = await sequelize.query(
        "SELECT * FROM resources WHERE source = 'yigehui' LIMIT 100"
      );
      // 转换为前端期望的格式
      const formatted = (results || []).map(r => ({
        id: r.id,
        company_name: r.company || r.title || '未命名',
        department: r.department || '',
        industry: r.industry || '',
        position: r.position || '',
        region: r.region || '',
        description: r.description || '',
        reward: r.reward || '',
        familiarity: r.relation_type === 'cooperation' ? '合作过，随时约' : r.relation_type === 'friend_referral' ? '通过朋友约' : '间接关系',
        contact_person: r.contact_person || '',
        phone: r.phone || '',
        created_at: r.created_at
      }));
      res.json(formatted);
    } catch (e) {
      res.json([]);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
