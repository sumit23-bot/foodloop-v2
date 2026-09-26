import React, { useState, useEffect } from 'react';

export default function IncidentStatusModal({ isOpen, onClose, listing, currentUser }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && listing) {
      const listingId = listing.id || listing._id;
      setLoading(true);
      fetch(`/api/incidents?listingId=${listingId}`)
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
    <div id="incident-status-modal" className="modal-overlay" style={{ display: 'flex' }}>
      <div 
        className="auth-modal-card" 
        style={{ 
          maxWidth: '600px', 
          width: '95%', 
          maxHeight: '90vh', 
          overflowY: 'auto',
          background: '#0f172a',
          border: '1.5px solid #334155',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)'
        }}
      >
        <div className="modal-top-row" style={{ borderBottom: '1px solid #1e293b', paddingBottom: '12px', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>📋</span>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
                Food Safety Incident Resolution Status
              </h3>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Transparent case tracking for <strong style={{ color: '#f1f5f9' }}>{listing.title}</strong>
            </p>
          </div>
          <button type="button" className="close-x-btn" onClick={onClose} aria-label="Close Status modal">✕</button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            Fetching resolution status...
          </div>
        ) : !incident ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            No incident reports recorded for this donation.
          </div>
        ) : (
          <div>
            {/* Status Header Badge */}
            <div style={{
              background: incident.status === 'CONFIRMED' ? 'rgba(16, 185, 129, 0.15)' : incident.status === 'REJECTED' ? 'rgba(148, 163, 184, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${incident.status === 'CONFIRMED' ? '#10b981' : incident.status === 'REJECTED' ? '#64748b' : '#ef4444'}`,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', fontWeight: 700 }}>
                  Current Incident Status
                </span>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  color: incident.status === 'CONFIRMED' ? '#34d399' : incident.status === 'REJECTED' ? '#cbd5e1' : '#f87171'
                }}>
                  {incident.status === 'CONFIRMED' ? '✓ Confirmed & Liability Resolved' : incident.status === 'REJECTED' ? '✕ Review Concluded / Rejected' : '⚠️ Pending Safety Review'}
                </div>
              </div>
              <span style={{
                background: '#1e293b',
                color: '#cbd5e1',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700
              }}>
                {incident.severity}
              </span>
            </div>

            {/* Description & Report Details */}
            <div style={{ background: '#111827', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '12px' }}>
              <div style={{ color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>REPORTED BY:</div>
              <div style={{ color: '#f1f5f9', fontWeight: 600 }}>{incident.reporter_name || incident.reporterName} ({incident.reporter_org || incident.reporterOrg})</div>
              <div style={{ color: '#94a3b8', marginTop: '6px', lineHeight: 1.5 }}>"{incident.description}"</div>
            </div>

            {/* If Confirmed: Show Bill Split Breakdown */}
            {incident.status === 'CONFIRMED' && (
              <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#38bdf8', fontWeight: 800 }}>
                  💰 Reimbursement &amp; Liability Split
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ background: '#111827', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Total Verified Hospital Bill</span>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
                      ₹{(incident.verified_bill_amount || incident.verifiedBillAmount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                    <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700 }}>FoodLoop Safety-Net (20%)</span>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
                      ₹{(incident.platform_contribution ?? incident.platformContribution ?? 0).toLocaleString('en-IN')}
                    </div>
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>Immediate emergency contribution</span>
                  </div>
                </div>

                <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 700 }}>Donor Outstanding Share</span>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#fbbf24', marginTop: '2px' }}>
                        ₹{(incident.donor_owes ?? incident.donorOwes ?? 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      Donor: <strong style={{ color: '#f1f5f9' }}>{incident.donor_name || incident.donorName}</strong>
                    </span>
                  </div>
                  <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#cbd5e1', lineHeight: 1.4 }}>
                    {(incident.donor_agreed_to_pay ?? incident.donorAgreedToPay) 
                      ? 'The donor has accepted liability and is processing payment for the balance.' 
                      : 'The donor refused payment. This balance remains an enforceable outstanding debt against the donor.'}
                  </p>
                </div>

                {/* Legal Escalation Notice */}
                {(incident.legal_escalation || incident.legalEscalation) && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px', fontSize: '11px', color: '#fca5a5', lineHeight: 1.5 }}>
                    <strong>⚖️ Formal Legal Referral Initiated:</strong>
                    <div style={{ marginTop: '4px' }}>
                      Due to the severity of the incident and/or refusal of the donor to cover medical costs, formal referral has been documented under:
                      <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                        {((incident.legal_basis || incident.legalBasis) || []).map((b, i) => (
                          <li key={i}><strong>{b}</strong></li>
                        ))}
                      </ul>
                      Donor account has been suspended with 0 trust score. FoodLoop will cooperate fully with medical authorities.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* If Reported: Still Under Review */}
            {incident.status === 'REPORTED' && (
              <div style={{ background: '#111827', border: '1px dashed #334155', borderRadius: '8px', padding: '14px', fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
                ⏳ <strong>Investigation in Progress:</strong> FoodLoop's safety panel is reviewing the hospital documents and contacting the donor. Once verified, the liability settlement breakdown will appear here.
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #1e293b' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: '#1e293b',
              color: '#cbd5e1',
              border: '1px solid #334155',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
