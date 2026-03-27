import React, { useState, useEffect, useRef, useCallback, useTransition, useMemo } from 'react';
import WorldMapNew from './components/WorldMapNew';
import LanguageSwitcher from './components/LanguageSwitcher';
import EconomicPanel from './components/EconomicPanel';
import DiplomacyPanel from './components/DiplomacyPanel';
import MilitaryPanel from './components/MilitaryPanel';
import SettingsPanel from './components/SettingsPanel';
import ActionPanel from './components/ActionPanel';
import Leaderboard from './components/Leaderboard';
import Auth from './components/Auth';
import RoleSelector from './components/RoleSelector';
import WorldChannel from './components/WorldChannel';
import MemorialModal from './components/MemorialModal';
import EventStream from './components/EventStream';
import { storage } from './config/api';
import { world } from './services/api';
import { t, useTranslation, setLang, translateEvent } from './i18n';
import './App.css';

// 国家到领导人的映射（根据国家 ID）
const COUNTRY_LEADER_MAP = {
  'IRN': { name: '阿里·哈梅内伊', nameEn: 'Ali Khamenei', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Ali_Khamenei_in_Mashhad_%282016%29_02_%28cropped%29.jpg/220px-Ali_Khamenei_in_Mashhad_%282016%29_02_%28cropped%29.jpg' },
  'IRQ': { name: '穆杰塔巴·萨德尔', nameEn: 'Mujtaba Sadr', image: 'https://ui-avatars.com/api/?name=Mujtaba+Sadr&size=220&background=8B1A1A&color=fff' },
  'SYR': { name: '巴沙尔·阿萨德', nameEn: 'Bashar al-Assad', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Bashar_al-Assad_in_Moscow%2C_18_May_2023_%28cropped%29.jpg/220px-Bashar_al-Assad_in_Moscow%2C_18_May_2023_%28cropped%29.jpg' },
  'ISR': { name: '本雅明·内塔尼亚胡', nameEn: 'Benjamin Netanyahu', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Netanyahu_2017_%28cropped%29.jpg/220px-Netanyahu_2017_%28cropped%29.jpg' },
  'USA': { name: '唐纳德·特朗普', nameEn: 'Donald Trump', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Donald_Trump_official_portrait.jpg/220px-Donald_Trump_official_portrait.jpg' },
  'SAU': { name: '萨勒曼国王', nameEn: 'King Salman', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Salman_bin_Abdulaziz_Al_Saud_2019.jpg/220px-Salman_bin_Abdulaziz_Al_Saud_2019.jpg' },
  'EGY': { name: '阿卜杜勒 - 法塔赫·塞西', nameEn: 'Abdel Fattah el-Sisi', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Abdel_Fattah_el-Sisi_2015.jpg/220px-Abdel_Fattah_el-Sisi_2015.jpg' },
  'TUR': { name: '雷杰普·塔伊普·埃尔多安', nameEn: 'Recep Tayyip Erdogan', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Recep_Tayyip_Erdogan_%282023%29_%28cropped%29.jpg/220px-Recep_Tayyip_Erdogan_%282023%29_%28cropped%29.jpg' },
  'JOR': { name: '阿卜杜拉二世', nameEn: 'Abdullah II', image: 'https://ui-avatars.com/api/?name=Abdullah+II&size=220&background=1E4F8A&color=fff' },
  'LBN': { name: '约瑟夫·奥恩', nameEn: 'Joseph Aoun', image: 'https://ui-avatars.com/api/?name=Joseph+Aoun&size=220&background=8B1A1A&color=fff' },
  'PSE': { name: '马哈茂德·阿巴斯', nameEn: 'Mahmoud Abbas', image: 'https://ui-avatars.com/api/?name=Mahmoud+Abbas&size=220&background=8B1A1A&color=fff' },
  'YEM': { name: '拉沙德·阿里米', nameEn: 'Rashad al-Alimi', image: 'https://ui-avatars.com/api/?name=Rashad+al-Alimi&size=220&background=B8860B&color=fff' },
  'OMN': { name: '海赛姆·本·塔里克', nameEn: 'Haitham bin Tariq', image: 'https://ui-avatars.com/api/?name=Haitham+bin+Tariq&size=220&background=B8860B&color=fff' },
  'KWT': { name: '米沙勒·艾哈迈德', nameEn: 'Mishal Al-Ahmad', image: 'https://ui-avatars.com/api/?name=Mishal+Al-Ahmad&size=220&background=B8860B&color=fff' },
  'QAT': { name: '塔米姆·本·哈马德', nameEn: 'Tamim bin Hamad', image: 'https://ui-avatars.com/api/?name=Tamim+bin+Hamad&size=220&background=B8860B&color=fff' },
  'ARE': { name: '穆罕默德·本·扎耶德', nameEn: 'Mohamed bin Zayed', image: 'https://ui-avatars.com/api/?name=Mohamed+bin+Zayed&size=220&background=B8860B&color=fff' },
  'BHR': { name: '哈马德·本·伊萨', nameEn: 'Hamad bin Isa', image: 'https://ui-avatars.com/api/?name=Hamad+bin+Isa&size=220&background=B8860B&color=fff' },
  'AFG': { name: '海巴图拉·阿洪扎达', nameEn: 'Hibatullah Akhundzada', image: 'https://ui-avatars.com/api/?name=Hibatullah+Akhundzada&size=220&background=7B7B7B&color=fff' },
  'ARM': { name: '尼科尔·帕希尼扬', nameEn: 'Nikol Pashinyan', image: 'https://ui-avatars.com/api/?name=Nikol+Pashinyan&size=220&background=7B7B7B&color=fff' },
  'AZE': { name: '伊利哈姆·阿利耶夫', nameEn: 'Ilham Aliyev', image: 'https://ui-avatars.com/api/?name=Ilham+Aliyev&size=220&background=7B7B7B&color=fff' },
  'GEO': { name: '萨洛梅·祖拉比什维利', nameEn: 'Salome Zourabichvili', image: 'https://ui-avatars.com/api/?name=Salome+Zourabichvili&size=220&background=7B7B7B&color=fff' },
};

// 国力属性描述（用于 tooltip）
const POWER_ATTR_DESCRIPTIONS = {
  army: { zh: '军力 - 陆军作战能力', en: 'Army - Land combat capability' },
  navy: { zh: '海军 - 海上作战力量', en: 'Navy - Naval combat force' },
  airForce: { zh: '空军 - 空中作战力量', en: 'Air Force - Air combat force' },
  nuclear: { zh: '核武 - 核威慑能力', en: 'Nuclear - Nuclear deterrent' },
  economy: { zh: '经济 - 国家经济实力', en: 'Economy - National economic strength' },
  stability: { zh: '稳定 - 国内政治稳定性', en: 'Stability - Domestic political stability' },
  diplomacy: { zh: '外交 - 国际外交影响力', en: 'Diplomacy - International diplomatic influence' },
  intel: { zh: '情报 - 情报收集能力', en: 'Intel - Intelligence gathering capability' },
};

// 势力数据
const FACTIONS = [
  { 
    id: 'resistance', 
    name: '抵抗轴心', 
    color: '#8B1A1A', 
    countries: ['伊朗', '伊拉克', '叙利亚', '黎巴嫩', '巴勒斯坦'],
    strength: 85,
    description: '以伊朗为核心的地区抵抗力量联盟'
  },
  { 
    id: 'us-israel', 
    name: '美以联盟', 
    color: '#1E4F8A', 
    countries: ['美国', '以色列', '约旦'],
    strength: 92,
    description: '美国与以色列的战略合作联盟'
  },
  { 
    id: 'moderate', 
    name: '温和联盟', 
    color: '#B8860B', 
    countries: ['沙特', '埃及', '阿联酋', '科威特', '卡塔尔', '巴林', '阿曼', '也门'],
    strength: 78,
    description: '海湾阿拉伯国家组成的温和派联盟'
  },
  { 
    id: 'brotherhood', 
    name: '亲穆兄会', 
    color: '#2D5A27', 
    countries: ['土耳其', '卡塔尔'],
    strength: 72,
    description: '支持穆斯林兄弟会的政治力量'
  },
];

function App() {
  const { t, lang } = useTranslation();
  
  // 认证状态
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [player, setPlayer] = useState(null);
  const [currentRole, setCurrentRole] = useState(null);
  const [showAuth, setShowAuth] = useState(true);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  
  // 游戏状态
  const [worldState, setWorldState] = useState(null);
  const [events, setEvents] = useState([]);
  const [wars, setWars] = useState([]); // 进行中的战争
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPlaying, setIsPlaying] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [currentTimelineDate, setCurrentTimelineDate] = useState('today'); // 内部使用英文 key
  
  // 导航状态
  const [currentPage, setCurrentPage] = useState('map');
  
  // 用户国家实力数据
  const [userCountryPower, setUserCountryPower] = useState(null);
  
  // UI 状态
  const [showEventPanel, setShowEventPanel] = useState(false);
  const [showEconomicPanel, setShowEconomicPanel] = useState(false);
  const [showFactionPanel, setShowFactionPanel] = useState(false);
  const [showLeaderPanel, setShowLeaderPanel] = useState(false);
  const [showDiplomacyPanel, setShowDiplomacyPanel] = useState(false);
  const [showMilitaryPanel, setShowMilitaryPanel] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showActionPanel, setShowActionPanel] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [selectedLeader, setSelectedLeader] = useState(null);
  const [selectedFaction, setSelectedFaction] = useState(null);
  
  // 性能优化：直接状态更新（useTransition 增加开销）
  // const [isPending, startTransition] = useTransition();
  
  // 决策弹窗状态（全局）
  const [decisionModal, setDecisionModal] = useState({
    show: false,
    decision: null,
    action: null,
    target: null,
    params: null,
    rejected: false
  });
  
  // 当前国家（用于行动）- 从 currentRole 同步
  const [currentNation, setCurrentNation] = useState({
    id: 'IRN',
    name: '伊朗',
    flag: '🇮🇷',
  });
  
  // 当 currentRole 变化时，更新 currentNation
  useEffect(() => {
    if (currentRole && currentRole.role_id) {
      setCurrentNation({
        id: currentRole.role_id,
        name: currentRole.role_name || currentRole.name || currentRole.role_id,
        flag: currentRole.flag || '🏛️',
        faction: currentRole.faction,
      });
    }
  }, [currentRole]);

  // 获取用户绑定国家的实力数据
  useEffect(() => {
    const fetchUserCountryPower = async () => {
      try {
        // 确定要查询的国家 ID（游客默认为伊朗 IRN）
        const countryId = currentRole?.role_id || 'IRN';
        
        const response = await fetch(`/api/roles`);
        if (response.ok) {
          const data = await response.json();
          const roles = data.roles || data;
          const userRole = roles.find(r => r.id === countryId);
          
          if (userRole) {
            const attrs = userRole.attributes || {};
            const totalPower = (attrs.army || 0) + 
                              (attrs.navy || 0) + 
                              (attrs.airForce || 0) + 
                              (attrs.nuclear || 0) + 
                              (attrs.economy || 0) + 
                              (attrs.stability || 0) + 
                              (attrs.diplomacy || 0) + 
                              (attrs.intel || 0);
            
            // 获取对应国家领导人头像
            const leader = COUNTRY_LEADER_MAP[countryId] || COUNTRY_LEADER_MAP['IRN'];
            
            setUserCountryPower({
              name: userRole.name,
              leaderImage: leader.image,
              leaderName: lang === 'zh' ? leader.name : leader.nameEn,
              totalPower,
              attributes: attrs,
              faction: userRole.faction
            });
          }
        }
      } catch (error) {
        console.error('获取用户国家实力失败:', error);
      }
    };

    fetchUserCountryPower();
    
    // 每 60 秒刷新一次
    const pollInterval = setInterval(fetchUserCountryPower, 60000);
    return () => clearInterval(pollInterval);
  }, [currentRole, lang]);
  
  // 地图引用
  const mapResetRef = useRef(null);
  const mapLeaderSelectRef = useRef(null);
  
  // 决策弹窗处理函数
  const handleShowDecision = useCallback((modalData) => {
    setDecisionModal({
      show: true,
      ...modalData
    });
  }, []);
  
  const handleCloseDecision = useCallback(() => {
    setDecisionModal(prev => ({ ...prev, show: false }));
  }, []);
  
  const handleConfirmDecision = useCallback(async () => {
    const { action, target, params } = decisionModal;
    
    setDecisionModal(prev => ({ ...prev, show: false, loading: true }));
    
    try {
      const apiActions = await import('./services/api');
      const result = await apiActions.actions.execute(action.id, target, params);
      
      if (result.success) {
        // 触发行完成回调
        window.dispatchEvent(new CustomEvent('actionComplete', { detail: result }));
      } else {
        window.dispatchEvent(new CustomEvent('actionError', { detail: { message: result.message } }));
      }
    } catch (err) {
      window.dispatchEvent(new CustomEvent('actionError', { detail: { message: err.message } }));
    }
  }, [decisionModal]);

  // 认证处理
  const handleAuthSuccess = useCallback((authData) => {
    setPlayer(authData.player);
    setIsAuthenticated(true);
    setShowAuth(false);
    
    console.log('🔐 认证成功:', authData);
    console.log('📋 player.role_id:', authData.player?.role_id);
    
    // 已有角色的玩家直接进入地图，没有角色的才显示选择器
    if (authData.token) {
      // 处理后端返回的 SQL NullString 格式：{"String":"ARE","Valid":true}
      const hasRole = authData.player && (
        // 如果是字符串（前端格式）
        typeof authData.player.role_id === 'string' ||
        // 如果是 SQL NullString 格式（后端返回）
        (authData.player.role_id && authData.player.role_id.Valid === true)
      );
      
      if (hasRole) {
        // 已有角色，直接进入地图
        console.log('✅ 玩家已绑定国家，直接进入游戏');
        setCurrentRole(authData.player);
        storage.setRole(authData.player);
        setShowRoleSelector(false);
      } else {
        // 没有角色，显示选择器
        console.log('📋 玩家未绑定国家，显示角色选择器');
        setShowRoleSelector(true);
      }
    }
  }, []);

  const handleRoleSelect = useCallback((role) => {
    setCurrentRole(role);
    setShowRoleSelector(false);
    
    if (role) {
      storage.setRole(role);
    }
  }, []);

  const handleLogout = useCallback(() => {
    storage.clear();
    setIsAuthenticated(false);
    setPlayer(null);
    setCurrentRole(null);
    setShowAuth(true);
    setShowRoleSelector(false);
  }, []);

  // 导航处理
  const handleNavigate = (pageId) => {
    console.log('App handleNavigate:', pageId);
    setCurrentPage(pageId);
    
    // 根据页面显示对应面板
    switch(pageId) {
      case 'map':
        console.log('Showing: map (all panels false)');
        setShowEconomicPanel(false);
        setShowDiplomacyPanel(false);
        setShowMilitaryPanel(false);
        setShowSettingsPanel(false);
        setShowLeaderboard(false);
        setShowFactionPanel(false);
        break;
      case 'faction':
        console.log('Showing: faction panel');
        setShowEconomicPanel(false);
        setShowDiplomacyPanel(false);
        setShowMilitaryPanel(false);
        setShowSettingsPanel(false);
        setShowLeaderboard(false);
        setShowFactionPanel(true);
        setCurrentPage('map'); // 不保持 active 状态
        break;
      case 'economy':
        console.log('Showing: economy panel');
        setShowEconomicPanel(true);
        setShowDiplomacyPanel(false);
        setShowMilitaryPanel(false);
        setShowSettingsPanel(false);
        setShowLeaderboard(false);
        setCurrentPage('map'); // 不保持 active 状态
        break;
      case 'diplomacy':
        console.log('Showing: diplomacy panel');
        setShowEconomicPanel(false);
        setShowDiplomacyPanel(true);
        setShowMilitaryPanel(false);
        setShowSettingsPanel(false);
        setShowLeaderboard(false);
        setCurrentPage('map'); // 不保持 active 状态
        break;
      case 'military':
        console.log('Showing: military panel');
        setShowEconomicPanel(false);
        setShowDiplomacyPanel(false);
        setShowMilitaryPanel(true);
        setShowSettingsPanel(false);
        setShowLeaderboard(false);
        setCurrentPage('map'); // 不保持 active 状态
        break;
      case 'leaderboard':
        console.log('Showing: leaderboard');
        setShowEconomicPanel(false);
        setShowDiplomacyPanel(false);
        setShowMilitaryPanel(false);
        setShowSettingsPanel(false);
        setShowLeaderboard(true);
        setCurrentPage('map'); // 不保持 active 状态
        break;
      case 'settings':
        console.log('Showing: settings panel');
        setShowEconomicPanel(false);
        setShowDiplomacyPanel(false);
        setShowMilitaryPanel(false);
        setShowSettingsPanel(true);
        setShowLeaderboard(false);
        setCurrentPage('map'); // 不保持 active 状态
        break;
      default:
        break;
    }
  };

  // 更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 检查认证状态
  useEffect(() => {
    const checkAuth = () => {
      const storedPlayer = storage.getPlayer();
      const storedRole = storage.getRole();
      
      if (storedPlayer) {
        setPlayer(storedPlayer);
        setIsAuthenticated(true);
        setShowAuth(false);
        
        if (storedRole) {
          setCurrentRole(storedRole);
          setShowRoleSelector(false);
        } else {
          setShowRoleSelector(true);
        }
      }
    };
    
    checkAuth();
  }, []);

  // 页面加载时滚动到顶部
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // 监听行动完成事件，显示 Toast 通知
  useEffect(() => {
    const handleActionComplete = (event) => {
      console.log('🎉 行动完成:', event.detail);
      // 显示成功通知
      const toast = document.createElement('div');
      toast.className = 'action-toast action-toast-success';
      toast.innerHTML = `
        <span class="toast-icon">✅</span>
        <span class="toast-message">${event.detail.message || '行动执行成功！'}</span>
      `;
      document.body.appendChild(toast);
      
      // 动画显示
      setTimeout(() => toast.classList.add('show'), 10);
      
      // 3 秒后移除
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    };

    const handleActionError = (event) => {
      console.log('❌ 行动失败:', event.detail);
      // 显示错误通知
      const toast = document.createElement('div');
      toast.className = 'action-toast action-toast-error';
      toast.innerHTML = `
        <span class="toast-icon">❌</span>
        <span class="toast-message">${event.detail.message || '行动执行失败！'}</span>
      `;
      document.body.appendChild(toast);
      
      // 动画显示
      setTimeout(() => toast.classList.add('show'), 10);
      
      // 3 秒后移除
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    };

    window.addEventListener('actionComplete', handleActionComplete);
    window.addEventListener('actionError', handleActionError);

    return () => {
      window.removeEventListener('actionComplete', handleActionComplete);
      window.removeEventListener('actionError', handleActionError);
    };
  }, []);

  // 获取初始数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        const worldResponse = await fetch(`/api/world/state`);
        if (!worldResponse.ok) {
          throw new Error(`Failed to fetch world state: ${worldResponse.status}`);
        }
        const worldData = await worldResponse.json();
        
        // 合并默认经济数据 (真实市场数据 2026-03-12)
        const mergedData = {
          ...worldData,
          hotspots: worldData.hotspots || [],
          economic: {
            commodities: {
              Oil: { value: '$96.35', change: 3.2 },
              Gold: { value: '$5153', change: 1.8 },
              Silver: { value: '$86.84', change: 1.28 }
            },
            crypto: {
              BTC: { value: '$70523', change: 0.58 },
              ETH: { value: '$2064', change: 1.81 }
            },
            stocks: {
              SPX: { value: '6672.62', change: -1.5 },
              HSI: { value: '25716.76', change: -0.70 }
            },
            domestic: worldData.economic?.domestic || {}
          }
        };
        
        setWorldState(mergedData);
        setEvents(worldData.events || []);
        
        // 获取战争状态
        try {
          const warsRes = await fetch('/api/world/wars');
          if (warsRes.ok) {
            const warsData = await warsRes.json();
            setWars(warsData.wars || []);
          }
        } catch (error) {
          console.error('获取战争状态失败:', error);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        const fallbackWorldState = {
          timestamp: new Date().toISOString(),
          events: [],
          leaders: [],
          hotspots: [],
          economic: {
            commodities: {
              Oil: { value: '$96.35', change: 3.2 },
              Gold: { value: '$5153', change: 1.8 },
              Silver: { value: '$86.84', change: 1.28 }
            },
            crypto: {
              BTC: { value: '$70523', change: 0.58 },
              ETH: { value: '$2064', change: 1.81 }
            },
            stocks: {
              SPX: { value: '6672.62', change: -1.5 },
              HSI: { value: '25716.76', change: -0.70 }
            }
          }
        };
        setWorldState(fallbackWorldState);
        setEvents([]);
      }
    };

    fetchData();
    
    // 每 30 秒轮询更新
    const pollInterval = setInterval(() => {
      fetchData();
    }, 30000);

    return () => clearInterval(pollInterval);
  }, []);

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  // PM Agent 分析事件影响
  const analyzeEventWithPM = async (event, auto = false) => {
    console.log('🤖 PM Agent 分析事件:', event.id, auto ? '(自动)' : '(手动)');
    
    // 如果已经有分析，跳过
    if (event.pm_analysis) {
      console.log('✅ 已有分析，跳过');
      return;
    }
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/agent/pm/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          event_id: event.id,
          event_type: event.type,
          location: event.location,
          title: event.title || event.text,
          description: event.description
        })
      });
      
      if (response.ok) {
        const analysis = await response.json();
        console.log('✅ PM Agent 分析结果:', analysis);
        
        setEvents(prevEvents => 
          prevEvents.map(e => 
            e.id === event.id ? { ...e, pm_analysis: analysis } : e
          )
        );
      } else {
        console.warn('⚠️ PM Agent 分析失败:', response.status);
      }
    } catch (error) {
      console.error('❌ PM Agent 分析错误:', error);
    }
  };

  // 批量分析事件（打开事件面板时自动调用）
  const batchAnalyzeEvents = async (eventsToAnalyze) => {
    console.log('🤖 PM Agent 批量分析:', eventsToAnalyze.length, '个事件');
    
    // 只分析前 5 个未分析的重要事件
    const eventsToProcess = eventsToAnalyze
      .filter(e => !e.pm_analysis)
      .slice(0, 5);
    
    for (const event of eventsToProcess) {
      await analyzeEventWithPM(event, true);
      // 避免请求过快
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  };

  // 事件面板打开时自动分析事件
  useEffect(() => {
    if (showEventPanel && events.length > 0) {
      console.log('📜 事件面板打开，触发 PM 分析');
      batchAnalyzeEvents(events);
    }
  }, [showEventPanel]);

  // 国家到势力的映射
  const getCountryFaction = (countryName) => {
    const mapping = {
      '伊朗': '抵抗轴心',
      '伊拉克': '抵抗轴心', 
      '叙利亚': '抵抗轴心',
      '以色列': '美以联盟',
      '约旦': '美以联盟',
      '沙特阿拉伯': '温和联盟',
      '埃及': '温和联盟',
      '土耳其': '亲穆兄会',
      '美国': '美以联盟',
      '中国': '其他',
      '黎巴嫩': '抵抗轴心',
      '也门': '温和联盟',
      '阿曼': '温和联盟',
      '科威特': '温和联盟',
      '卡塔尔': '温和联盟',
      '阿联酋': '温和联盟',
      '巴林': '温和联盟',
      '巴勒斯坦': '抵抗轴心',
      '阿富汗': '其他',
      '亚美尼亚': '其他',
      '阿塞拜疆': '其他',
      '格鲁吉亚': '其他'
    };
    return mapping[countryName] || '其他';
  };

  const handleCountrySelect = useCallback((country) => {
    console.log('🗺️ [DEBUG] handleCountrySelect called with:', country);
    if (country) {
      const countryWithFaction = {
        ...country,
        faction: getCountryFaction(country.name)
      };
      console.log('✅ [DEBUG] Setting selectedCountry:', countryWithFaction);
      setSelectedCountry(countryWithFaction);
    } else {
      console.log('❌ [DEBUG] No country selected, clearing');
      setSelectedCountry(null);
    }
  }, []);

  const handleCloseCountryDetail = useCallback(() => {
    setSelectedCountry(null);
  }, []);

  // 重置地图视图
  const handleResetMap = useCallback(() => {
    if (mapResetRef.current) {
      mapResetRef.current();
    }
    setSelectedCountry(null);
  }, []);

  // 追踪领导人
  const handleTrackLeader = useCallback((leaderId) => {
    const appLeader = LEADERS.find(l => l.id === leaderId);
    console.log('🎯 追踪领导人:', appLeader);
    
    if (appLeader) {
      if (mapLeaderSelectRef.current) {
        mapLeaderSelectRef.current(appLeader);
      } else {
        setSelectedLeader(appLeader);
      }
    }
  }, []);

  // 处理领导人选择（从地图点击）
  const handleLeaderSelect = useCallback((leader) => {
    console.log('🗺️ [DEBUG] handleLeaderSelect called with:', leader);
    if (leader) {
      setSelectedLeader(leader);
    } else {
      setSelectedLeader(null);
    }
  }, []);

  // 格式化时间显示（美国东部时间）
  const formatTime = (date) => {
    // 转换为美国东部时间 (UTC-5 或 UTC-4 夏令时)
    const usTime = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const month = usTime.getMonth() + 1;
    const day = usTime.getDate();
    const hours = usTime.getHours().toString().padStart(2, '0');
    const minutes = usTime.getMinutes().toString().padStart(2, '0');
    return `${month}月${day}日 ${hours}:${minutes}`;
  };

  // 获取势力颜色
  const getFactionColor = (faction) => {
    const colors = {
      '抵抗轴心': '#8B1A1A',
      '美以联盟': '#1E4F8A',
      '温和联盟': '#B8860B',
      '亲穆兄会': '#2D5A27',
      '其他': '#7B7B7B'
    };
    return colors[faction] || colors['其他'];
  };

  // 获取势力样式类
  const getFactionClass = (faction) => {
    const classes = {
      '抵抗轴心': 'resistance',
      '美以联盟': 'us-israel',
      '温和联盟': 'moderate',
      '亲穆兄会': 'brotherhood'
    };
    return classes[faction] || '';
  };

  // 格式化事件类型
  const getEventTypeClass = (type) => {
    return type || 'diplomacy';
  };

  // 格式化事件时间
  const formatEventTime = (timestamp) => {
    const eventDate = new Date(timestamp);
    const now = new Date();
    const diffMs = now - eventDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 60) {
      return `${diffMins}分钟前`;
    } else if (diffHours < 24) {
      return `${diffHours}小时前`;
    } else {
      return formatTime(eventDate);
    }
  };

  // 获取国家旗帜
  const getCountryFlag = (countryName) => {
    const flags = {
      '伊朗': '🇮🇷',
      '伊拉克': '🇮🇶',
      '叙利亚': '🇸🇾',
      '以色列': '🇮🇱',
      '约旦': '🇯🇴',
      '沙特阿拉伯': '🇸🇦',
      '埃及': '🇪🇬',
      '土耳其': '🇹🇷',
      '黎巴嫩': '🇱🇧',
      '也门': '🇾🇪',
      '阿曼': '🇴🇲',
      '科威特': '🇰🇼',
      '卡塔尔': '🇶🇦',
      '阿联酋': '🇦🇪',
      '巴林': '🇧🇭',
      '巴勒斯坦': '🇵🇸',
      '美国': '🇺🇸',
      '中国': '🇨🇳',
      '阿富汗': '🇦🇫',
      '亚美尼亚': '🇦🇲',
      '阿塞拜疆': '🇦🇿',
      '格鲁吉亚': '🇬🇪',
    };
    return flags[countryName] || '🏳️';
  };

  return (
    <div className="app">
      {/* ========== 底图层（做旧效果） ========== */}
      <div className="app-background"></div>
      <div className="app-faction-shadows">
        <div className="app-faction-shadow resistance"></div>
        <div className="app-faction-shadow alliance"></div>
        <div className="app-faction-shadow moderate"></div>
        <div className="app-faction-shadow brotherhood"></div>
      </div>

      {/* ========== 内容层（清晰） ========== */}
      <div className="app-content">
        {/* ========== 认证界面 ========== */}
        {showAuth && (
          <Auth onAuthSuccess={handleAuthSuccess} />
        )}

        {/* ========== 角色选择界面 ========== */}
        {showRoleSelector && (
          <RoleSelector player={player} onRoleSelect={handleRoleSelect} />
        )}

        {/* ========== 主游戏界面（仅当已认证且完成角色选择后显示） ========== */}
        {!showAuth && !showRoleSelector && (
          <>
        {/* ========== 整合顶部栏：导航 + 状态 + 用户信息 ========== */}
        <header className="app-header">
          {/* 左侧：Logo 区域 */}
          <div className="header-left">
            <div className="logo-area">
              <div className="logo">MIDEASTSIM</div>
              <div className="game-subtitle">GEOPOLITICAL SIMULATION</div>
            </div>
          </div>

          {/* 中央：国家实力 + 经济数据 */}
          <div className="header-center">
            {/* 用户绑定国家实力 */}
            <div className="country-power-display">
              {userCountryPower ? (
                <>
                  {/* 左侧：国家领导人头像（跨两排） */}
                  <div className="country-flag-wrapper">
                    <img 
                      src={userCountryPower.leaderImage} 
                      alt={userCountryPower.leaderName}
                      className="leader-image"
                      title={userCountryPower.leaderName}
                    />
                  </div>
                  
                  {/* 右侧：两排布局 */}
                  <div className="country-stats">
                    {/* 第一排：8 项属性 */}
                    <div className="stats-row stats-row-1">
                      <div className="stat-mini" title={lang === 'zh' ? POWER_ATTR_DESCRIPTIONS.army.zh : POWER_ATTR_DESCRIPTIONS.army.en}>
                        <span className="stat-mini-icon">🪖</span>
                        <span className="stat-mini-value">{userCountryPower.attributes.army || 0}</span>
                      </div>
                      <div className="stat-mini" title={lang === 'zh' ? POWER_ATTR_DESCRIPTIONS.navy.zh : POWER_ATTR_DESCRIPTIONS.navy.en}>
                        <span className="stat-mini-icon">⚓</span>
                        <span className="stat-mini-value">{userCountryPower.attributes.navy || 0}</span>
                      </div>
                      <div className="stat-mini" title={lang === 'zh' ? POWER_ATTR_DESCRIPTIONS.airForce.zh : POWER_ATTR_DESCRIPTIONS.airForce.en}>
                        <span className="stat-mini-icon">✈️</span>
                        <span className="stat-mini-value">{userCountryPower.attributes.airForce || 0}</span>
                      </div>
                      <div className="stat-mini" title={lang === 'zh' ? POWER_ATTR_DESCRIPTIONS.nuclear.zh : POWER_ATTR_DESCRIPTIONS.nuclear.en}>
                        <span className="stat-mini-icon">☢️</span>
                        <span className="stat-mini-value">{userCountryPower.attributes.nuclear || 0}</span>
                      </div>
                      <div className="stat-mini" title={lang === 'zh' ? POWER_ATTR_DESCRIPTIONS.economy.zh : POWER_ATTR_DESCRIPTIONS.economy.en}>
                        <span className="stat-mini-icon">💰</span>
                        <span className="stat-mini-value">{userCountryPower.attributes.economy || 0}</span>
                      </div>
                      <div className="stat-mini" title={lang === 'zh' ? POWER_ATTR_DESCRIPTIONS.stability.zh : POWER_ATTR_DESCRIPTIONS.stability.en}>
                        <span className="stat-mini-icon">🏛️</span>
                        <span className="stat-mini-value">{userCountryPower.attributes.stability || 0}</span>
                      </div>
                      <div className="stat-mini" title={lang === 'zh' ? POWER_ATTR_DESCRIPTIONS.diplomacy.zh : POWER_ATTR_DESCRIPTIONS.diplomacy.en}>
                        <span className="stat-mini-icon">🤝</span>
                        <span className="stat-mini-value">{userCountryPower.attributes.diplomacy || 0}</span>
                      </div>
                      <div className="stat-mini" title={lang === 'zh' ? POWER_ATTR_DESCRIPTIONS.intel.zh : POWER_ATTR_DESCRIPTIONS.intel.en}>
                        <span className="stat-mini-icon">👁️</span>
                        <span className="stat-mini-value">{userCountryPower.attributes.intel || 0}</span>
                      </div>
                    </div>
                    
                    {/* 第二排：国家名称、国力总分、势力徽章 */}
                    <div className="stats-row stats-row-2">
                      <span className="country-name">{userCountryPower.name}</span>
                      <span className="power-value">💪 {userCountryPower.totalPower.toLocaleString()}</span>
                      <span className="faction-badge-small" style={{ 
                        background: userCountryPower.faction === '抵抗轴心' ? '#8B1A1A' : 
                                   userCountryPower.faction === '美以联盟' ? '#1E4F8A' : 
                                   userCountryPower.faction === '温和联盟' ? '#B8860B' : 
                                   userCountryPower.faction === '亲穆兄会' ? '#2D5A27' : '#7B7B7B'
                      }}>
                        {userCountryPower.faction || '-'}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* 加载中状态 */}
                  <div className="country-flag-wrapper">
                    <div className="leader-image-loading"></div>
                  </div>
                  <div className="country-stats">
                    <div className="stats-row stats-row-1">
                      <span className="loading-text">数据加载中...</span>
                    </div>
                    <div className="stats-row stats-row-2">
                      <span className="country-name">伊朗</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 资源条 - 可点击打开经济面板 */}
            {worldState && worldState.economic && (
              <div className="resource-bar clickable" onClick={() => setShowEconomicPanel(true)}>
                <div className="resource-item">
                  <span className="resource-label">{t('resources.oil')}</span>
                  <span className="resource-value">
                    ${worldState.economic.commodities?.Oil?.value?.replace('$', '') || '85.3'}
                  </span>
                  <span className={`resource-change ${
                    (worldState.economic.commodities?.Oil?.change || 0) > 0 ? 'up' : 'down'
                  }`}>
                    {(worldState.economic.commodities?.Oil?.change || 0) > 0 ? '↑' : '↓'}
                    {Math.abs(worldState.economic.commodities?.Oil?.change || 0)}%
                  </span>
                </div>
                <div className="resource-item">
                  <span className="resource-label">{t('resources.gold')}</span>
                  <span className="resource-value">
                    ${worldState.economic.commodities?.Gold?.value?.replace('$', '') || '2150'}
                  </span>
                  <span className={`resource-change ${
                    (worldState.economic.commodities?.Gold?.change || 0) > 0 ? 'up' : 'down'
                  }`}>
                    {(worldState.economic.commodities?.Gold?.change || 0) > 0 ? '↑' : '↓'}
                    {Math.abs(worldState.economic.commodities?.Gold?.change || 0)}%
                  </span>
                </div>
                <div className="resource-item">
                  <span className="resource-label">{t('resources.btc')}</span>
                  <span className="resource-value">
                    ${worldState.economic.crypto?.BTC?.value?.replace('$', '') || '68200'}
                  </span>
                  <span className={`resource-change ${
                    (worldState.economic.crypto?.BTC?.change || 0) > 0 ? 'up' : 'down'
                  }`}>
                    {(worldState.economic.crypto?.BTC?.change || 0) > 0 ? '↑' : '↓'}
                    {Math.abs(worldState.economic.crypto?.BTC?.change || 0)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 右侧：时间 + 用户信息 + 导航按钮 */}
          <div className="header-right">
            <div className="right-column">
              {/* 第一行：时间（左）+ 用户信息（右） */}
              <div className="top-row">
                {/* 时间显示 - 统一格式 */}
                <div className="time-display">
                  <span className="time-icon">🕐</span>
                  <span className="time-value">
                    {(() => {
                      const now = new Date();
                      const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
                      const date = now.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
                      return `${time}, ${date}`;
                    })()}
                  </span>
                </div>
                
                {/* 用户信息 + 登出 */}
                {player && (
                  <div className="user-info">
                    <div className="user-avatar">👤</div>
                    <div className="user-details">
                      <div className="user-name">{player.username}</div>
                      {currentRole && (
                        <div className="user-role">
                          {currentRole.flag || '🏛️'} {currentRole.role_name || currentRole.name}
                        </div>
                      )}
                    </div>
                    <button className="logout-btn" onClick={handleLogout} title="登出">
                      🚪
                    </button>
                  </div>
                )}
              </div>
              
              {/* 第二行：导航按钮 */}
              <nav className="header-nav">
                <button
                  className={`nav-item ${currentPage === 'faction' ? 'active' : ''}`}
                  onClick={() => handleNavigate('faction')}
                >
                  <span className="nav-icon">👥</span>
                  <span className="nav-label">{lang === 'zh' ? '势力' : 'Faction'}</span>
                </button>
                <button
                  className={`nav-item ${currentPage === 'economy' ? 'active' : ''}`}
                  onClick={() => handleNavigate('economy')}
                >
                  <span className="nav-icon">📊</span>
                  <span className="nav-label">{lang === 'zh' ? '经济' : 'Economy'}</span>
                </button>
                <button
                  className={`nav-item ${currentPage === 'diplomacy' ? 'active' : ''}`}
                  onClick={() => handleNavigate('diplomacy')}
                >
                  <span className="nav-icon">🤝</span>
                  <span className="nav-label">{lang === 'zh' ? '外交' : 'Diplomacy'}</span>
                </button>
                <button
                  className={`nav-item ${currentPage === 'military' ? 'active' : ''}`}
                  onClick={() => handleNavigate('military')}
                >
                  <span className="nav-icon">⚔️</span>
                  <span className="nav-label">{lang === 'zh' ? '军事' : 'Military'}</span>
                </button>
                <button
                  className={`nav-item ${currentPage === 'leaderboard' ? 'active' : ''}`}
                  onClick={() => handleNavigate('leaderboard')}
                >
                  <span className="nav-icon">🏆</span>
                  <span className="nav-label">{lang === 'zh' ? '排行榜' : 'Rank'}</span>
                </button>
                <button
                  className={`nav-item ${currentPage === 'settings' ? 'active' : ''}`}
                  onClick={() => handleNavigate('settings')}
                >
                  <span className="nav-icon">⚙️</span>
                  <span className="nav-label">{lang === 'zh' ? '设置' : 'Settings'}</span>
                </button>
              </nav>
            </div>
          </div>
        </header>

      {/* ========== 时间线 ========== */}
      <div className="timeline-container">
        <div className="timeline-header">
          <span className="timeline-label">⏱️ {t('timeline.label')}</span>
          <div className="timeline-dates">
            <span 
              className={`timeline-date ${currentTimelineDate === 'today' ? 'active' : ''}`}
              onClick={() => setCurrentTimelineDate('today')}
            >
              {t('timeline.today')}
            </span>
            <span 
              className={`timeline-date ${currentTimelineDate === 'yesterday' ? 'active' : ''}`}
              onClick={() => setCurrentTimelineDate('yesterday')}
            >
              {t('timeline.yesterday')}
            </span>
            <span 
              className={`timeline-date ${currentTimelineDate === 'thisWeek' ? 'active' : ''}`}
              onClick={() => setCurrentTimelineDate('thisWeek')}
            >
              {t('timeline.thisWeek')}
            </span>
            <span 
              className={`timeline-date ${currentTimelineDate === 'all' ? 'active' : ''}`}
              onClick={() => setCurrentTimelineDate('all')}
            >
              {t('timeline.all')}
            </span>
          </div>
        </div>
      </div>

      {/* ========== 主地图区域 - 沙盘战报布局 ========== */}
      <main className="main-content">
        {/* 左侧边栏 - 竹简兵符 */}
        <aside className="left-panel">
          <div className="scroll-bamboo">
            <div className="panel-title-seal">{lang === 'zh' ? '⚔️ 军令' : '⚔️ Commands'}</div>
            
            <button className="action-token military" onMouseDown={(e) => { 
              e.preventDefault(); 
              const startTime = performance.now();
              setShowActionPanel(true);
              requestAnimationFrame(() => {
                const endTime = performance.now();
                console.log(`⏱️ 行动面板响应时间：${(endTime - startTime).toFixed(2)}ms`);
              });
            }}>
              <span className="token-icon">🏮</span>
              <span className="token-text">{lang === 'zh' ? '行动' : 'Action'}</span>
            </button>
            
            <div className="bamboo-slip">
              <div className="slip-title">{lang === 'zh' ? '查看领导人' : 'View Leaders'}</div>
              <select className="general-select" onChange={(e) => {
                if (e.target.value) {
                  handleTrackLeader(e.target.value);
                  e.target.value = '';
                }
              }} defaultValue="">
                <option value="" disabled>{lang === 'zh' ? '选择领导人' : 'Select Leader'}</option>
                {LEADERS.map(leader => (
                  <option key={leader.id} value={leader.id}>{lang === 'zh' ? leader.name : leader.nameEn}</option>
                ))}
              </select>
            </div>
            
          </div>
        </aside>
        
        {/* 中央地图 - 沙盘 */}
        <div className="map-frame">
          <div className="map-container">
            {/* 装饰角标 - 图腾 */}
            <div className="map-corner top-left">🦅</div>
            <div className="map-corner top-right">⚔️</div>
            <div className="map-corner bottom-left">🐫</div>
            <div className="map-corner bottom-right">📜</div>
            
            {/* 世界地图 - 真实国家边界（D3 + GeoJSON） */}
            <WorldMapNew 
              onRegionSelect={handleCountrySelect}
              onResetRef={mapResetRef}
              onLeaderSelectRef={mapLeaderSelectRef}
            />
          </div>
        </div>
        
        {/* 右侧边栏 - 卷轴战报 */}
        <aside className="right-panel">
          <div className="scroll-report">
            <div className="report-seal">📋 {t('events.latest')}</div>
            
            <div className="event-list">
              {(events || []).slice(0, 5).map((event, index) => (
                <div key={index} className={`event-item ${event.type || 'military'}`}>
                  <span className="event-icon">
                    {event.type === 'economic' ? '💰' : event.type === 'diplomatic' ? '🤝' : '⚔️'}
                  </span>
                  <div className="event-content">
                    <div className="event-title">{translateEvent(event.title || event.description || 'Event')}</div>
                    <div className="event-time">{event.time || 'Recent'}</div>
                  </div>
                </div>
              ))}
              {(!events || events.length === 0) && (
                <>
                  <div className="event-item military">
                    <span className="event-icon">⚔️</span>
                    <div className="event-content">
                      <div className="event-title">{t('events.tehran')}</div>
                      <div className="event-time">15 {lang === 'zh' ? '分钟前' : 'min ago'}</div>
                    </div>
                  </div>
                  <div className="event-item economic">
                    <span className="event-icon">💰</span>
                    <div className="event-content">
                      <div className="event-title">{t('events.oil')}</div>
                      <div className="event-time">1 {lang === 'zh' ? '小时前' : 'hour ago'}</div>
                    </div>
                  </div>
                  <div className="event-item diplomatic">
                    <span className="event-icon">🤝</span>
                    <div className="event-content">
                      <div className="event-title">{t('events.saudi')}</div>
                      <div className="event-time">2 {lang === 'zh' ? '小时前' : 'hours ago'}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="view-more-seal" onClick={() => setShowEventPanel(true)}>
              {lang === 'zh' ? '查看更多 →' : 'View More →'}
            </div>
          </div>
        </aside>
      </main>

      {/* ========== 二级页面：完整事件流 ========== */}
      {showEventPanel && (
        <MemorialModal
          isOpen={showEventPanel}
          onClose={() => setShowEventPanel(false)}
          title="📜 完整事件流"
          type="外交"
          width="1000px"
          disableAnimation={true}
        >
          <EventStream 
            events={events} 
            availableRoles={[]}
            onEventSelect={(event) => {
              console.log('📊 选中事件:', event);
              // 触发 PM Agent 分析
              analyzeEventWithPM(event);
            }}
          />
        </MemorialModal>
      )}

      {/* ========== 二级页面：经济分析 ========== */}
      {showEconomicPanel && (
        <MemorialModal
          isOpen={showEconomicPanel}
          onClose={() => setShowEconomicPanel(false)}
          title="💰 经济仪表盘"
          type="经济"
        >
          {worldState && worldState.economic && (
            <div className="economic-dashboard">
              {/* 股票市场 */}
              <div className="econ-section">
                <h3>📈 股票市场</h3>
                <div className="econ-grid">
                  {Object.entries(worldState.economic.stocks || {}).map(([key, data]) => {
                    // 统一处理股票数据：添加适当的格式
                    let displayValue = data.value;
                    if (typeof data.value === 'string') {
                      // 字符串直接显示（如 "6672.62"）
                      displayValue = data.value;
                    } else if (typeof data.value === 'number') {
                      displayValue = data.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
                    }
                    // 添加股票名称映射
                    const stockNames = {
                      'SPX': '标普 500',
                      'HSI': '恒生指数',
                      'DJI': '道琼斯',
                      'IXIC': '纳斯达克'
                    };
                    return (
                      <div key={key} className="econ-card">
                        <div className="econ-card-name">{stockNames[key] || key}</div>
                        <div className="econ-card-value">{displayValue}</div>
                        <div className={`econ-card-change ${data.change > 0 ? 'positive' : 'negative'}`}>
                          {data.change > 0 ? '↑' : '↓'} {Math.abs(data.change)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* 大宗商品 */}
              <div className="econ-section">
                <h3>🏆 大宗商品</h3>
                <div className="econ-grid">
                  {Object.entries(worldState.economic.commodities || {}).map(([key, data]) => {
                    let displayValue = data.value;
                    if (typeof data.value === 'string') {
                      displayValue = data.value;
                    } else if (typeof data.value === 'number') {
                      displayValue = `$${data.value.toFixed(2)}`;
                    }
                    return (
                      <div key={key} className="econ-card">
                        <div className="econ-card-name">{key}</div>
                        <div className="econ-card-value">{displayValue}</div>
                        <div className={`econ-card-change ${data.change > 0 ? 'positive' : 'negative'}`}>
                          {data.change > 0 ? '↑' : '↓'} {Math.abs(data.change)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* 加密货币 */}
              <div className="econ-section">
                <h3>₿ 加密货币</h3>
                <div className="econ-grid">
                  {Object.entries(worldState.economic.crypto || {}).map(([key, data]) => {
                    let displayValue = data.value;
                    if (typeof data.value === 'string') {
                      displayValue = data.value;
                    } else if (typeof data.value === 'number') {
                      displayValue = `$${data.value.toLocaleString()}`;
                    }
                    return (
                      <div key={key} className="econ-card">
                        <div className="econ-card-name">{key}</div>
                        <div className="econ-card-value">{displayValue}</div>
                        <div className={`econ-card-change ${data.change > 0 ? 'positive' : 'negative'}`}>
                          {data.change > 0 ? '↑' : '↓'} {Math.abs(data.change)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </MemorialModal>
      )}

      {/* ========== 二级页面：势力详情 ========== */}
      {showFactionPanel && (
        <MemorialModal
          isOpen={showFactionPanel}
          onClose={() => setShowFactionPanel(false)}
          title={lang === 'zh' ? '⚔️ 势力对比' : '⚔️ Faction Comparison'}
          type={lang === 'zh' ? '策略' : 'Strategy'}
        >
          <div className="factions-grid">
            {FACTIONS.map(faction => {
              const factionNameEn = {
                '抵抗轴心': 'Resistance Axis',
                '美以联盟': 'US-Israel Alliance',
                '温和联盟': 'Moderate Alliance',
                '亲穆兄会': 'Muslim Brotherhood',
              }[faction.name];
              const descEn = {
                '抵抗轴心': 'Regional resistance alliance led by Iran',
                '美以联盟': 'Strategic alliance between US and Israel',
                '温和联盟': 'Moderate Arab states alliance in Gulf region',
                '亲穆兄会': 'Political forces supporting Muslim Brotherhood',
              }[faction.name];
              const countriesEn = {
                '抵抗轴心': ['Iran', 'Iraq', 'Syria', 'Lebanon', 'Palestine'],
                '美以联盟': ['USA', 'Israel', 'Jordan'],
                '温和联盟': ['Saudi Arabia', 'Egypt', 'UAE', 'Kuwait', 'Qatar', 'Bahrain', 'Oman', 'Yemen'],
                '亲穆兄会': ['Turkey', 'Qatar'],
              }[faction.name];
              
              return (
                <div 
                  key={faction.id} 
                  className="faction-card"
                  style={{ borderLeftColor: faction.color }}
                  onClick={() => setSelectedFaction(faction)}
                >
                  <div className="faction-card-header">
                    <h3 style={{ color: faction.color }}>{lang === 'zh' ? faction.name : factionNameEn}</h3>
                    <div className="faction-strength">
                      <div className="strength-bar">
                        <div 
                          className="strength-fill" 
                          style={{ width: `${faction.strength}%`, background: faction.color }}
                        ></div>
                      </div>
                      <span className="strength-value">{faction.strength}</span>
                    </div>
                  </div>
                  <p className="faction-description">{lang === 'zh' ? faction.description : descEn}</p>
                  <div className="faction-countries">
                    <span className="countries-label">{lang === 'zh' ? '控制国家:' : 'Countries:'}</span>
                    <div className="countries-list">{(lang === 'zh' ? faction.countries : countriesEn).join(' · ')}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </MemorialModal>
      )}

      {/* ========== 二级页面：领导人图鉴 ========== */}
      {showLeaderPanel && (
        <MemorialModal
          isOpen={showLeaderPanel}
          onClose={() => setShowLeaderPanel(false)}
          title={lang === 'zh' ? '👤 领导人图鉴' : '👤 Leaders'}
          type={lang === 'zh' ? '地图' : 'Map'}
        >
          <div className="leaders-grid">
            {LEADERS.map(leader => {
              const locationEn = {
                '美国': 'USA',
                '以色列': 'Israel',
                '伊拉克': 'Iraq',
                '叙利亚': 'Syria',
                '伊朗': 'Iran',
                '沙特': 'Saudi Arabia',
                '埃及': 'Egypt',
                '土耳其': 'Turkey',
              }[leader.location];
              
              return (
                <div 
                  key={leader.id} 
                  className="leader-card"
                  onClick={() => handleTrackLeader(leader.id)}
                >
                  <div className="leader-avatar">
                    <img src={leader.image} alt={leader.name} className="leader-image" />
                  </div>
                  <div className="leader-info">
                    <div className="leader-name">{leader.name}</div>
                    <div className="leader-location">{lang === 'zh' ? leader.location : locationEn}</div>
                    <div className={`leader-status ${leader.status === 'Active' ? 'active' : 'inactive'}`}>
                      {leader.status === 'Active' ? (lang === 'zh' ? '● 活跃' : '● Active') : (lang === 'zh' ? '○ 离线' : '○ Offline')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </MemorialModal>
      )}

      {/* ========== 经济面板 ========== */}
      {showEconomicPanel && (
        <MemorialModal
          isOpen={showEconomicPanel}
          onClose={() => setShowEconomicPanel(false)}
          title={t('economy.title')}
          type="经济"
          width="min(650px, 90vw)"
        >
          <EconomicPanel worldState={worldState} onClose={() => setShowEconomicPanel(false)} />
        </MemorialModal>
      )}

      {/* ========== 外交面板 ========== */}
      {showDiplomacyPanel && (
        <MemorialModal
          isOpen={showDiplomacyPanel}
          onClose={() => setShowDiplomacyPanel(false)}
          title={t('diplomacy.title')}
          type="外交"
          width="min(700px, 90vw)"
        >
          <DiplomacyPanel onClose={() => setShowDiplomacyPanel(false)} />
        </MemorialModal>
      )}

      {/* ========== 军事面板 ========== */}
      {showMilitaryPanel && (
        <MemorialModal
          isOpen={showMilitaryPanel}
          onClose={() => setShowMilitaryPanel(false)}
          title={t('military.title')}
          type="军事"
          width="min(650px, 90vw)"
        >
          <MilitaryPanel onClose={() => setShowMilitaryPanel(false)} />
        </MemorialModal>
      )}

      {/* ========== 设置面板 ========== */}
      {showSettingsPanel && (
        <MemorialModal
          isOpen={showSettingsPanel}
          onClose={() => setShowSettingsPanel(false)}
          title={`⚙️ ${t('settings.title')}`}
          type="设置"
        >
          <SettingsPanel onClose={() => setShowSettingsPanel(false)} />
        </MemorialModal>
      )}

      {/* ========== 排行榜 ========== */}
      {showLeaderboard && (
        <MemorialModal
          isOpen={showLeaderboard}
          onClose={() => setShowLeaderboard(false)}
          title={lang === 'zh' ? '🏆 排行榜' : '🏆 Leaderboard'}
          type={lang === 'zh' ? '排行榜' : 'Rank'}
          width="1200px"
          disableAnimation={true}
        >
          <Leaderboard 
            onClose={() => setShowLeaderboard(false)} 
            onCountrySelect={(role) => {
              setSelectedCountry(role);
              setShowLeaderboard(false);
            }}
            onLeaderSelect={(role) => {
              setSelectedLeader(role);
              setShowLeaderboard(false);
            }}
          />
        </MemorialModal>
      )}

      {/* ========== 行动面板 ========== */}
      {showActionPanel && (
        <MemorialModal
          isOpen={showActionPanel}
          onClose={() => setShowActionPanel(false)}
          title={lang === 'zh' ? '🏮 行动' : '🏮 Actions'}
          type={lang === 'zh' ? '行动' : 'Action'}
        >
          <ActionPanel 
            currentNation={currentNation}
            wars={wars}
            onClose={() => setShowActionPanel(false)}
            onShowDecision={handleShowDecision}
            onActionComplete={async (result) => {
              console.log('行动完成:', result);
              // 刷新事件列表
              try {
                const eventsData = await world.events(20);
                setEvents(eventsData.events || []);
              } catch (error) {
                console.error('刷新事件失败:', error);
              }
              setShowActionPanel(false);
            }}
          />
        </MemorialModal>
      )}

      {/* ========== 全局决策弹窗 ========== */}
      {decisionModal.show && (
        <div className="global-decision-overlay" onClick={handleCloseDecision}>
          <div className="global-decision-modal" onClick={(e) => e.stopPropagation()}>
            <div className="global-decision-header">
              <h3>
                {decisionModal.rejected ? '❌ 行动被拒绝' : '✅ 行动建议'}
              </h3>
              <button className="global-modal-close" onClick={handleCloseDecision}>×</button>
            </div>
            
            <div className="global-decision-content">
              {/* 决策理由 */}
              <div className="global-decision-reason">
                <strong>{decisionModal.rejected ? '❌ 拒绝理由' : '✅ 执行理由'}:</strong>
                <p>{decisionModal.decision.reason}</p>
              </div>
              
              {/* 详细分析 */}
              <div className="global-decision-analysis">
                <strong>📊 详细分析:</strong>
                <pre>{decisionModal.decision.analysis}</pre>
              </div>
              
              {/* 执行条件/建议 */}
              {decisionModal.decision.conditions && (
                <div className="global-decision-conditions">
                  <strong>💡 建议:</strong>
                  <p>{decisionModal.decision.conditions}</p>
                </div>
              )}
              
              {/* 置信度 */}
              <div className="global-decision-confidence">
                <strong>🎯 置信度:</strong>
                <span className={`global-confidence-${decisionModal.decision.confidence}`}>
                  {decisionModal.decision.confidence === 'high' ? '高' : 
                   decisionModal.decision.confidence === 'medium' ? '中' : '低'}
                </span>
              </div>
            </div>
            
            {/* 操作按钮 */}
            <div className="global-decision-buttons">
              {!decisionModal.rejected && (
                <>
                  <button className="global-btn-cancel" onClick={handleCloseDecision}>
                    取消
                  </button>
                  <button 
                    className="global-btn-confirm" 
                    onClick={handleConfirmDecision}
                    disabled={decisionModal.loading}
                    style={{ '--action-color': decisionModal.action?.color || '#4299E1' }}
                  >
                    {decisionModal.loading ? '执行中...' : '确认执行'}
                  </button>
                </>
              )}
              {decisionModal.rejected && (
                <button className="global-btn-confirm" onClick={handleCloseDecision}>
                  知道了
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== 世界频道聊天（底部悬浮） ========== */}
      {isAuthenticated && <WorldChannel lang={lang} />}
      </>
    )}
    </div>
  </div>
  );
}

export default App;
