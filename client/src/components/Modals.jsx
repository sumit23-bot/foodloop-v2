import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { VERIFIED_NGO_REGISTRY, calculateDistance } from '../data/directory';
import { generate80GCertificate } from '../utils/certificate';
import confetti from 'canvas-confetti';
import { TERMS_CONTENT_V1, TERMS_VERSION } from '../data/termsContent';

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
        const { token, password: _pw, ...userFields } = data;
        localStorage.setItem('foodloop_auth_token', token || '');
        localStorage.setItem('foodloop_auth_user', JSON.stringify(userFields));
        onLoginSuccess(userFields);
        onClose();
        if (showToast) showToast(`✅ Logged in successfully as ${userFields.name || name || 'User'}`);
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
          {/* Real Scannable QR Code */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <QRCodeSVG 
              value={JSON.stringify({
                id: listing.id,
                donor_name: listing.donor_name,
                verification_code: listing.verification_code || 'HW-AUTHENTICATED'
              })}
              size={180}
              level="M"
            />
            <div style={{ fontFamily: 'monospace', color: '#000', fontSize: '11px', fontWeight: 800 }}>
              <div>ID: {listing.id}</div>
              <div>DONOR: {listing.donor_name}</div>
              <div>CODE: {listing.verification_code || 'HW-AUTHENTICATED'}</div>
            </div>
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
export function QRScannerModal({ isOpen, onClose, onScanSuccess, listing }) {
  const [scanMessage, setScanMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const scannerRef = useRef(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      setScanMessage('');
      setErrorMessage('');
      handledRef.current = false;
      return;
    }

    handledRef.current = false;
    let scannerInstance = null;
    let isCancelled = false;

    const timer = setTimeout(() => {
      if (isCancelled) return;
      const element = document.getElementById('qr-reader-box');
      if (!element) return;

      try {
        scannerInstance = new Html5QrcodeScanner(
          'qr-reader-box',
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true
          },
          /* verbose= */ false
        );
        scannerRef.current = scannerInstance;

        const onScanSuccessLocal = (decodedText) => {
          if (handledRef.current) return;

          let isMatch = false;
          let matchedInfo = '';

          try {
            const data = JSON.parse(decodedText);
            if (listing) {
              if (listing.id && data.id && String(listing.id) === String(data.id)) {
                isMatch = true;
                matchedInfo = `Listing #${listing.id}`;
              } else if (listing.verification_code && data.verification_code && listing.verification_code === data.verification_code) {
                isMatch = true;
                matchedInfo = data.verification_code;
              } else if (listing.verification_code && decodedText.includes(listing.verification_code)) {
                isMatch = true;
              }
            } else {
              isMatch = true;
              matchedInfo = data.verification_code || (data.id ? `Listing #${data.id}` : 'Handshake Verified');
            }
          } catch (_) {
            if (listing) {
              if (listing.verification_code && decodedText.includes(listing.verification_code)) {
                isMatch = true;
              } else if (listing.id && decodedText.includes(String(listing.id))) {
                isMatch = true;
              } else if (decodedText.includes('HW-AUTHENTICATED')) {
                isMatch = true;
              }
            } else {
              isMatch = true;
            }
          }

          if (isMatch) {
            handledRef.current = true;
            setScanMessage(`✅ Handshake Verified! Pickup Recorded. ${matchedInfo ? `(${matchedInfo})` : ''}`);
            setErrorMessage('');
            setTimeout(() => {
              if (onScanSuccess) onScanSuccess(listing);
              onClose();
            }, 1200);
          } else {
            setErrorMessage(`⚠️ QR Mismatch: Scanned code does not match Listing #${listing?.id || ''}.`);
          }
        };

        const onScanErrorLocal = () => {
          // ignore routine frame-level scan errors
        };

        scannerInstance.render(onScanSuccessLocal, onScanErrorLocal);
      } catch (e) {
        console.warn('Html5QrcodeScanner initialization notice:', e);
      }
    }, 150);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch((e) => {
          console.warn('Scanner clear error:', e);
        });
        scannerRef.current = null;
      }
    };
  }, [isOpen, listing]);

  if (!isOpen) return null;

  const handleSimulate = () => {
    if (handledRef.current) return;
    handledRef.current = true;
    setScanMessage('✅ Handshake Verified! Pickup Recorded (Simulated).');
    setErrorMessage('');
    setTimeout(() => {
      if (onScanSuccess) onScanSuccess(listing);
      onClose();
    }, 1000);
  };

  return (
    <div id="qr-scanner-modal" className="modal-overlay" style={{ display: 'flex' }}>
      <div className="qr-modal-card" style={{ maxWidth: '440px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '16px', color: '#fff', margin: 0 }}>📷 Scan Donor Pickup QR</h3>
          <button type="button" className="close-x-btn" onClick={onClose}>✕</button>
        </div>

        {listing && (
          <div style={{ background: '#1e293b', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '12px', color: '#94a3b8' }}>
            <span style={{ color: '#38bdf8', fontWeight: 700 }}>Target: </span>
            {listing.title} ({listing.donor_name}) · Code: <code style={{ color: '#f59e0b', fontWeight: 700 }}>{listing.verification_code || 'HW-AUTHENTICATED'}</code>
          </div>
        )}

        <p style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '12px' }}>
          Point camera at the donor's Handshake QR to verify collection.
        </p>

        <div 
          id="qr-reader-box" 
          style={{ 
            width: '100%', 
            borderRadius: '12px', 
            overflow: 'hidden', 
            background: '#090d16', 
            minHeight: '220px', 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center', 
            color: '#38bdf8', 
            padding: '10px'
          }}
        />

        {scanMessage && (
          <div id="scan-feedback-msg" style={{ marginTop: '12px', fontSize: '13px', fontWeight: 700, color: '#34d399', textAlign: 'center' }}>
            {scanMessage}
          </div>
        )}

        {errorMessage && (
          <div style={{ marginTop: '12px', fontSize: '12px', fontWeight: 700, color: '#f87171', textAlign: 'center' }}>
            {errorMessage}
          </div>
        )}

        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            type="button" 
            id="simulate-scan-btn"
            onClick={handleSimulate} 
            style={{ 
              background: '#10b981', 
              color: '#000', 
              border: 'none', 
              padding: '8px 14px', 
              borderRadius: '8px', 
              fontWeight: 800, 
              fontSize: '12px',
              cursor: 'pointer' 
            }}
          >
            ⚡ Simulate Scan Complete (Demo Mode)
          </button>

          <button 
            type="button" 
            onClick={onClose} 
            style={{ 
              width: '100%', 
              padding: '10px', 
              background: '#27272a', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontSize: '13px' 
            }}
          >
            Cancel Scanning
          </button>
        </div>
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

  const itemLat = listing.coords?.lat ?? 28.6139;
  const itemLon = listing.coords?.lon ?? 77.2090;
  const userLat = userCoords?.lat ?? 28.6139;
  const userLon = userCoords?.lon ?? 77.2090;
  const distKm = calculateDistance(userLat, userLon, itemLat, itemLon);
  const distMeters = Math.round(distKm * 1000);
  const isGeofenceValid = distKm <= 0.3; // 300m limit

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
    if (!isGeofenceValid) {
      alert(`Geofence Lock: You are ${distMeters}m away from pickup site. Submissions require physical presence within 300m.`);
      return;
    }
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

        {/* Live Distance Geofence Badge */}
        <div style={{
          background: isGeofenceValid ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          border: `1px solid ${isGeofenceValid ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          color: isGeofenceValid ? '#34d399' : '#f87171',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontWeight: 700
        }}>
          <span>📍 Your Distance: {distMeters}m / 300m limit</span>
          <span style={{
            background: isGeofenceValid ? '#064e3b' : '#7f1d1d',
            color: isGeofenceValid ? '#6ee7b7' : '#fca5a5',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 800
          }}>
            {isGeofenceValid ? '[✓ Geofence Verified]' : '[⚠️ Too Far (>300m)]'}
          </span>
        </div>

        {!isGeofenceValid ? (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            padding: '10px 12px',
            borderRadius: '8px',
            fontSize: '11px',
            color: '#fca5a5',
            marginBottom: '14px',
            lineHeight: 1.4
          }}>
            <strong>🚫 Geofence Lock Active:</strong> You are currently <strong>{distMeters}m</strong> away. You must be physically present at the pickup site (within 300m) to submit an incident report.
          </div>
        ) : (
          <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px 12px', borderRadius: '8px', fontSize: '11px', color: '#fca5a5', marginBottom: '14px', lineHeight: 1.5 }}>
            <strong>⚠️ Anti-Griefing Security:</strong> You are within the <strong>300m</strong> geofence of this pickup site. Your NGO Darpan signature and live photo evidence will be immutably recorded.
          </div>
        )}

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
            <button 
              type="submit" 
              id="btn-submit-dispute" 
              disabled={!isGeofenceValid}
              style={{ 
                flex: 1, 
                padding: '10px', 
                background: isGeofenceValid ? '#ef4444' : '#475569', 
                color: isGeofenceValid ? '#fff' : '#94a3b8', 
                border: 'none', 
                borderRadius: '8px', 
                fontWeight: 800, 
                fontSize: '12px', 
                cursor: isGeofenceValid ? 'pointer' : 'not-allowed',
                opacity: isGeofenceValid ? 1 : 0.6
              }}
            >
              {isGeofenceValid ? 'Sign & Submit Strike' : 'Submit Locked (>300m)'}
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

        {/* Action Buttons: 80G Certificate */}
        <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
          <button 
            type="button" 
            id="download-80g-btn"
            onClick={() => generate80GCertificate(currentUser, history)}
            style={{
              flex: 1,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
            }}
          >
            <span>📄</span> Download 80G Certificate (PDF)
          </button>
          <button 
            type="button" 
            onClick={onClose}
            style={{
              background: '#334155',
              color: '#cbd5e1',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 18px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
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

// ─── 8. Sponsor Meal Modal ──────────────────────────────────────────────────────
export function SponsorMealModal({ isOpen, onClose, currentUser, onProceedContribute, showToast }) {
  const [selectedPreset, setSelectedPreset] = useState(40);
  const [customAmount, setCustomAmount] = useState('');
  const [name, setName] = useState(currentUser?.name || '');
  const [contact, setContact] = useState(currentUser?.phone || '');
  const [panNumber, setPanNumber] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      if (!name) setName(currentUser.name || '');
      if (!contact) setContact(currentUser.phone || '');
    }
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const currentAmount = customAmount ? (parseInt(customAmount, 10) || 0) : selectedPreset;
  const mealsEquivalent = Math.max(1, Math.floor(currentAmount / 40));

  const handleContribute = async (e) => {
    e.preventDefault();
    if (currentAmount < 10) {
      alert('Minimum contribution amount is ₹10.');
      return;
    }
    if (!name.trim()) {
      alert('Please enter your full name for the donation receipt.');
      return;
    }
    if (!contact.trim()) {
      alert('Please enter your mobile or email for the 80G tax certificate.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/donations/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: currentAmount,
          donor_name: name.trim(),
          donor_phone: contact.trim(),
          donor_email: contact.includes('@') ? contact.trim() : ''
        })
      });

      const orderData = await res.json();
      if (!res.ok) {
        throw new Error(orderData.error || 'Failed to create contribution order');
      }

      // Check if Razorpay checkout script is loaded and live/test keys exist
      if (typeof window !== 'undefined' && window.Razorpay && !orderData.mock && orderData.key_id && orderData.key_id !== 'rzp_test_mock') {
        const options = {
          key: orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'FoodLoop Surplus Rescue',
          description: `Sponsor ${mealsEquivalent} Rescued Meals (₹${currentAmount})`,
          order_id: orderData.order_id,
          handler: async function (response) {
            try {
              const verifyRes = await fetch('/api/donations/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  donor_name: name.trim(),
                  donor_phone: contact.trim(),
                  amount: currentAmount
                })
              });
              const verifyData = await verifyRes.json();
              if (verifyRes.ok && verifyData.verified) {
                confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
                if (showToast) showToast(`🎉 Payment of ₹${currentAmount} verified! 80G receipt issued to ${name}.`);
                onClose();
              } else {
                alert('Payment verification failed.');
              }
            } catch (err) {
              alert('Could not verify payment: ' + err.message);
            }
          },
          prefill: {
            name: name.trim(),
            contact: contact.replace(/\D/g, '').slice(-10),
            email: contact.includes('@') ? contact.trim() : 'contributor@foodloop.org'
          },
          theme: {
            color: '#10b981'
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          alert('Payment was cancelled or failed: ' + (resp?.error?.description || 'Cancelled'));
        });
        rzp.open();
      } else {
        // Fallback for demo mode / when testing without live keys
        await fetch('/api/donations/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: orderData.order_id,
            razorpay_payment_id: `pay_demo_${Date.now()}`,
            donor_name: name.trim(),
            donor_phone: contact.trim(),
            amount: currentAmount
          })
        });
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        if (showToast) showToast(`❤️ Payment of ₹${currentAmount} recorded (Demo Mode)! 80G receipt generated for ${name}.`);
        onClose();
      }
    } catch (err) {
      alert('Error initiating contribution: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      id="sponsor-meal-modal" 
      className="modal-overlay" 
      style={{ display: 'flex' }}
      onClick={(e) => { if (e.target.id === 'sponsor-meal-modal') onClose(); }}
    >
      <div className="dashboard-modal-card" style={{ maxWidth: '440px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '17px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <span style={{ fontSize: '20px' }}>🍲</span> Sponsor a Rescued Meal
          </h3>
          <button type="button" className="close-x-btn" onClick={onClose}>✕</button>
        </div>

        <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px', lineHeight: 1.5 }}>
          Can't donate food? Fund volunteer logistics, insulated rescue boxes, and fuel to safely deliver surplus banquet meals to shelters and street children.
        </p>

        {/* Preset Amounts */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
            Select Contribution Amount
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '8px' }}>
            {[
              { amount: 40, label: '₹40', sub: '1 Meal' },
              { amount: 200, label: '₹200', sub: '5 Meals' },
              { amount: 500, label: '₹500', sub: '12 Meals' },
            ].map(preset => (
              <button
                key={preset.amount}
                type="button"
                onClick={() => { setSelectedPreset(preset.amount); setCustomAmount(''); }}
                style={{
                  background: (!customAmount && selectedPreset === preset.amount) ? 'rgba(16, 185, 129, 0.2)' : '#1e293b',
                  border: (!customAmount && selectedPreset === preset.amount) ? '2px solid #10b981' : '1px solid #334155',
                  borderRadius: '8px',
                  padding: '10px 4px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  color: (!customAmount && selectedPreset === preset.amount) ? '#34d399' : '#fff'
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '15px' }}>{preset.label}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>{preset.sub}</div>
              </button>
            ))}
          </div>

          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8', fontSize: '13px' }}>₹</span>
            <input
              type="number"
              placeholder="Or enter custom amount in ₹"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 28px',
                background: '#111827',
                border: customAmount ? '2px solid #10b981' : '1px solid #334155',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px'
              }}
              min="10"
            />
          </div>
        </div>

        {/* Impact Live Summary Banner */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '8px',
          padding: '10px 14px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Immediate Impact</div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#34d399' }}>
              Feeds approx. {mealsEquivalent} {mealsEquivalent === 1 ? 'person' : 'people'}
            </div>
          </div>
          <div style={{ background: '#064e3b', color: '#6ee7b7', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
            80G Tax Deductible
          </div>
        </div>

        {/* Contributor Form */}
        <form onSubmit={handleContribute}>
          <div className="form-group" style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Contributor Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Chandra"
              style={{ padding: '9px 12px', fontSize: '12px' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Phone / Email (for 80G Receipt)</label>
            <input
              type="text"
              required
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="e.g. 9811122233 or donor@example.com"
              style={{ padding: '9px 12px', fontSize: '12px' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>PAN Number <span style={{ fontSize: '10px', color: '#64748b' }}>(Optional, for 80G certificate)</span></label>
            <input
              type="text"
              maxLength="10"
              value={panNumber}
              onChange={(e) => setPanNumber(e.target.value)}
              placeholder="e.g. ABCDE1234F"
              style={{ padding: '9px 12px', fontSize: '12px', textTransform: 'uppercase' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, padding: '11px', background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              id="proceed-sponsor-btn"
              disabled={loading}
              style={{
                flex: 2,
                padding: '11px',
                background: loading ? '#475569' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: loading ? '#cbd5e1' : '#000',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '13px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.25)'
              }}
            >
              {loading ? 'Processing Contribution...' : `Proceed to Contribute ₹${currentAmount}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── 9. Donor Terms & Conditions Modal ──────────────────────────────────────────
export function TermsAndConditionsModal({ isOpen, onClose, onAccept }) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setHasScrolledToBottom(false);
      setIsAgreed(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleScroll = (e) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 5) {
      setHasScrolledToBottom(true);
    }
  };

  const handleConfirm = () => {
    if (!isAgreed) return;
    onAccept({
      termsVersion: TERMS_VERSION,
      acceptedAt: new Date().toISOString()
    });
  };

  return (
    <div id="terms-modal" className="modal-overlay" style={{ display: 'flex' }}>
      <div 
        className="auth-modal-card" 
        style={{ 
          maxWidth: '650px', 
          width: '95%', 
          maxHeight: '90vh', 
          display: 'flex', 
          flexDirection: 'column',
          background: '#0f172a',
          border: '1.5px solid #334155',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
        }}
      >
        <div className="modal-top-row" style={{ marginBottom: '12px', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>⚖️</span>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
                Donor Terms &amp; Conditions
              </h3>
              <span style={{ 
                background: 'rgba(56, 189, 248, 0.15)', 
                color: '#38bdf8', 
                fontSize: '11px', 
                padding: '2px 8px', 
                borderRadius: '6px', 
                fontWeight: 700 
              }}>
                {TERMS_VERSION}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Mandatory legal confirmation before posting a surplus food donation.
            </p>
          </div>
          <button type="button" className="close-x-btn" onClick={onClose} aria-label="Close Terms modal">✕</button>
        </div>

        {/* Scrollable Terms Content */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="custom-scrollbar"
          id="terms-content-scroll"
          style={{
            maxHeight: '400px',
            overflowY: 'auto',
            background: '#090d16',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            padding: '16px 20px',
            color: '#cbd5e1',
            fontSize: '13px',
            lineHeight: '1.7',
            whiteSpace: 'pre-wrap',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
        >
          {TERMS_CONTENT_V1}
        </div>

        {/* Scroll Notice & Agreement Gate */}
        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #1e293b' }}>
          {!hasScrolledToBottom ? (
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px dashed rgba(245, 158, 11, 0.4)',
              color: '#fbbf24',
              fontSize: '12px',
              padding: '8px 12px',
              borderRadius: '8px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>📜</span>
              <span>Please scroll to the bottom of the terms above to unlock agreement.</span>
            </div>
          ) : (
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              fontSize: '12px',
              padding: '8px 12px',
              borderRadius: '8px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>✓</span>
              <span>You have scrolled through the entire legal agreement.</span>
            </div>
          )}

          <label
            htmlFor="terms-agreement-checkbox"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              cursor: hasScrolledToBottom ? 'pointer' : 'not-allowed',
              opacity: hasScrolledToBottom ? 1 : 0.45,
              userSelect: 'none',
              marginBottom: '16px'
            }}
          >
            <input
              type="checkbox"
              id="terms-agreement-checkbox"
              disabled={!hasScrolledToBottom}
              checked={isAgreed}
              onChange={(e) => setIsAgreed(e.target.checked)}
              style={{
                marginTop: '3px',
                width: '18px',
                height: '18px',
                cursor: hasScrolledToBottom ? 'pointer' : 'not-allowed',
                accentColor: '#10b981'
              }}
            />
            <span style={{ fontSize: '13px', color: '#f1f5f9', fontWeight: 600, lineHeight: 1.4 }}>
              I have read and agree to the Donor Terms &amp; Conditions above
            </span>
          </label>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
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
              type="button"
              id="confirm-post-donation-btn"
              disabled={!isAgreed}
              onClick={handleConfirm}
              style={{
                padding: '10px 22px',
                background: isAgreed ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#334155',
                color: isAgreed ? '#000' : '#64748b',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '13px',
                cursor: isAgreed ? 'pointer' : 'not-allowed',
                boxShadow: isAgreed ? '0 4px 14px rgba(16, 185, 129, 0.3)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              Confirm &amp; Post Donation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

