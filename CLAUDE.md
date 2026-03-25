# CLAUDE.md

资源夜市一条街 - 商业人脉资源对接平台

## 技术栈

- **后端**: Express.js + Sequelize ORM + MySQL
- **前端**: 原生 HTML/CSS/JS（无框架）
- **认证**: JWT + bcrypt 密码加密

## 项目结构

```
renmaiquan/
├── server/
│   ├── index.js          # 主入口
│   ├── config/index.js   # 配置文件（数据库/JWT/盐值）
│   ├── models/index.js   # 数据库模型定义
│   ├── middleware/
│   │   └── auth.js      # JWT 认证中间件
│   └── routes/
│       ├── auth.js       # 登录/注册/用户 API
│       ├── admin.js      # 后台管理 API（需管理员权限）
│       ├── public.js     # 公开内容 API
│       └── content.js    # 用户发布内容 API（需登录）
├── public/
│   ├── index.html        # 首页（资源浏览）
│   ├── login.html       # 登录/注册页
│   ├── user.html        # 个人中心
│   ├── styles/modern.css # 现代设计系统
│   └── scripts/app.js   # API 封装和工具函数
└── admin/
    └── index.html        # 管理后台
```

## 启动命令

```bash
# 开发模式
npm run dev

# 生产模式
npm start

# 需要先配置 .env 文件
```

## API 路由

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /api/auth/register | 注册 | 无 |
| POST | /api/auth/login | 登录 | 无 |
| GET | /api/auth/me | 当前用户信息 | 需要 |
| GET | /api/groups | 群码列表 | 公开 |
| GET | /api/enterprise-likes | 企业资源列表 | 公开 |
| GET | /api/projects | 项目列表 | 公开 |
| GET | /api/government | 政务资源列表 | 公开 |
| POST | /api/content/groups | 发布群码 | 需要 |
| GET | /api/admin/users | 用户列表 | 管理员 |
| POST | /api/admin/groups/:id/approve | 审核通过 | 管理员 |

## 数据库

需要 MySQL 数据库，配置见 `.env`：
- DB_HOST, DB_NAME, DB_USER, DB_PASSWORD

## 注意事项

- 用户密码使用 bcrypt 加密存储
- JWT token 有效期 7 天
- 管理员权限由 `is_admin` 字段控制
- 所有 content 发布需要审核（status=0 待审，status=1 通过）
