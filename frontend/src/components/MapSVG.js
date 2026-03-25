import React, { useState, useRef } from 'react';
import './MapSVG.css';

// 简化的中东国家 SVG 路径（手绘风格近似）
const COUNTRY_PATHS = {
  // 伊朗
  IRN: {
    name: '伊朗',
    path: 'M 580 180 L 620 170 L 680 180 L 720 200 L 740 240 L 730 280 L 700 300 L 660 310 L 620 300 L 600 280 L 570 260 L 560 220 Z',
    faction: '抵抗轴心',
    center: { x: 650, y: 240 }
  },
  // 伊拉克
  IRQ: {
    name: '伊拉克',
    path: 'M 520 240 L 560 230 L 580 250 L 570 280 L 550 300 L 520 290 L 510 270 Z',
    faction: '抵抗轴心',
    center: { x: 545, y: 265 }
  },
  // 叙利亚
  SYR: {
    name: '叙利亚',
    path: 'M 460 220 L 500 215 L 520 230 L 510 250 L 480 255 L 460 240 Z',
    faction: '抵抗轴心',
    center: { x: 490, y: 235 }
  },
  // 黎巴嫩
  LBN: {
    name: '黎巴嫩',
    path: 'M 450 235 L 460 235 L 458 245 L 448 243 Z',
    faction: '抵抗轴心',
    center: { x: 454, y: 240 }
  },
  // 以色列/巴勒斯坦
  ISR: {
    name: '以色列',
    path: 'M 445 250 L 460 250 L 458 270 L 445 268 Z',
    faction: '美以联盟',
    center: { x: 452, y: 260 }
  },
  // 约旦
  JOR: {
    name: '约旦',
    path: 'M 460 255 L 490 255 L 495 285 L 475 295 L 460 280 Z',
    faction: '美以联盟',
    center: { x: 476, y: 274 }
  },
  // 沙特阿拉伯
  SAU: {
    name: '沙特阿拉伯',
    path: 'M 470 300 L 540 295 L 580 310 L 600 350 L 590 400 L 550 420 L 500 410 L 470 380 L 465 340 Z',
    faction: '温和联盟',
    center: { x: 530, y: 355 }
  },
  // 也门
  YEM: {
    name: '也门',
    path: 'M 480 420 L 540 420 L 550 440 L 530 455 L 490 450 Z',
    faction: '温和联盟',
    center: { x: 515, y: 435 }
  },
  // 阿曼
  OMN: {
    name: '阿曼',
    path: 'M 590 400 L 640 400 L 650 430 L 630 450 L 600 440 Z',
    faction: '温和联盟',
    center: { x: 620, y: 425 }
  },
  // 阿联酋
  ARE: {
    name: '阿联酋',
    path: 'M 580 380 L 620 380 L 625 400 L 595 400 Z',
    faction: '温和联盟',
    center: { x: 605, y: 390 }
  },
  // 卡塔尔
  QAT: {
    name: '卡塔尔',
    path: 'M 565 375 L 575 375 L 573 385 L 563 383 Z',
    faction: '温和联盟',
    center: { x: 569, y: 380 }
  },
  // 科威特
  KWT: {
    name: '科威特',
    path: 'M 555 285 L 570 285 L 568 295 L 553 293 Z',
    faction: '温和联盟',
    center: { x: 562, y: 290 }
  },
  // 土耳其
  TUR: {
    name: '土耳其',
    path: 'M 380 160 L 480 155 L 520 170 L 510 195 L 460 200 L 400 195 L 370 180 Z',
    faction: '亲穆兄会',
    center: { x: 445, y: 180 }
  },
  // 埃及
  EGY: {
    name: '埃及',
    path: 'M 380 260 L 440 260 L 450 300 L 440 340 L 400 350 L 370 320 L 365 280 Z',
    faction: '温和联盟',
    center: { x: 410, y: 305 }
  },
  // 阿富汗
  AFG: {
    name: '阿富汗',
    path: 'M 680 200 L 740 200 L 760 240 L 740 270 L 700 260 L 685 230 Z',
    faction: '其他',
    center: { x: 720, y: 235 }
  },
};

// 势力颜色（半透明，透出羊皮纸底）
const FACTION_COLORS = {
  '抵抗轴心': 'rgba(139, 26, 26, 0.5)',
  '美以联盟': 'rgba(30, 79, 138, 0.5)',
  '温和联盟': 'rgba(184, 134, 11, 0.4)',
  '亲穆兄会': 'rgba(45, 90, 39, 0.5)',
  '其他': 'rgba(128, 128, 128, 0.3)',
};

// 手绘风格边界颜色
const BORDER_COLORS = {
  '抵抗轴心': '#5a1a1a',
  '美以联盟': '#1a3a5a',
  '温和联盟': '#5a4a1a',
  '亲穆兄会': '#1a3a1a',
  '其他': '#4a4a4a',
};

const MapSVG = ({ onRegionSelect, onResetRef }) => {
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const svgRef = useRef(null);

  // 导出重置函数
  React.useEffect(() => {
    if (onResetRef) {
      onResetRef.current = () => {
        setSelectedCountry(null);
        setHoveredCountry(null);
      };
    }
  }, [onResetRef]);

  const handleClick = (countryCode, country) => {
    setSelectedCountry(countryCode);
    if (onRegionSelect) {
      onRegionSelect({
        iso3: countryCode,
        name: country.name,
        faction: country.faction,
      });
    }
  };

  return (
    <div className="map-svg-container">
      <svg
        ref={svgRef}
        viewBox="0 0 900 620"
        className="map-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* 定义手绘风格滤镜 */}
        <defs>
          {/* 羊皮纸纹理 */}
          <filter id="parchment-texture">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise" />
            <feDiffuseLighting in="noise" lightingColor="#f5e6d3" surfaceScale="1.5">
              <feDistantLight azimuth="45" elevation="60" />
            </feDiffuseLighting>
            <feColorMatrix type="saturate" values="0.3" />
          </filter>

          {/* 手绘风格边界 - 轻微抖动 */}
          <filter id="hand-drawn">
            <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="2" result="displacement" />
            <feDisplacementMap in="SourceGraphic" in2="displacement" scale="2" xChannelSelector="R" yChannelSelector="G" />
          </filter>

          {/* 做旧边缘 */}
          <filter id="aged-edge">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
            <feSpecularLighting in="blur" surfaceScale="2" specularConstant="0.8" specularExponent="20" lightingColor="#8b5a2b">
              <feDistantLight azimuth="45" elevation="55" />
            </feSpecularLighting>
            <feComposite in="specResult" in2="SourceAlpha" operator="in" result="specResult" />
            <feComposite in="SourceGraphic" in2="specResult" operator="over" />
          </filter>

          {/* 渐变 - 羊皮纸底色 */}
          <radialGradient id="parchment-gradient" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#f5e6d3" />
            <stop offset="100%" stopColor="#dcc294" />
          </radialGradient>

          {/* 阴影 */}
          <filter id="drop-shadow">
            <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* 底图 - 羊皮纸背景 */}
        <rect width="900" height="620" fill="url(#parchment-gradient)" />
        
        {/* 羊皮纸纹理叠加 */}
        <rect width="900" height="620" fill="rgba(139, 90, 43, 0.05)" filter="url(#parchment-texture)" />

        {/* 网格线 - 经纬线风格 */}
        <g className="grid-lines" stroke="rgba(139, 90, 43, 0.15)" strokeWidth="1">
          {Array.from({ length: 10 }, (_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 62} x2="900" y2={i * 62} strokeDasharray="5,5" />
          ))}
          {Array.from({ length: 15 }, (_, i) => (
            <line key={`v${i}`} x1={i * 60} y1="0" x2={i * 60} y2="620" strokeDasharray="5,5" />
          ))}
        </g>

        {/* 国家组 */}
        <g className="countries" filter="url(#hand-drawn)">
          {Object.entries(COUNTRY_PATHS).map(([code, country]) => {
            const isSelected = selectedCountry === code;
            const isHovered = hoveredCountry === code;
            const fillColor = FACTION_COLORS[country.faction] || FACTION_COLORS['其他'];
            const strokeColor = BORDER_COLORS[country.faction] || BORDER_COLORS['其他'];

            return (
              <g
                key={code}
                className={`country-group ${isSelected ? 'selected' : ''}`}
                onClick={() => handleClick(code, country)}
                onMouseEnter={() => setHoveredCountry(code)}
                onMouseLeave={() => setHoveredCountry(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* 国家区域 */}
                <path
                  d={country.path}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  className="country-path"
                  filter="url(#aged-edge)"
                />
                
                {/* 悬停高亮 */}
                {isHovered && (
                  <path
                    d={country.path}
                    fill="none"
                    stroke="rgba(255, 215, 0, 0.6)"
                    strokeWidth="3"
                    strokeDasharray="5,3"
                    className="hover-highlight"
                  />
                )}

                {/* 国家名称标注 */}
                <text
                  x={country.center.x}
                  y={country.center.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="country-label"
                  style={{
                    fontSize: isSelected || isHovered ? '13px' : '11px',
                    fontWeight: isSelected ? 'bold' : 'normal',
                  }}
                >
                  {country.name}
                </text>
              </g>
            );
          })}
        </g>

        {/* 装饰元素 - 罗盘 */}
        <g className="compass" transform="translate(820, 540)">
          <circle cx="0" cy="0" r="35" fill="rgba(139, 90, 43, 0.2)" stroke="#8b5a2b" strokeWidth="2" />
          <circle cx="0" cy="0" r="28" fill="none" stroke="#d4af37" strokeWidth="1" />
          <polygon points="0,-20 5,-5 0,5 -5,-5" fill="#8b1a1a" />
          <polygon points="0,20 5,5 0,-5 -5,5" fill="#1e4f8a" />
          <polygon points="-20,0 -5,-5 5,-5 20,0" fill="#b8860b" />
          <polygon points="20,0 5,5 -5,5 -20,0" fill="#2d5a27" />
          <text x="0" y="-28" textAnchor="middle" fontSize="10" fill="#4a331c" fontFamily="KaiTi">北</text>
        </g>

        {/* 装饰 - 海陆波浪纹 */}
        <g className="wave-decoration" stroke="rgba(139, 90, 43, 0.2)" strokeWidth="1" fill="none">
          <path d="M 50 550 Q 80 545, 110 550 T 170 550" />
          <path d="M 50 565 Q 80 560, 110 565 T 170 565" />
        </g>
      </svg>

      {/* 选中提示 */}
      {selectedCountry && (
        <div className="selection-indicator">
          <span className="indicator-icon">📍</span>
          <span className="indicator-text">{COUNTRY_PATHS[selectedCountry]?.name}</span>
        </div>
      )}
    </div>
  );
};

export default MapSVG;
