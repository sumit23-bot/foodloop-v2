import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Gift, ShieldCheck, Heart } from 'lucide-react';

export default function SponsorPage({ currentUser, showToast }) {
  const [selectedPreset, setSelectedPreset] = useState(40);
  const [customAmount, setCustomAmount] = useState('');
  const [name, setName] = useState(currentUser?.name || '');
  const [contact, setContact] = useState(currentUser?.phone || '');
  const [panNumber, setPanNumber] = useState('');
  const [loading, setLoading] = useState(false);

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
      }
    } catch (err) {
      alert('Error initiating contribution: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sponsor-page">
      <div className="page-header">
        <h1 className="page-title">Sponsor a rescued meal</h1>
        <p className="page-subtitle">
          Fund volunteer logistics, packaging, and fuel to safely deliver surplus cooked meals to verified shelters across Delhi-NCR and Dehradun.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Column: Form & Amount Selection */}
        <div className="surface-card" style={{ padding: '24px' }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '4px' }}>
            Contribution Details
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Choose the number of meals you wish to sponsor or enter a custom amount.
          </p>

          <form onSubmit={handleContribute}>
            <div className="form-group">
              <label className="form-label">Select Contribution Preset</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                {[
                  { amount: 40, label: '₹40', sub: '1 Meal' },
                  { amount: 200, label: '₹200', sub: '5 Meals' },
                  { amount: 500, label: '₹500', sub: '12 Meals' },
                ].map((preset) => (
                  <button
                    key={preset.amount}
                    type="button"
                    onClick={() => { setSelectedPreset(preset.amount); setCustomAmount(''); }}
                    className={`btn ${(!customAmount && selectedPreset === preset.amount) ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flexDirection: 'column', padding: '12px 6px', height: 'auto' }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{preset.label}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{preset.sub}</div>
                  </button>
                ))}
              </div>

              <input
                type="number"
                placeholder="Or specify custom amount in ₹"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                min="10"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mobile Number or Email</label>
              <input
                type="text"
                placeholder="For your 80G receipt"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">PAN Number (Optional, for 80G Tax Exemption)</label>
              <input
                type="text"
                maxLength={10}
                placeholder="e.g. ABCDE1234F"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            {/* Cost Breakdown */}
            <div style={{ backgroundColor: 'var(--canvas)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', padding: '14px', marginTop: '20px' }}>
              <div className="label-caps" style={{ marginBottom: '8px' }}>Where your contribution goes</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Volunteer transport &amp; fuel</span>
                  <strong>₹22 / meal</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Insulated packaging &amp; seals</span>
                  <strong>₹12 / meal</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Coordination &amp; verification overhead</span>
                  <strong>₹6 / meal</strong>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: '20px', minHeight: '44px' }}
            >
              {loading ? 'Processing contribution...' : `Proceed to Payment (₹${currentAmount})`}
            </button>
          </form>
        </div>

        {/* Right Column: Contribution Summary */}
        <aside>
          <div className="surface-card" style={{ padding: '24px', marginBottom: '20px' }}>
            <span className="label-caps" style={{ display: 'block', marginBottom: '10px' }}>
              Contribution Summary
            </span>

            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }} className="tabular-nums">
              ₹{currentAmount}
            </div>

            <div style={{ fontSize: '0.875rem', color: 'var(--status-available-text)', fontWeight: 600, marginBottom: '16px' }}>
              Rescues &amp; serves approx. {mealsEquivalent} meals
            </div>

            <div className="detail-meta-list" style={{ margin: '14px 0' }}>
              <div className="detail-meta-item">
                <span>Per meal benchmark</span>
                <span>₹40.00</span>
              </div>
              <div className="detail-meta-item">
                <span>Tax exemption</span>
                <span>Section 80G Eligible</span>
              </div>
              <div className="detail-meta-item">
                <span>Receipt format</span>
                <span>Digital PDF receipt</span>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', lineHeight: 1.45 }}>
              FoodLoop operates with partner NGOs across Delhi-NCR and Dehradun. Contributions directly cover delivery fuel and packaging for volunteers.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
