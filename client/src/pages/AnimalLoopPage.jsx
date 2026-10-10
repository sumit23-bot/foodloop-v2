import React from 'react';
import RescueFeeds from '../components/RescueFeeds';
import PartnerFinder from '../components/tinyfish/PartnerFinder';

export default function AnimalLoopPage({
  listings = [],
  currentUser,
  userCoords,
  onClaim,
  onOpenDispute,
  onOpenQR,
  onOpenScanner,
  onRefresh,
  onOpenDashboard,
  onOpenIncidentReport,
  onOpenIncidentStatus,
  externalSearch = ''
}) {
  const animalCount = listings.filter(i => i.status === 'DIVERTED_TO_ANIMALS' || i.expiry_hours <= 1).length;

  return (
    <div className="animal-loop-page">
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Animal and gaushala loop</h1>
            <p className="page-subtitle">
              Surplus cooked food consignments past safe human consumption windows (&le; 1 hour) redirected to registered gaushalas, stray feeders, and composting partners.
            </p>
          </div>
          <div>
            <span className="status-chip expiring">
              {animalCount} diverted consignments
            </span>
          </div>
        </div>
      </div>

      {/* TinyFish Partner Finder for Gaushalas */}
      <PartnerFinder defaultCity={currentUser?.city || 'Delhi'} />

      {/* Animal Feed Listings */}
      <RescueFeeds
        listings={listings}
        currentTab="ANIMAL"
        currentUser={currentUser}
        userCoords={userCoords}
        onClaim={onClaim}
        onOpenDispute={onOpenDispute}
        onOpenQR={onOpenQR}
        onOpenScanner={onOpenScanner}
        onRefresh={onRefresh}
        onOpenDashboard={onOpenDashboard}
        onOpenIncidentReport={onOpenIncidentReport}
        onOpenIncidentStatus={onOpenIncidentStatus}
        externalSearch={externalSearch}
      />
    </div>
  );
}
