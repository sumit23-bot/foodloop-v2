import React from 'react';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-main">
        <div className="footer-brand-wrap">
          <a className="brand" href="#hero">
            <span>food<span className="brand-accent">loop</span></span>
            <span className="live-dot"></span>
          </a>
          <p className="footer-tagline">Good food. Better futures.</p>
        </div>
        <div className="socials">
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <i className="fa-brands fa-instagram"></i>
          </a>
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
            <i className="fa-brands fa-linkedin-in"></i>
          </a>
          <a 
            href="https://api.whatsapp.com/send?text=Join%20FoodLoop%20Food%20Rescue%20Network%3A%20https%3A%2F%2Ffoodloop-india.org" 
            target="_blank" 
            rel="noopener noreferrer" 
            aria-label="Share via WhatsApp"
          >
            <i className="fa-brands fa-whatsapp"></i>
          </a>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© 2026 FoodLoop Network · Delhi-NCR & Dehradun Food Rescue</span>
        <span className="footer-partners">
          In partnership with <b>Feeding India</b> · <b>Robin Hood Army</b> · <b>SRSHTI Foundation</b> · <b>Delhi Gaushala Trust</b>
        </span>
      </div>
    </footer>
  );
}
