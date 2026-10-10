import React, { useState } from 'react';
import TinyFishErrorBoundary from './TinyFishErrorBoundary';
import TinyFishBadge from './TinyFishBadge';
import useTinyFishStatus from './useTinyFishStatus';
import './tinyfish.css';

function NgoWebCheckInner({ orgName = '', darpanId = '' }) {
  const { available, loading: statusLoading } = useTinyFishStatus();
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!statusLoading && !available) {
    return null;
  }

  const canCheck = typeof orgName === 'string' && orgName.trim().length >= 3;

  const handleCheck = async () => {
    if (!canCheck || checking) return;
    setChecking(true);
    setErrorMsg('');
    setResult(null);

    try {
      const res = await fetch('/api/tinyfish/ngo-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_name: orgName.trim(),
          darpan_id: darpanId?.trim() || undefined
        })
      });

      if (!res.ok) {
        setErrorMsg('Web check unavailable.');
        return;
      }

      const data = await res.json();
      if (data.available === false && data.confidence === 'UNKNOWN' && (!data.evidence || data.evidence.length === 0)) {
        setErrorMsg('Live web check unavailable.');
      } else {
        setResult(data);
      }
    } catch {
      setErrorMsg('Live web check unavailable.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="tf-ngo-box">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <button
          type="button"
          onClick={handleCheck}
          disabled={!canCheck || checking}
          className="tf-ngo-btn"
        >
          {checking ? 'Verifying web footprint...' : 'Check web footprint'}
        </button>
        <TinyFishBadge />
      </div>

      {errorMsg && (
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '4px' }}>
          {errorMsg}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className={`tf-confidence-badge tf-conf-${result.confidence}`}>
              Footprint: {result.confidence}
            </span>
            {result.darpan_id_seen && (
              <span style={{ fontSize: '11px', background: 'var(--status-available-bg)', color: 'var(--status-available-text)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                Darpan ID referenced
              </span>
            )}
          </div>

          {result.evidence && result.evidence.length > 0 && (
            <ul className="tf-evidence-list">
              {result.evidence.slice(0, 3).map((ev, idx) => (
                <li key={idx} style={{ marginBottom: '4px' }}>
                  <a href={ev.url} target="_blank" rel="noopener noreferrer">
                    {ev.site_name || ev.title || 'Reference'}
                  </a>
                  {ev.matched ? ' (name found on page)' : ''}
                </li>
              ))}
            </ul>
          )}

          <div className="tf-disclaimer">
            {result.disclaimer || 'Advisory only: public web footprint, not an official verification.'}
          </div>
        </div>
      )}
    </div>
  );
}

export default function NgoWebCheck(props) {
  return (
    <TinyFishErrorBoundary>
      <NgoWebCheckInner {...props} />
    </TinyFishErrorBoundary>
  );
}
