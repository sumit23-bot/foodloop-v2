import React from 'react';

export default function HowItWorks() {
  return (
    <section className="section how-section" id="how-it-works">
      <div className="container">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow"><span className="eyebrow-line"></span> The simple version</p>
            <h2>From extra to impact<br />in <em>three steps.</em></h2>
          </div>
        </div>
        <div className="steps">
          <article className="step">
            <span className="step-no">01</span>
            <i className="fa-solid fa-camera"></i>
            <h3>Live Camera or Gallery Capture</h3>
            <p>Donors snap real-time food proof or select gallery photos, AI-verified before publishing.</p>
          </article>
          <article className="step">
            <span className="step-no">02</span>
            <i className="fa-solid fa-shield-halved"></i>
            <h3>Verified NGO Claim</h3>
            <p>Only verified NGOs and shelters can unlock and claim food with Darpan ID.</p>
          </article>
          <article className="step">
            <span className="step-no">03</span>
            <i className="fa-solid fa-paw"></i>
            <h3>Zero-Waste Secondary Loop</h3>
            <p>Unclaimed expired food safely routes to gaushalas & stray feeders.</p>
          </article>
        </div>
      </div>
    </section>
  );
}
