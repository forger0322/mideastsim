import React, { useState, useEffect } from 'react';
import '../styles/mobile.css';

/**
 * 移动端优化的 Dashboard
 * 功能：
 * - 响应式布局
 * - 触摸友好的 UI
 * - 底部导航
 * - 移动端手势支持
 */
const MobileDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [worldState, setWorldState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    loadWorldState();
  }, []);
  
  const loadWorldState = async () => {
    try {
      const response = await fetch('/api/world/state');
      const data = await response.json();
      setWorldState(data);
    } catch (err) {
      console.error('加载世界状态失败:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const tabs = [
    { id: 'overview', label: '概览', icon: '🌍' },
    { id: 'countries', label: '国家', icon: '🏛️' },
    { id: 'relations', label: '关系', icon: '🤝' },
    { id: 'wars', label: '战争', icon: '⚔️' },
    { id: 'events', label: '事件', icon: '📰' },
  ];
  
  if (loading) {
    return (
      <div className="mobile-loading">
        <div className="mobile-spinner"></div>
        <div>加载中...</div>
      </div>
    );
  }
  
  return (
    <div className="mobile-dashboard">
      {/* 顶部导航 */}
      <header className="mobile-header safe-top">
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          ☰
        </button>
        <h1 className="text-lg font-bold">MideastSim</h1>
        <button className="mobile-menu-btn">
          👤
        </button>
      </header>
      
      {/* 侧边菜单 */}
      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-menu open" onClick={e => e.stopPropagation()}>
            <nav>
              {tabs.map(tab => (
                <a
                  key={tab.id}
                  href={`#${tab.id}`}
                  className="mobile-nav-item"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileMenuOpen(false);
                  }}
                >
                  {tab.icon} {tab.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      )}
      
      {/* 主内容区 */}
      <main className="mobile-content" style={{ paddingTop: '56px', paddingBottom: '60px' }}>
        {activeTab === 'overview' && <OverviewTab worldState={worldState} />}
        {activeTab === 'countries' && <CountriesTab />}
        {activeTab === 'relations' && <RelationsTab />}
        {activeTab === 'wars' && <WarsTab />}
        {activeTab === 'events' && <EventsTab />}
      </main>
      
      {/* 底部导航 */}
      <nav className="mobile-bottom-nav safe-bottom">
        {tabs.slice(0, 5).map(tab => (
          <a
            key={tab.id}
            href={`#${tab.id}`}
            className={`mobile-bottom-nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={e => {
              e.preventDefault();
              setActiveTab(tab.id);
            }}
          >
            <span className="mobile-bottom-nav-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
};

// 概览标签页
const OverviewTab = ({ worldState }) => {
  return (
    <div className="p-4 space-y-4">
      {/* 市场数据卡片 */}
      <div className="mobile-card">
        <div className="mobile-card-header">
          <div className="mobile-card-icon">📊</div>
          <div>
            <h3 className="font-semibold">市场数据</h3>
            <p className="text-sm text-gray-400">实时更新</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">
              ${worldState?.market?.oil || '--'}
            </div>
            <div className="text-xs text-gray-400">油价</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">
              ${worldState?.market?.gold || '--'}
            </div>
            <div className="text-xs text-gray-400">黄金</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              ${worldState?.market?.btc || '--'}
            </div>
            <div className="text-xs text-gray-400">BTC</div>
          </div>
        </div>
      </div>
      
      {/* 活跃冲突 */}
      <div className="mobile-card">
        <div className="mobile-card-header">
          <div className="mobile-card-icon">⚔️</div>
          <div>
            <h3 className="font-semibold">活跃冲突</h3>
            <p className="text-sm text-gray-400">
              {worldState?.wars?.length || 0} 场战争
            </p>
          </div>
        </div>
        {worldState?.wars?.length > 0 ? (
          <div className="mobile-list">
            {worldState.wars.map((war, index) => (
              <div key={index} className="mobile-list-item">
                <div className="mobile-list-content">
                  <div className="mobile-list-title">
                    {war.aggressor_id} vs {war.defender_id}
                  </div>
                  <div className="mobile-list-subtitle">
                    开始于：{new Date(war.start_time).toLocaleDateString()}
                  </div>
                </div>
                <span className="text-red-400">⚔️</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mobile-empty">
            <div className="mobile-empty-icon">🕊️</div>
            <div>暂无活跃冲突</div>
          </div>
        )}
      </div>
      
      {/* 最近事件 */}
      <div className="mobile-card">
        <div className="mobile-card-header">
          <div className="mobile-card-icon">📰</div>
          <div>
            <h3 className="font-semibold">最近事件</h3>
            <p className="text-sm text-gray-400">过去 24 小时</p>
          </div>
        </div>
        <div className="mobile-list">
          {worldState?.recent_events?.slice(0, 5).map((event, index) => (
            <div key={index} className="mobile-list-item">
              <div className="mobile-list-content">
                <div className="mobile-list-title">
                  {event.title_zh || event.title}
                </div>
                <div className="mobile-list-subtitle">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </div>
              </div>
              <span className="text-2xl">
                {event.severity >= 8 ? '🔴' : event.severity >= 5 ? '🟠' : '🔵'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 国家标签页
const CountriesTab = () => {
  const [countries, setCountries] = useState([]);
  
  useEffect(() => {
    loadCountries();
  }, []);
  
  const loadCountries = async () => {
    try {
      const response = await fetch('/api/roles');
      const data = await response.json();
      setCountries(data.roles || []);
    } catch (err) {
      console.error('加载国家列表失败:', err);
    }
  };
  
  return (
    <div className="p-4">
      <div className="mobile-card">
        <h3 className="font-semibold mb-4">🏛️ 国家列表</h3>
        <div className="mobile-list">
          {countries.map(country => (
            <div key={country.id} className="mobile-list-item">
              <img
                src={`/img/flags/${country.id}.png`}
                alt={country.name}
                className="mobile-list-avatar"
                onError={e => e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23374151" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="40">🏛️</text></svg>'}
              />
              <div className="mobile-list-content">
                <div className="mobile-list-title">{country.name}</div>
                <div className="mobile-list-subtitle">
                  💪 {country.attributes?.military || 0} | 💰 {country.attributes?.economy || 0}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 关系标签页
const RelationsTab = () => {
  return (
    <div className="p-4">
      <div className="mobile-empty">
        <div className="mobile-empty-icon">🤝</div>
        <div>关系图谱开发中...</div>
      </div>
    </div>
  );
};

// 战争标签页
const WarsTab = () => {
  return (
    <div className="p-4">
      <div className="mobile-empty">
        <div className="mobile-empty-icon">⚔️</div>
        <div>战争详情开发中...</div>
      </div>
    </div>
  );
};

// 事件标签页
const EventsTab = () => {
  return (
    <div className="p-4">
      <div className="mobile-empty">
        <div className="mobile-empty-icon">📰</div>
        <div>事件列表开发中...</div>
      </div>
    </div>
  );
};

export default MobileDashboard;
