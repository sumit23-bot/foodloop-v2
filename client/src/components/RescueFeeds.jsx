import React from 'react';
import { calculateDistance } from '../data/directory';

const getApproxArea = (fullAddress) => {
  if (!fullAddress) return 'Delhi-NCR';
  if (fullAddress.startsWith('GPS:')) return 'Delhi-NCR Pinpoint';
  const parts = fullAddress.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length >= 3) {
    return parts.slice(-3, -1).join(', ') || parts.slice(-2).join(', ');
  } else if (parts.length === 2) {
    return parts[1] || parts[0];
  }
  return parts[0] || 'Delhi-NCR';
};

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
  onOpenDashboard,
  onOpenIncidentReport,
  onOpenIncidentStatus
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
            const isClaimed = Boolean(item.claimed_by || item.claimed_by_ngo || item.status === 'CLAIMED');
            const isItemDonor = Boolean(
              currentUser && (
                currentUser.role === 'DONOR' ||
                (currentUser.id && item.donor_id && String(currentUser.id) === String(item.donor_id)) ||
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
            const canViewSensitiveDetails = Boolean(isItemDonor || isClaimant);

            const itemLat = item.coords?.lat ?? 28.6139;
            const itemLon = item.coords?.lon ?? 77.2090;
            const userLat = userCoords?.lat ?? 28.6139;
            const userLon = userCoords?.lon ?? 77.2090;
            const distKm = calculateDistance(userLat, userLon, itemLat, itemLon);
            const isNearby = distKm <= 0.3; // 300m limit

            return (
              <article key={item.id || item._id} className="feed-card" style={{
                background: '#111827',
                border: isClaimant ? '1.5px solid #10b981' : '1.5px solid #334155',
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
                        background: isClaimant ? 'rgba(16, 185, 129, 0.25)' : isClaimed ? 'rgba(56, 189, 248, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                        color: isClaimant ? '#34d399' : isClaimed ? '#38bdf8' : '#34d399',
                        border: isClaimant ? '1px solid #10b981' : isClaimed ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)'
                      }}>
                        {isClaimant ? '🎉 Claimed by You' : isClaimed ? `🔒 Claimed (${item.claimed_by || item.claimed_by_ngo || 'Partner'})` : '🟢 Available'}
                      </span>
                    </div>

                    <p style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>
                      <strong>Qty:</strong> {item.quantity} · <strong>Donor:</strong> {item.donor_name}
                    </p>

                    {/* Pickup Address & General Location Area */}
                    <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', lineHeight: 1.4 }}>
                      {canViewSensitiveDetails ? (
                        <>
                          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>📍 {item.address}</span>
                          <span style={{ color: '#10b981', fontSize: '11px', fontWeight: 700, marginLeft: '6px' }}>
                            <i className="fa-solid fa-unlock-keyhole"></i> Full Location Unlocked
                          </span>
                        </>
                      ) : (
                        <>
                          <span style={{ color: '#cbd5e1' }}>📍 Approx. Area: {getApproxArea(item.address)}</span>
                          <span style={{ color: '#38bdf8', fontSize: '11px', fontWeight: 600, marginLeft: '6px' }}>
                            <i className="fa-solid fa-lock"></i> Exact address unlocked on claim
                          </span>
                        </>
                      )}
                      <span style={{ color: '#fbbf24', fontWeight: 700, marginLeft: '8px' }}>⏳ {timeLeft}</span>
                    </p>

                    {/* Sensitive Donor Mobile Contact: Revealed only to claimant or donor */}
                    {canViewSensitiveDetails ? (
                      <div style={{
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        marginBottom: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}>
                        <div>
                          <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', fontWeight: 700, letterSpacing: '0.5px' }}>
                            🔓 {isItemDonor ? 'YOUR REGISTERED DONOR CONTACT' : 'REVEALED DONOR CONTACT'}
                          </span>
                          <strong style={{ fontSize: '13px', color: '#34d399', letterSpacing: '0.3px' }}>
                            📞 {item.phone || (currentUser?.phone ?? '9876543210')}
                          </strong>
                        </div>
                        {item.phone && (
                          <a 
                            href={`tel:${item.phone.replace(/\D/g, '')}`}
                            style={{
                              background: '#10b981',
                              color: '#000',
                              fontWeight: 800,
                              fontSize: '11px',
                              padding: '5px 12px',
                              borderRadius: '6px',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <i className="fa-solid fa-phone"></i> Call Donor
                          </a>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        fontSize: '11px',
                        color: '#64748b',
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <i className="fa-solid fa-shield-halved" style={{ color: '#94a3b8' }}></i>
                        <span>Donor mobile number & exact location are protected. Claim pickup to reveal.</span>
                      </div>
                    )}

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

                      {/* GPS Navigation: Unlocked only to claimant or donor */}
                      {canViewSensitiveDetails ? (
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
                          🧭 Navigate to Pickup
                        </a>
                      ) : (
                        <span 
                          style={{
                            background: '#1e293b',
                            color: '#64748b',
                            fontWeight: 700,
                            fontSize: '12px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'not-allowed',
                            border: '1px dashed #334155'
                          }}
                          title="Claim this donation first to unlock GPS navigation and exact pickup coordinates"
                        >
                          <i className="fa-solid fa-lock" style={{ fontSize: '10px' }}></i> Navigate (Locked)
                        </span>
                      )}

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
                      ) : (isClaimant || isNGO) && isClaimed ? (
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

                      {isClaimant && isClaimed && (
                        <>
                          <button 
                            type="button" 
                            onClick={() => onOpenIncidentReport && onOpenIncidentReport(item)} 
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              color: '#f87171',
                              border: '1px solid #ef4444',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '6px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Report food safety hazard or medical incident from this donation"
                          >
                            ⚠️ Report Food Safety Issue
                          </button>
                          <button 
                            type="button" 
                            onClick={() => onOpenIncidentStatus && onOpenIncidentStatus(item)} 
                            style={{
                              background: '#1e293b',
                              color: '#38bdf8',
                              border: '1px solid #38bdf8',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '6px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="View incident liability and reimbursement status"
                          >
                            📋 Safety Status
                          </button>
                        </>
                      )}

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
