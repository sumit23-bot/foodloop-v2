import React from 'react';

export default function DemoPersonaBar({ onSelectPersona }) {
  return (
    <div id="demo-persona-bar">
      <span className="demo-tag">⚡ DEMO:</span>
      <button type="button" className="btn-demo-donor" onClick={() => onSelectPersona('DONOR')}>
        🍛 Donor
      </button>
      <button type="button" className="btn-demo-ngo" onClick={() => onSelectPersona('NGO')}>
        🏛️ NGO
      </button>
      <button type="button" className="btn-demo-animal" onClick={() => onSelectPersona('ANIMAL')}>
        🐾 Gaushala/Animals
      </button>
      <button type="button" className="btn-demo-guest" onClick={() => onSelectPersona('GUEST')}>
        👤 Visitor
      </button>
      <button 
        type="button" 
        className="btn-demo-admin" 
        onClick={() => onSelectPersona('ADMIN')}
        style={{
          background: 'rgba(239, 68, 68, 0.2)',
          color: '#f87171',
          border: '1px solid #ef4444',
          borderRadius: '9999px',
          padding: '4px 10px',
          fontWeight: 700,
          fontSize: '11px',
          cursor: 'pointer'
        }}
      >
        ⚖️ Safety Admin
      </button>
    </div>
  );
}
