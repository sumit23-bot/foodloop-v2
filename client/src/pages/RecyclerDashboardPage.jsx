import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function RecyclerDashboardPage() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('foodloop_auth_user') || 'null');
    } catch (_) {
      return null;
    }
  });

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [activeTab, setActiveTab] = useState('AVAILABLE'); // 'AVAILABLE' | 'CLAIMED'
  const [claimedList, setClaimedList] = useState([]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const getAuthToken = () => {
    let token = localStorage.getItem('foodloop_auth_token');
    if (!token && currentUser) {
      token = 'demo_token_' + btoa(unescape(encodeURIComponent(JSON.stringify(currentUser))));
      localStorage.setItem('foodloop_auth_token', token);
    }
    return token;
  };

  const loadBatches = async () => {
    setLoading(true);
    const token = getAuthToken();
    if (!token || currentUser?.role !== 'RECYCLER') {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/clothes/recycling-batches', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setBatches(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('Failed to load recycling batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, [currentUser]);

  const handleDemoRecyclerLogin = () => {
    const recyclerUser = {
      name: 'Vikram Mehta (Lead Recycler)',
      phone: '9833344455',
      role: 'RECYCLER',
      org_name: 'EcoFiber Closed-Loop Recyclers',
      is_verified: true,
      trust_score: 100
    };
    localStorage.setItem('foodloop_auth_user', JSON.stringify(recyclerUser));
    const token = 'demo_token_' + btoa(unescape(encodeURIComponent(JSON.stringify(recyclerUser))));
    localStorage.setItem('foodloop_auth_token', token);
    setCurrentUser(recyclerUser);
    showToast('Logged in as EcoFiber Closed-Loop Recyclers');
  };

  const handleClaimBatch = async (item) => {
    const id = item._id || item.id;
    setClaimingId(id);
    const token = getAuthToken();

    try {
      const res = await fetch(`/api/clothes/${id}/claim-for-recycling`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        showToast('♻️ Batch claimed for industrial recycling! Pickup manifest generated.');
        setBatches(prev => prev.filter(b => (b._id || b.id) !== id));
        setClaimedList(prev => [data, ...prev]);
      } else {
        showToast(data.error || 'Failed to claim batch.');
      }
    } catch (err) {
      showToast('Error claiming batch.');
    } finally {
      setClaimingId(null);
    }
  };

  const isRecycler = currentUser?.role === 'RECYCLER';

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1d', color: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#0284c7',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          zIndex: 9999,
          fontWeight: 600,
          border: '1px solid #38bdf8'
        }}>
          {toastMsg}
        </div>
      )}

      {/* Top Navbar */}
      <header style={{
        background: 'rgba(15, 23, 42, 0.95)',
        borderBottom: '1px solid #1e293b',
        padding: '16px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link to="/clothes" style={{ textDecoration: 'none', color: '#94a3b8', fontSize: '14px' }}>
            ← Back to ClothesLoop
          </Link>
          <span style={{ color: '#475569' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>♻️</span>
            <div>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                Textile Recyclers & Downcyclers Portal
              </h1>
              <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600 }}>
                Circular Fiber Recovery • Yarn Spinning • Zero-Landfill Channel
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isRecycler ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1e293b', padding: '6px 12px', borderRadius: '20px', border: '1px solid #334155' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>{currentUser.org_name || currentUser.name}</span>
              <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', fontWeight: 700 }}>
                VERIFIED RECYCLER
              </span>
            </div>
          ) : (
            <button
              onClick={handleDemoRecyclerLogin}
              style={{
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              Demo Recycler Login (EcoFiber)
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px' }}>
        {/* If not logged in as recycler */}
        {!isRecycler ? (
          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center',
            maxWidth: '750px',
            margin: '40px auto'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧵</div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', marginBottom: '12px' }}>
              Textile Recycler & Downcycler Verification
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
              This portal is restricted to certified textile recyclers, fiber shredding mills, and circular fashion manufacturers. Non-wearable, torn, or stained apparel verified by our AI vision engine is automatically routed here.
            </p>
            <button
              onClick={handleDemoRecyclerLogin}
              style={{
                background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                color: '#ffffff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Log In as Verified Recycler (Demo Account)
            </button>
          </div>
        ) : (
          <div>
            {/* Top Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
                <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>Available Batches</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#38bdf8' }}>{batches.length}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Awaiting industrial claim</div>
              </div>
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
                <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>Claimed by Your Mill</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#34d399' }}>{claimedList.length}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Active pickup coordination</div>
              </div>
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
                <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>Estimated Raw Fiber</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b' }}>
                  {(batches.length * 12.5 + claimedList.length * 15).toFixed(0)} <span style={{ fontSize: '14px', color: '#94a3b8' }}>kg</span>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Cotton, denim & blended polyester</div>
              </div>
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
                <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>Destined Landfill Avoided</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#a78bfa' }}>100%</div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Closed-loop downcycling certification</div>
              </div>
            </div>

            {/* Tab Controls */}
            <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #334155', paddingBottom: '12px', marginBottom: '24px' }}>
              <button
                onClick={() => setActiveTab('AVAILABLE')}
                style={{
                  background: activeTab === 'AVAILABLE' ? '#0284c7' : 'transparent',
                  color: activeTab === 'AVAILABLE' ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px'
                }}
              >
                Available Non-Wearable Batches ({batches.length})
              </button>
              <button
                onClick={() => setActiveTab('CLAIMED')}
                style={{
                  background: activeTab === 'CLAIMED' ? '#047857' : 'transparent',
                  color: activeTab === 'CLAIMED' ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px'
                }}
              >
                My Claimed Consignments ({claimedList.length})
              </button>
            </div>

            {/* Available Batches Grid */}
            {activeTab === 'AVAILABLE' && (
              <div>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    Loading recycling batches...
                  </div>
                ) : batches.length === 0 ? (
                  <div style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    padding: '40px',
                    textAlign: 'center',
                    color: '#94a3b8'
                  }}>
                    <div style={{ fontSize: '36px', marginBottom: '12px' }}>🌱</div>
                    <h3 style={{ margin: '0 0 8px', color: '#f8fafc', fontSize: '16px' }}>
                      All current recycling batches have been claimed!
                    </h3>
                    <p style={{ margin: 0, fontSize: '13px' }}>
                      As donors submit torn or damaged clothing, AI auto-routes them directly to this dashboard.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                    {batches.map((item) => {
                      const id = item._id || item.id;
                      return (
                        <div key={id} style={{
                          background: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column'
                        }}>
                          {item.image && (
                            <div style={{ position: 'relative', height: '180px', background: '#0f172a' }}>
                              <img
                                src={item.image}
                                alt="Recycling batch"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                              <div style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                background: 'rgba(239, 68, 68, 0.9)',
                                color: '#ffffff',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 800,
                                textTransform: 'uppercase'
                              }}>
                                ♻️ Non-Wearable (Fiber)
                              </div>
                            </div>
                          )}

                          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                              <div>
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                                  {item.garment_type || `${item.category} Apparel Batch`}
                                </h3>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                                  Category: {item.category} • Size: {item.size || 'Mixed'}
                                </div>
                              </div>
                              <span style={{ fontSize: '11px', background: '#334155', color: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>
                                {item.is_bulk_donation ? 'Bulk Lot (~15kg)' : '~1.5kg'}
                              </span>
                            </div>

                            {item.ai_reason && (
                              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '8px 10px', borderRadius: '6px', fontSize: '11px', color: '#cbd5e1', marginBottom: '12px', borderLeft: '3px solid #f59e0b' }}>
                                <strong>AI Grading:</strong> {item.ai_reason}
                              </div>
                            )}

                            <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                📍 {item.coords?.lat?.toFixed(3)}, {item.coords?.lon?.toFixed(3)} (NCR)
                              </div>
                              <button
                                onClick={() => handleClaimBatch(item)}
                                disabled={claimingId === id}
                                style={{
                                  background: '#0284c7',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '8px 14px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: claimingId === id ? 'not-allowed' : 'pointer'
                                }}
                              >
                                {claimingId === id ? 'Claiming...' : 'Claim for Recycling'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Claimed Consignments */}
            {activeTab === 'CLAIMED' && (
              <div>
                {claimedList.length === 0 ? (
                  <div style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    padding: '40px',
                    textAlign: 'center',
                    color: '#94a3b8'
                  }}>
                    <p style={{ margin: 0, fontSize: '14px' }}>
                      No batches claimed yet in this session. Claim available non-wearable lots to generate logistics pickup manifests.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                    {claimedList.map((item, idx) => (
                      <div key={idx} style={{
                        background: '#1e293b',
                        border: '1px solid #059669',
                        borderRadius: '12px',
                        padding: '16px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                            ✅ CLAIMED FOR RECYCLING
                          </span>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {new Date().toLocaleDateString()}
                          </span>
                        </div>
                        <h4 style={{ margin: '0 0 4px', fontSize: '14px', color: '#f8fafc' }}>
                          {item.garment_type || `${item.category} Apparel Batch`}
                        </h4>
                        <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '10px' }}>
                          Donor: {item.donor_name || 'Anonymous Donor'} • Phone: {item.phone || '+91 98110 00000'}
                        </div>
                        <div style={{ background: '#0f172a', padding: '10px', borderRadius: '6px', fontSize: '11px', color: '#94a3b8' }}>
                          <div><strong>Pickup Location:</strong> Coordinates ({item.coords?.lat || 28.613}, {item.coords?.lon || 77.209})</div>
                          <div style={{ marginTop: '4px', color: '#38bdf8' }}><strong>Manifest ID:</strong> REC-FL-{(item._id || item.id || '0000').slice(-6)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
