# 网站安全加固方案
生成时间：2026-04-01
负责人：网站组

## 一、密码安全（✅ 已完成）
- 密码已用 bcryptjs 加密存储（10轮盐值）
- 登录验证用 bcrypt.compare() 检查

## 二、待加固项目

### 🔴 高优先级

#### 1. 登录限速（防暴力破解）
**问题：** 现在登录接口无限制，可无限次尝试密码
**方案：** 
- 安装 `express-rate-limit`
- 同一IP 5分钟内最多尝试5次
- 超限返回 429 Too Many Requests

**文件：** server/index.js
```js
const rateLimit = require('express-rate-limit');
app.use('/api/auth/login', rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: { error: '登录尝试过于频繁，请5分钟后再试' }
}));
```

#### 2. Helmet安全头（防XSS/点击劫持）
**方案：** 安装并启用 helmet 中间件

**文件：** server/index.js
```js
const helmet = require('helmet');
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: { defaultSrc: ["'self'"] }
}));
```

#### 3. 输入过滤（防XSS）
**问题：** 用户输入直接存入数据库
**方案：** 对所有用户输入进行HTML转义

**安装：** npm install xss --save
**修改点：** 所有 user-controlled 输入字段

#### 4. SQL注入防护
**现状：** Sequelize ORM 已自带防护
**检查点：** 确保所有查询用 Sequelize 的参数化查询

---

### 🟡 中优先级

#### 5. 注册频率限制
**方案：** 同一IP 1小时内最多注册3个账号

#### 6. 敏感操作日志
**方案：** 记录登录、发布、删除等操作的IP和时间
```js
// 新建 sensitive_log 表或日志文件
log: { ip, user_id, action, time, details }
```

#### 7. 验证码（可选）
**方案：** 连续登录失败3次后显示图形验证码
**安装：** npm install svg-captcha --save

#### 8. API统一错误处理
**方案：** 不暴露数据库错误详情给前端
```js
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: '服务器内部错误' });
});
```

---

### 🟢 低优先级（建议有）

#### 9. HTTPS强制跳转
**方案：** 非HTTPS请求重定向到HTTPS

#### 10. 请求体大小限制
**方案：** 防止大文件上传攻击
```js
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb' }));
```

#### 11. CORS严格配置
**现状：** cors() 已启用，需检查允许的域名

---

## 三、安装命令
```bash
cd /home/xeon/renmaiquan
npm install express-rate-limit helmet xss
```

## 四、涉及文件
- server/index.js（主入口，添加中间件）
- server/routes/auth.js（登录注册逻辑）
- server/routes/content.js（用户内容发布）
- server/models/index.js（如有新建日志表）

## 五、测试验证
加固完成后测试：
1. 连续登录5次失败 → 第6次被拦截
2. 在表单输入 `<script>alert(1)</script>` → 显示为纯文本
3. 检查浏览器Console无安全警告

---
**注意：** 正式环境部署前做完整渗透测试
