import React from 'react';

export default function Hero({ stats = { meals: 1520, co2: 480, ngos: 35 } }) {
  return (
    <section className="hero" id="hero">
      <div className="hero-grid container">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-line"></span> Delhi-NCR & Dehradun live food rescue network</p>
          <h1>Bridging surplus food to <em>empty plates</em> in minutes.</h1>
          <p className="hero-text">Good food should never go to waste. FoodLoop connects verified donors with hungry communities and redirects post-window surplus to gaushalas & animal shelters.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#rescue-hub">Rescue food <i className="fa-solid fa-arrow-right"></i></a>
            <a className="text-link" href="#how-it-works">See how it works <i className="fa-solid fa-play"></i></a>
          </div>
          <div className="trust-line">
            <span className="avatar-stack"><span>R</span><span>M</span><span>A</span></span>
            <span>Trusted by 35+ verified NGO & Animal Rescue partners</span>
          </div>
        </div>

        <div className="impact-panel">
          <div className="panel-top"><span className="status-label"><span className="pulse"></span> Live impact</span><span>Updated real-time</span></div>
          <div className="impact-feature">
            <span className="impact-icon"><i className="fa-solid fa-bowl-food"></i></span>
            <div><strong>{stats.meals.toLocaleString()}+</strong><span>meals saved this month</span></div>
          </div>
          <div className="impact-row">
            <div><strong>{stats.co2}<span>kg</span></strong><span>CO2 prevented</span></div>
            <div><strong>{stats.ngos}<span>+</span></strong><span>partner NGOs</span></div>
          </div>
          <div className="chart">
            <div className="chart-label"><span>Rescue momentum</span><strong>+24.8%</strong></div>
            <div className="bars">
              <i style={{ height: '36%' }}></i>
              <i style={{ height: '52%' }}></i>
              <i style={{ height: '43%' }}></i>
              <i style={{ height: '68%' }}></i>
              <i style={{ height: '61%' }}></i>
              <i style={{ height: '82%' }}></i>
              <i style={{ height: '96%' }}></i>
            </div>
            <div className="chart-days"><span>Mon</span><span>Today</span></div>
          </div>
        </div>
      </div>
      <div className="hero-note container"><span>01</span><span>Circular Zero Waste Protocol.</span><span className="note-line"></span></div>
    </section>
  );
}
