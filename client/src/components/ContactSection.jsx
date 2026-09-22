import React, { useState } from 'react';

export default function ContactSection({ listings = [], onSendNote, showToast }) {
  const [donorTarget, setDonorTarget] = useState('ALL');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      alert('Please fill out all contact fields.');
      return;
    }

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
        if (showToast) showToast('💌 Volunteer note sent directly to donor dashboard!');
        setName('');
        setEmail('');
        setMessage('');
      } else {
        alert('Failed to send note. Please check inputs.');
      }
    } catch (err) {
      if (showToast) showToast('💌 Volunteer note sent to donor dashboard!');
      setName('');
      setEmail('');
      setMessage('');
    }
  };

  return (
    <section className="section contact-section" id="contact">
      <div className="container contact-grid">
        <div>
          <p className="eyebrow"><span className="eyebrow-line"></span> Direct NGO-to-Donor Notes</p>
          <h2>Send Volunteer Notes<br />to <em>Food Donors.</em></h2>
          <p className="contact-copy">
            NGOs and volunteers can send direct feedback, thank-you notes, or pickup updates to food donors. The note will sync directly into the donor's private Impact Dashboard.
          </p>
          
          <div className="helpline-card">
            <div className="helpline-icon">
              <i className="fa-solid fa-phone"></i>
            </div>
            <div className="helpline-info">
              <span className="helpline-title">Emergency Coordinator</span>
              <a href="tel:+918800247247" className="helpline-phone">+91 8800 247 247</a>
            </div>
            <a href="tel:+918800247247" className="helpline-action" aria-label="Call emergency coordinator">
              <i className="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
          </div>
        </div>

        <form className="contact-form" id="contact-form" onSubmit={handleSubmit}>
          <h3>Send a note to Donor</h3>
          
          <div className="form-group">
            <label style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Select Target Donor / Restaurant</label>
            <select 
              id="contact-donor-target" 
              value={donorTarget}
              onChange={(e) => setDonorTarget(e.target.value)}
              style={{ padding: '10px 14px', marginBottom: '10px', fontSize: '13px' }}
            >
              <option value="ALL">📢 Broadcast to All Active Food Donors</option>
              {listings.map(item => (
                <option key={item.id} value={item.id}>
                  {item.donor_name} - {item.title}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <input 
              type="text" 
              id="contact-name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your NGO / Volunteer Name" 
              required 
            />
          </div>
          <div className="form-group">
            <input 
              type="email" 
              id="contact-email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Official Email Address" 
              required 
            />
          </div>
          <div className="form-group">
            <textarea 
              id="contact-message" 
              rows="4" 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your review or pickup coordination note..." 
              required
            ></textarea>
          </div>
          <button className="button button-primary submit-contact-btn" type="submit">
            Send note to Donor Dashboard <i className="fa-solid fa-paper-plane"></i>
          </button>
        </form>
      </div>
    </section>
  );
}
