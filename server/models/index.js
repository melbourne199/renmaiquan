const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config');

const sequelize = new Sequelize(config.db.name, config.db.user, config.db.password, {
  host: config.db.host,
  dialect: config.db.dialect,
  logging: false
});

const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  member_level: { type: DataTypes.TINYINT, defaultValue: 0 },
  member_expire: { type: DataTypes.DATE },
  total_income: { type: DataTypes.DECIMAL(10,2), defaultValue: 0.00 },
  is_admin: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'users' });

const Group = sequelize.define('Group', {
  user_id: DataTypes.INTEGER,
  name: DataTypes.STRING,
  qrcode: DataTypes.STRING,
  owner_qrcode: DataTypes.STRING,
  industry_id: DataTypes.INTEGER,
  region: DataTypes.STRING,
  description: DataTypes.TEXT,
  tags: DataTypes.STRING,
  member_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  view_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  expire_time: DataTypes.DATE,
  status: { type: DataTypes.TINYINT, defaultValue: 0 }
}, { tableName: 'groups', timestamps: false, createdAt: 'created_at' });

const EnterpriseLike = sequelize.define('EnterpriseLike', {
  user_id: DataTypes.INTEGER,
  company_name: DataTypes.STRING,
  department: DataTypes.STRING,
  region: DataTypes.STRING,
  industry: DataTypes.STRING,
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

// 居间项目
const EscortProject = sequelize.define('EscortProject', {
  creator_id: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  total_fee: { type: DataTypes.DECIMAL(12,2), allowNull: false }, // 居间费总额
  party_a_name: DataTypes.STRING, // 甲方简称（脱敏）
  party_b_name: DataTypes.STRING, // 乙方简称（脱敏）
  status: { type: DataTypes.TINYINT, defaultValue: 0 }, // 0=招募中 1=执行中 2=已完成 3=已取消
  l1_required: { type: DataTypes.TINYINT, defaultValue: 1 }, // 1=双边一级(各需1个) 0=单边一级(共需1个)
  a_side_status: { type: DataTypes.TINYINT, defaultValue: 0 }, // 0=等待一级 1=一级已到位 2=链条完成
  b_side_status: { type: DataTypes.TINYINT, defaultValue: 0 },
  expire_date: DataTypes.DATE,
  invite_code: { type: DataTypes.STRING(8), unique: true } // 邀请码
}, { tableName: 'escort_projects', timestamps: true, createdAt: 'created_at' });

// 居间参与者
const EscortParticipant = sequelize.define('EscortParticipant', {
  project_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  side: { type: DataTypes.TINYINT, allowNull: false }, // 0=甲方 1=乙方
  role: { type: DataTypes.TINYINT, allowNull: false }, // 0=拍板人 1=一级引荐 2=二级引荐
  parent_id: { type: DataTypes.INTEGER }, // 上级引荐人ID
  status: { type: DataTypes.TINYINT, defaultValue: 0 }, // 0=待确认 1=已确认 2=已退出
  fee_percent: { type: DataTypes.DECIMAL(5,2) }, // 分润比例
  fee_amount: { type: DataTypes.DECIMAL(12,2) }, // 分润金额
  confirm_time: DataTypes.DATE,
  join_time: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { tableName: 'escort_participants', timestamps: false });

// 关联关系
EscortProject.hasMany(EscortParticipant, { foreignKey: 'project_id', as: 'participants' });
EscortParticipant.belongsTo(EscortProject, { foreignKey: 'project_id', as: 'project' });
EscortParticipant.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  sequelize,
  User,
  Group,
  EnterpriseLike,
  Project,
  HelpRequest,
  GovernmentResource,
  Referral,
  EscortProject,
  EscortParticipant
};
