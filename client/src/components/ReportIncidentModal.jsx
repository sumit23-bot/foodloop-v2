import React, { useState, useRef } from 'react';

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
          showToast('⚠️ Incident report filed successfully. Safety review initiated.');
        } else {
          alert('⚠️ Incident report filed successfully.');
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
    } catch (err) {
      alert('Network error while filing incident. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isSerious = severity === 'Severe (hospitalization required)' || severity === 'Life-threatening (ICU / death)';

  return (
    <div id="report-incident-modal" className="modal-overlay" style={{ display: 'flex' }}>
      <div 
        className="auth-modal-card" 
        style={{ 
          maxWidth: '580px', 
          width: '95%', 
          maxHeight: '90vh', 
          overflowY: 'auto',
          background: '#0f172a',
          border: '1.5px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.25)'
        }}
      >
        <div className="modal-top-row" style={{ borderBottom: '1px solid #1e293b', paddingBottom: '12px', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>⚠️</span>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f87171' }}>
                Report Food Safety Incident
              </h3>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Listing: <strong style={{ color: '#f1f5f9' }}>{listing.title}</strong>
              {listing.donor_name && <span> | Donor: <strong style={{ color: '#cbd5e1' }}>{listing.donor_name}</strong></span>}
            </p>
          </div>
          <button type="button" className="close-x-btn" onClick={onClose} aria-label="Close Incident modal">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Legal Notice Box */}
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            fontSize: '12px',
            color: '#fca5a5',
            lineHeight: 1.5
          }}>
            <strong>⚖️ Statutory Safety Protocol:</strong> FoodLoop takes food contamination seriously under BNS Sections 274–275 &amp; FSSA 2006. If verified, medical bills are primarily the donor's liability, supported by FoodLoop's 20% Emergency Safety-Net for severe incidents.
          </div>

          {/* Severity Dropdown */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', color: '#e2e8f0', marginBottom: '6px', fontWeight: 700 }}>
              Incident Severity Level <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              id="incident-severity-select"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #334155',
                background: '#1e293b',
                color: '#f8fafc',
                fontSize: '13px',
                fontWeight: 600
              }}
              required
            >
              {SEVERITY_LEVELS.map(lvl => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>
          </div>

          {/* Serious Risk Indicator */}
          {isSerious && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              color: '#fde68a',
              fontSize: '11px',
              padding: '8px 12px',
              borderRadius: '8px',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>🚨</span>
              <span>
                <strong>Serious Life Risk:</strong> Automatically qualifies for FoodLoop 20% Safety-Net co-payment and formal legal escalation referral.
              </span>
            </div>
          )}

          {/* Detailed Description */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', color: '#e2e8f0', marginBottom: '6px', fontWeight: 700 }}>
              Description &amp; Medical Details <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              id="incident-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe symptoms, number of people affected, hospital/clinic visited, and doctor's observation..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #334155',
                background: '#1e293b',
                color: '#f8fafc',
                fontSize: '13px',
                lineHeight: 1.5,
                resize: 'vertical'
              }}
              required
            />
          </div>

          {/* Medical Documents / Bill Upload */}
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
              <span>📑 Medical Bills &amp; Prescriptions <span style={{ fontSize: '11px', color: '#64748b' }}>(Optional)</span></span>
              {documents.length > 0 && <span style={{ color: '#34d399', fontSize: '11px' }}>{documents.length} attached</span>}
            </label>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={{
                width: '100%',
                padding: '10px',
                background: '#1e293b',
                color: '#38bdf8',
                border: '1.5px dashed #38bdf8',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <i className="fa-solid fa-file-medical"></i> Attach Hospital Bill / Prescription / Report
            </button>

            {documents.length > 0 && (
              <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {documents.map((doc, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: '#334155',
                      color: '#f1f5f9',
                      fontSize: '11px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    📄 {doc.name.length > 20 ? doc.name.slice(0, 18) + '...' : doc.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveDoc(idx)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid #1e293b' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '10px 18px',
                background: '#1e293b',
                color: '#94a3b8',
                border: '1px solid #334155',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-incident-btn"
              disabled={submitting}
              style={{
                padding: '10px 22px',
                background: submitting ? '#64748b' : 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '13px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: submitting ? 'none' : '0 4px 14px rgba(239, 68, 68, 0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {submitting ? 'Filing Incident...' : '⚠️ Submit Incident Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
