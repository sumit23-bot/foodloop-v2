const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');

process.env.DEMO_MODE = 'true';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_for_group_c_testing_1234567890';

const { app } = require('../server');

test.after(async () => {
  if (mongoose.connection && mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

test('Group C: Donation Lifecycle, Claim Integrity & Privacy', async (t) => {
  let donorToken = '';
  let ngoToken = '';
  let ngo2Token = '';
  let animalToken = '';
  let sampleDonationId = '';
  let sampleDivertedId = '';

  // Seed authenticated users via demo-login
  const donorRes = await request(app).post('/api/auth/demo-login').send({ persona: 'DONOR' });
  donorToken = donorRes.body.token;

  const ngoRes = await request(app).post('/api/auth/demo-login').send({ persona: 'NGO' });
  ngoToken = ngoRes.body.token;

  const animalRes = await request(app).post('/api/auth/demo-login').send({ persona: 'ANIMAL' });
  animalToken = animalRes.body.token;

  // Create second NGO account via register
  const regNgo2 = await request(app).post('/api/auth/register').send({
    name: 'Care NGO Volunteer',
    phone: '98' + Math.floor(10000000 + Math.random() * 89999999),
    password: 'password123',
    role: 'NGO',
    organization: 'Care India Relief',
    darpan_id: 'DL/2020/0048192'
  });
  ngo2Token = regNgo2.body.token;

  await t.test('C2: Enforces minimum 10 meals policy on posting', async () => {
    // 5 meals should be rejected
    const resLow = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        title: 'Leftover small lunch',
        quantity: '5 portions',
        expiry_hours: 4,
        address: 'Sector 15, Rohini, New Delhi',
        termsAcceptance: { version: 'v1.0', acceptedAt: new Date().toISOString() }
      });
    assert.equal(resLow.status, 400);

    // 0 or negative expiry hours should be rejected
    const resBadExpiry = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        title: 'Surplus Buffet Curry',
        quantity: '50 Servings',
        expiry_hours: -2,
        address: 'Sector 15, Rohini, New Delhi',
        termsAcceptance: { version: 'v1.0', acceptedAt: new Date().toISOString() }
      });
    assert.equal(resBadExpiry.status, 400);

    // Valid post with 30 servings and 1x1 png image
    const samplePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const resValid = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        title: 'Grand Banquet Surplus Biryani & Roti',
        quantity: '30 Servings',
        expiry_hours: 4,
        address: 'Flat 402, Building 7, Connaught Place, New Delhi',
        image: samplePng,
        termsAcceptance: { version: 'v1.0', acceptedAt: new Date().toISOString() }
      });
    assert.equal(resValid.status, 201);
    assert.ok(resValid.body.id);
    sampleDonationId = resValid.body.id;
  });

  await t.test('C3: Routing <= 1 hour safe window to Animal Loop (DIVERTED_TO_ANIMALS)', async () => {
    const resDiverted = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        title: 'Bakery surplus bread and greens',
        quantity: '20kg crates',
        expiry_hours: 1, // <= 1 hour safe window
        address: 'Khan Market, New Delhi',
        termsAcceptance: { version: 'v1.0', acceptedAt: new Date().toISOString() }
      });
    assert.equal(resDiverted.status, 201);
    assert.equal(resDiverted.body.status, 'DIVERTED_TO_ANIMALS');
    sampleDivertedId = resDiverted.body.id;
  });

  await t.test('C1: Claim flow RBAC, atomic locking, and duplicate rejection', async () => {
    // 1. A DONOR cannot claim listings
    const resDonorClaim = await request(app)
      .patch(`/api/donations/${sampleDonationId}/claim`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ claimant_org: 'Fake Donor Claims' });
    assert.equal(resDonorClaim.status, 403);

    // 2. An Animal Shelter cannot claim a human AVAILABLE listing
    const resAnimalClaimAvailable = await request(app)
      .patch(`/api/donations/${sampleDonationId}/claim`)
      .set('Authorization', `Bearer ${animalToken}`)
      .send({ claimant_org: 'Gaushala' });
    assert.equal(resAnimalClaimAvailable.status, 400);

    // 3. Animal shelter CAN claim a DIVERTED_TO_ANIMALS listing
    const resAnimalClaimDiverted = await request(app)
      .patch(`/api/donations/${sampleDivertedId}/claim`)
      .set('Authorization', `Bearer ${animalToken}`)
      .send({ claimant_org: 'Delhi Gaushala & Stray Care Trust' });
    assert.equal(resAnimalClaimDiverted.status, 200);

    // 4. Verified NGO 1 claims the human available listing -> 200
    const resClaim1 = await request(app)
      .patch(`/api/donations/${sampleDonationId}/claim`)
      .set('Authorization', `Bearer ${ngoToken}`)
      .send({ claimant_org: 'Robin Hood Army (Delhi Chapter)' });
    assert.equal(resClaim1.status, 200);
    assert.equal(resClaim1.body.status, 'CLAIMED');

    // 5. NGO 2 tries to claim the same listing -> 409 Conflict
    const resClaim2 = await request(app)
      .patch(`/api/donations/${sampleDonationId}/claim`)
      .set('Authorization', `Bearer ${ngo2Token}`)
      .send({ claimant_org: 'Care India Relief' });
    assert.equal(resClaim2.status, 409);
  });

  await t.test('C6 & C7: Privacy protection and Image Lazy Endpoint', async () => {
    // 1. Unauthenticated / anonymous visitor
    const resPublicFeed = await request(app).get('/api/donations');
    assert.equal(resPublicFeed.status, 200);
    const publicItem = resPublicFeed.body.find(i => (i.id === sampleDonationId || i._id === sampleDonationId));
    assert.ok(publicItem);

    // Phone must be hidden
    assert.equal(publicItem.phone, undefined);
    // Address must be masked to approximate area (no "Flat 402, Building 7")
    assert.ok(!publicItem.address.includes('Flat 402'));
    assert.ok(publicItem.address.includes('Connaught Place'));

    // Image must be served via URL endpoint, not inline base64
    assert.ok(publicItem.image.startsWith('/api/donations/'));

    // 2. Verified image endpoint
    const resImage = await request(app).get(`/api/donations/${sampleDonationId}/image`);
    assert.equal(resImage.status, 200);
    assert.equal(resImage.headers['content-type'], 'image/png');

    // 3. Claiming NGO viewing feed: full address and phone unlocked!
    const resClaimantFeed = await request(app)
      .get('/api/donations')
      .set('Authorization', `Bearer ${ngoToken}`);
    assert.equal(resClaimantFeed.status, 200);
    const claimantItem = resClaimantFeed.body.find(i => (i.id === sampleDonationId || i._id === sampleDonationId));
    assert.ok(claimantItem);
    assert.ok(claimantItem.phone);
    assert.ok(claimantItem.address.includes('Flat 402'));
  });
});
