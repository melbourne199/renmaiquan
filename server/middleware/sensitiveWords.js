/**
 * 敏感词过滤中间件
 * 检测并替换职务名称等敏感词，替换为 *** 并返回错误提示
 */

// 敏感词列表 - 官场职务名称
const SENSITIVE_WORDS = [
  // 国家级
  '主席', '副主席', '总理', '副总理', '委员长', '副委员长', '部长', '总理',

  // 省部级
  '省委书记', '市委书记', '省委常委', '市委常委', '省长', '副省长', '市长', '副市长',
  '人大主任', '副主任', '政协主席', '副主席', '部长', '副部长',

  // 厅局级
  '厅长', '副厅长', '局长', '副局长', '司长', '副司长', '巡视员', '专员',
  '市委书记', '市委副书记', '市常委',

  // 县处级
  '县长', '副县长', '区长', '副区长', '县委书记', '县委副书记', '县委常委',
  '处长', '副处长', '科长', '副科长', '乡镇长', '乡镇党委书记',
  '派出所所长', '教导员', '政委',

  // 特殊系统
  '检察长', '法院院长', '纪委书记', '政法委书记', '办公厅主任', '秘书长', '参事',

  // 其他常见职务
  '书记', '乡长', '镇长', '村长', '主任', '副主任', '委员', '主席',
  '组长', '副组长', '队长', '副队长', '行长', '副行长', '董事长', '总经理',
  '总裁', '副总裁', '总监', '副总监', '主管', '经理', '副经理',
  '署长', '副署长', '站长', '副站长', '校长', '副校长', '院长', '副院长',
  '会长', '副会长', '理事长', '副理事长', '秘书长', '副秘书长',
  '总编辑', '副总编辑', '首席官', '首席官', '发言人'
];

/**
 * 检测文本中是否包含敏感词
 * @param {string} text - 待检测文本
 * @returns {object} - { hasSensitive: boolean, foundWords: string[], filteredText: string }
 */
function filterSensitiveWords(text) {
  if (!text || typeof text !== 'string') {
    return { hasSensitive: false, foundWords: [], filteredText: text };
  }

  let hasSensitive = false;
  const foundWords = [];
  let filteredText = text;

  for (const word of SENSITIVE_WORDS) {
    // 使用正则表达式匹配完整词汇（考虑边界）
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    if (regex.test(text)) {
      hasSensitive = true;
      foundWords.push(word);
      // 替换为 ***
      filteredText = filteredText.replace(regex, '***');
    }
  }

  return { hasSensitive, foundWords, filteredText };
}

/**
 * 敏感词过滤中间件
 * 检测请求体中的文本字段，替换敏感词并返回错误
 */
function sensitiveWordFilter(req, res, next) {
  // 需要检测的字段
  const fieldsToCheck = [
    'name', 'description', 'content', 'title', 'remark',
    'enterprise_name', 'project_name', 'group_name', 'tags'
  ];

  let hasSensitive = false;
  const sensitiveField = [];

  for (const field of fieldsToCheck) {
    if (req.body[field] && typeof req.body[field] === 'string') {
      const result = filterSensitiveWords(req.body[field]);
      if (result.hasSensitive) {
        hasSensitive = true;
        sensitiveField.push(field);
      }
    }
  }

  if (hasSensitive) {
    return res.status(400).json({
      error: '内容包含违规表述，请修改后提交',
      code: 'SENSITIVE_WORD_DETECTED',
      fields: sensitiveField
    });
  }

  next();
}

module.exports = {
  filterSensitiveWords,
  sensitiveWordFilter,
  SENSITIVE_WORDS
};
