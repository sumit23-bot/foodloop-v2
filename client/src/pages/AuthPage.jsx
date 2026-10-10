import React, { useState } from 'react';
import { ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';
import NgoWebCheck from '../components/tinyfish/NgoWebCheck';

export default function AuthPage({
  onLoginSuccess,
  onNavigate,
  showToast,
  initialMode = 'LOGIN'
}) {
  const [mode, setMode] = useState(initialMode); // 'LOGIN' or 'REGISTER'
  const [role, setRole] = useState('NGO'); // 'DONOR', 'NGO', 'ANIMAL_SHELTER'
  const [name, setName] = useState('');
  const [org, setOrg] = useState('');
  const [darpanId, setDarpanId] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = mode === 'LOGIN' ? '/api/auth/login' : '/api/auth/register';

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (mode === 'REGISTER' && (role === 'NGO' || role === 'ANIMAL_SHELTER')) {
      const cleanDarpan = darpanId.trim().toUpperCase();
      if (!/^[A-Z]{2}\/\d{4}\/\d{5,8}$/i.test(cleanDarpan)) {
        alert('Invalid Darpan ID format. Example: DL/2018/0192831 or UK/2015/0092341.\n(Darpan ID format is checked. The registry is not queried.)');
        return;
      }
    }

    const payload = mode === 'LOGIN'
      ? { phone: cleanPhone, password }
      : {
          name: name.trim(),
          organization: org.trim(),
          role: role === 'ANIMAL_SHELTER' ? 'ANIMAL_SHELTER' : role,
          darpan_id: (role === 'NGO' || role === 'ANIMAL_SHELTER') ? darpanId.trim() : '',
          phone: cleanPhone,
          password
        };

    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        const { token, password: _pw, ...userFields } = data;
        localStorage.setItem('foodloop_auth_token', token || '');
        localStorage.setItem('foodloop_auth_user', JSON.stringify(userFields));
        if (onLoginSuccess) onLoginSuccess(userFields);
        if (showToast) showToast(`Logged in successfully as ${userFields.name || name || 'User'}`);
        onNavigate('OVERVIEW');
      } else {
        alert(data.error || 'Authentication failed. Please check credentials.');
      }
    } catch (_err) {
      if (import.meta.env.VITE_DEMO_MODE === 'true') {
        const mockUser = {
          name: name || (role === 'NGO' ? 'NGO Coordinator' : 'Food Donor'),
          organization: org || (role === 'NGO' ? 'Robin Hood Army' : 'Grand Banquet'),
          role,
          darpan_id: darpanId,
          phone: cleanPhone
        };
        localStorage.setItem('foodloop_auth_user', JSON.stringify(mockUser));
        if (onLoginSuccess) onLoginSuccess(mockUser);
        if (showToast) showToast(`Logged in as ${mockUser.name} (Offline Demo Mode)`);
        onNavigate('OVERVIEW');
      } else {
        alert('Network error connecting to authentication service.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split-screen">
      {/* Left Graphite Panel */}
      <div className="auth-panel-graphite">
        <div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onNavigate('OVERVIEW')}
            style={{ color: '#D9DDE1', padding: '0', marginBottom: '24px' }}
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
            <span>Return to FoodLoop portal</span>
          </button>

          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem' }}>FoodLoop</h1>
          <p style={{ color: 'var(--graphite-text-muted)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Surplus food rescue network
          </p>
        </div>

        <div className="auth-facts-list">
          <div className="auth-fact-item">
            <h4>Verified rescue partners</h4>
            <p>Connecting registered NGOs with event caterers and restaurants across Delhi-NCR and Dehradun.</p>
          </div>
          <div className="auth-fact-item">
            <h4>Zero-waste dual loop</h4>
            <p>Unclaimed surplus approaching safe consumption limits redirects automatically to animal feed and gaushalas.</p>
          </div>
          <div className="auth-fact-item">
            <h4>Traceable handovers</h4>
            <p>Protected donor addresses unlock upon verified claim with single-use QR handover confirmation.</p>
          </div>
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--graphite-text-muted)' }}>
          Delhi-NCR and Dehradun Food Rescue Infrastructure
        </div>
      </div>

      {/* Right White Panel */}
      <div className="auth-panel-white">
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'LOGIN' ? 'active' : ''}`}
            onClick={() => setMode('LOGIN')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'REGISTER' ? 'active' : ''}`}
            onClick={() => setMode('REGISTER')}
          >
            Register
          </button>
        </div>

        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '4px' }}>
          {mode === 'LOGIN' ? 'Sign in to FoodLoop' : 'Register your organisation'}
        </h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          {mode === 'LOGIN'
            ? 'Enter your registered mobile number and password to access the portal.'
            : 'Join the rescue network as a food donor, registered NGO, or animal shelter.'}
        </p>

        {mode === 'REGISTER' && (
          <div className="role-segmented-buttons">
            <button
              type="button"
              className={`role-segment-btn ${role === 'DONOR' ? 'active' : ''}`}
              onClick={() => setRole('DONOR')}
            >
              Food donor
            </button>
            <button
              type="button"
              className={`role-segment-btn ${role === 'NGO' ? 'active' : ''}`}
              onClick={() => setRole('NGO')}
            >
              NGO or shelter
            </button>
            <button
              type="button"
              className={`role-segment-btn ${role === 'ANIMAL_SHELTER' ? 'active' : ''}`}
              onClick={() => setRole('ANIMAL_SHELTER')}
            >
              Animal shelter
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'REGISTER' && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="auth-name">Your Full Name</label>
                <input
                  id="auth-name"
                  type="text"
                  placeholder="e.g. Anand Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="auth-org">Organisation Name</label>
                <input
                  id="auth-org"
                  type="text"
                  placeholder="e.g. Pandit Caterers or Robin Hood Army"
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                  required
                />
              </div>

              {(role === 'NGO' || role === 'ANIMAL_SHELTER') && (
                <div className="form-group">
                  <label className="form-label" htmlFor="auth-darpan">
                    Darpan ID (Format checked)
                  </label>
                  <input
                    id="auth-darpan"
                    type="text"
                    placeholder="e.g. DL/2018/0192831"
                    value={darpanId}
                    onChange={(e) => setDarpanId(e.target.value.toUpperCase())}
                    required
                  />
                  <div className="form-helper">
                    Darpan ID format is checked. The registry is not queried.
                  </div>

                  {/* TinyFish NGO Web Presence Check directly below */}
                  <NgoWebCheck orgName={org} darpanId={darpanId} />
                </div>
              )}
            </>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="auth-phone">Registered Mobile Number</label>
            <input
              id="auth-phone"
              type="tel"
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={10}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '8px' }}
          >
            {loading ? 'Authenticating...' : mode === 'LOGIN' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
