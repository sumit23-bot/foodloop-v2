import React from 'react';
import { ArrowRight, CheckCircle2, Clock, MapPin, ShieldCheck, QrCode } from 'lucide-react';
import LiveNewsTicker from '../components/tinyfish/LiveNewsTicker';

export default function OverviewPage({
  listings = [],
  onNavigate,
  onActionCard,
  onInspectListing
}) {
  // Ledger strip figures computed from real listings state
  const activeCount = listings.filter(i => i.status !== 'DIVERTED_TO_ANIMALS').length;
  const availableCount = listings.filter(i => i.status === 'AVAILABLE').length;
  const claimedCount = listings.filter(i => i.status === 'CLAIMED').length;
  const animalCount = listings.filter(i => i.status === 'DIVERTED_TO_ANIMALS' || i.expiry_hours <= 1).length;

  // Meal journey target listing: most recent claimed one, else most recent available
  const journeyListing = listings.find(l => l.status === 'CLAIMED') || listings[0] || null;

  // Five latest listings for live rescue board
  const latestListings = listings.slice(0, 5);

  const formatRemainingTime = (createdAt, expiryHours) => {
    if (!createdAt || !expiryHours) return '3h left';
    const created = new Date(createdAt).getTime();
    const expiry = created + (expiryHours * 60 * 60 * 1000);
    const now = Date.now();
    const diffMin = Math.max(0, Math.floor((expiry - now) / (60 * 1000)));
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    if (diffMin <= 0) return 'Expired';
    return `${hours}h ${mins}m left`;
  };

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

  return (
    <div className="overview-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Surplus food, accounted for.</h1>
            <p className="page-subtitle">
              Connecting verified donors, registered NGOs, and animal shelters across Delhi-NCR and Dehradun with full audit traceability.
            </p>
          </div>
          <div className="page-header-actions">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => onNavigate('RESCUE')}
            >
              Browse rescue hub
            </button>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={() => onNavigate('POST')}
            >
              Post surplus food
            </button>
          </div>
        </div>
      </div>

      {/* Ledger Strip */}
      <section className="ledger-strip" aria-label="Network Ledger">
        <div className="ledger-header">
          <div className="ledger-title">
            <span>Network Ledger</span>
            <span style={{ color: 'var(--text-tertiary)' }}>·</span>
            <span>24-Hour Dispatch</span>
          </div>
          <div className="ledger-meta">
            <span className="status-chip info">Demo data</span>
            <span>Synchronised with live state</span>
          </div>
        </div>

        <div className="ledger-grid">
          <div className="ledger-item">
            <span className="ledger-item-label">Active Listings in Window</span>
            <span className="ledger-item-value">{activeCount}</span>
            <span className="ledger-item-sub">Delhi-NCR &amp; Dehradun</span>
          </div>
          <div className="ledger-item">
            <span className="ledger-item-label">Available for Pickup</span>
            <span className="ledger-item-value">{availableCount}</span>
            <span className="ledger-item-sub">Awaiting partner claim</span>
          </div>
          <div className="ledger-item">
            <span className="ledger-item-label">Claimed Consignments</span>
            <span className="ledger-item-value">{claimedCount}</span>
            <span className="ledger-item-sub">Under active transfer</span>
          </div>
          <div className="ledger-item">
            <span className="ledger-item-label">Animal &amp; Gaushala Loop</span>
            <span className="ledger-item-value">{animalCount}</span>
            <span className="ledger-item-sub">Routed to animal shelters</span>
          </div>
        </div>
      </section>

      {/* Meal Journey Tracker */}
      <section className="journey-panel" aria-label="Meal Journey Tracker">
        <div className="journey-header">
          <div className="journey-title">
            <ShieldCheck size={16} strokeWidth={1.5} />
            <span>Audit Trail · Meal Journey Manifest</span>
          </div>
          {journeyListing && (
            <span className="status-chip available">
              {journeyListing.status === 'CLAIMED' ? 'Claimed by Partner' : 'Available on Board'}
            </span>
          )}
        </div>

        {journeyListing ? (
          <>
            <p className="journey-listing-ref">
              Consignment: <strong>{journeyListing.title}</strong> · {journeyListing.quantity} from {journeyListing.donor_name} ({getApproxArea(journeyListing.address)})
              {journeyListing.claimed_by && ` · Claimed by ${journeyListing.claimed_by}`}
            </p>

            <div className="journey-steps">
              {/* Step 1: Posted */}
              <div className="journey-step done">
                <div className="journey-step-circle">01</div>
                <div className="journey-step-title">Posted</div>
                <div className="journey-step-desc">
                  {new Date(journeyListing.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {getApproxArea(journeyListing.address)}
                  <br />
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Logged with GPS</span>
                </div>
              </div>

              {/* Step 2: Verified */}
              <div className="journey-step done">
                <div className="journey-step-circle">02</div>
                <div className="journey-step-title">Verified</div>
                <div className="journey-step-desc">
                  AI photo check passed
                  <br />
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Live proof verified</span>
                </div>
              </div>

              {/* Step 3: Claimed */}
              <div className={`journey-step ${journeyListing.status === 'CLAIMED' ? 'done' : 'active'}`}>
                <div className="journey-step-circle">03</div>
                <div className="journey-step-title">Claimed</div>
                <div className="journey-step-desc">
                  {journeyListing.claimed_by || journeyListing.claimed_by_ngo || 'Awaiting verified NGO claim'}
                  <br />
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                    {journeyListing.claimed_by ? 'Credentials verified' : 'Darpan ID required'}
                  </span>
                </div>
              </div>

              {/* Step 4: Handover */}
              <div className={`journey-step ${journeyListing.status === 'CLAIMED' ? 'active' : ''}`}>
                <div className="journey-step-circle">04</div>
                <div className="journey-step-title">Handover</div>
                <div className="journey-step-desc">
                  {journeyListing.status === 'CLAIMED' ? 'Awaiting QR scan on pickup' : 'Pending partner claim'}
                  <br />
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Single-use QR handshake</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <p>No consignments currently in transit. New surplus posts will appear here in real time.</p>
          </div>
        )}
      </section>

      {/* Two Column Grid: Live Rescue Board + Public Briefing */}
      <div className="overview-two-col">
        {/* Left Column: Live Rescue Board */}
        <div>
          <div className="card-section-title">
            <span>Live Rescue Board</span>
            <button 
              type="button" 
              className="btn btn-ghost btn-sm"
              onClick={() => onNavigate('RESCUE')}
            >
              View all listings <ArrowRight size={13} strokeWidth={1.5} />
            </button>
          </div>

          <div className="table-responsive">
            <table className="ruled-table">
              <thead>
                <tr>
                  <th>Food Consignment</th>
                  <th>Volume</th>
                  <th>Jurisdiction</th>
                  <th>Safety Window</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {latestListings.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '24px' }}>
                      No active listings on the rescue board.
                    </td>
                  </tr>
                ) : (
                  latestListings.map((item) => (
                    <tr key={item.id || item._id}>
                      <td style={{ fontWeight: 600 }}>{item.title}</td>
                      <td>{item.quantity}</td>
                      <td>{getApproxArea(item.address)}</td>
                      <td>{formatRemainingTime(item.created_at, item.expiry_hours)}</td>
                      <td>
                        <span className={`status-chip ${item.status === 'CLAIMED' ? 'info' : 'available'}`}>
                          {item.status === 'CLAIMED' ? 'Claimed' : 'Available'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            if (onInspectListing) onInspectListing(item);
                            else onNavigate('RESCUE');
                          }}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Public Briefing (TinyFish LiveNewsTicker) */}
        <div>
          <div className="card-section-title">
            <span>Public Briefing</span>
          </div>
          <LiveNewsTicker />
        </div>
      </div>

      {/* Numbered Clauses: How Rescue Works */}
      <section className="clauses-card" aria-label="How Rescue Works">
        <div className="label-caps">Protocol Overview</div>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginTop: '4px' }}>
          How surplus rescue operates in three clauses
        </h3>

        <div className="clauses-grid">
          <div className="clause-item">
            <span className="clause-num">Clause 01</span>
            <div className="clause-title">Proof Capture &amp; AI Check</div>
            <p className="clause-text">
              Donors capture real-time food proof or select gallery photos. Visual inspection and minimum 10 meals policy are verified before publishing to the board.
            </p>
          </div>

          <div className="clause-item">
            <span className="clause-num">Clause 02</span>
            <div className="clause-title">Verified NGO Claim</div>
            <p className="clause-text">
              Only authenticated NGOs and shelters unlock donor contact details and exact pickup addresses using verified Darpan ID credentials.
            </p>
          </div>

          <div className="clause-item">
            <span className="clause-num">Clause 03</span>
            <div className="clause-title">Zero-Waste Animal Loop</div>
            <p className="clause-text">
              Consignments nearing the end of safe consumption windows (&le; 1 hour) are safely diverted to registered gaushalas and stray feeders.
            </p>
          </div>
        </div>
      </section>

      {/* Get Involved Rows */}
      <section className="actions-card" aria-label="Participation Routes">
        <button type="button" className="action-row" onClick={() => onActionCard('DONATE')}>
          <div className="action-row-left">
            <span className="action-row-num">01</span>
            <div>
              <div className="action-row-title">Donate surplus food</div>
              <div className="action-row-desc">Turn today's excess cooked food into meals for community shelters.</div>
            </div>
          </div>
          <ArrowRight size={16} strokeWidth={1.5} color="var(--text-tertiary)" />
        </button>

        <button type="button" className="action-row" onClick={() => onActionCard('NGO')}>
          <div className="action-row-left">
            <span className="action-row-num">02</span>
            <div>
              <div className="action-row-title">Register as an NGO or shelter</div>
              <div className="action-row-desc">Authenticate with your Darpan ID to unlock sensitive donor locations and dispatch food.</div>
            </div>
          </div>
          <ArrowRight size={16} strokeWidth={1.5} color="var(--text-tertiary)" />
        </button>

        <button type="button" className="action-row" onClick={() => onActionCard('SPONSOR')}>
          <div className="action-row-left">
            <span className="action-row-num">03</span>
            <div>
              <div className="action-row-title">Sponsor a rescued meal</div>
              <div className="action-row-desc">Contribute ₹40 per meal to fund packaging, fuel, and last-mile logistics for NGO partners.</div>
            </div>
          </div>
          <ArrowRight size={16} strokeWidth={1.5} color="var(--text-tertiary)" />
        </button>

        <button type="button" className="action-row" onClick={() => onActionCard('SHARE')}>
          <div className="action-row-left">
            <span className="action-row-num">04</span>
            <div>
              <div className="action-row-title">Share the network initiative</div>
              <div className="action-row-desc">Spread word of the rescue network across residential associations and event caterers.</div>
            </div>
          </div>
          <ArrowRight size={16} strokeWidth={1.5} color="var(--text-tertiary)" />
        </button>
      </section>
    </div>
  );
}
