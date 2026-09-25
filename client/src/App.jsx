import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { calculateDistance } from './data/directory';

// Components
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import LeadMagnets from './components/LeadMagnets';
import HowItWorks from './components/HowItWorks';
import DonorForm from './components/DonorForm';
import RescueFeeds from './components/RescueFeeds';
import RadarMap from './components/RadarMap';
import ContactSection from './components/ContactSection';
import Footer from './components/Footer';
import DemoPersonaBar from './components/DemoPersonaBar';
import GeminiChatWidget from './components/GeminiChatWidget';

// Modals
import { 
  AuthModal, 
  OTPModal, 
  QRHandoverModal, 
  QRScannerModal, 
  DisputeModal, 
  ImpactDashboardModal, 
  ShareModal 
} from './components/Modals';

export default function App() {
  // Navigation View: 'HOME' or 'MAP'
  const [currentView, setCurrentView] = useState('HOME');

  // User & Auth State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('foodloop_auth_user') || 'null');
    } catch (_) {
      return null;
    }
  });

  // Listings & Portal State
  const [listings, setListings] = useState([]);
  const [currentPortalTab, setCurrentPortalTab] = useState('HUMAN');
  const [userLiveCoords, setUserLiveCoords] = useState({ lat: 28.6139, lon: 77.2090 });
  const [toastMessage, setToastMessage] = useState('');

  // Modals Visibility
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [pendingDonation, setPendingDonation] = useState(null);
  const [activeQRListing, setActiveQRListing] = useState(null);
  const [scannerListing, setScannerListing] = useState(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [disputeListing, setDisputeListing] = useState(null);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  // Show Toast Helper
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // 1. Initial Load: GPS Geolocation & Listings
  useEffect(() => {
    // Acquire user location if available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLiveCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        () => {
          console.log('Location permission not granted, using default center.');
        }
      );
    }

    // Fetch initial active listings from backend
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      const res = await fetch('/api/donations');
      const data = await res.json();
      if (Array.isArray(data)) {
        setListings(data);
      }
    } catch (err) {
      console.warn('Failed to load listings from backend:', err);
    }
  };

  // 2. Donation Post Flow
  const handleInitiateDonation = (payload) => {
    setPendingDonation(payload);
    const mockOTP = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOTP(mockOTP);
    setIsOtpOpen(true);
  };

  const handleConfirmOTP = async () => {
    if (!pendingDonation) return;

    try {
      const token = localStorage.getItem('foodloop_auth_token');
      const res = await fetch('/api/donations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(pendingDonation)
      });
      const data = await res.json();

      setIsOtpOpen(false);
      setPendingDonation(null);

      if (res.ok) {
        showToast('🎉 Donation verified and published live to rescue network!');
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        loadListings();
      } else {
        alert(data.error || 'Failed to publish donation.');
      }
    } catch (err) {
      setIsOtpOpen(false);
      alert('Could not publish your donation — please check your connection and try again.');
    }
  };

  // 3. Claim Pickup Flow
  const handleClaim = async (item) => {
    if (!currentUser) {
      alert('🔒 Please Sign In as an NGO or Animal Shelter to claim food pickups.');
      setIsAuthOpen(true);
      return;
    }

    if (currentUser.role !== 'NGO' && currentUser.role !== 'ANIMAL_SHELTER') {
      alert('🔒 Only verified NGOs and Shelters are authorized to claim surplus food.');
      return;
    }

    try {
      const token = localStorage.getItem('foodloop_auth_token');
      const res = await fetch(`/api/donations/${item.id}/claim`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          ngo_name: currentUser.organization || currentUser.name,
          darpan_id: currentUser.ngo_darpan_id || currentUser.darpan_id || ''
        })
      });

      if (res.ok) {
        showToast(`✅ Pickup claimed by ${currentUser.organization || currentUser.name}!`);
        loadListings();
      } else {
        const d = await res.json();
        alert(d.error || 'Claim failed.');
      }
    } catch (err) {
      // Offline fallback
      setListings(prev => prev.map(l => l.id === item.id ? { ...l, status: 'CLAIMED', claimed_by: currentUser.name } : l));
      showToast('✅ Pickup claimed!');
    }
  };

  // 4. Incident Dispute Flow
  const handleOpenDispute = (item) => {
    setDisputeListing(item);
  };

  const handleSubmitDispute = async (report) => {
    try {
      const token = localStorage.getItem('foodloop_auth_token');
      const listing = listings.find(l => String(l.id) === String(report.listingId));
      const distanceKm = listing && report.reportedCoords
        ? calculateDistance(report.reportedCoords.lat, report.reportedCoords.lon, listing.coords?.lat, listing.coords?.lon)
        : 0;

      const res = await fetch(`/api/donations/${report.listingId}/report-fake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          reporter_name: currentUser?.name || 'Anonymous Reporter',
          reporter_phone: currentUser?.phone || '',
          darpan_id: currentUser?.ngo_darpan_id || currentUser?.darpan_id || '',
          reason: report.reason,
          evidence_image: report.evidencePhoto,
          reporter_distance_km: distanceKm
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || '🚩 Dispute incident report recorded.');
      } else {
        alert(data.error || 'Failed to submit dispute report.');
      }
    } catch (err) {
      alert('Could not submit dispute report — please check your connection and try again.');
    }
  };

  // 5. Demo Persona Switcher
  const handleSelectPersona = (persona) => {
    if (persona === 'DONOR') {
      const demoDonor = {
        name: 'The Grand Heritage Banquet',
        organization: 'The Grand Heritage Banquet',
        role: 'DONOR',
        phone: '9876543210'
      };
      setCurrentUser(demoDonor);
      localStorage.setItem('foodloop_auth_user', JSON.stringify(demoDonor));
      showToast('⚡ Switched to Demo Persona: 🍛 Food Donor');
    } else if (persona === 'NGO') {
      const demoNGO = {
        name: 'Robin Hood Army Coordinator',
        organization: 'Robin Hood Army (Delhi Chapter)',
        role: 'NGO',
        darpan_id: 'DL/2018/0192831',
        phone: '8800247247'
      };
      setCurrentUser(demoNGO);
      localStorage.setItem('foodloop_auth_user', JSON.stringify(demoNGO));
      showToast('⚡ Switched to Demo Persona: 🏛️ Verified NGO');
    } else if (persona === 'ANIMAL') {
      const demoAnimal = {
        name: 'Delhi Gaushala Rescue',
        organization: 'Delhi Gaushala & Stray Care Trust',
        role: 'ANIMAL_SHELTER',
        darpan_id: 'DL/AWBI/2019/081',
        phone: '9855566778'
      };
      setCurrentUser(demoAnimal);
      localStorage.setItem('foodloop_auth_user', JSON.stringify(demoAnimal));
      showToast('⚡ Switched to Demo Persona: 🐾 Animal Shelter');
    } else {
      setCurrentUser(null);
      localStorage.removeItem('foodloop_auth_user');
      localStorage.removeItem('foodloop_auth_token');
      showToast('⚡ Switched to Demo Persona: 👤 Visitor (Logged Out)');
    }
  };

  // 6. Action Cards Router
  const handleActionCard = (type) => {
    if (type === 'DONATE') {
      document.getElementById('rescue-hub')?.scrollIntoView({ behavior: 'smooth' });
    } else if (type === 'NGO') {
      setIsAuthOpen(true);
    } else if (type === 'VOLUNTEER') {
      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
    } else if (type === 'SHARE') {
      setIsShareOpen(true);
    }
  };

  return (
    <>
      {currentView === 'MAP' ? (
        <RadarMap 
          userLiveCoords={userLiveCoords}
          listings={listings}
          onBackToHome={() => setCurrentView('HOME')}
        />
      ) : (
        <>
          <Navbar 
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthOpen(true)}
            onOpenDashboard={() => setIsDashboardOpen(true)}
            onLogout={() => {
              setCurrentUser(null);
              localStorage.removeItem('foodloop_auth_user');
              localStorage.removeItem('foodloop_auth_token');
              showToast('Logged out successfully.');
            }}
            currentView={currentView}
            setCurrentView={setCurrentView}
          />

          <main>
            <Hero />
            
            <LeadMagnets onAction={handleActionCard} />
            
            <HowItWorks />

            {/* Rescue Hub Section */}
            <section className="section hub-section" id="rescue-hub">
              <div className="container">
                <div className="section-heading hub-header-wrap">
                  <div>
                    <p className="eyebrow"><span className="eyebrow-line"></span> The live board</p>
                    <h2>Rescue hub <span className="live-badge"><span className="pulse"></span> Live</span></h2>
                  </div>
                  
                  {/* Hub Portal Selector Tabs */}
                  <div style={{ display: 'flex', gap: '8px', background: '#111827', padding: '4px', borderRadius: '10px', border: '1.5px solid #334155' }}>
                    <button 
                      type="button" 
                      onClick={() => setCurrentPortalTab('HUMAN')}
                      style={{
                        background: currentPortalTab === 'HUMAN' ? '#10b981' : 'transparent',
                        color: currentPortalTab === 'HUMAN' ? '#000' : '#cbd5e1',
                        fontWeight: 800,
                        fontSize: '12px',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      🍲 Human Community Feed
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setCurrentPortalTab('ANIMAL')}
                      style={{
                        background: currentPortalTab === 'ANIMAL' ? '#10b981' : 'transparent',
                        color: currentPortalTab === 'ANIMAL' ? '#000' : '#cbd5e1',
                        fontWeight: 700,
                        fontSize: '12px',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      🐾 Animal & Gaushala Loop 
                      <span style={{ background: '#ef4444', color: '#fff', fontSize: '10px', padding: '1px 6px', borderRadius: '9999px' }}>
                        {listings.filter(i => i.status === 'DIVERTED_TO_ANIMALS' || i.expiry_hours <= 1).length}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="hub-grid">
                  <DonorForm 
                    currentUser={currentUser}
                    userLiveCoords={userLiveCoords}
                    onRequestGPS={(cb) => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition((pos) => {
                          const c = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                          setUserLiveCoords(c);
                          if (cb) cb(c);
                        });
                      }
                    }}
                    onSubmitDonationInitiate={handleInitiateDonation}
                    showToast={showToast}
                  />

                  <RescueFeeds 
                    listings={listings}
                    currentTab={currentPortalTab}
                    onTabChange={setCurrentPortalTab}
                    currentUser={currentUser}
                    userCoords={userLiveCoords}
                    onClaim={handleClaim}
                    onOpenDispute={handleOpenDispute}
                    onOpenQR={(item) => setActiveQRListing(item)}
                    onOpenScanner={(item) => {
                      setScannerListing(item);
                      setIsScannerOpen(true);
                    }}
                    onRefresh={loadListings}
                    onOpenDashboard={() => setIsDashboardOpen(true)}
                  />
                </div>
              </div>
            </section>

            <ContactSection 
              listings={listings}
              showToast={showToast}
            />
          </main>

          <Footer />

          {/* Persona Demo Bar */}
          <DemoPersonaBar onSelectPersona={handleSelectPersona} />

          {/* Floating Gemini AI Assistant */}
          <GeminiChatWidget />

          {/* Modals Container */}
          <AuthModal 
            isOpen={isAuthOpen}
            onClose={() => setIsAuthOpen(false)}
            onLoginSuccess={(user) => setCurrentUser(user)}
            showToast={showToast}
          />

          <OTPModal 
            isOpen={isOtpOpen}
            onClose={() => setIsOtpOpen(false)}
            generatedOTP={generatedOTP}
            onConfirm={handleConfirmOTP}
          />

          <QRHandoverModal 
            isOpen={!!activeQRListing}
            onClose={() => setActiveQRListing(null)}
            listing={activeQRListing}
          />

          <QRScannerModal 
            isOpen={isScannerOpen}
            onClose={() => {
              setIsScannerOpen(false);
              setScannerListing(null);
            }}
            listing={scannerListing}
            onScanSuccess={async (scannedListing) => {
              showToast('✅ QR Handshake verified successfully!');
              if (scannedListing && scannedListing.id) {
                try {
                  const token = localStorage.getItem('foodloop_auth_token');
                  await fetch(`/api/donations/${scannedListing.id}/claim`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': token ? `Bearer ${token}` : ''
                    },
                    body: JSON.stringify({
                      claimant_org: currentUser?.organization || currentUser?.name || 'Verified NGO Partner',
                      claimant_phone: currentUser?.phone || ''
                    })
                  });
                } catch (_) {}
                setListings(prev => prev.map(l => (String(l.id) === String(scannedListing.id) || String(l._id) === String(scannedListing.id)) ? { ...l, status: 'CLAIMED', claimed_by: currentUser?.organization || currentUser?.name || 'Verified NGO' } : l));
              }
              loadListings();
            }}
          />

          <DisputeModal 
            isOpen={!!disputeListing}
            onClose={() => setDisputeListing(null)}
            listing={disputeListing}
            userCoords={userLiveCoords}
            onSubmitDispute={handleSubmitDispute}
          />

          <ImpactDashboardModal 
            isOpen={isDashboardOpen}
            onClose={() => setIsDashboardOpen(false)}
            currentUser={currentUser}
            history={listings.filter(l => l.donor_name === currentUser?.name || l.claimed_by === currentUser?.name)}
          />

          <ShareModal 
            isOpen={isShareOpen}
            onClose={() => setIsShareOpen(false)}
          />

          {/* Toast Notification Container */}
          {toastMessage && (
            <div className="toast active" id="toast" role="status">
              {toastMessage}
            </div>
          )}
        </>
      )}
    </>
  );
}
