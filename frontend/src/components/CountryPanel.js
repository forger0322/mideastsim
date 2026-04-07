// frontend/src/components/CountryPanel.js
import React, { useState, useEffect } from 'react';
import { t, getLang } from '../i18n';
import './CountryPanel.css';
import { countryFactions, countryStability, countryStatus, countryStatusEn, countryNameMap, countryFlags } from '../data/countryFactions';

// 势力数据
const FACTIONS = [
  {
    id: 'resistance',
    name: '抵抗轴心',
    color: '#8B1A1A',
    strength: 78,
    description: '以伊朗为核心的地区抵抗力量联盟，包括伊拉克、叙利亚、黎巴嫩真主党、巴勒斯坦哈马斯和也门胡塞武装',
    countries: ['伊朗', '伊拉克', '叙利亚', '黎巴嫩', '巴勒斯坦', '也门']
  },
  {
    id: 'usisrael',
    name: '美以联盟',
    color: '#1E4F8A',
    strength: 92,
    description: '美国与以色列的战略合作联盟，在中东地区拥有强大的军事和情报网络',
    countries: ['美国', '以色列', '约旦']
  },
  {
    id: 'moderate',
    name: '温和联盟',
    color: '#B8860B',
    strength: 75,
    description: '海湾阿拉伯国家组成的温和派联盟，以沙特为核心，包括埃及、阿联酋等逊尼派国家',
    countries: ['沙特', '埃及', '阿联酋', '科威特', '卡塔尔', '巴林', '阿曼', '也门']
  },
  {
    id: 'brotherhood',
    name: '亲穆兄会',
    color: '#2D5A27',
    strength: 65,
    description: '支持穆斯林兄弟会的政治力量，以土耳其和卡塔尔为主要支持者',
    countries: ['土耳其', '卡塔尔']
  }
];

// 国家实力数据将从 API 获取并计算
// 计算公式参考 Leaderboard: army + navy + airForce + nuclear + economy + stability + diplomacy

// 模拟领导人数据
const countryLeaders = {
  'Iran': { name: '阿里·哈梅内伊', title: '最高领袖' },
  'Iraq': { name: '阿卜杜勒·拉蒂夫·拉希德', title: '总统' },
  'Syria': { name: '巴沙尔·阿萨德', title: '总统' },
  'Lebanon': { name: '约瑟夫·奥恩', title: '总统' },
  'Palestine': { name: '马哈茂德·阿巴斯', title: '总统' },
  'Yemen': { name: '阿卜杜勒·马利克·胡塞', title: '最高政治委员会主席' },
  'Israel': { name: '本雅明·内塔尼亚胡', title: '总理' },
  'Jordan': { name: '阿卜杜拉二世', title: '国王' },
  'United States of America': { name: '唐纳德·特朗普', title: '总统' },
  'United States': { name: '唐纳德·特朗普', title: '总统' },
  'Saudi Arabia': { name: '穆罕默德·本·萨勒曼', title: '王储' },
  'Egypt': { name: '阿卜杜勒·法塔赫·塞西', title: '总统' },
  'Oman': { name: '海赛姆·本·塔里克', title: '苏丹' },
  'Kuwait': { name: '米沙勒·艾哈迈德', title: '埃米尔' },
  'Qatar': { name: '塔米姆·本·哈马德', title: '埃米尔' },
  'United Arab Emirates': { name: '穆罕默德·本·扎耶德', title: '总统' },
  'Bahrain': { name: '哈马德·本·伊萨', title: '国王' },
  'Turkey': { name: '雷杰普·塔伊普·埃尔多安', title: '总统' },
  'Russia': { name: '弗拉基米尔·普京', title: '总统' },
  'France': { name: '埃马纽埃尔·马克龙', title: '总统' },
  'Germany': { name: '奥拉夫·朔尔茨', title: '总理' },
  'United Kingdom': { name: '基尔·斯塔默', title: '首相' },
  'China': { name: '习近平', title: '主席' },
};

const CountryPanel = ({ activeTab = 'countries', onClose }) => {
  const [currentLang, setCurrentLang] = useState(getLang());
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedFaction, setSelectedFaction] = useState(null);

  // 监听语言变更
  useEffect(() => {
    const handler = (e) => {
      setCurrentLang(e.detail.lang);
    };
    window.addEventListener('langchange', handler);
    return () => window.removeEventListener('langchange', handler);
  }, []);

  // 从 API 获取国家数据并计算国力总分
  useEffect(() => {
    const fetchCountryData = async () => {
      try {
        const response = await fetch('/api/roles');
        if (!response.ok) {
          throw new Error('Failed to fetch country data');
        }
        const data = await response.json();
        const roles = data.roles || data;
        
        // 角色 ID 到国家英文名的映射
        const roleToCountry = {
          'iran': 'Iran', 'iraq': 'Iraq', 'syria': 'Syria', 'lebanon': 'Lebanon',
          'palestine': 'Palestine', 'yemen': 'Yemen', 'israel': 'Israel', 'jordan': 'Jordan',
          'usa': 'United States', 'saudi_arabia': 'Saudi Arabia', 'egypt': 'Egypt',
          'oman': 'Oman', 'kuwait': 'Kuwait', 'qatar': 'Qatar', 'uae': 'United Arab Emirates',
          'bahrain': 'Bahrain', 'turkey': 'Turkey', 'russia': 'Russia', 'china': 'China',
          // 大写三字码映射
          'USA': 'United States', 'IRN': 'Iran', 'IRQ': 'Iraq', 'SYR': 'Syria',
          'LBN': 'Lebanon', 'PSE': 'Palestine', 'YEM': 'Yemen', 'ISR': 'Israel',
          'JOR': 'Jordan', 'SAU': 'Saudi Arabia', 'EGY': 'Egypt', 'OMN': 'Oman',
          'KWT': 'Kuwait', 'QAT': 'Qatar', 'ARE': 'United Arab Emirates',
          'BHR': 'Bahrain', 'TUR': 'Turkey', 'RUS': 'Russia', 'CHN': 'China',
        };
        
        const countryList = roles.map((role, index) => {
          const attrs = role.attributes || {};
          // 计算国力总分（与 Leaderboard 相同的逻辑）
          const totalPower = (attrs.army || 0) + 
                            (attrs.navy || 0) + 
                            (attrs.airForce || 0) + 
                            (attrs.nuclear || 0) + 
                            (attrs.economy || 0) +
                            (attrs.stability || 0) +
                            (attrs.diplomacy || 0);
          
          const countryEn = roleToCountry[role.id] || role.id;
          const countryZh = countryNameMap[countryEn] || countryEn;
          
          return {
            id: index,
            name: countryEn,
            nameZh: countryZh,
            flag: countryFlags[countryZh] || '🏳️',
            power: totalPower,
            military: (attrs.army || 0) + (attrs.navy || 0) + (attrs.airForce || 0) + (attrs.nuclear || 0),
            economic: attrs.economy || 0,
            political: (attrs.stability || 0) + (attrs.diplomacy || 0),
            // 详细属性
            army: attrs.army || 0,
            navy: attrs.navy || 0,
            airForce: attrs.airForce || 0,
            nuclear: attrs.nuclear || 0,
            diplomacy: attrs.diplomacy || 0,
            stability: attrs.stability || 50,
            faction: countryFactions[countryEn] || countryFactions['default'],
            leader: countryLeaders[countryEn] || { name: 'N/A', title: 'N/A' },
          };
        });

        // 去重：如果中文名相同，只保留一个（取国力高的）
        const uniqueMap = new Map();
        countryList.forEach(c => {
          const key = c.nameZh;
          if (!uniqueMap.has(key) || c.power > uniqueMap.get(key).power) {
            uniqueMap.set(key, c);
          }
        });
        
        const uniqueList = Array.from(uniqueMap.values());

        // 按国力总分排序
        uniqueList.sort((a, b) => b.power - a.power);
        
        // 添加排名
        uniqueList.forEach((c, i) => {
          c.rank = i + 1;
        });

        setCountries(uniqueList);
      } catch (error) {
        console.error('Error fetching country data:', error);
        // 使用默认数据作为后备
        const fallbackList = Object.keys(countryFactions).filter(c => c !== 'default').map((country, index) => {
          const stability = countryStability[country] || 50;
          const faction = countryFactions[country];
          const leader = countryLeaders[country] || { name: 'N/A', title: 'N/A' };
          
          return {
            id: index,
            name: country,
            nameZh: countryNameMap[country] || country,
            flag: countryFlags[countryNameMap[country] || country] || '🏳️',
            power: 50,
            military: 50,
            economic: 50,
            political: 50,
            stability,
            faction,
            leader,
          };
        });
        setCountries(fallbackList);
      }
    };
    
    fetchCountryData();
  }, []);

  // 获取势力颜色
  const getFactionColor = (factionName) => {
    const faction = FACTIONS.find(f => f.name === factionName);
    return faction ? faction.color : '#999';
  };

  // 获取稳定度颜色
  const getStabilityColor = (stability) => {
    if (stability >= 60) return '#4CAF50'; // 绿色 - 稳定
    if (stability >= 40) return '#FFC107'; // 黄色 - 中等
    if (stability >= 20) return '#FF9800'; // 橙色 - 不稳定
    if (stability >= 0) return '#F44336'; // 红色 - 危险
    return '#8B1A1A'; // 深红 - 负数
  };

  // 获取稳定度进度条 CSS 类
  const getStabilityBarClass = (stability) => {
    if (stability >= 60) return 'high';
    if (stability >= 40) return 'medium';
    if (stability >= 0) return 'low';
    return 'negative';
  };

  // 获取稳定度百分比（用于进度条宽度，负数最小显示 4%）
  const getStabilityPercent = (stability) => {
    if (stability < 0) return 4; // 负数显示最小宽度
    if (stability > 100) return 100;
    return stability;
  };

  // 获取稳定度状态文本
  const getStabilityStatus = (stability) => {
    if (stability >= 60) return currentLang === 'zh' ? '稳定' : 'Stable';
    if (stability >= 40) return currentLang === 'zh' ? '中等' : 'Moderate';
    if (stability >= 20) return currentLang === 'zh' ? '不稳定' : 'Unstable';
    return currentLang === 'zh' ? '危险' : 'Critical';
  };



  return (
    <div className="country-panel">
      {/* 子面板 1: 国家列表 */}
      {activeTab === 'countries' && (
        <div className="countries-list">
          <div className="countries-header">
            <div className="col-rank">{currentLang === 'zh' ? '排名' : 'Rank'}</div>
            <div className="col-country">{currentLang === 'zh' ? '国家' : 'Country'}</div>
            <div className="col-power">{currentLang === 'zh' ? '国力' : 'Power'}</div>
            <div className="col-stability">{currentLang === 'zh' ? '稳定度' : 'Stability'}</div>
            <div className="col-faction">{currentLang === 'zh' ? '派系' : 'Faction'}</div>
            <div className="col-leader">{currentLang === 'zh' ? '领导人' : 'Leader'}</div>
          </div>
          <div className="countries-items">
            {countries.map((country) => (
              <div
                key={country.id}
                className="country-item"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCountry(country);
                }}
              >
                <div className="col-rank">#{country.rank}</div>
                <div className="col-country">
                  <span className="country-flag">{country.flag}</span>
                  <span className="country-name">{currentLang === 'zh' ? country.nameZh : country.name}</span>
                </div>
                <div className="col-power">
                  <span className="power-value">{country.power}</span>
                </div>
                <div className="col-stability">
                  <div className="stability-bar-bg">
                    <div
                      className={`stability-bar-fill ${getStabilityBarClass(country.stability)}`}
                      style={{ width: `${getStabilityPercent(country.stability)}%` }}
                    ></div>
                  </div>
                  <span className="stability-value" style={{ color: getStabilityColor(country.stability) }}>
                    {country.stability > 0 ? `${country.stability}%` : `${country.stability}%`}
                  </span>
                </div>
                <div className="col-faction">
                  <span className="faction-badge-small" style={{ background: getFactionColor(country.faction) }}>
                    {currentLang === 'zh' ? country.faction : country.faction}
                  </span>
                </div>
                <div className="col-leader">
                  <span className="leader-name-small">{country.leader.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 子面板 2: 势力对比 */}
      {activeTab === 'factions' && (
        <div className="factions-grid">
          {FACTIONS.map(faction => {
            const factionNameEn = {
              '抵抗轴心': 'Resistance Axis',
              '美以联盟': 'US-Israel Alliance',
              '温和联盟': 'Moderate Alliance',
              '亲穆兄会': 'Muslim Brotherhood',
            }[faction.name];
            const descEn = {
              '抵抗轴心': 'Regional resistance alliance led by Iran',
              '美以联盟': 'Strategic alliance between US and Israel',
              '温和联盟': 'Moderate Arab states alliance in Gulf region',
              '亲穆兄会': 'Political forces supporting Muslim Brotherhood',
            }[faction.name];
            const countriesEn = {
              '抵抗轴心': ['Iran', 'Iraq', 'Syria', 'Lebanon', 'Palestine'],
              '美以联盟': ['USA', 'Israel', 'Jordan'],
              '温和联盟': ['Saudi Arabia', 'Egypt', 'UAE', 'Kuwait', 'Qatar', 'Bahrain', 'Oman', 'Yemen'],
              '亲穆兄会': ['Turkey', 'Qatar'],
            }[faction.name];

            return (
              <div
                key={faction.id}
                className="faction-card"
                data-faction={faction.id}
                style={{ borderLeftColor: faction.color }}
                onClick={() => setSelectedFaction(faction)}
              >
                <div className="faction-card-header">
                  <h3 style={{ color: faction.color }}>{currentLang === 'zh' ? faction.name : factionNameEn}</h3>
                  <div className="faction-strength">
                    <div className="strength-bar">
                      <div
                        className="strength-fill"
                        style={{ width: `${faction.strength}%`, background: faction.color }}
                      ></div>
                    </div>
                    <span className="strength-value">{faction.strength}</span>
                  </div>
                </div>
                <p className="faction-description">{currentLang === 'zh' ? faction.description : descEn}</p>
                <div className="faction-countries">
                  <span className="countries-label">{currentLang === 'zh' ? '控制国家:' : 'Countries:'}</span>
                  <div className="countries-list">{(currentLang === 'zh' ? faction.countries : countriesEn).join(' · ')}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 国家详情弹窗 */}
      {selectedCountry && (
        <div className="country-detail-overlay" onClick={() => setSelectedCountry(null)}>
          <div className="country-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="country-detail-header">
              <div className="country-detail-title">
                <span className="country-detail-flag">{selectedCountry.flag}</span>
                <h3>{currentLang === 'zh' ? selectedCountry.nameZh : selectedCountry.name}</h3>
              </div>
              <button className="country-detail-close" onClick={() => setSelectedCountry(null)}>×</button>
            </div>

            <div className="country-detail-content">
              {/* 基本信息 */}
              <div className="detail-section">
                <h4>{currentLang === 'zh' ? '基本信息' : 'Basic Info'}</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">{currentLang === 'zh' ? '国力排名' : 'Power Rank'}</span>
                    <span className="detail-value">#{selectedCountry.rank}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">{currentLang === 'zh' ? '综合国力' : 'Total Power'}</span>
                    <span className="detail-value power-value">{selectedCountry.power}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">{currentLang === 'zh' ? '所属势力' : 'Faction'}</span>
                    <span className="detail-value faction-badge" style={{ background: getFactionColor(selectedCountry.faction) }}>
                      {currentLang === 'zh' ? selectedCountry.faction : selectedCountry.faction}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">{currentLang === 'zh' ? '稳定度' : 'Stability'}</span>
                    <span className="detail-value" style={{ color: getStabilityColor(selectedCountry.stability) }}>
                      {selectedCountry.stability} ({getStabilityStatus(selectedCountry.stability)})
                    </span>
                  </div>
                </div>
              </div>

              {/* 实力详情 */}
              <div className="detail-section">
                <h4>{currentLang === 'zh' ? '实力详情' : 'Power Details'}</h4>
                <div className="power-bars">
                  {/* 军事细分 */}
                  <div className="power-bar-item">
                    <span className="power-bar-label">⚔️ {currentLang === 'zh' ? '陆军' : 'Army'}</span>
                    <div className="power-bar-bg">
                      <div className="power-bar-fill" style={{ width: `${selectedCountry.army || 0}%`, background: '#f44336' }}></div>
                    </div>
                    <span className="power-bar-value">{selectedCountry.army || 0}</span>
                  </div>
                  <div className="power-bar-item">
                    <span className="power-bar-label">🚢 {currentLang === 'zh' ? '海军' : 'Navy'}</span>
                    <div className="power-bar-bg">
                      <div className="power-bar-fill" style={{ width: `${selectedCountry.navy || 0}%`, background: '#2196F3' }}></div>
                    </div>
                    <span className="power-bar-value">{selectedCountry.navy || 0}</span>
                  </div>
                  <div className="power-bar-item">
                    <span className="power-bar-label">✈️ {currentLang === 'zh' ? '空军' : 'Air Force'}</span>
                    <div className="power-bar-bg">
                      <div className="power-bar-fill" style={{ width: `${selectedCountry.airForce || 0}%`, background: '#03A9F4' }}></div>
                    </div>
                    <span className="power-bar-value">{selectedCountry.airForce || 0}</span>
                  </div>
                  <div className="power-bar-item">
                    <span className="power-bar-label">☢️ {currentLang === 'zh' ? '核武' : 'Nuclear'}</span>
                    <div className="power-bar-bg">
                      <div className="power-bar-fill" style={{ width: `${selectedCountry.nuclear || 0}%`, background: '#9C27B0' }}></div>
                    </div>
                    <span className="power-bar-value">{selectedCountry.nuclear || 0}</span>
                  </div>
                  {/* 经济 */}
                  <div className="power-bar-item">
                    <span className="power-bar-label">💰 {currentLang === 'zh' ? '经济' : 'Economy'}</span>
                    <div className="power-bar-bg">
                      <div className="power-bar-fill" style={{ width: `${selectedCountry.economic}%`, background: '#4CAF50' }}></div>
                    </div>
                    <span className="power-bar-value">{selectedCountry.economic}</span>
                  </div>
                  {/* 政治细分 */}
                  <div className="power-bar-item">
                    <span className="power-bar-label">🏛️ {currentLang === 'zh' ? '稳定度' : 'Stability'}</span>
                    <div className="power-bar-bg">
                      <div className="power-bar-fill" style={{ width: `${selectedCountry.stability}%`, background: '#FFC107' }}></div>
                    </div>
                    <span className="power-bar-value">{selectedCountry.stability}</span>
                  </div>
                  <div className="power-bar-item">
                    <span className="power-bar-label">🤝 {currentLang === 'zh' ? '外交' : 'Diplomacy'}</span>
                    <div className="power-bar-bg">
                      <div className="power-bar-fill" style={{ width: `${selectedCountry.diplomacy || 0}%`, background: '#00BCD4' }}></div>
                    </div>
                    <span className="power-bar-value">{selectedCountry.diplomacy || 0}</span>
                  </div>
                </div>
              </div>

              {/* 领导人 */}
              <div className="detail-section">
                <h4>{currentLang === 'zh' ? '领导人' : 'Leader'}</h4>
                <div className="leader-info">
                  <div className="leader-name">{selectedCountry.leader.name}</div>
                  <div className="leader-title">{selectedCountry.leader.title}</div>
                </div>
              </div>

              {/* 当前状态 */}
              <div className="detail-section">
                <h4>{currentLang === 'zh' ? '当前状态' : 'Current Status'}</h4>
                <div className="status-text">
                  {currentLang === 'zh' 
                    ? countryStatus[selectedCountry.name] || '🕊️ 非活跃区域'
                    : countryStatusEn[selectedCountry.name] || '🕊️ Non-Active Region'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CountryPanel;
