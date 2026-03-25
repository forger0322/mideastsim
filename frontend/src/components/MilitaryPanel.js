// frontend/src/components/MilitaryPanel.js
import React, { useState, useEffect } from 'react';
import { t, getLang } from '../i18n';
import './MilitaryPanel.css';

const MilitaryPanel = ({ wars, onClose }) => {
  const [currentLang, setCurrentLang] = useState(getLang());

  // 监听语言变更
  useEffect(() => {
    const handler = (e) => {
      setCurrentLang(e.detail.lang);
    };
    window.addEventListener('langchange', handler);
    return () => window.removeEventListener('langchange', handler);
  }, []);

  // 模拟战争数据（实际应从 API 获取）
  const defaultWars = [
    {
      id: 'IRN_vs_ISR',
      aggressor: 'IRN',
      defender: 'ISR',
      start_date: '2026-03-12',
      casualties: { attacker: 120, defender: 85 },
      status: 'active',
    },
  ];

  const displayWars = wars || defaultWars;

  const getCountryName = (iso3) => {
    // 使用 i18n 翻译
    const key = `countries.${iso3}`;
    const name = t(key);
    // 如果返回的是 key 本身，说明没有翻译，返回 ISO3
    return name === key ? iso3 : name;
  };

  const getCountryFlag = (iso3) => {
    const flags = {
      'IRN': '🇮🇷',
      'IRQ': '🇮🇶',
      'SYR': '🇸🇾',
      'ISR': '🇮🇱',
      'SAU': '🇸🇦',
      'USA': '🇺🇸',
      'TUR': '🇹🇷',
      'EGY': '🇪🇬',
    };
    return flags[iso3] || '🏳️';
  };

  return (
    <div className="military-panel">
      <div className="panel-content">
        {displayWars.length === 0 ? (
          <div className="no-wars">
            <div className="no-wars-icon">🕊️</div>
            <div className="no-wars-text">{t('military.noWars')}</div>
          </div>
        ) : (
          <div className="wars-list">
            {displayWars.map((war) => (
              <div key={war.id} className="war-card">
                <div className="war-header">
                  <div className="war-sides">
                    <div className="war-side">
                      <span className="country-flag">{getCountryFlag(war.aggressor)}</span>
                      <span className="country-name">{getCountryName(war.aggressor)}</span>
                      <span className="side-label">{t('military.aggressor')}</span>
                    </div>
                    <span className="vs">VS</span>
                    <div className="war-side">
                      <span className="country-flag">{getCountryFlag(war.defender)}</span>
                      <span className="country-name">{getCountryName(war.defender)}</span>
                      <span className="side-label">{t('military.defender')}</span>
                    </div>
                  </div>
                  <div className="war-status active">
                    {currentLang === 'zh' ? '进行中' : 'Active'}
                  </div>
                </div>

                <div className="war-info">
                  <div className="war-item">
                    <span className="war-label">{t('military.startTime')}</span>
                    <span className="war-value">{war.start_date}</span>
                  </div>
                  <div className="war-item">
                    <span className="war-label">{t('military.casualties')}</span>
                    <span className="war-value">
                      {getCountryName(war.aggressor)}: {war.casualties?.attacker || 0} | 
                      {getCountryName(war.defender)}: {war.casualties?.defender || 0}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MilitaryPanel;
