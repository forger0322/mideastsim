// 🌍 世界频道聊天组件 - 卷轴风格
import React, { useState, useEffect, useRef } from 'react';
import ws from '../services/websocket';
import CreateMeetingRoom from './CreateMeetingRoom';
import './WorldChannel.css';

const WorldChannel = ({ lang = 'zh' }) => {
  const [messages, setMessages] = useState([]);
  const [privateRooms, setPrivateRooms] = useState({});
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('public'); // 'public' or 'private'
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roles, setRoles] = useState({}); // 存储角色/领导人信息
  const [showCreateRoom, setShowCreateRoom] = useState(false); // 显示创建会议室页面
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, privateRooms, selectedRoom]);

  // 连接 WebSocket
  useEffect(() => {
    // 获取已登录用户信息（从 current_role 获取角色 ID）
    const roleStr = localStorage.getItem('current_role');
    const playerStr = localStorage.getItem('player');
    let agentId = 'observer';
    let roleId = null;
    
    if (roleStr) {
      try {
        const role = JSON.parse(roleStr);
        roleId = role.role_id || role.id;
      } catch (err) {
        console.warn('⚠️ [世界频道] 解析 role 失败:', err);
      }
    }
    
    if (playerStr) {
      try {
        const player = JSON.parse(playerStr);
        agentId = player.id || player.player_id || 'observer';
      } catch (err) {
        console.warn('⚠️ [世界频道] 解析 player 失败:', err);
      }
    }
    
    ws.connect(agentId);

    // 获取领导人信息（用于显示发言者名字和国家）
    const fetchLeaders = async () => {
      try {
        const response = await fetch('/api/leaders');
        if (response.ok) {
          const data = await response.json();
          const leaders = data.leaders || data; // 兼容两种格式
          const leadersMap = {};
          leaders.forEach(leader => {
            if (leader.role_id) {
              leadersMap[leader.role_id] = leader;
            }
            if (leader.id) {
              leadersMap[leader.id] = leader;
            }
          });
          setRoles(leadersMap);
        }
      } catch (err) {
        console.error('❌ [世界频道] 获取领导人信息失败:', err);
      }
    };
    
    fetchLeaders();

    // 监听公共消息（包括声明）
    ws.onPublicMessage((msg) => {
      // 如果是声明类型，转换为消息格式
      if (msg.type === 'world_message' || msg.type === 'public_statement' || msg.type === 'diplomatic_statement') {
        const statementMsg = {
          from: msg.actor_id || msg.from || 'unknown',
          role_id: msg.actor_id || msg.role_id,
          content: msg.description || msg.content || msg.title,
          timestamp: msg.timestamp || new Date().toISOString(),
          type: msg.type
        };
        setMessages(prev => [...prev.slice(-49), statementMsg]);
      } else {
        // 普通消息
        setMessages(prev => [...prev.slice(-49), msg]);
      }
    });

    // 监听私密消息
    ws.onPrivateMessage((msg) => {
      setPrivateRooms(prev => ({
        ...prev,
        [msg.channel]: [...(prev[msg.channel] || []).slice(-49), msg]
      }));
    });

    // 订阅世界频道
    ws.subscribe(['world', 'diplomacy', 'military', 'public_statement']);

    return () => {
      ws.disconnect();
    };
  }, []);

  // 发送公共消息
  const handleSendPublic = () => {
    if (inputText.trim() && activeTab === 'public') {
      ws.sendPublic(inputText.trim());
      setInputText('');
    }
  };

  // 发送私密消息
  const handleSendPrivate = () => {
    if (inputText.trim() && activeTab === 'private' && selectedRoom) {
      ws.sendPrivate(selectedRoom, inputText.trim());
      setInputText('');
    }
  };

  // 创建会议室
  const handleCreateRoom = (roomName) => {
    setSelectedRoom(roomName);
    ws.subscribe([roomName]);
    setShowCreateRoom(false);
  };

  const handleCancelCreateRoom = () => {
    setShowCreateRoom(false);
  };

  // 处理按键
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (activeTab === 'public') {
        handleSendPublic();
      } else {
        handleSendPrivate();
      }
    }
  };

  // 格式化时间（美国时间）
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    // 使用美国东部时间
    return date.toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // 三字码到全小写英文的映射（roles 表用三字码，leaders 表用英文）
  const roleCodeMap = {
    'IRN': 'iran', 'IRQ': 'iraq', 'SYR': 'syria', 'LBN': 'lebanon',
    'ISR': 'israel', 'USA': 'usa', 'SAU': 'saudi_arabia', 'EGY': 'egypt',
    'QAT': 'qatar', 'ARE': 'uae', 'KWT': 'kuwait', 'BHR': 'bahrain',
    'TUR': 'turkey', 'RUS': 'russia', 'YEM': 'yemen', 'PSE': 'palestine'
  };

  // 国家名字映射（当后端没有返回 country 字段时使用）
  const countryMap = {
    'iran': { zh: '伊朗', en: 'Iran' },
    'iraq': { zh: '伊拉克', en: 'Iraq' },
    'syria': { zh: '叙利亚', en: 'Syria' },
    'lebanon': { zh: '黎巴嫩', en: 'Lebanon' },
    'israel': { zh: '以色列', en: 'Israel' },
    'usa': { zh: '美国', en: 'United States' },
    'saudi_arabia': { zh: '沙特阿拉伯', en: 'Saudi Arabia' },
    'egypt': { zh: '埃及', en: 'Egypt' },
    'qatar': { zh: '卡塔尔', en: 'Qatar' },
    'uae': { zh: '阿联酋', en: 'UAE' },
    'kuwait': { zh: '科威特', en: 'Kuwait' },
    'bahrain': { zh: '巴林', en: 'Bahrain' },
    'turkey': { zh: '土耳其', en: 'Turkey' },
    'russia': { zh: '俄罗斯', en: 'Russia' }
  };

  // 获取领导人信息（根据 role_id）
  const getLeaderInfo = (msg) => {
    // 优先使用 role_id（玩家绑定的国家，可能是三字码如 ARE）
    const rawRoleId = msg.role_id || msg.from;
    
    // 将三字码转换为全小写英文（如 ARE -> uae）
    const roleId = roleCodeMap[rawRoleId.toUpperCase()] || rawRoleId.toLowerCase();
    
    // 尝试多种可能：原样、大写、小写
    const leader = roles[roleId] || roles[rawRoleId] || roles[rawRoleId.toUpperCase()];
    
    if (leader) {
      // 从领导人数据中获取名字
      const leaderName = lang === 'zh' ? leader.name : leader.name_en;
      // 优先使用 leader.country，如果没有则使用映射
      let countryName = lang === 'zh' ? leader.country : leader.country_en;
      if (!countryName && countryMap[roleId]) {
        countryName = countryMap[roleId][lang];
      }
      
      return {
        name: leaderName,
        country: countryName || roleId,
        avatar: leader.avatar_url || null
      };
    }
    // 默认返回（未绑定角色）
    return {
      name: msg.from,
      country: rawRoleId,
      avatar: null
    };
  };

  // 获取当前房间的消息
  const getCurrentMessages = () => {
    if (activeTab === 'public') {
      return messages;
    } else if (selectedRoom && privateRooms[selectedRoom]) {
      return privateRooms[selectedRoom];
    }
    return [];
  };

  // 获取私密房间列表
  const privateRoomList = Object.keys(privateRooms);

  const currentMessages = getCurrentMessages();
  const isPrivate = activeTab === 'private';

  return (
    <div className={`world-channel-container ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* 折叠/展开标题栏 */}
      <div 
        className="channel-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="header-left">
          <span className="channel-icon">💬</span>
          <span className="channel-title">
            {lang === 'zh' ? '世界频道' : 'World Channel'}
          </span>
          {messages.length > 0 && (
            <span className="message-badge">{messages.length}</span>
          )}
        </div>
        <div className="header-right">
          <span className="expand-hint">
            {isExpanded ? (lang === 'zh' ? '▲ 折叠' : '▲ Collapse') : (lang === 'zh' ? '▼ 展开' : '▼ Expand')}
          </span>
        </div>
      </div>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="channel-content">
          {/* 标签页切换 */}
          <div className="channel-tabs">
            <button 
              className={`tab-btn ${activeTab === 'public' ? 'active' : ''}`}
              onClick={() => setActiveTab('public')}
            >
              🌍 {lang === 'zh' ? '世界频道' : 'Public'}
            </button>
            <button 
              className={`tab-btn ${activeTab === 'private' ? 'active' : ''}`}
              onClick={() => setActiveTab('private')}
            >
              🔒 {lang === 'zh' ? '私密会议室' : 'Private'}
            </button>
          </div>

          {/* 私密房间选择器 */}
          {isPrivate && (
            <div className="room-selector">
              <select 
                value={selectedRoom || ''}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="room-select"
              >
                <option value="" disabled>
                  {lang === 'zh' ? '选择会议室' : 'Select Room'}
                </option>
                {privateRoomList.map(room => (
                  <option key={room} value={room}>{room}</option>
                ))}
              </select>
              <button 
                className="create-room-btn"
                onClick={() => setShowCreateRoom(true)}
              >
                {lang === 'zh' ? '+ 新建' : '+ New'}
              </button>
            </div>
          )}

          {/* 消息列表 */}
          <div className="message-list">
            {currentMessages.length === 0 ? (
              <div className="empty-message">
                {lang === 'zh' ? '暂无消息' : 'No messages yet'}
              </div>
            ) : (
              currentMessages.map((msg, index) => {
                const leader = getLeaderInfo(msg);
                return (
                  <div key={index} className="message-item">
                    <div className="message-header">
                      <div className="message-avatar">
                        {leader.avatar ? (
                          <img src={leader.avatar} alt={leader.name} className="avatar-img" />
                        ) : (
                          <span className="avatar-placeholder">{leader.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="message-sender-info">
                        <span className="sender-name">{leader.name}</span>
                        <span className="sender-country">📍 {leader.country}</span>
                      </div>
                      <span className="message-time">{formatTime(msg.timestamp)}</span>
                    </div>
                    <div className="message-content">{msg.content}</div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入框 */}
          <div className="message-input-area">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isPrivate 
                  ? (lang === 'zh' ? '输入私密消息...' : 'Enter private message...')
                  : (lang === 'zh' ? '输入消息... (Enter 发送)' : 'Enter message... (Enter to send)')
              }
              className="message-input"
              rows="2"
            />
            <button 
              className="send-btn"
              onClick={isPrivate ? handleSendPrivate : handleSendPublic}
            >
              {lang === 'zh' ? '发送' : 'Send'}
            </button>
          </div>
        </div>
      )}

      {/* 创建会议室页面 */}
      {showCreateRoom && (
        <CreateMeetingRoom
          lang={lang}
          onCreate={handleCreateRoom}
          onCancel={handleCancelCreateRoom}
        />
      )}
    </div>
  );
};

// 根据名字获取国旗 emoji（简单映射）
const getFlag = (name) => {
  const flagMap = {
    '特朗普': '🇺🇸',
    'Trump': '🇺🇸',
    '内塔尼亚胡': '🇮🇱',
    'Netanyahu': '🇮🇱',
    '哈梅内伊': '🇮🇷',
    'Khamenei': '🇮🇷',
    '萨德尔': '🇮🇶',
    'Sadr': '🇮🇶',
    '阿萨德': '🇸🇾',
    'Assad': '🇸🇾',
    '萨勒曼': '🇸🇦',
    'Salman': '🇸🇦',
    '埃尔多安': '🇹🇷',
    'Erdoğan': '🇹🇷',
    '塞西': '🇪🇬',
    'Sisi': '🇪🇬',
  };
  return flagMap[name] || '👤';
};

export default WorldChannel;
