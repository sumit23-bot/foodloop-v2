import React from 'react';
import { Link } from 'react-router-dom';

export default function ClothesPlaceholder() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0b0f19', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Clothes page coming soon</h1>
      <p style={{ marginTop: '1rem', color: '#94a3b8' }}>
        <Link to="/" style={{ color: '#10b981', textDecoration: 'none', fontWeight: 600 }}>← Back to FoodLoop</Link>
      </p>
    </div>
  );
}
