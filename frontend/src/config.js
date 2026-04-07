// API Configuration with historical data support
const API_CONFIG = {
  // Backend API URL (use relative path for proxy)
  BASE_URL: '',
  
  ENDPOINTS: {
    WORLD_STATE: '/api/world/state',
    EVENTS: '/api/world/events',  // 已修复：之前是 /api/events
    ROLES: '/api/roles',
    // 分支系统未实现 - 后端无对应路由
    CURRENT_BRANCH: '/api/branch/current',
    BRANCH_CHOICE: '/api/branch/choose',
    HISTORICAL_DATA: '/api/historical'
  }
};

export default API_CONFIG;