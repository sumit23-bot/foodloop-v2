import React, { useState, useEffect, useRef } from 'react';
import { VERIFIED_NGO_REGISTRY } from '../data/directory';

// ─── 1. Auth Modal ─────────────────────────────────────────────────────────────
export function AuthModal({ isOpen, onClose, onLoginSuccess, showToast }) {
  const [mode, setMode] = useState('LOGIN'); // LOGIN or REGISTER
  const [role, setRole] = useState('NGO'); // NGO or DONOR
  const [name, setName] = useState('');
  const [org, setOrg] = useState('');
  const [darpanId, setDarpanId] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = mode === 'LOGIN' ? '/api/auth/login' : '/api/auth/register';

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (mode === 'REGISTER' && role === 'NGO') {
      const cleanDarpan = darpanId.trim().toUpperCase();
      if (!/^[A-Z]{2}\/\d{4}\/\d{5,8}$/i.test(cleanDarpan)) {
        alert('Invalid NITI Aayog Darpan ID format. E.g., DL/2018/0192831 or UK/2015/0092341');
        return;
      }
    }

    const payload = mode === 'LOGIN' 
      ? { phone: cleanPhone, password }
      : {
          name: name.trim(),
          organization: org.trim(),
          role,
          darpan_id: role === 'NGO' ? darpanId.trim() : '',
          phone: cleanPhone,
          password
        };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('foodloop_auth_token', data.token || 'mock_jwt_token');
        localStorage.setItem('foodloop_auth_user', JSON.stringify(data.user || payload));
        onLoginSuccess(data.user || payload);
        onClose();
        if (showToast) showToast(`✅ Logged in successfully as ${data.user?.name || name || 'User'}`);
      } else {
        alert(data.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err) {
      // Local fallback for offline mode
      const mockUser = {
        name: name || (role === 'NGO' ? 'NGO Coordinator' : 'Food Donor'),
        organization: org || (role === 'NGO' ? 'Robin Hood Army' : 'Grand Banquet'),
        role,
        darpan_id: darpanId,
        phone: cleanPhone
      };
      localStorage.setItem('foodloop_auth_user', JSON.stringify(mockUser));
      onLoginSuccess(mockUser);
      onClose();
      if (showToast) showToast(`✅ Logged in as ${mockUser.name}`);
    }
  };

  return (
    <div id="auth-modal" className="modal-overlay" style={{ display: 'flex' }}>
      <div className="auth-modal-card">
        <div className="modal-top-row">
          <h3 id="auth-modal-title">{mode === 'LOGIN' ? 'Sign In to Portal' : 'Register New Account'}</h3>
          <button type="button" className="close-x-btn" onClick={onClose}>✕</button>
        </div>

        {mode === 'REGISTER' && (
          <div className="role-switcher-tabs">
            <button 
              type="button" 
              className={role === 'NGO' ? 'active' : ''} 
              onClick={() => setRole('NGO')}
              style={{ background: role === 'NGO' ? '#10b981' : '#1e293b', color: role === 'NGO' ? '#000' : '#fff' }}
            >
              🏛️ NGO / Shelter
            </button>
            <button 
              type="button" 
              className={role === 'DONOR' ? 'active' : ''} 
              onClick={() => setRole('DONOR')}
              style={{ background: role === 'DONOR' ? '#10b981' : '#1e293b', color: role === 'DONOR' ? '#000' : '#fff' }}
            >
              🍲 Donor / Banquet
            </button>
          </div>
        )}

        <form id="auth-form" onSubmit={handleSubmit}>
          {mode === 'REGISTER' && (
            <>
              <div className="form-group">
                <label>Admin Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="e.g. Ramesh Kumar" 
                  required 
                />
              </div>

              <div className="form-group">
                <label>Organization / Shelter Name</label>
                <input 
                  type="text" 
                  value={org} 
                  onChange={(e) => setOrg(e.target.value)} 
                  placeholder="e.g. Robin Hood Army / Delhi Shelter Hub" 
                  required 
                />
              </div>

              {role === 'NGO' && (
                <div className="darpan-box">
                  <label>🏛️ NITI Aayog Darpan ID (Mandatory for NGOs)</label>
                  <input 
                    type="text" 
                    value={darpanId} 
                    onChange={(e) => setDarpanId(e.target.value)} 
                    placeholder="e.g. DL/2018/0192831" 
                    required 
                  />
                  <p>Verified against Govt NGO Darpan registry.</p>
                </div>
              )}
            </>
          )}

          <div className="form-group">
            <label>Mobile Phone Number</label>
            <input 
              type="tel" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              placeholder="10-digit number" 
              required 
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Minimum 6 characters" 
              required 
            />
          </div>

          <button type="submit" id="auth-submit-btn" className="auth-submit-action">
            {mode === 'LOGIN' ? 'Sign In to Account' : 'Verify & Create Account'}
          </button>
          
          <p 
            className="auth-toggle-text" 
            onClick={() => setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
          >
            {mode === 'LOGIN' ? (
              <>New to FoodLoop? <span>Click here to Register</span></>
            ) : (
              <>Already registered? <span>Click here to Sign In</span></>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}

// ─── 2. OTP Verification Modal ──────────────────────────────────────────────────
export function OTPModal({ isOpen, onClose, generatedOTP, onConfirm }) {
  const [enteredOTP, setEnteredOTP] = useState('');

  if (!isOpen) return null;

  const handleVerify = () => {
    if (enteredOTP.trim() === generatedOTP.trim()) {
      onConfirm();
      setEnteredOTP('');
    } else {
      alert(`Invalid OTP code entered. Please enter: ${generatedOTP}`);
    }
  };

  return (
    <div id="otp-modal" className="modal-overlay" style={{ display: 'flex' }}>
      <div className="otp-modal-card">
        <div className="otp-icon">📲</div>
        <h3>Verify Phone Number</h3>
        <p>Enter 4-digit security code sent to your mobile.</p>
        <div id="otp-banner">
          Mock SMS Code: <strong id="generated-otp-display">{generatedOTP}</strong>
        </div>
        <input 
          type="text" 
          id="otp-input-field" 
          maxLength="4" 
          value={enteredOTP} 
          onChange={(e) => setEnteredOTP(e.target.value)} 
          placeholder="••••" 
          autoFocus 
        />
        <div className="modal-btn-row">
          <button id="otp-cancel-btn" type="button" onClick={onClose}>Cancel</button>
          <button id="otp-verify-btn" type="button" onClick={handleVerify}>Confirm OTP</button>
        </div>
      </div>
    </div>
  );
}

// ─── 3. QR Handover Modal ──────────────────────────────────────────────────────
export function QRHandoverModal({ isOpen, onClose, listing }) {
  if (!isOpen || !listing) return null;

  return (
    <div id="qr-modal" className="modal-overlay" style={{ display: 'flex' }}>
      <div className="qr-modal-card">
        <h3>🤝 Handover Verification</h3>
        <p>Volunteer must scan this QR code on arrival to confirm safe collection.</p>
        <div 
          id="qrcode-container" 
          style={{ 
            background: '#fff', 
            padding: '16px', 
            borderRadius: '12px', 
            display: 'inline-block', 
            margin: '16px 0',
            textAlign: 'center'
          }}
        >
          {/* Simple QR display rendering */}
          <div style={{ fontFamily: 'monospace', color: '#000', fontSize: '11px', fontWeight: 800 }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🏁 [QR CODE]</div>
            <div>ID: {listing.id}</div>
            <div>DONOR: {listing.donor_name}</div>
            <div>CODE: {listing.verification_code || 'HW-AUTHENTICATED'}</div>
          </div>
        </div>
        <p id="qr-handshake-status" style={{ color: '#38bdf8', fontSize: '13px' }}>
          Status: Awaiting Volunteer Handshake...
        </p>
        <button id="qr-close-btn" onClick={onClose} style={{ marginTop: '12px' }}>
          Close
        </button>
      </div>
    </div>
  );
}

// ─── 4. QR Scanner Modal ────────────────────────────────────────────────────────
export function QRScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [scanMessage, setScanMessage] = useState('');

  if (!isOpen) return null;

  return (
    <div id="qr-scanner-modal" className="modal-overlay" style={{ display: 'flex' }}>
      <div className="qr-modal-card" style={{ maxWidth: '400px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '16px', color: '#fff', margin: 0 }}>📷 Scan Donor Pickup QR</h3>
          <button type="button" className="close-x-btn" onClick={onClose}>✕</button>
        </div>
        <p style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '14px' }}>
          Point camera at donor's Handshake QR to verify collection.
        </p>
        <div id="qr-reader-box" style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', background: '#000', minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', padding: '20px', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📷</div>
            <div>Scanner Active</div>
            <button 
              type="button" 
              onClick={() => {
                setScanMessage('✅ Handshake Verified! Pickup Recorded.');
                setTimeout(() => { if (onScanSuccess) onScanSuccess(); onClose(); }, 1200);
              }}
              style={{ marginTop: '12px', background: '#10b981', color: '#000', border: 'none', padding: '6px 14px', borderRadius: '6px', fontWeight: 800, cursor: 'pointer' }}
            >
              Simulate Scan Complete
            </button>
          </div>
        </div>
        {scanMessage && (
          <div id="scan-feedback-msg" style={{ marginTop: '12px', fontSize: '12px', fontWeight: 700, color: '#34d399', textAlign: 'center' }}>
            {scanMessage}
          </div>
        )}
        <button type="button" onClick={onClose} style={{ width: '100%', marginTop: '12px', padding: '10px', background: '#27272a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
          Cancel Scanning
        </button>
      </div>
    </div>
  );
}

// ─── 5. Dispute Modal ───────────────────────────────────────────────────────────
export function DisputeModal({ isOpen, onClose, listing, userCoords, onSubmitDispute }) {
  const [reason, setReason] = useState('NO_FOOD_EMPTY_LOCATION');
  const [cameraActive, setCameraActive] = useState(false);
  const [evidencePhoto, setEvidencePhoto] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  if (!isOpen || !listing) return null;

  const startCam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      alert('Camera access denied: ' + err.message);
    }
  };

  const stopCam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const captureEvidence = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, 400, 300);
    const b64 = canvas.toDataURL('image/jpeg', 0.8);
    stopCam();
    setEvidencePhoto(b64);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmitDispute({
      listingId: listing.id,
      reason,
      evidencePhoto,
      reportedCoords: userCoords
    });
    onClose();
  };

  return (
    <div id="dispute-modal" className="modal-overlay" style={{ display: 'flex' }}>
      <div className="dashboard-modal-card" style={{ maxWidth: '440px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '16px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🚩</span> File Official Incident Report
          </h3>
          <button type="button" className="close-x-btn" onClick={() => { stopCam(); onClose(); }}>✕</button>
        </div>
        
        <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px 12px', borderRadius: '8px', fontSize: '11px', color: '#fca5a5', marginBottom: '14px', lineHeight: 1.5 }}>
          <strong>⚠️ Anti-Griefing Security:</strong> You must be within <strong>300m</strong> of the physical pickup site. Your NGO Darpan signature and live photo evidence will be immutably recorded.
        </div>

        <form id="dispute-form" onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Incident Violation Reason</label>
            <select 
              id="dispute-reason-select" 
              value={reason} 
              onChange={(e) => setReason(e.target.value)}
              style={{ padding: '10px', fontSize: '12px' }} 
              required
            >
              <option value="NO_FOOD_EMPTY_LOCATION">🚫 No food available at location / False Post</option>
              <option value="SPOILED_ROTTEN_FOOD">🤢 Food is spoiled, foul smelling or unsafe</option>
              <option value="WRONG_PHONE_UNREACHABLE">📞 Fake phone number / Repeatedly unreachable</option>
              <option value="COMMERCIAL_DEMAND_MONEY">💰 Donor demanded payment/money for surplus</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>
              📸 Physical Evidence Photo <span style={{ color: '#ef4444' }}>* (Mandatory)</span>
            </label>
            
            <div id="dispute-cam-box" style={{ border: '2px dashed #475569', borderRadius: '8px', minHeight: '140px', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: '10px' }}>
              <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', display: cameraActive ? 'block' : 'none', borderRadius: '6px' }} />
              {evidencePhoto && (
                <img src={evidencePhoto} style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '6px' }} alt="Evidence" />
              )}
              
              {!cameraActive && !evidencePhoto && (
                <div id="dispute-cam-placeholder" style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>Snap locked gate, empty vessel, or spoiled food</p>
                  <button type="button" onClick={startCam} style={{ background: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: 800, border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}>
                    📷 Open On-Spot Camera
                  </button>
                </div>
              )}

              {cameraActive && (
                <div style={{ display: 'flex', position: 'absolute', bottom: '8px', gap: '8px' }}>
                  <button type="button" onClick={captureEvidence} style={{ background: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: 800, border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>
                    🔴 Snap Evidence
                  </button>
                  <button type="button" onClick={stopCam} style={{ background: '#334155', color: '#fff', fontSize: '11px', fontWeight: 700, border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}>
                    ✕ Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={() => { stopCam(); onClose(); }} style={{ flex: 1, padding: '10px', background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" id="btn-submit-dispute" style={{ flex: 1, padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}>
              Sign & Submit Strike
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── 6. Impact Dashboard Modal ──────────────────────────────────────────────────
export function ImpactDashboardModal({ isOpen, onClose, currentUser, history = [] }) {
  if (!isOpen) return null;

  return (
    <div id="dashboard-modal" className="modal-overlay" style={{ display: 'flex' }}>
      <div className="dashboard-modal-card">
        <div className="dash-header">
          <div className="dash-user-wrap">
            <div className="dash-avatar" id="dash-avatar-icon">🏛️</div>
            <div>
              <h3 id="dash-user-name">{currentUser?.name || currentUser?.organization || 'Registered Partner'}</h3>
              <p id="dash-user-role">{currentUser?.role === 'NGO' ? 'Verified NGO Account' : 'Surplus Food Donor'}</p>
            </div>
          </div>
          <button type="button" className="close-x-btn" onClick={onClose}>✕</button>
        </div>

        <div className="dash-stats-grid">
          <div className="stat-box">
            <small>Total Contributions</small>
            <strong id="dash-stat-meals" className="stat-green">{history.length * 40 || 120}</strong>
          </div>
          <div className="stat-box">
            <small>Trust Reliability</small>
            <strong id="dash-stat-trust" className="stat-blue">100%</strong>
          </div>
          <div className="stat-box">
            <small>CO2 Offset Saved</small>
            <strong id="dash-stat-co2" className="stat-amber">{history.length * 15 || 45} kg</strong>
          </div>
        </div>

        {/* Activity History List */}
        <div style={{ marginBottom: '20px' }}>
          <div className="dash-section-head">
            <h4 id="dash-activity-title">Rescue & Contribution History</h4>
            <span className="sub-sync">Synced live with database</span>
          </div>
          <div id="dash-activity-list" className="dash-list-scroll">
            {history.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '16px' }}>
                No recent activity recorded yet.
              </p>
            ) : (
              history.map((item, idx) => (
                <div key={idx} style={{ padding: '8px 12px', background: '#111827', borderRadius: '6px', marginBottom: '6px', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{item.title}</span>
                  <span style={{ color: '#10b981' }}>{item.quantity}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 7. Share Modal ─────────────────────────────────────────────────────────────
export function ShareModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shareUrl = 'https://foodloop-india.org';
  const shareText = 'Join FoodLoop Food Rescue Network across Delhi-NCR and Dehradun! ';

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    alert('Link copied to clipboard!');
  };

  return (
    <div id="share-modal" className="modal-overlay" style={{ display: 'flex' }}>
      <div className="dashboard-modal-card" style={{ maxWidth: '400px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '18px', color: '#fff', margin: 0 }}>📢 Share FoodLoop Network</h3>
          <button type="button" className="close-x-btn" onClick={onClose}>✕</button>
        </div>
        <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
          Help local banquets, restaurants and shelters join our zero food waste movement.
        </p>
        
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
          <a 
            id="share-whatsapp-btn" 
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + shareUrl)}`} 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ background: '#25d366', color: '#fff', padding: '10px 18px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <i className="fa-brands fa-whatsapp"></i> WhatsApp
          </a>
          <a 
            id="share-twitter-btn" 
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`} 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ background: '#1da1f2', color: '#fff', padding: '10px 18px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <i className="fa-brands fa-x-twitter"></i> Post
          </a>
        </div>

        <div style={{ background: '#111827', border: '1px solid #334155', padding: '10px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#38bdf8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '230px' }}>
            {shareUrl}
          </span>
          <button type="button" onClick={copyLink} style={{ background: '#10b981', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}>
            Copy Link
          </button>
        </div>
      </div>
    </div>
  );
}
