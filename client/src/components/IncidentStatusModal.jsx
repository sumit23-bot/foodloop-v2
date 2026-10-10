import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export default function IncidentStatusModal({ isOpen, onClose, listing, currentUser }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && listing) {
      setLoading(true);
      const listingId = listing.id || listing._id;
      const token = localStorage.getItem('foodloop_auth_token') || '';
      fetch(`/api/incidents?listingId=${listingId}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      })
        .then(r => r.json())
        .then(data => {
          setIncidents(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isOpen, listing]);

  if (!isOpen || !listing) return null;

  const incident = incidents[0] || null;

  return (
    <div id="incident-status-modal" className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog-panel modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-dialog-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} strokeWidth={1.5} color="var(--status-critical-text)" />
            <h3>Incident Resolution Status</h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="modal-dialog-body">
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Case tracking for <strong>{listing.title}</strong>
          </p>

          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
              Fetching resolution status...
            </div>
          ) : !incident ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
              No incident reports recorded for this donation.
            </div>
          ) : (
            <div>
              {/* Status Header Badge */}
              <div style={{
                backgroundColor: incident.status === 'CONFIRMED' ? 'var(--status-available-bg)' : incident.status === 'REJECTED' ? 'var(--canvas)' : 'var(--status-critical-bg)',
                border: `1px solid ${incident.status === 'CONFIRMED' ? 'var(--status-available-border)' : incident.status === 'REJECTED' ? 'var(--border)' : 'var(--status-critical-border)'}`,
                borderRadius: 'var(--radius-xs)',
                padding: '12px 14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <span className="label-caps" style={{ display: 'block', marginBottom: '2px' }}>
                    Incident Status
                  </span>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: incident.status === 'CONFIRMED' ? 'var(--status-available-text)' : incident.status === 'REJECTED' ? 'var(--text-secondary)' : 'var(--status-critical-text)'
                  }}>
                    {incident.status === 'CONFIRMED' ? 'Confirmed & Liability Resolved' : incident.status === 'REJECTED' ? 'Review Concluded / Rejected' : 'Pending Safety Review'}
                  </div>
                </div>
                <span className="status-chip info">
                  {incident.severity}
                </span>
              </div>

              {/* Description & Report Details */}
              <div style={{ backgroundColor: 'var(--canvas)', padding: '12px 14px', borderRadius: 'var(--radius-xs)', marginBottom: '16px', fontSize: '0.8125rem' }}>
                <div style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Reported by:
                </div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {incident.reporter_name || incident.reporterName} ({incident.reporter_org || incident.reporterOrg})
                </div>
                <div style={{ color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>
                  "{incident.description}"
                </div>
              </div>

              {/* If Confirmed: Show Bill Split Breakdown */}
              {incident.status === 'CONFIRMED' && (
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', padding: '16px', marginBottom: '16px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9375rem', fontWeight: 700 }}>
                    Reimbursement &amp; Liability Settlement
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ backgroundColor: 'var(--canvas)', padding: '10px 12px', borderRadius: 'var(--radius-xs)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Verified Medical Bill</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700 }} className="tabular-nums">
                        ₹{(incident.verified_bill_amount || incident.verifiedBillAmount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'var(--status-info-bg)', padding: '10px 12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--status-info-border)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--status-info-text)', fontWeight: 600 }}>Platform Reserve (20%)</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--status-info-text)' }} className="tabular-nums">
                        ₹{(incident.platform_contribution ?? incident.platformContribution ?? 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'var(--surface-alt)', padding: '12px', borderRadius: 'var(--radius-xs)', marginBottom: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Donor Outstanding Share:</span>
                      <strong style={{ fontSize: '1rem' }} className="tabular-nums">
                        ₹{(incident.donor_owes ?? incident.donorOwes ?? 0).toLocaleString('en-IN')}
                      </strong>
                    </div>
                    <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {(incident.donor_agreed_to_pay ?? incident.donorAgreedToPay) 
                        ? 'The donor has accepted liability and is settling the balance.' 
                        : 'The donor refused payment. This balance remains an outstanding obligation against the donor.'}
                    </p>
                  </div>
                </div>
              )}

              {/* If Reported: Still Under Review */}
              {incident.status === 'REPORTED' && (
                <div style={{ backgroundColor: 'var(--canvas)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-xs)', padding: '14px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  <strong>Investigation in Progress:</strong> The safety team is reviewing documentation. Once completed, liability settlement details will appear here.
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
