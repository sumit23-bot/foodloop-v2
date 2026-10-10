import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  RotateCw, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Lock, 
  ArrowRight, 
  ArrowLeft 
} from 'lucide-react';
import { TermsAndConditionsModal } from './Modals';

export default function DonorForm({ 
  currentUser, 
  userLiveCoords, 
  onRequestGPS, 
  onSubmitDonationInitiate,
  showToast 
}) {
  const [currentStep, setCurrentStep] = useState(1); // 1: Capture proof, 2: Food details, 3: Review and submit

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
  const [aiState, setAiState] = useState({ 
    status: 'IDLE', 
    confidence: 0, 
    reason: '',
    is_bulk: true,
    quantity_level: 'BULK_SURPLUS',
    estimated_servings_range: ''
  }); // IDLE, LOADING, VERIFIED, REJECTED
  
  // Geolocation & Autocomplete State
  const [customCoords, setCustomCoords] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Terms & Conditions Acceptance State
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [pendingDonationPayload, setPendingDonationPayload] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Close suggestions dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Sync phone when currentUser changes
  useEffect(() => {
    if (currentUser?.phone) {
      setPhone(currentUser.phone);
    }
  }, [currentUser]);

  // Fast GPS Auto-Locate with Nominatim Reverse-Geocoding
  const handleGPSAutoLocate = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setGpsLoading(true);

    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 10000
    };

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCustomCoords({ lat, lon });

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
            headers: {
              'Accept-Language': 'en'
            }
          });
          if (res.ok) {
            const data = await res.json();
            const formatted = data.display_name || `GPS: ${lat.toFixed(4)}N, ${lon.toFixed(4)}E`;
            setAddress(formatted);
            const shortName = data.address?.suburb || data.address?.neighbourhood || data.address?.road || data.address?.city || 'Your current location';
            if (showToast) showToast(`Location detected: ${shortName}`);
          } else {
            setAddress(`GPS: ${lat.toFixed(4)}N, ${lon.toFixed(4)}E`);
            if (showToast) showToast('GPS coordinates acquired');
          }
        } catch (_err) {
          setAddress(`GPS: ${lat.toFixed(4)}N, ${lon.toFixed(4)}E`);
          if (showToast) showToast('GPS coordinates acquired');
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        console.warn('Geolocation error:', err.message);
        alert('Could not fetch GPS. Please type address manually.');
      },
      geoOptions
    );
  };

  // Debounced Nominatim Search Autocomplete
  const handleAddressChange = (e) => {
    const val = e.target.value;
    setAddress(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (val.trim().length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val.trim())}&countrycodes=in&limit=5`, {
          headers: {
            'Accept-Language': 'en'
          }
        });
        if (res.ok) {
          const list = await res.json();
          setSuggestions(list || []);
          setShowDropdown(Boolean(list && list.length > 0));
        }
      } catch (err) {
        console.warn('Nominatim search notice:', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  const handleSelectSuggestion = (item) => {
    setAddress(item.display_name);
    setCustomCoords({
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon)
    });
    setSuggestions([]);
    setShowDropdown(false);
    if (showToast) {
      const short = (item.display_name || '').split(',')[0];
      showToast(`Selected: ${short}`);
    }
  };

  // Fast-track presets
  const applyPreset = (presetTitle, presetCat, presetQty, presetWindow) => {
    setTitle(presetTitle);
    setCategory(presetCat);
    setQuantity(presetQty);
    setWindowHours(String(presetWindow));
    if (!address) {
      setAddress('The Grand Heritage Banquet, Sector 29, Gurgaon, Delhi-NCR');
      setCustomCoords({ lat: 28.4695, lon: 77.0658 });
    }
    if (showToast) showToast(`Preset loaded: "${presetTitle}"`);
  };

  // Camera Management
  const startCamera = async () => {
    try {
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } }
        });
      } catch (_envErr) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;
      setIsCameraActive(true);
      setImagePreview('');
      setAiState({ status: 'IDLE', confidence: 0, reason: '' });

      const attachVideo = () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {});
        }
      };
      attachVideo();
      setTimeout(attachVideo, 50);
      setTimeout(attachVideo, 150);
    } catch (err) {
      console.warn('Camera access failed:', err);
      alert('Camera access denied or unavailable: ' + err.message + '\n\nPlease check browser permissions or use "Upload from gallery".');
    }
  };

  useEffect(() => {
    if (isCameraActive && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraActive]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const stampWatermarkOnImage = (imageSrc, coords) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 640;
        canvas.height = img.height || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const now = new Date();
        const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        const coordsStr = coords 
          ? `${coords.lat.toFixed(4)}N, ${coords.lon.toFixed(4)}E` 
          : 'Location Unavailable';

        const fontSize = Math.max(12, Math.floor(canvas.width * 0.024));
        const padding = Math.floor(fontSize * 0.8);
        const boxHeight = fontSize * 3.8;
        const boxWidth = Math.min(canvas.width - 24, Math.max(300, canvas.width * 0.58));
        const boxX = 12;
        const boxY = canvas.height - boxHeight - 12;

        ctx.fillStyle = 'rgba(27, 30, 34, 0.92)';
        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
          ctx.fill();
        } else {
          ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        }
        ctx.fillStyle = '#1E6B3C';
        ctx.fillRect(boxX, boxY, 4, boxHeight);

        ctx.font = `bold ${fontSize}px "Public Sans", sans-serif`;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('FoodLoop Verified Live Proof', boxX + padding + 4, boxY + fontSize * 1.2);

        ctx.font = `${Math.floor(fontSize * 0.88)}px "Public Sans", sans-serif`;
        ctx.fillStyle = '#D9DDE1';
        ctx.fillText(`${dateStr} ${timeStr}`, boxX + padding + 4, boxY + fontSize * 2.3);

        ctx.fillStyle = '#A0AEC0';
        ctx.fillText(`GPS: ${coordsStr}`, boxX + padding + 4, boxY + fontSize * 3.3);

        resolve(canvas.toDataURL('image/jpeg', 0.90));
      };
      img.onerror = () => resolve(imageSrc);
      img.src = imageSrc;
    });
  };

  const downscaleImageForVerification = (dataUrl, maxDim = 800, quality = 0.82) => {
    return new Promise((resolve) => {
      if (!dataUrl || typeof dataUrl !== 'string') return resolve(dataUrl);
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width <= maxDim && height <= maxDim) {
          return resolve(dataUrl);
        }
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    const maxDim = 800;
    let width = vw;
    let height = vh;
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);

    const base64 = canvas.toDataURL('image/jpeg', 0.85);
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
      alert('Please select an image file (JPEG, PNG, etc.)');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (uploadEvt) => {
      const originalBase64 = uploadEvt.target.result;
      stopCamera();
      const readyBase64 = await downscaleImageForVerification(originalBase64, 800, 0.82);
      setImagePreview(readyBase64);
      setIsLiveCapture(false);
      triggerAIVerification(readyBase64);
    };
    reader.readAsDataURL(file);
  };

  const retakePhoto = () => {
    setImagePreview('');
    setIsLiveCapture(false);
    setAiState({ 
      status: 'IDLE', 
      confidence: 0, 
      reason: '', 
      is_bulk: true, 
      quantity_level: 'BULK_SURPLUS', 
      estimated_servings_range: '' 
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // AI Verification Routine
  const triggerAIVerification = async (base64) => {
    if (!base64) return;
    setAiState({ 
      status: 'LOADING', 
      confidence: 0, 
      reason: '', 
      is_bulk: true, 
      quantity_level: 'BULK_SURPLUS', 
      estimated_servings_range: '' 
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const payloadBase64 = await downscaleImageForVerification(base64, 800, 0.82);

      const res = await fetch('/api/ai/verify-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: payloadBase64 }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (res.ok && data.is_food === true && (data.confidence ?? 0) >= 50) {
        setAiState({ 
          status: 'VERIFIED', 
          confidence: data.confidence, 
          reason: data.reason,
          is_bulk: data.is_bulk !== undefined ? data.is_bulk : true,
          quantity_level: data.quantity_level || (data.is_bulk ? 'BULK_SURPLUS' : 'LOW_QUANTITY'),
          estimated_servings_range: data.estimated_servings_range || '',
          verification_token: data.verification_token || '',
          retryable: false
        });
      } else {
        const isRetryable = res.status === 503 || Boolean(data.retryable);
        setAiState({ 
          status: 'REJECTED', 
          confidence: data.confidence || 0, 
          reason: data.reason || (isRetryable ? 'AI service temporarily busy. Please click Retry Check.' : 'Image does not clearly show food.'),
          is_bulk: false,
          quantity_level: 'LOW_QUANTITY',
          estimated_servings_range: '',
          verification_token: '',
          retryable: isRetryable
        });
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn('AI verification failed or timed out:', err);
      setAiState({ 
        status: 'REJECTED', 
        confidence: 0, 
        reason: err.name === 'AbortError' 
          ? 'Verification took too long. Click Retry Check to try again.' 
          : 'Verification service error. Click Retry Check to try again.',
        is_bulk: false,
        quantity_level: 'LOW_QUANTITY',
        estimated_servings_range: '',
        verification_token: '',
        retryable: true
      });
    }
  };

  // Form Submission
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!currentUser) {
      alert('Please Sign In before posting surplus food.');
      return;
    }

    if (!imagePreview) {
      alert('Please capture or upload food photo proof before publishing.');
      setCurrentStep(1);
      return;
    }

    if (aiState.status === 'LOADING') {
      alert('AI food verification in progress. Please wait.');
      return;
    }

    if (aiState.status === 'REJECTED' && !aiState.retryable) {
      alert('AI check did not verify food in this photo. Please retake photo proof.');
      setCurrentStep(1);
      return;
    }

    if (!title.trim()) {
      alert('Please provide a Food Title / Description.');
      setCurrentStep(2);
      return;
    }

    const cleanQty = quantity.trim();
    if (!cleanQty) {
      alert('Please specify the quantity (e.g., 20 servings, 35 packets).');
      setCurrentStep(2);
      return;
    }

    const match = cleanQty.match(/\d+/);
    const parsedQty = match ? parseInt(match[0], 10) : 0;
    if (parsedQty < 10) {
      alert('Minimum 10 Meals Required!\n\nFoodLoop is designed for bulk surplus rescue. Please enter at least 10 meals.');
      setCurrentStep(2);
      return;
    }

    if (!address.trim()) {
      alert('Please provide a pickup address or click "Auto-locate GPS".');
      setCurrentStep(2);
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10 || ['1234567890', '0000000000', '9999999999'].includes(cleanPhone)) {
      alert('Invalid Contact Phone Number. Please enter a valid 10-digit Indian mobile number.');
      setCurrentStep(2);
      return;
    }

    const effectiveCoords = customCoords || userLiveCoords || { lat: 28.6139, lon: 77.2090 };
    let finalImage = imagePreview;
    if (isLiveCapture && imagePreview) {
      try {
        finalImage = await stampWatermarkOnImage(imagePreview, effectiveCoords);
      } catch (err) {
        console.warn('Watermark stamp error:', err);
      }
    }

    const payload = {
      id: Date.now().toString(),
      title: title.trim(),
      category,
      quantity: cleanQty,
      expiry_hours: parseInt(windowHours, 10),
      address: address.trim(),
      phone: cleanPhone,
      donor_name: currentUser.name || currentUser.organization || 'Registered Donor',
      image: finalImage,
      verification_code: 'HW-AUTHENTICATED',
      coords: effectiveCoords,
      is_food_verified: true,
      is_bulk: aiState.is_bulk !== undefined ? aiState.is_bulk : true,
      quantity_level: aiState.quantity_level || (aiState.is_bulk ? 'BULK_SURPLUS' : 'LOW_QUANTITY'),
      estimated_servings_range: aiState.estimated_servings_range || '',
      ai_portion_reason: aiState.reason || '',
      is_live_capture: isLiveCapture,
      ai_detected_class: aiState.reason || 'AI Verified Food',
      ai_verification_token: aiState.verification_token || '',
      trust_score: 100,
      created_at: new Date().toISOString(),
      status: (parseInt(windowHours, 10) <= 1) ? 'DIVERTED_TO_ANIMALS' : 'AVAILABLE'
    };

    setPendingDonationPayload(payload);
    setIsTermsModalOpen(true);
  };

  const handleAcceptTerms = ({ termsVersion, acceptedAt }) => {
    setIsTermsModalOpen(false);
    if (!pendingDonationPayload) return;

    const payloadWithTerms = {
      ...pendingDonationPayload,
      termsAcceptance: {
        version: termsVersion,
        acceptedAt
      }
    };
    setPendingDonationPayload(null);
    onSubmitDonationInitiate(payloadWithTerms);
  };

  const handleCloseTerms = () => {
    setIsTermsModalOpen(false);
  };

  return (
    <div className="post-surplus-container">
      {/* 3-Step Stepper Navigation */}
      <nav className="stepper-nav" aria-label="Donation posting steps">
        <button
          type="button"
          className={`stepper-item ${currentStep === 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}
          onClick={() => setCurrentStep(1)}
        >
          <span className="stepper-number">01</span>
          <span>Capture proof</span>
        </button>

        <button
          type="button"
          className={`stepper-item ${currentStep === 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}
          onClick={() => {
            if (imagePreview) setCurrentStep(2);
            else alert('Please capture or select proof first.');
          }}
        >
          <span className="stepper-number">02</span>
          <span>Food details</span>
        </button>

        <button
          type="button"
          className={`stepper-item ${currentStep === 3 ? 'active' : ''}`}
          onClick={() => {
            if (imagePreview && title && quantity && address) setCurrentStep(3);
            else alert('Please complete steps 1 and 2 first.');
          }}
        >
          <span className="stepper-number">03</span>
          <span>Review &amp; submit</span>
        </button>
      </nav>

      {/* Main Grid: Form Left, Summary & Rules Right */}
      <div className="post-food-grid">
        {/* Left Column: Current Step Content */}
        <div className="surface-card" style={{ padding: '24px' }}>
          {/* STEP 1: CAPTURE PROOF */}
          {currentStep === 1 && (
            <div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '4px' }}>
                Step 1: Capture proof
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Upload or capture live photos of the surplus food. Real-time verification is performed before publishing.
              </p>

              <div className="proof-capture-area">
                {!isCameraActive && !imagePreview && (
                  <>
                    <UploadCloud size={36} strokeWidth={1.5} color="var(--text-secondary)" />
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      Take photo proof or upload from device
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', maxWidth: '380px' }}>
                      Suggested views: Full batch / container shot, seal or cover status, food condition.
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={startCamera}
                      >
                        <Camera size={16} strokeWidth={1.5} />
                        <span>Use camera</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <UploadCloud size={16} strokeWidth={1.5} />
                        <span>Choose from gallery</span>
                      </button>
                    </div>
                  </>
                )}

                {/* Video Feed */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    maxHeight: '320px',
                    objectFit: 'cover',
                    display: isCameraActive ? 'block' : 'none',
                    borderRadius: 'var(--radius-xs)'
                  }}
                />

                {isCameraActive && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={capturePhoto}
                    >
                      <Camera size={16} strokeWidth={1.5} />
                      <span>Capture photo</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={stopCamera}
                    >
                      Close camera
                    </button>
                  </div>
                )}

                {/* Image Preview */}
                {imagePreview && (
                  <div style={{ width: '100%', textAlign: 'center' }}>
                    <img
                      src={imagePreview}
                      alt="Food Proof Preview"
                      style={{
                        width: '100%',
                        maxHeight: '300px',
                        objectFit: 'cover',
                        borderRadius: 'var(--radius-xs)',
                        border: '1px solid var(--border)'
                      }}
                    />
                    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={retakePhoto}
                      >
                        Retake photo
                      </button>
                      {aiState.retryable && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => triggerAIVerification(imagePreview)}
                        >
                          <RotateCw size={14} strokeWidth={1.5} />
                          <span>Retry check</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleGalleryUpload}
                />
              </div>

              {/* AI Photo Check Audit Panel */}
              <div className="ai-audit-box">
                <div className="ai-audit-header">AI Photo Check Audit</div>
                {aiState.status === 'IDLE' && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    Capture or upload a photo to perform visual inspection.
                  </div>
                )}
                {aiState.status === 'LOADING' && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--status-info-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RotateCw size={14} className="spin" />
                    <span>Verifying image contents...</span>
                  </div>
                )}
                {aiState.status === 'VERIFIED' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--status-available-text)', fontWeight: 600, fontSize: '0.8125rem' }}>
                      <CheckCircle2 size={16} strokeWidth={1.5} />
                      <span>{aiState.reason || 'Cooked surplus food confirmed'} ({aiState.confidence}% confidence)</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Volume classification: <strong>{aiState.is_bulk ? 'Bulk surplus' : 'Standard portion'}</strong>
                      {aiState.estimated_servings_range && ` (${aiState.estimated_servings_range})`}
                    </div>
                  </div>
                )}
                {aiState.status === 'REJECTED' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--status-critical-text)', fontSize: '0.8125rem' }}>
                    <AlertCircle size={16} strokeWidth={1.5} />
                    <span>{aiState.reason || 'Image could not be verified as surplus food.'}</span>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!imagePreview}
                  onClick={() => setCurrentStep(2)}
                >
                  <span>Continue to food details</span>
                  <ArrowRight size={15} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: FOOD DETAILS */}
          {currentStep === 2 && (
            <div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '4px' }}>
                Step 2: Food details
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Specify consignment details, volume, safe window, and pickup coordinates.
              </p>

              {/* Fast-Track Presets */}
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--canvas)', borderRadius: 'var(--radius-xs)' }}>
                <span className="label-caps" style={{ display: 'block', marginBottom: '8px' }}>
                  Fast-Track Presets
                </span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => applyPreset('Buffet Surplus: 50 Rice, Dal & Sabzi', 'Vegetarian', '50 servings', 3)}
                  >
                    Buffet (50 pax)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => applyPreset('Bakery Surplus: Fresh Bread & Buns', 'Vegetarian', '30 packets', 4)}
                  >
                    Bakery box (30 pcs)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => applyPreset('Event Meal Boxes (Paneer & Roti)', 'Vegetarian', '40 boxes', 2)}
                  >
                    Packed meals (40 boxes)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => applyPreset('Short Window Surplus: 25 Meals', 'Vegetarian', '25 servings', 1)}
                  >
                    Short window (&lt;1h Animal Loop)
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="food-title">Food Title / Consignment Description</label>
                <input
                  id="food-title"
                  type="text"
                  placeholder="e.g., Fresh Dal Makhani & Phulkas, Veg Pulao"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="food-category">Category</label>
                  <select
                    id="food-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="Vegetarian">Vegetarian</option>
                    <option value="Non-Vegetarian">Non-Vegetarian</option>
                    <option value="Bakery">Bakery / Packaged</option>
                    <option value="Raw Ration">Raw Ration / Staples</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="food-quantity">Estimated Volume (Min 10 meals)</label>
                  <input
                    id="food-quantity"
                    type="text"
                    placeholder="e.g., 65 meals, 40 boxes"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="consumption-window">Safe Consumption Window</label>
                <select
                  id="consumption-window"
                  value={windowHours}
                  onChange={(e) => setWindowHours(e.target.value)}
                >
                  <option value="1">1 hour (Diverted directly to animal loop)</option>
                  <option value="2">2 hours (Urgent human pickup)</option>
                  <option value="3">3 hours (Standard cooked food window)</option>
                  <option value="4">4 hours (Freshly prepared / insulated)</option>
                  <option value="6">6 hours (Cold stored / sealed)</option>
                </select>
                <div className="form-helper">
                  {parseInt(windowHours, 10) <= 1 
                    ? 'Consignments with 1-hour window route directly to animal shelters & gaushalas.' 
                    : 'Recommended consumption window for hot cooked food is 3 to 4 hours.'}
                </div>
              </div>

              <div className="form-group" style={{ position: 'relative' }} ref={dropdownRef}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" htmlFor="pickup-address" style={{ margin: 0 }}>Pickup Address / Location</label>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleGPSAutoLocate}
                    disabled={gpsLoading}
                    style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                  >
                    <MapPin size={12} strokeWidth={1.5} />
                    <span>{gpsLoading ? 'Locating...' : 'Auto-locate GPS'}</span>
                  </button>
                </div>
                <input
                  id="pickup-address"
                  type="text"
                  placeholder="Start typing area, hotel, banquet or sector..."
                  value={address}
                  onChange={handleAddressChange}
                  required
                />
                {showDropdown && suggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-xs)',
                    boxShadow: 'var(--shadow-dialog)',
                    zIndex: 200,
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    {suggestions.map((s, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectSuggestion(s)}
                        style={{
                          padding: '8px 12px',
                          borderBottom: '1px solid var(--border)',
                          fontSize: '0.8125rem',
                          cursor: 'pointer'
                        }}
                      >
                        {s.display_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="donor-phone">Contact Mobile Number</label>
                <input
                  id="donor-phone"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={10}
                  required
                />
                <div className="form-helper">
                  Protected: Your mobile number remains hidden until claimed by a verified NGO partner.
                </div>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCurrentStep(1)}
                >
                  <ArrowLeft size={15} strokeWidth={1.5} />
                  <span>Back to proof</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    if (!title.trim() || !quantity.trim() || !address.trim() || !phone.trim()) {
                      alert('Please fill all required food details before continuing.');
                      return;
                    }
                    setCurrentStep(3);
                  }}
                >
                  <span>Continue to review</span>
                  <ArrowRight size={15} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW AND SUBMIT */}
          {currentStep === 3 && (
            <div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '4px' }}>
                Step 3: Review and submit
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Review consignment summary before final OTP verification.
              </p>

              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '14px' }}>
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Proof"
                      style={{ width: '90px', height: '90px', objectFit: 'cover', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border)' }}
                    />
                  )}
                  <div>
                    <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', marginBottom: '2px' }}>{title || 'Surplus Food'}</h4>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {quantity} · {category} · {windowHours}h window
                    </p>
                    <span className={`status-chip ${parseInt(windowHours, 10) <= 1 ? 'expiring' : 'available'}`}>
                      {parseInt(windowHours, 10) <= 1 ? 'Direct to Animal Loop' : 'Human Community Rescue'}
                    </span>
                  </div>
                </div>

                <div className="detail-meta-list" style={{ margin: 0, padding: 0, border: 'none' }}>
                  <div className="detail-meta-item">
                    <span>Pickup Address</span>
                    <span style={{ maxWidth: '280px', textAlign: 'right' }}>{address}</span>
                  </div>
                  <div className="detail-meta-item">
                    <span>Donor Name</span>
                    <span>{currentUser?.name || currentUser?.organization || 'Registered Donor'}</span>
                  </div>
                  <div className="detail-meta-item">
                    <span>Contact Phone</span>
                    <span>+91 {phone} (Protected until claim)</span>
                  </div>
                  <div className="detail-meta-item">
                    <span>AI Food Verification</span>
                    <span>{aiState.status === 'VERIFIED' ? `Passed (${aiState.confidence}%)` : 'Bypassed / Pending'}</span>
                  </div>
                </div>
              </div>

              <div style={{
                backgroundColor: 'var(--canvas)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xs)',
                padding: '12px 16px',
                marginBottom: '20px',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)'
              }}>
                By proceeding, you certify that the food has been safely stored, is suitable for consumption, and accept the FoodLoop surplus rescue terms.
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCurrentStep(2)}
                >
                  <ArrowLeft size={15} strokeWidth={1.5} />
                  <span>Back to details</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSubmit}
                >
                  <ShieldCheck size={16} strokeWidth={1.5} />
                  <span>Review terms &amp; publish listing</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Consignment Summary & Listing Protocol */}
        <aside>
          {/* Summary Card */}
          <div className="surface-card" style={{ padding: '20px', marginBottom: '20px' }}>
            <span className="label-caps" style={{ display: 'block', marginBottom: '8px' }}>
              Consignment Summary
            </span>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {title || 'New Surplus Entry'}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              {quantity ? `${quantity} · ` : ''}{category}
            </div>

            <div className="detail-meta-list" style={{ margin: '12px 0', padding: '10px 0' }}>
              <div className="detail-meta-item">
                <span>Safe window</span>
                <span>{windowHours} hours</span>
              </div>
              <div className="detail-meta-item">
                <span>Status target</span>
                <span>{parseInt(windowHours, 10) <= 1 ? 'Animal Loop' : 'Human Feed'}</span>
              </div>
              <div className="detail-meta-item">
                <span>AI Photo Check</span>
                <span>{aiState.status === 'VERIFIED' ? 'Verified' : 'Pending'}</span>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              Location: {address ? (address.split(',')[0] || address) : 'Not specified yet'}
            </div>
          </div>

          {/* Listing Rules & Protocol Card */}
          <div className="surface-card" style={{ padding: '20px' }}>
            <span className="label-caps" style={{ display: 'block', marginBottom: '8px' }}>
              Listing Rules &amp; Protocol
            </span>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              <li style={{ display: 'flex', gap: '8px' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>1.</span>
                <span><strong>Minimum 10 meals:</strong> FoodLoop is for bulk institutional &amp; event surplus.</span>
              </li>
              <li style={{ display: 'flex', gap: '8px' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>2.</span>
                <span><strong>Protected privacy:</strong> Donor phone &amp; exact address unlock only after claim by verified NGO.</span>
              </li>
              <li style={{ display: 'flex', gap: '8px' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>3.</span>
                <span><strong>Secondary loop:</strong> Unclaimed surplus &le; 1 hour safely diverts to gaushalas.</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      {/* Terms and Conditions Acceptance Modal */}
      <TermsAndConditionsModal
        isOpen={isTermsModalOpen}
        onClose={handleCloseTerms}
        onAccept={handleAcceptTerms}
      />
    </div>
  );
}
