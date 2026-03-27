const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// POST /api/ai/parse - 解析文本并提取结构化数据
router.post('/parse', async (req, res) => {
  try {
    const { text, type } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: '缺少文本内容' });
    }

    const promptMap = {
      gov_resource: `你是一个政务资源信息提取助手。用户会提供一段文字，请从中提取出以下JSON格式的信息：

返回格式（只返回JSON，不要其他内容）：
{
  "province": "省份",
  "city": "城市",
  "business_type": "业务类型/行业",
  "level_code": "层级(国家级/省级/市级/区级/镇街级)",
  "familiarity": "熟悉程度(非常熟悉/比较熟悉/一般了解/初步接触)",
  "summary": "一句话描述该资源的核心优势或特点"
}

请分析以下文本并返回JSON：
${text}`,

      enterprise: `你是一个企业信息提取助手。请从以下文本中提取企业信息：

返回格式（只返回JSON）：
{
  "name": "企业名称",
  "industry": "所属行业",
  "scale": "企业规模",
  "main_product": "主营业务",
  "summary": "一句话描述企业优势"
}

文本：
${text}`,

      contract: `你是一个合同分析助手。请从以下文本中提取合同关键信息：

返回格式（只返回JSON）：
{
  "party_a": "甲方",
  "party_b": "乙方",
  "amount": "金额",
  "duration": "期限",
  "key_terms": ["关键条款1", "关键条款2"],
  "summary": "一句话合同概要"
}

文本：
${text}`
    };

    const prompt = promptMap[type] || promptMap['gov_resource'];

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1
    });

    const raw = chatCompletion.choices[0]?.message?.content || '';
    // 提取JSON
    let jsonStr = raw;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    let data;
    try {
      data = JSON.parse(jsonStr);
    } catch {
      return res.json({ success: true, data: { summary: raw.slice(0, 200) }, raw });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('Groq parse error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/generate-report - 生成评估报告
router.post('/generate-report', async (req, res) => {
  try {
    const { type, data } = req.body;

    const reportPrompts = {
      gov_resource: `你是一个政务资源评估报告生成助手。请根据以下信息生成一份专业的评估报告：

数据：
${JSON.stringify(data, null, 2)}

报告格式：
## 政企资源评估报告

### 基本信息
- 地区：[省份]-[城市]
- 行业：[业务类型]
- 层级：[层级]

### 熟悉程度评估
[根据熟悉程度写一段评价]

### 资源价值评估
[分析该资源的价值和对接可行性]

### 对接建议
[给出具体的居间对接建议]

请生成完整报告：`
    };

    const prompt = reportPrompts[type] || reportPrompts['gov_resource'];

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3
    });

    const report = chatCompletion.choices[0]?.message?.content || '';

    // 简单评分
    const familiarityScore = { '非常熟悉': 90, '比较熟悉': 75, '一般了解': 60, '初步接触': 40 };
    const score = data?.familiarity ? (familiarityScore[data.familiarity] || 60) : 65;

    res.json({ success: true, report, score });
  } catch (err) {
    console.error('Groq report error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
