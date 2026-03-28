const express = require('express');
const router = express.Router();
const { EscortProject, EscortParticipant, User } = require('../models');
const { authenticate } = require('../middleware/auth');

// 生成随机邀请码
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 计算分润比例
function calculateFees(totalFee) {
  return {
    level1Percent: 30, // 每岸一级 30%
    level2Percent: 40, // 二级总共 40%
    totalLevel1: 60    // 两岸一级共 60%
  };
}

// 创建居间项目
router.post('/projects', authenticate, async (req, res) => {
  try {
    const { title, description, total_fee, party_a_name, party_b_name, expire_date, l1_required } = req.body;
    const creator_id = req.user.id;

    if (!title || !total_fee) {
      return res.json({ success: false, message: '请填写必填项' });
    }

    let invite_code;
    do {
      invite_code = generateInviteCode();
    } while (await EscortProject.findOne({ where: { invite_code } }));

    const project = await EscortProject.create({
      creator_id,
      title,
      description,
      total_fee,
      party_a_name: party_a_name || '甲方',
      party_b_name: party_b_name || '乙方',
      status: 0,
      l1_required: l1_required !== undefined ? (l1_required ? 1 : 0) : 1,
      expire_date,
      invite_code
    });

    // 创建者自动成为甲方拍板人
    await EscortParticipant.create({
      project_id: project.id,
      user_id: creator_id,
      side: 0,
      role: 0, // 拍板人
      status: 1,
      fee_percent: 30,
      confirm_time: new Date()
    });

    res.json({
      success: true,
      data: {
        id: project.id,
        invite_code: project.invite_code,
        title: project.title
      }
    });
  } catch (err) {
    console.error('创建居间项目失败:', err);
    res.json({ success: false, message: '创建失败' });
  }
});

// 加入项目（通过邀请码）
router.post('/projects/join', authenticate, async (req, res) => {
  try {
    const { invite_code, side, role, parent_id } = req.body;
    const user_id = req.user.id;

    if (!invite_code || side === undefined || role === undefined) {
      return res.json({ success: false, message: '请填写完整信息' });
    }

    const project = await EscortProject.findOne({ where: { invite_code } });
    if (!project) {
      return res.json({ success: false, message: '邀请码无效' });
    }

    // 检查用户是否已在项目中
    const existing = await EscortParticipant.findOne({
      where: { project_id: project.id, user_id }
    });
    if (existing) {
      return res.json({ success: false, message: '您已在该项目中' });
    }

    // 检查该方是否已有一级引荐人
    if (role === 1) { // 一级引荐人
      const hasLevel1 = await EscortParticipant.findOne({
        where: { project_id: project.id, side, role: 1 }
      });
      if (hasLevel1) {
        return res.json({ success: false, message: '该方已有一级引荐人' });
      }
    }

    const participant = await EscortParticipant.create({
      project_id: project.id,
      user_id,
      side,
      role,
      parent_id,
      status: 1,
      confirm_time: new Date()
    });

    res.json({
      success: true,
      data: {
        id: participant.id,
        project_id: project.id,
        side: participant.side,
        role: participant.role
      }
    });
  } catch (err) {
    console.error('加入项目失败:', err);
    res.json({ success: false, message: '加入失败' });
  }
});

// 获取项目详情
router.get('/projects/:id', async (req, res) => {
  try {
    const project = await EscortProject.findByPk(req.params.id, {
      include: [{
        model: EscortParticipant,
        as: 'participants',
        include: [{ model: User, attributes: ['id', 'username'] }]
      }]
    });

    if (!project) {
      return res.json({ success: false, message: '项目不存在' });
    }

    // 计算分润
    const fees = calculateFees(project.total_fee);
    const participants = project.participants || [];

    // 分组统计
    const aSide = participants.filter(p => p.side === 0);
    const bSide = participants.filter(p => p.side === 1);

    res.json({
      success: true,
      data: {
        id: project.id,
        title: project.title,
        description: project.description,
        total_fee: project.total_fee,
        party_a_name: project.party_a_name,
        party_b_name: project.party_b_name,
        status: project.status,
        l1_required: project.l1_required,
        invite_code: project.invite_code,
        fees,
        a_side: {
          decision_maker: aSide.find(p => p.role === 0),
          level1: aSide.find(p => p.role === 1),
          level2: aSide.filter(p => p.role === 2)
        },
        b_side: {
          decision_maker: bSide.find(p => p.role === 0),
          level1: bSide.find(p => p.role === 1),
          level2: bSide.filter(p => p.role === 2)
        }
      }
    });
  } catch (err) {
    console.error('获取项目详情失败:', err);
    res.json({ success: false, message: '获取失败' });
  }
});

// 通过邀请码获取项目
router.get('/projects/by-code/:code', async (req, res) => {
  try {
    const project = await EscortProject.findOne({
      where: { invite_code: req.params.code }
    });

    if (!project) {
      return res.json({ success: false, message: '邀请码无效' });
    }

    res.json({
      success: true,
      data: {
        id: project.id,
        title: project.title,
        party_a_name: project.party_a_name,
        party_b_name: project.party_b_name,
        status: project.status,
        total_fee: project.total_fee
      }
    });
  } catch (err) {
    console.error('获取项目失败:', err);
    res.json({ success: false, message: '获取失败' });
  }
});

// 获取我的居间项目列表
router.get('/my-projects', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const participations = await EscortParticipant.findAll({
      where: { user_id: userId },
      include: [{
        model: EscortProject,
        as: 'project'
      }]
    });

    const projects = participations.map(p => ({
      id: p.project.id,
      title: p.project.title,
      side: p.side,
      role: p.role,
      status: p.project.status,
      total_fee: p.project.total_fee,
      joined_at: p.join_time
    }));

    res.json({ success: true, data: projects });
  } catch (err) {
    console.error('获取项目列表失败:', err);
    res.json({ success: false, message: '获取失败' });
  }
});

// 添加项目关系（我认识谁）
router.post('/participants', authenticate, async (req, res) => {
  try {
    const { project_id, target_side, target_role, target_user_id } = req.body;
    const user_id = req.user.id;

    // 验证用户在项目中
    const myPart = await EscortParticipant.findOne({
      where: { project_id, user_id }
    });
    if (!myPart) {
      return res.json({ success: false, message: '您不在该项目中' });
    }

    // 添加引荐关系
    const participant = await EscortParticipant.create({
      project_id,
      user_id: target_user_id || 0, // 待注册用户
      side: target_side,
      role: target_role,
      parent_id: user_id,
      status: 0 // 待确认
    });

    res.json({ success: true, data: { id: participant.id } });
  } catch (err) {
    console.error('添加参与者失败:', err);
    res.json({ success: false, message: '添加失败' });
  }
});

// 更新项目状态
router.put('/projects/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const project = await EscortProject.findByPk(req.params.id);

    if (!project) {
      return res.json({ success: false, message: '项目不存在' });
    }

    project.status = status;
    await project.save();

    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: '更新失败' });
  }
});

module.exports = router;
