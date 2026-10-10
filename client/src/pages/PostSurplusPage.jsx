import React from 'react';
import DonorForm from '../components/DonorForm';

export default function PostSurplusPage({
  currentUser,
  userLiveCoords,
  onRequestGPS,
  onSubmitDonationInitiate,
  showToast
}) {
  return (
    <div className="post-surplus-page">
      <div className="page-header">
        <h1 className="page-title">Post surplus food</h1>
        <p className="page-subtitle">
          Register surplus cooked food for rescue across Delhi-NCR and Dehradun with timestamped proof and AI food verification.
        </p>
      </div>

      <DonorForm
        currentUser={currentUser}
        userLiveCoords={userLiveCoords}
        onRequestGPS={onRequestGPS}
        onSubmitDonationInitiate={onSubmitDonationInitiate}
        showToast={showToast}
      />
    </div>
  );
}
