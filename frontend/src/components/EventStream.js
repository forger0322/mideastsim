import React, { useState } from 'react';
import { useTranslation } from '../i18n';
import './EventStream.css';

function EventStream({ events, onEventSelect, availableRoles = [] }) {
  const { lang } = useTranslation();
  // 展开的事件 ID
  const [expandedEventId, setExpandedEventId] = useState(null);
  
  // 根据国家 ID 获取国家信息
  const getCountryInfo = (countryId) => {
    const country = availableRoles.find(r => r.id === countryId);
    if (!country) return { flag: '🏴', name: countryId };
    
    return {
      flag: country.flag || getFlagEmoji(countryId),
      name: country.name || country.name_en || countryId
    };
  };
  
  // 根据国家 ID 生成旗帜 emoji
  const getFlagEmoji = (countryId) => {
    const flagMap = {
      'USA': '🇺🇸', 'US': '🇺🇸',
      'IRN': '🇮🇷', 'IR': '🇮🇷',
      'ISR': '🇮🇱', 'IL': '🇮🇱',
      'SYR': '🇸🇾', 'SY': '🇸🇾',
      'SAU': '🇸🇦', 'SA': '🇸🇦',
      'ARE': '🇦🇪', 'AE': '🇦🇪',
      'KWT': '🇰🇼', 'KW': '🇰🇼',
      'OMN': '🇴🇲', 'OM': '🇴🇲',
      'IRQ': '🇮🇶', 'IQ': '🇮🇶',
      'EGY': '🇪🇬', 'EG': '🇪🇬',
      'TUR': '🇹🇷', 'TR': '🇹🇷',
      'RUS': '🇷🇺', 'RU': '🇷🇺',
      'QAT': '🇶🇦', 'QA': '🇶🇦',
    };
    return flagMap[countryId] || '🏴';
  };

  // Function to get event type class
  const getEventTypeClass = (type) => {
    switch (type) {
      case 'military':
        return 'event-military';
      case 'diplomacy':
        return 'event-diplomacy';
      case 'economic':
        return 'event-economic';
      default:
        return 'event-other';
    }
  };

  // Format timestamp to HH:MM
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  // 切换展开/收起
  const toggleExpand = (eventId) => {
    console.log('📊 切换事件:', eventId, '当前展开:', expandedEventId);
    if (expandedEventId === eventId) {
      setExpandedEventId(null);
    } else {
      setExpandedEventId(eventId);
      // 通知父组件选中了事件
      const event = events.find(e => e.id === eventId);
      console.log('📊 找到事件:', event);
      if (event && onEventSelect) {
        // PM 分析在 event.data?.pm_analysis 中
        const pmAnalysis = event.data?.pm_analysis;
        console.log('📊 调用 onEventSelect, PM 分析:', pmAnalysis);
        onEventSelect(event);
      }
    }
  };

  // 获取事件图标
  const getEventIcon = (type) => {
    switch (type) {
      case 'military': return '⚔️';
      case 'diplomacy': return '🤝';
      case 'economic': return '💰';
      default: return '📰';
    }
  };

  return (
    <div className="event-stream-container">
      <h3>📰 事件列表</h3>
      <div className="events-list">
        {events && events.length > 0 ? (
          events.map(event => (
            <div 
              key={event.id} 
              className={`event-item ${getEventTypeClass(event.type)} ${expandedEventId === event.id ? 'expanded' : ''}`}
              onClick={() => toggleExpand(event.id)}
            >
              <div className="event-header">
                <span className="event-icon">{getEventIcon(event.type)}</span>
                <span className="event-time">{formatTime(event.timestamp)}</span>
                <span className="event-location">{lang === 'zh' ? event.location_zh || event.location : event.location}</span>
                
                {/* PM 分析徽章 */}
                {event.data?.pm_analysis && (
                  <span className="pm-badge" title={lang === 'zh' ? 'PM Agent 已分析经济影响' : 'PM Agent analyzed economic impact'}>
                    🤖
                    {event.data?.pm_analysis.oil && (
                      <span className={`pm-indicator ${event.data?.pm_analysis.oil.direction}`}>
                        {event.data?.pm_analysis.oil.direction === 'up' ? '↑' : '↓'}
                      </span>
                    )}
                  </span>
                )}
                
                <span className="event-expand-icon">{expandedEventId === event.id ? '▲' : '▼'}</span>
              </div>
              <div className="event-summary">
                {lang === 'zh' ? event.title_zh || event.title || event.text : event.title || event.text}
              </div>
              
              {/* 展开的详情 */}
              {expandedEventId === event.id && (
                <div className="event-details">
                  {/* 战争事件特殊展示 */}
                  {event.id.startsWith('war_') ? (
                    <div className="war-details">
                      <div className="war-header">
                        <span className="war-icon">⚔️</span>
                        <span className="war-title">战争爆发</span>
                        <span className="war-badge">🔥 进行中</span>
                      </div>
                      
                      <div className="war-combatants">
                        {(() => {
                          const actorInfo = getCountryInfo(event.actor_id);
                          const targetInfo = getCountryInfo(event.target_id);
                          
                          return (
                            <>
                              <div className="combatant">
                                <span className="combatant-flag">{actorInfo.flag}</span>
                                <span className="combatant-name">{event.actor_name || actorInfo.name}</span>
                                <span className="combatant-role">（进攻方）</span>
                              </div>
                              <div className="vs-divider">VS</div>
                              <div className="combatant">
                                <span className="combatant-flag">{targetInfo.flag}</span>
                                <span className="combatant-name">{event.target_name || targetInfo.name}</span>
                                <span className="combatant-role">（防守方）</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      
                      <div className="war-info">
                        <div className="info-item">
                          <span className="info-label">⏱️ 开始时间:</span>
                          <span className="info-value">{new Date(event.timestamp).toLocaleString('zh-CN')}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">📍 地点:</span>
                          <span className="info-value">{event.location || event.location_zh}</span>
                        </div>
                      </div>
                      
                      <div className="war-description">
                        <p>{lang === 'zh' ? event.description_zh || event.description : event.description}</p>
                      </div>
                      
                      <div className="war-actions">
                        <button className="war-action-btn">📊 查看战况</button>
                        <button className="war-action-btn">🕊️ 促和</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="event-description">
                        <strong>📝 详情:</strong>
                        <p>{lang === 'zh' ? event.description_zh || event.description || event.text : event.description || event.text}</p>
                      </div>
                      
                      {/* PM Agent 分析 */}
                      {event.data?.pm_analysis && (
                    <div className="pm-analysis">
                      <h4>🤖 PM Agent 分析</h4>
                      
                      <div className="pm-analysis-section">
                        <h5>🛢️ 大宗商品</h5>
                        {event.data?.pm_analysis.oil ? (
                          <div className="impact-item">
                            <span className="impact-icon">🛢️</span>
                            <span className="impact-label">原油:</span>
                            <span className={`impact-value ${event.data?.pm_analysis.oil.direction === 'up' ? 'positive' : 'negative'}`}>
                              {event.data?.pm_analysis.oil.direction === 'up' ? '↑' : '↓'} {event.data?.pm_analysis.oil.min}-{event.data?.pm_analysis.oil.max}%
                            </span>
                            {event.data?.pm_analysis.oil_price_change && (
                              <span className="impact-price">
                                ${event.data?.pm_analysis.oil_price_change.baseline} → ${event.data?.pm_analysis.oil_price_change.baseline + event.data?.pm_analysis.oil_price_change.min_change}-${(event.data?.pm_analysis.oil_price_change.baseline + event.data?.pm_analysis.oil_price_change.max_change).toFixed(2)}
                              </span>
                            )}
                            <span className="impact-reason">{event.data?.pm_analysis.oil.reason}</span>
                          </div>
                        ) : (
                          <div className="impact-item no-impact">
                            <span className="impact-icon">🛢️</span>
                            <span className="impact-label">原油:</span>
                            <span className="impact-value neutral">—</span>
                            <span className="impact-reason">无明显影响</span>
                          </div>
                        )}
                        
                        {event.data?.pm_analysis.gold ? (
                          <div className="impact-item">
                            <span className="impact-icon">🏆</span>
                            <span className="impact-label">黄金:</span>
                            <span className={`impact-value ${event.data?.pm_analysis.gold.direction === 'up' ? 'positive' : 'negative'}`}>
                              {event.data?.pm_analysis.gold.direction === 'up' ? '↑' : '↓'} {event.data?.pm_analysis.gold.min}-{event.data?.pm_analysis.gold.max}%
                            </span>
                            {event.data?.pm_analysis.gold_price_change && (
                              <span className="impact-price">
                                ${event.data?.pm_analysis.gold_price_change.baseline.toLocaleString()} → ${(event.data?.pm_analysis.gold_price_change.baseline + event.data?.pm_analysis.gold_price_change.min_change).toLocaleString()}-${(event.data?.pm_analysis.gold_price_change.baseline + event.data?.pm_analysis.gold_price_change.max_change).toLocaleString()}
                              </span>
                            )}
                            <span className="impact-reason">{event.data?.pm_analysis.gold.reason}</span>
                          </div>
                        ) : (
                          <div className="impact-item no-impact">
                            <span className="impact-icon">🏆</span>
                            <span className="impact-label">黄金:</span>
                            <span className="impact-value neutral">—</span>
                            <span className="impact-reason">无明显影响</span>
                          </div>
                        )}
                        
                        {event.data?.pm_analysis.silver ? (
                          <div className="impact-item">
                            <span className="impact-icon">🥈</span>
                            <span className="impact-label">白银:</span>
                            <span className={`impact-value ${event.data?.pm_analysis.silver.direction === 'up' ? 'positive' : 'negative'}`}>
                              {event.data?.pm_analysis.silver.direction === 'up' ? '↑' : '↓'} {event.data?.pm_analysis.silver.min}-{event.data?.pm_analysis.silver.max}%
                            </span>
                            {event.data?.pm_analysis.silver_price_change && (
                              <span className="impact-price">
                                ${event.data?.pm_analysis.silver_price_change.baseline} → ${(event.data?.pm_analysis.silver_price_change.baseline + event.data?.pm_analysis.silver_price_change.min_change).toFixed(2)}-${(event.data?.pm_analysis.silver_price_change.baseline + event.data?.pm_analysis.silver_price_change.max_change).toFixed(2)}
                              </span>
                            )}
                            <span className="impact-reason">{event.data?.pm_analysis.silver.reason}</span>
                          </div>
                        ) : (
                          <div className="impact-item no-impact">
                            <span className="impact-icon">🥈</span>
                            <span className="impact-label">白银:</span>
                            <span className="impact-value neutral">—</span>
                            <span className="impact-reason">无明显影响</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="pm-analysis-section">
                        <h5>₿ 加密货币</h5>
                        {event.data?.pm_analysis.btc ? (
                          <div className="impact-item">
                            <span className="impact-icon">₿</span>
                            <span className="impact-label">BTC:</span>
                            <span className={`impact-value ${event.data?.pm_analysis.btc.direction === 'up' ? 'positive' : 'negative'}`}>
                              {event.data?.pm_analysis.btc.direction === 'up' ? '↑' : '↓'} {event.data?.pm_analysis.btc.min}-{event.data?.pm_analysis.btc.max}%
                            </span>
                            {event.data?.pm_analysis.btc_price_change && (
                              <span className="impact-price">
                                ${event.data?.pm_analysis.btc_price_change.baseline.toLocaleString()} → ${(event.data?.pm_analysis.btc_price_change.baseline + event.data?.pm_analysis.btc_price_change.min_change).toLocaleString()}-${(event.data?.pm_analysis.btc_price_change.baseline + event.data?.pm_analysis.btc_price_change.max_change).toLocaleString()}
                              </span>
                            )}
                            <span className="impact-reason">{event.data?.pm_analysis.btc.reason}</span>
                          </div>
                        ) : (
                          <div className="impact-item no-impact">
                            <span className="impact-icon">₿</span>
                            <span className="impact-label">BTC:</span>
                            <span className="impact-value neutral">—</span>
                            <span className="impact-reason">无明显影响</span>
                          </div>
                        )}
                        
                        {event.data?.pm_analysis.eth ? (
                          <div className="impact-item">
                            <span className="impact-icon">♦</span>
                            <span className="impact-label">ETH:</span>
                            <span className={`impact-value ${event.data?.pm_analysis.eth.direction === 'up' ? 'positive' : 'negative'}`}>
                              {event.data?.pm_analysis.eth.direction === 'up' ? '↑' : '↓'} {event.data?.pm_analysis.eth.min}-{event.data?.pm_analysis.eth.max}%
                            </span>
                            {event.data?.pm_analysis.eth_price_change && (
                              <span className="impact-price">
                                ${event.data?.pm_analysis.eth_price_change.baseline} → ${(event.data?.pm_analysis.eth_price_change.baseline + event.data?.pm_analysis.eth_price_change.min_change).toFixed(2)}-${(event.data?.pm_analysis.eth_price_change.baseline + event.data?.pm_analysis.eth_price_change.max_change).toFixed(2)}
                              </span>
                            )}
                            <span className="impact-reason">{event.data?.pm_analysis.eth.reason}</span>
                          </div>
                        ) : (
                          <div className="impact-item no-impact">
                            <span className="impact-icon">♦</span>
                            <span className="impact-label">ETH:</span>
                            <span className="impact-value neutral">—</span>
                            <span className="impact-reason">无明显影响</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="pm-analysis-section">
                        <h5>📊 全球股市</h5>
                        {event.data?.pm_analysis.spx ? (
                          <div className="impact-item">
                            <span className="impact-icon">🇺🇸</span>
                            <span className="impact-label">标普 500:</span>
                            <span className={`impact-value ${event.data?.pm_analysis.spx.direction === 'up' ? 'positive' : 'negative'}`}>
                              {event.data?.pm_analysis.spx.direction === 'up' ? '↑' : '↓'} {event.data?.pm_analysis.spx.min}-{event.data?.pm_analysis.spx.max}%
                            </span>
                            {event.data?.pm_analysis.spx_price_change && (
                              <span className="impact-price">
                                {event.data?.pm_analysis.spx_price_change.baseline.toLocaleString()} → {(event.data?.pm_analysis.spx_price_change.baseline + event.data?.pm_analysis.spx_price_change.min_change).toFixed(2)}-${(event.data?.pm_analysis.spx_price_change.baseline + event.data?.pm_analysis.spx_price_change.max_change).toFixed(2)} 点
                              </span>
                            )}
                            <span className="impact-reason">{event.data?.pm_analysis.spx.reason}</span>
                          </div>
                        ) : (
                          <div className="impact-item no-impact">
                            <span className="impact-icon">🇺🇸</span>
                            <span className="impact-label">标普 500:</span>
                            <span className="impact-value neutral">—</span>
                            <span className="impact-reason">无明显影响</span>
                          </div>
                        )}
                        
                        {event.data?.pm_analysis.hsi ? (
                          <div className="impact-item">
                            <span className="impact-icon">🇭🇰</span>
                            <span className="impact-label">恒生指数:</span>
                            <span className={`impact-value ${event.data?.pm_analysis.hsi.direction === 'up' ? 'positive' : 'negative'}`}>
                              {event.data?.pm_analysis.hsi.direction === 'up' ? '↑' : '↓'} {event.data?.pm_analysis.hsi.min}-{event.data?.pm_analysis.hsi.max}%
                            </span>
                            {event.data?.pm_analysis.hsi_price_change && (
                              <span className="impact-price">
                                {event.data?.pm_analysis.hsi_price_change.baseline.toLocaleString()} → {(event.data?.pm_analysis.hsi_price_change.baseline + event.data?.pm_analysis.hsi_price_change.min_change).toFixed(2)}-${(event.data?.pm_analysis.hsi_price_change.baseline + event.data?.pm_analysis.hsi_price_change.max_change).toFixed(2)} 点
                              </span>
                            )}
                            <span className="impact-reason">{event.data?.pm_analysis.hsi.reason}</span>
                          </div>
                        ) : (
                          <div className="impact-item no-impact">
                            <span className="impact-icon">🇭🇰</span>
                            <span className="impact-label">恒生指数:</span>
                            <span className="impact-value neutral">—</span>
                            <span className="impact-reason">无明显影响</span>
                          </div>
                        )}
                        
                        {event.data?.pm_analysis.ftse ? (
                          <div className="impact-item">
                            <span className="impact-icon">🇬🇧</span>
                            <span className="impact-label">富时 100:</span>
                            <span className={`impact-value ${event.data?.pm_analysis.ftse.direction === 'up' ? 'positive' : 'negative'}`}>
                              {event.data?.pm_analysis.ftse.direction === 'up' ? '↑' : '↓'} {event.data?.pm_analysis.ftse.min}-{event.data?.pm_analysis.ftse.max}%
                            </span>
                            {event.data?.pm_analysis.ftse_price_change && (
                              <span className="impact-price">
                                {event.data?.pm_analysis.ftse_price_change.baseline.toLocaleString()} → {(event.data?.pm_analysis.ftse_price_change.baseline + event.data?.pm_analysis.ftse_price_change.min_change).toFixed(2)}-${(event.data?.pm_analysis.ftse_price_change.baseline + event.data?.pm_analysis.ftse_price_change.max_change).toFixed(2)} 点
                              </span>
                            )}
                            <span className="impact-reason">{event.data?.pm_analysis.ftse.reason}</span>
                          </div>
                        ) : (
                          <div className="impact-item no-impact">
                            <span className="impact-icon">🇬🇧</span>
                            <span className="impact-label">富时 100:</span>
                            <span className="impact-value neutral">—</span>
                            <span className="impact-reason">无明显影响</span>
                          </div>
                        )}
                      </div>
                      
                      {event.data?.pm_analysis.summary && (
                        <div className="analysis-summary">
                          <strong>💡 总结:</strong>
                          <p>{event.data?.pm_analysis.summary}</p>
                        </div>
                      )}
                    </div>
                  )}
                  </>
                  )}
                  
                  {/* 如果没有 PM 分析，显示占位符 */}
                  {!event.data?.pm_analysis && (
                    <div className="pm-analysis-placeholder">
                      <p>⏳ PM Agent 正在分析事件影响...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="no-events">暂无事件</div>
        )}
      </div>
    </div>
  );
}

export default EventStream;