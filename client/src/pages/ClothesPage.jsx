import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import L from 'leaflet';
import { useCameraCapture } from '../hooks/useCameraCapture';
import { calculateDistance } from '../data/directory';
import { AuthModal, DisputeModal } from '../components/Modals';
import SponsorWinterKitModal from '../components/SponsorWinterKitModal';
import WeddingPurchaseModal from '../components/WeddingPurchaseModal';

export default function ClothesPage() {
  // User & Auth State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('foodloop_auth_user') || 'null');
    } catch (_) {
      return null;
    }
  });

  const getAuthToken = () => {
    let token = localStorage.getItem('foodloop_auth_token');
    if (!token && currentUser) {
      token = 'demo_token_' + btoa(unescape(encodeURIComponent(JSON.stringify(currentUser))));
      localStorage.setItem('foodloop_auth_token', token);
    }
    return token;
  };

  const [toastMessage, setToastMessage] = useState('');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [viewMode, setViewMode] = useState('PAGE'); // 'PAGE' or 'MAP'

  // Clothes Listings
  const [clothesListings, setClothesListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [disputeListing, setDisputeListing] = useState(null);

  // User GPS
  const [userCoords, setUserCoords] = useState({ lat: 28.6139, lon: 77.2090 });

  // Form Fields
  const [category, setCategory] = useState('Men');
  const [size, setSize] = useState('M');
  const [season, setSeason] = useState('All-Season');
  const [garmentType, setGarmentType] = useState('');
  const [isWashed, setIsWashed] = useState(true);
  const [isBulk, setIsBulk] = useState(false);
  const [bulkNote, setBulkNote] = useState('');
  const [isResaleEligible, setIsResaleEligible] = useState(false);
  const [resalePrice, setResalePrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Brand CSR Campaigns & Kit Modal States (Phase C & D)
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignForKit, setSelectedCampaignForKit] = useState(null);
  const [isKitModalOpen, setIsKitModalOpen] = useState(false);

  // Wedding Resale Purchase Modal States (Phase E)
  const [selectedItemForPurchase, setSelectedItemForPurchase] = useState(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  // Dynamic Scroll Refs
  const campaignsRailRef = React.useRef(null);
  const feedScrollRef = React.useRef(null);

  const scrollCampaigns = (direction) => {
    if (campaignsRailRef.current) {
      const offset = direction === 'left' ? -380 : 380;
      campaignsRailRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const scrollToFeedTop = () => {
    if (feedScrollRef.current) {
      feedScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // AI Verification State
  const [aiState, setAiState] = useState({
    status: 'IDLE', // 'IDLE' | 'LOADING' | 'VERIFIED' | 'REJECTED'
    confidence: 0,
    conditionGrade: 'Wearable',
    reason: ''
  });

  // Filter States for Feed
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [seasonFilter, setSeasonFilter] = useState('ALL');
  const [ngoPreferenceFilter, setNgoPreferenceFilter] = useState('ALL');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Camera Capture Hook
  const {
    isCameraActive,
    imagePreview,
    setImagePreview,
    isLiveCapture,
    setIsLiveCapture,
    videoRef,
    fileInputRef,
    startCamera,
    stopCamera,
    capturePhoto,
    handleGalleryUpload,
    retakePhoto
  } = useCameraCapture({
    watermarkTitle: '🛡️ ClothesLoop Verified Live Proof',
    onCaptureCompleted: (base64, isLive) => {
      triggerAIVerification(base64);
    }
  });

  // Acquire GPS and fetch data on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => console.log('Using default Delhi coords.')
      );
    }
    fetchClothesListings();
    fetchCampaigns();
  }, []);

  const fetchClothesListings = async () => {
    setLoadingListings(true);
    try {
      const res = await fetch('/api/clothes');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setClothesListings(data);
      }
    } catch (err) {
      console.warn('Failed to load clothes listings:', err);
    } finally {
      setLoadingListings(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/clothes/campaigns');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setCampaigns(data);
      }
    } catch (err) {
      console.warn('Failed to load campaigns:', err);
    }
  };

  // Trigger AI Clothing Verification
  const triggerAIVerification = async (base64) => {
    setAiState({ status: 'LOADING', confidence: 0, conditionGrade: 'Wearable', reason: '' });
    try {
      const res = await fetch('/api/ai/verify-clothing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 })
      });
      const data = await res.json();

      if (data.is_clothing === true && (data.confidence ?? 0) >= 60) {
        setAiState({
          status: 'VERIFIED',
          confidence: data.confidence,
          conditionGrade: data.condition_grade || 'Wearable',
          reason: data.reason
        });
      } else {
        setAiState({
          status: 'REJECTED',
          confidence: data.confidence || 0,
          conditionGrade: data.condition_grade || 'Wearable',
          reason: data.reason || 'Image could not be confirmed as clothing.'
        });
      }
    } catch (err) {
      setAiState({
        status: 'REJECTED',
        confidence: 0,
        conditionGrade: 'Wearable',
        reason: 'Verification service unreachable.'
      });
    }
  };

  // Handle Capture button click
  const handleCaptureClick = async () => {
    const finalImage = await capturePhoto(userCoords);
    if (finalImage) {
      triggerAIVerification(finalImage);
    }
  };

  // Handle Form Submit
  const handleSubmitDonation = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      alert('🔒 Please sign in or use a demo persona to donate clothes.');
      setIsAuthOpen(true);
      return;
    }

    if (!imagePreview) {
      alert('❌ Photo Proof is Mandatory!\n\nPlease capture a photo or upload an image of the clothing.');
      return;
    }

    if (aiState.status === 'LOADING') {
      alert('⏳ AI Verification in progress — please wait for inspection to finish.');
      return;
    }

    if (aiState.status !== 'VERIFIED') {
      alert(`❌ Clothing Not Verified\n\n${aiState.reason || 'The AI could not confirm this image is a donatable garment.'}\n\nPlease retake or upload a clear photo of the garment.`);
      return;
    }

    if (!garmentType.trim()) {
      alert('⚠️ Please specify garment type (e.g. Sweater, Jacket, School Uniform).');
      return;
    }

    if (isResaleEligible && (!resalePrice || Number(resalePrice) <= 0)) {
      alert('⚠️ Please specify a valid asking price (in INR) for Wedding & Special Wear Resale.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = getAuthToken();
      const payload = {
        category,
        size,
        season,
        garment_type: garmentType.trim(),
        is_washed_sanitized: isWashed,
        is_bulk_donation: isBulk,
        bulk_note: isBulk ? bulkNote.trim() : '',
        is_resale_eligible: isResaleEligible,
        resale_price: isResaleEligible ? Number(resalePrice) : 0,
        image: imagePreview,
        coords: userCoords,
        ai_is_clothing: true,
        ai_confidence: aiState.confidence,
        ai_condition_grade: aiState.conditionGrade,
        ai_reason: aiState.reason
      };

      const res = await fetch('/api/clothes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        showToast('🎉 Clothing donation verified & published live to rescue network!');
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        // Reset form
        retakePhoto();
        setGarmentType('');
        setIsBulk(false);
        setBulkNote('');
        setIsResaleEligible(false);
        setResalePrice('');
        setAiState({ status: 'IDLE', confidence: 0, conditionGrade: 'Wearable', reason: '' });
        fetchClothesListings();
      } else {
        alert(data.error || 'Failed to submit clothing donation.');
      }
    } catch (err) {
      alert('Network error submitting donation. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Claim handler for NGOs
  const handleClaimClothes = async (listing) => {
    if (!currentUser) {
      alert('🔒 Please sign in as an NGO or shelter to claim clothing donations.');
      setIsAuthOpen(true);
      return;
    }

    if (currentUser.role !== 'NGO' && currentUser.role !== 'SHELTER' && currentUser.role !== 'ANIMAL_SHELTER') {
      alert('🔒 Only verified NGOs and Shelters are authorized to claim clothing donations.');
      return;
    }

    const orgName = currentUser.organization || currentUser.name || 'Verified NGO Partner';
    const orgPhone = currentUser.phone || '';
    const orgDarpan = currentUser.ngo_darpan_id || currentUser.darpan_id || '';
    const listingId = listing._id || listing.id;

    try {
      const token = getAuthToken();
      const res = await fetch(`/api/clothes/${listingId}/claim`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          claimant_org: orgName,
          ngo_name: orgName,
          claimant_phone: orgPhone,
          darpan_id: orgDarpan
        })
      });

      if (res.ok) {
        showToast(`✅ Clothing listing claimed by ${orgName}!`);
        fetchClothesListings();
      } else {
        const d = await res.json();
        alert(d.error || 'Claim failed.');
      }
    } catch (err) {
      alert('Error claiming clothes listing.');
    }
  };

  // Dispute report handler for NGOs
  const handleSubmitDispute = async (report) => {
    try {
      const token = getAuthToken();
      const listing = clothesListings.find(l => String(l._id || l.id) === String(report.listingId));
      const distanceKm = listing && report.reportedCoords
        ? calculateDistance(report.reportedCoords.lat, report.reportedCoords.lon, listing.coords?.lat, listing.coords?.lon)
        : 0;

      const res = await fetch(`/api/clothes/${report.listingId}/report-fake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          reporter_name: currentUser?.name || currentUser?.organization || 'Anonymous Reporter',
          reporter_phone: currentUser?.phone || '',
          darpan_id: currentUser?.ngo_darpan_id || currentUser?.darpan_id || '',
          reason: report.reason,
          evidence_image: report.evidencePhoto,
          reporter_distance_km: distanceKm
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || '🚩 Incident report filed with geotagged proof.');
        fetchClothesListings();
      } else {
        alert(data.error || 'Failed to submit incident report.');
      }
    } catch (err) {
      alert('Could not submit report — please check your network connection.');
    }
  };

  // Filter listings
  const filteredListings = clothesListings.filter(item => {
    if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
    if (seasonFilter !== 'ALL' && item.season !== seasonFilter) return false;
    if (ngoPreferenceFilter !== 'ALL') {
      if (item.category !== ngoPreferenceFilter && item.size !== ngoPreferenceFilter) return false;
    }
    return true;
  });

  // Separate normal claimable listings from recycling-routed listings
  const normalListings = filteredListings
    .filter(item => !item.routed_for_recycling)
    .sort((a, b) => {
      // Winter priority pinned to top
      if (a.is_winter_priority && !b.is_winter_priority) return -1;
      if (!a.is_winter_priority && b.is_winter_priority) return 1;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

  const recyclingListings = filteredListings.filter(item => item.routed_for_recycling);

  return (
    <div style={{ minHeight: '100vh', background: '#0b0f19', color: '#f8fafc', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Site Header */}
      <header className="site-header" style={{ position: 'sticky', top: 0, zIndex: 100, background: '#0b0f19 border-bottom: 1px solid #1e293b' }}>
        <div className="container nav-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link to="/" style={{ textDecoration: 'none' }} className="brand">
              <span>clothes<span style={{ color: '#c084fc' }}>loop</span></span>
              <span className="live-dot" style={{ background: '#a855f7' }}></span>
            </Link>
            <span style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.5)', padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700 }}>
              FoodLoop Network
            </span>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Link 
              to="/" 
              style={{
                color: '#34d399',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '6px 12px',
                borderRadius: '8px'
              }}
            >
              🍲 Return to FoodLoop
            </Link>

            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'PAGE' ? 'MAP' : 'PAGE')}
              style={{
                background: viewMode === 'MAP' ? '#a855f7' : 'rgba(168, 85, 247, 0.15)',
                color: viewMode === 'MAP' ? '#000' : '#c084fc',
                border: '1.5px solid rgba(168, 85, 247, 0.4)',
                padding: '6px 14px',
                borderRadius: '8px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              🗺️ {viewMode === 'MAP' ? 'Back to Listings' : 'Clothes Radar Map'}
            </button>

            {currentUser ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 600 }}>
                  👤 {currentUser.name || currentUser.organization}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentUser(null);
                    localStorage.removeItem('foodloop_auth_user');
                    localStorage.removeItem('foodloop_auth_token');
                    showToast('Logged out.');
                  }}
                  style={{ background: '#334155', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="button button-small button-outline"
                onClick={() => setIsAuthOpen(true)}
              >
                Sign In / NGO Portal
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Main View Mode Switch */}
      {viewMode === 'MAP' ? (
        <ClothesRadarMapView 
          listings={clothesListings} 
          userCoords={userCoords} 
          currentUser={currentUser} 
          onClaim={handleClaimClothes}
        />
      ) : (
        <main>
          {/* Distinct Hero Section */}
          <section style={{ padding: '60px 0 40px 0', borderBottom: '1px solid #1e293b', background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0b0f19 70%)' }}>
            <div className="container" style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)', padding: '4px 14px', borderRadius: '9999px', fontSize: '13px', fontWeight: 700, marginBottom: '16px' }}>
                👕 ClothesLoop • Surplus Clothing & Textile Rescue
              </span>
              <h1 style={{ fontSize: '2.8rem', fontWeight: 900, letterSpacing: '-0.02em', margin: '12px 0', color: '#fff' }}>
                Warmth & Dignity for Every Wardrobe.
              </h1>
              <p style={{ maxWidth: '680px', margin: '0 auto 24px auto', fontSize: '1.1rem', color: '#94a3b8', lineHeight: 1.6 }}>
                Donate clean surplus garments, winter warmers, and uniforms. Reusing FoodLoop’s cryptographic geotagging and calibrated AI vision to route wearable clothes to shelters and worn textiles for responsible recycling.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <a href="#clothes-form-section" className="button button-primary" style={{ background: '#a855f7', borderColor: '#a855f7', color: '#fff' }}>
                  Donate Clothes Now <i className="fa-solid fa-arrow-down"></i>
                </a>
                <a href="#clothes-feed-section" className="button button-outline">
                  Browse Active Listings <i className="fa-solid fa-shirt"></i>
                </a>
              </div>
            </div>
          </section>

          {/* Phase C & D: Sponsored Winter Drives & Brand Take-Back Programs */}
          <section style={{ maxWidth: '1180px', margin: '32px auto 0', padding: '0 20px' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.75), rgba(15, 23, 42, 0.95))',
              border: '1.5px solid #4338ca',
              borderRadius: '16px',
              padding: '24px 28px',
              boxShadow: '0 15px 30px rgba(0,0,0,0.4)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>❄️</span>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      CSR Brand Partnerships & Winter Relief
                    </span>
                  </div>
                  <h2 style={{ margin: '4px 0 0', fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
                    Sponsored Winter Drives & Brand Take-Back Programs
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                    Verified fashion brands match community apparel donations with thermal survival kits for homeless night shelters.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '6px', background: 'rgba(15, 23, 42, 0.7)', padding: '4px', borderRadius: '8px', border: '1px solid #334155' }}>
                    <button
                      type="button"
                      onClick={() => scrollCampaigns('left')}
                      style={{
                        background: '#1e293b',
                        color: '#cbd5e1',
                        border: '1px solid #475569',
                        borderRadius: '6px',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontWeight: 800,
                        fontSize: '14px'
                      }}
                      title="Scroll Left"
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollCampaigns('right')}
                      style={{
                        background: '#1e293b',
                        color: '#cbd5e1',
                        border: '1px solid #475569',
                        borderRadius: '6px',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontWeight: 800,
                        fontSize: '14px'
                      }}
                      title="Scroll Right"
                    >
                      ▶
                    </button>
                  </div>
                  <Link
                    to="/clothes/bulk-dashboard"
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      color: '#34d399',
                      textDecoration: 'none',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    🏫 Schools & Corporate HR Portal
                  </Link>
                  <Link
                    to="/clothes/recycler-dashboard"
                    style={{
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      color: '#38bdf8',
                      textDecoration: 'none',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    ♻️ Textile Recyclers Access
                  </Link>
                </div>
              </div>

              {/* Campaign Cards Dynamic Horizontal Scroll Rail */}
              <div 
                ref={campaignsRailRef}
                className="dynamic-horizontal-scroll"
              >
                {campaigns.map(camp => {
                  const funded = camp.funded_kits || 0;
                  const target = camp.target_kits || 500;
                  const percent = Math.min(100, Math.round((funded / target) * 100));
                  return (
                    <div
                      key={camp._id || camp.id}
                      style={{
                        flex: '0 0 350px',
                        scrollSnapAlign: 'start',
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        padding: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                            Powered by {camp.brand_name}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1' }}>
                            ₹{camp.kit_price_inr || 500}/kit
                          </span>
                        </div>

                        <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: '#f8fafc', fontWeight: 700 }}>
                          {camp.campaign_title}
                        </h4>
                        <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
                          {camp.description || 'Matching donor clothes with verified winter survival kits.'}
                        </p>

                        {/* Progress Bar */}
                        <div style={{ marginBottom: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                            <span>{funded} / {target} Kits Funded</span>
                            <span style={{ color: '#34d399', fontWeight: 700 }}>{percent}%</span>
                          </div>
                          <div style={{ width: '100%', height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${percent}%`, height: '100%', background: 'linear-gradient(90deg, #059669, #10b981)', borderRadius: '4px' }}></div>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCampaignForKit(camp);
                          setIsKitModalOpen(true);
                        }}
                        style={{
                          width: '100%',
                          background: 'linear-gradient(135deg, #059669, #10b981)',
                          color: '#ffffff',
                          border: 'none',
                          padding: '10px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        ❤️ Sponsor a Winter Shield Kit (₹{camp.kit_price_inr || 500})
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Form & Feed Container */}
          <div className="container" style={{ maxWidth: '1180px', margin: '30px auto', padding: '0 20px', display: 'grid', gridTemplateColumns: 'minmax(320px, 460px) 1fr', gap: '36px' }}>
            
            {/* Step C: Clothes Donation Form Section */}
            <section id="clothes-form-section" style={{ position: 'sticky', top: '80px', alignSelf: 'start' }}>
              <div style={{ background: '#111827', border: '1.5px solid #334155', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                <div style={{ marginBottom: '20px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Verified Donor Portal
                  </span>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px' }}>
                    Post a Clothing Donation
                  </h2>
                </div>

                {/* Camera / Upload Section */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>
                    📸 Live Photo Proof & Inspection (Mandatory)
                  </label>

                  {/* Live Video Feed */}
                  <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#000', marginBottom: '12px', display: isCameraActive ? 'block' : 'none' }}>
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      style={{ width: '100%', height: '260px', objectFit: 'cover', display: 'block' }} 
                    />
                    <div style={{ position: 'absolute', bottom: '12px', left: '0', right: '0', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={handleCaptureClick}
                        style={{ background: '#a855f7', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                      >
                        <i className="fa-solid fa-camera"></i> Capture & Geotag
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        style={{ background: '#334155', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                  {/* Captured Image Preview */}
                  {!isCameraActive && imagePreview && (
                    <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1.5px solid #334155', marginBottom: '12px' }}>
                      <img src={imagePreview} alt="Clothing proof" style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', display: 'block' }} />
                      <button
                        type="button"
                        onClick={retakePhoto}
                        style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(15, 23, 42, 0.85)', color: '#f87171', border: '1px solid #ef4444', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        <i className="fa-solid fa-rotate-left"></i> Retake
                      </button>
                    </div>
                  )}

                  {/* Initial Buttons when no photo */}
                  {!isCameraActive && !imagePreview && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                      <button
                        type="button"
                        onClick={startCamera}
                        style={{ background: 'rgba(168, 85, 247, 0.15)', border: '1.5px dashed #a855f7', color: '#c084fc', padding: '16px 10px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
                      >
                        <i className="fa-solid fa-camera" style={{ fontSize: '20px' }}></i>
                        <span>Start Camera</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ background: '#1e293b', border: '1.5px dashed #475569', color: '#94a3b8', padding: '16px 10px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
                      >
                        <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '20px' }}></i>
                        <span>Upload Photo</span>
                      </button>
                      <input 
                        ref={fileInputRef} 
                        type="file" 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={handleGalleryUpload} 
                      />
                    </div>
                  )}

                  {/* AI Verification Banner */}
                  {aiState.status === 'LOADING' && (
                    <div style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', padding: '10px 14px', borderRadius: '8px', color: '#38bdf8', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="pulse"></span> Verifying clothing item with AI Vision…
                    </div>
                  )}

                  {aiState.status === 'VERIFIED' && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', padding: '10px 14px', borderRadius: '8px', color: '#34d399', fontSize: '13px' }}>
                      <div style={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>✅ Clothing Verified ({aiState.confidence}% Confidence)</span>
                        <span style={{ background: '#10b981', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                          {aiState.conditionGrade}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#cbd5e1' }}>{aiState.reason}</p>
                    </div>
                  )}

                  {aiState.status === 'REJECTED' && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', padding: '10px 14px', borderRadius: '8px', color: '#f87171', fontSize: '13px' }}>
                      <strong style={{ display: 'block' }}>❌ Verification Rejected</strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>{aiState.reason}</p>
                    </div>
                  )}
                </div>

                {/* Form Inputs */}
                <form onSubmit={handleSubmitDonation}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
                        Category *
                      </label>
                      <select 
                        value={category} 
                        onChange={(e) => setCategory(e.target.value)}
                        style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px 10px', borderRadius: '8px', fontSize: '13px' }}
                      >
                        <option value="Men">Men</option>
                        <option value="Women">Women</option>
                        <option value="Kids">Kids</option>
                        <option value="Infant">Infant</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
                        Size
                      </label>
                      <select 
                        value={size} 
                        onChange={(e) => setSize(e.target.value)}
                        style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px 10px', borderRadius: '8px', fontSize: '13px' }}
                      >
                        <option value="XS">XS</option>
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                        <option value="XXL">XXL</option>
                        <option value="Free Size">Free Size</option>
                        <option value="0-2 Yrs">0-2 Yrs (Infant)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
                        Season
                      </label>
                      <select 
                        value={season} 
                        onChange={(e) => setSeason(e.target.value)}
                        style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px 10px', borderRadius: '8px', fontSize: '13px' }}
                      >
                        <option value="All-Season">All-Season</option>
                        <option value="Winter">Winter</option>
                        <option value="Summer">Summer</option>
                        <option value="Monsoon">Monsoon</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
                        Garment Type *
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g. Woolen Sweater, Jacket, Uniform"
                        value={garmentType}
                        onChange={(e) => setGarmentType(e.target.value)}
                        style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px 10px', borderRadius: '8px', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  {/* Washed & Sanitized Checkbox */}
                  <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="checkbox" 
                      id="washed-check" 
                      checked={isWashed}
                      onChange={(e) => setIsWashed(e.target.checked)}
                      style={{ accentColor: '#a855f7', width: '16px', height: '16px' }}
                    />
                    <label htmlFor="washed-check" style={{ fontSize: '13px', color: '#e2e8f0', cursor: 'pointer' }}>
                      ✨ Washed & Sanitized before donation
                    </label>
                  </div>

                  {/* Bulk Donation Toggle */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: isBulk ? '8px' : '0' }}>
                      <input 
                        type="checkbox" 
                        id="bulk-toggle" 
                        checked={isBulk}
                        onChange={(e) => setIsBulk(e.target.checked)}
                        style={{ accentColor: '#a855f7', width: '16px', height: '16px' }}
                      />
                      <label htmlFor="bulk-toggle" style={{ fontSize: '13px', color: '#e2e8f0', cursor: 'pointer', fontWeight: 700 }}>
                        📦 This is a bulk donation (drive / corporate / event)
                      </label>
                    </div>

                    {isBulk && (
                      <input 
                        type="text" 
                        placeholder="Optional note e.g. Office decluttering drive (approx 30 pcs)"
                        value={bulkNote}
                        onChange={(e) => setBulkNote(e.target.value)}
                        style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px 10px', borderRadius: '8px', fontSize: '12px' }}
                      />
                    )}
                  </div>

                  {/* Wedding & Special Festive Resale-Donation Hybrid (Phase E) */}
                  <div style={{
                    marginBottom: '18px',
                    background: isResaleEligible ? 'rgba(219, 39, 119, 0.12)' : 'rgba(15, 23, 42, 0.4)',
                    border: isResaleEligible ? '1.5px solid #db2777' : '1px dashed #334155',
                    borderRadius: '10px',
                    padding: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: isResaleEligible ? '10px' : '0' }}>
                      <input 
                        type="checkbox" 
                        id="resale-toggle" 
                        checked={isResaleEligible}
                        onChange={(e) => setIsResaleEligible(e.target.checked)}
                        style={{ accentColor: '#db2777', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <label htmlFor="resale-toggle" style={{ fontSize: '13px', color: '#f472b6', cursor: 'pointer', fontWeight: 700 }}>
                        💫 List as Wedding & Festive Wear Resale (10% Charity Split)
                      </label>
                    </div>

                    {isResaleEligible && (
                      <div>
                        <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
                          For pre-loved wedding lehengas, sherwanis, and festive silk attire. 90% payout is returned to you upon sale, while 10% is directly channeled into FoodLoop shelter meal rescue funds.
                        </p>
                        <label style={{ display: 'block', fontSize: '11px', color: '#cbd5e1', marginBottom: '4px', fontWeight: 600 }}>
                          Asking Price in INR (₹) *
                        </label>
                        <input 
                          type="number"
                          placeholder="e.g. 4500"
                          value={resalePrice}
                          onChange={(e) => setResalePrice(e.target.value)}
                          style={{ width: '100%', background: '#1e293b', border: '1px solid #db2777', color: '#fff', padding: '8px 10px', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                          min="100"
                        />
                        {Number(resalePrice) > 0 && (
                          <div style={{ fontSize: '11px', color: '#34d399', marginTop: '6px', fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', padding: '6px 8px', borderRadius: '6px' }}>
                            💡 Split Breakdown: You receive ₹{Math.round(Number(resalePrice) * 0.90)} (90%) • Shelter Relief receives ₹{Math.round(Number(resalePrice) * 0.10)} (10%)
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || aiState.status !== 'VERIFIED'}
                    style={{
                      width: '100%',
                      background: aiState.status === 'VERIFIED' ? '#a855f7' : '#334155',
                      color: '#fff',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '14px',
                      cursor: aiState.status === 'VERIFIED' ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isSubmitting ? 'Publishing...' : 'Publish Clothes Listing Live'}
                  </button>
                </form>
              </div>
            </section>

            {/* Step D: Feed Section */}
            <section id="clothes-feed-section">
              <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Live Rescue Feed
                  </span>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '2px 0 0 0' }}>
                    Available Clothes Donations
                  </h2>
                </div>

                {/* Feed Filters */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <select 
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '6px 10px', borderRadius: '8px', fontSize: '12px' }}
                  >
                    <option value="ALL">All Categories</option>
                    <option value="Men">Men</option>
                    <option value="Women">Women</option>
                    <option value="Kids">Kids</option>
                    <option value="Infant">Infant</option>
                  </select>

                  <select 
                    value={seasonFilter}
                    onChange={(e) => setSeasonFilter(e.target.value)}
                    style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '6px 10px', borderRadius: '8px', fontSize: '12px' }}
                  >
                    <option value="ALL">All Seasons</option>
                    <option value="Winter">Winter</option>
                    <option value="Summer">Summer</option>
                    <option value="Monsoon">Monsoon</option>
                    <option value="All-Season">All-Season</option>
                  </select>

                  {/* NGO Preference Filter (Step D4) */}
                  {currentUser?.role === 'NGO' && (
                    <select
                      value={ngoPreferenceFilter}
                      onChange={(e) => setNgoPreferenceFilter(e.target.value)}
                      style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', color: '#38bdf8', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700 }}
                    >
                      <option value="ALL">🎯 NGO Target Filter</option>
                      <option value="Kids">Prioritize Kids</option>
                      <option value="Infant">Prioritize Infant</option>
                      <option value="Women">Prioritize Women</option>
                      <option value="Men">Prioritize Men</option>
                      <option value="M">Match Size M</option>
                      <option value="L">Match Size L</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Feed Status & Quick Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', background: 'rgba(15, 23, 42, 0.6)', padding: '10px 16px', borderRadius: '10px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>
                    📦 Showing <strong style={{ color: '#38bdf8' }}>{normalListings.length}</strong> Available Listings
                  </span>
                  {recyclingListings.length > 0 && (
                    <span style={{ fontSize: '11px', background: '#78350f', color: '#fef3c7', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                      +{recyclingListings.length} Recycled
                    </span>
                  )}
                </div>
                <button 
                  type="button" 
                  onClick={scrollToFeedTop} 
                  style={{ background: '#1e293b', border: '1px solid #475569', color: '#38bdf8', fontSize: '11px', fontWeight: 700, padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Jump to top of listings"
                >
                  <span>Top</span> ↑
                </button>
              </div>

              {/* Dynamic Scrollable Feed Container */}
              <div
                ref={feedScrollRef}
                className="dynamic-vertical-scroll"
                style={{
                  maxHeight: 'calc(100vh - 180px)',
                  minHeight: '540px',
                  overflowY: 'auto',
                  paddingRight: '10px',
                  paddingBottom: '24px'
                }}
              >
                {/* Normal Claimable Listings */}
              {loadingListings ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  Loading active clothes listings…
                </div>
              ) : normalListings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', background: '#111827', borderRadius: '12px', border: '1px dashed #334155', color: '#94a3b8' }}>
                  No open clothes donations matching filter criteria. Be the first to donate!
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {normalListings.map(item => {
                    const itemId = item._id || item.id;
                    const isClaimed = item.status === 'CLAIMED';
                    return (
                      <div 
                        key={itemId}
                        style={{
                          background: '#111827',
                          border: item.is_winter_priority ? '2px solid #38bdf8' : '1px solid #334155',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                      >
                        {/* Image + Badges */}
                        <div style={{ position: 'relative', height: '160px', background: '#0b0f19' }}>
                          {item.image ? (
                            <img src={item.image} alt={item.garment_type} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
                              <i className="fa-solid fa-shirt" style={{ fontSize: '32px' }}></i>
                            </div>
                          )}

                          {/* Winter Priority Badge (Step D2) */}
                          {item.is_winter_priority && (
                            <span style={{ position: 'absolute', top: '10px', left: '10px', background: '#0284c7', color: '#fff', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }}>
                              🥶 Winter Priority
                            </span>
                          )}

                          {/* Wedding Resale Badge (Phase E) */}
                          {item.is_resale_eligible && (
                            <span style={{ position: 'absolute', top: '10px', left: item.is_winter_priority ? '126px' : '10px', background: '#db2777', color: '#fff', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }}>
                              💫 Wedding Resale
                            </span>
                          )}

                          <span style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(15, 23, 42, 0.85)', color: '#c084fc', border: '1px solid #a855f7', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                            {item.category} • {item.size}
                          </span>
                        </div>

                        {/* Content */}
                        <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                                {item.garment_type || 'Assorted Clothing'}
                              </h3>
                              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                {item.ai_condition_grade || 'Wearable'}
                              </span>
                            </div>

                            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 10px 0' }}>
                              Season: <strong>{item.season}</strong> {item.is_washed_sanitized && '• Washed ✨'}
                            </p>

                            {/* Wedding Resale Split Note */}
                            {item.is_resale_eligible && (
                              <div style={{ background: 'rgba(219, 39, 119, 0.1)', border: '1px solid rgba(219, 39, 119, 0.3)', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', color: '#f472b6', marginBottom: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                                  <span>Price: ₹{item.resale_price}</span>
                                  <span style={{ color: '#34d399', fontSize: '11px' }}>10% to Shelter Relief</span>
                                </div>
                                <div style={{ fontSize: '10px', color: '#cbd5e1', marginTop: '2px' }}>
                                  ₹{Math.round(item.resale_price * 0.10)} directly funds shelter meals
                                </div>
                              </div>
                            )}

                            {item.is_bulk_donation && (
                              <div style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', color: '#c084fc', marginBottom: '10px' }}>
                                📦 Bulk: {item.bulk_note || 'Drive Collection'}
                              </div>
                            )}

                            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px' }}>
                              Donor: {item.donor_name || 'Anonymous Donor'}
                            </div>
                          </div>

                          {/* Claim or Purchase Action Button */}
                          <div>
                            {item.is_resale_eligible ? (
                              item.resale_status === 'SOLD' ? (
                                <div style={{ background: '#334155', color: '#cbd5e1', textAlign: 'center', padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
                                  💫 Sold Out (10% Meal Donated)
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedItemForPurchase(item);
                                    setIsPurchaseModalOpen(true);
                                  }}
                                  style={{
                                    width: '100%',
                                    background: 'linear-gradient(135deg, #db2777, #f43f5e)',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '8px',
                                    borderRadius: '6px',
                                    fontWeight: 800,
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  💫 Buy Pre-Loved & Support (₹{item.resale_price})
                                </button>
                              )
                            ) : isClaimed ? (
                              <div style={{ background: '#334155', color: '#cbd5e1', textAlign: 'center', padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
                                ✅ Claimed by {item.claimed_by_ngo || 'NGO'}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleClaimClothes(item)}
                                style={{
                                  width: '100%',
                                  background: '#10b981',
                                  color: '#000',
                                  border: 'none',
                                  padding: '8px',
                                  borderRadius: '6px',
                                  fontWeight: 800,
                                  fontSize: '12px',
                                  cursor: 'pointer'
                                }}
                              >
                                🤝 Claim for Shelter / Distribution
                              </button>
                            )}

                            {currentUser?.role === 'NGO' && !isClaimed && (
                              <button
                                type="button"
                                onClick={() => setDisputeListing(item)}
                                style={{
                                  marginTop: '8px',
                                  width: '100%',
                                  background: 'transparent',
                                  color: '#f87171',
                                  border: '1px solid #ef4444',
                                  padding: '6px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                🚩 Report Incident / Dispute
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Step D3: Textile Recycling Routing Display */}
              {recyclingListings.length > 0 && (
                <div style={{ marginTop: '36px', paddingTop: '24px', borderTop: '1px solid #1e293b' }}>
                  <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>♻️</span>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#fbbf24' }}>
                      Routed for Textile Recycling
                    </h3>
                  </div>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 14px 0' }}>
                    Items graded "Not Wearable" due to heavy damage or tears are diverted away from shelter wear and routed for responsible fiber recovery.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
                    {recyclingListings.map(item => (
                      <div 
                        key={item._id || item.id}
                        style={{
                          background: '#18181b',
                          border: '1px solid #451a03',
                          borderRadius: '10px',
                          padding: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}
                      >
                        {item.image && (
                          <img src={item.image} alt={item.garment_type} style={{ width: '60px', height: '60px', borderRadius: '6px', objectFit: 'cover' }} />
                        )}
                        <div>
                          <span style={{ background: '#78350f', color: '#fef3c7', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            ♻️ Routed for Textile Recycling
                          </span>
                          <h4 style={{ margin: '4px 0 2px 0', fontSize: '13px', color: '#fff' }}>
                            {item.garment_type || 'Damaged Garment'}
                          </h4>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            Grade: {item.ai_condition_grade}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </div>
            </section>
          </div>
        </main>
      )}

      {/* Auth Modal for sign in / registration */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          showToast(`Welcome ${user.name}!`);
        }}
        showToast={showToast}
      />

      {/* Dispute Modal for NGOs */}
      <DisputeModal
        isOpen={!!disputeListing}
        onClose={() => setDisputeListing(null)}
        listing={disputeListing ? { ...disputeListing, id: disputeListing._id || disputeListing.id } : null}
        userCoords={userCoords}
        onSubmitDispute={handleSubmitDispute}
      />

      {/* Sponsor-A-Winter-Kit Modal (Phase D) */}
      <SponsorWinterKitModal
        campaign={selectedCampaignForKit}
        isOpen={isKitModalOpen}
        onClose={() => {
          setIsKitModalOpen(false);
          setSelectedCampaignForKit(null);
        }}
        onSuccess={(kitsCount, campId) => {
          showToast(`🎉 Verified! ${kitsCount} Winter Kit(s) sponsored!`);
          setCampaigns(prev => prev.map(c => {
            if (String(c._id || c.id) === String(campId)) {
              return { ...c, funded_kits: (c.funded_kits || 0) + kitsCount };
            }
            return c;
          }));
        }}
      />

      {/* Wedding & Special Festive Resale Purchase Modal (Phase E) */}
      <WeddingPurchaseModal
        item={selectedItemForPurchase}
        isOpen={isPurchaseModalOpen}
        onClose={() => {
          setIsPurchaseModalOpen(false);
          setSelectedItemForPurchase(null);
        }}
        onSuccess={(updatedItem) => {
          showToast('✨ Purchase confirmed! 10% meal contribution channeled.');
          setClothesListings(prev => prev.map(c => {
            if (String(c._id || c.id) === String(updatedItem._id || updatedItem.id)) {
              return { ...c, resale_status: 'SOLD', status: 'CLAIMED' };
            }
            return c;
          }));
        }}
      />

      {/* Toast popup */}
      {toastMessage && (
        <div className="toast active" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}

// Step E: Radar Map for Clothes View Component
function ClothesRadarMapView({ listings, userCoords, currentUser, onClaim }) {
  const mapRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([userCoords.lat, userCoords.lon], 12);

      // Reusing identical Esri tile layer
      L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: '&copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ'
      }).addTo(map);

      // User location marker
      const userIcon = L.divIcon({
        className: 'user-pin',
        html: `<div style="background: #a855f7; width: 16px; height: 16px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 10px #a855f7;"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      L.marker([userCoords.lat, userCoords.lon], { icon: userIcon })
        .addTo(map)
        .bindPopup('<strong style="color: #a855f7">📍 Your Location (Clothes Scanner Active)</strong>');

      // Plot Clothes Donation Pins
      listings.forEach(item => {
        const lat = item.coords?.lat || 28.6139;
        const lon = item.coords?.lon || 77.2090;
        const isRecycle = item.routed_for_recycling;
        const pinColor = isRecycle ? '#f59e0b' : (item.is_winter_priority ? '#38bdf8' : '#a855f7');
        const iconChar = isRecycle ? '♻️' : (item.is_winter_priority ? '🥶' : '👕');

        const clothIcon = L.divIcon({
          className: 'clothes-pin',
          html: `<div style="background: #1e293b; border: 2px solid ${pinColor}; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.6);">${iconChar}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const distKm = calculateDistance(userCoords.lat, userCoords.lon, lat, lon).toFixed(1);

        L.marker([lat, lon], { icon: clothIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: 'DM Sans', sans-serif;">
              <strong style="color:#c084fc; font-size:14px;">👕 ${item.garment_type || 'Clothing Donation'}</strong><br>
              <small style="color:#38bdf8">📍 ${distKm} km away</small><br>
              <div style="margin: 4px 0; font-size:12px; color:#cbd5e1;">Category: <strong>${item.category}</strong> (${item.size})</div>
              <div style="font-size:11px; color:#94a3b8; margin-bottom: 6px;">Condition: <strong>${item.ai_condition_grade}</strong></div>
              ${isRecycle ? '<span style="color:#f59e0b; font-size:10px; font-weight:700;">♻️ Routed for Textile Recycling</span>' : ''}
              ${item.is_winter_priority ? '<span style="color:#38bdf8; font-size:10px; font-weight:700;">🥶 Winter Priority Pinned</span>' : ''}
            </div>
          `);
      });

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [listings, userCoords]);

  return (
    <div style={{ height: 'calc(100vh - 72px)', width: '100%', position: 'relative' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
