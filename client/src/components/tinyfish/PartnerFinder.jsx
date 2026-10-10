import React, { useState } from 'react';
import TinyFishErrorBoundary from './TinyFishErrorBoundary';
import TinyFishBadge from './TinyFishBadge';
import useTinyFishStatus from './useTinyFishStatus';
import './tinyfish.css';

function PartnerFinderInner({ defaultCity = 'Delhi' }) {
  const { available, loading: statusLoading } = useTinyFishStatus();
  const [city, setCity] = useState(defaultCity);
  const [type, setType] = useState('gaushala');
  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!statusLoading && !available) {
    return null;
  }

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!city.trim() || loading) return;

    setLoading(true);
    setErrorMsg('');
    setHasSearched(true);

    try {
      const token = localStorage.getItem('foodloop_auth_token');
      const res = await fetch(`/api/tinyfish/partners?city=${encodeURIComponent(city.trim())}&type=${encodeURIComponent(type)}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      if (!res.ok) {
        setErrorMsg('Live partner suggestions unavailable.');
        setPartners([]);
        return;
      }

      const data = await res.json();
      if (data.available && Array.isArray(data.items)) {
        setPartners(data.items);
      } else {
        setPartners([]);
      }
    } catch {
      setErrorMsg('Live partner suggestions unavailable.');
      setPartners([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tf-partner-box">
      <div className="tf-partner-header">
        <h4 style={{ margin: 0, fontSize: '13px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
          🐾 Find Off-Grid Gaushala & Animal Partners
        </h4>
        <TinyFishBadge />
      </div>

      <form onSubmit={handleSearch} className="tf-partner-controls">
        <input 
          type="text" 
          value={city} 
          onChange={(e) => setCity(e.target.value)} 
          placeholder="Enter city (e.g. Delhi, Jaipur)"
          className="tf-input"
          style={{ flex: 1 }}
        />
        <select 
          value={type} 
          onChange={(e) => setType(e.target.value)} 
          className="tf-select"
        >
          <option value="gaushala">Gaushalas</option>
          <option value="animal_shelter">Animal Shelters</option>
          <option value="biogas">Biogas Plants</option>
        </select>
        <button 
          type="submit" 
          disabled={loading || !city.trim()}
          style={{
            background: '#10b981',
            color: '#000',
            fontWeight: 700,
            border: 'none',
            borderRadius: '6px',
            padding: '8px 14px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          {loading ? 'Searching...' : 'Find Partners'}
        </button>
      </form>

      {errorMsg && (
        <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', marginBottom: '8px' }}>
          {errorMsg}
        </div>
      )}

      {hasSearched && !loading && (
        <div>
          {partners.length === 0 ? (
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0' }}>
              No nearby live partners discovered for this location.
            </p>
          ) : (
            <div className="tf-partner-results">
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', fontStyle: 'italic' }}>
                Suggestions from the public web - verify before contacting
              </div>
              {partners.map((p, idx) => (
                <div key={idx} className="tf-partner-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <a href={p.url} target="_blank" rel="noopener noreferrer">
                      {p.title || p.site_name || 'Partner Facility'} ↗
                    </a>
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>{p.site_name}</span>
                  </div>
                  {p.snippet && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.3' }}>
                      {p.snippet}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PartnerFinder(props) {
  return (
    <TinyFishErrorBoundary>
      <PartnerFinderInner {...props} />
    </TinyFishErrorBoundary>
  );
}
