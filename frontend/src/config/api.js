// API 配置 - 使用相对路径，自动适配当前域名
export const API_CONFIG = {
  baseUrl: '',  // 相对路径，使用当前域名
  wsUrl: `ws://${window.location.hostname}:8080/ws`,
  
  // 超时时间（毫秒）
  timeout: 30000,
  
  // 重试次数
  retries: 3,
};

// 认证相关
export const AUTH_CONFIG = {
  tokenKey: 'auth_token',
  playerKey: 'player',
  roleKey: 'current_role',
};

// 本地存储辅助函数
export const storage = {
  getToken: () => localStorage.getItem(AUTH_CONFIG.tokenKey),
  setToken: (token) => localStorage.setItem(AUTH_CONFIG.tokenKey, token),
  removeToken: () => localStorage.removeItem(AUTH_CONFIG.tokenKey),
  
  getPlayer: () => {
    const player = localStorage.getItem(AUTH_CONFIG.playerKey);
    return player ? JSON.parse(player) : null;
  },
  setPlayer: (player) => localStorage.setItem(AUTH_CONFIG.playerKey, JSON.stringify(player)),
  removePlayer: () => localStorage.removeItem(AUTH_CONFIG.playerKey),
  
  getRole: () => {
    const role = localStorage.getItem(AUTH_CONFIG.roleKey);
    return role ? JSON.parse(role) : null;
  },
  setRole: (role) => localStorage.setItem(AUTH_CONFIG.roleKey, JSON.stringify(role)),
  removeRole: () => localStorage.removeItem(AUTH_CONFIG.roleKey),
  
  clear: () => {
    localStorage.removeItem(AUTH_CONFIG.tokenKey);
    localStorage.removeItem(AUTH_CONFIG.playerKey);
    localStorage.removeItem(AUTH_CONFIG.roleKey);
  },
};
