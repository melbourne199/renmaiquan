# AI文档解析 · 自动填表功能设计方案

## 功能概述

用户上传文件（PDF/图片） → Tesseract.js 浏览器端OCR提取文字 → Groq API (Llama) 解析 → JSON结构化数据 → 自动填充表单 → 生成评估报告

## 技术架构

```
用户浏览器
    ↓
前端上传组件（拖拽/点击）
    ↓
Tesseract.js 浏览器端OCR（提取图片/扫描件中的文字）
    ↓
后端代理 /api/ai/parse（Node.js，防API Key泄露）
    ↓
Groq API - Llama3.3 70B（免费）
    ↓
返回JSON结构化数据
    ↓
前端自动填充表单字段
    ↓
生成评估报告（可下载）
```

## 所需条件

| 组件 | 状态 | 说明 |
|------|------|------|
| Tesseract.js | ✅ 已有 | 纯前端，0成本 |
| Groq API Key | ⚠️ 需申请 | 免费：console.groq.com |
| 后端代理接口 | ✅ 已有 | server/routes/ai.js |
| 文件存储 | ✅ 免费 | 临时base64，不持久化 |

## API设计

### POST /api/ai/parse
**请求：**
```json
{
  "text": "提取出的文字内容",
  "type": "gov_resource | enterprise | contract | resume"
}
```
**响应：**
```json
{
  "success": true,
  "data": {
    "province": "深圳",
    "city": "深圳",
    "business_type": "教育培训",
    "level_code": "市级",
    "familiarity": "非常熟悉",
    "summary": "在教育系统深耕20年..."
  }
}
```

### POST /api/ai/generate-report
**请求：**
```json
{
  "type": "gov_resource",
  "data": { ...表单数据 }
}
```
**响应：**
```json
{
  "success": true,
  "report": "## 政企资源评估报告\n\n### 基本信息\n- 地区：深圳市...",
  "score": 85
}
```

## 前端页面

### 页面：/upload-parse.html（新建）
- 拖拽上传区（支持PDF、图片）
- OCR处理进度条
- AI解析状态
- 表单预览（自动填充前）
- 确认提交
- 报告生成下载

### 页面：/ai-report.html（新建）
- 报告展示（Markdown渲染）
- 下载PDF按钮

## 使用场景

### 场景1：居间人提交政务资源
用户上传一张扫描件 → AI识别出：省份/城市/行业/层级/熟悉程度 → 自动填入发布表单

### 场景2：合同关键条款提取
上传合同PDF → AI提取：甲方/乙方/金额/期限/关键条款 → 生成摘要报告

### 场景3：企业资质上传
上传营业执照/资质证书 → AI提取：企业名称/行业/注册资本/经营范围 → 自动填入企业资源表单

## 实施步骤

1. **申请Groq API Key**（街长操作，5分钟）
   - 访问 https://console.groq.com
   - 注册账号（可用Google登录）
   - 创建API Key

2. **后端：添加AI路由**
   - 在 server/routes/ 下新建 ai.js
   - 实现 /api/ai/parse 和 /api/ai/generate-report

3. **前端：上传解析页面**
   - 新建 upload-parse.html
   - 集成 Tesseract.js（CDN引入）
   - 实现拖拽上传 + OCR + AI解析流程

4. **集成到发布流程**
   - 在 publish-gov.html 等发布页加入"上传文件AI辅助"入口

## 成本估算

| 项目 | 费用 |
|------|------|
| Groq API | 免费（每分钟15次，Llama3.3免费） |
| Tesseract.js | 免费 |
| 服务器 | 已有 |
| 存储 | 临时base64，不占存储 |

**总成本：0元**

## 注意事项

- API Key只放在后端，不暴露在前端
- 用户上传文件仅作临时处理，不持久化存储
- OCR对印刷体效果好，手写体需Tesseract.js v5+配合
- 隐私：所有数据不落第三方，纯内部处理
