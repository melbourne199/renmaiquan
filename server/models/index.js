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
  member_count: { type: DataTypes.INTEGER, defaultValue: 0 },
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

module.exports = {
  sequelize,
  User,
  Group,
  EnterpriseLike,
  Project,
  HelpRequest,
  GovernmentResource,
  Referral
};
