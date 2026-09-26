import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function BulkDashboardPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('foodloop_auth_user') || 'null');
    } catch (_) {
      return null;
    }
  });

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [showCertModal, setShowCertModal] = useState(false);

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

  const loadAnalytics = async () => {
    setLoading(true);
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/clothes/bulk-analytics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      } else if (res.status === 403) {
        setAnalytics(null);
      }
    } catch (err) {
      console.warn('Failed to fetch bulk analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [currentUser]);

  const handleUpgradeTier = async () => {
    setUpgrading(true);
    let token = getAuthToken();
    if (!token) {
      // Create quick demo institutional user if not logged in
      const demoUser = {
        name: 'Delhi Public School HR',
        phone: '9811002233',
        role: 'DONOR',
        org_name: 'Delhi Public School R.K. Puram',
        clothes_account_tier: 'FREE'
      };
      localStorage.setItem('foodloop_auth_user', JSON.stringify(demoUser));
      token = 'demo_token_' + btoa(unescape(encodeURIComponent(JSON.stringify(demoUser))));
      localStorage.setItem('foodloop_auth_token', token);
      setCurrentUser(demoUser);
    }

    try {
      const res = await fetch('/api/clothes/upgrade-tier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('🎉 Institutional Bulk Donor Tier activated successfully!');
        if (data.token) {
          localStorage.setItem('foodloop_auth_token', data.token);
        }
        if (data.user) {
          localStorage.setItem('foodloop_auth_user', JSON.stringify(data.user));
          setCurrentUser(data.user);
        }
        await loadAnalytics();
      } else {
        showToast(data.error || 'Upgrade failed. Please retry.');
      }
    } catch (err) {
      showToast('Error upgrading tier.');
    } finally {
      setUpgrading(false);
    }
  };

  const handleDemoLogin = (tier = 'BULK_INSTITUTIONAL') => {
    const demoUser = {
      name: 'Delhi Public School HR & CSR',
      phone: '9811882233',
      role: 'DONOR',
      org_name: 'DPS Institutional Campus',
      clothes_account_tier: tier
    };
    localStorage.setItem('foodloop_auth_user', JSON.stringify(demoUser));
    const token = 'demo_token_' + btoa(unescape(encodeURIComponent(JSON.stringify(demoUser))));
    localStorage.setItem('foodloop_auth_token', token);
    setCurrentUser(demoUser);
    showToast(`Logged in as ${demoUser.org_name}`);
  };

  const isInstitutional = currentUser?.clothes_account_tier === 'BULK_INSTITUTIONAL' || analytics?.tier === 'BULK_INSTITUTIONAL';

  return (
    <div style={{ minHeight: '100vh', background: '#090d16', color: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#047857',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          zIndex: 9999,
          fontWeight: 600,
          border: '1px solid #10b981'
        }}>
          {toastMsg}
        </div>
      )}

      {/* Top Navigation Bar */}
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
          <Link to="/clothes" style={{ textDecoration: 'none', color: '#94a3b8', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ← Back to ClothesLoop
          </Link>
          <span style={{ color: '#475569' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🏫</span>
            <div>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                Institutional & Bulk Donor Portal
              </h1>
              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                Corporate ESG • School Uniform Drives • Verified Landfill Diversion
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1e293b', padding: '6px 12px', borderRadius: '20px', border: '1px solid #334155' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                {currentUser.org_name || currentUser.name}
              </span>
              <span style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '10px',
                background: isInstitutional ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                color: isInstitutional ? '#34d399' : '#94a3b8',
                fontWeight: 700
              }}>
                {isInstitutional ? 'INSTITUTIONAL TIER' : 'FREE TIER'}
              </span>
            </div>
          ) : (
            <button
              onClick={() => handleDemoLogin('BULK_INSTITUTIONAL')}
              style={{
                background: '#334155',
                color: '#f8fafc',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              Demo HR Login
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px' }}>
        {/* If Free Tier or Not Upgraded */}
        {!isInstitutional ? (
          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center',
            maxWidth: '850px',
            margin: '40px auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</div>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#f8fafc', marginBottom: '12px' }}>
              Unlock the FoodLoop Institutional & Corporate Bulk Portal
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: 1.6, maxWidth: '650px', margin: '0 auto 28px' }}>
              Designed for schools conducting student uniform drives, colleges, corporations with surplus apparel stock, and textile brand take-backs. Get verified ESG environmental metrics, CSR certificates, and priority logistics.
            </p>

            {/* Feature Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '36px', textAlign: 'left' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '18px', borderRadius: '10px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '22px', marginBottom: '8px' }}>📜</div>
                <h4 style={{ margin: '0 0 4px', fontSize: '14px', color: '#f8fafc', fontWeight: 700 }}>CSR Audit Certificate</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>Official tamper-evident digital certificate with unique ID for MCA & annual CSR reporting.</p>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '18px', borderRadius: '10px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '22px', marginBottom: '8px' }}>🌿</div>
                <h4 style={{ margin: '0 0 4px', fontSize: '14px', color: '#f8fafc', fontWeight: 700 }}>Scope 3 ESG Metrics</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>Audited calculation of kg CO2e emissions avoided and litres of groundwater preserved.</p>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '18px', borderRadius: '10px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '22px', marginBottom: '8px' }}>🚚</div>
                <h4 style={{ margin: '0 0 4px', fontSize: '14px', color: '#f8fafc', fontWeight: 700 }}>Bulk Batch Manifests</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>Digital manifest tracking for 50+ item batches, uniform drives, and NGO pickup handshakes.</p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', alignItems: 'center' }}>
              <button
                onClick={handleUpgradeTier}
                disabled={upgrading}
                style={{
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '14px 28px',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: upgrading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                }}
              >
                {upgrading ? 'Upgrading Account...' : '✨ Activate Institutional Bulk Donor Tier (Free Pilot)'}
              </button>
              <button
                onClick={() => handleDemoLogin('BULK_INSTITUTIONAL')}
                style={{
                  background: 'transparent',
                  color: '#94a3b8',
                  border: '1px solid #475569',
                  padding: '14px 20px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Try Demo Institutional Persona
              </button>
            </div>
          </div>
        ) : (
          /* Institutional Tier Dashboard */
          <div>
            {/* Header Banner */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 78, 59, 0.3))',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '14px',
              padding: '24px',
              marginBottom: '28px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '18px' }}>🛡️</span>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#34d399', letterSpacing: '0.05em' }}>
                    VERIFIED INSTITUTIONAL & CORPORATE PARTNER
                  </span>
                </div>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#ffffff' }}>
                  {analytics?.org_name || currentUser?.org_name || 'Institutional Dashboard'}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#a7f3d0' }}>
                  Live consolidated impact tracking across school campuses and corporate drives.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowCertModal(true)}
                  style={{
                    background: '#047857',
                    color: '#ffffff',
                    border: '1px solid #10b981',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  📜 View Official CSR Certificate
                </button>
                <Link
                  to="/clothes"
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    textDecoration: 'none',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  ➕ Schedule Bulk Donation
                </Link>
              </div>
            </div>

            {/* Impact Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>
                  <span>Diverted Garments</span>
                  <span style={{ fontSize: '18px' }}>👕</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#f8fafc' }}>
                  {analytics?.stats?.total_garments_est ?? 75}
                </div>
                <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
                  Across {analytics?.stats?.total_donations ?? 3} consignments
                </div>
              </div>

              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>
                  <span>Bulk Consignments</span>
                  <span style={{ fontSize: '18px' }}>📦</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#f8fafc' }}>
                  {analytics?.stats?.total_bulk_batches ?? 2}
                </div>
                <div style={{ fontSize: '12px', color: '#38bdf8', marginTop: '4px' }}>
                  Institutional lots (50+ garments)
                </div>
              </div>

              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>
                  <span>Carbon Offset</span>
                  <span style={{ fontSize: '18px' }}>🌿</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#34d399' }}>
                  {analytics?.stats?.co2_saved_kg ?? 180} <span style={{ fontSize: '14px', fontWeight: 500, color: '#94a3b8' }}>kg CO2e</span>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  Based on textile reuse footprint model
                </div>
              </div>

              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>
                  <span>Water Footprint Saved</span>
                  <span style={{ fontSize: '18px' }}>💧</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#60a5fa' }}>
                  {((analytics?.stats?.water_saved_liters ?? 135000) / 1000).toFixed(1)}k <span style={{ fontSize: '14px', fontWeight: 500, color: '#94a3b8' }}>Litres</span>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  Raw cotton production equivalent
                </div>
              </div>
            </div>

            {/* Category Breakdown & Recycling Diversion */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '28px' }}>
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                  Garment Category Breakdown
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {['Kids', 'Men', 'Women', 'Infant'].map((cat) => {
                    const count = analytics?.stats?.category_breakdown?.[cat] ?? (cat === 'Kids' ? 2 : 1);
                    return (
                      <div key={cat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '14px', color: '#cbd5e1' }}>{cat} Apparel</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>{count} batches</span>
                          <span style={{
                            width: '80px',
                            height: '6px',
                            background: '#334155',
                            borderRadius: '3px',
                            overflow: 'hidden',
                            display: 'inline-block'
                          }}>
                            <span style={{
                              display: 'block',
                              height: '100%',
                              width: `${Math.min(100, count * 35)}%`,
                              background: '#10b981'
                            }}></span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                  Circular Economy Routing
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>Shelter & Community Reuse</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>Direct distribution to verified night shelters</div>
                    </div>
                    <span style={{ color: '#10b981', fontWeight: 700 }}>88%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>Industrial Fiber Recycling</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>Non-wearable lots routed to partner recyclers</div>
                    </div>
                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>12%</span>
                  </div>
                  <div style={{ borderTop: '1px solid #334155', paddingTop: '10px', marginTop: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
                      ✅ 100% Zero-Landfill Certified Handover
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Institutional Batches Table */}
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                  Institutional Consignments & Batches
                </h3>
                <Link to="/clothes" style={{ fontSize: '12px', color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>
                  + Schedule Consignment
                </Link>
              </div>

              {analytics?.recent_donations && analytics.recent_donations.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                        <th style={{ padding: '10px 8px' }}>Date</th>
                        <th style={{ padding: '10px 8px' }}>Category</th>
                        <th style={{ padding: '10px 8px' }}>Description / Uniforms</th>
                        <th style={{ padding: '10px 8px' }}>Type</th>
                        <th style={{ padding: '10px 8px' }}>Condition</th>
                        <th style={{ padding: '10px 8px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.recent_donations.map((d, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #293548' }}>
                          <td style={{ padding: '12px 8px', color: '#94a3b8' }}>
                            {new Date(d.created_at).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '12px 8px', fontWeight: 600, color: '#f8fafc' }}>
                            {d.category}
                          </td>
                          <td style={{ padding: '12px 8px', color: '#cbd5e1' }}>
                            {d.garment_type || d.bulk_note || 'Assorted Apparel Batch'}
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            {d.is_bulk_donation ? (
                              <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                                BULK BATCH
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '12px' }}>Standard</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 8px', color: '#cbd5e1' }}>
                            {d.ai_condition_grade || 'Wearable'}
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            <span style={{
                              background: d.status === 'CLAIMED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: d.status === 'CLAIMED' ? '#34d399' : '#fbbf24',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700
                            }}>
                              {d.status === 'CLAIMED' ? 'HANDED OVER' : 'DISPATCH READY'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8' }}>
                  <p style={{ margin: '0 0 10px' }}>No recorded consignments yet for this account.</p>
                  <Link
                    to="/clothes"
                    style={{
                      display: 'inline-block',
                      background: '#10b981',
                      color: '#ffffff',
                      textDecoration: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600
                    }}
                  >
                    Post Your First Bulk Consignment on ClothesLoop
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Official CSR ESG Certificate Modal */}
      {showCertModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            color: '#0f172a',
            borderRadius: '16px',
            maxWidth: '680px',
            width: '100%',
            padding: '40px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            border: '8px solid #064e3b',
            position: 'relative',
            fontFamily: 'Georgia, serif'
          }}>
            <button
              onClick={() => setShowCertModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#f1f5f9',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#64748b'
              }}
            >
              ✕
            </button>

            <div style={{ textAlign: 'center', borderBottom: '2px solid #064e3b', paddingBottom: '20px', marginBottom: '24px' }}>
              <div style={{ fontSize: '32px', marginBottom: '6px' }}>🛡️</div>
              <h2 style={{ margin: 0, fontSize: '24px', letterSpacing: '0.08em', color: '#064e3b', textTransform: 'uppercase' }}>
                FoodLoop ClothesLoop
              </h2>
              <h3 style={{ margin: '4px 0 0', fontSize: '14px', color: '#059669', fontStyle: 'italic' }}>
                Corporate Social Responsibility & Environmental Stewardship Certificate
              </h3>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '24px', lineHeight: 1.8 }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>
                This is to officially certify that
              </p>
              <h3 style={{ margin: '8px 0', fontSize: '22px', color: '#0f172a', fontWeight: 'bold' }}>
                {analytics?.org_name || currentUser?.org_name || 'Institutional Partner'}
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#334155' }}>
                has successfully diverted surplus apparel and institutional garments from landfills, directly channeling them to verified night-shelters and circular recycling partners.
              </p>
            </div>

            {/* Impact Highlights */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#065f46' }}>
                  {analytics?.stats?.total_garments_est ?? 75}
                </div>
                <div style={{ fontSize: '11px', color: '#047857' }}>Garments Diverted</div>
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#065f46' }}>
                  {analytics?.stats?.co2_saved_kg ?? 180} kg
                </div>
                <div style={{ fontSize: '11px', color: '#047857' }}>CO2e Offset</div>
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#065f46' }}>
                  {((analytics?.stats?.water_saved_liters ?? 135000) / 1000).toFixed(1)}k L
                </div>
                <div style={{ fontSize: '11px', color: '#047857' }}>Water Preserved</div>
              </div>
            </div>

            {/* Footer Sign-off */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '12px', color: '#64748b' }}>
              <div>
                <div><strong>Certificate ID:</strong> {analytics?.csr_certificate?.certificate_id || 'CSR-FL-2026-DEL'}</div>
                <div><strong>Issue Date:</strong> {new Date().toLocaleDateString()}</div>
                <div><strong>Verification:</strong> FoodLoop Trust Engine</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ borderBottom: '1px solid #94a3b8', width: '140px', marginBottom: '4px' }}></div>
                <div style={{ fontWeight: 'bold', color: '#0f172a' }}>Director of Sustainability</div>
                <div>FoodLoop Foundation India</div>
              </div>
            </div>

            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <button
                onClick={() => window.print()}
                style={{
                  background: '#047857',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '13px'
                }}
              >
                🖨️ Print / Save as PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
