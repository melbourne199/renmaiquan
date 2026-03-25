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
