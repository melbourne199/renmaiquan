/* ==================== API 工具 ==================== */

const API_BASE = '/api';

// 存储 token
const storage = {
  getToken: () => localStorage.getItem('token'),
  setToken: (token) => localStorage.setItem('token', token),
  removeToken: () => localStorage.removeItem('token'),
  getUser: () => JSON.parse(localStorage.getItem('user') || 'null'),
  setUser: (user) => localStorage.setItem('user', JSON.stringify(user)),
  removeUser: () => localStorage.removeItem('user')
};

// API 请求封装
async function api(endpoint, options = {}) {
  const token = storage.getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || '请求失败');
  }

  return data;
}

// 认证 API
const auth = {
  async login(username, password) {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    storage.setToken(data.token);
    storage.setUser(data.user);
    return data;
  },

  async register(username, password) {
    return api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  },

  async getMe() {
    return api('/auth/me');
  },

  logout() {
    storage.removeToken();
    storage.removeUser();
    window.location.href = '/login.html';
  },

  isLoggedIn() {
    return !!storage.getToken();
  }
};

// 公开内容 API
const publicApi = {
  async getGroups() {
    return api('/groups');
  },
  async getEnterpriseLikes() {
    return api('/enterprise-likes');
  },
  async getProjects() {
    return api('/projects');
  },
  async getHelps() {
    return api('/helps');
  },
  async getGovernment() {
    return api('/government');
  }
};

// 内容发布 API
const contentApi = {
  async postGroup(data) {
    return api('/content/groups', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  async postEnterpriseLike(data) {
    return api('/content/enterprise-likes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  async postProject(data) {
    return api('/content/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  async postHelp(data) {
    return api('/content/helps', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  async postGovernment(data) {
    return api('/content/government', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};

/* ==================== 敏感词过滤 ==================== */

// 敏感词列表 - 官场职务名称
const SENSITIVE_WORDS = [
  // 国家级
  '主席', '副主席', '总理', '副总理', '委员长', '副委员长', '部长',
  // 省部级
  '省委书记', '市委书记', '省委常委', '市委常委', '省长', '副省长', '市长', '副市长',
  '人大主任', '副主任', '政协主席', '副主席', '部长', '副部长',
  // 厅局级
  '厅长', '副厅长', '局长', '副局长', '司长', '副司长', '巡视员', '专员',
  '市委副书记', '市常委',
  // 县处级
  '县长', '副县长', '区长', '副区长', '县委书记', '县委副书记', '县委常委',
  '处长', '副处长', '科长', '副科长', '乡镇长', '乡镇党委书记', '派出所所长',
  '教导员', '政委',
  // 特殊系统
  '检察长', '法院院长', '纪委书记', '政法委书记', '办公厅主任', '秘书长', '参事',
  // 其他常见职务
  '书记', '乡长', '镇长', '村长', '主任', '副主任', '委员', '组长', '副组长',
  '队长', '副队长', '行长', '副行长', '董事长', '总经理', '总裁', '副总裁',
  '总监', '副总监', '主管', '经理', '副经理', '署长', '副署长', '站长', '副站长',
  '校长', '副校长', '院长', '副院长', '会长', '副会长', '理事长', '副理事长',
  '副秘书长', '总编辑', '副总编辑'
];

/**
 * 检测文本中是否包含敏感词
 * @param {string} text - 待检测文本
 * @returns {object} - { hasSensitive: boolean, foundWords: string[] }
 */
function checkSensitiveWords(text) {
  if (!text || typeof text !== 'string') {
    return { hasSensitive: false, foundWords: [] };
  }

  const foundWords = [];
  for (const word of SENSITIVE_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    if (regex.test(text)) {
      foundWords.push(word);
    }
  }

  return { hasSensitive: foundWords.length > 0, foundWords };
}

/**
 * 显示红色警告框（内容包含违规表述）
 */
function showSensitiveWordAlert() {
  const alertDiv = document.createElement('div');
  alertDiv.id = 'sensitive-alert';
  alertDiv.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.7);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        background: #fff;
        border: 3px solid #dc3545;
        border-radius: 12px;
        padding: 30px 40px;
        max-width: 400px;
        text-align: center;
        box-shadow: 0 0 30px rgba(220,53,69,0.5);
      ">
        <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
        <h3 style="color: #dc3545; margin: 0 0 15px 0; font-size: 20px;">内容包含违规表述</h3>
        <p style="color: #333; margin: 0 0 20px 0; font-size: 14px; line-height: 1.6;">
          检测到使用了政府职务名称等敏感词汇<br>
          请修改后重新提交
        </p>
        <button onclick="this.closest('#sensitive-alert').remove()" style="
          background: #dc3545;
          color: #fff;
          border: none;
          padding: 10px 30px;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
        ">我知道了</button>
      </div>
    </div>
  `;
  document.body.appendChild(alertDiv);
}

/**
 * 提交前敏感词检测（返回 true 表示检测通过，false 表示有敏感词）
 */
function validateBeforeSubmit(formData) {
  const fieldsToCheck = ['name', 'description', 'content', 'title', 'remark'];
  let hasSensitive = false;

  for (const field of fieldsToCheck) {
    if (formData[field]) {
      const result = checkSensitiveWords(formData[field]);
      if (result.hasSensitive) {
        hasSensitive = true;
        break;
      }
    }
  }

  if (hasSensitive) {
    showSensitiveWordAlert();
    return false;
  }

  return true;
}

/* ==================== Toast 提示 ==================== */

function showToast(message, type = 'info') {
  // 移除已有 toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // 触发动画
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // 3秒后移除
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* ==================== 模态框 ==================== */

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// 点击遮罩关闭
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
});

/* ==================== 检查登录状态 ==================== */

function requireAuth() {
  if (!auth.isLoggedIn()) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

function ifLoggedIn() {
  if (auth.isLoggedIn()) {
    window.location.href = '/index.html';
  }
}

/* ==================== 工具函数 ==================== */

function formatDate(dateString) {
  if (!dateString) return '永久有效';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN');
}

function formatNumber(num) {
  if (!num) return '0';
  return num.toLocaleString();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
