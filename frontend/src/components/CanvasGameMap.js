import React, { useEffect, useRef } from 'react';
import './CanvasGameMap.css';
import { culturalRegions, REGION_COLORS } from '../data/culturalRegions';

// 简化版的 Canvas 地图组件，基于您提供的 map-demo
function CanvasGameMap({ worldState, onCountryClick, onLeaderClick }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const viewRef = useRef({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    moved: false
  });
  const selectedRegionRef = useRef(null);
  
  // 文化大区数据转换为地图对象
  const regionsData = useRef([]);
  
  // 颜色常量
  const COLORS = {
    water: '#2B4F5C',
    border: '#3A2C1A',
    label: '#F0E6D2',
    labelStroke: '#000000'
  };

  // 初始化区域数据
  const initializeRegions = () => {
    const regions = [];
    let index = 0;
    
    culturalRegions.features.forEach(feature => {
      const name = feature.properties.name;
      const faction = feature.properties.faction;
      
      // 获取颜色
      let baseColor;
      if (faction === '抵抗轴心') baseColor = '#8B1A1A';
      else if (faction === '美以联盟') baseColor = '#1E4F8A';
      else if (faction === '温和联盟') baseColor = '#B8860B';
      else if (faction === '亲穆兄会') baseColor = '#2D5A27';
      else if (faction === '水域') baseColor = '#2B4F5C';
      else if (REGION_COLORS[name]) baseColor = REGION_COLORS[name];
      else baseColor = '#7E57C2';
      
      // 简化的边界数据（使用特征坐标）
      const coordinates = feature.geometry.coordinates[0];
      const pathData = coordinates.map(coord => ({ x: coord[0] * 10 + 400, y: -coord[1] * 10 + 300 }));
      
      // 计算中心点
      let sumX = 0, sumY = 0;
      pathData.forEach(point => {
        sumX += point.x;
        sumY += point.y;
      });
      const center = {
        x: sumX / pathData.length,
        y: sumY / pathData.length
      };
      
      regions.push({
        id: name,
        name: name,
        baseColor: baseColor,
        pathData: pathData,
        center: center,
        faction: faction
      });
      
      index++;
    });
    
    regionsData.current = regions;
  };

  // 绘制羊皮纸背景
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

  // 绘制区域路径
  const drawRegionPath = (ctx, region) => {
    const path = new Path2D();
    if (region.pathData.length > 0) {
      path.moveTo(region.pathData[0].x, region.pathData[0].y);
      for (let i = 1; i < region.pathData.length; i++) {
        path.lineTo(region.pathData[i].x, region.pathData[i].y);
      }
      path.closePath();
    }
    return path;
  };

  // 绘制地图
  const drawMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    // 清空画布
    ctx.clearRect(0, 0, width, height);
    
    // 绘制羊皮纸背景
    drawParchmentBackground(ctx, width, height);
    
    // 绘制水域（深蓝绿色背景）
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(18, 18, width - 36, height - 36);
    
    // 绘制所有区域
    regionsData.current.forEach(region => {
      const path = drawRegionPath(ctx, region);
      
      // 填充区域颜色
      ctx.fillStyle = region.baseColor;
      ctx.fill(path, 'evenodd');
      
      // 绘制边界线
      ctx.strokeStyle = COLORS.border;
      ctx.lineWidth = 2;
      ctx.stroke(path);
      
      // 如果是选中区域，绘制高亮边框
      if (selectedRegionRef.current === region.id) {
        ctx.strokeStyle = '#F7E2A0';
        ctx.lineWidth = 3;
        ctx.stroke(path);
      }
    });
    
    // 绘制标签
    regionsData.current.forEach(region => {
      ctx.font = 'bold 16px "STKaiti", "KaiTi", "LiSu", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = COLORS.labelStroke;
      ctx.lineWidth = 3;
      ctx.strokeText(region.name, region.center.x, region.center.y);
      ctx.fillStyle = COLORS.label;
      ctx.fillText(region.name, region.center.x, region.center.y);
    });
  };

  // 处理点击事件
  const handleCanvasClick = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // 简单的点击检测（从后往前遍历，确保顶层区域优先）
    for (let i = regionsData.current.length - 1; i >= 0; i--) {
      const region = regionsData.current[i];
      const path = drawRegionPath(canvas.getContext('2d'), region);
      
      if (canvas.getContext('2d').isPointInPath(path, x, y, 'evenodd')) {
        selectedRegionRef.current = region.id;
        if (onCountryClick) {
          onCountryClick({
            name: region.name,
            faction: region.faction,
            id: region.id
          });
        }
        drawMap();
        return;
      }
    }
    
    // 点击空白区域，取消选择
    selectedRegionRef.current = null;
    if (onCountryClick) {
      onCountryClick(null);
    }
    drawMap();
  };

  // 初始化
  useEffect(() => {
    initializeRegions();
    drawMap();
    
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('click', handleCanvasClick);
    }
    
    return () => {
      if (canvas && animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        canvas.removeEventListener('click', handleCanvasClick);
      }
    };
  }, []);

  return (
    <div className="canvas-map-container">
      <canvas
        ref={canvasRef}
        width={900}
        height={620}
        className="game-canvas"
      />
    </div>
  );
}

export default CanvasGameMap;