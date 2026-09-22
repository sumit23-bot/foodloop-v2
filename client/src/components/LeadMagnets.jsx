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
          <button className="action-card featured" onClick={() => onAction('DONATE')}>
            <span className="card-number">01</span>
            <span className="action-icon"><i className="fa-solid fa-hand-holding-heart"></i></span>
            <span><strong>Donate surplus food</strong><small>Turn today's extra into someone's meal.</small></span>
            <i className="fa-solid fa-arrow-up-right-from-square card-arrow"></i>
          </button>
          
          <button className="action-card" onClick={() => onAction('NGO')}>
            <span className="card-number">02</span>
            <span className="action-icon"><i className="fa-solid fa-people-carry-box"></i></span>
            <span><strong>NGO / Shelter Portal</strong><small>Verify with Darpan ID to claim food.</small></span>
            <i className="fa-solid fa-arrow-up-right-from-square card-arrow"></i>
          </button>
          
          <button className="action-card" onClick={() => onAction('VOLUNTEER')}>
            <span className="card-number">03</span>
            <span className="action-icon"><i className="fa-solid fa-person-running"></i></span>
            <span><strong>Volunteer & Deliver</strong><small>Bring your rescue skills to the network.</small></span>
            <i className="fa-solid fa-arrow-up-right-from-square card-arrow"></i>
          </button>
          
          <button className="action-card" onClick={() => onAction('SHARE')}>
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
