// frontend/src/components/Leaderboard.js
import React, { useState, useEffect, memo } from 'react';
import { t, getLang } from '../i18n';
import './Leaderboard.css';
import API_CONFIG from '../config';

const Leaderboard = ({ onClose, onCountrySelect, onLeaderSelect }) => {
  const renderStart = performance.now();
  console.log(`📦 Leaderboard 开始渲染`);
  
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentLang, setCurrentLang] = useState(getLang());

  // 监听语言变更
  useEffect(() => {
    const handler = (e) => {
      setCurrentLang(e.detail.lang);
    };
    window.addEventListener('langchange', handler);
    return () => window.removeEventListener('langchange', handler);
  }, []);

  useEffect(() => {
    console.log(`⏱️ Leaderboard 首次渲染完成：${(performance.now() - renderStart).toFixed(2)}ms`);
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/roles`);
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      const data = await response.json();
      
      // 计算国力总分并排序
      const ranked = (data.roles || data).map(role => {
        const attrs = role.attributes || {};
        const totalPower = (attrs.army || 0) + 
                          (attrs.navy || 0) + 
                          (attrs.airForce || 0) + 
                          (attrs.nuclear || 0) + 
                          (attrs.economy || 0) + 
                          (attrs.stability || 0) + 
                          (attrs.diplomacy || 0) + 
                          (attrs.intel || 0);
        
        return {
          ...role,
          totalPower,
          attributes: attrs
        };
      }).sort((a, b) => b.totalPower - a.totalPower);

      setLeaderboard(ranked);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const getRankIcon = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  const getFactionClass = (faction) => {
    switch (faction) {
      case '抵抗轴心': return 'faction-axis';
      case '美以联盟': return 'faction-us-il';
      case '温和联盟': return 'faction-moderate';
      case '亲穆兄会': return 'faction-brotherhood';
      default: return 'faction-neutral';
    }
  };

  const getFactionBadgeClass = (faction) => {
    switch (faction) {
      case '抵抗轴心': return 'resistance';
      case '美以联盟': return 'us-israel';
      case '温和联盟': return 'moderate';
      case '亲穆兄会': return 'brotherhood';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="leaderboard-table">
        <div className="leaderboard-header">
          <div className="lb-col-rank">{t('leaderboard.rank')}</div>
          <div className="lb-col-country">{t('leaderboard.country')}</div>
          <div className="lb-col-faction">{t('leaderboard.faction')}</div>
          <div className="lb-col-power">{t('leaderboard.power')}</div>
          <div className="lb-col-details">{t('leaderboard.details')}</div>
        </div>
        {/* 骨架屏占位 */}
        {[...Array(8)].map((_, index) => (
          <div key={index} className="leaderboard-row skeleton-row">
            <div className="lb-col-rank"><div className="skeleton skeleton-rank"></div></div>
            <div className="lb-col-country"><div className="skeleton skeleton-country"></div></div>
            <div className="lb-col-faction"><div className="skeleton skeleton-faction"></div></div>
            <div className="lb-col-power"><div className="skeleton skeleton-power"></div></div>
            <div className="lb-col-details"><div className="skeleton skeleton-details"></div></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">❌ {error}</div>
    );
  }

  // 处理国家点击
  const handleCountryClick = (role) => {
    if (onCountrySelect) {
      onCountrySelect(role);
    }
  };

  // 处理领导人点击
  const handleLeaderClick = (role) => {
    if (onLeaderSelect) {
      onLeaderSelect(role);
    }
  };

  return (
    <div className="leaderboard-table">
      <div className="leaderboard-header">
        <div className="lb-col-rank">{t('leaderboard.rank')}</div>
        <div className="lb-col-country">{t('leaderboard.country')}</div>
        <div className="lb-col-faction">{t('leaderboard.faction')}</div>
        <div className="lb-col-power">{t('leaderboard.power')}</div>
        <div className="lb-col-details">{t('leaderboard.details')}</div>
      </div>
      
      {leaderboard.map((role, index) => (
        <div key={role.id} className={`leaderboard-row ${getFactionClass(role.faction)}`}>
          <div className="lb-col-rank">
            <span className="rank-icon">{getRankIcon(index)}</span>
          </div>
          <div className="lb-col-country">
            <div className="country-name clickable" onClick={() => handleCountryClick(role)}>{role.name}</div>
            {role.player_id && role.player_id.Valid && role.player_id.String && (
              <div className="player-nickname clickable" onClick={() => handleLeaderClick(role)}>👤 {role.player_id.String}</div>
            )}
          </div>
          <div className="lb-col-faction">
            <span className={`faction-badge ${getFactionBadgeClass(role.faction)}`}>{role.faction || '-'}</span>
          </div>
          <div className="lb-col-power">
            <span className="power-total">{role.totalPower.toLocaleString()}</span>
          </div>
          <div className="lb-col-details">
            <div className="power-grid">
              <div className="power-item" title={t('leaderboard.army')}>
                <span className="power-icon">🪖</span>
                <span className="power-value">{role.attributes.army || 0}</span>
              </div>
              <div className="power-item" title={t('leaderboard.navy')}>
                <span className="power-icon">⚓</span>
                <span className="power-value">{role.attributes.navy || 0}</span>
              </div>
              <div className="power-item" title={t('leaderboard.airForce')}>
                <span className="power-icon">✈️</span>
                <span className="power-value">{role.attributes.airForce || 0}</span>
              </div>
              <div className="power-item" title={t('leaderboard.nuclear')}>
                <span className="power-icon">☢️</span>
                <span className="power-value">{role.attributes.nuclear || 0}</span>
              </div>
              <div className="power-item" title={t('leaderboard.economy')}>
                <span className="power-icon">💰</span>
                <span className="power-value">{role.attributes.economy || 0}</span>
              </div>
              <div className="power-item" title={t('leaderboard.stability')}>
                <span className="power-icon">🏛️</span>
                <span className="power-value">{role.attributes.stability || 0}</span>
              </div>
              <div className="power-item" title={t('leaderboard.diplomacy')}>
                <span className="power-icon">🤝</span>
                <span className="power-value">{role.attributes.diplomacy || 0}</span>
              </div>
              <div className="power-item" title={t('leaderboard.intel')}>
                <span className="power-icon">👁️</span>
                <span className="power-value">{role.attributes.intel || 0}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default memo(Leaderboard);
