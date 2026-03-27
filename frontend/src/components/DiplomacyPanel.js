// frontend/src/components/DiplomacyPanel.js
import React, { useState, useEffect } from 'react';
import { t, getLang } from '../i18n';
import './DiplomacyPanel.css';
import { mockRelations, mockEvents } from '../data/mockRelations';

const DiplomacyPanel = ({ relations: propsRelations, currentCountry, onClose }) => {
  const [currentLang, setCurrentLang] = useState(getLang());
  const [viewCountry, setViewCountry] = useState(currentCountry || 'IRN'); // 默认视角国家
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const [countryList, setCountryList] = useState([]); // 初始为空，useEffect 中立即填充
  const [selectedCountryDetail, setSelectedCountryDetail] = useState(null); // 选中的国家详情
  const [bilateralEvents, setBilateralEvents] = useState([]); // 两国之间的事件
  const [relations, setRelations] = useState(mockRelations); // 使用模拟数据

  // 国家列表（本地备用）
  const countries = [
    { code: 'IRN', name: t('countries.IRN') },
    { code: 'IRQ', name: t('countries.IRQ') },
    { code: 'SYR', name: t('countries.SYR') },
    { code: 'ISR', name: t('countries.ISR') },
    { code: 'SAU', name: t('countries.SAU') },
    { code: 'USA', name: t('countries.USA') },
    { code: 'ARE', name: t('countries.ARE') },
    { code: 'TUR', name: t('countries.TUR') },
    { code: 'EGY', name: t('countries.EGY') },
    { code: 'JOR', name: t('countries.JOR') },
    { code: 'LBN', name: t('countries.LBN') },
    { code: 'PSE', name: t('countries.PSE') },
    { code: 'YEM', name: t('countries.YEM') },
    { code: 'KWT', name: t('countries.KWT') },
    { code: 'BHR', name: t('countries.BHR') },
    { code: 'QAT', name: t('countries.QAT') },
    { code: 'OMN', name: t('countries.OMN') },
  ];

  // 获取国家列表 - 立即设置本地数据，然后尝试获取 API 数据
  useEffect(() => {
    // 立即设置本地国家列表，确保下拉菜单立即可用
    setCountryList(countries);
    
    // 异步尝试获取 API 数据
    const fetchCountries = async () => {
      try {
        const res = await fetch('/api/world/countries');
        if (res.ok) {
          const data = await res.json();
          console.log('🌍 获取国家列表 API:', data);
          if (data.countries && data.countries.length > 0) {
            setCountryList(data.countries);
          }
        }
      } catch (error) {
        console.log('🌍 API 不可用，使用本地国家列表');
      }
    };
    fetchCountries();
  }, []);

  // 监听语言变更
  useEffect(() => {
    const handler = (e) => {
      setCurrentLang(e.detail.lang);
    };
    window.addEventListener('langchange', handler);
    return () => window.removeEventListener('langchange', handler);
  }, []);

  // 获取当前视角国家的关系（过滤出 actor_id = viewCountry 的关系）
  const getViewRelations = () => {
    if (!relations || relations.length === 0) return [];
    
    const filtered = relations
      .filter(rel => rel.actor_id === viewCountry)
      .sort((a, b) => a.value - b.value); // 按关系值从小到大排序（敌对→友好）
    
    console.log('📋 当前视角国家:', viewCountry, '| 关系数量:', filtered.length);
    return filtered;
  };

  const displayRelations = getViewRelations();

  // 关系状态计算
  const getRelationStatus = (value) => {
    if (value <= -50) return { label: currentLang === 'zh' ? '敌对' : 'Hostile', color: '#f44336', className: 'relation-status-hostile' };
    if (value < -20) return { label: currentLang === 'zh' ? '紧张' : 'Tense', color: '#FF5722', className: 'relation-status-tense' };
    if (value <= 20) return { label: currentLang === 'zh' ? '中立' : 'Neutral', color: '#9E9E9E', className: 'relation-status-neutral' };
    if (value < 50) return { label: currentLang === 'zh' ? '友好' : 'Friendly', color: '#4CAF50', className: 'relation-status-friendly' };
    return { label: currentLang === 'zh' ? '同盟' : 'Ally', color: '#FFD700', className: 'relation-status-ally' };
  };

  // 进度条颜色（与关系状态标签一致）
  const getProgressBarColor = (value) => {
    if (value <= -50) return '#f44336'; // 红色（敌对）
    if (value < -20) return '#FF5722'; // 橙红色（紧张）
    if (value <= 20) return '#9E9E9E'; // 灰色（中立）
    if (value < 50) return '#4CAF50'; // 绿色（友好）
    return '#9C27B0'; // 紫色（同盟）
  };

  const getCountryName = (iso3) => {
    const key = `countries.${iso3}`;
    const name = t(key);
    return name === key ? iso3 : name;
  };

  const getCountryFlag = (iso3) => {
    const flags = {
      'IRN': '🇮🇷', 'IRQ': '🇮🇶', 'SYR': '🇸🇾', 'ISR': '🇮🇱',
      'SAU': '🇸🇦', 'USA': '🇺🇸', 'ARE': '🇦🇪', 'TUR': '🇹🇷',
      'EGY': '🇪🇬', 'JOR': '🇯🇴', 'LBN': '🇱🇧', 'PSE': '🇵🇸',
      'YEM': '🇾🇪', 'KWT': '🇰🇼', 'BHR': '🇧🇭', 'QAT': '🇶🇦', 'OMN': '🇴🇲',
    };
    return flags[iso3] || '🏳️';
  };

  const handleCountrySelect = (code) => {
    console.log('🔄 切换国家视角:', code);
    setViewCountry(code);
    setShowCountrySelector(false);
    console.log('✅ 当前视角国家:', code);
  };

  // 点击列表项，查看国家详情
  const handleViewCountryDetail = (countryCode) => {
    // 从国家列表中查找国家信息
    const country = countryList.find(c => (c.code || c.iso3) === countryCode) || 
                   countries.find(c => c.code === countryCode);
    
    // 查找该国与当前视角国家的关系
    const relation = relations.find(r => r.actor_id === viewCountry && r.target_id === countryCode);
    
    setSelectedCountryDetail({
      code: countryCode,
      name: country?.name || getCountryName(countryCode),
      relation: relation,
    });
    
    // 获取两国之间的事件
    fetchBilateralEvents(viewCountry, countryCode);
  };

  // 获取两国之间的事件（使用模拟数据）
  const fetchBilateralEvents = (country1, country2) => {
    // 过滤出涉及两国的事件
    const events = mockEvents.filter(evt => 
      (evt.actor === country1 && evt.target === country2) ||
      (evt.actor === country2 && evt.target === country1) ||
      (evt.actor === country1) ||
      (evt.actor === country2)
    ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
    
    setBilateralEvents(events);
  };

  const currentCountryName = getCountryName(viewCountry);
  const currentCountryFlag = getCountryFlag(viewCountry);

  return (
    <div className="diplomacy-panel">
      {/* 头部区域 */}
      <div className="panel-header">
        <div className="view-country">
          <span className="country-flag">{currentCountryFlag}</span>
          <span className="country-name">{currentCountryName}</span>
          <span className="view-label">{currentLang === 'zh' ? '外交视角' : 'Diplomatic View'}</span>
        </div>
        <div className="header-actions">
          <button 
            className="switch-country-btn"
            onClick={() => setShowCountrySelector(!showCountrySelector)}
          >
            {currentLang === 'zh' ? '🔄 切换国家' : '🔄 Switch Country'}
          </button>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
      </div>

      {/* 国家选择器下拉菜单 */}
      {showCountrySelector && (
        <div className="country-selector-dropdown">
          {console.log('📋 下拉菜单渲染，国家数量:', countryList.length)}
          {countryList.length === 0 ? (
            <div className="empty-state">加载中...</div>
          ) : (
            countryList.map(country => (
              <div
                key={country.code || country.iso3}
                className={`country-option ${viewCountry === (country.code || country.iso3) ? 'selected' : ''}`}
                onClick={() => handleCountrySelect(country.code || country.iso3)}
              >
                <span className="country-flag">{getCountryFlag(country.code || country.iso3)}</span>
                <span className="country-name">{country.name || getCountryName(country.code || country.iso3)}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* 表格区域 */}
      <div className="panel-content">
        <div className="relations-table">
          {/* 表头 */}
          <div className="relation-header">
            <div className="col-country">{currentLang === 'zh' ? '国家' : 'Country'}</div>
            <div className="col-value">{currentLang === 'zh' ? '关系值' : 'Relation'}</div>
            <div className="col-trend">{currentLang === 'zh' ? '趋势' : 'Trend'}</div>
            <div className="col-status">{currentLang === 'zh' ? '状态' : 'Status'}</div>
          </div>

          {/* 关系列表 */}
          <div className="relations-list">
            {displayRelations.length === 0 ? (
              <div className="empty-state">
                {currentLang === 'zh' ? '暂无外交数据' : 'No diplomatic data'}
              </div>
            ) : (
              displayRelations.map((rel, index) => {
                const status = getRelationStatus(rel.value);
                const barColor = getProgressBarColor(rel.value);
                const barWidth = Math.min(Math.abs(rel.value), 100);
                
                return (
                  <div 
                    key={index} 
                    className="relation-item clickable"
                    onClick={() => handleViewCountryDetail(rel.target_id)}
                  >
                    <div className="relation-countries">
                      <span className="country-flag">{getCountryFlag(rel.target_id)}</span>
                      <span className="country-name">{getCountryName(rel.target_id)}</span>
                    </div>
                    
                    <div className="relation-value">
                      <div className="value-number">{rel.value > 0 ? '+' : ''}{rel.value.toFixed(1)}</div>
                      <div className="relation-bar-bg">
                        <div 
                          className="relation-bar-fill"
                          style={{ 
                            width: `${barWidth}%`,
                            background: barColor
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="relation-trend">
                      {rel.trend > 0.01 && (
                        <span className="trend-up">↑ {rel.trend.toFixed(1)}</span>
                      )}
                      {rel.trend < -0.01 && (
                        <span className="trend-down">↓ {Math.abs(rel.trend).toFixed(1)}</span>
                      )}
                      {(rel.trend >= -0.01 && rel.trend <= 0.01) && (
                        <span className="trend-stable">−</span>
                      )}
                    </div>
                    
                    <div 
                      className={`relation-status ${status.className}`}
                    >
                      {status.label}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 国家详情弹窗 */}
      {selectedCountryDetail && (
        <div className="country-detail-overlay" onClick={() => setSelectedCountryDetail(null)}>
          <div className="country-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="country-detail-header">
              <div className="country-detail-title">
                <span className="country-flag">{getCountryFlag(selectedCountryDetail.code)}</span>
                <span>{selectedCountryDetail.name}</span>
              </div>
              <button className="close-btn" onClick={() => setSelectedCountryDetail(null)}>×</button>
            </div>
            <div className="country-detail-content">
              {/* 与当前视角国家的关系 */}
              {selectedCountryDetail.relation && (
                <div className="relation-detail">
                  <h4>{currentLang === 'zh' ? '与我国关系' : 'Relation with Us'}</h4>
                  <div className="relation-detail-value">
                    <span className={`relation-badge ${selectedCountryDetail.relation.value > 0 ? 'positive' : 'negative'}`}>
                      {selectedCountryDetail.relation.value > 0 ? '+' : ''}{selectedCountryDetail.relation.value.toFixed(1)}
                    </span>
                    <span className="relation-detail-trend">
                      {selectedCountryDetail.relation.trend > 0 ? '↑' : selectedCountryDetail.relation.trend < 0 ? '↓' : '−'} {Math.abs(selectedCountryDetail.relation.trend).toFixed(1)}
                    </span>
                  </div>
                  <div className="relation-detail-bar">
                    <div className="relation-detail-bar-fill" style={{
                      width: `${Math.min(Math.abs(selectedCountryDetail.relation.value), 100)}%`,
                      background: getProgressBarColor(selectedCountryDetail.relation.value)
                    }}></div>
                  </div>
                  {(() => {
                    const status = getRelationStatus(selectedCountryDetail.relation.value);
                    return (
                      <div className={`relation-detail-status ${status.className}`}>
                        {status.label}
                      </div>
                    );
                  })()}
                </div>
              )}
              
              {/* 两国之间的事件 */}
              <div className="bilateral-events">
                <h4>{currentLang === 'zh' ? '📜 两国事件' : '📜 Bilateral Events'}</h4>
                {bilateralEvents.length === 0 ? (
                  <div className="no-events">
                    {currentLang === 'zh' ? '暂无重大事件' : 'No major events'}
                  </div>
                ) : (
                  <div className="events-list">
                    {bilateralEvents.map((event, idx) => (
                      <div key={event.id || idx} className={`event-item severity-${event.severity}`}>
                        <div className="event-icon">
                          {event.type === 'war' ? '⚔️' : event.type === 'military' ? '🎖️' : event.type === 'economic' ? '💰' : '🤝'}
                        </div>
                        <div className="event-content">
                          <div className="event-title">{event.title}</div>
                          <div className="event-desc">{event.description}</div>
                          <div className="event-time">
                            {new Date(event.timestamp).toLocaleString(currentLang === 'zh' ? 'zh-CN' : 'en-US')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="country-detail-actions">
                <button className="action-btn" onClick={() => {
                  setViewCountry(selectedCountryDetail.code);
                  setSelectedCountryDetail(null);
                }}>
                  {currentLang === 'zh' ? '👁️ 切换到此国家视角' : '👁️ Switch to This View'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiplomacyPanel;
