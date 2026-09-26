// Comprehensive end-to-end regression suite for Task 10
// Run with: node test-task10-regression.js

const assert = require('assert');

async function runRegression() {
  console.log('==================================================');
  console.log('🚀 TASK 10 COMPREHENSIVE END-TO-END REGRESSION');
  console.log('==================================================\n');

  const BASE_URL = 'http://localhost:5000';

  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const donorPhone = `981${randomSuffix}`;
  const donorUser = { name: 'Regression Donor Ltd', phone: donorPhone, role: 'DONOR' };
  const donorToken = 'demo_token_' + Buffer.from(JSON.stringify(donorUser)).toString('base64');

  const ngoUser = { name: 'Priya Verma', organization: 'Robin Hood Army', phone: '9877788899', role: 'NGO' };
  const ngoToken = 'demo_token_' + Buffer.from(JSON.stringify(ngoUser)).toString('base64');

  // STEP 1: Verify API rejects donation without terms acceptance (400)
  console.log('1. Testing mandatory Terms acceptance gate on server...');
  const rejectRes = await fetch(`${BASE_URL}/api/donations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
    body: JSON.stringify({
      title: 'Ungated Food Post',
      quantity: '25 servings',
      address: 'Test Kitchen'
      // Omit termsAcceptance
    })
  });
  const rejectData = await rejectRes.json();
  assert.strictEqual(rejectRes.status, 400, 'Server must return 400 when terms acceptance is missing');
  assert.ok(
    rejectData.error?.includes('Terms & Conditions acceptance is required'),
    'Server must include clear terms required message'
  );
  console.log('   ✅ PASS: Submission without terms rejected with 400.\n');

  // STEP 2: Post donation with valid terms acceptance (201)
  console.log('2. Testing donation submission with valid Terms acceptance...');
  const acceptedAt = new Date().toISOString();
  const postRes = await fetch(`${BASE_URL}/api/donations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
    body: JSON.stringify({
      title: 'Regression Surplus Feast',
      quantity: '40 servings',
      address: 'Connaught Place Hub',
      phone: donorPhone,
      donor_name: 'Regression Donor Ltd',
      termsAcceptance: {
        version: 'v1.0',
        acceptedAt
      }
    })
  });
  const listing = await postRes.json();
  assert.strictEqual(postRes.status, 201, 'Donation should be created with 201');
  const listingId = listing._id || listing.id;
  assert.ok(listingId, 'Listing must have an ID');
  assert.strictEqual(listing.termsAcceptance?.version, 'v1.0', 'termsAcceptance version must be v1.0');
  assert.ok(listing.termsAcceptance?.ip, 'Client IP must be recorded on donation');
  console.log(`   ✅ PASS: Listing created with ID ${listingId} and IP ${listing.termsAcceptance.ip}.\n`);

  // STEP 3: Claim listing as NGO
  console.log('3. Claiming listing as verified NGO...');
  const claimRes = await fetch(`${BASE_URL}/api/donations/${listingId}/claim`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ngoToken}` },
    body: JSON.stringify({
      claimant_org: 'Robin Hood Army',
      claimant_phone: '9877788899'
    })
  });
  assert.strictEqual(claimRes.status, 200, 'Claim should return 200');
  console.log('   ✅ PASS: Listing successfully claimed by Robin Hood Army.\n');

  // STEP 4: File Food Safety Incident
  console.log('4. Filing food safety incident report...');
  const incidentPayload = {
    listingId,
    description: 'Multiple children hospitalized with fever and stomach cramps following ingestion.',
    severity: 'Severe (hospitalization required)',
    documents: ['data:image/jpeg;base64,mockhospitalbilldoc']
  };
  const incRes = await fetch(`${BASE_URL}/api/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ngoToken}` },
    body: JSON.stringify(incidentPayload)
  });
  const incident = await incRes.json();
  assert.strictEqual(incRes.status, 201, 'Incident must be created with 201');
  const incidentId = incident.id || incident._id;
  assert.strictEqual(incident.listing_id, listingId, 'Listing ID must match');
  assert.strictEqual(incident.donor_name, 'Regression Donor Ltd', 'Donor name must be pulled from listing');
  assert.strictEqual(incident.donor_phone, donorPhone, 'Donor phone must be pulled from listing');
  assert.strictEqual(incident.status, 'REPORTED', 'Initial status must be REPORTED');
  console.log(`   ✅ PASS: Incident filed with ID ${incidentId}.\n`);

  // STEP 5: Verify transparent reporter query
  console.log('5. Verifying reporter transparency query...');
  const queryRes = await fetch(`${BASE_URL}/api/incidents?listingId=${listingId}`);
  const queryData = await queryRes.json();
  assert.ok(Array.isArray(queryData) && queryData.length > 0, 'Must return array of incidents');
  console.log('   ✅ PASS: Transparent query retrieved active incident.\n');

  // STEP 6: Admin adjudication — Serious Incident / Donor Refuses -> 80/20 Split & Legal Escalation
  console.log('6. Admin adjudication: ₹60,000 bill, severe incident, donor refuses to pay...');
  const patchRes = await fetch(`${BASE_URL}/api/incidents/${incidentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'CONFIRMED',
      verifiedBillAmount: 60000,
      donorAgreedToPay: false
    })
  });
  const resolved = await patchRes.json();
  assert.strictEqual(patchRes.status, 200, 'Resolution must return 200');
  assert.strictEqual(resolved.status, 'CONFIRMED');
  assert.strictEqual(resolved.donor_owes || resolved.donorOwes, 48000, 'Donor owes 80% (₹48,000)');
  assert.strictEqual(resolved.platform_contribution || resolved.platformContribution, 12000, 'FoodLoop contributes 20% (₹12,000)');
  assert.strictEqual(resolved.legal_escalation || resolved.legalEscalation, true, 'Legal escalation must be true');
  const legalBasis = resolved.legal_basis || resolved.legalBasis;
  assert.ok(legalBasis.includes('BNS Section 274'), 'Must cite BNS 274');
  assert.ok(legalBasis.includes('BNS Section 275'), 'Must cite BNS 275');
  assert.ok(legalBasis.includes('FSSA Section 59'), 'Must cite FSSA 59');
  console.log('   ✅ PASS: Verified 80/20 split (₹48,000 / ₹12,000) and BNS/FSSA legal escalation.\n');

  // STEP 7: Verify donor account is blacklisted
  console.log('7. Verifying donor account suspension & blacklist...');
  const blacklistedPostRes = await fetch(`${BASE_URL}/api/donations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donorToken}` },
    body: JSON.stringify({
      title: 'Attempted Post by Blacklisted Donor',
      quantity: '20 servings',
      address: 'Blocked Address',
      phone: donorPhone,
      termsAcceptance: { version: 'v1.0', acceptedAt: new Date().toISOString() }
    })
  });
  assert.strictEqual(blacklistedPostRes.status, 403, 'Blacklisted donor phone must be blocked with 403');
  console.log('   ✅ PASS: Blacklisted donor blocked from posting new donations.\n');

  // STEP 8: Amicable Resolution Scenario (100% Donor, 0% Platform, No Escalation)
  console.log('8. Testing second scenario: Amicable resolution with mild symptoms...');
  const donor2Phone = `982${randomSuffix}`;
  const donor2 = { name: 'Responsible Caterer', phone: donor2Phone, role: 'DONOR' };
  const donor2Token = 'demo_token_' + Buffer.from(JSON.stringify(donor2)).toString('base64');

  const post2 = await (await fetch(`${BASE_URL}/api/donations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donor2Token}` },
    body: JSON.stringify({
      title: 'Amicable Mild Salad',
      quantity: '15 boxes',
      address: 'South Ex Kitchen',
      phone: donor2Phone,
      termsAcceptance: { version: 'v1.0', acceptedAt: new Date().toISOString() }
    })
  })).json();


  const inc2 = await (await fetch(`${BASE_URL}/api/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ngoToken}` },
    body: JSON.stringify({
      listingId: post2._id || post2.id,
      description: 'Minor stomach upset, doctor prescribed antacids.',
      severity: 'Mild (no medical attention needed)'
    })
  })).json();

  const resolved2 = await (await fetch(`${BASE_URL}/api/incidents/${inc2.id || inc2._id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'CONFIRMED',
      verifiedBillAmount: 4000,
      donorAgreedToPay: true
    })
  })).json();

  assert.strictEqual(resolved2.donor_owes || resolved2.donorOwes, 4000, 'Donor owes 100% (₹4,000)');
  assert.strictEqual(resolved2.platform_contribution || resolved2.platformContribution, 0, 'Platform contributes 0%');
  assert.strictEqual(resolved2.legal_escalation || resolved2.legalEscalation, false, 'No legal escalation on amicable mild case');
  console.log('   ✅ PASS: Amicable 100%/0% split verified with no escalation.\n');

  console.log('==================================================');
  console.log('🎉 ALL 8 TASK 10 REGRESSION TESTS PASSED (100%)');
  console.log('==================================================');
}

runRegression().then(() => {
  setTimeout(() => process.exit(0), 200);
}).catch(err => {
  console.error('\n❌ REGRESSION TEST FAILED:', err);
  process.exit(1);
});

