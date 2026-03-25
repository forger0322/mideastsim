// 地理工具函数

/**
 * 计算多边形的中心点（质心）
 * @param {Array} coordinates - 多边形坐标数组
 * @returns {Array} [lng, lat] 中心点坐标
 */
export function calculateCentroid(coordinates) {
  if (!coordinates || coordinates.length === 0) return [0, 0];
  
  // 简化计算：取所有点的平均值
  let lngSum = 0;
  let latSum = 0;
  let count = 0;
  
  // coordinates 可能是多层嵌套的，处理第一层外环
  const outerRing = Array.isArray(coordinates[0][0]) ? coordinates[0] : coordinates;
  
  for (const [lng, lat] of outerRing) {
    lngSum += lng;
    latSum += lat;
    count++;
  }
  
  return [lngSum / count, latSum / count];
}

/**
 * 为每个国家特征添加中心点坐标
 * @param {Object} geoJSON - GeoJSON 对象
 * @returns {Object} 带有中心点坐标的 GeoJSON
 */
export function addCentroidsToGeoJSON(geoJSON) {
  const featuresWithCentroids = geoJSON.features.map(feature => {
    const centroid = calculateCentroid(feature.geometry.coordinates);
    return {
      ...feature,
      properties: {
        ...feature.properties,
        centroid: centroid
      }
    };
  });
  
  return {
    ...geoJSON,
    features: featuresWithCentroids
  };
}