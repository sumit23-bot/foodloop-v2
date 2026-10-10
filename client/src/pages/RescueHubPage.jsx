import React from 'react';
import RescueFeeds from '../components/RescueFeeds';

export default function RescueHubPage({
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
  const readyCount = listings.filter(i => i.status !== 'DIVERTED_TO_ANIMALS' && i.status === 'AVAILABLE').length;

  return (
    <div className="rescue-hub-page">
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Rescue hub</h1>
            <p className="page-subtitle">
              Active surplus cooked food consignments within safe consumption windows across Delhi-NCR and Dehradun.
            </p>
          </div>
          <div>
            <span className="status-chip available">
              {readyCount} consignments ready
            </span>
          </div>
        </div>
      </div>

      <RescueFeeds
        listings={listings}
        currentTab="HUMAN"
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
