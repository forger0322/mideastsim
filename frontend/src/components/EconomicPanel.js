// frontend/src/components/EconomicPanel.js
import React, { useState, useEffect } from 'react';
import { t, getLang } from '../i18n';
import './EconomicPanel.css';

const EconomicPanel = ({ worldState, onClose }) => {
  const [currentLang, setCurrentLang] = useState(getLang());
  const [economy, setEconomy] = useState(null);

  // 监听语言变更
  useEffect(() => {
    const handler = (e) => {
      setCurrentLang(e.detail.lang);
    };
    window.addEventListener('langchange', handler);
    return () => window.removeEventListener('langchange', handler);
  }, []);

  // 从 worldState 获取经济数据
  useEffect(() => {
    if (worldState && worldState.economy) {
      setEconomy(worldState.economy);
    }
  }, [worldState]);

  // 基准数据（用于计算变化百分比）
  const baseline = {
    spx: 6672.62,
    hsi: 25716.76,
    ftse: 8342.15,
    btc: 70523,
    eth: 2064,
    oil: 96.35,
    gold: 5153,
    silver: 86.84,
  };

  // 构建动态数据
  const stocks = economy ? [
    { 
      nameKey: 'economy.spx', 
      key: 'SPX', 
      icon: '🇺🇸', 
      value: economy.stocks?.spx || baseline.spx,
      change: economy.stocks?.spx ? ((economy.stocks.spx - baseline.spx) / baseline.spx * 100).toFixed(2) : -1.5
    },
    { 
      nameKey: 'economy.hsi', 
      key: 'HSI', 
      icon: '🇭🇰', 
      value: economy.stocks?.hsi || baseline.hsi,
      change: economy.stocks?.hsi ? ((economy.stocks.hsi - baseline.hsi) / baseline.hsi * 100).toFixed(2) : -0.70
    },
    { 
      nameKey: 'economy.ftse', 
      key: 'FTSE', 
      icon: '🇬🇧', 
      value: economy.stocks?.ftse || baseline.ftse,
      change: economy.stocks?.ftse ? ((economy.stocks.ftse - baseline.ftse) / baseline.ftse * 100).toFixed(2) : 0.45
    },
  ] : [];

  const crypto = economy ? [
    { 
      nameKey: 'economy.btc', 
      key: 'BTC', 
      icon: '₿', 
      value: economy.crypto?.btc || baseline.btc,
      change: economy.crypto?.btc ? ((economy.crypto.btc - baseline.btc) / baseline.btc * 100).toFixed(2) : 0.58
    },
    { 
      nameKey: 'economy.eth', 
      key: 'ETH', 
      icon: '♦', 
      value: economy.crypto?.eth || baseline.eth,
      change: economy.crypto?.eth ? ((economy.crypto.eth - baseline.eth) / baseline.eth * 100).toFixed(2) : 1.81
    },
  ] : [];

  const commodities = economy ? [
    { 
      nameKey: 'economy.oil', 
      key: 'Oil', 
      icon: '🛢️', 
      value: economy.commodities?.oil || baseline.oil,
      change: economy.commodities?.oil ? ((economy.commodities.oil - baseline.oil) / baseline.oil * 100).toFixed(2) : 3.2
    },
    { 
      nameKey: 'economy.gold', 
      key: 'Gold', 
      icon: '🥇', 
      value: economy.commodities?.gold || baseline.gold,
      change: economy.commodities?.gold ? ((economy.commodities.gold - baseline.gold) / baseline.gold * 100).toFixed(2) : 1.8
    },
    { 
      nameKey: 'economy.silver', 
      key: 'Silver', 
      icon: '🥈', 
      value: economy.commodities?.silver || baseline.silver,
      change: economy.commodities?.silver ? ((economy.commodities.silver - baseline.silver) / baseline.silver * 100).toFixed(2) : 1.28
    },
  ] : [];

  return (
    <div className="economic-panel">
      <div className="panel-content">
        {/* 股票市场 */}
        <div className="section">
          <h4>📈 {t('economy.stocks')}</h4>
          <div className="stock-grid">
            {stocks.map((item) => (
              <div key={item.key} className="stock-card">
                <div className="stock-icon">{item.icon}</div>
                <div className="stock-name">{t(item.nameKey)}</div>
                <div className="stock-value">
                  {item.key === 'HSI' ? item.value.toLocaleString() : item.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
                <div className={`stock-change ${item.change > 0 ? 'up' : 'down'}`}>
                  {item.change > 0 ? '↑' : '↓'} {Math.abs(item.change)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 加密货币 */}
        <div className="section">
          <h4>₿ {t('economy.crypto')}</h4>
          <div className="crypto-grid">
            {crypto.map((item) => (
              <div key={item.key} className="crypto-card">
                <div className="crypto-icon">{item.icon}</div>
                <div className="crypto-name">{t(item.nameKey)}</div>
                <div className="crypto-value">
                  ${item.value.toLocaleString()}
                </div>
                <div className={`crypto-change ${item.change > 0 ? 'up' : 'down'}`}>
                  {item.change > 0 ? '↑' : '↓'} {item.change}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 大宗商品 */}
        <div className="section">
          <h4>🏆 {t('economy.commodities')}</h4>
          <div className="commodity-grid">
            {commodities.map((item) => (
              <div key={item.key} className="commodity-card">
                <div className="commodity-icon">{item.icon}</div>
                <div className="commodity-name">{t(item.nameKey)}</div>
                <div className="commodity-value">
                  ${item.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
                <div className={`commodity-change ${item.change > 0 ? 'up' : 'down'}`}>
                  {item.change > 0 ? '↑' : '↓'} {item.change}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 制裁状态 */}
        <div className="section">
          <h4>{t('economy.sanctions')}</h4>
          <div className="sanctions-list">
            <div className="sanction-item">
              <span>{currentLang === 'zh' ? '伊朗' : 'Iran'}</span>
              <span className="sanction-status active">{t('economy.oilSanctions')}</span>
            </div>
            <div className="sanction-item">
              <span>{currentLang === 'zh' ? '叙利亚' : 'Syria'}</span>
              <span className="sanction-status active">{t('economy.fullSanctions')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EconomicPanel;
