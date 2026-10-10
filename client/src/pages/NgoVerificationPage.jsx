import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import NgoWebCheck from '../components/tinyfish/NgoWebCheck';

export default function NgoVerificationPage() {
  const [orgName, setOrgName] = useState('');
  const [city, setCity] = useState('Delhi');
  const [darpanId, setDarpanId] = useState('');
  const [formatStatus, setFormatStatus] = useState(null); // 'VALID', 'INVALID', null

  const handleValidateFormat = (e) => {
    e.preventDefault();
    const clean = darpanId.trim().toUpperCase();
    const isValid = /^[A-Z]{2}\/\d{4}\/\d{5,8}$/i.test(clean);
    setFormatStatus(isValid ? 'VALID' : 'INVALID');
  };

  return (
    <div className="ngo-verification-page">
      <div className="page-header">
        <h1 className="page-title">NGO verification</h1>
        <p className="page-subtitle">
          Verify partner registration format and public web footprint for participating non-governmental organisations.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Verification Form Card */}
        <div className="surface-card" style={{ padding: '24px' }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '4px' }}>
            Organisation Credentials Check
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Check Darpan ID structural format and scan public web presence.
          </p>

          <form onSubmit={handleValidateFormat}>
            <div className="form-group">
              <label className="form-label" htmlFor="verify-org-name">Organisation Name</label>
              <input
                id="verify-org-name"
                type="text"
                placeholder="e.g. Robin Hood Army, Feeding India"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="verify-city">City / Jurisdiction</label>
              <input
                id="verify-city"
                type="text"
                placeholder="e.g. Delhi, Noida, Gurgaon, Dehradun"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="verify-darpan">Darpan ID</label>
              <input
                id="verify-darpan"
                type="text"
                placeholder="e.g. DL/2018/0192831 or UK/2015/0092341"
                value={darpanId}
                onChange={(e) => {
                  setDarpanId(e.target.value.toUpperCase());
                  setFormatStatus(null);
                }}
                required
              />
              <div className="form-helper">
                Darpan ID format is checked. The registry is not queried.
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginBottom: '16px' }}
            >
              Verify Darpan ID Format
            </button>
          </form>

          {/* Format Validation Result */}
          {formatStatus && (
            <div style={{
              backgroundColor: formatStatus === 'VALID' ? 'var(--status-available-bg)' : 'var(--status-critical-bg)',
              border: `1px solid ${formatStatus === 'VALID' ? 'var(--status-available-border)' : 'var(--status-critical-border)'}`,
              borderRadius: 'var(--radius-xs)',
              padding: '12px 14px',
              marginBottom: '16px',
              fontSize: '0.8125rem',
              color: formatStatus === 'VALID' ? 'var(--status-available-text)' : 'var(--status-critical-text)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {formatStatus === 'VALID' ? (
                <>
                  <CheckCircle2 size={16} strokeWidth={1.5} />
                  <span>Darpan ID format is structurally valid. (Format check only; registry is not queried.)</span>
                </>
              ) : (
                <>
                  <AlertCircle size={16} strokeWidth={1.5} />
                  <span>Invalid format. Format must match State Code / Year / Number (e.g., DL/2018/0192831).</span>
                </>
              )}
            </div>
          )}

          {/* TinyFish Web Footprint Verification Widget */}
          <div style={{ marginTop: '16px' }}>
            <span className="label-caps" style={{ display: 'block', marginBottom: '8px' }}>
              Web Footprint &amp; Digital Trace
            </span>
            <NgoWebCheck orgName={orgName} darpanId={darpanId} />
          </div>
        </div>

        {/* Advisory Notes Sidebar */}
        <aside>
          <div className="surface-card" style={{ padding: '20px', marginBottom: '20px' }}>
            <span className="label-caps" style={{ display: 'block', marginBottom: '10px' }}>
              Verification Guidance
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Format Check Only:</strong>
                <p style={{ marginTop: '2px' }}>
                  Darpan ID format is checked against standard NITI Aayog regex patterns. The registry is not directly queried by FoodLoop.
                </p>
              </div>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Advisory Web Footprint:</strong>
                <p style={{ marginTop: '2px' }}>
                  Advisory only. This is not an official government verification. External web references are scanned via search grounding.
                </p>
              </div>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Authorized Jurisdictions:</strong>
                <p style={{ marginTop: '2px' }}>
                  Primary operations cover registered non-profits across Delhi-NCR and Dehradun.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
