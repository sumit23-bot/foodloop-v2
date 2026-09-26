import React, { useState, useEffect } from 'react';

export default function AdminIncidentModal({ isOpen, onClose, showToast }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [billAmount, setBillAmount] = useState('');
  const [donorAgreed, setDonorAgreed] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/incidents');
      if (res.ok) {
        const data = await res.json();
        setIncidents(data);
        if (data.length > 0 && !selectedIncident) {
          setSelectedIncident(data[0]);
          setBillAmount(data[0].verified_bill_amount || data[0].verifiedBillAmount || '');
          setDonorAgreed(data[0].donor_agreed_to_pay ?? false);
        }
      }
    } catch (err) {
      console.warn('Failed to load incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchIncidents();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (inc) => {
    setSelectedIncident(inc);
    setBillAmount(inc.verified_bill_amount || inc.verifiedBillAmount || '');
    setDonorAgreed(inc.donor_agreed_to_pay ?? false);
  };

  const handleResolve = async (status) => {
    if (!selectedIncident) return;
    const incId = selectedIncident.id || selectedIncident._id;

    if (status === 'CONFIRMED' && (!billAmount || Number(billAmount) <= 0)) {
      alert('Please enter a valid verified bill amount greater than ₹0.');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        status,
        verifiedBillAmount: Number(billAmount) || 0,
        donorAgreedToPay: donorAgreed
      };

      const res = await fetch(`/api/incidents/${incId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const updated = await res.json();
      if (res.ok) {
        if (showToast) {
          showToast(`✅ Incident ${status === 'CONFIRMED' ? 'confirmed & resolved' : 'rejected'}`);
        }
        setSelectedIncident(updated);
        fetchIncidents();
      } else {
        alert(updated.error || 'Failed to update incident.');
      }
    } catch (err) {
      alert('Network error while resolving incident.');
    } finally {
      setActionLoading(false);
    }
  };

  const bill = Math.max(0, Number(billAmount) || 0);
  const severity = selectedIncident?.severity || '';
  const isSevereOrLifeRisk = 
    severity === 'Severe (hospitalization required)' || 
    severity === 'Life-threatening (ICU / death)';
  const previewEscalates = !donorAgreed || isSevereOrLifeRisk;
  const previewDonorShare = previewEscalates ? Math.round(bill * 0.8) : bill;
  const previewPlatformShare = previewEscalates ? Math.round(bill * 0.2) : 0;

  return (
    <div id="admin-incidents-modal" className="modal-overlay" style={{ display: 'flex' }}>
      <div 
        className="auth-modal-card" 
        style={{ 
          maxWidth: '900px', 
          width: '95%', 
          maxHeight: '90vh', 
          display: 'flex', 
          flexDirection: 'column',
          background: '#0f172a',
          border: '1.5px solid #475569',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
        }}
      >
        {/* Top Header */}
        <div className="modal-top-row" style={{ borderBottom: '1px solid #1e293b', paddingBottom: '12px', marginBottom: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>⚖️</span>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
                FoodLoop Safety Admin — Incident Liability &amp; Dispute Board
              </h3>
              <span style={{ background: '#ef4444', color: '#fff', fontSize: '11px', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                ADMIN
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Review food safety claims, apply statutory 80/20 liability split, and execute donor referrals.
            </p>
          </div>
          <button type="button" className="close-x-btn" onClick={onClose} aria-label="Close Admin modal">✕</button>
        </div>

        {/* Content Body: Left Column List + Right Column Detail/Action */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '16px', flex: 1, minHeight: '380px', overflow: 'hidden' }}>
          {/* Left Column: Incidents List */}
          <div style={{
            background: '#090d16',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            overflowY: 'auto',
            padding: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderBottom: '1px solid #1e293b' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>
                Reported Incidents ({incidents.length})
              </span>
              <button 
                type="button" 
                onClick={fetchIncidents}
                style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '11px', cursor: 'pointer' }}
              >
                🔄 Refresh
              </button>
            </div>

            {loading ? (
              <p style={{ padding: '20px', color: '#64748b', fontSize: '12px', textAlign: 'center' }}>Loading incidents...</p>
            ) : incidents.length === 0 ? (
              <p style={{ padding: '30px 10px', color: '#64748b', fontSize: '12px', textAlign: 'center' }}>No safety incidents reported yet.</p>
            ) : (
              incidents.map((inc) => {
                const isSelected = selectedIncident && (selectedIncident.id === inc.id || selectedIncident._id === inc._id);
                const status = inc.status || 'REPORTED';
                const statusBg = status === 'CONFIRMED' ? 'rgba(16, 185, 129, 0.2)' : status === 'REJECTED' ? 'rgba(148, 163, 184, 0.2)' : 'rgba(239, 68, 68, 0.2)';
                const statusColor = status === 'CONFIRMED' ? '#34d399' : status === 'REJECTED' ? '#94a3b8' : '#f87171';

                return (
                  <div
                    key={inc.id || inc._id}
                    onClick={() => handleSelect(inc)}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      marginBottom: '6px',
                      background: isSelected ? 'rgba(56, 189, 248, 0.15)' : '#111827',
                      border: isSelected ? '1px solid #38bdf8' : '1px solid #1e293b',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#f1f5f9' }}>
                        {inc.listing_title || inc.listingTitle || 'Food Donation'}
                      </span>
                      <span style={{ background: statusBg, color: statusColor, fontSize: '10px', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                        {status}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      Donor: <strong style={{ color: '#cbd5e1' }}>{inc.donor_name || inc.donorName || 'Donor'}</strong>
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                      {inc.severity}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Active Incident Review & Liability Action */}
          <div style={{
            background: '#090d16',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {!selectedIncident ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', fontSize: '13px' }}>
                Select an incident from the left to inspect and review liability.
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', color: '#f8fafc' }}>
                      {selectedIncident.listing_title || selectedIncident.listingTitle}
                    </h4>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      Incident ID: {selectedIncident.id || selectedIncident._id}
                    </span>
                  </div>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 800,
                    background: selectedIncident.status === 'CONFIRMED' ? 'rgba(16, 185, 129, 0.2)' : selectedIncident.status === 'REJECTED' ? '#334155' : 'rgba(239, 68, 68, 0.2)',
                    color: selectedIncident.status === 'CONFIRMED' ? '#34d399' : selectedIncident.status === 'REJECTED' ? '#94a3b8' : '#f87171'
                  }}>
                    {selectedIncident.status}
                  </span>
                </div>

                {/* Metadata Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#111827', padding: '10px', borderRadius: '8px', marginBottom: '12px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Donor:</span>{' '}
                    <strong style={{ color: '#f1f5f9' }}>{selectedIncident.donor_name || selectedIncident.donorName}</strong>
                    <div style={{ color: '#94a3b8', fontSize: '11px' }}>📞 {selectedIncident.donor_phone || selectedIncident.donorPhone || 'N/A'}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Reporter:</span>{' '}
                    <strong style={{ color: '#f1f5f9' }}>{selectedIncident.reporter_name || selectedIncident.reporterName}</strong>
                    <div style={{ color: '#94a3b8', fontSize: '11px' }}>🏛️ {selectedIncident.reporter_org || selectedIncident.reporterOrg}</div>
                  </div>
                </div>

                {/* Severity Badge */}
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8', marginRight: '6px' }}>Severity:</span>
                  <span style={{
                    background: isSevereOrLifeRisk ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: isSevereOrLifeRisk ? '#f87171' : '#fbbf24',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700
                  }}>
                    {selectedIncident.severity}
                  </span>
                </div>

                {/* Incident Description */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Reported Symptoms &amp; Notes</label>
                  <div style={{ background: '#1e293b', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', color: '#cbd5e1', marginTop: '4px', lineHeight: 1.5 }}>
                    {selectedIncident.description}
                  </div>
                </div>

                {/* Documents / Hospital bills */}
                {selectedIncident.documents && selectedIncident.documents.length > 0 && (
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Medical Records / Bills ({selectedIncident.documents.length})</label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                      {selectedIncident.documents.map((doc, idx) => (
                        <a
                          key={idx}
                          href={doc}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            background: '#1e293b',
                            border: '1px solid #334155',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            color: '#38bdf8',
                            fontSize: '11px',
                            fontWeight: 700,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          📄 View Document #{idx + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* If already CONFIRMED: show confirmed settlement */}
                {selectedIncident.status === 'CONFIRMED' ? (
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '8px', padding: '14px', marginTop: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontWeight: 800, fontSize: '13px', marginBottom: '8px' }}>
                      <span>✓</span> Finalized Incident Liability Resolution
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                      <div>
                        <span style={{ color: '#94a3b8' }}>Verified Hospital Bill:</span>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#f1f5f9' }}>
                          ₹{(selectedIncident.verified_bill_amount || selectedIncident.verifiedBillAmount || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8' }}>Donor Payment Decision:</span>
                        <div style={{ fontWeight: 700, color: (selectedIncident.donor_agreed_to_pay ?? selectedIncident.donorAgreedToPay) ? '#34d399' : '#f87171' }}>
                          {(selectedIncident.donor_agreed_to_pay ?? selectedIncident.donorAgreedToPay) ? 'Agreed to pay' : 'Refused to pay'}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8' }}>Donor Primary Liability:</span>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#fbbf24' }}>
                          ₹{(selectedIncident.donor_owes ?? selectedIncident.donorOwes ?? 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8' }}>FoodLoop 20% Contribution:</span>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#38bdf8' }}>
                          ₹{(selectedIncident.platform_contribution ?? selectedIncident.platformContribution ?? 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    {(selectedIncident.legal_escalation || selectedIncident.legalEscalation) && (
                      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '11px', color: '#fca5a5' }}>
                        🚨 <strong>Formal Legal Escalation Active:</strong> Referred under {((selectedIncident.legal_basis || selectedIncident.legalBasis) || []).join(', ')}. Donor account trust score reduced to 0 &amp; suspended.
                      </div>
                    )}
                  </div>
                ) : (
                  /* Admin Action Form for Pending Incidents */
                  <div style={{ background: '#111827', border: '1px solid #334155', borderRadius: '8px', padding: '14px', marginTop: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#f1f5f9', marginBottom: '10px' }}>
                      ⚡ Admin Adjudication &amp; Liability Resolution
                    </div>

                    <div className="form-group" style={{ marginBottom: '10px' }}>
                      <label style={{ fontSize: '11px', color: '#cbd5e1', marginBottom: '4px', fontWeight: 700 }}>
                        Verified Hospital / Medical Bill (₹) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="number"
                        id="admin-verified-bill-input"
                        placeholder="e.g. 50000"
                        value={billAmount}
                        onChange={(e) => setBillAmount(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #334155',
                          background: '#1e293b',
                          color: '#f8fafc',
                          fontSize: '13px',
                          fontWeight: 700
                        }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '14px' }}>
                      <label style={{ fontSize: '11px', color: '#cbd5e1', marginBottom: '4px', fontWeight: 700 }}>
                        Donor Co-operation / Payment Agreement
                      </label>
                      <select
                        id="admin-donor-agreed-select"
                        value={donorAgreed ? 'true' : 'false'}
                        onChange={(e) => setDonorAgreed(e.target.value === 'true')}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #334155',
                          background: '#1e293b',
                          color: '#f8fafc',
                          fontSize: '12px',
                          fontWeight: 600
                        }}
                      >
                        <option value="true">🤝 Donor Agreed to Pay Full Medical Bill</option>
                        <option value="false">🚫 Donor Refused to Pay / Serious Incident Escalation</option>
                      </select>
                    </div>

                    {/* Real-time Calculation Preview */}
                    {bill > 0 && (
                      <div style={{ background: '#090d16', border: '1px dashed #334155', borderRadius: '8px', padding: '10px', marginBottom: '14px', fontSize: '12px' }}>
                        <div style={{ fontWeight: 800, color: '#38bdf8', marginBottom: '6px' }}>
                          Calculated Liability Split Preview:
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ color: '#94a3b8' }}>Donor Share ({previewEscalates ? '80%' : '100%'}):</span>
                          <strong style={{ color: '#fbbf24' }}>₹{previewDonorShare.toLocaleString('en-IN')}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ color: '#94a3b8' }}>FoodLoop Safety-Net ({previewEscalates ? '20%' : '0%'}):</span>
                          <strong style={{ color: '#34d399' }}>₹{previewPlatformShare.toLocaleString('en-IN')}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid #1e293b' }}>
                          <span style={{ color: '#94a3b8' }}>Legal Escalation:</span>
                          <strong style={{ color: previewEscalates ? '#f87171' : '#34d399' }}>
                            {previewEscalates ? '🚨 Triggered (BNS 274, 275 & FSSA 59)' : 'No (Amicable Resolution)'}
                          </strong>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => handleResolve('REJECTED')}
                        disabled={actionLoading}
                        style={{
                          padding: '8px 14px',
                          background: '#334155',
                          color: '#cbd5e1',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Reject Incident
                      </button>
                      <button
                        type="button"
                        id="confirm-incident-resolution-btn"
                        onClick={() => handleResolve('CONFIRMED')}
                        disabled={actionLoading}
                        style={{
                          padding: '8px 18px',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: '#000',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: 800,
                          fontSize: '12px',
                          cursor: actionLoading ? 'not-allowed' : 'pointer',
                          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        {actionLoading ? 'Confirming...' : 'Confirm & Apply Liability Split'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
