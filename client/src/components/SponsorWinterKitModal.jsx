import React, { useState } from 'react';
import confetti from 'canvas-confetti';

export default function SponsorWinterKitModal({ campaign, isOpen, onClose, onSuccess }) {
  const [kitsCount, setKitsCount] = useState(1);
  const [donorName, setDonorName] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('foodloop_auth_user') || '{}');
      return u.name || '';
    } catch (_) {
      return '';
    }
  });
  const [donorPhone, setDonorPhone] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('foodloop_auth_user') || '{}');
      return u.phone || '';
    } catch (_) {
      return '';
    }
  });

  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const pricePerKit = campaign?.kit_price_inr || 500;
  const totalAmount = kitsCount * pricePerKit;

  const handleSponsorPayment = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Create order on backend
      const orderRes = await fetch('/api/clothes/sponsor-winter-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kits_count: kitsCount,
          campaign_id: campaign?._id || campaign?.id || '',
          donor_name: donorName || 'Kind Contributor',
          donor_phone: donorPhone || ''
        })
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Failed to initialize order.');
      }

      // 2. Razorpay checkout or Mock mode fallback
      if (window.Razorpay && orderData.key_id && !orderData.mock && !orderData.key_id.includes('mock')) {
        const options = {
          key: orderData.key_id,
          amount: orderData.amount,
          currency: 'INR',
          name: 'ClothesLoop Winter Relief',
          description: `Sponsoring ${kitsCount} Winter Kit(s) for Night Shelters`,
          order_id: orderData.order_id,
          prefill: {
            name: donorName || 'Kind Donor',
            contact: donorPhone || ''
          },
          theme: { color: '#059669' },
          handler: async (response) => {
            // 3. Verify signature on backend
            await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              campaign_id: campaign?._id || campaign?.id,
              kits_count: kitsCount,
              donor_name: donorName
            });
          },
          modal: {
            ondismiss: () => setLoading(false)
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Mock verification for local testing and demo
        await verifyPayment({
          razorpay_order_id: orderData.order_id,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          campaign_id: campaign?._id || campaign?.id,
          kits_count: kitsCount,
          donor_name: donorName || 'Kind Contributor'
        });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Payment initiation failed.');
      setLoading(false);
    }
  };

  const verifyPayment = async (payload) => {
    try {
      const verifyRes = await fetch('/api/clothes/sponsor-winter-kit/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const verifyData = await verifyRes.json();

      if (verifyRes.ok && verifyData.success) {
        setSuccessData(verifyData);
        try {
          confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
        } catch (_) {}
        if (onSuccess) onSuccess(kitsCount, campaign?._id || campaign?.id);
      } else {
        setErrorMsg(verifyData.error || 'Payment verification failed.');
      }
    } catch (err) {
      setErrorMsg('Network error verifying payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
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
        background: '#0f172a',
        color: '#f8fafc',
        borderRadius: '16px',
        maxWidth: '520px',
        width: '100%',
        padding: '28px',
        border: '1px solid #334155',
        position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: '#1e293b',
            border: 'none',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#94a3b8'
          }}
        >
          ✕
        </button>

        {!successData ? (
          <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '28px' }}>❄️</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
                  Sponsor a Winter Shield Kit
                </h3>
                <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 600 }}>
                  {campaign?.campaign_title || 'Winter Warmth Mission'}
                </span>
              </div>
            </div>

            {campaign?.brand_name && (
              <div style={{ background: '#1e293b', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
                🤝 Co-sponsored with <strong>{campaign.brand_name}</strong> CSR Match
              </div>
            )}

            {errorMsg && (
              <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                {errorMsg}
              </div>
            )}

            {/* Select Kits Count */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '8px', fontWeight: 600 }}>
                Select Number of Winter Kits:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[1, 2, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setKitsCount(num)}
                    style={{
                      background: kitsCount === num ? '#059669' : '#1e293b',
                      color: kitsCount === num ? '#ffffff' : '#cbd5e1',
                      border: kitsCount === num ? '2px solid #10b981' : '1px solid #334155',
                      padding: '10px 4px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    {num} {num === 1 ? 'Kit' : 'Kits'}
                    <div style={{ fontSize: '11px', fontWeight: 500, color: kitsCount === num ? '#d1fae5' : '#94a3b8', marginTop: '2px' }}>
                      ₹{num * pricePerKit}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Transparent Cost Breakdown */}
            <div style={{ background: '#1e293b', borderRadius: '10px', padding: '14px', marginBottom: '18px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🔍 100% Transparent Kit Cost Breakdown ({kitsCount} {kitsCount === 1 ? 'Kit' : 'Kits'})
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>🧥 Heavy Thermal Inner & Woolen Pullover</span>
                  <span style={{ color: '#cbd5e1' }}>₹{350 * kitsCount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>🧦 Insulated Beanie Cap & Thermal Socks</span>
                  <span style={{ color: '#cbd5e1' }}>₹{100 * kitsCount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>📦 Geotagged Packaging & Night Delivery</span>
                  <span style={{ color: '#cbd5e1' }}>₹{50 * kitsCount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #334155', paddingTop: '6px' }}>
                  <span style={{ color: '#10b981' }}>🛡️ FoodLoop Tech & Platform Fee</span>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>₹0 (100% Non-Profit)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #475569', paddingTop: '8px', fontWeight: 800, fontSize: '14px', color: '#f8fafc' }}>
                  <span>Total Contribution</span>
                  <span style={{ color: '#34d399' }}>₹{totalAmount}</span>
                </div>
              </div>
            </div>

            {/* Donor Information */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                  Your Name
                </label>
                <input
                  type="text"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="Anonymous Sponsor"
                  style={{
                    width: '100%',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                  Phone Number
                </label>
                <input
                  type="text"
                  value={donorPhone}
                  onChange={(e) => setDonorPhone(e.target.value)}
                  placeholder="+91 98..."
                  style={{
                    width: '100%',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Action CTA */}
            <button
              onClick={handleSponsorPayment}
              disabled={loading}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #059669, #10b981)',
                color: '#ffffff',
                border: 'none',
                padding: '14px',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
              }}
            >
              {loading ? 'Processing via Razorpay Gateway...' : `Proceed to Sponsor ₹${totalAmount}`}
            </button>
          </div>
        ) : (
          /* Payment Success Confirmation View */
          <div style={{ textAlign: 'center', padding: '20px 10px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
            <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 800, color: '#34d399' }}>
              Winter Kit Sponsorship Verified!
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: 1.6, margin: '0 0 20px' }}>
              Thank you, <strong>{donorName || 'Kind Contributor'}</strong>! Your contribution of <strong>₹{totalAmount}</strong> has successfully sponsored <strong>{kitsCount} Winter Shield Kit{kitsCount > 1 ? 's' : ''}</strong>.
            </p>
            <div style={{ background: '#1e293b', borderRadius: '10px', padding: '16px', marginBottom: '24px', textAlign: 'left', fontSize: '12px', color: '#94a3b8' }}>
              <div><strong>Transaction ID:</strong> {successData.payment_id}</div>
              <div style={{ marginTop: '4px' }}><strong>Distribution Target:</strong> NCR Night Shelters & Street Dwellers</div>
              <div style={{ marginTop: '4px', color: '#10b981' }}><strong>Status:</strong> Geotagged Logistics Queue Assigned</div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Done & Return to ClothesLoop
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
