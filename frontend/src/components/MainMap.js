import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MainMap.css';

// Fix for Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MainMap({ leaders, hotspots, onLeaderClick }) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef({});

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    // Create map with Middle East center
    const map = L.map(mapRef.current, {
      center: [30, 40], // Middle East center coordinates
      zoom: 5,
      zoomControl: false,
      attributionControl: false
    });
    
    leafletMapRef.current = map;

    // Add base tile layer (using OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add zoom control in top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    return () => {
      if (map) {
        map.remove();
      }
    };
  }, []);

  // Update leaders on map
  useEffect(() => {
    if (!leafletMapRef.current || !leaders) return;

    // Remove existing leader markers
    Object.values(markersRef.current).forEach(marker => {
      if (marker.type === 'leader') {
        leafletMapRef.current.removeLayer(marker.instance);
      }
    });

    // Add/update leader markers
    const newMarkers = {};
    leaders.forEach(leader => {
      if (leader.location && leader.status !== 'deceased') {
        // Convert location name to coordinates (in a real app, this would use a geocoding service)
        let coords;
        switch (leader.location) {
          case '华盛顿':
            coords = [38.9072, -77.0369];
            break;
          case '德黑兰':
            coords = [35.6892, 51.3890];
            break;
          case '利雅得':
            coords = [24.7136, 46.6753];
            break;
          case '特拉维夫':
            coords = [32.0853, 34.7818];
            break;
          default:
            coords = [30, 40]; // Default to Middle East center
        }

        // Create custom icon based on leader status
        const iconColor = leader.status === 'active' ? '#F0B90B' : '#ff4d4d';
        const icon = L.divIcon({
          className: 'leader-marker',
          html: `<div style="background-color: ${iconColor}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(240, 185, 11, 0.7);"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        const marker = L.marker(coords, { icon });
        marker.addTo(leafletMapRef.current);
        
        // Add click handler
        marker.on('click', () => {
          onLeaderClick && onLeaderClick(leader);
        });

        newMarkers[leader.id] = { instance: marker, type: 'leader' };
      }
    });

    markersRef.current = { ...markersRef.current, ...newMarkers };
  }, [leaders, onLeaderClick]);

  // Update hotspots on map
  useEffect(() => {
    if (!leafletMapRef.current || !hotspots) return;

    // Remove existing hotspot markers
    Object.values(markersRef.current).forEach(marker => {
      if (marker.type === 'hotspot') {
        leafletMapRef.current.removeLayer(marker.instance);
      }
    });

    // Add/update hotspot markers
    const newMarkers = {};
    hotspots.forEach(hotspot => {
      if (hotspot.location) {
        // Convert location name to coordinates
        let coords;
        switch (hotspot.location) {
          case '德黑兰':
            coords = [35.6892, 51.3890];
            break;
          case '利雅得':
            coords = [24.7136, 46.6753];
            break;
          case '特拉维夫':
            coords = [32.0853, 34.7818];
            break;
          case '巴格达':
            coords = [33.3152, 44.3661];
            break;
          case '大马士革':
            coords = [33.5138, 36.2765];
            break;
          default:
            coords = [30, 40];
        }

        // Determine color based on hotspot status
        let color = '#F0B90B'; // Default gold
        if (hotspot.color === 'red' || hotspot.status.includes('权力真空')) {
          color = '#ff4d4d';
        } else if (hotspot.color === 'yellow' || hotspot.status.includes('紧急')) {
          color = '#ffd700';
        }

        // Create pulsing circle for hotspot
        const hotspotElement = document.createElement('div');
        hotspotElement.className = 'hotspot-pulse';
        hotspotElement.style.backgroundColor = color;
        
        const icon = L.divIcon({
          className: 'hotspot-marker',
          html: hotspotElement.outerHTML,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const marker = L.marker(coords, { icon });
        marker.addTo(leafletMapRef.current);
        
        newMarkers[hotspot.location] = { instance: marker, type: 'hotspot' };
      }
    });

    markersRef.current = { ...markersRef.current, ...newMarkers };
  }, [hotspots]);

  return (
    <div className="main-map-container">
      <div ref={mapRef} className="map-leaflet" />
    </div>
  );
}

export default MainMap;