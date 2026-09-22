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
    </div>
  );
}
