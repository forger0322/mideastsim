// 手绘风格世界地图 - 直接用 SVG 路径绘制大陆轮廓
// 不依赖任何外部数据，像古代地图那样手绘风格

import React, { useState, useRef, useEffect } from 'react';
import './WorldMap.css';

// 手绘大陆路径（简化的经纬度坐标，转换为 SVG 路径）
// 风格：像古代地图那样，不需要精确，只要有神韵
const CONTINENTS = {
  // 亚洲（包含中东）
  asia: {
    name: '亚洲',
    path: 'M 450 180 L 500 160 L 550 150 L 600 140 L 650 150 L 700 160 L 750 180 L 780 200 L 800 230 L 780 260 L 750 280 L 720 300 L 700 320 L 680 340 L 650 350 L 620 360 L 580 370 L 540 380 L 500 390 L 460 400 L 420 410 L 380 400 L 360 380 L 350 350 L 340 320 L 330 290 L 340 260 L 360 230 L 380 200 L 400 180 L 420 170 L 450 180 Z',
    faction: 'mixed',
    center: { x: 550, y: 280 }
  },
  // 欧洲
  europe: {
    name: '欧洲',
    path: 'M 380 140 L 420 130 L 460 120 L 500 110 L 520 120 L 540 130 L 550 140 L 560 150 L 550 160 L 530 170 L 500 180 L 470 190 L 440 200 L 410 210 L 380 220 L 360 210 L 350 190 L 340 170 L 350 150 L 360 140 L 380 140 Z',
    faction: 'mixed',
    center: { x: 450, y: 160 }
  },
  // 非洲
  africa: {
    name: '非洲',
    path: 'M 380 240 L 420 230 L 460 220 L 500 230 L 520 250 L 530 280 L 540 320 L 550 360 L 560 400 L 550 440 L 530 470 L 500 490 L 470 500 L 440 510 L 410 500 L 390 480 L 380 450 L 370 410 L 360 370 L 350 330 L 360 290 L 370 260 L 380 240 Z',
    faction: 'mixed',
    center: { x: 450, y: 360 }
  },
  // 北美洲
  northAmerica: {
    name: '北美洲',
    path: 'M 100 120 L 150 110 L 200 100 L 250 90 L 300 100 L 320 120 L 330 150 L 320 180 L 300 210 L 280 240 L 260 270 L 240 290 L 220 300 L 200 310 L 180 300 L 160 280 L 140 250 L 120 220 L 100 190 L 90 160 L 100 140 L 100 120 Z',
    faction: '美以联盟',
    center: { x: 210, y: 200 }
  },
  // 南美洲
  southAmerica: {
    name: '南美洲',
    path: 'M 220 320 L 260 310 L 300 320 L 320 340 L 330 370 L 340 410 L 350 450 L 360 490 L 350 530 L 330 560 L 300 580 L 270 590 L 250 580 L 240 550 L 230 510 L 220 470 L 210 430 L 200 390 L 210 350 L 220 320 Z',
    faction: '温和联盟',
    center: { x: 280, y: 450 }
  },
  // 大洋洲
  oceania: {
    name: '大洋洲',
    path: 'M 680 420 L 720 410 L 760 400 L 800 410 L 820 430 L 830 460 L 820 490 L 800 510 L 770 520 L 740 530 L 710 520 L 690 500 L 680 470 L 670 440 L 680 420 Z',
    faction: '美以联盟',
    center: { x: 750, y: 460 }
  }
};

// 中东核心国家（手绘矩形区域）
const MIDDLE_EAST_REGIONS = [
  { id: 'IRN', name: '伊朗', faction: '抵抗轴心', x: 620, y: 260, w: 80, h: 60 },
  { id: 'IRQ', name: '伊拉克', faction: '抵抗轴心', x: 560, y: 270, w: 50, h: 50 },
  { id: 'SYR', name: '叙利亚', faction: '抵抗轴心', x: 530, y: 250, w: 35, h: 35 },
  { id: 'LBN', name: '黎巴嫩', faction: '抵抗轴心', x: 515, y: 255, w: 15, h: 20 },
  { id: 'ISR', name: '以色列', faction: '美以联盟', x: 510, y: 280, w: 20, h: 35 },
  { id: 'JOR', name: '约旦', faction: '美以联盟', x: 530, y: 285, w: 30, h: 40 },
  { id: 'SAU', name: '沙特阿拉伯', faction: '温和联盟', x: 560, y: 320, w: 100, h: 90 },
  { id: 'YEM', name: '也门', faction: '温和联盟', x: 540, y: 390, w: 50, h: 40 },
  { id: 'OMN', name: '阿曼', faction: '温和联盟', x: 640, y: 370, w: 45, h: 45 },
  { id: 'ARE', name: '阿联酋', faction: '温和联盟', x: 620, y: 340, w: 35, h: 30 },
  { id: 'QAT', name: '卡塔尔', faction: '温和联盟', x: 600, y: 335, w: 18, h: 15 },
  { id: 'KWT', name: '科威特', faction: '温和联盟', x: 575, y: 305, w: 20, h: 18 },
  { id: 'BHR', name: '巴林', faction: '温和联盟', x: 595, y: 325, w: 10, h: 10 },
  { id: 'EGY', name: '埃及', faction: '温和联盟', x: 480, y: 300, w: 70, h: 70 },
  { id: 'TUR', name: '土耳其', faction: '亲穆兄会', x: 500, y: 210, w: 90, h: 45 },
  { id: 'PSE', name: '巴勒斯坦', faction: '抵抗轴心', x: 515, y: 268, w: 12, h: 20 },
  { id: 'AFG', name: '阿富汗', faction: '其他', x: 660, y: 250, w: 50, h: 45 },
];

// 势力颜色（羊皮纸手绘风格）
const FACTION_COLORS = {
  '抵抗轴心': '#8B1A1A',      // 深红
  '美以联盟': '#1E4F8A',      // 深蓝
  '温和联盟': '#B8860B',      // 金色
  '亲穆兄会': '#2D5A27',      // 深绿
  '其他': '#6B6B6B',          // 灰色
  'mixed': '#8B6B3F',         // 棕色（混合地区）
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

  const handleClick = (country) => {
    setSelectedCountry(country.id);
    if (onRegionSelect) {
      onRegionSelect({
        iso3: country.id,
        name: country.name,
        faction: country.faction,
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
        <defs>
          {/* 羊皮纸纹理滤镜 */}
          <filter id="parchment-texture">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0.2" />
          </filter>
          
          {/* 手绘发光效果 */}
          <filter id="hand-drawn-glow">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
            <feSpecularLighting
              in="blur"
              surfaceScale="2"
              specularConstant="0.6"
              specularExponent="18"
              lightingColor="#d4af37"
            >
              <feDistantLight azimuth="45" elevation="60" />
            </feSpecularLighting>
            <feComposite in="specResult" in2="SourceAlpha" operator="in" />
            <feComposite in="SourceGraphic" in2="specResult" operator="over" />
          </filter>

          {/* 墨迹扩散效果 */}
          <filter id="ink-spread">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1" />
            <feColorMatrix type="matrix" values="
              1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 0.9 0
            " />
          </filter>
        </defs>

        {/* 背景 - 羊皮纸色 */}
        <rect width={width} height={height} fill="#f5e6d3" />
        
        {/* 羊皮纸纹理叠加 */}
        <rect width={width} height={height} fill="url(#parchment-pattern)" opacity="0.3" />
        
        {/* 手绘大陆轮廓 */}
        <g className="continents">
          {Object.entries(CONTINENTS).map(([key, continent]) => (
            <path
              key={key}
              d={continent.path}
              fill={FACTION_COLORS[continent.faction]}
              fillOpacity="0.15"
              stroke="#8B6B3F"
              strokeWidth="2"
              strokeDasharray="5,3"
              style={{
                filter: 'url(#ink-spread)',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </g>

        {/* 中东核心国家（手绘矩形，带圆角） */}
        <g className="middle-east-regions">
          {MIDDLE_EAST_REGIONS.map((country) => {
            const isSelected = selectedCountry === country.id;
            const isHovered = hoveredCountry === country.id;
            const fillColor = FACTION_COLORS[country.faction];
            const rectSize = isSelected ? 1.15 : isHovered ? 1.08 : 1;
            
            return (
              <g 
                key={country.id}
                onClick={() => handleClick(country)}
                onMouseEnter={() => setHoveredCountry(country.id)}
                onMouseLeave={() => setHoveredCountry(null)}
                style={{ cursor: 'pointer', transition: 'transform 0.2s ease' }}
              >
                {/* 国家区域（圆角矩形） */}
                <rect
                  x={country.x - country.w / 2}
                  y={country.y - country.h / 2}
                  width={country.w * rectSize}
                  height={country.h * rectSize}
                  rx="8"
                  ry="8"
                  fill={fillColor}
                  fillOpacity={isSelected ? 0.7 : isHovered ? 0.55 : 0.4}
                  stroke={isSelected ? '#FFD700' : '#8B6B3F'}
                  strokeWidth={isSelected ? 3 : isHovered ? 2 : 1.5}
                  style={{
                    filter: isHovered ? 'url(#hand-drawn-glow)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                />
                
                {/* 国家名称（手写风格） */}
                <text
                  x={country.x}
                  y={country.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={isSelected ? '#FFF' : '#2C2416'}
                  fontSize={isSelected ? 13 : 11}
                  fontWeight={isSelected ? 'bold' : 'normal'}
                  fontFamily="KaiTi, STKaiti, serif"
                  style={{ 
                    pointerEvents: 'none',
                    textShadow: isSelected ? '0 0 3px rgba(0,0,0,0.8)' : 'none',
                  }}
                >
                  {country.name}
                </text>
                
                {/* 选中时的装饰圈 */}
                {isSelected && (
                  <circle
                    cx={country.x}
                    cy={country.y}
                    r={Math.max(country.w, country.h) * 0.7}
                    fill="none"
                    stroke="#FFD700"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    opacity="0.8"
                    style={{ animation: 'rotate 20s linear infinite' }}
                  />
                )}
              </g>
            );
          })}
        </g>

        {/* 装饰性罗盘 */}
        <g transform={`translate(${width - 80}, ${height - 80})`}>
          <circle cx="0" cy="0" r="50" fill="#d4af37" fillOpacity="0.2" stroke="#8B6B3F" strokeWidth="2" />
          <circle cx="0" cy="0" r="40" fill="none" stroke="#8B6B3F" strokeWidth="1" strokeDasharray="2,2" />
          <text x="0" y="-20" textAnchor="middle" fill="#8B6B3F" fontSize="14" fontFamily="KaiTi, serif">北</text>
          <text x="0" y="25" textAnchor="middle" fill="#8B6B3F" fontSize="14" fontFamily="KaiTi, serif">南</text>
          <text x="-25" y="5" textAnchor="middle" fill="#8B6B3F" fontSize="14" fontFamily="KaiTi, serif">西</text>
          <text x="25" y="5" textAnchor="middle" fill="#8B6B3F" fontSize="14" fontFamily="KaiTi, serif">东</text>
          <polygon points="0,-10 5,5 0,3 -5,5" fill="#8B1A1A" />
        </g>

        {/* 装饰性帆船 */}
        <g transform={`translate(150, 450)`} opacity="0.6">
          <path d="M 0 20 L 10 5 L 20 20 Z" fill="#8B6B3F" />
          <rect x="8" y="20" width="4" height="15" fill="#5D4037" />
        </g>

        {/* 经纬线网格（手绘风格） */}
        <g className="grid-lines" stroke="#8B6B3F" strokeWidth="0.5" opacity="0.2">
          {/* 纬线 */}
          {[100, 200, 300, 400, 500].map(y => (
            <line key={`lat-${y}`} x1="0" y1={y} x2={width} y2={y} strokeDasharray="10,5" />
          ))}
          {/* 经线 */}
          {[100, 250, 400, 550, 700, 850].map(x => (
            <line key={`lon-${x}`} x1={x} y1="0" x2={x} y2={height} strokeDasharray="10,5" />
          ))}
        </g>
      </svg>
      
      {/* 图例 */}
      <div className="map-legend">
        <div className="legend-title">📜 势力图例</div>
        <div className="legend-items">
          {Object.entries(FACTION_COLORS).filter(([k]) => k !== 'mixed').map(([faction, color]) => (
            <div key={faction} className="legend-item">
              <div className="legend-color" style={{ backgroundColor: color }}></div>
              <span className="legend-text">{faction}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CSS 动画 */}
      <style>{`
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default WorldMap;
