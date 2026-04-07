// Simplified world GeoJSON covering Europe, Africa, Middle East, and Asia
// This is a minimal version for the game map - only includes major regions
export const worldRegions = {
  "type": "FeatureCollection",
  "features": [
    // Europe
    {
      "type": "Feature",
      "properties": { "name": "Western Europe", "region": "europe" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[-10, 35], [10, 35], [10, 55], [-10, 55], [-10, 35]]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Eastern Europe", "region": "europe" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[10, 35], [40, 35], [40, 55], [10, 55], [10, 35]]]
      }
    },
    // North Africa
    {
      "type": "Feature",
      "properties": { "name": "North Africa", "region": "africa" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[-10, 20], [40, 20], [40, 35], [-10, 35], [-10, 20]]]
      }
    },
    // Sub-Saharan Africa
    {
      "type": "Feature",
      "properties": { "name": "Sub-Saharan Africa", "region": "africa" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[-20, -35], [50, -35], [50, 20], [-20, 20], [-20, -35]]]
      }
    },
    // Central Asia
    {
      "type": "Feature",
      "properties": { "name": "Central Asia", "region": "asia" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[40, 35], [80, 35], [80, 55], [40, 55], [40, 35]]]
      }
    },
    // South Asia
    {
      "type": "Feature",
      "properties": { "name": "South Asia", "region": "asia" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[60, 5], [90, 5], [90, 35], [60, 35], [60, 5]]]
      }
    },
    // East Asia
    {
      "type": "Feature",
      "properties": { "name": "East Asia", "region": "asia" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[90, 20], [130, 20], [130, 50], [90, 50], [90, 20]]]
      }
    },
    // Southeast Asia
    {
      "type": "Feature",
      "properties": { "name": "Southeast Asia", "region": "asia" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[90, -10], [120, -10], [120, 20], [90, 20], [90, -10]]]
      }
    }
  ]
};