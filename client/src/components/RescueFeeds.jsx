import React, { useState } from 'react';
import { 
  RotateCw, 
  MapPin, 
  Phone, 
  Lock, 
  Unlock, 
  Clock, 
  AlertTriangle, 
  QrCode, 
  Camera, 
  ShieldAlert, 
  FileText, 
  ExternalLink 
} from 'lucide-react';
import { calculateDistance } from '../data/directory';
import PartnerFinder from './tinyfish/PartnerFinder';

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
  onOpenIncidentStatus,
  externalSearch = ''
}) {
  const isNGO = currentUser && (currentUser.role === 'NGO' || currentUser.role === 'ANIMAL_SHELTER');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [distanceFilter, setDistanceFilter] = useState('ALL'); // ALL, 5, 10, 20
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, AVAILABLE, CLAIMED
  const [sortOrder, setSortOrder] = useState('SOONEST'); // SOONEST, NEWEST
  const [selectedItem, setSelectedItem] = useState(null);

  const effectiveSearch = (externalSearch || searchQuery).toLowerCase().trim();

  const calculateRemainingMinutes = (createdAt, expiryHours) => {
    const created = new Date(createdAt).getTime();
    const expiry = created + (expiryHours * 60 * 60 * 1000);
    const now = Date.now();
    return Math.max(0, Math.floor((expiry - now) / (60 * 1000)));
  };

  const calculateRemainingTime = (createdAt, expiryHours) => {
    const diffMin = calculateRemainingMinutes(createdAt, expiryHours);
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    if (diffMin <= 0) return 'Expired';
    return `${hours}h ${mins}m remaining`;
  };

  // 1. Tab filtering
  let filtered = listings.filter(item => {
    if (currentTab === 'ANIMAL') {
      return item.status === 'DIVERTED_TO_ANIMALS' || item.expiry_hours <= 1;
    }
    return item.status !== 'DIVERTED_TO_ANIMALS';
  });

  // 2. Search query filter
  if (effectiveSearch) {
    filtered = filtered.filter(item => 
      (item.title && item.title.toLowerCase().includes(effectiveSearch)) ||
      (item.donor_name && item.donor_name.toLowerCase().includes(effectiveSearch)) ||
      (item.address && item.address.toLowerCase().includes(effectiveSearch)) ||
      (item.id && String(item.id).toLowerCase().includes(effectiveSearch))
    );
  }

  // 3. Status filter
  if (statusFilter !== 'ALL') {
    if (statusFilter === 'AVAILABLE') {
      filtered = filtered.filter(item => item.status === 'AVAILABLE' && !item.claimed_by);
    } else if (statusFilter === 'CLAIMED') {
      filtered = filtered.filter(item => item.status === 'CLAIMED' || Boolean(item.claimed_by));
    }
  }

  // 4. Distance filter
  const userLat = userCoords?.lat ?? 28.6139;
  const userLon = userCoords?.lon ?? 77.2090;

  if (distanceFilter !== 'ALL') {
    const maxKm = parseFloat(distanceFilter);
    filtered = filtered.filter(item => {
      const itemLat = item.coords?.lat ?? 28.6139;
      const itemLon = item.coords?.lon ?? 77.2090;
      const d = calculateDistance(userLat, userLon, itemLat, itemLon);
      return d <= maxKm;
    });
  }

  // 5. Sorting
  filtered.sort((a, b) => {
    if (sortOrder === 'SOONEST') {
      return calculateRemainingMinutes(a.created_at, a.expiry_hours) - calculateRemainingMinutes(b.created_at, b.expiry_hours);
    } else {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const activeSelected = selectedItem || filtered[0] || null;

  return (
    <div className="rescue-feeds-container">
      {/* Search and Filters Bar */}
      <div className="filters-bar">
        <input
          type="text"
          placeholder="Search donor, food item, or zone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: '200px' }}
          aria-label="Filter listings by search"
        />

        <select
          value={distanceFilter}
          onChange={(e) => setDistanceFilter(e.target.value)}
          aria-label="Filter by distance"
        >
          <option value="ALL">Distance: Any</option>
          <option value="5">Within 5 km</option>
          <option value="10">Within 10 km</option>
          <option value="25">Within 25 km</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="ALL">Status: All active</option>
          <option value="AVAILABLE">Available only</option>
          <option value="CLAIMED">Claimed only</option>
        </select>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          aria-label="Sort listings"
        >
          <option value="SOONEST">Soonest expiry first</option>
          <option value="NEWEST">Most recently posted</option>
        </select>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onRefresh}
          title="Refresh listings"
          aria-label="Refresh listings"
        >
          <RotateCw size={14} strokeWidth={1.5} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Information Banner */}
      <div style={{
        backgroundColor: 'var(--status-info-bg)',
        border: '1px solid var(--status-info-border)',
        borderRadius: 'var(--radius-xs)',
        padding: '10px 16px',
        marginBottom: '16px',
        fontSize: '0.8125rem',
        color: 'var(--status-info-text)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <Lock size={15} strokeWidth={1.5} flexShrink={0} />
        <span>
          Donor phone number and exact address unlock after you claim. Verified NGO credentials required for dispatch.
        </span>
      </div>

      {/* Two-Column Ruled Table + Detail Drawer Layout */}
      <div className="hub-layout">
        {/* Left Column: Listings Ruled Table */}
        <div className="table-responsive">
          <table className="ruled-table">
            <thead>
              <tr>
                <th>Food &amp; Quantity</th>
                <th>Donor</th>
                <th>Area</th>
                <th>Remaining</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '32px' }}>
                    No surplus consignments found matching your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isClaimed = Boolean(item.claimed_by || item.claimed_by_ngo || item.status === 'CLAIMED');
                  const isSelected = activeSelected && (activeSelected.id === item.id || activeSelected._id === item._id);

                  return (
                    <tr 
                      key={item.id || item._id}
                      onClick={() => setSelectedItem(item)}
                      style={{ 
                        cursor: 'pointer',
                        backgroundColor: isSelected ? 'var(--surface-alt)' : undefined
                      }}
                    >
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {item.quantity} · {item.category || 'Surplus'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{item.donor_name}</div>
                      </td>
                      <td>{getApproxArea(item.address)}</td>
                      <td>
                        <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.8125rem' }}>
                          {calculateRemainingTime(item.created_at, item.expiry_hours)}
                        </span>
                      </td>
                      <td>
                        <span className={`status-chip ${isClaimed ? 'info' : 'available'}`}>
                          {isClaimed ? 'Claimed' : 'Available'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem(item);
                          }}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Right Column: Selected Consignment Detail Drawer */}
        {activeSelected && (
          <aside className="detail-drawer-card" aria-label="Consignment Detail Drawer">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="label-caps">Consignment Details</span>
              <span className={`status-chip ${activeSelected.status === 'CLAIMED' ? 'info' : 'available'}`}>
                {activeSelected.status === 'CLAIMED' ? 'Claimed' : 'Available'}
              </span>
            </div>

            {activeSelected.image && (
              <img
                src={activeSelected.image}
                alt={activeSelected.title}
                className="detail-image"
              />
            )}

            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', marginBottom: '4px' }}>
              {activeSelected.title}
            </h3>

            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              {activeSelected.quantity} · {activeSelected.category || 'Surplus Food'}
            </p>

            {/* Privacy sensitive details check */}
            {(() => {
              const isClaimed = Boolean(activeSelected.claimed_by || activeSelected.claimed_by_ngo || activeSelected.status === 'CLAIMED');
              const isItemDonor = Boolean(
                currentUser && (
                  currentUser.role === 'DONOR' ||
                  (currentUser.id && activeSelected.donor_id && String(currentUser.id) === String(activeSelected.donor_id)) ||
                  (currentUser.name && activeSelected.donor_name && currentUser.name.toLowerCase() === activeSelected.donor_name.toLowerCase()) ||
                  (currentUser.phone && activeSelected.phone && currentUser.phone === activeSelected.phone)
                )
              );
              const isClaimant = Boolean(
                currentUser && isClaimed && (
                  (activeSelected.claimed_by && (
                    activeSelected.claimed_by.toLowerCase() === (currentUser.organization || '').toLowerCase() ||
                    activeSelected.claimed_by.toLowerCase() === (currentUser.name || '').toLowerCase()
                  )) ||
                  (activeSelected.claimed_by_ngo && (
                    activeSelected.claimed_by_ngo.toLowerCase() === (currentUser.organization || '').toLowerCase() ||
                    activeSelected.claimed_by_ngo.toLowerCase() === (currentUser.name || '').toLowerCase()
                  )) ||
                  (activeSelected.claimant_phone && currentUser.phone && activeSelected.claimant_phone === currentUser.phone)
                )
              );
              const canViewSensitive = Boolean(isItemDonor || isClaimant);

              const itemLat = activeSelected.coords?.lat ?? 28.6139;
              const itemLon = activeSelected.coords?.lon ?? 77.2090;
              const distKm = calculateDistance(userLat, userLon, itemLat, itemLon);
              const isNearby = distKm <= 0.3; // 300m dispute radius

              return (
                <div>
                  <div className="detail-meta-list">
                    <div className="detail-meta-item">
                      <span>Donor</span>
                      <span>{activeSelected.donor_name}</span>
                    </div>
                    <div className="detail-meta-item">
                      <span>Location</span>
                      <span>{canViewSensitive ? activeSelected.address : getApproxArea(activeSelected.address)}</span>
                    </div>
                    <div className="detail-meta-item">
                      <span>Distance</span>
                      <span>{distKm.toFixed(1)} km</span>
                    </div>
                    <div className="detail-meta-item">
                      <span>Remaining</span>
                      <span>{calculateRemainingTime(activeSelected.created_at, activeSelected.expiry_hours)}</span>
                    </div>
                    {isClaimed && (
                      <div className="detail-meta-item">
                        <span>Claimant</span>
                        <span>{activeSelected.claimed_by || activeSelected.claimed_by_ngo || 'Partner NGO'}</span>
                      </div>
                    )}
                  </div>

                  {/* Inspection summary */}
                  <div style={{
                    backgroundColor: 'var(--canvas)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '12px',
                    marginBottom: '16px',
                    fontSize: '0.75rem'
                  }}>
                    <div style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                      Inspection Summary
                    </div>
                    <div style={{ color: 'var(--text-primary)', marginBottom: '2px' }}>
                      AI photo check: {activeSelected.is_food_verified ? 'Verified surplus food' : 'Pending verification'}
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      Geofence coordinate stamped at {itemLat.toFixed(4)}N, {itemLon.toFixed(4)}E
                    </div>
                  </div>

                  {/* Donor contact unlock status */}
                  {canViewSensitive ? (
                    <div style={{
                      backgroundColor: 'var(--status-available-bg)',
                      border: '1px solid var(--status-available-border)',
                      borderRadius: 'var(--radius-xs)',
                      padding: '10px 12px',
                      marginBottom: '14px',
                      fontSize: '0.8125rem'
                    }}>
                      <div style={{ fontWeight: 700, color: 'var(--status-available-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Unlock size={14} strokeWidth={1.5} />
                        <span>Registered Donor Contact</span>
                      </div>
                      <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600 }}>{activeSelected.phone || 'Protected'}</span>
                        {activeSelected.phone && (
                          <a
                            href={`tel:${activeSelected.phone.replace(/\D/g, '')}`}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                          >
                            <Phone size={12} strokeWidth={1.5} />
                            <span>Call</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      backgroundColor: 'var(--canvas)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-xs)',
                      padding: '8px 12px',
                      marginBottom: '14px',
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <Lock size={13} strokeWidth={1.5} />
                      <span>Donor phone &amp; exact address unlock after claim.</span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {!isClaimed && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => onClaim(activeSelected)}
                        style={{ width: '100%' }}
                      >
                        Claim pickup
                      </button>
                    )}

                    {canViewSensitive && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${itemLat},${itemLon}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ width: '100%', justifyContent: 'center' }}
                      >
                        <MapPin size={15} strokeWidth={1.5} />
                        <span>Navigate to pickup</span>
                      </a>
                    )}

                    {isItemDonor && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => onOpenQR(activeSelected)}
                        style={{ width: '100%' }}
                      >
                        <QrCode size={15} strokeWidth={1.5} />
                        <span>Show pickup QR</span>
                      </button>
                    )}

                    {(isClaimant || isNGO) && isClaimed && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => onOpenScanner && onOpenScanner(activeSelected)}
                        style={{ width: '100%' }}
                      >
                        <Camera size={15} strokeWidth={1.5} />
                        <span>Scan handover code</span>
                      </button>
                    )}

                    {isClaimant && isClaimed && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => onOpenIncidentReport && onOpenIncidentReport(activeSelected)}
                          style={{ flex: 1 }}
                        >
                          Report safety issue
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => onOpenIncidentStatus && onOpenIncidentStatus(activeSelected)}
                          style={{ flex: 1 }}
                        >
                          Safety status
                        </button>
                      </div>
                    )}

                    {isNGO && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => onOpenDispute(activeSelected)}
                        disabled={!isNearby}
                        style={{ width: '100%', color: isNearby ? 'var(--status-critical-text)' : undefined }}
                        title={isNearby ? 'Dispute listing (within 300m)' : `Must be at location (${(distKm * 1000).toFixed(0)}m away, limit 300m)`}
                      >
                        <ShieldAlert size={14} strokeWidth={1.5} />
                        <span>Dispute consignment {isNearby ? '' : '(Locked >300m)'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </aside>
        )}
      </div>
    </div>
  );
}
