import React from 'react';
import { calculateDistance } from '../data/directory';

export default function RescueFeeds({ 
  listings = [], 
  currentTab = 'HUMAN', 
  onTabChange, 
  currentUser, 
  userCoords,
  onClaim, 
  onOpenDispute, 
  onOpenQR, 
  onOpenScanner,
  onRefresh, 
  onOpenDashboard 
}) {
  const isNGO = currentUser && (currentUser.role === 'NGO' || currentUser.role === 'ANIMAL_SHELTER');

  // Filter listings based on current portal tab
  const filteredListings = listings.filter(item => {
    if (currentTab === 'ANIMAL') {
      return item.status === 'DIVERTED_TO_ANIMALS' || item.expiry_hours <= 1;
    }
    return item.status !== 'DIVERTED_TO_ANIMALS';
  });

  const animalCount = listings.filter(item => item.status === 'DIVERTED_TO_ANIMALS' || item.expiry_hours <= 1).length;

  const calculateRemainingTime = (createdAt, expiryHours) => {
    const created = new Date(createdAt).getTime();
    const expiry = created + (expiryHours * 60 * 60 * 1000);
    const now = Date.now();
    const diffMin = Math.max(0, Math.floor((expiry - now) / (60 * 1000)));
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    if (diffMin <= 0) return 'Expired';
    return `${hours}h ${mins}m left`;
  };

  return (
    <div className="feed-panel">
      <div className="feed-heading">
        <div>
          <h3 id="feed-heading-title">
            {currentTab === 'HUMAN' ? 'Nearby human donations' : '🐾 Animal & Gaushala Surplus Loop'}
          </h3>
          <p id="listing-count">
            {filteredListings.length} {filteredListings.length === 1 ? 'active surplus listing' : 'active surplus listings'} available
          </p>
        </div>
        <button 
          className="icon-button" 
          id="refresh-feed" 
          type="button" 
          onClick={onRefresh} 
          aria-label="Refresh listings"
          title="Refresh listings"
        >
          <i className="fa-solid fa-arrows-rotate"></i>
        </button>
      </div>

      <div className="listing-feed feed-list-scroll" id="foodloop-feed-list" aria-live="polite">
        {filteredListings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
            <p style={{ fontSize: '18px', marginBottom: '8px' }}>🍃 No surplus listings in this loop right now.</p>
            <small>New food posts will appear here in real-time.</small>
          </div>
        ) : (
          filteredListings.map(item => {
            const timeLeft = calculateRemainingTime(item.created_at, item.expiry_hours);
            const isClaimed = item.claimed_by || item.status === 'CLAIMED';
            const isItemDonor = Boolean(
              currentUser && (
                currentUser.role === 'DONOR' ||
                (currentUser.id && item.donor_id && String(currentUser.id) === String(item.donor_id)) ||
                (currentUser.name && item.donor_name && currentUser.name.toLowerCase() === item.donor_name.toLowerCase()) ||
                (currentUser.phone && item.phone && currentUser.phone === item.phone)
              )
            );

            const itemLat = item.coords?.lat ?? 28.6139;
            const itemLon = item.coords?.lon ?? 77.2090;
            const userLat = userCoords?.lat ?? 28.6139;
            const userLon = userCoords?.lon ?? 77.2090;
            const distKm = calculateDistance(userLat, userLon, itemLat, itemLon);
            const isNearby = distKm <= 0.3; // 300m limit

            return (
              <article key={item.id} className="feed-card" style={{
                background: '#111827',
                border: '1.5px solid #334155',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '14px',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  {item.image && (
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} 
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: 0 }}>{item.title}</h4>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: isClaimed ? 'rgba(56, 189, 248, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                        color: isClaimed ? '#38bdf8' : '#34d399',
                        border: isClaimed ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)'
                      }}>
                        {isClaimed ? '🔒 Claimed' : '🟢 Available'}
                      </span>
                    </div>

                    <p style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '8px' }}>
                      <strong>Qty:</strong> {item.quantity} · <strong>Donor:</strong> {item.donor_name}
                    </p>
                    <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '10px' }}>
                      📍 {item.address} · <span style={{ color: '#fbbf24', fontWeight: 700 }}>⏳ {timeLeft}</span>
                    </p>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {!isClaimed && (
                        <button 
                          type="button" 
                          onClick={() => onClaim(item)} 
                          style={{
                            background: '#10b981',
                            color: '#000',
                            fontWeight: 800,
                            fontSize: '12px',
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          🏛️ Claim Pickup
                        </button>
                      )}

                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${item.coords?.lat || 28.6139},${item.coords?.lon || 77.2090}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{
                          background: '#334155',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '12px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        🧭 Navigate
                      </a>

                      {isItemDonor ? (
                        <button 
                          type="button" 
                          onClick={() => onOpenQR(item)} 
                          style={{
                            background: '#1e293b',
                            color: '#38bdf8',
                            border: '1px solid #38bdf8',
                            fontSize: '12px',
                            fontWeight: 700,
                            padding: '6px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          📲 Show Pickup QR
                        </button>
                      ) : isNGO ? (
                        <button 
                          type="button" 
                          onClick={() => onOpenScanner && onOpenScanner(item)} 
                          style={{
                            background: '#064e3b',
                            color: '#34d399',
                            border: '1px solid #10b981',
                            fontSize: '12px',
                            fontWeight: 700,
                            padding: '6px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          📷 Scan to Collect
                        </button>
                      ) : null}

                      {isNGO && (
                        <button 
                          type="button" 
                          onClick={() => onOpenDispute(item)} 
                          disabled={!isNearby}
                          style={{
                            background: 'transparent',
                            color: '#f87171',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '6px 10px',
                            borderRadius: '6px',
                            cursor: isNearby ? 'pointer' : 'not-allowed',
                            opacity: isNearby ? 1 : 0.45
                          }}
                          title={
                            isNearby
                              ? "Report dispute (within 300m)"
                              : `Must be at pickup site to dispute (${(distKm * 1000).toFixed(0)}m away, limit 300m)`
                          }
                        >
                          🚩 Dispute
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
