const jwt = require('jsonwebtoken');
const config = require('../config');

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '未登录' });

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token无效' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user?.is_admin) return res.status(403).json({ error: '需要管理员权限' });
  next();
};

module.exports = { authenticate, requireAdmin };
