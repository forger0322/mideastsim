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
      name: lang === 'zh' ? (country.name || countryId) : (country.name_en || countryId)
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
      'PSE': '🇵🇸', 'PS': '🇵🇸',
      'JOR': '🇯🇴', 'JO': '🇯🇴',
      'LBN': '🇱🇧', 'LB': '🇱🇧',
    };
    return flagMap[countryId] || '🏴';
  };

  // 翻译国家名称
  const translateCountryName = (name) => {
    if (lang === 'zh') return name;
    const countryTranslations = {
      '巴勒斯坦': 'Palestine',
      '伊拉克': 'Iraq',
      '卡塔尔': 'Qatar',
      '以色列': 'Israel',
      '伊朗': 'Iran',
      '叙利亚': 'Syria',
      '沙特阿拉伯': 'Saudi Arabia',
      '沙特': 'Saudi Arabia',
      '阿联酋': 'UAE',
      '土耳其': 'Turkey',
      '埃及': 'Egypt',
      '科威特': 'Kuwait',
      '巴林': 'Bahrain',
      '阿曼': 'Oman',
      '也门': 'Yemen',
      '约旦': 'Jordan',
      '黎巴嫩': 'Lebanon',
      '美国': 'USA',
      '俄罗斯': 'Russia',
      '中国': 'China',
      '英国': 'UK',
      '法国': 'France',
      '德国': 'Germany',
    };
    return countryTranslations[name] || name;
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

  // 翻译事件标题
  const translateEventTitle = (title) => {
    if (lang === 'zh') return title;
    const translations = {
      '制裁失败': 'Sanction Failed',
      '经济制裁': 'Economic Sanction',
      '中立声明': 'Neutral Statement',
      '军事演习': 'Military Exercise',
      '宣战': 'Declaration of War',
      '和平提议': 'Peace Proposal',
      '结盟提议': 'Alliance Proposal',
      '外交声明': 'Diplomatic Statement',
      '关系改善': 'Relations Improved',
      '政变': 'Coup Attempt',
      '政变成功': 'Coup Successful',
      '政变失败': 'Coup Failed',
      '核试验': 'Nuclear Test',
      '导弹试射': 'Missile Test',
      '断交': 'Diplomatic Break',
      '建交': 'Diplomatic Relations Established',
      '贸易协定': 'Trade Agreement',
      '军事行动受挫': 'Military Action Failed',
      '战争爆发': 'War Declared',
    };
    return translations[title] || title;
  };

  // 翻译事件描述（处理类似 "约旦 对 以色列 的制裁效果有限" 的格式）
  const translateEventDescription = (desc) => {
    if (lang === 'zh') return desc;
    if (!desc) return '';
    
    // 翻译国家名称
    let translated = desc;
    const countryTranslations = {
      '巴勒斯坦': 'Palestine',
      '伊拉克': 'Iraq',
      '卡塔尔': 'Qatar',
      '以色列': 'Israel',
      '伊朗': 'Iran',
      '叙利亚': 'Syria',
      '沙特阿拉伯': 'Saudi Arabia',
      '沙特': 'Saudi Arabia',
      '阿联酋': 'UAE',
      '土耳其': 'Turkey',
      '埃及': 'Egypt',
      '科威特': 'Kuwait',
      '巴林': 'Bahrain',
      '阿曼': 'Oman',
      '也门': 'Yemen',
      '约旦': 'Jordan',
      '黎巴嫩': 'Lebanon',
      '美国': 'USA',
      '俄罗斯': 'Russia',
      '中国': 'China',
      '英国': 'UK',
      '法国': 'France',
      '德国': 'Germany',
    };
    
    // 替换所有国家名称
    Object.keys(countryTranslations).forEach(cn => {
      translated = translated.replace(new RegExp(cn, 'g'), countryTranslations[cn]);
    });
    
    // 翻译常见短语
    const phraseTranslations = {
      '对': 'against',
      '的': '\'s',
      '制裁效果有限': 'sanction had limited effect',
      '制裁效果显著': 'sanction was highly effective',
      '发表': 'issued',
      '声明': 'statement',
      '中立声明': 'neutral statement',
      '宣战': 'declared war on',
      '军事演习': 'military exercise',
      '政变': 'attempted coup',
      '政变成功': 'successful coup',
      '政变失败': 'failed coup',
      '军事行动受挫': 'military operation failed',
      '损失惨重': 'suffered heavy losses',
      '战争爆发': 'war broke out',
    };
    
    Object.keys(phraseTranslations).forEach(cn => {
      translated = translated.replace(new RegExp(cn, 'g'), phraseTranslations[cn]);
    });
    
    return translated;
  };

  return (
    <div className="event-stream-container">
      <h3>{lang === 'zh' ? '📰 事件列表' : '📰 Events'}</h3>
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
                <span className="event-location">{translateCountryName(event.location)}</span>
                
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
                {translateEventTitle(event.title || event.text)}
              </div>
              
              {/* 展开的详情 */}
              {expandedEventId === event.id && (
                <div className="event-details">
                  {/* 战争事件特殊展示 */}
                  {event.id.startsWith('war_') ? (
                    <div className="war-details">
                      <div className="war-header">
                        <span className="war-icon">⚔️</span>
                        <span className="war-title">{lang === 'zh' ? '战争爆发' : 'War Declared'}</span>
                        <span className="war-badge">🔥 {lang === 'zh' ? '进行中' : 'Ongoing'}</span>
                      </div>
                      
                      <div className="war-combatants">
                        {(() => {
                          const actorInfo = getCountryInfo(event.actor_id);
                          const targetInfo = getCountryInfo(event.target_id);
                          
                          return (
                            <>
                              <div className="combatant">
                                <span className="combatant-flag">{actorInfo.flag}</span>
                                <span className="combatant-name">{translateCountryName(event.actor_name) || actorInfo.name}</span>
                                <span className="combatant-role">{lang === 'zh' ? '（进攻方）' : '(Aggressor)'}</span>
                              </div>
                              <div className="vs-divider">VS</div>
                              <div className="combatant">
                                <span className="combatant-flag">{targetInfo.flag}</span>
                                <span className="combatant-name">{translateCountryName(event.target_name) || targetInfo.name}</span>
                                <span className="combatant-role">{lang === 'zh' ? '（防守方）' : '(Defender)'}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      
                      <div className="war-info">
                        <div className="info-item">
                          <span className="info-label">⏱️ {lang === 'zh' ? '开始时间:' : 'Start Time:'}</span>
                          <span className="info-value">{new Date(event.timestamp).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US')}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">📍 {lang === 'zh' ? '地点:' : 'Location:'}</span>
                          <span className="info-value">{translateCountryName(event.location)}</span>
                        </div>
                      </div>
                      
                      <div className="war-description">
                        <p>{translateEventDescription(lang === 'zh' ? event.description_zh || event.description : event.description)}</p>
                      </div>
                      
                      <div className="war-actions">
                        <button className="war-action-btn">📊 {lang === 'zh' ? '查看战况' : 'View Status'}</button>
                        <button className="war-action-btn">🕊️ {lang === 'zh' ? '促和' : 'Mediate'}</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="event-description">
                        <strong>📝 {lang === 'zh' ? '详情:' : 'Details:'}</strong>
                        <p>{translateEventDescription(lang === 'zh' ? event.description_zh || event.description || event.text : event.description || event.text)}</p>
                      </div>
                      
                      {/* PM Agent 分析 */}
                      {event.data?.pm_analysis && (
                    <div className="pm-analysis">
                      <h4>🤖 PM Agent {lang === 'zh' ? '分析' : 'Analysis'}</h4>
                      
                      <div className="pm-analysis-section">
                        <h5>🛢️ {lang === 'zh' ? '大宗商品' : 'Commodities'}</h5>
                        {event.data?.pm_analysis.oil ? (
                          <div className="impact-item">
                            <span className="impact-icon">🛢️</span>
                            <span className="impact-label">{lang === 'zh' ? '原油:' : 'Crude Oil:'}</span>
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
                            <span className="impact-label">{lang === 'zh' ? '原油:' : 'Crude Oil:'}</span>
                            <span className="impact-value neutral">—</span>
                            <span className="impact-reason">{lang === 'zh' ? '无明显影响' : 'No significant impact'}</span>
                          </div>
                        )}
                        
                        {event.data?.pm_analysis.gold ? (
                          <div className="impact-item">
                            <span className="impact-icon">🏆</span>
                            <span className="impact-label">{lang === 'zh' ? '黄金:' : 'Gold:'}</span>
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
                            <span className="impact-label">{lang === 'zh' ? '黄金:' : 'Gold:'}</span>
                            <span className="impact-value neutral">—</span>
                            <span className="impact-reason">{lang === 'zh' ? '无明显影响' : 'No significant impact'}</span>
                          </div>
                        )}
                        
                        {event.data?.pm_analysis.silver ? (
                          <div className="impact-item">
                            <span className="impact-icon">🥈</span>
                            <span className="impact-label">{lang === 'zh' ? '白银:' : 'Silver:'}</span>
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
                            <span className="impact-label">{lang === 'zh' ? '白银:' : 'Silver:'}</span>
                            <span className="impact-value neutral">—</span>
                            <span className="impact-reason">{lang === 'zh' ? '无明显影响' : 'No significant impact'}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="pm-analysis-section">
                        <h5>₿ {lang === 'zh' ? '加密货币' : 'Cryptocurrency'}</h5>
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
                            <span className="impact-reason">{lang === 'zh' ? '无明显影响' : 'No significant impact'}</span>
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
                            <span className="impact-reason">{lang === 'zh' ? '无明显影响' : 'No significant impact'}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="pm-analysis-section">
                        <h5>📊 {lang === 'zh' ? '全球股市' : 'Global Markets'}</h5>
                        {event.data?.pm_analysis.spx ? (
                          <div className="impact-item">
                            <span className="impact-icon">🇺🇸</span>
                            <span className="impact-label">S&P 500:</span>
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
                        
                        {event.data?.pm_analysis.spx ? (
                          <div className="impact-item">
                            <span className="impact-icon">🇺🇸</span>
                            <span className="impact-label">S&amp;P 500:</span>
                            <span className={`impact-value ${event.data?.pm_analysis.spx.direction === 'up' ? 'positive' : 'negative'}`}>
                              {event.data?.pm_analysis.spx.direction === 'up' ? '↑' : '↓'} {event.data?.pm_analysis.spx.min}-{event.data?.pm_analysis.spx.max}%
                            </span>
                            {event.data?.pm_analysis.spx_price_change && (
                              <span className="impact-price">
                                {event.data?.pm_analysis.spx_price_change.baseline.toLocaleString()} → {(event.data?.pm_analysis.spx_price_change.baseline + event.data?.pm_analysis.spx_price_change.min_change).toFixed(2)}-${(event.data?.pm_analysis.spx_price_change.baseline + event.data?.pm_analysis.spx_price_change.max_change).toFixed(2)} {lang === 'zh' ? '点' : 'pts'}
                              </span>
                            )}
                            <span className="impact-reason">{event.data?.pm_analysis.spx.reason}</span>
                          </div>
                        ) : (
                          <div className="impact-item no-impact">
                            <span className="impact-icon">🇺🇸</span>
                            <span className="impact-label">S&amp;P 500:</span>
                            <span className="impact-value neutral">—</span>
                            <span className="impact-reason">{lang === 'zh' ? '无明显影响' : 'No significant impact'}</span>
                          </div>
                        )}
                        
                        {event.data?.pm_analysis.hsi ? (
                          <div className="impact-item">
                            <span className="impact-icon">🇭🇰</span>
                            <span className="impact-label">{lang === 'zh' ? '恒生指数:' : 'Hang Seng:'}</span>
                            <span className={`impact-value ${event.data?.pm_analysis.hsi.direction === 'up' ? 'positive' : 'negative'}`}>
                              {event.data?.pm_analysis.hsi.direction === 'up' ? '↑' : '↓'} {event.data?.pm_analysis.hsi.min}-{event.data?.pm_analysis.hsi.max}%
                            </span>
                            {event.data?.pm_analysis.hsi_price_change && (
                              <span className="impact-price">
                                {event.data?.pm_analysis.hsi_price_change.baseline.toLocaleString()} → {(event.data?.pm_analysis.hsi_price_change.baseline + event.data?.pm_analysis.hsi_price_change.min_change).toFixed(2)}-${(event.data?.pm_analysis.hsi_price_change.baseline + event.data?.pm_analysis.hsi_price_change.max_change).toFixed(2)} {lang === 'zh' ? '点' : 'pts'}
                              </span>
                            )}
                            <span className="impact-reason">{event.data?.pm_analysis.hsi.reason}</span>
                          </div>
                        ) : (
                          <div className="impact-item no-impact">
                            <span className="impact-icon">🇭🇰</span>
                            <span className="impact-label">{lang === 'zh' ? '恒生指数:' : 'Hang Seng:'}</span>
                            <span className="impact-value neutral">—</span>
                            <span className="impact-reason">{lang === 'zh' ? '无明显影响' : 'No significant impact'}</span>
                          </div>
                        )}
                        
                        {event.data?.pm_analysis.ftse ? (
                          <div className="impact-item">
                            <span className="impact-icon">🇬🇧</span>
                            <span className="impact-label">{lang === 'zh' ? '富时 100:' : 'FTSE 100:'}</span>
                            <span className={`impact-value ${event.data?.pm_analysis.ftse.direction === 'up' ? 'positive' : 'negative'}`}>
                              {event.data?.pm_analysis.ftse.direction === 'up' ? '↑' : '↓'} {event.data?.pm_analysis.ftse.min}-{event.data?.pm_analysis.ftse.max}%
                            </span>
                            {event.data?.pm_analysis.ftse_price_change && (
                              <span className="impact-price">
                                {event.data?.pm_analysis.ftse_price_change.baseline.toLocaleString()} → {(event.data?.pm_analysis.ftse_price_change.baseline + event.data?.pm_analysis.ftse_price_change.min_change).toFixed(2)}-${(event.data?.pm_analysis.ftse_price_change.baseline + event.data?.pm_analysis.ftse_price_change.max_change).toFixed(2)} {lang === 'zh' ? '点' : 'pts'}
                              </span>
                            )}
                            <span className="impact-reason">{event.data?.pm_analysis.ftse.reason}</span>
                          </div>
                        ) : (
                          <div className="impact-item no-impact">
                            <span className="impact-icon">🇬🇧</span>
                            <span className="impact-label">{lang === 'zh' ? '富时 100:' : 'FTSE 100:'}</span>
                            <span className="impact-value neutral">—</span>
                            <span className="impact-reason">{lang === 'zh' ? '无明显影响' : 'No significant impact'}</span>
                          </div>
                        )}
                      </div>
                      
                      {event.data?.pm_analysis.summary && (
                        <div className="analysis-summary">
                          <strong>💡 {lang === 'zh' ? '总结:' : 'Summary:'}</strong>
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
                      <p>⏳ {lang === 'zh' ? 'PM Agent 正在分析事件影响...' : 'PM Agent is analyzing event impact...'}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="no-events">{lang === 'zh' ? '暂无事件' : 'No events'}</div>
        )}
      </div>
    </div>
  );
}

export default EventStream;