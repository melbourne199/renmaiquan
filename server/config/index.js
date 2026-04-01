require('dotenv').config();

module.exports = {
  db: {
    name: process.env.DB_NAME || 'renmaiquan',
    user: process.env.DB_USER || 'renmai_user',
    password: process.env.DB_PASSWORD || 'Renmai@2026db',
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'renmaiquan_jwt_secret_key_2026',
    expiresIn: '7d'
  },
  bcrypt: {
    saltRounds: 10
  },
  server: {
    port: process.env.PORT || 3002
  },
  ai: {
    apiKey: 'sk-d4951e01685745f48f13e0648ad98866',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat'
  }
};
