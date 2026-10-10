import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  QrCode, 
  Camera, 
  ShieldAlert, 
  FileText, 
  Copy, 
  Share2, 
  Heart, 
  Lock, 
  Unlock 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { VERIFIED_NGO_REGISTRY, calculateDistance } from '../data/directory';
import { generate80GCertificate } from '../utils/certificate';
import { TERMS_CONTENT_V1, TERMS_VERSION } from '../data/termsContent';
import NgoWebCheck from './tinyfish/NgoWebCheck';

// ─── 1. Auth Modal ─────────────────────────────────────────────────────────────
export function AuthModal({ isOpen, onClose, onLoginSuccess, showToast }) {
  const [mode, setMode] = useState('LOGIN'); // LOGIN or REGISTER
  const [role, setRole] = useState('NGO'); // NGO, DONOR, ANIMAL_SHELTER
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

    if (mode === 'REGISTER' && (role === 'NGO' || role === 'ANIMAL_SHELTER')) {
      const cleanDarpan = darpanId.trim().toUpperCase();
      if (!/^[A-Z]{2}\/\d{4}\/\d{5,8}$/i.test(cleanDarpan)) {
        alert('Invalid Darpan ID format. E.g., DL/2018/0192831 or UK/2015/0092341.\n(Darpan ID format is checked. The registry is not queried.)');
        return;
      }
    }

    const payload = mode === 'LOGIN' 
      ? { phone: cleanPhone, password }
      : {
          name: name.trim(),
          organization: org.trim(),
          role,
          darpan_id: (role === 'NGO' || role === 'ANIMAL_SHELTER') ? darpanId.trim() : '',
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
        if (showToast) showToast(`Logged in successfully as ${userFields.name || name || 'User'}`);
      } else {
        alert(data.error || 'Authentication failed. Please verify credentials.');
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
        onLoginSuccess(mockUser);
        onClose();
        if (showToast) showToast(`Logged in as ${mockUser.name} (Offline Demo Mode)`);
      } else {
        alert('Network error connecting to authentication service.');
      }
    }
  };

  return (
    <div id="auth-modal" className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog-panel modal-narrow" onClick={(e) => e.stopPropagation()}>
        <div className="modal-dialog-header">
          <h3>{mode === 'LOGIN' ? 'Sign In to Portal' : 'Register New Account'}</h3>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="modal-dialog-body">
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
                NGO / Shelter
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

          <form id="auth-form" onSubmit={handleSubmit}>
            {mode === 'REGISTER' && (
              <>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="e.g. Ramesh Kumar" 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Organization Name</label>
                  <input 
                    type="text" 
                    value={org} 
                    onChange={(e) => setOrg(e.target.value)} 
                    placeholder="e.g. Robin Hood Army / Grand Banquet" 
                    required 
                  />
                </div>

                {(role === 'NGO' || role === 'ANIMAL_SHELTER') && (
                  <div className="form-group">
                    <label className="form-label">Darpan ID (Format checked)</label>
                    <input 
                      type="text" 
                      value={darpanId} 
                      onChange={(e) => setDarpanId(e.target.value.toUpperCase())} 
                      placeholder="e.g. DL/2018/0192831" 
                      required 
                    />
                    <div className="form-helper">
                      Darpan ID format is checked. The registry is not queried.
                    </div>
                    <NgoWebCheck orgName={org} darpanId={darpanId} />
                  </div>
                )}
              </>
            )}

            <div className="form-group">
              <label className="form-label">Mobile Phone Number</label>
              <input 
                type="tel" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="10-digit number" 
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Minimum 6 characters" 
                required 
              />
            </div>

            <button type="submit" id="auth-submit-btn" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
              {mode === 'LOGIN' ? 'Sign In to Account' : 'Create Account'}
            </button>
            
            <p 
              style={{ fontSize: '0.8125rem', textAlign: 'center', marginTop: '16px', color: 'var(--text-secondary)', cursor: 'pointer' }}
              onClick={() => setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
            >
              {mode === 'LOGIN' ? (
                <>New to FoodLoop? <span style={{ color: 'var(--graphite)', fontWeight: 600, textDecoration: 'underline' }}>Register an account</span></>
              ) : (
                <>Already registered? <span style={{ color: 'var(--graphite)', fontWeight: 600, textDecoration: 'underline' }}>Sign In</span></>
              )}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── 2. OTP Verification Modal ──────────────────────────────────────────────────
export function OTPModal({ isOpen, onClose, generatedOTP, onConfirm }) {
  const [enteredOTP, setEnteredOTP] = useState('');

  if (!isOpen) return null;

  const handleVerify = () => {
    if (enteredOTP.trim() === generatedOTP.trim() || enteredOTP.trim() === '1234') {
      onConfirm();
      setEnteredOTP('');
    } else {
      alert(`Invalid OTP code entered. Please enter: ${generatedOTP} (or demo OTP: 1234)`);
    }
  };

  return (
    <div id="otp-modal" className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog-panel modal-narrow" onClick={(e) => e.stopPropagation()}>
        <div className="modal-dialog-header">
          <h3>Phone Verification</h3>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="modal-dialog-body" style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: '16px' }}>
            Enter the 4-digit verification code below to publish your surplus listing.
          </p>

          <div style={{
            backgroundColor: 'var(--status-info-bg)',
            border: '1px solid var(--status-info-border)',
            padding: '12px',
            borderRadius: 'var(--radius-xs)',
            marginBottom: '16px',
            fontSize: '0.875rem'
          }}>
            Demo Verification Code: <strong id="generated-otp-display" style={{ fontVariantNumeric: 'tabular-nums', fontSize: '1.1rem' }}>{generatedOTP}</strong>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '16px' }}>
            Demo Mode: Code is shown on screen for testing.
          </div>

          <input 
            type="text" 
            id="otp-input-field" 
            maxLength="4" 
            value={enteredOTP} 
            onChange={(e) => setEnteredOTP(e.target.value)} 
            placeholder="••••" 
            autoFocus 
            style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em', height: '48px', width: '200px', margin: '0 auto 20px auto' }}
          />

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button id="otp-cancel-btn" type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button id="otp-verify-btn" type="button" className="btn btn-primary" onClick={handleVerify}>
              Confirm OTP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 3. QR Handover Modal ──────────────────────────────────────────────────────
export function QRHandoverModal({ isOpen, onClose, listing }) {
  if (!isOpen || !listing) return null;

  return (
    <div id="qr-modal" className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog-panel modal-narrow" onClick={(e) => e.stopPropagation()}>
        <div className="modal-dialog-header">
          <h3>Pickup Handover</h3>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="modal-dialog-body" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Show this single-use code to the collecting NGO volunteer on arrival.
          </p>

          <div style={{ 
            background: '#FFFFFF', 
            padding: '16px', 
            borderRadius: 'var(--radius-xs)', 
            border: '1px solid var(--border)',
            display: 'inline-block', 
            margin: '0 auto 16px auto'
          }}>
            <QRCodeSVG 
              value={JSON.stringify({
                id: listing.id,
                donor_name: listing.donor_name,
                verification_code: listing.verification_code || 'HW-AUTHENTICATED'
              })}
              size={180}
              level="M"
            />
          </div>

          <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            <div>ID: {listing.id}</div>
            <div>CODE: {listing.verification_code || 'HW-AUTHENTICATED'}</div>
          </div>

          <div style={{ fontSize: '0.8125rem', color: 'var(--status-info-text)', marginBottom: '20px' }}>
            Status: Awaiting volunteer scan
          </div>

          <button id="qr-close-btn" className="btn btn-secondary" onClick={onClose} style={{ width: '100%' }}>
            Close
          </button>
        </div>
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
          false
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
            setScanMessage(`Handshake Verified. Pickup Recorded. ${matchedInfo ? `(${matchedInfo})` : ''}`);
            setErrorMessage('');
            setTimeout(() => {
              if (onScanSuccess) onScanSuccess(listing);
              onClose();
            }, 1200);
          } else {
            setErrorMessage(`QR Mismatch: Scanned code does not match Listing #${listing?.id || ''}.`);
          }
        };

        const onScanErrorLocal = () => {};

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
    setScanMessage('Handshake Verified. Pickup Recorded (Demo Mode).');
    setErrorMessage('');
    setTimeout(() => {
      if (onScanSuccess) onScanSuccess(listing);
      onClose();
    }, 1000);
  };

  return (
    <div id="qr-scanner-modal" className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog-panel modal-narrow" onClick={(e) => e.stopPropagation()}>
        <div className="modal-dialog-header">
          <h3>Scan Handover Code</h3>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="modal-dialog-body">
          {listing && (
            <div style={{ backgroundColor: 'var(--canvas)', padding: '10px 14px', borderRadius: 'var(--radius-xs)', marginBottom: '12px', fontSize: '0.8125rem' }}>
              <span style={{ fontWeight: 600 }}>Target: </span>
              {listing.title} ({listing.donor_name}) · Code: <code>{listing.verification_code || 'HW-AUTHENTICATED'}</code>
            </div>
          )}

          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Point the camera at the donor's QR code to verify physical handover.
          </p>

          <div 
            id="qr-reader-box" 
            style={{ 
              width: '100%', 
              borderRadius: 'var(--radius-xs)', 
              overflow: 'hidden', 
              border: '1px solid var(--border)',
              minHeight: '220px', 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '10px'
            }}
          />

          {scanMessage && (
            <div id="scan-feedback-msg" style={{ marginTop: '12px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--status-available-text)', textAlign: 'center' }}>
              {scanMessage}
            </div>
          )}

          {errorMessage && (
            <div style={{ marginTop: '12px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--status-critical-text)', textAlign: 'center' }}>
              {errorMessage}
            </div>
          )}

          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button 
              type="button" 
              id="simulate-scan-btn"
              className="btn btn-secondary btn-sm"
              onClick={handleSimulate} 
            >
              Simulate Scan Complete (Demo Mode)
            </button>

            <button 
              type="button" 
              className="btn btn-outline btn-sm"
              onClick={onClose} 
            >
              Cancel
            </button>
          </div>
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
    <div id="dispute-modal" className="modal-overlay" onClick={() => { stopCam(); onClose(); }} role="dialog" aria-modal="true">
      <div className="modal-dialog-panel modal-narrow" onClick={(e) => e.stopPropagation()}>
        <div className="modal-dialog-header">
          <h3>Report a Problem</h3>
          <button type="button" className="modal-close-btn" onClick={() => { stopCam(); onClose(); }} aria-label="Close">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="modal-dialog-body">
          <div style={{
            backgroundColor: isGeofenceValid ? 'var(--status-available-bg)' : 'var(--status-critical-bg)',
            border: `1px solid ${isGeofenceValid ? 'var(--status-available-border)' : 'var(--status-critical-border)'}`,
            padding: '10px 14px',
            borderRadius: 'var(--radius-xs)',
            fontSize: '0.8125rem',
            color: isGeofenceValid ? 'var(--status-available-text)' : 'var(--status-critical-text)',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 600
          }}>
            <span>Distance: {distMeters}m (300m limit)</span>
            <span>{isGeofenceValid ? 'Within site boundary' : 'Outside boundary (>300m)'}</span>
          </div>

          <form id="dispute-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Violation Reason</label>
              <select 
                id="dispute-reason-select" 
                value={reason} 
                onChange={(e) => setReason(e.target.value)}
                required
              >
                <option value="NO_FOOD_EMPTY_LOCATION">No food available at location / False post</option>
                <option value="SPOILED_ROTTEN_FOOD">Food is spoiled or unsafe</option>
                <option value="WRONG_PHONE_UNREACHABLE">Wrong contact number / Unreachable</option>
                <option value="COMMERCIAL_DEMAND_MONEY">Donor demanded payment for surplus</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Evidence Photo (Mandatory)
              </label>
              
              <div style={{ border: '1px dashed var(--border)', borderRadius: 'var(--radius-xs)', minHeight: '140px', background: 'var(--surface-alt)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: '10px' }}>
                <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', display: cameraActive ? 'block' : 'none', borderRadius: 'var(--radius-xs)' }} />
                {evidencePhoto && (
                  <img src={evidencePhoto} style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: 'var(--radius-xs)' }} alt="Evidence" />
                )}
                
                {!cameraActive && !evidencePhoto && (
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Capture on-site photo evidence</p>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={startCam}>
                      <Camera size={14} strokeWidth={1.5} />
                      <span>Open on-spot camera</span>
                    </button>
                  </div>
                )}

                {cameraActive && (
                  <div style={{ display: 'flex', position: 'absolute', bottom: '8px', gap: '8px' }}>
                    <button type="button" className="btn btn-primary btn-sm" onClick={captureEvidence}>
                      Snap evidence
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={stopCam}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { stopCam(); onClose(); }} style={{ flex: 1 }}>
                Cancel
              </button>
              <button 
                type="submit" 
                id="btn-submit-dispute" 
                className="btn btn-danger"
                disabled={!isGeofenceValid}
                style={{ flex: 1 }}
              >
                Submit report
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── 6. Impact Dashboard Modal ──────────────────────────────────────────────────
export function ImpactDashboardModal({ isOpen, onClose, currentUser, history = [] }) {
  if (!isOpen) return null;

  return (
    <div id="dashboard-modal" className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog-panel modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-dialog-header">
          <h3>My Impact &amp; Account</h3>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="modal-dialog-body">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                {currentUser?.name || currentUser?.organization || 'Registered Partner'}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                {currentUser?.role === 'NGO' ? 'Verified NGO Partner' : currentUser?.role === 'ANIMAL_SHELTER' ? 'Registered Animal Shelter' : 'Surplus Food Donor'}
              </div>
            </div>
            <span className="status-chip available">Verified</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
            <div className="surface-card" style={{ padding: '14px', textAlign: 'center' }}>
              <div className="label-caps" style={{ marginBottom: '6px' }}>Contributions</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }} className="tabular-nums">
                {history.length}
              </div>
            </div>
            <div className="surface-card" style={{ padding: '14px', textAlign: 'center' }}>
              <div className="label-caps" style={{ marginBottom: '6px' }}>Trust Score</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--status-available-text)' }}>
                100 / 100
              </div>
            </div>
            <div className="surface-card" style={{ padding: '14px', textAlign: 'center' }}>
              <div className="label-caps" style={{ marginBottom: '6px' }}>Estimated Servings</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }} className="tabular-nums">
                {history.length * 40 || 'Demo data'}
              </div>
            </div>
          </div>

          <div className="card-section-title">
            <span>Contribution History</span>
          </div>

          <div className="table-responsive" style={{ maxHeight: '240px', marginBottom: '20px' }}>
            <table className="ruled-table">
              <thead>
                <tr>
                  <th>Item / Consignment</th>
                  <th>Quantity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '20px' }}>
                      No contribution history recorded yet.
                    </td>
                  </tr>
                ) : (
                  history.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{item.title}</td>
                      <td>{item.quantity}</td>
                      <td>
                        <span className="status-chip available">Completed</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button 
              type="button" 
              id="download-80g-btn"
              className="btn btn-primary"
              onClick={() => generate80GCertificate(currentUser, history)}
            >
              <FileText size={15} strokeWidth={1.5} />
              <span>Download 80G Certificate (PDF)</span>
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
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
  const shareText = 'Join FoodLoop Food Rescue Network across Delhi-NCR and Dehradun.';

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    alert('Link copied to clipboard.');
  };

  return (
    <div id="share-modal" className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog-panel modal-narrow" onClick={(e) => e.stopPropagation()}>
        <div className="modal-dialog-header">
          <h3>Share FoodLoop Initiative</h3>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="modal-dialog-body" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Help local banquets, restaurants, and shelters connect with our zero food waste rescue network.
          </p>
          
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
            <a 
              id="share-whatsapp-btn" 
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-primary"
            >
              <Share2 size={15} strokeWidth={1.5} />
              <span>Share via WhatsApp</span>
            </a>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input 
              type="text" 
              readOnly 
              value={shareUrl} 
              style={{ flex: 1, fontSize: '0.8125rem' }}
            />
            <button type="button" className="btn btn-secondary btn-sm" onClick={copyLink}>
              <Copy size={14} strokeWidth={1.5} />
              <span>Copy</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 8. Sponsor Meal Modal ──────────────────────────────────────────────────────
export function SponsorMealModal({ isOpen, onClose, currentUser, showToast }) {
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
                if (showToast) showToast(`Payment of ₹${currentAmount} verified. 80G receipt issued to ${name}.`);
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
            color: '#1B1E22'
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          alert('Payment was cancelled or failed: ' + (resp?.error?.description || 'Cancelled'));
        });
        rzp.open();
      } else {
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
        if (showToast) showToast(`Payment of ₹${currentAmount} recorded (Demo Mode). 80G receipt generated for ${name}.`);
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
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-dialog-panel modal-narrow" onClick={(e) => e.stopPropagation()}>
        <div className="modal-dialog-header">
          <h3>Sponsor a Rescued Meal</h3>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="modal-dialog-body">
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Fund volunteer logistics, packaging, and fuel to safely deliver surplus banquet meals to community shelters.
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label className="form-label">Select Contribution Amount</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
              {[
                { amount: 40, label: '₹40', sub: '1 Meal' },
                { amount: 200, label: '₹200', sub: '5 Meals' },
                { amount: 500, label: '₹500', sub: '12 Meals' },
              ].map(preset => (
                <button
                  key={preset.amount}
                  type="button"
                  onClick={() => { setSelectedPreset(preset.amount); setCustomAmount(''); }}
                  className={`btn ${(!customAmount && selectedPreset === preset.amount) ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flexDirection: 'column', padding: '10px 4px', height: 'auto' }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{preset.label}</div>
                  <div style={{ fontSize: '0.6875rem', opacity: 0.8 }}>{preset.sub}</div>
                </button>
              ))}
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type="number"
                placeholder="Or enter custom amount in ₹"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                min="10"
              />
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--status-available-bg)',
            border: '1px solid var(--status-available-border)',
            borderRadius: 'var(--radius-xs)',
            padding: '10px 14px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--status-available-text)', textTransform: 'uppercase', fontWeight: 700 }}>
                Direct Impact
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--status-available-text)' }}>
                Feeds approx. {mealsEquivalent} {mealsEquivalent === 1 ? 'person' : 'people'}
              </div>
            </div>
            <span className="status-chip available">80G Eligible</span>
          </div>

          <form onSubmit={handleContribute}>
            <div className="form-group">
              <label className="form-label">Contributor Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Chandra"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone / Email (for 80G Receipt)</label>
              <input
                type="text"
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="e.g. 9811122233 or donor@example.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">PAN Number (Optional, for 80G Certificate)</label>
              <input
                type="text"
                maxLength="10"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value)}
                placeholder="e.g. ABCDE1234F"
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                id="proceed-sponsor-btn"
                className="btn btn-primary"
                disabled={loading}
                style={{ flex: 2 }}
              >
                {loading ? 'Processing...' : `Proceed to Contribute ₹${currentAmount}`}
              </button>
            </div>
          </form>
        </div>
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
    if (scrollTop + clientHeight >= scrollHeight - 8) {
      setHasScrolledToBottom(true);
    }
  };

  const handleConfirm = () => {
    if (!isAgreed) return;
    if (onAccept) {
      onAccept({
        termsVersion: TERMS_VERSION,
        acceptedAt: new Date().toISOString()
      });
    } else {
      onClose();
    }
  };

  return (
    <div id="terms-modal" className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div 
        className="modal-dialog-panel modal-wide" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-dialog-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3>Donor Terms &amp; Conditions</h3>
            <span className="status-chip info">{TERMS_VERSION}</span>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="modal-dialog-body">
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Confirmation of surplus food rescue standards and volunteer handling guidelines.
          </p>

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            id="terms-content-scroll"
            style={{
              maxHeight: '360px',
              overflowY: 'auto',
              background: 'var(--canvas)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xs)',
              padding: '16px 20px',
              color: 'var(--text-primary)',
              fontSize: '0.8125rem',
              lineHeight: '1.65',
              whiteSpace: 'pre-wrap'
            }}
          >
            {TERMS_CONTENT_V1}
          </div>

          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            {!hasScrolledToBottom ? (
              <div style={{
                backgroundColor: 'var(--status-expiring-bg)',
                border: '1px solid var(--status-expiring-border)',
                color: 'var(--status-expiring-text)',
                fontSize: '0.75rem',
                padding: '8px 12px',
                borderRadius: 'var(--radius-xs)',
                marginBottom: '12px'
              }}>
                Please scroll to the bottom of the agreement above to proceed.
              </div>
            ) : (
              <div style={{
                backgroundColor: 'var(--status-available-bg)',
                border: '1px solid var(--status-available-border)',
                color: 'var(--status-available-text)',
                fontSize: '0.75rem',
                padding: '8px 12px',
                borderRadius: 'var(--radius-xs)',
                marginBottom: '12px'
              }}>
                Terms scrolled completely.
              </div>
            )}

            <label
              htmlFor="terms-agreement-checkbox"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: hasScrolledToBottom ? 'pointer' : 'not-allowed',
                opacity: hasScrolledToBottom ? 1 : 0.5,
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
                style={{ width: '18px', height: '18px' }}
              />
              <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                I have read and agree to the Donor Terms &amp; Conditions above
              </span>
            </label>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Close
              </button>
              <button
                type="button"
                id="confirm-post-donation-btn"
                className="btn btn-primary"
                disabled={!isAgreed}
                onClick={handleConfirm}
              >
                Confirm &amp; Proceed
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
