// CountryDetailPanel.js - 国家详情面板
import React from 'react';
import { useTranslation } from '../i18n';
import './CountryDetailPanel.css';

// 国旗映射
const countryFlags = {
  '伊朗': '🇮🇷',
  '伊拉克': '🇮🇶',
  '叙利亚': '🇸🇾',
  '黎巴嫩': '🇱🇧',
  '以色列': '🇮🇱',
  '约旦': '🇯🇴',
  '沙特阿拉伯': '🇸🇦',
  '埃及': '🇪🇬',
  '也门': '🇾🇪',
  '阿曼': '🇴🇲',
  '科威特': '🇰🇼',
  '卡塔尔': '🇶🇦',
  '阿联酋': '🇦🇪',
  '巴林': '🇧🇭',
  '土耳其': '🇹🇷',
  '巴勒斯坦': '🇵🇸',
  '美国': '🇺🇸',
  '俄罗斯': '🇷🇺',
  '中国': '🇨🇳',
  '英国': '🇬🇧',
  '法国': '🇫🇷',
  '德国': '🇩🇪',
};

// 势力样式映射
const factionStyles = {
  '抵抗轴心': 'resistance',
  '美以联盟': 'us-israel',
  '温和联盟': 'moderate',
  '亲穆兄会': 'brotherhood',
  '其他': 'other',
};

const CountryDetailPanel = ({ country, onClose, onAction }) => {
  const { t, lang } = useTranslation();
  if (!country) return null;

  const flag = countryFlags[country.name] || '🏳️';
  const factionClass = factionStyles[country.faction] || 'other';
  
  // 势力名称翻译
  const factionTranslations = {
    '抵抗轴心': { zh: '抵抗轴心', en: 'Resistance Axis' },
    '美以联盟': { zh: '美以联盟', en: 'US-Israel Alliance' },
    '温和联盟': { zh: '温和联盟', en: 'Moderate Alliance' },
    '亲穆兄会': { zh: '亲穆兄会', en: 'Muslim Brotherhood' },
    '其他': { zh: '其他', en: 'Other' },
  };
  const factionName = factionTranslations[country.faction]?.[lang] || country.faction;

  return (
    <div className="country-detail-panel visible">
      {/* 关闭按钮 */}
      <button className="close-panel" onClick={onClose}>×</button>
      
      {/* 头部 */}
      <div className="country-detail-header">
        <div className="country-name">
          <span className="country-flag">{flag}</span>
          {lang === 'zh' ? country.name : country.nameEn}
        </div>
        <div className={`faction-badge ${factionClass}`}>
          {factionName}
        </div>
      </div>

      {/* 详情网格 */}
      <div className="country-detail-grid">
        <div className="detail-item">
          <span className="detail-label">{t('country.faction')}</span>
          <span className="detail-value faction-color">{factionName}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">{t('country.stability')}</span>
          <span className="detail-value">{country.stability || '68%'}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">{t('country.leader')}</span>
          <span className="detail-value">
            {country.leader ? (lang === 'zh' ? country.leader : country.leaderEn || country.leader) : t('country.pending')}
          </span>
        </div>
        <div className="detail-item">
          <span className="detail-label">{t('country.status')}</span>
          <span className="detail-value">{country.status || t('status.neutral')}</span>
        </div>
        {country.population && (
          <div className="detail-item">
            <span className="detail-label">{t('country.population')}</span>
            <span className="detail-value">{country.population}</span>
          </div>
        )}
        {country.gdp && (
          <div className="detail-item">
            <span className="detail-label">{t('country.gdp')}</span>
            <span className="detail-value">{country.gdp}</span>
          </div>
        )}
      </div>

      {/* 行动按钮 */}
      <div className="country-actions">
        <button className="game-button" onClick={() => onAction && onAction('detail')}>
          <span className="game-button-icon">📊</span>
          {t('country.viewDetail')}
        </button>
        <button className="game-button" onClick={() => onAction && onAction('message')}>
          <span className="game-button-icon">💬</span>
          {t('country.sendMessage')}
        </button>
        <button className="game-button" onClick={() => onAction && onAction('analyze')}>
          <span className="game-button-icon">🔮</span>
          {t('country.analyze')}
        </button>
      </div>
    </div>
  );
};

export default CountryDetailPanel;
