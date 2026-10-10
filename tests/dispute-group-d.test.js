const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DEMO_MODE = 'true';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_for_group_d_testing_1234567890';

const { app, resolveIncidentLiability } = require('../server');
const mongoose = require('mongoose');

test.after(async () => {
  if (mongoose.connection && mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

test('Group D: Dispute Engine, Geofence Proof & Liability Resolution', async (t) => {
  let ngo1Token = '';
  let ngo2Token = '';
  let donorToken = '';
  let adminToken = '';
  let listingId = '';
  const samplePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  await t.test('Setup: obtain tokens for NGO1, NGO2, Donor, and Admin', async () => {
    // Demo login for Admin
    const adminLogin = await request(app)
      .post('/api/auth/demo-login')
      .send({ persona: 'admin' });
    assert.equal(adminLogin.status, 200);
    adminToken = adminLogin.body.token;

    // Demo login for NGO1 (Feeding Delhi)
    const ngo1Login = await request(app)
      .post('/api/auth/demo-login')
      .send({ persona: 'ngo' });
    assert.equal(ngo1Login.status, 200);
    ngo1Token = ngo1Login.body.token;

    // Register distinct second NGO (NGO2)
    const ngo2Phone = '98' + Math.floor(10000000 + Math.random() * 89999999);
    const ngo2Reg = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Second Hope Foundation',
        phone: ngo2Phone,
        password: 'password123',
        role: 'NGO',
        org_name: 'Second Hope Foundation',
        ngo_darpan_id: 'DL/2023/0012345'
      });
    assert.equal(ngo2Reg.status, 201, `NGO2 reg failed: ${JSON.stringify(ngo2Reg.body)}`);
    ngo2Token = ngo2Reg.body.token;

    // Demo login for Donor
    const donorLogin = await request(app)
      .post('/api/auth/demo-login')
      .send({ persona: 'donor' });
    assert.equal(donorLogin.status, 200);
    donorToken = donorLogin.body.token;

    // Create a verified donation listing at Connaught Place: 28.6315, 77.2167
    const aiVerify = await request(app)
      .post('/api/ai/verify-food')
      .send({ image: 'data:image/jpeg;base64,' + 'A'.repeat(200) });
    const verifyToken = aiVerify.body.verification_token;

    const createRes = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        title: 'Fresh Biryani Platters',
        food_type: 'Cooked Meals',
        donor_type: 'Restaurant',
        quantity: '30 meals',
        expiry_hours: 4,
        address: 'Connaught Place Block B, New Delhi',
        coords: { lat: 28.6315, lon: 77.2167 },
        image: samplePng,
        ai_verification_token: verifyToken,
        is_fresh: true,
        hygiene_certified: true,
        termsAcceptance: { version: 'v1.0', acceptedAt: new Date().toISOString() }
      });

    assert.equal(createRes.status, 201);
    listingId = createRes.body.id || createRes.body._id;
    assert.ok(listingId, 'Donation listing ID must be returned');
  });

  await t.test('D1: Geofence rejects missing coordinates or distance > 300m', async () => {
    // Missing coordinates
    const resNoCoords = await request(app)
      .post(`/api/donations/${listingId}/report-fake`)
      .set('Authorization', `Bearer ${ngo1Token}`)
      .send({
        reason: 'NO_FOOD_EMPTY_LOCATION',
        evidence_image: 'data:image/jpeg;base64,' + 'B'.repeat(100)
      });
    assert.equal(resNoCoords.status, 400);
    assert.match(resNoCoords.body.error, /coordinates.*mandatory/i);

    // Coordinate > 300m away (e.g. 5km away at 28.6700, 77.2167)
    const resFar = await request(app)
      .post(`/api/donations/${listingId}/report-fake`)
      .set('Authorization', `Bearer ${ngo1Token}`)
      .send({
        coords: { lat: 28.6700, lon: 77.2167 },
        reason: 'NO_FOOD_EMPTY_LOCATION',
        evidence_image: 'data:image/jpeg;base64,' + 'B'.repeat(100)
      });
    assert.equal(resFar.status, 400);
    assert.match(resFar.body.error, /geofence violation/i);
  });

  await t.test('D1 & D3: Geofence pass <= 300m records Strike 1 as UNDER_REVIEW', async () => {
    // Near Connaught Place within ~50m: 28.6318, 77.2169
    const resStrike1 = await request(app)
      .post(`/api/donations/${listingId}/report-fake`)
      .set('Authorization', `Bearer ${ngo1Token}`)
      .send({
        coords: { lat: 28.6318, lon: 77.2169 },
        reason: 'NO_FOOD_EMPTY_LOCATION',
        evidence_image: 'data:image/jpeg;base64,' + 'C'.repeat(100)
      });

    assert.equal(resStrike1.status, 200);
    assert.equal(resStrike1.body.status, 'UNDER_REVIEW');
  });

  await t.test('D3: Multi-sig consensus: duplicate strike by same NGO is rejected', async () => {
    // Same NGO1 attempts to report the same listing again
    const resDupStrike = await request(app)
      .post(`/api/donations/${listingId}/report-fake`)
      .set('Authorization', `Bearer ${ngo1Token}`)
      .send({
        coords: { lat: 28.6318, lon: 77.2169 },
        reason: 'MISMATCHED_QUANTITY',
        evidence_image: 'data:image/jpeg;base64,' + 'C'.repeat(100)
      });

    assert.equal(resDupStrike.status, 400);
    assert.match(resDupStrike.body.error, /already filed a strike/i);
  });

  await t.test('D3: Strike 2 by distinct verified NGO triggers BAN and donor blacklist', async () => {
    // Second distinct NGO2 reports within 300m
    const resStrike2 = await request(app)
      .post(`/api/donations/${listingId}/report-fake`)
      .set('Authorization', `Bearer ${ngo2Token}`)
      .send({
        coords: { lat: 28.6316, lon: 77.2168 },
        reason: 'UNSAFE_SPOILED_CONTAMINATED',
        evidence_image: 'data:image/jpeg;base64,' + 'D'.repeat(100)
      });

    assert.equal(resStrike2.status, 200);
    assert.equal(resStrike2.body.status, 'BANNED');

    // Verify donor is now blacklisted on subsequent writes/login
    const blacklistedLogin = await request(app)
      .post('/api/auth/login')
      .send({ phone: '9876543210', password: 'password123' }); // demo donor phone
    assert.equal(blacklistedLogin.status, 403);
    assert.match(blacklistedLogin.body.error, /blacklisted/i);
  });

  await t.test('D4: POST /api/incidents rejects non-claimant and invalid severity', async () => {
    // Create new listing to test incident post
    const aiVerify = await request(app)
      .post('/api/ai/verify-food')
      .send({ image: 'data:image/jpeg;base64,' + 'A'.repeat(200) });
    
    // Register unblacklisted donor
    const cleanDonorPhone = '98' + Math.floor(10000000 + Math.random() * 89999999);
    const cleanDonor = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Clean Donor', phone: cleanDonorPhone, password: 'password123', role: 'DONOR' });
    assert.equal(cleanDonor.status, 201, `cleanDonor reg failed: ${JSON.stringify(cleanDonor.body)}`);
    const cleanDonorToken = cleanDonor.body.token;

    const listRes = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${cleanDonorToken}`)
      .send({
        title: 'Dal and Rice Pots',
        food_type: 'Cooked Meals',
        quantity: '25 meals',
        expiry_hours: 6,
        address: 'South Ex, New Delhi',
        coords: { lat: 28.5700, lon: 77.2200 },
        image: samplePng,
        ai_verification_token: aiVerify.body.verification_token,
        termsAcceptance: { version: 'v1.0', acceptedAt: new Date().toISOString() }
      });
    assert.equal(listRes.status, 201);
    const incListingId = listRes.body.id || listRes.body._id;

    // Claim listing with NGO1
    const claimRes = await request(app)
      .patch(`/api/donations/${incListingId}/claim`)
      .set('Authorization', `Bearer ${ngo1Token}`);
    assert.equal(claimRes.status, 200);

    // Non-claimant (NGO2) attempts to report food-safety incident
    const nonClaimantRes = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${ngo2Token}`)
      .send({
        listingId: incListingId,
        severity: 'Moderate (outpatient treatment)',
        description: 'Foreign object found in container'
      });
    assert.equal(nonClaimantRes.status, 403);
    assert.match(nonClaimantRes.body.error, /claiming organization/i);

    // Claimant reports with invalid severity
    const invalidSevRes = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${ngo1Token}`)
      .send({
        listingId: incListingId,
        severity: 'INVALID_CRITICAL_LEVEL',
        description: 'Foreign object found in container'
      });
    assert.equal(invalidSevRes.status, 400);
    assert.match(invalidSevRes.body.error, /invalid severity/i);

    // Valid incident report by claimant
    const validIncRes = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${ngo1Token}`)
      .send({
        listingId: incListingId,
        severity: 'Moderate (outpatient treatment)',
        description: 'Beneficiary suffered nausea within 1 hour of intake'
      });
    assert.equal(validIncRes.status, 201);
    assert.equal(validIncRes.body.status, 'REPORTED');
  });

  await t.test('D5: resolveIncidentLiability pure unit tests', () => {
    // 1. Mild incident with donor agreed to pay
    const res1 = resolveIncidentLiability(
      { severity: 'Mild (no medical attention needed)' },
      5000,
      true
    );
    assert.equal(res1.donorOwes, 5000);
    assert.equal(res1.platformContribution, 0);
    assert.equal(res1.legalEscalation, false);

    // 2. Moderate incident with donor refused to pay (80/20 split)
    const res2 = resolveIncidentLiability(
      { severity: 'Moderate (outpatient treatment)' },
      10000,
      false
    );
    assert.equal(res2.donorOwes, 8000);
    assert.equal(res2.platformContribution, 2000);
    assert.equal(res2.legalEscalation, true);
    assert.ok(res2.legalBasis.includes('FSSA Section 59'));

    // 3. Severe incident even if donor agreed (statutory escalation + 80/20 split)
    const res3 = resolveIncidentLiability(
      { severity: 'Severe (hospitalization required)' },
      50000,
      true
    );
    assert.equal(res3.donorOwes, 40000);
    assert.equal(res3.platformContribution, 10000);
    assert.equal(res3.legalEscalation, true);

    // 4. Life-threatening incident with odd bill amount rounding check
    const res4 = resolveIncidentLiability(
      { severity: 'Life-threatening (ICU / death)' },
      12345.67,
      false
    );
    assert.equal(res4.donorOwes, 9876.54);
    assert.equal(res4.platformContribution, 2469.13);
    assert.equal(res4.legalEscalation, true);

    // 5. Negative/NaN/Zero amounts handled safely
    const res5 = resolveIncidentLiability(
      { severity: 'Moderate (outpatient treatment)' },
      -100,
      false
    );
    assert.equal(res5.donorOwes, 0);
    assert.equal(res5.platformContribution, 0);

    // 6. Capped at statutory upper bound ₹1 Crore (10,000,000)
    const res6 = resolveIncidentLiability(
      { severity: 'Severe (hospitalization required)' },
      999999999,
      false
    );
    assert.equal(res6.donorOwes, 8000000);
    assert.equal(res6.platformContribution, 2000000);
  });
});
