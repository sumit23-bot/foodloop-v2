import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Locate, Phone, MapPin, ExternalLink } from 'lucide-react';
import { VERIFIED_DIRECTORY, calculateDistance } from '../data/directory';
import '../styles/map.css';

export default function RadarMap({ 
  userLiveCoords, 
  listings = [], 
  currentUser,
  onBackToHome 
}) {
  const [filter, setFilter] = useState('ALL');
  const [userCoords, setUserCoords] = useState(userLiveCoords || { lat: 28.6139, lon: 77.2090 });
  const [selectedId, setSelectedId] = useState(null);

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
        attribution: '&copy; Esri'
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
      html: `<div class="user-radar-pin-box"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    userMarkerRef.current = L.marker([userCoords.lat, userCoords.lon], { icon: userIcon })
      .addTo(map)
      .bindPopup(`<strong>Your Location</strong><br><small>GPS Centered</small>`);

    radarCircleRef.current = L.circle([userCoords.lat, userCoords.lon], {
      color: '#1B1E22',
      fillColor: '#1B1E22',
      fillOpacity: 0.05,
      radius: 10000 // 10km
    }).addTo(map);
  }, [userCoords]);

  // 3. Render Markers based on Filter
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = markersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    locationMarkersMap.current = {};

    const allLocations = [
      ...VERIFIED_DIRECTORY.map(item => ({ ...item, isDonation: false, canCall: true })),
      ...listings.map(item => {
        const isClaimed = Boolean(item.claimed_by || item.claimed_by_ngo || item.status === 'CLAIMED');
        const isItemDonor = Boolean(
          currentUser && (
            currentUser.role === 'DONOR' ||
            (currentUser.name && item.donor_name && currentUser.name.toLowerCase() === item.donor_name.toLowerCase()) ||
            (currentUser.phone && item.phone && currentUser.phone === item.phone)
          )
        );
        const isClaimant = Boolean(
          currentUser && isClaimed && (
            (item.claimed_by && (
              item.claimed_by.toLowerCase() === (currentUser.organization || '').toLowerCase() ||
              item.claimed_by.toLowerCase() === (currentUser.name || '').toLowerCase()
            )) ||
            (item.claimed_by_ngo && (
              item.claimed_by_ngo.toLowerCase() === (currentUser.organization || '').toLowerCase() ||
              item.claimed_by_ngo.toLowerCase() === (currentUser.name || '').toLowerCase()
            )) ||
            (item.claimant_phone && currentUser.phone && item.claimant_phone === currentUser.phone)
          )
        );
        const canView = Boolean(isItemDonor || isClaimant);

        return {
          id: `donation_${item.id || item._id}`,
          type: 'DONATION',
          name: `Surplus: ${item.title}`,
          address: canView ? item.address : `${item.address?.split(',').slice(-2).join(', ') || 'Delhi-NCR'} (Claim to unlock address)`,
          phone: item.phone,
          canCall: canView,
          lat: item.coords?.lat || 28.6139,
          lon: item.coords?.lon || 77.2090,
          capacity: item.quantity,
          isDonation: true,
          isClaimed
        };
      })
    ];

    allLocations.forEach(loc => {
      if (filter !== 'ALL' && loc.type !== filter) return;

      const isSelected = selectedId === loc.id;
      const customIcon = L.divIcon({
        className: 'hub-pin',
        html: `<div class="custom-radar-pin ${isSelected ? 'pin-selected' : ''}">${loc.type[0]}</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const distKm = calculateDistance(userCoords.lat, userCoords.lon, loc.lat, loc.lon).toFixed(1);

      const marker = L.marker([loc.lat, loc.lon], { icon: customIcon })
        .addTo(group)
        .bindPopup(`
          <div>
            <div style="font-weight: 700; font-size: 0.875rem; margin-bottom: 2px;">${loc.name}</div>
            <div style="font-size: 0.75rem; color: #5B636B; margin-bottom: 4px;">${distKm} km away · ${loc.address}</div>
            <div style="font-size: 0.75rem; margin-bottom: 8px;">Capacity / Qty: <strong>${loc.capacity}</strong></div>
            <div style="display: flex; gap: 6px;">
              ${loc.canCall && loc.phone ? `
                <a href="tel:${String(loc.phone).replace(/\D/g, '')}" class="btn btn-secondary btn-sm" style="padding: 2px 8px; font-size: 11px;">Call</a>
              ` : ''}
              <a href="https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lon}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="padding: 2px 8px; font-size: 11px;">Navigate</a>
            </div>
          </div>
        `);

      locationMarkersMap.current[loc.id] = marker;
    });
  }, [filter, userCoords, listings, currentUser, selectedId]);

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
          const ddn = { lat: 30.3214, lon: 78.0374 };
          setUserCoords(ddn);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([ddn.lat, ddn.lon], 13);
          }
        }
      );
    }
  };

  const handleCardClick = (loc) => {
    setSelectedId(loc.id);
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([loc.lat, loc.lon], 14, { duration: 1.0 });
    const marker = locationMarkersMap.current[loc.id];
    if (marker) {
      setTimeout(() => marker.openPopup(), 1000);
    }
  };

  const visibleList = [
    ...VERIFIED_DIRECTORY.map(item => ({ ...item, isDonation: false })),
    ...listings.map(item => ({
      id: `donation_${item.id || item._id}`,
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
    <div className="map-page-layout">
      {/* Left Sidebar Panel */}
      <aside className="map-sidebar-panel" aria-label="Map directory list">
        <div className="map-sidebar-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h2>Radar map</h2>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={recenterGPS}
              title="Recenter GPS"
            >
              <Locate size={13} strokeWidth={1.5} />
              <span>Recenter</span>
            </button>
          </div>
          <div className="map-sidebar-subtitle">
            Geolocated radar of active consignments &amp; partner hubs.
          </div>
        </div>

        {/* Filter Pills */}
        <div className="map-filter-group">
          <button
            type="button"
            className={`map-filter-pill ${filter === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilter('ALL')}
          >
            All hubs
          </button>
          <button
            type="button"
            className={`map-filter-pill ${filter === 'DONATION' ? 'active' : ''}`}
            onClick={() => setFilter('DONATION')}
          >
            Live surplus
          </button>
          <button
            type="button"
            className={`map-filter-pill ${filter === 'NGO' ? 'active' : ''}`}
            onClick={() => setFilter('NGO')}
          >
            NGOs
          </button>
          <button
            type="button"
            className={`map-filter-pill ${filter === 'ANIMAL' ? 'active' : ''}`}
            onClick={() => setFilter('ANIMAL')}
          >
            Animal shelters
          </button>
          <button
            type="button"
            className={`map-filter-pill ${filter === 'BIOGAS' ? 'active' : ''}`}
            onClick={() => setFilter('BIOGAS')}
          >
            Biogas plants
          </button>
        </div>

        {/* Locations Scroll List */}
        <div className="map-locations-scroll">
          {visibleList.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
              No hubs discovered in this category.
            </div>
          ) : (
            visibleList.map((loc) => {
              const isSelected = selectedId === loc.id;
              return (
                <div
                  key={loc.id}
                  className={`map-location-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleCardClick(loc)}
                >
                  <div className="map-card-top">
                    <span className="label-caps">{loc.type}</span>
                    <span className="map-card-distance">{loc.distanceKm.toFixed(1)} km</span>
                  </div>
                  <div className="map-card-title">{loc.name}</div>
                  <div className="map-card-address">{loc.address}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Capacity / Qty: <strong>{loc.capacity}</strong>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Map Viewport */}
      <div id="foodloop-map" ref={mapRef} className="map-viewport-container" />
    </div>
  );
}
