import React, { useState } from 'react';
import confetti from 'canvas-confetti';

export default function WeddingPurchaseModal({ item, isOpen, onClose, onSuccess }) {
  const [buyerName, setBuyerName] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('foodloop_auth_user') || '{}');
      return u.name || '';
    } catch (_) {
      return '';
    }
  });
  const [buyerPhone, setBuyerPhone] = useState(() => {
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

  if (!isOpen || !item) return null;

  const price = Number(item.resale_price) || 0;
  const charityCut = Math.round(price * 0.10);
  const donorCut = price - charityCut;
  const itemId = item._id || item.id;

  const handlePurchase = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Create order
      const orderRes = await fetch(`/api/clothes/${itemId}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Failed to initiate purchase.');
      }

      // 2. Razorpay or mock flow
      if (window.Razorpay && orderData.key_id && !orderData.mock && !orderData.key_id.includes('mock')) {
        const options = {
          key: orderData.key_id,
          amount: orderData.amount,
          currency: 'INR',
          name: 'ClothesLoop Wedding Resale',
          description: `Purchase of ${item.garment_type || 'Festive Wear'} (10% to Shelter Relief)`,
          order_id: orderData.order_id,
          prefill: {
            name: buyerName || 'Kind Buyer',
            contact: buyerPhone || ''
          },
          theme: { color: '#db2777' },
          handler: async (response) => {
            await verifyResalePayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              buyer_name: buyerName,
              buyer_phone: buyerPhone
            });
          },
          modal: {
            ondismiss: () => setLoading(false)
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Mock verification
        await verifyResalePayment({
          razorpay_order_id: orderData.order_id,
          razorpay_payment_id: `pay_resale_${Date.now()}`,
          buyer_name: buyerName || 'Kind Buyer',
          buyer_phone: buyerPhone || ''
        });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Payment initiation error.');
      setLoading(false);
    }
  };

  const verifyResalePayment = async (payload) => {
    try {
      const res = await fetch(`/api/clothes/${itemId}/purchase/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessData(data);
        try {
          confetti({ particleCount: 85, spread: 70, origin: { y: 0.6 } });
        } catch (_) {}
        if (onSuccess) onSuccess(data.item);
      } else {
        setErrorMsg(data.error || 'Payment verification failed.');
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
        maxWidth: '500px',
        width: '100%',
        padding: '28px',
        border: '1px solid #db2777',
        position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(219, 39, 119, 0.3)'
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <span style={{ fontSize: '28px' }}>💫</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f472b6' }}>
                  Wedding & Special Wear Resale
                </h3>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Pre-loved festive couture with a 10% charitable shelter split
                </span>
              </div>
            </div>

            {/* Item Preview Card */}
            <div style={{ display: 'flex', gap: '14px', background: '#1e293b', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
              {item.image && (
                <img
                  src={item.image}
                  alt="Wedding item"
                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }}
                />
              )}
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 4px', fontSize: '14px', color: '#f8fafc' }}>
                  {item.garment_type || 'Festive Wedding Wear'}
                </h4>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Category: {item.category} • Size: {item.size || 'M'}
                </div>
                <div style={{ fontSize: '12px', color: '#34d399', marginTop: '4px', fontWeight: 600 }}>
                  Condition: {item.ai_condition_grade || 'New with tags'}
                </div>
              </div>
            </div>

            {errorMsg && (
              <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                {errorMsg}
              </div>
            )}

            {/* Split Breakdown */}
            <div style={{ background: 'rgba(30, 41, 59, 0.8)', borderRadius: '10px', padding: '14px', marginBottom: '18px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#f472b6', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🤝 Transparent 90/10 Impact Split
              </div>
              <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                  <span>Pre-Loved Seller Payout (90%)</span>
                  <span>₹{donorCut}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#34d399', fontWeight: 600 }}>
                  <span>🍲 Shelter Meal Rescue Fund (10%)</span>
                  <span>+ ₹{charityCut}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #475569', paddingTop: '8px', fontWeight: 800, fontSize: '15px', color: '#ffffff' }}>
                  <span>Total Purchase Price</span>
                  <span style={{ color: '#f472b6' }}>₹{price}</span>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px', fontStyle: 'italic' }}>
                * ₹{charityCut} immediately funds approximately {Math.max(1, Math.round(charityCut / 40))} hot meals for homeless shelters.
              </div>
            </div>

            {/* Buyer Contact */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                  Your Name
                </label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Buyer Name"
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
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
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
              onClick={handlePurchase}
              disabled={loading}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #db2777, #f43f5e)',
                color: '#ffffff',
                border: 'none',
                padding: '14px',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 15px rgba(219, 39, 119, 0.4)'
              }}
            >
              {loading ? 'Processing Payment...' : `Buy Pre-Loved Couture & Support (₹${price})`}
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 10px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✨</div>
            <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 800, color: '#f472b6' }}>
              Purchase Confirmed!
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: 1.6, margin: '0 0 16px' }}>
              Congratulations, <strong>{buyerName || 'Valued Buyer'}</strong>! You have purchased this pre-loved wedding piece for <strong>₹{price}</strong>.
            </p>
            <div style={{ background: '#1e293b', borderRadius: '10px', padding: '16px', marginBottom: '20px', textAlign: 'left', fontSize: '12px', color: '#94a3b8' }}>
              <div><strong>Transaction ID:</strong> {successData.payment_id}</div>
              <div style={{ marginTop: '4px', color: '#34d399' }}>
                <strong>Charity Contribution:</strong> ₹{charityCut} (10%) channeled to rescue shelter meals!
              </div>
              <div style={{ marginTop: '4px' }}>
                <strong>Seller Coordinates:</strong> Pickup address shared with your mobile number.
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: '#db2777',
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
