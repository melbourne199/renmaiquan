require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { sequelize } = require('./models');

// 路由
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const publicRoutes = require('./routes/public');
const contentRoutes = require('./routes/content');
const escortRoutes = require('./routes/escort');
const aiRoutes = require('./routes/ai');
const stationRoutes = require('./routes/station');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '资源夜市 API 运行正常' });
});

// 路由挂载
app.use('/api', publicRoutes);           // 公开内容
app.use('/api/auth', authRoutes);         // 认证相关
app.use('/api/content', contentRoutes);   // 用户发布内容
app.use('/api/admin', adminRoutes);       // 后台管理
app.use('/api/ai', aiRoutes);             // AI解析（Groq）
app.use('/api/escort', escortRoutes);    // 居间护航
app.use('/api/station', stationRoutes);   // 站长申请

// 404 处理
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 数据库连接
(async () => {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');
    await sequelize.sync({ alter: true });
    console.log('数据库同步完成');
  } catch (err) {
    console.error('数据库连接失败:', err);
  }
})();

// 启动服务器
app.listen(config.server.port, () => {
  console.log(`服务器运行在 http://localhost:${config.server.port}`);
});
