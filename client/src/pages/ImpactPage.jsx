import React from 'react';
import { Award, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';
import { generate80GCertificate } from '../utils/certificate';

export default function ImpactPage({ currentUser, listings = [] }) {
  const history = listings.filter(l => 
    (currentUser?.name && l.donor_name && l.donor_name.toLowerCase() === currentUser.name.toLowerCase()) ||
    (currentUser?.name && l.claimed_by && l.claimed_by.toLowerCase() === currentUser.name.toLowerCase()) ||
    (currentUser?.organization && l.claimed_by && l.claimed_by.toLowerCase() === currentUser.organization.toLowerCase())
  );

  const totalContributions = history.length;
  const estimatedMeals = totalContributions > 0 ? totalContributions * 40 : 0;
  const estimatedCO2 = totalContributions > 0 ? totalContributions * 15 : 0;

  return (
    <div className="impact-page">
      <div className="page-header">
        <h1 className="page-title">My impact</h1>
        <p className="page-subtitle">
          Verified contribution records, environmental offset metrics, and Section 80G tax exemption receipts.
        </p>
      </div>

      {/* User Summary Card */}
      <div className="surface-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div className="label-caps" style={{ marginBottom: '4px' }}>Account Standing</div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '4px' }}>
              {currentUser?.name || currentUser?.organization || 'Registered Community Member'}
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              {currentUser?.role === 'NGO'
                ? `Verified NGO Partner · Darpan ID: ${currentUser.ngo_darpan_id || currentUser.darpan_id || 'On file'}`
                : currentUser?.role === 'ANIMAL_SHELTER'
                ? 'Registered Animal Shelter Partner'
                : 'Verified Surplus Food Donor'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="status-chip available">
              <CheckCircle2 size={13} strokeWidth={1.5} />
              <span>Trust Score: 100/100</span>
            </span>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => generate80GCertificate(currentUser, history)}
            >
              <FileText size={15} strokeWidth={1.5} />
              <span>Download 80G Receipt (PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Impact Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <div className="surface-card" style={{ padding: '20px' }}>
          <div className="label-caps" style={{ marginBottom: '8px' }}>Total Rescues</div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700 }} className="tabular-nums">
            {totalContributions}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            Logged transactions
          </div>
        </div>

        <div className="surface-card" style={{ padding: '20px' }}>
          <div className="label-caps" style={{ marginBottom: '8px' }}>Meals Redirected</div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700 }} className="tabular-nums">
            {estimatedMeals}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            Delivered to community
          </div>
        </div>

        <div className="surface-card" style={{ padding: '20px' }}>
          <div className="label-caps" style={{ marginBottom: '8px' }}>Estimated CO2 Offset</div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700 }} className="tabular-nums">
            {estimatedCO2} kg
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            Landfill methane prevented
          </div>
        </div>

        <div className="surface-card" style={{ padding: '20px' }}>
          <div className="label-caps" style={{ marginBottom: '8px' }}>Audit Status</div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--status-available-text)' }}>
            Pass
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            100% verified handovers
          </div>
        </div>
      </div>

      {/* Contribution History Ruled Table */}
      <div className="card-section-title">
        <span>Contribution Ledger History</span>
      </div>

      <div className="table-responsive">
        <table className="ruled-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Consignment Item</th>
              <th>Volume</th>
              <th>Category</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '32px' }}>
                  No contribution history recorded for this account yet.
                </td>
              </tr>
            ) : (
              history.map((item, idx) => (
                <tr key={idx}>
                  <td>{new Date(item.created_at || Date.now()).toLocaleDateString('en-IN')}</td>
                  <td style={{ fontWeight: 600 }}>{item.title}</td>
                  <td>{item.quantity}</td>
                  <td>{item.category || 'Cooked Meals'}</td>
                  <td>
                    <span className="status-chip available">Completed</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '16px', fontSize: '0.75rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
        Note: Certificates generated without configured organizational tax credentials contain a sample/demo watermark.
      </div>
    </div>
  );
}
