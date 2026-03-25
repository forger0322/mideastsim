// frontend/src/i18n.js
import React from 'react';

const translations = {
  zh: {
    // 通用
    loading: '加载中...',
    error: '错误',
    success: '成功',
    cancel: '取消',
    confirm: '确认',
    close: '关闭',
    
    // 标题
    title: '中东地缘经济推演平台',
    subtitle: 'MideastSim Geopolitical Simulation',
    
    // 导航
    nav: {
      home: '首页',
      map: '地图',
      economy: '经济',
      diplomacy: '外交',
      military: '军事',
      leaderboard: '排行榜',
      settings: '设置',
    },
    
    // 登录/注册
    auth: {
      login: '登录',
      register: '注册',
      logout: '退出',
      username: '用户名',
      password: '密码',
      email: '邮箱',
      loginSuccess: '登录成功！',
      loginFailed: '登录失败',
      chooseNation: '选择国家',
      selectedNation: '已选择：',
    },
    
    // 国家/势力
    nation: {
      select: '选择国家',
      info: '国家信息',
      attributes: '国力属性',
      army: '陆军',
      navy: '海军',
      airForce: '空军',
      nuclear: '核武',
      economy: '经济',
      stability: '稳定度',
      diplomacy: '外交',
      intel: '情报',
      faction: '势力联盟',
    },
    
    // 行动
    actions: {
      title: '行动',
      declareWar: '宣战',
      proposePeace: '提议和平',
      sanction: '制裁',
      proposeAlliance: '提议结盟',
      militaryExercise: '军事演习',
      diplomaticStatement: '外交声明',
      confirmWar: '确认向 {nation} 宣战？',
      warDeclared: '已向 {nation} 宣战！',
      allianceProposed: '已向 {nation} 提议结盟！',
      sanctionImposed: '已对 {nation} 实施制裁！',
      exerciseCompleted: '军事演习已完成！',
      statementIssued: '外交声明已发布！',
      needBetterRelation: '关系值过低，需要先改善关系',
      currentRelation: '当前关系：',
      inWar: '已经在战争中',
      alreadyAllies: '已经是盟友',
    },
    
    // 经济
    economy: {
      title: '💰 经济面板',
      gdp: 'GDP',
      trade: '贸易',
      resources: '资源',
      sanctions: '制裁状态',
      stocks: '股票市场',
      crypto: '加密货币',
      commodities: '大宗商品',
      spx: '标普 500',
      hsi: '恒生指数',
      ftse: '富时 100',
      btc: '比特币',
      eth: '以太坊',
      oil: '原油 (WTI)',
      gold: '黄金',
      silver: '白银',
      oilSanctions: '石油制裁',
      fullSanctions: '全面制裁',
    },
    
    // 外交
    diplomacy: {
      title: '🤝 外交面板',
      relations: '外交关系',
      alliance: '同盟',
      war: '战争',
      neutral: '中立',
      friendly: '友好',
      hostile: '敌对',
      support: '支持',
      criticize: '批评',
    },
    
    // 军事
    military: {
      title: '⚔️ 军事面板',
      wars: '进行中的战争',
      noWars: '暂无战争',
      aggressor: '进攻方',
      defender: '防守方',
      startTime: '开始时间',
      casualties: '伤亡',
      routine: '例行',
      large: '大规模',
    },
    
    // 资源标签（头部经济数据）
    resources: {
      oil: '油价',
      gold: '黄金',
      btc: 'BTC',
    },
    
    // 设置
    settings: {
      title: '设置',
      language: '语言',
      chinese: '中文',
      english: 'English',
      notifications: '通知',
      sound: '音效',
      music: '音乐',
      graphics: '画质',
      actionNotifications: '行动通知',
      warAlerts: '战争警报',
      soundEffects: '音效',
      version: '版本',
      buildDate: '构建时间',
      about: '关于',
    },
    
    // 排行榜
    leaderboard: {
      title: '国力排行榜',
      rank: '排名',
      country: '国家/玩家',
      faction: '势力',
      power: '国力总分',
      details: '具体实力',
      army: '陆军',
      navy: '海军',
      airForce: '空军',
      nuclear: '核武',
      economy: '经济',
      stability: '稳定',
      diplomacy: '外交',
      intel: '情报',
    },
    
    // 事件
    events: {
      latest: '最新事件',
      timeline: '时间线',
      tehran: '德黑兰权力交接',
      oil: '油价突破$85/桶',
      saudi: '沙特紧急斡旋',
    },
    
    // 时间线筛选
    timeline: {
      label: '时间线',
      today: '今天',
      yesterday: '昨天',
      thisWeek: '本周',
      all: '全部',
    },
    
    // 加载
    loading: {
      map: '正在加载中东地图...',
      waiting: '请稍候',
    },
    
    // 登录页面
    login: {
      title: '推演',
      subtitle: 'AE 六年 · 中东地缘政治推演',
      welcome: '欢迎',
      chooseNation: '选择你的国家',
      startSimulation: '开始推演',
    },
    
    // 通用
    common: {
      switchLanguage: 'English',
    },
    
    // 消息
    messages: {
      public: '公开频道',
      private: '私密频道',
      send: '发送',
      placeholder: '输入消息...',
    },
    
    // 时间
    time: {
      ago: '{time} 前',
      justNow: '刚刚',
      minutes: '分钟',
      hours: '小时',
      days: '天',
    },
    
    // 国家详情
    country: {
      faction: '势力归属',
      stability: '稳定度',
      leader: '领导人',
      status: '状态',
      population: '人口',
      gdp: 'GDP',
      viewDetail: '查看详情',
      sendMessage: '发送消息',
      analyze: '分析预测',
      pending: '待确定',
      noData: '暂无数据',
    },
    
    // 势力名称
    factions: {
      resistance: '抵抗轴心',
      usIsrael: '美以联盟',
      moderate: '温和联盟',
      brotherhood: '亲穆兄会',
      other: '其他',
    },
    
    // 状态
    status: {
      neutral: '🕊️ 非活跃区域',
      tension: '⚠️ 局势紧张',
    },
    
    // 国家名称（用于外交/军事面板）
    countries: {
      'IRN': '伊朗',
      'IRQ': '伊拉克',
      'SYR': '叙利亚',
      'ISR': '以色列',
      'SAU': '沙特',
      'USA': '美国',
      'ARE': '阿联酋',
      'TUR': '土耳其',
      'EGY': '埃及',
      'QAT': '卡塔尔',
      'KWT': '科威特',
      'BHR': '巴林',
      'OMN': '阿曼',
      'YEM': '也门',
      'JOR': '约旦',
      'LBN': '黎巴嫩',
      'PSE': '巴勒斯坦',
      'RUS': '俄罗斯',
      'CHN': '中国',
      'GBR': '英国',
      'FRA': '法国',
      'DEU': '德国',
    },
    
    // 事件翻译
    events: {
      'Riyadh Emergency Mediation': '利雅得紧急斡旋',
      'Saudi Emergency Mediation': '沙特紧急斡旋',
      'Tehran Power Transition': '德黑兰权力交接',
      'Oil Breaks $85': '油价突破$85/桶',
      'Oil price breaks $85/barrel': '油价突破$85/桶',
    },
  },
  
  en: {
    // General
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',
    
    // Title
    title: 'Mideast Geopolitical Simulation',
    subtitle: 'MideastSim Geopolitical Simulation',
    
    // Navigation
    nav: {
      home: 'Home',
      map: 'Map',
      economy: 'Economy',
      diplomacy: 'Diplomacy',
      military: 'Military',
      leaderboard: 'Leaderboard',
      settings: 'Settings',
    },
    
    // Auth
    auth: {
      login: 'Login',
      register: 'Register',
      logout: 'Logout',
      username: 'Username',
      password: 'Password',
      email: 'Email',
      loginSuccess: 'Login successful!',
      loginFailed: 'Login failed',
      chooseNation: 'Choose Nation',
      selectedNation: 'Selected: ',
    },
    
    // Nation
    nation: {
      select: 'Select Nation',
      info: 'Nation Info',
      attributes: 'National Power',
      army: 'Army',
      navy: 'Navy',
      airForce: 'Air Force',
      nuclear: 'Nuclear',
      economy: 'Economy',
      stability: 'Stability',
      diplomacy: 'Diplomacy',
      intel: 'Intelligence',
      faction: 'Faction',
    },
    
    // Actions
    actions: {
      title: 'Actions',
      declareWar: 'Declare War',
      proposePeace: 'Propose Peace',
      sanction: 'Sanction',
      proposeAlliance: 'Propose Alliance',
      militaryExercise: 'Military Exercise',
      diplomaticStatement: 'Diplomatic Statement',
      confirmWar: 'Confirm declare war on {nation}?',
      warDeclared: 'War declared on {nation}!',
      allianceProposed: 'Alliance proposed to {nation}!',
      sanctionImposed: 'Sanctions imposed on {nation}!',
      exerciseCompleted: 'Military exercise completed!',
      statementIssued: 'Diplomatic statement issued!',
      needBetterRelation: 'Relation too low, need to improve first',
      currentRelation: 'Current relation: ',
      inWar: 'Already at war',
      alreadyAllies: 'Already allies',
    },
    
    // Economy
    economy: {
      title: '💰 Economic Panel',
      gdp: 'GDP',
      trade: 'Trade',
      resources: 'Resources',
      sanctions: 'Sanctions Status',
      stocks: 'Stock Market',
      crypto: 'Cryptocurrency',
      commodities: 'Commodities',
      spx: 'S&P 500',
      hsi: 'Hang Seng Index',
      ftse: 'FTSE 100',
      btc: 'Bitcoin',
      eth: 'Ethereum',
      oil: 'Crude Oil (WTI)',
      gold: 'Gold',
      silver: 'Silver',
      oilSanctions: 'Oil Sanctions',
      fullSanctions: 'Full Sanctions',
    },
    
    // Diplomacy
    diplomacy: {
      title: '🤝 Diplomacy Panel',
      relations: 'Diplomatic Relations',
      alliance: 'Alliance',
      war: 'War',
      neutral: 'Neutral',
      friendly: 'Friendly',
      hostile: 'Hostile',
      support: 'Support',
      criticize: 'Criticize',
    },
    
    // Military
    military: {
      title: '⚔️ Military Panel',
      wars: 'Active Wars',
      noWars: 'No active wars',
      aggressor: 'Aggressor',
      defender: 'Defender',
      startTime: 'Start Time',
      casualties: 'Casualties',
      routine: 'Routine',
      large: 'Large Scale',
    },
    
    // Resource labels (header economic data)
    resources: {
      oil: 'Oil',
      gold: 'Gold',
      btc: 'BTC',
    },
    
    // Settings
    settings: {
      title: 'Settings',
      language: 'Language',
      chinese: '中文',
      english: 'English',
      notifications: 'Notifications',
      sound: 'Sound',
      music: 'Music',
      graphics: 'Graphics',
      actionNotifications: 'Action Notifications',
      warAlerts: 'War Alerts',
      soundEffects: 'Sound Effects',
      version: 'Version',
      buildDate: 'Build Date',
      about: 'About',
    },
    
    // Leaderboard
    leaderboard: {
      title: 'Power Rankings',
      rank: 'Rank',
      country: 'Country/Player',
      faction: 'Faction',
      power: 'Total Power',
      details: 'Details',
    },
    
    // Events
    events: {
      latest: 'Latest Events',
      timeline: 'Timeline',
      tehran: 'Tehran Power Transition',
      oil: 'Oil Breaks $85',
      saudi: 'Saudi Mediation',
    },
    
    // Timeline filters
    timeline: {
      label: 'Timeline',
      today: 'Today',
      yesterday: 'Yesterday',
      thisWeek: 'This Week',
      all: 'All',
    },
    
    // Loading
    loading: {
      map: 'Loading Middle East Map...',
      mapZh: '正在加载中东地图...',
      waiting: 'Please wait',
      waitingZh: '请稍候',
    },
    
    // Login Page
    login: {
      title: 'MideastSim',
      subtitle: 'AE Year 6 · Geopolitical Simulation',
      titleZh: '推演',
      subtitleZh: 'AE 六年 · 中东地缘政治推演',
      welcome: 'Welcome',
      chooseNation: 'Choose Your Nation',
      startSimulation: 'Start Simulation',
    },
    
    // Leaderboard
    leaderboard: {
      army: 'Army',
      navy: 'Navy',
      airForce: 'Air Force',
      nuclear: 'Nuclear',
      economy: 'Economy',
      stability: 'Stability',
      diplomacy: 'Diplomacy',
      intel: 'Intel',
    },
    
    // Common
    common: {
      switchLanguage: '中文',
      switchLanguageZh: 'English',
    },
    
    // Messages
    messages: {
      public: 'Public Channel',
      private: 'Private Channel',
      send: 'Send',
      placeholder: 'Enter message...',
    },
    
    // Time
    time: {
      ago: '{time} ago',
      justNow: 'Just now',
      minutes: 'min',
      hours: 'hr',
      days: 'day',
    },
    
    // Country Detail
    country: {
      faction: 'Faction',
      stability: 'Stability',
      leader: 'Leader',
      status: 'Status',
      population: 'Population',
      gdp: 'GDP',
      viewDetail: 'View Details',
      sendMessage: 'Send Message',
      analyze: 'Analyze',
      pending: 'Pending',
      noData: 'No Data',
    },
    
    // Factions
    factions: {
      resistance: 'Resistance Axis',
      usIsrael: 'US-Israel Alliance',
      moderate: 'Moderate Alliance',
      brotherhood: 'Muslim Brotherhood',
      other: 'Other',
    },
    
    // Status
    status: {
      neutral: '🕊️ Non-Active Region',
      tension: '⚠️ Tense Situation',
    },
    
    // Country Names (for diplomacy/military panels)
    countries: {
      'IRN': 'Iran',
      'IRQ': 'Iraq',
      'SYR': 'Syria',
      'ISR': 'Israel',
      'SAU': 'Saudi Arabia',
      'USA': 'United States',
      'ARE': 'UAE',
      'TUR': 'Turkey',
      'EGY': 'Egypt',
      'QAT': 'Qatar',
      'KWT': 'Kuwait',
      'BHR': 'Bahrain',
      'OMN': 'Oman',
      'YEM': 'Yemen',
      'JOR': 'Jordan',
      'LBN': 'Lebanon',
      'PSE': 'Palestine',
      'RUS': 'Russia',
      'CHN': 'China',
      'GBR': 'United Kingdom',
      'FRA': 'France',
      'DEU': 'Germany',
    },
    
    // Event translations (English keeps original)
    events: {
      'Riyadh Emergency Mediation': 'Riyadh Emergency Mediation',
      'Saudi Emergency Mediation': 'Saudi Emergency Mediation',
      'Tehran Power Transition': 'Tehran Power Transition',
      'Oil Breaks $85': 'Oil Breaks $85',
      'Oil price breaks $85/barrel': 'Oil price breaks $85/barrel',
    },
  },
};

// 当前语言 - 默认英文
let currentLang = localStorage.getItem('mideastsim_lang') || 'en';

// 获取翻译
export const t = (key, params = {}) => {
  const keys = key.split('.');
  let value = translations[currentLang];
  
  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) return key;
  }
  
  // 替换参数
  if (typeof value === 'string') {
    Object.entries(params).forEach(([k, v]) => {
      value = value.replace(`{${k}}`, String(v));
    });
  }
  
  return value;
};

// 获取当前语言
export const getLang = () => currentLang;

// 设置语言
export const setLang = (lang) => {
  if (['zh', 'en'].includes(lang)) {
    currentLang = lang;
    localStorage.setItem('mideastsim_lang', lang);
    // 触发语言变更事件
    window.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  }
};

// 翻译事件文本
export const translateEvent = (text) => {
  if (!text) return text;
  const events = translations[currentLang]?.events;
  if (events && events[text]) {
    return events[text];
  }
  return text;
};

// 翻译组件 Hook
export const useTranslation = () => {
  const [lang, setLangState] = React.useState(currentLang);
  
  React.useEffect(() => {
    const handler = (e) => setLangState(e.detail.lang);
    window.addEventListener('langchange', handler);
    return () => window.removeEventListener('langchange', handler);
  }, []);
  
  return { t: (key, params) => t(key, params), lang, setLang, translateEvent: (text) => translateEvent(text) };
};

export default { t, getLang, setLang, useTranslation, translateEvent };
