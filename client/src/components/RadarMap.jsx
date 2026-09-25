import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { VERIFIED_DIRECTORY, calculateDistance } from '../data/directory';
import '../styles/map.css';

export default function RadarMap({ 
  userLiveCoords, 
  listings = [], 
  onBackToHome 
}) {
  const [filter, setFilter] = useState('ALL');
  const [userCoords, setUserCoords] = useState(userLiveCoords || { lat: 28.6139, lon: 77.2090 });
  const [statusText, setStatusText] = useState('Scanning nearby verified hubs...');

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const userMarkerRef = useRef(null);
  const radarCircleRef = useRef(null);
  const locationMarkersMap = useRef({});

  // 1. Initialize Map
  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = userCoords.lat;
      const initialLon = userCoords.lon;

      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([initialLat, initialLon], 12);

      L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: '&copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ'
      }).addTo(map);

      markersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. User GPS Marker & Pulse Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userMarkerRef.current) map.removeLayer(userMarkerRef.current);
    if (radarCircleRef.current) map.removeLayer(radarCircleRef.current);

    const userIcon = L.divIcon({
      className: 'user-radar-pin',
      html: `<div style="background: #38bdf8; width: 18px; height: 18px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 14px #38bdf8;"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    userMarkerRef.current = L.marker([userCoords.lat, userCoords.lon], { icon: userIcon })
      .addTo(map)
      .bindPopup(`<strong style="color:#38bdf8">📍 Your Current Location</strong><br><small>Radar scanner active (10km)</small>`);

    radarCircleRef.current = L.circle([userCoords.lat, userCoords.lon], {
      color: '#38bdf8',
      fillColor: '#38bdf8',
      fillOpacity: 0.08,
      radius: 10000 // 10km
    }).addTo(map);

    setStatusText(`Radar active · Centered at ${userCoords.lat.toFixed(4)}°N, ${userCoords.lon.toFixed(4)}°E`);
  }, [userCoords]);

  // 3. Render Markers based on Filter
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = markersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    locationMarkersMap.current = {};

    // Combine verified directory + live donations
    const allLocations = [
      ...VERIFIED_DIRECTORY.map(item => ({ ...item, isDonation: false })),
      ...listings.map(item => ({
        id: `donation_${item.id}`,
        type: 'DONATION',
        name: `Surplus: ${item.title}`,
        address: item.address,
        darpan_id: item.verification_code || 'FOODLOOP-VERIFIED',
        phone: item.phone,
        lat: item.coords?.lat || 28.6139,
        lon: item.coords?.lon || 77.2090,
        capacity: item.quantity,
        isDonation: true,
        image: item.image
      }))
    ];

    allLocations.forEach(loc => {
      if (filter !== 'ALL' && loc.type !== filter) return;

      let iconHtml = '🏛️';
      let borderCol = '#10b981';
      if (loc.type === 'ANIMAL') { iconHtml = '🐾'; borderCol = '#fbbf24'; }
      if (loc.type === 'BIOGAS') { iconHtml = '⚡'; borderCol = '#38bdf8'; }
      if (loc.type === 'DONATION') { iconHtml = '🍲'; borderCol = '#ef4444'; }

      const customIcon = L.divIcon({
        className: 'hub-pin',
        html: `<div style="background: #1e293b; border: 2px solid ${borderCol}; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.6);">${iconHtml}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const distKm = calculateDistance(userCoords.lat, userCoords.lon, loc.lat, loc.lon).toFixed(1);

      const marker = L.marker([loc.lat, loc.lon], { icon: customIcon })
        .addTo(group)
        .bindPopup(`
          <div style="font-family: 'DM Sans', sans-serif;">
            <div style="font-size: 14px; font-weight: 800; color: #fff; margin-bottom: 4px;">${loc.name}</div>
            <div style="font-size: 11px; color: #38bdf8; font-weight: 700; margin-bottom: 6px;">📍 ${distKm} km away</div>
            <div style="font-size: 12px; color: #cbd5e1; margin-bottom: 6px;">${loc.address}</div>
            <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px;">Capacity / Qty: <strong>${loc.capacity}</strong></div>
            <div style="display: flex; gap: 6px;">
              <a href="tel:${loc.phone}" style="background: #10b981; color: #000; padding: 4px 8px; border-radius: 4px; text-decoration: none; font-size: 11px; font-weight: 800;">📞 Call</a>
              <a href="https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lon}" target="_blank" rel="noopener noreferrer" style="background: #334155; color: #fff; padding: 4px 8px; border-radius: 4px; text-decoration: none; font-size: 11px; font-weight: 700;">🧭 Navigate</a>
            </div>
          </div>
        `);

      locationMarkersMap.current[loc.id] = marker;
    });
  }, [filter, userCoords, listings]);

  // Recenter GPS
  const recenterGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setUserCoords(coords);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([coords.lat, coords.lon], 13);
          }
        },
        () => {
          // If denied, fallback to Dehradun center or Delhi center toggle
          alert('GPS location permission denied. Centering on Dehradun Hub.');
          const ddn = { lat: 30.3214, lon: 78.0374 };
          setUserCoords(ddn);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([ddn.lat, ddn.lon], 13);
          }
        }
      );
    }
  };

  // Card click fly to
  const handleCardClick = (loc) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([loc.lat, loc.lon], 15, { duration: 1.2 });
    const marker = locationMarkersMap.current[loc.id];
    if (marker) {
      setTimeout(() => marker.openPopup(), 1200);
    }
  };

  // Location list for sidebar
  const visibleList = [
    ...VERIFIED_DIRECTORY.map(item => ({ ...item, isDonation: false })),
    ...listings.map(item => ({
      id: `donation_${item.id}`,
      type: 'DONATION',
      name: `Surplus: ${item.title}`,
      address: item.address,
      phone: item.phone,
      lat: item.coords?.lat || 28.6139,
      lon: item.coords?.lon || 77.2090,
      capacity: item.quantity,
      isDonation: true
    }))
  ]
    .filter(item => filter === 'ALL' || item.type === filter)
    .map(item => ({
      ...item,
      distanceKm: calculateDistance(userCoords.lat, userCoords.lon, item.lat, item.lon)
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0b0f19', color: '#f8fafc' }}>
      {/* Map Header */}
      <header className="map-header">
        <button 
          type="button" 
          onClick={onBackToHome} 
          className="brand-link" 
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          food<span>loop</span><span className="brand-dot"></span>
        </button>

        <div className="header-controls">
          <button type="button" onClick={onBackToHome} className="btn-nav-back">
            ← Back to Home
          </button>
          <button type="button" onClick={recenterGPS} className="btn-recenter">
            📍 Recenter GPS
          </button>
        </div>
      </header>

      {/* Main Map Container */}
      <div className="map-container-layout">
        {/* Sidebar Controls */}
        <aside className="map-sidebar">
          <div className="sidebar-header">
            <div className="live-eyebrow">
              <span>Live Rescue Network</span>
              <span className="delhi-tag">Delhi & Dehradun</span>
            </div>
            <h2>Radar Map</h2>
            <div className="gps-status-row">
              <span className="gps-pulse-dot"></span>
              <span id="radar-status-text">{statusText}</span>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="filter-pills">
            <button type="button" className={`filter-btn ${filter === 'ALL' ? 'active' : ''}`} onClick={() => setFilter('ALL')}>
              All Locations
            </button>
            <button type="button" className={`filter-btn ${filter === 'NGO' ? 'active' : ''}`} onClick={() => setFilter('NGO')}>
              🏛️ Verified NGOs
            </button>
            <button type="button" className={`filter-btn ${filter === 'ANIMAL' ? 'active' : ''}`} onClick={() => setFilter('ANIMAL')}>
              🐾 Animal Shelters
            </button>
            <button type="button" className={`filter-btn ${filter === 'BIOGAS' ? 'active' : ''}`} onClick={() => setFilter('BIOGAS')}>
              ⚡ Biogas & Bio-Loop
            </button>
            <button type="button" className={`filter-btn ${filter === 'DONATION' ? 'active' : ''}`} onClick={() => setFilter('DONATION')}>
              🍲 Live Surplus Posts
            </button>
          </div>

          {/* List of Locations */}
          <div className="locations-list" id="locations-list">
            {visibleList.map(loc => {
              let badgeClass = 'badge-ngo';
              let badgeLabel = 'Verified NGO';
              if (loc.type === 'ANIMAL') { badgeClass = 'badge-animal'; badgeLabel = 'Animal Shelter'; }
              if (loc.type === 'BIOGAS') { badgeClass = 'badge-biogas'; badgeLabel = 'Biogas Plant'; }
              if (loc.type === 'DONATION') { badgeClass = 'badge-food'; badgeLabel = 'Live Surplus'; }

              return (
                <div key={loc.id} className="location-card" onClick={() => handleCardClick(loc)}>
                  <div className="location-card-top">
                    <span className={`loc-badge ${badgeClass}`}>{badgeLabel}</span>
                    <span className="loc-distance">{loc.distanceKm.toFixed(1)} km</span>
                  </div>
                  <div className="loc-title">{loc.name}</div>
                  <div className="loc-address">{loc.address}</div>
                  <div className="loc-actions">
                    <a href={`tel:${loc.phone}`} className="btn-card-action" onClick={(e) => e.stopPropagation()}>
                      📞 Call
                    </a>
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lon}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn-card-action" 
                      onClick={(e) => e.stopPropagation()}
                    >
                      🧭 Directions
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Interactive Leaflet Map */}
        <div id="foodloop-map" ref={mapRef} style={{ width: '100%', height: '100%' }}></div>
      </div>
    </div>
  );
}
