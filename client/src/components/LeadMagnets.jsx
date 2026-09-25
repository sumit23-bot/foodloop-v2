import React from 'react';

export default function LeadMagnets({ onAction }) {
  return (
    <section className="section action-section" id="lead-magnets">
      <div className="container">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow-line"></span> Make a move</p>
            <h2>There is always a way<br />to <em>join the loop.</em></h2>
          </div>
          <p>Whether you have surplus meals to give, an NGO feeding shelter, or a gaushala rescuing strays, take action now.</p>
        </div>
        <div className="action-grid">
          <button type="button" className="action-card featured" onClick={() => onAction('DONATE')}>
            <span className="card-number">01</span>
            <span className="action-icon"><i className="fa-solid fa-hand-holding-heart"></i></span>
            <span><strong>Donate surplus food</strong><small>Turn today's extra into someone's meal.</small></span>
            <i className="fa-solid fa-arrow-up-right-from-square card-arrow"></i>
          </button>
          
          <button type="button" className="action-card" onClick={() => onAction('NGO')}>
            <span className="card-number">02</span>
            <span className="action-icon"><i className="fa-solid fa-people-carry-box"></i></span>
            <span><strong>NGO / Shelter Portal</strong><small>Verify with Darpan ID to claim food.</small></span>
            <i className="fa-solid fa-arrow-up-right-from-square card-arrow"></i>
          </button>
          
          <button 
            type="button" 
            id="sponsor-action-card"
            className="action-card featured" 
            onClick={() => onAction('SPONSOR')} 
            style={{ border: '1.5px solid rgba(16, 185, 129, 0.4)', cursor: 'pointer' }}
          >
            <span className="card-number" style={{ color: '#10b981' }}>03</span>
            <span className="action-icon"><i className="fa-solid fa-bowl-food"></i></span>
            <span>
              <strong style={{ color: '#34d399' }}>🍲 Sponsor a Rescued Meal — ₹40 Feeds 1 Person</strong>
              <small>Can't donate food? Fund fuel and packaging for NGO volunteers to deliver surplus meals to shelters.</small>
            </span>
            <i className="fa-solid fa-arrow-up-right-from-square card-arrow"></i>
          </button>
          
          <button type="button" className="action-card" onClick={() => onAction('SHARE')}>
            <span className="card-number">04</span>
            <span className="action-icon"><i className="fa-solid fa-bullhorn"></i></span>
            <span><strong>Share the initiative</strong><small>Let more people know about the loop.</small></span>
            <i className="fa-solid fa-arrow-up-right-from-square card-arrow"></i>
          </button>
        </div>
      </div>
    </section>
  );
}
