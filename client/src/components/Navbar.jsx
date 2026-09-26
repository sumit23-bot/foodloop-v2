import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Navbar({ currentUser, onOpenAuth, onOpenDashboard, onLogout, onOpenSponsor, onOpenAdmin, currentView, setCurrentView }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="container nav-wrap">
        <a className="brand" href="#hero" onClick={(e) => { if (currentView === 'MAP') { e.preventDefault(); setCurrentView('HOME'); } }}>
          <span>food<span className="brand-accent">loop</span></span>
          <span className="live-dot"></span>
        </a>
        
        <button 
          className="menu-toggle" 
          type="button" 
          aria-label="Open navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <i className="fa-solid fa-bars"></i>
        </button>

        <nav className={`main-nav ${menuOpen ? 'active' : ''}`}>
          <a href="#hero" onClick={() => { setCurrentView('HOME'); setMenuOpen(false); }}>Home</a>
          <a href="#lead-magnets" onClick={() => { setCurrentView('HOME'); setMenuOpen(false); }}>Get involved</a>
          <a href="#how-it-works" onClick={() => { setCurrentView('HOME'); setMenuOpen(false); }}>How it works</a>
          <a href="#rescue-hub" onClick={() => { setCurrentView('HOME'); setMenuOpen(false); }}>Rescue hub</a>
          <a href="#contact" onClick={() => { setCurrentView('HOME'); setMenuOpen(false); }}>Contact & Notes</a>
          
          {/* Sponsor a Meal Nav Button */}
          <button 
            type="button"
            id="nav-sponsor-meal-btn"
            onClick={() => { onOpenSponsor && onOpenSponsor(); setMenuOpen(false); }}
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              border: '1.5px solid rgba(16, 185, 129, 0.4)',
              padding: '6px 14px',
              borderRadius: '8px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            🍲 Sponsor a Meal
          </button>

          {/* Radar Map Toggle Button */}
          <button 
            type="button"
            onClick={() => { setCurrentView(currentView === 'MAP' ? 'HOME' : 'MAP'); setMenuOpen(false); }}
            style={{
              background: currentView === 'MAP' ? '#10b981' : 'rgba(56, 189, 248, 0.15)',
              color: currentView === 'MAP' ? '#000' : '#38bdf8',
              border: '1.5px solid rgba(56,189,248,0.4)',
              padding: '6px 14px',
              borderRadius: '8px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            🗺️ Radar Map
          </button>

          {/* ClothesLoop Nav Link */}
          <Link 
            to="/clothes"
            id="nav-donate-clothes-btn"
            onClick={() => setMenuOpen(false)}
            style={{
              background: 'rgba(168, 85, 247, 0.15)',
              color: '#c084fc',
              border: '1.5px solid rgba(168, 85, 247, 0.4)',
              padding: '6px 14px',
              borderRadius: '8px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              textDecoration: 'none'
            }}
          >
            👕 Donate Clothes
          </Link>

          {/* Safety Admin Nav Button */}
          <button 
            type="button"
            id="nav-safety-admin-btn"
            onClick={() => { onOpenAdmin && onOpenAdmin(); setMenuOpen(false); }}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              border: '1.5px solid rgba(239, 68, 68, 0.4)',
              padding: '6px 14px',
              borderRadius: '8px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            ⚖️ Safety Admin
          </button>

          <span id="nav-auth-container">
            {currentUser ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  type="button" 
                  className="button button-small button-outline" 
                  onClick={onOpenDashboard}
                >
                  <i className="fa-solid fa-user-check"></i> {currentUser.name || currentUser.organization || 'My Account'}
                </button>
                <button 
                  type="button" 
                  className="button button-small" 
                  onClick={onLogout}
                  style={{ background: '#334155', color: '#fff', border: 'none', padding: '6px 10px' }}
                  title="Logout"
                >
                  <i className="fa-solid fa-right-from-bracket"></i>
                </button>
              </div>
            ) : (
              <button 
                type="button" 
                className="button button-small button-outline" 
                onClick={() => onOpenAuth('LOGIN')}
              >
                <i className="fa-solid fa-user-lock"></i> Sign In / NGO Portal
              </button>
            )}
          </span>

          <a 
            className="button button-small button-primary" 
            href="#rescue-hub"
            onClick={() => { setCurrentView('HOME'); setMenuOpen(false); }}
          >
            Post food <i className="fa-solid fa-arrow-up-right-from-square"></i>
          </a>
        </nav>
      </div>
    </header>
  );
}
