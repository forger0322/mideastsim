// frontend/src/services/api.js
// 使用相对路径，通过 setupProxy.js 代理到后端
const API_BASE = '';

// 获取存储的 token
const getToken = () => localStorage.getItem('auth_token');

// 通用请求头
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': getToken() ? `Bearer ${getToken()}` : '',
});

// 通用错误处理
const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '请求失败');
  }
  return data;
};

// 认证 API
export const auth = {
  login: async (username, password = '') => {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username, password }),
    });
    const data = await handleResponse(response);
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    return data;
  },
  
  register: async (username, email, password) => {
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username, email, password }),
    });
    return handleResponse(response);
  },
  
  me: async () => {
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};

// 国家/角色 API
export const roles = {
  available: async () => {
    const response = await fetch(`${API_BASE}/api/roles/available`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
  
  claim: async (roleId) => {
    const response = await fetch(`${API_BASE}/api/roles/claim`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ role_id: roleId }),
    });
    return handleResponse(response);
  },
  
  release: async () => {
    const response = await fetch(`${API_BASE}/api/roles/release`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
  
  info: async (roleId) => {
    const response = await fetch(`${API_BASE}/api/roles/info?id=${roleId}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};

// 行动 API
export const actions = {
  execute: async (actionType, targetId, params = {}) => {
    const response = await fetch(`${API_BASE}/api/actions/execute`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        action_type: actionType,
        target_id: targetId,
        params,
      }),
    });
    return handleResponse(response);
  },
  
  // 快捷方法
  declareWar: (targetId) => actions.execute('declare_war', targetId),
  proposePeace: (targetId) => actions.execute('propose_peace', targetId),
  sanction: (targetId, type = 'economic') => actions.execute('sanction', targetId, { type }),
  proposeAlliance: (targetId, type = 'mutual') => actions.execute('propose_alliance', targetId, { type }),
  militaryExercise: (targetId, scale = 'routine') => actions.execute('military_exercise', targetId, { scale }),
  diplomaticStatement: (targetId, attitude = 'neutral') => actions.execute('diplomatic_statement', targetId, { attitude }),
};

// 世界状态 API
export const world = {
  state: async () => {
    const response = await fetch(`${API_BASE}/api/world/state`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
  
  events: async (limit = 20) => {
    const response = await fetch(`${API_BASE}/api/world/events`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
  
  relations: async () => {
    const response = await fetch(`${API_BASE}/api/world/relations`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
  
  wars: async () => {
    const response = await fetch(`${API_BASE}/api/world/wars`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};

export default { auth, roles, actions, world };
