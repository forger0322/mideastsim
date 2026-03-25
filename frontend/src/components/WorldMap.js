// 简化的中东地图 - 使用基本几何图形表示国家
// 避免依赖外部 GeoJSON 加载

import React, { useState, useRef, useEffect } from 'react';
import './WorldMap.css';

// 中东国家简化的多边形数据（经纬度坐标）
const MIDDLE_EAST_COUNTRIES = {
  IRN: { 
    name: '伊朗', 
    faction: '抵抗轴心',
    coords: [[44,30],[48,26],[56,25],[60,30],[62,35],[60,40],[55,45],[50,45],[45,40],[44,30]]
  },
  IRQ: { 
    name: '伊拉克', 
    faction: '抵抗轴心',
    coords: [[39,33],[42,30],[45,30],[48,33],[48,37],[44,40],[40,38],[39,33]]
  },
  SYR: { 
    name: '叙利亚', 
    faction: '抵抗轴心',
    coords: [[36,32],[38,32],[42,33],[42,37],[40,38],[36,36],[36,32]]
  },
  LBN: { 
    name: '黎巴嫩', 
    faction: '抵抗轴心',
    coords: [[35.5,33],[36,33],[36,34.5],[35.5,34.5],[35.5,33]]
  },
  ISR: { 
    name: '以色列', 
    faction: '美以联盟',
    coords: [[34.5,29.5],[35,29.5],[35.5,30],[35.5,33],[34.5,33],[34.5,29.5]]
  },
  JOR: { 
    name: '约旦', 
    faction: '美以联盟',
    coords: [[35,29.5],[37,29],[39,32],[38,33],[36,33],[35,33],[35,29.5]]
  },
  SAU: { 
    name: '沙特阿拉伯', 
    faction: '温和联盟',
    coords: [[35,22],[40,18],[48,18],[55,22],[55,26],[50,30],[45,30],[40,26],[35,22]]
  },
  YEM: { 
    name: '也门', 
    faction: '温和联盟',
    coords: [[43,13],[48,13],[53,16],[53,18],[48,18],[43,16],[43,13]]
  },
  OMN: { 
    name: '阿曼', 
    faction: '温和联盟',
    coords: [[52,18],[56,18],[59,22],[56,24],[54,24],[52,22],[52,18]]
  },
  ARE: { 
    name: '阿联酋', 
    faction: '温和联盟',
    coords: [[51.5,22],[55,22],[56,24],[54,24],[51.5,22]]
  },
  QAT: { 
    name: '卡塔尔', 
    faction: '温和联盟',
    coords: [[51,24],[52,24],[52,26],[51,26],[51,24]]
  },
  KWT: { 
    name: '科威特', 
    faction: '温和联盟',
    coords: [[47.5,28.5],[49,28.5],[49,30],[47.5,30],[47.5,28.5]]
  },
  BHR: { 
    name: '巴林', 
    faction: '温和联盟',
    coords: [[50.5,26],[51,26],[51,26.5],[50.5,26.5],[50.5,26]]
  },
  EGY: { 
    name: '埃及', 
    faction: '温和联盟',
    coords: [[25,22],[30,22],[35,22],[35,30],[34,31],[32,31],[25,28],[25,22]]
  },
  TUR: { 
    name: '土耳其', 
    faction: '亲穆兄会',
    coords: [[27,36],[30,36],[35,36],[40,37],[45,39],[45,42],[40,42],[35,40],[30,40],[27,38],[27,36]]
  },
  PSE: { 
    name: '巴勒斯坦', 
    faction: '抵抗轴心',
    coords: [[35,31.5],[35.5,31.5],[35.5,32.5],[35,32.5],[35,31.5]]
  },
  AFG: { 
    name: '阿富汗', 
    faction: '其他',
    coords: [[60,30],[65,30],[70,32],[75,35],[75,38],[70,38],[65,36],[60,34],[60,30]]
  },
};

// 势力颜色
const FACTION_COLORS = {
  '抵抗轴心': '#8B1A1A',
  '美以联盟': '#1E4F8A',
  '温和联盟': '#B8860B',
  '亲穆兄会': '#2D5A27',
  '其他': '#6B6B6B',
};

// 将经纬度转换为 SVG 坐标
const project = (coords, width, height) => {
  const lonMin = 25, lonMax = 75;
  const latMin = 12, latMax = 45;
  
  const scaleX = width / (lonMax - lonMin);
  const scaleY = height / (latMax - latMin);
  
  return coords.map(([lon, lat]) => [
    (lon - lonMin) * scaleX,
    height - (lat - latMin) * scaleY
  ]);
};

const WorldMap = ({ onRegionSelect, onResetRef }) => {
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const svgRef = useRef(null);

  // 导出重置函数
  useEffect(() => {
    if (onResetRef) {
      onResetRef.current = () => {
        setSelectedCountry(null);
        setHoveredCountry(null);
      };
    }
  }, [onResetRef]);

  const handleClick = (iso3, name) => {
    setSelectedCountry(iso3);
    if (onRegionSelect) {
      onRegionSelect({
        iso3,
        name,
        faction: MIDDLE_EAST_COUNTRIES[iso3]?.faction || '其他',
      });
    }
  };

  const width = 900;
  const height = 620;

  return (
    <div className="world-map-container" style={{ width: '100%', height: '100%' }}>
      <svg 
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="world-map"
        style={{ width: '100%', height: '100%' }}
      >
        {/* 背景 - 羊皮纸色 */}
        <rect width={width} height={height} fill="transparent" />
        
        {/* 绘制国家 */}
        {Object.entries(MIDDLE_EAST_COUNTRIES).map(([iso3, country]) => {
          const points = project(country.coords, width, height);
          const pathData = points.map(([x, y], i) => 
            (i === 0 ? 'M' : 'L') + `${x.toFixed(1)} ${y.toFixed(1)}`
          ).join(' ') + ' Z';
          
          const isSelected = selectedCountry === iso3;
          const isHovered = hoveredCountry === iso3;
          const fillColor = FACTION_COLORS[country.faction] || '#6B6B6B';
          
          return (
            <g key={iso3}>
              <path
                d={pathData}
                fill={fillColor}
                fillOpacity={isSelected ? 0.9 : isHovered ? 0.8 : 0.6}
                stroke={isSelected ? '#FFD700' : '#8B6B3F'}
                strokeWidth={isSelected ? 3 : isHovered ? 2 : 1}
                style={{ 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  filter: isHovered ? 'url(#aged-glow)' : 'none'
                }}
                onClick={() => handleClick(iso3, country.name)}
                onMouseEnter={() => setHoveredCountry(iso3)}
                onMouseLeave={() => setHoveredCountry(null)}
              />
              {isSelected && (
                <text
                  x={points.reduce((sum, [x]) => sum + x, 0) / points.length}
                  y={points.reduce((sum, [, y]) => sum + y, 0) / points.length}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#FFF"
                  fontSize="12"
                  fontWeight="bold"
                  style={{ pointerEvents: 'none' }}
                >
                  {country.name}
                </text>
              )}
            </g>
          );
        })}
        
        {/* SVG 滤镜定义 */}
        <defs>
          <filter id="aged-glow">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
            <feSpecularLighting
              in="blur"
              surfaceScale="2"
              specularConstant="0.8"
              specularExponent="20"
              lightingColor="#d4af37"
            >
              <feDistantLight azimuth="45" elevation="55" />
            </feSpecularLighting>
            <feComposite in="specResult" in2="SourceAlpha" operator="in" />
            <feComposite in="SourceGraphic" in2="specResult" operator="over" />
          </filter>
        </defs>
      </svg>
      
      {/* 图例 */}
      <div className="map-legend">
        <div className="legend-title">📜 势力图例</div>
        <div className="legend-items">
          {Object.entries(FACTION_COLORS).map(([faction, color]) => (
            <div key={faction} className="legend-item">
              <div className="legend-color" style={{ backgroundColor: color }}></div>
              <span className="legend-text">{faction}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WorldMap;
