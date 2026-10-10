import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

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
      const token = localStorage.getItem('foodloop_auth_token') || '';
      const res = await fetch('/api/incidents', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
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
      const token = localStorage.getItem('foodloop_auth_token') || '';
      const payload = {
        status,
        verifiedBillAmount: Number(billAmount) || 0,
        donorAgreedToPay: donorAgreed
      };

      const res = await fetch(`/api/incidents/${incId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(payload)
      });

      const updated = await res.json();
      if (res.ok) {
        if (showToast) {
          showToast(`Incident ${status === 'CONFIRMED' ? 'confirmed & resolved' : 'rejected'}`);
        }
        setSelectedIncident(updated);
        fetchIncidents();
      } else {
        alert(updated.error || 'Failed to update incident.');
      }
    } catch (_err) {
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

  const previewDonorOwes = (!donorAgreed || isSevereOrLifeRisk) 
    ? Math.round(bill * 0.8 * 100) / 100 
    : Math.round(bill * 100) / 100;

  const previewPlatformContrib = (!donorAgreed || isSevereOrLifeRisk) 
    ? Math.round((bill - previewDonorOwes) * 100) / 100 
    : 0;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog-panel modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-dialog-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={20} strokeWidth={1.5} color="var(--status-critical-text)" />
            <h3>Safety Admin Liability Resolution</h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="modal-dialog-body" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
          {/* Left Column: Incidents List */}
          <div>
            <div className="card-section-title">
              <span>Reported Incidents</span>
              <span className="status-chip info">{incidents.length} cases</span>
            </div>

            {loading ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>Loading incidents...</p>
            ) : incidents.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)' }}>
                No active safety incidents on file.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto' }}>
                {incidents.map((inc) => {
                  const isSelected = selectedIncident && (selectedIncident.id === inc.id || selectedIncident._id === inc._id);
                  return (
                    <div
                      key={inc.id || inc._id}
                      onClick={() => handleSelect(inc)}
                      style={{
                        padding: '12px',
                        border: isSelected ? '2px solid var(--graphite)' : '1px solid var(--border)',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: isSelected ? 'var(--surface-alt)' : 'var(--surface)',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{inc.listing_title || `Listing #${inc.listing_id}`}</span>
                        <span className={`status-chip ${inc.status === 'CONFIRMED' ? 'available' : inc.status === 'REJECTED' ? 'critical' : 'expiring'}`}>
                          {inc.status || 'REPORTED'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Reporter: {inc.reporter_org || inc.reporter_name} · Severity: {inc.severity}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Adjudication Form */}
          {selectedIncident ? (
            <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '20px' }}>
              <div className="card-section-title">
                <span>Adjudication &amp; Liability</span>
              </div>

              <div style={{ marginBottom: '14px', fontSize: '0.8125rem' }}>
                <div><strong>Listing:</strong> {selectedIncident.listing_title}</div>
                <div><strong>Donor:</strong> {selectedIncident.donor_name} (+91 {selectedIncident.donor_phone})</div>
                <div><strong>Severity:</strong> {selectedIncident.severity}</div>
                <div style={{ marginTop: '6px', color: 'var(--text-secondary)' }}>
                  {selectedIncident.description}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Verified Medical Bill (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  min="0"
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', marginBottom: '16px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={donorAgreed}
                  onChange={(e) => setDonorAgreed(e.target.checked)}
                />
                <span>Donor agreed to settle expenses</span>
              </label>

              {/* Liability calculation summary */}
              <div style={{ backgroundColor: 'var(--canvas)', padding: '12px', borderRadius: 'var(--radius-xs)', marginBottom: '16px', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Donor liability (80% / 100%):</span>
                  <strong>₹{previewDonorOwes.toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Platform reserve (20%):</span>
                  <strong>₹{previewPlatformContrib.toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: previewEscalates ? 'var(--status-critical-text)' : 'var(--text-secondary)' }}>
                  <span>Statutory escalation:</span>
                  <strong>{previewEscalates ? 'Legal notice triggered' : 'Resolved amicably'}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={actionLoading}
                  onClick={() => handleResolve('CONFIRMED')}
                  style={{ flex: 1 }}
                >
                  Confirm &amp; Settle
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  disabled={actionLoading}
                  onClick={() => handleResolve('REJECTED')}
                  style={{ flex: 1 }}
                >
                  Reject Claim
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
              Select an incident from the list to adjudicate.
            </div>
          )}
        </div>

        <div className="modal-dialog-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
