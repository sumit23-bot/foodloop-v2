import React, { useState, useRef } from 'react';
import { X, ShieldAlert, AlertCircle, UploadCloud, FileText } from 'lucide-react';

export const SEVERITY_LEVELS = [
  'Mild (no medical attention needed)',
  'Moderate (outpatient treatment)',
  'Severe (hospitalization required)',
  'Life-threatening (ICU / death)'
];

export default function ReportIncidentModal({
  isOpen,
  onClose,
  listing,
  currentUser,
  onIncidentSubmitted,
  showToast
}) {
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('Severe (hospitalization required)');
  const [documents, setDocuments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen || !listing) return null;

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} is larger than 5MB limit.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setDocuments(prev => [...prev, { name: file.name, data: event.target.result }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveDoc = (index) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!description.trim()) {
      alert('Please enter a description of the symptoms and safety issue.');
      return;
    }

    setSubmitting(true);
    const listingId = listing.id || listing._id;
    const token = localStorage.getItem('foodloop_auth_token') || '';

    try {
      const payload = {
        listingId,
        reporterId: currentUser?.id || currentUser?.phone || 'ngo_reporter',
        description: description.trim(),
        severity,
        documents: documents.map(d => d.data)
      };

      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        if (showToast) {
          showToast('Incident report filed successfully. Safety review initiated.');
        } else {
          alert('Incident report filed successfully.');
        }
        if (onIncidentSubmitted) {
          onIncidentSubmitted(data);
        }
        setDescription('');
        setDocuments([]);
        onClose();
      } else {
        alert(data.error || 'Failed to submit incident report.');
      }
    } catch (_err) {
      alert('Network error while filing incident. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isSerious = severity === 'Severe (hospitalization required)' || severity === 'Life-threatening (ICU / death)';

  return (
    <div id="report-incident-modal" className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog-panel modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-dialog-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} strokeWidth={1.5} color="var(--status-critical-text)" />
            <h3>Report Food Safety Incident</h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="modal-dialog-body">
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Listing: <strong>{listing.title}</strong>
            {listing.donor_name && <span> | Donor: <strong>{listing.donor_name}</strong></span>}
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{
              backgroundColor: 'var(--status-critical-bg)',
              border: '1px solid var(--status-critical-border)',
              borderRadius: 'var(--radius-xs)',
              padding: '12px 14px',
              marginBottom: '16px',
              fontSize: '0.8125rem',
              color: 'var(--status-critical-text)'
            }}>
              Food contamination incidents are subject to review. If verified, medical bills are primarily the donor's liability, supported by platform emergency coverage for severe cases.
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="incident-severity-select">
                Incident Severity Level
              </label>
              <select
                id="incident-severity-select"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                required
              >
                {SEVERITY_LEVELS.map(lvl => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>

            {isSerious && (
              <div style={{
                backgroundColor: 'var(--status-expiring-bg)',
                border: '1px solid var(--status-expiring-border)',
                color: 'var(--status-expiring-text)',
                fontSize: '0.75rem',
                padding: '8px 12px',
                borderRadius: 'var(--radius-xs)',
                marginBottom: '14px'
              }}>
                Higher risk incidents automatically qualify for formal review and liability adjudication.
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="incident-desc-input">
                Description &amp; Medical Details
              </label>
              <textarea
                id="incident-desc-input"
                rows={4}
                placeholder="Describe symptoms, number of affected individuals, time elapsed since consumption..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Supporting Medical Documents / Photos
              </label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud size={14} strokeWidth={1.5} />
                  <span>Attach document (Max 5MB)</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  {documents.length} attached
                </span>
              </div>

              {documents.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                  {documents.map((doc, idx) => (
                    <span 
                      key={idx}
                      className="status-chip info"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleRemoveDoc(idx)}
                      title="Click to remove"
                    >
                      {doc.name} &times;
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-danger"
                disabled={submitting}
              >
                {submitting ? 'Filing report...' : 'Submit Incident Report'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
