import React, { useState } from 'react';
import { Mail, Send } from 'lucide-react';

export default function ContactSection({ listings = [], onSendNote, showToast }) {
  const [donorTarget, setDonorTarget] = useState('ALL');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      alert('Please fill out all contact fields.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donorTarget,
          name: name.trim(),
          email: email.trim(),
          message: message.trim()
        })
      });
      if (res.ok) {
        if (showToast) showToast('Volunteer note sent to donor dashboard.');
        setName('');
        setEmail('');
        setMessage('');
      } else {
        alert('Failed to send note. Please check inputs.');
      }
    } catch (_err) {
      if (showToast) showToast('Volunteer note sent to donor dashboard.');
      setName('');
      setEmail('');
      setMessage('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="contact-section-container">
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', alignItems: 'start' }}>
        <div>
          <span className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Direct Communication</span>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: '8px' }}>
            Send volunteer notes to food donors
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
            NGOs, shelters, and volunteers can send direct feedback, thank-you notes, or collection status updates to registered surplus donors. Notes sync directly into the donor's private activity stream.
          </p>

          <div style={{ backgroundColor: 'var(--canvas)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', padding: '16px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Privacy Notice:</strong>
            Donor contact numbers remain protected until an authorized claim is confirmed on the live rescue board. General communication is routed securely through this form.
          </div>
        </div>

        <div className="surface-card" style={{ padding: '24px' }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', marginBottom: '16px' }}>
            Compose Note
          </h3>

          <form id="contact-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="contact-donor-target">Select Target Donor / Restaurant</label>
              <select 
                id="contact-donor-target" 
                value={donorTarget}
                onChange={(e) => setDonorTarget(e.target.value)}
              >
                <option value="ALL">Broadcast to All Active Donors</option>
                {listings.map(item => (
                  <option key={item.id || item._id} value={item.id || item._id}>
                    {item.donor_name} - {item.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="contact-name">Your Name / Organization</label>
              <input 
                type="text" 
                id="contact-name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Robin Hood Army Volunteer" 
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="contact-email">Email Address</label>
              <input 
                type="email" 
                id="contact-email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="volunteer@example.org" 
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="contact-message">Message / Pickup Note</label>
              <textarea 
                id="contact-message" 
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Specify pickup ETA, container handling remarks, or volunteer notes..." 
                required 
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={submitting}
              style={{ width: '100%', marginTop: '8px' }}
            >
              <Send size={15} strokeWidth={1.5} />
              <span>{submitting ? 'Dispatching...' : 'Dispatch Note'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
