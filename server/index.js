const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

dotenv.config();

const sequelize = new Sequelize('renmaiquan', 'renmai_user', 'Renmai@2026db', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

(async () => {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');
  } catch (err) {
    console.error('数据库连接失败:', err);
  }
})();

const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  member_level: { type: DataTypes.TINYINT, defaultValue: 0 },
  member_expire: { type: DataTypes.DATE },
  total_income: { type: DataTypes.DECIMAL(10,2), defaultValue: 0.00 }
}, { tableName: 'users', timestamps: false, createdAt: 'created_at' });

const Group = sequelize.define('Group', {
  user_id: DataTypes.INTEGER,
  name: DataTypes.STRING,
  qrcode: DataTypes.STRING,
  owner_qrcode: DataTypes.STRING,
  industry_id: DataTypes.INTEGER,
  region: DataTypes.STRING,
  expire_time: DataTypes.DATE,
  status: { type: DataTypes.TINYINT, defaultValue: 0 }
}, { tableName: 'groups', timestamps: false, createdAt: 'created_at' });

const EnterpriseLike = sequelize.define('EnterpriseLike', {
  user_id: DataTypes.INTEGER,
  company_name: DataTypes.STRING,
  department: DataTypes.STRING,
  region: DataTypes.STRING,
  expire_date: DataTypes.DATE,
  contact_qrcode: DataTypes.STRING,
  status: { type: DataTypes.TINYINT, defaultValue: 0 }
}, { tableName: 'enterprise_likes', timestamps: false, createdAt: 'created_at' });

const Project = sequelize.define('Project', {
  user_id: DataTypes.INTEGER,
  title: DataTypes.STRING,
  description: DataTypes.TEXT,
  amount: DataTypes.DECIMAL(10,2),
  requirement: DataTypes.TEXT,
  progress: DataTypes.TEXT,
  industry_id: DataTypes.INTEGER,
  region: DataTypes.STRING,
  expire_date: DataTypes.DATE,
  status: { type: DataTypes.TINYINT, defaultValue: 0 }
}, { tableName: 'projects', timestamps: false, createdAt: 'created_at' });

const HelpRequest = sequelize.define('HelpRequest', {
  user_id: DataTypes.INTEGER,
  description: DataTypes.TEXT,
  target_company: DataTypes.STRING,
  region: DataTypes.STRING,
  business_type: DataTypes.STRING,
  reward_amount: DataTypes.DECIMAL(10,2),
  expire_date: DataTypes.DATE,
  contact_info: DataTypes.TEXT,
  status: { type: DataTypes.TINYINT, defaultValue: 0 }
}, { tableName: 'help_requests', timestamps: false, createdAt: 'created_at' });

const GovernmentResource = sequelize.define('GovernmentResource', {
  user_id: DataTypes.INTEGER,
  business_type: DataTypes.STRING,
  province: DataTypes.STRING,
  city: DataTypes.STRING,
  district: DataTypes.STRING,
  level_code: DataTypes.STRING,
  familiarity: DataTypes.STRING,
  has_case: DataTypes.BOOLEAN,
  expire_date: DataTypes.DATE,
  contact_qrcode: DataTypes.STRING,
  status: { type: DataTypes.TINYINT, defaultValue: 0 }
}, { tableName: 'government_resources', timestamps: false, createdAt: 'created_at' });

const Referral = sequelize.define('Referral', {
  type: DataTypes.TINYINT,
  target_id: DataTypes.INTEGER,
  referrer_id: DataTypes.INTEGER,
  parent_id: DataTypes.INTEGER,
  level: DataTypes.TINYINT,
  status: { type: DataTypes.TINYINT, defaultValue: 0 },
  commission: DataTypes.DECIMAL(10,2)
}, { tableName: 'referrals', timestamps: false, createdAt: 'created_at' });

(async () => {
  try {
    await sequelize.sync();
    console.log('数据库同步完成');
  } catch (err) {
    console.error('数据库同步失败:', err);
  }
})();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));

app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const existing = await User.findOne({ where: { username } });
    if (existing) return res.status(400).json({ error: '用户名已存在' });
    const user = await User.create({ username, password });
    res.json({ success: true, user: { id: user.id, username: user.username } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username, password } });
    if (!user) return res.status(401).json({ error: '用户名或密码错误' });
    res.json({ success: true, user: { id: user.id, username: user.username, level: user.member_level } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.findAll({ attributes: ['id', 'username', 'member_level', 'total_income', 'created_at'] });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/:id/level', async (req, res) => {
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

app.get('/api/groups', async (req, res) => {
  try {
    const groups = await Group.findAll({ where: { status: 1 } });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/groups', async (req, res) => {
  try {
    const groups = await Group.findAll({ order: [['created_at', 'DESC']] });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/groups', async (req, res) => {
  try {
    const group = await Group.create({ ...req.body, user_id: req.body.user_id, status: 0 });
    res.json({ success: true, group });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/groups/:id/approve', async (req, res) => {
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

app.get('/api/enterprise-likes', async (req, res) => {
  try {
    const likes = await EnterpriseLike.findAll({ where: { status: 1 } });
    res.json(likes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/enterprise-likes', async (req, res) => {
  try {
    const likes = await EnterpriseLike.findAll({ order: [['created_at', 'DESC']] });
    res.json(likes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/enterprise-likes', async (req, res) => {
  try {
    const like = await EnterpriseLike.create({ ...req.body, user_id: req.body.user_id, status: 0 });
    res.json({ success: true, like });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/enterprise-likes/:id/approve', async (req, res) => {
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

app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Project.findAll({ where: { status: 1 } });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/projects', async (req, res) => {
  try {
    const projects = await Project.findAll({ order: [['created_at', 'DESC']] });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const project = await Project.create({ ...req.body, user_id: req.body.user_id, status: 0 });
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects/:id/approve', async (req, res) => {
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

app.get('/api/helps', async (req, res) => {
  try {
    const helps = await HelpRequest.findAll({ where: { status: 1 } });
    res.json(helps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/helps', async (req, res) => {
  try {
    const helps = await HelpRequest.findAll({ order: [['created_at', 'DESC']] });
    res.json(helps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/helps', async (req, res) => {
  try {
    const help = await HelpRequest.create({ ...req.body, user_id: req.body.user_id, status: 0 });
    res.json({ success: true, help });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/helps/:id/approve', async (req, res) => {
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

app.get('/api/government', async (req, res) => {
  try {
    const gov = await GovernmentResource.findAll({ where: { status: 1 } });
    res.json(gov);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/government', async (req, res) => {
  try {
    const gov = await GovernmentResource.findAll({ order: [['created_at', 'DESC']] });
    res.json(gov);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/government', async (req, res) => {
  try {
    const gov = await GovernmentResource.create({ ...req.body, user_id: req.body.user_id, status: 0 });
    res.json({ success: true, gov });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/government/:id/approve', async (req, res) => {
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

app.get('/api/referrals', async (req, res) => {
  try {
    const referrals = await Referral.findAll({ order: [['created_at', 'DESC']] });
    res.json(referrals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/referrals', async (req, res) => {
  try {
    const referral = await Referral.create(req.body);
    res.json({ success: true, referral });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/upgrade', async (req, res) => {
  try {
    const user = await User.findByPk(req.body.user_id);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    user.member_level = req.body.level;
    user.member_expire = new Date(Date.now() + 365*24*60*60*1000);
    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '资源夜市 API 运行正常' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
