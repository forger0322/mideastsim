import React, { useEffect, useRef } from 'react';
import './GameMap.css';

// 从 map-demo 复制的完整配置
const COUNTRY_DEFS = [
  { iso3: 'USA', name: '美国' },
  { iso3: 'CHN', name: '中国' },
  { iso3: 'TUR', name: '土耳其' },
  { iso3: 'SYR', name: '叙利亚' },
  { iso3: 'IRQ', name: '伊拉克' },
  { iso3: 'IRN', name: '伊朗' },
  { iso3: 'SAU', name: '沙特阿拉伯' },
  { iso3: 'JOR', name: '约旦' },
  { iso3: 'ISR', name: '以色列' },
  { iso3: 'LBN', name: '黎巴嫩' },
  { iso3: 'EGY', name: '埃及' },
  { iso3: 'YEM', name: '也门' },
  { iso3: 'OMN', name: '阿曼' },
  { iso3: 'KWT', name: '科威特' },
  { iso3: 'QAT', name: '卡塔尔' },
  { iso3: 'ARE', name: '阿联酋' },
  { iso3: 'BHR', name: '巴林' },
  { iso3: 'PSE', name: '巴勒斯坦' },
  { iso3: 'AFG', name: '阿富汗' },
  { iso3: 'ARM', name: '亚美尼亚' },
  { iso3: 'AZE', name: '阿塞拜疆' },
  { iso3: 'GEO', name: '格鲁吉亚' },
];

// 势力颜色映射（保持我们原有的颜色方案）
const FACTION_COLORS = {
  '抵抗轴心': '#8B1A1A',
  '美以联盟': '#1E4F8A', 
  '温和联盟': '#B8860B',
  '亲穆兄会': '#2D5A27'
};

// 国家到势力的映射
const COUNTRY_TO_FACTION = {
  '伊朗': '抵抗轴心',
  '伊拉克': '抵抗轴心', 
  '叙利亚': '抵抗轴心',
  '以色列': '美以联盟',
  '约旦': '美以联盟',
  '沙特阿拉伯': '温和联盟',
  '埃及': '温和联盟',
  '土耳其': '亲穆兄会',
  // 其他国家保持各自的颜色
  '美国': '美以联盟',
  '中国': '其他',
  '黎巴嫩': '抵抗轴心',
  '也门': '温和联盟',
  '阿曼': '温和联盟',
  '科威特': '温和联盟',
  '卡塔尔': '温和联盟',
  '阿联酋': '温和联盟',
  '巴林': '温和联盟',
  '巴勒斯坦': '抵抗轴心',
  '阿富汗': '其他',
  '亚美尼亚': '其他',
  '阿塞拜疆': '其他',
  '格鲁吉亚': '其他'
};

const COLORS = {
  water: '#2B4F5C',
  border: '#3A2C1A',
  label: '#F0E6D2',
  labelStroke: '#000000',
  unopened: '#7B7B7B',
  unopenedBorder: '#4D4D4D',
};

// 配色方案（从 map-demo 复制）
const UNIQUE_PALETTE = [
  '#8B1A1A', '#1E4F8A', '#B8860B', '#2D5A27',
  '#8C3FAE', '#E67E22', '#1FA187', '#D35454',
  '#3C9FD6', '#AF7AC5', '#F39C12', '#58D68D',
  '#7DCEA0', '#D8694E', '#5DADE2', '#C0392B',
  '#2E86C1', '#CA6F1E', '#884EA0', '#27AE60',
  '#9B59B6', '#16A085',
];

const CanvasGameMap = ({ onRegionSelect, onResetRef }) => {
  const canvasRef = useRef(null);
  const countriesRef = useRef([]);
  const unopenedCountriesRef = useRef([]);
  const selectedCountryIdRef = useRef(null);
  const loadingRef = useRef(true);
  
  // 导出重置函数给父组件
  useEffect(() => {
    if (onResetRef) {
      onResetRef.current = resetViewToMiddleEast;
    }
  }, [onResetRef]);

  // 视图状态
  const viewRef = useRef({
    scale: 1,
    minScale: 0.75,
    maxScale: 2, // 允许放大到2倍，但保持在合理范围内
    offsetX: 0,
    offsetY: 0,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    moved: false,
  });

  // 复制 map-demo 的所有核心函数
  const drawParchmentBackground = (ctx, width, height) => {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#eadab8');
    gradient.addColorStop(0.52, '#dcc294');
    gradient.addColorStop(1, '#caa774');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(116, 81, 43, 0.48)';
    ctx.lineWidth = 8;
    ctx.strokeRect(9, 9, width - 18, height - 18);
  };

  const normalizeToPolygons = (geometry) => {
    if (geometry.type === 'Polygon') {
      return [geometry.coordinates];
    }
    if (geometry.type === 'MultiPolygon') {
      return geometry.coordinates;
    }
    return [];
  };

  const mercatorProject = (lon, lat) => {
    const lonRad = (lon * Math.PI) / 180;
    const safeLat = Math.max(-85, Math.min(85, lat));
    const latRad = (safeLat * Math.PI) / 180;
    return [lonRad, Math.log(Math.tan(Math.PI / 4 + latRad / 2))];
  };

  const buildProjection = (features, canvasWidth, canvasHeight) => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    features.forEach((feature) => {
      normalizeToPolygons(feature.geometry).forEach((polygon) => {
        polygon.forEach((ring) => {
          ring.forEach(([lon, lat]) => {
            const [x, y] = mercatorProject(lon, lat);
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          });
        });
      });
    });

    const PAD = 24;
    const availableW = canvasWidth - PAD * 2;
    const availableH = canvasHeight - PAD * 2;
    const scaleX = availableW / (maxX - minX);
    const scaleY = availableH / (maxY - minY);
    const scale = Math.min(scaleX, scaleY);

    const projectedW = (maxX - minX) * scale;
    const projectedH = (maxY - minY) * scale;
    const offsetX = (canvasWidth - projectedW) / 2;
    const offsetY = (canvasHeight - projectedH) / 2;

    return {
      project(lon, lat) {
        const [x, y] = mercatorProject(lon, lat);
        return [offsetX + (x - minX) * scale, offsetY + (maxY - y) * scale];
      },
    };
  };

  const buildPath = (polygons) => {
    const path = new Path2D();
    polygons.forEach((polygon) => {
      polygon.forEach((ring) => {
        ring.forEach(([x, y], index) => {
          if (index === 0) {
            path.moveTo(x, y);
          } else {
            path.lineTo(x, y);
          }
        });
        path.closePath();
      });
    });
    return path;
  };

  const ringArea = (points) => {
    if (!points || points.length < 3) {
      return 0;
    }

    let area = 0;
    for (let i = 0; i < points.length; i += 1) {
      const [x0, y0] = points[i];
      const [x1, y1] = points[(i + 1) % points.length];
      area += x0 * y1 - x1 * y0;
    }

    return Math.abs(area) * 0.5;
  };

  const simplifyCountryPolygons = (polygons) => {
    if (!polygons.length) {
      return polygons;
    }

    const withArea = polygons.map((polygon) => ({
      polygon,
      area: ringArea(polygon[0] || []),
    }));

    const maxArea = withArea.reduce((max, item) => Math.max(max, item.area), 0);
    const relativeThreshold = maxArea * 0.06;
    const absoluteThreshold = 260;

    const filtered = withArea
      .filter((item) => item.area >= relativeThreshold && item.area >= absoluteThreshold)
      .map((item) => item.polygon);

    if (filtered.length > 0) {
      return filtered;
    }

    const largest = withArea.sort((a, b) => b.area - a.area)[0];
    return largest ? [largest.polygon] : polygons;
  };

  const polygonCenter = (points) => {
    let sumX = 0;
    let sumY = 0;
    points.forEach(([x, y]) => {
      sumX += x;
      sumY += y;
    });
    return {
      x: points.length ? sumX / points.length : 0,
      y: points.length ? sumY / points.length : 0,
    };
  };

  const getBoundingBox = (points) => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    points.forEach(([x, y]) => {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });

    return { minX, minY, maxX, maxY };
  };

  const samplePoints = (points, step = 8) => {
    const sampled = [];
    for (let index = 0; index < points.length; index += step) {
      sampled.push(points[index]);
    }
    if (sampled.length === 0 && points.length) {
      sampled.push(points[0]);
    }
    return sampled;
  };

  const buildCountryObject = (feature, projection, index) => {
    const iso3 = feature.properties['ISO3166-1-Alpha-3'];
    const def = COUNTRY_DEFS.find((item) => item.iso3 === iso3);

    const projectedPolygons = normalizeToPolygons(feature.geometry).map((polygon) =>
      polygon.map((ring) => ring.map(([lon, lat]) => projection.project(lon, lat)))
    );

    const simplifiedPolygons = simplifyCountryPolygons(projectedPolygons);
    const path = buildPath(simplifiedPolygons);
    const mainRing = simplifiedPolygons[0]?.[0] || [];

    // 获取势力颜色
    const countryName = def ? def.name : (feature.properties.name || iso3);
    const faction = COUNTRY_TO_FACTION[countryName] || '其他';
    const baseColor = faction !== '其他' ? FACTION_COLORS[faction] : UNIQUE_PALETTE[index % UNIQUE_PALETTE.length];

    return {
      id: iso3,
      iso3,
      name: countryName,
      baseColor,
      faction,
      path,
      center: polygonCenter(mainRing),
      bbox: getBoundingBox(mainRing),
      sample: samplePoints(mainRing),
    };
  };

  const buildUnopenedObject = (feature, projection) => {
    const projectedPolygons = normalizeToPolygons(feature.geometry).map((polygon) =>
      polygon.map((ring) => ring.map(([lon, lat]) => projection.project(lon, lat)))
    );
    return {
      id: feature.properties['ISO3166-1-Alpha-3'] || feature.properties.name,
      path: buildPath(simplifyCountryPolygons(projectedPolygons)),
    };
  };

  const getCountryById = (id) => {
    return countriesRef.current.find((country) => country.id === id) || null;
  };

  const applyViewTransform = (ctx) => {
    const view = viewRef.current;
    ctx.translate(view.offsetX, view.offsetY);
    ctx.scale(view.scale, view.scale);
  };

  const screenToWorld = (screenX, screenY) => {
    const view = viewRef.current;
    return {
      x: (screenX - view.offsetX) / view.scale,
      y: (screenY - view.offsetY) / view.scale,
    };
  };

  const worldToScreen = (worldX, worldY) => {
    const view = viewRef.current;
    return {
      x: worldX * view.scale + view.offsetX,
      y: worldY * view.scale + view.offsetY,
    };
  };

  const zoomAt = (screenX, screenY, factor) => {
    const view = viewRef.current;
    
    // 计算鼠标位置在缩放前对应的世界坐标
    const worldX = (screenX - view.offsetX) / view.scale;
    const worldY = (screenY - view.offsetY) / view.scale;
    
    // 应用新的缩放
    const nextScale = Math.max(view.minScale, Math.min(view.maxScale, view.scale * factor));
    view.scale = nextScale;
    
    // 调整偏移量，使得鼠标位置在缩放后仍然对应同一个世界坐标
    // 这样鼠标下的地点就会保持在鼠标位置，实现"以鼠标为中心"的缩放
    view.offsetX = screenX - worldX * view.scale;
    view.offsetY = screenY - worldY * view.scale;
  };

  const resetViewToMiddleEast = () => {
    const view = viewRef.current;
    const canvas = canvasRef.current;
    
    // 设置合适的缩放范围和初始值
    view.minScale = 0.3;
    view.maxScale = 4.0;
    view.scale = 2.0; // 放大初始视图，聚焦中东
    
    // 初始偏移，让中东地区精确居中
    if (canvas) {
      view.offsetX = -canvas.width * 0.1;
      view.offsetY = -canvas.height * 0.05;
    } else {
      view.offsetX = 0;
      view.offsetY = 0;
    }
    
    view.dragging = false;
    view.moved = false;
    selectedCountryIdRef.current = null;
    drawMap();
  };

  const drawLabelsAndCities = (ctx, canvasWidth, canvasHeight) => {
    const view = viewRef.current;
    
    countriesRef.current.forEach((country) => {
      const center = worldToScreen(country.center.x, country.center.y);
      
      // 只在可见区域内绘制标签
      if (center.x < -120 || center.x > canvasWidth + 120 || center.y < -60 || center.y > canvasHeight + 60) {
        return;
      }

      ctx.save();
      
      // 字体大小随缩放调整，避免放大后糊在一起
      const baseFontSize = country.iso3 === 'QAT' || country.iso3 === 'BHR' || country.iso3 === 'LBN' || country.iso3 === 'ISR' || country.iso3 === 'PSE' || country.iso3 === 'KWT' ? 12 : 16;
      const scaledFontSize = Math.max(10, baseFontSize * view.scale);
      ctx.font = `bold ${scaledFontSize}px "STKaiti", "KaiTi", "LiSu", serif`;
      
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = COLORS.labelStroke;
      ctx.lineWidth = Math.max(2, 3 * view.scale);
      ctx.strokeText(country.name, center.x, center.y);
      ctx.fillStyle = COLORS.label;
      ctx.fillText(country.name, center.x, center.y);
      
      ctx.restore();
    });
  };

  const getLabelFont = (iso3) => {
    const tiny = new Set(['QAT', 'BHR', 'LBN', 'ISR', 'PSE', 'KWT']);
    return tiny.has(iso3)
      ? 'bold 12px "STKaiti", "KaiTi", "LiSu", serif'
      : 'bold 16px "STKaiti", "KaiTi", "LiSu", serif';
  };

  const drawDynamicBorders = (ctx, canvasWidth, canvasHeight) => {
    const view = viewRef.current;
    
    ctx.save();
    applyViewTransform(ctx);
    
    ctx.strokeStyle = 'rgba(58, 44, 26, 0.85)';
    ctx.lineWidth = 2.8 / view.scale;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    countriesRef.current.forEach((country) => {
      ctx.stroke(country.path);
    });
    
    ctx.restore();
  };

  const drawMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    if (loadingRef.current) {
      drawParchmentBackground(ctx, width, height);
      ctx.fillStyle = COLORS.water;
      ctx.fillRect(18, 18, width - 36, height - 36);
      
      // 移除了标题文字，只显示加载提示
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f3ead7';
      ctx.font = 'bold 24px serif';
      ctx.fillText('加载地图中...', width / 2, height / 2 - 10);
      return;
    }

    drawParchmentBackground(ctx, width, height);

    ctx.fillStyle = COLORS.water;
    ctx.fillRect(18, 18, width - 36, height - 36);

    // 绘制未开放区域
    ctx.save();
    applyViewTransform(ctx);
    
    unopenedCountriesRef.current.forEach((country) => {
      ctx.fillStyle = COLORS.unopened;
      ctx.fill(country.path, 'evenodd');
    });

    ctx.strokeStyle = COLORS.unopenedBorder;
    ctx.lineWidth = 0.6 / viewRef.current.scale;
    unopenedCountriesRef.current.forEach((country) => {
      ctx.stroke(country.path);
    });

    // 绘制我们的势力区域
    countriesRef.current.forEach((country) => {
      ctx.fillStyle = country.baseColor;
      ctx.fill(country.path, 'evenodd');
    });
    
    ctx.restore();

    drawDynamicBorders(ctx, width, height);

    // 高亮选中的区域
    if (selectedCountryIdRef.current) {
      const selected = countriesRef.current.find((country) => country.id === selectedCountryIdRef.current);
      if (selected) {
        ctx.save();
        applyViewTransform(ctx);
        ctx.strokeStyle = '#F7E2A0';
        ctx.lineWidth = 2.8 / viewRef.current.scale;
        ctx.stroke(selected.path);
        ctx.restore();
      }
    }

    drawLabelsAndCities(ctx, width, height);
  };

  const pickCountry = (worldX, worldY) => {
    for (let index = countriesRef.current.length - 1; index >= 0; index -= 1) {
      const country = countriesRef.current[index];
      const ctx = canvasRef.current.getContext('2d');
      if (ctx.isPointInPath(country.path, worldX, worldY, 'evenodd')) {
        return country.id;
      }
    }
    return null;
  };

  const handleCanvasClick = (event) => {
    if (loadingRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // 计算 canvas 内部坐标（考虑 canvas 分辨率与显示尺寸的缩放）
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);
    
    console.log('🖱️ [DEBUG] Click at screen:', { clientX: event.clientX, clientY: event.clientY });
    console.log('🖱️ [DEBUG] Click at canvas:', { x, y });
    
    const world = screenToWorld(x, y);
    console.log('🌍 [DEBUG] World coords:', world);

    selectedCountryIdRef.current = pickCountry(world.x, world.y);
    console.log('🎯 [DEBUG] Picked country ID:', selectedCountryIdRef.current);
    
    if (selectedCountryIdRef.current) {
      const selectedCountry = getCountryById(selectedCountryIdRef.current);
      console.log('✅ [DEBUG] Found country:', selectedCountry);
      onRegionSelect && onRegionSelect(selectedCountry);
    } else {
      console.log('❌ [DEBUG] No country picked');
      onRegionSelect && onRegionSelect(null);
    }
    
    drawMap();
  };

  const handleWheel = (event) => {
    if (loadingRef.current || !canvasRef.current) return;
    
    event.preventDefault();
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);
    
    // 修复缩放因子，确保可以放大
    const zoomFactor = event.deltaY < 0 ? 1.15 : 0.87;
    zoomAt(x, y, zoomFactor);
    drawMap();
  };

  const handleMouseDown = (event) => {
    if (event.button !== 0 || loadingRef.current || !canvasRef.current) {
      return;
    }

    const view = viewRef.current;
    view.dragging = true;
    view.moved = false;
    view.dragStartX = event.clientX;
    view.dragStartY = event.clientY;
  };

  const handleMouseMove = (event) => {
    const view = viewRef.current;
    if (!view.dragging) {
      return;
    }

    const dx = event.clientX - view.dragStartX;
    const dy = event.clientY - view.dragStartY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      view.moved = true;
    }

    // 添加边界限制 - 防止拖出画框
    const canvas = canvasRef.current;
    if (canvas) {
      const maxOffsetX = (view.scale - 1) * canvas.width / 2;
      const maxOffsetY = (view.scale - 1) * canvas.height / 2;
      
      view.offsetX += dx;
      view.offsetY += dy;
      
      // 限制偏移范围
      view.offsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, view.offsetX));
      view.offsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, view.offsetY));
    }
    
    view.dragStartX = event.clientX;
    view.dragStartY = event.clientY;
    drawMap();
  };

  const handleMouseUp = () => {
    const view = viewRef.current;
    if (!view.dragging) {
      return;
    }
    view.dragging = false;
  };

  const loadCountries = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const GEOJSON_URL = 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';
    
    try {
      const response = await fetch(GEOJSON_URL);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const geojson = await response.json();
      const worldFeatures = geojson.features.filter((feature) =>
        feature.properties['ISO3166-1-Alpha-3'] !== 'ATA'
      );
      const isoSet = new Set(COUNTRY_DEFS.map((item) => item.iso3));
      const selectedFeatures = worldFeatures.filter((feature) =>
        isoSet.has(feature.properties['ISO3166-1-Alpha-3'])
      );

      if (selectedFeatures.length === 0) {
        throw new Error('未匹配到国家边界数据');
      }

      const projection = buildProjection(worldFeatures, canvas.width, canvas.height);

      unopenedCountriesRef.current = worldFeatures
        .filter((feature) => !isoSet.has(feature.properties['ISO3166-1-Alpha-3']))
        .map((feature) => buildUnopenedObject(feature, projection));

      countriesRef.current = COUNTRY_DEFS
        .map((def) => selectedFeatures.find((feature) => feature.properties['ISO3166-1-Alpha-3'] === def.iso3))
        .filter(Boolean)
        .map((feature, index) => buildCountryObject(feature, projection, index));

      loadingRef.current = false;
      resetViewToMiddleEast(); // 初始化时设置为中东中心视图
    } catch (error) {
      loadingRef.current = false;
      console.error('Failed to load countries:', error);
      drawMap();
    }
  };

  const handleResize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // 使用 map-demo 的固定尺寸
    canvas.width = 900;
    canvas.height = 620;
    drawMap();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // 添加事件监听器
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    handleResize();
    loadCountries();
    
    return () => {
      // 清理事件监听器
      if (canvas) {
        canvas.removeEventListener('wheel', handleWheel);
        canvas.removeEventListener('mousedown', handleMouseDown);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className="game-map-container">
      <canvas
        ref={canvasRef}
        id="worldCanvas"
        onClick={handleCanvasClick}
        style={{ cursor: 'grab' }}
      />
    </div>
  );
};

export default CanvasGameMap;