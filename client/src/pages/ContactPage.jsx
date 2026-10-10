import React from 'react';
import ContactSection from '../components/ContactSection';

export default function ContactPage({ listings = [], showToast }) {
  return (
    <div className="contact-page">
      <div className="page-header">
        <h1 className="page-title">Contact &amp; feedback</h1>
        <p className="page-subtitle">
          Direct communication channel between volunteer rescue coordinators and participating food donors.
        </p>
      </div>

      <ContactSection
        listings={listings}
        showToast={showToast}
      />
    </div>
  );
}
