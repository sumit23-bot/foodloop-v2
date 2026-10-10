import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertCircle, CheckCircle2, RotateCw } from 'lucide-react';

export default function IncidentsPage({ currentUser, showToast, onOpenReportIncident }) {
  const isAdmin = currentUser?.role === 'ADMIN';
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
    fetchIncidents();
  }, [currentUser]);

  const handleSelect = (inc) => {
    setSelectedIncident(inc);
    setBillAmount(inc.verified_bill_amount || inc.verifiedBillAmount || '');
    setDonorAgreed(inc.donor_agreed_to_pay ?? false);
  };

  const handleResolve = async (status) => {
    if (!selectedIncident) return;
    const incId = selectedIncident.id || selectedIncident._id;

    if (status === 'CONFIRMED' && (!billAmount || Number(billAmount) <= 0)) {
      alert('Please enter a valid verified medical bill amount greater than ₹0.');
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
          showToast(`Incident ${status === 'CONFIRMED' ? 'confirmed & liability settled' : 'rejected'}`);
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
    <div className="incidents-page">
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Incidents &amp; disputes</h1>
            <p className="page-subtitle">
              {isAdmin
                ? 'Administrative safety board for dispute adjudication, medical claim verification, and liability determination.'
                : 'Safety records, reported disputes, and resolution status for surplus food consignments.'}
            </p>
          </div>
          <div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={fetchIncidents}
              disabled={loading}
            >
              <RotateCw size={13} strokeWidth={1.5} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Full Adjudication View */}
      {isAdmin ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Left Table / List */}
          <div className="surface-card" style={{ padding: '20px' }}>
            <div className="card-section-title">
              <span>Reported Incidents</span>
              <span className="status-chip info">{incidents.length} cases</span>
            </div>

            {loading ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>Loading incidents...</p>
            ) : incidents.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                No active safety incidents on file.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {incidents.map((inc) => {
                  const isSelected = selectedIncident && (selectedIncident.id === inc.id || selectedIncident._id === inc._id);
                  return (
                    <div
                      key={inc.id || inc._id}
                      onClick={() => handleSelect(inc)}
                      style={{
                        padding: '12px 14px',
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

          {/* Right Adjudication Panel */}
          {selectedIncident ? (
            <aside className="surface-card" style={{ padding: '20px' }}>
              <div className="card-section-title">
                <span>Adjudication &amp; Liability Settlement</span>
              </div>

              <div style={{ marginBottom: '14px', fontSize: '0.8125rem' }}>
                <div><strong>Listing:</strong> {selectedIncident.listing_title}</div>
                <div><strong>Donor:</strong> {selectedIncident.donor_name} (+91 {selectedIncident.donor_phone})</div>
                <div><strong>Severity:</strong> {selectedIncident.severity}</div>
                <div style={{ marginTop: '8px', padding: '10px', backgroundColor: 'var(--canvas)', borderRadius: 'var(--radius-xs)', color: 'var(--text-secondary)' }}>
                  "{selectedIncident.description}"
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
                <span>Donor agreed to cover verified medical expenses</span>
              </label>

              {/* Settlement summary */}
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
            </aside>
          ) : (
            <div className="surface-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              Select an incident from the list to review.
            </div>
          )}
        </div>
      ) : (
        /* Non-Admin View */
        <div>
          <div className="surface-card" style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '4px' }}>
              Safety &amp; Dispute Policy
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              If a food consignment was spoiled, unreachable, or missing upon arrival, you can file an on-spot dispute within 300 meters of the pickup location from the Rescue Hub.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <span className="status-chip available">300m GPS Verification Active</span>
              <span className="status-chip info">Multi-sig NGO Consensus</span>
            </div>
          </div>

          <div className="card-section-title">
            <span>Recent Incident Reports ({incidents.length})</span>
          </div>

          <div className="table-responsive">
            <table className="ruled-table">
              <thead>
                <tr>
                  <th>Listing</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Reported Date</th>
                </tr>
              </thead>
              <tbody>
                {incidents.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '24px' }}>
                      No active incident reports on file.
                    </td>
                  </tr>
                ) : (
                  incidents.map((inc) => (
                    <tr key={inc.id || inc._id}>
                      <td style={{ fontWeight: 600 }}>{inc.listing_title || `Listing #${inc.listing_id}`}</td>
                      <td>{inc.severity}</td>
                      <td>
                        <span className={`status-chip ${inc.status === 'CONFIRMED' ? 'available' : inc.status === 'REJECTED' ? 'critical' : 'expiring'}`}>
                          {inc.status || 'REPORTED'}
                        </span>
                      </td>
                      <td>{new Date(inc.created_at || Date.now()).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
