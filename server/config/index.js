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
    apiKey: 'sk-fe268a78dfbf8bdf48afd078ab271ca455f605387f6ba6496b002acc2fff2879',
    baseUrl: 'https://sub2api.bgstudio.top/v1',
    model: 'custom-sub2api-bgstudio-top/MiniMax-M2.7'
  }
};
