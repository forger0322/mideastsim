// frontend/src/components/DiplomacyPanel.js
import React, { useState, useEffect } from 'react';
import { t, getLang } from '../i18n';
import './DiplomacyPanel.css';

const DiplomacyPanel = ({ relations, onClose }) => {
  const [currentLang, setCurrentLang] = useState(getLang());

  // 监听语言变更
  useEffect(() => {
    const handler = (e) => {
      setCurrentLang(e.detail.lang);
    };
    window.addEventListener('langchange', handler);
    return () => window.removeEventListener('langchange', handler);
  }, []);

  // 模拟关系数据（实际应从 API 获取）
  const defaultRelations = [
    { from: 'IRN', to: 'IRQ', value: 85, trend: 5 },
    { from: 'IRN', to: 'SYR', value: 90, trend: 0 },
    { from: 'IRN', to: 'ISR', value: -95, trend: -2 },
    { from: 'IRN', to: 'SAU', value: -45, trend: 3 },
    { from: 'IRN', to: 'USA', value: -80, trend: 0 },
    { from: 'ISR', to: 'USA', value: 95, trend: 0 },
    { from: 'ISR', to: 'SAU', value: 65, trend: 8 },
    { from: 'SAU', to: 'ARE', value: 70, trend: 2 },
  ];

  const displayRelations = relations || defaultRelations;

  const getRelationLevel = (value) => {
    if (value >= 70) return { label: t('diplomacy.friendly'), color: '#4CAF50' };
    if (value >= 30) return { label: t('diplomacy.neutral'), color: '#FFC107' };
    if (value >= -30) return { label: t('diplomacy.neutral'), color: '#FF9800' };
    if (value >= -70) return { label: t('diplomacy.hostile'), color: '#FF5722' };
    return { label: t('diplomacy.hostile'), color: '#f44336' };
  };

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
      'ARE': '🇦🇪',
      'TUR': '🇹🇷',
      'EGY': '🇪🇬',
    };
    return flags[iso3] || '🏳️';
  };

  return (
    <div className="diplomacy-panel">
      <div className="panel-content">
        <div className="relations-list">
          {displayRelations.map((rel, index) => {
            const level = getRelationLevel(rel.value);
            return (
              <div key={index} className="relation-item">
                <div className="relation-countries">
                  <span className="country-flag">{getCountryFlag(rel.from)}</span>
                  <span className="country-name">{getCountryName(rel.from)}</span>
                  <span className="vs">→</span>
                  <span className="country-flag">{getCountryFlag(rel.to)}</span>
                  <span className="country-name">{getCountryName(rel.to)}</span>
                </div>
                
                <div className="relation-value">
                  <div className="value-number">{rel.value > 0 ? '+' : ''}{rel.value}</div>
                  <div 
                    className="relation-bar"
                    style={{ 
                      background: `linear-gradient(to right, ${level.color} ${Math.abs(rel.value)}%, transparent ${Math.abs(rel.value)}%)`
                    }}
                  />
                </div>
                
                <div className="relation-trend">
                  {rel.trend > 0 && <span className="trend-up">↑ {rel.trend}</span>}
                  {rel.trend < 0 && <span className="trend-down">↓ {Math.abs(rel.trend)}</span>}
                  {rel.trend === 0 && <span className="trend-stable">−</span>}
                </div>
                
                <div 
                  className="relation-level"
                  style={{ color: level.color }}
                >
                  {level.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DiplomacyPanel;
