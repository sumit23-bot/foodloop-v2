import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { calculateDistance } from './data/directory';

// App Shell Layout
import AppShell from './components/layout/AppShell';

// Page Views
import OverviewPage from './pages/OverviewPage';
import RescueHubPage from './pages/RescueHubPage';
import PostSurplusPage from './pages/PostSurplusPage';
import AnimalLoopPage from './pages/AnimalLoopPage';
import RadarMap from './components/RadarMap';
import AuthPage from './pages/AuthPage';
import ImpactPage from './pages/ImpactPage';
import SponsorPage from './pages/SponsorPage';
import IncidentsPage from './pages/IncidentsPage';
import NgoVerificationPage from './pages/NgoVerificationPage';
import ContactPage from './pages/ContactPage';

// Modals
import { 
  AuthModal, 
  OTPModal, 
  QRHandoverModal, 
  QRScannerModal, 
  DisputeModal, 
  ImpactDashboardModal, 
  ShareModal,
  SponsorMealModal,
  TermsAndConditionsModal
} from './components/Modals';
import GeminiChatWidget from './components/GeminiChatWidget';
import ReportIncidentModal from './components/ReportIncidentModal';
import AdminIncidentModal from './components/AdminIncidentModal';
import IncidentStatusModal from './components/IncidentStatusModal';

const HASH_TO_VIEW = {
  '#/overview': 'OVERVIEW',
  '#/rescue': 'RESCUE',
  '#/post': 'POST',
  '#/radar': 'RADAR',
  '#/animal': 'ANIMAL',
  '#/incidents': 'INCIDENTS',
  '#/verify': 'VERIFY',
  '#/sponsor': 'SPONSOR',
  '#/impact': 'IMPACT',
  '#/contact': 'CONTACT',
  '#/auth': 'AUTH'
};

const VIEW_TO_HASH = {
  OVERVIEW: '#/overview',
  RESCUE: '#/rescue',
  POST: '#/post',
  RADAR: '#/radar',
  ANIMAL: '#/animal',
  INCIDENTS: '#/incidents',
  VERIFY: '#/verify',
  SPONSOR: '#/sponsor',
  IMPACT: '#/impact',
  CONTACT: '#/contact',
  AUTH: '#/auth'
};

export default function App() {
  // Navigation View: synced with location.hash
  const getInitialView = () => {
    const hash = (typeof window !== 'undefined' ? window.location.hash.toLowerCase() : '');
    return HASH_TO_VIEW[hash] || 'OVERVIEW';
  };

  const [activeView, setActiveView] = useState(getInitialView);
  const [searchTerm, setSearchTerm] = useState('');

  const navigate = useCallback((view) => {
    setActiveView(view);
    const targetHash = VIEW_TO_HASH[view] || '#/overview';
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  }, []);

  // Hashchange listener for browser back/forward buttons
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      const targetView = HASH_TO_VIEW[hash] || 'OVERVIEW';
      setActiveView(targetView);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Backward compatibility wrapper for old components expecting setCurrentView('HOME'|'MAP')
  const setCurrentView = useCallback((view) => {
    if (view === 'MAP') {
      navigate('RADAR');
    } else {
      navigate('OVERVIEW');
    }
  }, [navigate]);

  const currentView = activeView === 'RADAR' ? 'MAP' : 'HOME';

  // User & Auth State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem('foodloop_auth_user') || 'null');
      const token = localStorage.getItem('foodloop_auth_token');
      if (token && (token.startsWith('demo_token_') || token.startsWith('mock_'))) {
        localStorage.removeItem('foodloop_auth_token');
        localStorage.removeItem('foodloop_auth_user');
        return null;
      }
      return user;
    } catch (_) {
      return null;
    }
  });

  const getAuthToken = () => {
    const token = localStorage.getItem('foodloop_auth_token');
    if (token && (token.startsWith('demo_token_') || token.startsWith('mock_'))) {
      localStorage.removeItem('foodloop_auth_token');
      return null;
    }
    return token;
  };

  // Listings & Location State
  const [listings, setListings] = useState([]);
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
  const [isSponsorOpen, setIsSponsorOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  
  // Incident & Safety Modals
  const [isIncidentReportOpen, setIsIncidentReportOpen] = useState(false);
  const [incidentReportListing, setIncidentReportListing] = useState(null);
  const [isIncidentStatusOpen, setIsIncidentStatusOpen] = useState(false);
  const [incidentStatusListing, setIncidentStatusListing] = useState(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Show Toast Helper
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Initial Geolocation & Listings Load
  useEffect(() => {
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
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/donations', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setListings(data);
      }
    } catch (err) {
      console.warn('Failed to load listings from backend:', err);
    }
  };

  // Donation Post Flow
  const handleInitiateDonation = (payload) => {
    setPendingDonation(payload);
    const mockOTP = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOTP(mockOTP);
    setIsOtpOpen(true);
  };

  const handleConfirmOTP = async () => {
    if (!pendingDonation) return;

    try {
      const token = getAuthToken();
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
        showToast('Donation verified and published live to rescue network.');
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        loadListings();
        navigate('RESCUE');
      } else {
        alert(data.error || 'Failed to publish donation.');
      }
    } catch (_err) {
      setIsOtpOpen(false);
      alert('Could not publish your donation. Please check your connection and try again.');
    }
  };

  // Claim Pickup Flow
  const handleClaim = async (item) => {
    if (!currentUser) {
      alert('Please Sign In as an NGO or Animal Shelter to claim food pickups.');
      navigate('AUTH');
      return;
    }

    if (currentUser.role !== 'NGO' && currentUser.role !== 'ANIMAL_SHELTER') {
      alert('Only verified NGOs and Shelters are authorized to claim surplus food.');
      return;
    }

    const orgName = currentUser.organization || currentUser.name || 'Verified NGO Partner';
    const orgPhone = currentUser.phone || '';
    const orgDarpan = currentUser.ngo_darpan_id || currentUser.darpan_id || '';
    const listingId = item.id || item._id;

    try {
      const token = getAuthToken();
      const res = await fetch(`/api/donations/${listingId}/claim`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          ngo_name: orgName,
          claimant_org: orgName,
          claimant_phone: orgPhone,
          darpan_id: orgDarpan
        })
      });

      if (res.ok) {
        showToast(`Pickup claimed by ${orgName}.`);
        setListings(prev => prev.map(l => (String(l.id) === String(listingId) || String(l._id) === String(listingId)) 
          ? { ...l, status: 'CLAIMED', claimed_by: orgName, claimed_by_ngo: orgName } 
          : l
        ));
        loadListings();
      } else {
        const d = await res.json();
        alert(d.error || 'Claim failed.');
      }
    } catch (_err) {
      setListings(prev => prev.map(l => (String(l.id) === String(listingId) || String(l._id) === String(listingId)) 
        ? { ...l, status: 'CLAIMED', claimed_by: orgName, claimed_by_ngo: orgName } 
        : l
      ));
      showToast(`Pickup claimed by ${orgName}.`);
    }
  };

  // Dispute Flow
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
          coords: report.reportedCoords,
          reporter_coords: report.reportedCoords,
          reporter_distance_km: distanceKm
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Dispute incident report recorded.');
      } else {
        alert(data.error || 'Failed to submit dispute report.');
      }
    } catch (_err) {
      alert('Could not submit dispute report. Please check your connection and try again.');
    }
  };

  // Demo Persona Switcher
  const handleSelectPersona = async (persona) => {
    if (persona === 'GUEST' || !persona) {
      setCurrentUser(null);
      localStorage.removeItem('foodloop_auth_user');
      localStorage.removeItem('foodloop_auth_token');
      showToast('Switched to demo persona: Visitor (Logged Out).');
      return;
    }

    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setCurrentUser(data);
        localStorage.setItem('foodloop_auth_user', JSON.stringify(data));
        localStorage.setItem('foodloop_auth_token', data.token);

        const personaLabels = {
          DONOR: 'Food Donor',
          NGO: 'Verified NGO',
          ANIMAL: 'Animal Shelter',
          ADMIN: 'Food Safety Admin'
        };
        showToast(`Switched to demo persona: ${personaLabels[persona] || persona}.`);

        if (persona === 'ADMIN') {
          navigate('INCIDENTS');
        }
      } else {
        alert(data.error || 'Failed to switch demo persona.');
      }
    } catch (_err) {
      alert('Could not connect to server for demo persona login.');
    }
  };

  // Action Cards Router
  const handleActionCard = (type) => {
    if (type === 'DONATE') {
      navigate('POST');
    } else if (type === 'NGO') {
      navigate('AUTH');
    } else if (type === 'SPONSOR') {
      navigate('SPONSOR');
    } else if (type === 'VOLUNTEER') {
      navigate('CONTACT');
    } else if (type === 'SHARE') {
      setIsShareOpen(true);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('foodloop_auth_user');
    localStorage.removeItem('foodloop_auth_token');
    showToast('Logged out successfully.');
    navigate('OVERVIEW');
  };

  const animalCount = listings.filter(i => i.status === 'DIVERTED_TO_ANIMALS' || i.expiry_hours <= 1).length;

  return (
    <>
      <AppShell
        activeView={activeView}
        onNavigate={navigate}
        currentUser={currentUser}
        onOpenAuth={() => navigate('AUTH')}
        onLogout={handleLogout}
        onSelectPersona={handleSelectPersona}
        onOpenAssistant={() => setIsAssistantOpen(true)}
        onOpenTerms={() => setIsTermsOpen(true)}
        onOpenImpact={() => navigate('IMPACT')}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        animalCount={animalCount}
      >
        {activeView === 'OVERVIEW' && (
          <OverviewPage
            listings={listings}
            onNavigate={navigate}
            onActionCard={handleActionCard}
            onInspectListing={() => navigate('RESCUE')}
          />
        )}

        {activeView === 'RESCUE' && (
          <RescueHubPage
            listings={listings}
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
            onOpenDashboard={() => navigate('IMPACT')}
            onOpenIncidentReport={(item) => {
              setIncidentReportListing(item);
              setIsIncidentReportOpen(true);
            }}
            onOpenIncidentStatus={(item) => {
              setIncidentStatusListing(item);
              setIsIncidentStatusOpen(true);
            }}
            externalSearch={searchTerm}
          />
        )}

        {activeView === 'POST' && (
          <PostSurplusPage
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
        )}

        {activeView === 'RADAR' && (
          <RadarMap
            userLiveCoords={userLiveCoords}
            listings={listings}
            currentUser={currentUser}
            onBackToHome={() => navigate('OVERVIEW')}
          />
        )}

        {activeView === 'ANIMAL' && (
          <AnimalLoopPage
            listings={listings}
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
            onOpenDashboard={() => navigate('IMPACT')}
            onOpenIncidentReport={(item) => {
              setIncidentReportListing(item);
              setIsIncidentReportOpen(true);
            }}
            onOpenIncidentStatus={(item) => {
              setIncidentStatusListing(item);
              setIsIncidentStatusOpen(true);
            }}
            externalSearch={searchTerm}
          />
        )}

        {activeView === 'AUTH' && (
          <AuthPage
            onLoginSuccess={(user) => setCurrentUser(user)}
            onNavigate={navigate}
            showToast={showToast}
          />
        )}

        {activeView === 'IMPACT' && (
          <ImpactPage
            currentUser={currentUser}
            listings={listings}
          />
        )}

        {activeView === 'SPONSOR' && (
          <SponsorPage
            currentUser={currentUser}
            showToast={showToast}
          />
        )}

        {activeView === 'INCIDENTS' && (
          <IncidentsPage
            currentUser={currentUser}
            showToast={showToast}
            onOpenReportIncident={(item) => {
              setIncidentReportListing(item);
              setIsIncidentReportOpen(true);
            }}
          />
        )}

        {activeView === 'VERIFY' && (
          <NgoVerificationPage />
        )}

        {activeView === 'CONTACT' && (
          <ContactPage
            listings={listings}
            showToast={showToast}
          />
        )}
      </AppShell>

      {/* Slide-over Assistant Widget */}
      <GeminiChatWidget
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
      />

      {/* Dialogs Container */}
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
          showToast('QR Handshake verified successfully.');
          const listingId = scannedListing?.id || scannedListing?._id;
          if (listingId) {
            try {
              const token = getAuthToken();
              const orgName = currentUser?.organization || currentUser?.name || 'Verified NGO Partner';
              await fetch(`/api/donations/${listingId}/claim`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                  claimant_org: orgName,
                  ngo_name: orgName,
                  claimant_phone: currentUser?.phone || '',
                  darpan_id: currentUser?.ngo_darpan_id || currentUser?.darpan_id || ''
                })
              });
            } catch (_) {}
            setListings(prev => prev.map(l => (String(l.id) === String(listingId) || String(l._id) === String(listingId)) ? { ...l, status: 'CLAIMED', claimed_by: currentUser?.organization || currentUser?.name || 'Verified NGO' } : l));
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

      <SponsorMealModal 
        isOpen={isSponsorOpen}
        onClose={() => setIsSponsorOpen(false)}
        currentUser={currentUser}
        showToast={showToast}
      />

      <ReportIncidentModal
        isOpen={isIncidentReportOpen}
        onClose={() => {
          setIsIncidentReportOpen(false);
          setIncidentReportListing(null);
        }}
        listing={incidentReportListing}
        currentUser={currentUser}
        showToast={showToast}
        onIncidentSubmitted={() => loadListings()}
      />

      <IncidentStatusModal
        isOpen={isIncidentStatusOpen}
        onClose={() => {
          setIsIncidentStatusOpen(false);
          setIncidentStatusListing(null);
        }}
        listing={incidentStatusListing}
        currentUser={currentUser}
      />

      <AdminIncidentModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        showToast={showToast}
      />

      <TermsAndConditionsModal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
      />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="toast-container">
          <div className="toast" role="status">
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </>
  );
}
