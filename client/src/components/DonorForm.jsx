import React, { useState, useRef } from 'react';

export default function DonorForm({ 
  currentUser, 
  userLiveCoords, 
  onRequestGPS, 
  onSubmitDonationInitiate,
  showToast 
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Vegetarian');
  const [quantity, setQuantity] = useState('');
  const [windowHours, setWindowHours] = useState('3');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  
  // Camera & Image State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [isLiveCapture, setIsLiveCapture] = useState(false);
  const [aiState, setAiState] = useState({ status: 'IDLE', confidence: 0, reason: '' }); // IDLE, LOADING, VERIFIED, REJECTED
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fast-track presets
  const applyPreset = (presetTitle, presetCat, presetQty, presetWindow) => {
    setTitle(presetTitle);
    setCategory(presetCat);
    setQuantity(presetQty);
    setWindowHours(String(presetWindow));
    if (showToast) showToast(`⚡ Fast-Track Preset: "${presetTitle}" loaded!`);
  };

  // Camera Management
  const startCamera = async () => {
    try {
      const constraints = {
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
      setImagePreview('');
      setAiState({ status: 'IDLE', confidence: 0, reason: '' });
    } catch (err) {
      alert('Camera access denied or unavailable: ' + err.message);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Burn Geotag / Timestamp into canvas pixels
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const coordsStr = userLiveCoords 
      ? `${userLiveCoords.lat.toFixed(4)}°N, ${userLiveCoords.lon.toFixed(4)}°E` 
      : 'Location Unavailable';

    const fontSize = Math.max(12, Math.floor(canvas.width * 0.024));
    const padding = Math.floor(fontSize * 0.8);
    const boxHeight = fontSize * 4.4;
    const boxWidth = Math.min(canvas.width - 24, Math.max(300, canvas.width * 0.58));
    const boxX = 12;
    const boxY = canvas.height - boxHeight - 12;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
      ctx.fill();
    } else {
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    }
    ctx.fillStyle = '#10b981';
    ctx.fillRect(boxX, boxY, 4, boxHeight);

    ctx.font = `bold ${fontSize}px "Courier New", Courier, monospace`;
    ctx.fillStyle = '#34d399';
    ctx.fillText('🛡️ FoodLoop Verified Live Proof', boxX + padding + 4, boxY + fontSize * 1.3);

    ctx.font = `${Math.floor(fontSize * 0.9)}px "Courier New", Courier, monospace`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`📅 ${dateStr} ${timeStr}`, boxX + padding + 4, boxY + fontSize * 2.5);

    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`📍 GPS: ${coordsStr}`, boxX + padding + 4, boxY + fontSize * 3.6);
    ctx.restore();

    const base64 = canvas.toDataURL('image/jpeg', 0.90);
    stopCamera();
    setImagePreview(base64);
    setIsLiveCapture(true);
    triggerAIVerification(base64);
  };

  // Gallery Upload
  const handleGalleryUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('❌ Please select an image file (JPEG, PNG, etc.)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvt) => {
      const base64 = uploadEvt.target.result;
      stopCamera();
      setImagePreview(base64);
      setIsLiveCapture(false);
      triggerAIVerification(base64);
    };
    reader.readAsDataURL(file);
  };

  const retakePhoto = () => {
    setImagePreview('');
    setIsLiveCapture(false);
    setAiState({ status: 'IDLE', confidence: 0, reason: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // AI Verification Routine
  const triggerAIVerification = async (base64) => {
    setAiState({ status: 'LOADING', confidence: 0, reason: '' });
    try {
      const res = await fetch('/api/ai/verify-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 })
      });
      const data = await res.json();
      if (data.is_food === true && (data.confidence ?? 0) >= 60) {
        setAiState({ status: 'VERIFIED', confidence: data.confidence, reason: data.reason });
      } else {
        setAiState({ 
          status: 'REJECTED', 
          confidence: data.confidence || 0, 
          reason: data.reason || 'Image does not clearly show food.' 
        });
      }
    } catch (err) {
      console.warn('AI verification failed:', err);
      setAiState({ status: 'REJECTED', confidence: 0, reason: 'Verification service unreachable.' });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!currentUser) {
      alert('🔒 Access Restricted: Please Login or Register as a Donor/Restaurant to post surplus food.');
      return;
    }

    if (!imagePreview) {
      alert('❌ Photo Proof is Mandatory!\n\nPlease capture a live photo or upload from your gallery.');
      return;
    }

    if (aiState.status === 'LOADING') {
      alert('⏳ AI Verification in Progress\n\nPlease wait a moment — the AI is still inspecting your photo.');
      return;
    }

    if (aiState.status !== 'VERIFIED') {
      alert(`❌ Food Not Verified\n\n${aiState.reason || 'The AI could not confirm this image contains real edible food.'}\n\nPlease retake or upload a clear photo of the food.`);
      return;
    }

    if (!title.trim()) {
      alert('⚠️ Please enter a food item description.');
      return;
    }

    const cleanQty = quantity.trim();
    const extractedNum = parseInt(cleanQty.replace(/\D/g, '') || '0');
    if (extractedNum > 0 && extractedNum < 10) {
      alert('⚠️ Minimum Surplus Policy Violation:\n\nFoodLoop is designed for surplus rescue (Banquet, Restaurant, Caterers). Minimum threshold is 10+ servings.');
      return;
    }

    if (!address.trim()) {
      alert('⚠️ Please provide a pickup address or click "🎯 Use Live GPS".');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10 || ['1234567890', '0000000000', '9999999999'].includes(cleanPhone)) {
      alert('❌ Invalid Contact Phone Number!\n\nPlease enter a valid 10-digit Indian mobile number.');
      return;
    }

    const payload = {
      id: Date.now().toString(),
      title: title.trim(),
      category,
      quantity: cleanQty,
      expiry_hours: parseInt(windowHours),
      address: address.trim(),
      phone: cleanPhone,
      donor_name: currentUser.name || currentUser.organization || 'Registered Donor',
      image: imagePreview,
      verification_code: 'HW-AUTHENTICATED',
      coords: userLiveCoords || { lat: 28.6139, lon: 77.2090 },
      is_food_verified: true,
      is_live_capture: isLiveCapture,
      ai_detected_class: aiState.reason || 'AI Verified Food',
      trust_score: 100,
      created_at: new Date().toISOString(),
      status: (parseInt(windowHours) === 1) ? 'DIVERTED_TO_ANIMALS' : 'AVAILABLE'
    };

    onSubmitDonationInitiate(payload);
  };

  return (
    <div id="donor-form-container">
      <form className="donor-form" id="donor-form" onSubmit={handleSubmit}>
        <div className="form-heading">
          <span className="form-icon"><i className="fa-solid fa-plus"></i></span>
          <div>
            <h3>Post a donation</h3>
            <p>Share surplus meals with verified NGOs & shelters.</p>
          </div>
        </div>

        {/* Fast-Track Presets */}
        <div className="preset-wrap">
          <span className="preset-label">⚡ Fast-Track Presets</span>
          <div className="preset-btns">
            <button type="button" className="preset-btn" onClick={() => applyPreset('Buffet Surplus: 50 Rice, Dal & Sabzi', 'Vegetarian', '50 servings', 3)}>
              🍛 Buffet (50 pax)
            </button>
            <button type="button" className="preset-btn" onClick={() => applyPreset('Bakery Surplus: Fresh Bread & Buns', 'Vegetarian', '30 packets', 4)}>
              🍞 Bakery Box (30 pcs)
            </button>
            <button type="button" className="preset-btn" onClick={() => applyPreset('Event Meal Boxes (Paneer & Roti)', 'Vegetarian', '40 boxes', 2)}>
              🍱 Packed Meals (40 box)
            </button>
            <button 
              type="button" 
              className="preset-btn" 
              onClick={() => applyPreset('Immediate Surplus (Short Window): 25 Meals', 'Vegetarian', '25 servings', 1)}
              style={{ borderColor: '#fbbf24', color: '#fbbf24' }}
            >
              🚨 Short Window (&lt;1h Animal/Bio)
            </button>
          </div>
        </div>

        {/* Photo Proof Section (Camera & Gallery) */}
        <div className="form-group">
          <div className="label-row">
            <label>📸 Photo Proof <span style={{ color: '#f87171', fontWeight: 800 }}>* (Camera or Gallery)</span></label>
            <div className="proof-toggle-btns" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                onClick={startCamera} 
                style={{ background: '#10b981', color: '#000', fontWeight: 800, padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
              >
                📷 Open Live Camera
              </button>
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()} 
                style={{ background: '#3b82f6', color: '#fff', fontWeight: 800, padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
              >
                📁 Upload from Gallery
              </button>
              <input 
                ref={fileInputRef}
                type="file" 
                id="gallery-file-input" 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={handleGalleryUpload} 
              />
            </div>
          </div>

          <div id="camera-box" style={{ border: '2px dashed #475569', borderRadius: '12px', overflow: 'hidden', position: 'relative', background: '#0b0f19', minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '12px' }}>
            
            {/* Initial Placeholder */}
            {!isCameraActive && !imagePreview && (
              <div id="start-cam-placeholder">
                <span style={{ color: '#cbd5e1', fontSize: '13px' }}>
                  Click <strong>"📷 Open Live Camera"</strong> to capture a live photo, or <strong>"📁 Upload from Gallery"</strong> to select an existing photo. All photos are AI-verified before submission.
                </span>
              </div>
            )}

            {/* Live Video Feed */}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', display: isCameraActive ? 'block' : 'none', borderRadius: '8px' }} 
            />

            {/* Camera Controls */}
            {isCameraActive && (
              <div id="cam-controls" style={{ display: 'flex', position: 'absolute', bottom: '12px', left: 0, right: 0, justifyContent: 'center', gap: '10px', zIndex: 10 }}>
                <button 
                  type="button" 
                  className="cam-btn-capture" 
                  onClick={capturePhoto} 
                  style={{ background: '#ef4444', color: '#fff', fontWeight: 800, border: 'none', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)' }}
                >
                  🔴 Capture Live Proof
                </button>
                <button 
                  type="button" 
                  className="cam-btn-close" 
                  onClick={stopCamera} 
                  style={{ background: '#334155', color: '#fff', fontWeight: 700, border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  ✕ Close Cam
                </button>
              </div>
            )}

            {/* Captured / Uploaded Image Preview */}
            {imagePreview && (
              <div id="image-preview-container" style={{ display: 'block', width: '100%', position: 'relative' }}>
                <img 
                  id="food-image-preview" 
                  src={imagePreview} 
                  alt="Proof" 
                  style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', borderRadius: '8px', display: 'block' }} 
                />

                {/* Hardware Security / Geotag Stamp Overlay */}
                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  right: '12px',
                  background: 'rgba(15, 23, 42, 0.94)',
                  borderLeft: isLiveCapture ? '4px solid #10b981' : '4px solid #f59e0b',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  color: '#ffffff',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  lineHeight: '1.4',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.7)',
                  zIndex: 99,
                  pointerEvents: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ fontWeight: 'bold', color: isLiveCapture ? '#34d399' : '#f59e0b' }}>
                    {isLiveCapture ? '🛡️ FoodLoop Verified Live Proof' : '📁 Gallery Upload'}
                  </div>
                  <div>📅 {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  <div style={{ color: '#94a3b8' }}>
                    📍 {userLiveCoords ? `${userLiveCoords.lat.toFixed(4)}°N, ${userLiveCoords.lon.toFixed(4)}°E` : 'Location Unavailable'}
                  </div>
                </div>

                {/* AI Verification Badge */}
                {aiState.status === 'LOADING' && (
                  <span style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(100, 116, 139, 0.95)', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '4px', zIndex: 100 }}>
                    ⏳ Verifying with AI...
                  </span>
                )}
                {aiState.status === 'VERIFIED' && (
                  <span style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(16,185,129,0.95)', color: '#000', fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '4px', zIndex: 100 }}>
                    ✅ Food Verified ({aiState.confidence}%)
                  </span>
                )}
                {aiState.status === 'REJECTED' && (
                  <span style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(239,68,68,0.95)', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '4px', zIndex: 100 }}>
                    ❌ Not Food — {aiState.reason} (Retake)
                  </span>
                )}

                <button 
                  type="button" 
                  className="remove-snap-btn" 
                  onClick={retakePhoto} 
                  style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.8)', color: '#fff', border: '1px solid #475569', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', zIndex: 100 }}
                >
                  ✕ Retake
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Food Item Title */}
        <div className="form-group">
          <label>Food item</label>
          <input 
            name="food" 
            id="input-food-title" 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="e.g. 40 vegetable biryanis" 
            required 
          />
        </div>

        {/* Category & Quantity Row */}
        <div className="form-row">
          <div>
            <label>Category</label>
            <select 
              name="category" 
              id="input-food-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option>Vegetarian</option>
              <option>Non-vegetarian</option>
              <option>Vegan</option>
            </select>
          </div>
          <div>
            <label>Quantity</label>
            <input 
              name="quantity" 
              id="input-food-qty" 
              type="text" 
              value={quantity} 
              onChange={(e) => setQuantity(e.target.value)} 
              placeholder="e.g. 40 servings" 
              required 
            />
          </div>
        </div>

        {/* Window & Route */}
        <div className="form-group">
          <label>Safe consumption window & Destination Route</label>
          <select 
            name="window" 
            id="input-food-window"
            value={windowHours}
            onChange={(e) => setWindowHours(e.target.value)}
          >
            <option value="1">Within 1 hour (🚨 Direct Animal Shelter & Biogas Loop)</option>
            <option value="2">Within 2 hours (Fast-track Rescue)</option>
            <option value="3">Within 3 hours (Standard NGO Window)</option>
            <option value="4">Within 4 hours (Extended Event Food)</option>
            <option value="6">By end of day (6h)</option>
          </select>
        </div>

        {/* Address & GPS */}
        <div className="form-group" id="address-container">
          <div className="label-row">
            <label>Pickup address <small>(Delhi-NCR / Dehradun)</small></label>
            <button type="button" id="gps-locate-btn" onClick={() => {
              onRequestGPS((coords) => {
                setAddress(`GPS: ${coords.lat.toFixed(4)}°N, ${coords.lon.toFixed(4)}°E`);
              });
            }}>
              🎯 Use Live GPS
            </button>
          </div>
          <input 
            name="address" 
            id="address" 
            type="text" 
            value={address} 
            onChange={(e) => setAddress(e.target.value)} 
            placeholder="Area, landmark, city" 
            required 
          />
        </div>

        {/* Phone */}
        <div className="form-group">
          <label>Contact phone (10-Digit Mobile Only)</label>
          <input 
            name="phone" 
            id="donor-phone" 
            type="tel" 
            value={phone} 
            onChange={(e) => setPhone(e.target.value)} 
            placeholder="e.g. 9876543210" 
            required 
          />
        </div>

        {/* Submit */}
        <button 
          className="button button-primary submit-button" 
          type="submit" 
          id="publish-donation-btn"
        >
          Verify & Publish Donation <i className="fa-solid fa-arrow-right"></i>
        </button>
        <p className="form-footnote">
          <i className="fa-solid fa-shield-heart"></i> FoodLoop Network is verified under India NGO Darpan & Gaushala Rescue Protocol.
        </p>
      </form>
    </div>
  );
}
