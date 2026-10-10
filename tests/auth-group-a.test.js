const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

// Set DEMO_MODE for test environment
process.env.DEMO_MODE = 'true';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_for_group_a_testing_1234567890';

const { app } = require('../server');
const mongoose = require('mongoose');

test.after(async () => {
  if (mongoose.connection && mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

test('Group A: Authentication & Authorization Security', async (t) => {
  let adminToken = '';
  let donorToken = '';
  let ngoToken = '';

  await t.test('A1: requireAuth rejects missing token, body bypasses, and forged tokens', async () => {
    // Missing token
    const resNoToken = await request(app)
      .delete('/api/donations/purge-all');
    assert.equal(resNoToken.status, 401);

    // Body bypass attempt (previously granted NGO/donor role)
    const resBodyBypass = await request(app)
      .patch('/api/donations/nonexistent123/claim')
      .send({ ngo_name: 'Attacker NGO', darpan_id: 'DL/2024/9999999' });
    assert.equal(resBodyBypass.status, 401);

    // Forged unsigned demo token attempt
    const forgedPayload = Buffer.from(JSON.stringify({ role: 'ADMIN', name: 'Forged Admin' })).toString('base64');
    const resForged = await request(app)
      .delete('/api/donations/purge-all')
      .set('Authorization', `Bearer demo_token_${forgedPayload}`);
    assert.equal(resForged.status, 401);

    // Forged mock token attempt
    const resMock = await request(app)
      .delete('/api/donations/purge-all')
      .set('Authorization', 'Bearer mock_token');
    assert.equal(resMock.status, 401);
  });

  await t.test('A1: POST /api/auth/demo-login returns properly signed tokens for seeded personas', async () => {
    // Valid personas
    const resAdmin = await request(app)
      .post('/api/auth/demo-login')
      .send({ persona: 'ADMIN' });
    assert.equal(resAdmin.status, 200);
    assert.equal(resAdmin.body.role, 'ADMIN');
    assert.ok(resAdmin.body.token);
    adminToken = resAdmin.body.token;

    const resDonor = await request(app)
      .post('/api/auth/demo-login')
      .send({ persona: 'DONOR' });
    assert.equal(resDonor.status, 200);
    assert.equal(resDonor.body.role, 'DONOR');
    assert.ok(resDonor.body.token);
    donorToken = resDonor.body.token;

    const resNgo = await request(app)
      .post('/api/auth/demo-login')
      .send({ persona: 'NGO' });
    assert.equal(resNgo.status, 200);
    assert.equal(resNgo.body.role, 'NGO');
    assert.ok(resNgo.body.token);
    ngoToken = resNgo.body.token;

    // Invalid persona
    const resInvalid = await request(app)
      .post('/api/auth/demo-login')
      .send({ persona: 'SUPERUSER' });
    assert.equal(resInvalid.status, 400);
  });

  await t.test('A2: Public registration rejects ADMIN and VOLUNTEER roles', async () => {
    const resAdminReg = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Evil Admin',
        phone: '9812345678',
        password: 'password123',
        role: 'ADMIN'
      });
    assert.equal(resAdminReg.status, 400);

    const resVolReg = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Volunteer',
        phone: '9812345679',
        password: 'password123',
        role: 'VOLUNTEER'
      });
    assert.equal(resVolReg.status, 400);
  });

  await t.test('A2: Public registration validates NGO Darpan ID format', async () => {
    const resInvalidDarpan = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test NGO',
        phone: '9812345671',
        password: 'password123',
        role: 'NGO',
        organization: 'Test NGO Hub',
        darpan_id: 'INVALID_DARPAN_FORMAT'
      });
    assert.equal(resInvalidDarpan.status, 400);
  });

  await t.test('A3: Public registration accepts field name aliases (organization, darpan_id)', async () => {
    const uniquePhone = '98' + Math.floor(10000000 + Math.random() * 89999999);
    const resValidNgo = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Valid Coordinator',
        phone: uniquePhone,
        password: 'password123',
        role: 'NGO',
        organization: 'Helpline Food Foundation',
        darpan_id: 'DL/2021/0081291'
      });
    assert.equal(resValidNgo.status, 201);
    assert.equal(resValidNgo.body.org_name, 'Helpline Food Foundation');
    assert.equal(resValidNgo.body.ngo_darpan_id, 'DL/2021/0081291');
    assert.ok(resValidNgo.body.token);
  });

  await t.test('A4: DELETE /api/donations/purge-all is restricted to ADMIN only', async () => {
    // Non-admin token -> 403 Forbidden
    const resDonorPurge = await request(app)
      .delete('/api/donations/purge-all')
      .set('Authorization', `Bearer ${donorToken}`);
    assert.equal(resDonorPurge.status, 403);

    const resNgoPurge = await request(app)
      .delete('/api/donations/purge-all')
      .set('Authorization', `Bearer ${ngoToken}`);
    assert.equal(resNgoPurge.status, 403);

    // Admin token -> 200 OK (in demo mode)
    const resAdminPurge = await request(app)
      .delete('/api/donations/purge-all')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(resAdminPurge.status, 200);
  });

  await t.test('A5: PATCH /api/incidents/:id and GET /api/incidents require authentication and role check', async () => {
    // PATCH without auth -> 401
    const resPatchNoAuth = await request(app)
      .patch('/api/incidents/inc_123')
      .send({ status: 'CONFIRMED', verifiedBillAmount: 1000 });
    assert.equal(resPatchNoAuth.status, 401);

    // PATCH with donor auth -> 403
    const resPatchDonor = await request(app)
      .patch('/api/incidents/inc_123')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ status: 'CONFIRMED', verifiedBillAmount: 1000 });
    assert.equal(resPatchDonor.status, 403);

    // GET without auth -> 401
    const resGetNoAuth = await request(app)
      .get('/api/incidents');
    assert.equal(resGetNoAuth.status, 401);

    // GET with auth -> 200
    const resGetDonor = await request(app)
      .get('/api/incidents')
      .set('Authorization', `Bearer ${donorToken}`);
    assert.equal(resGetDonor.status, 200);
  });

  await t.test('A6: Blacklisted users are rejected at login and write routes', async () => {
    const testPhone = '98' + Math.floor(10000000 + Math.random() * 89999999);
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Blacklist Test User',
        phone: testPhone,
        password: 'password123',
        role: 'DONOR'
      });
    assert.equal(regRes.status, 201);
    const blUserToken = regRes.body.token;

    // Login succeeds initially
    const loginBefore = await request(app)
      .post('/api/auth/login')
      .send({ phone: testPhone, password: 'password123' });
    assert.equal(loginBefore.status, 200);

    // Create donation listing by this donor
    const donRes = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${blUserToken}`)
      .send({
        title: 'Fresh Veg Curry and Roti',
        quantity: '25 Servings',
        address: 'Connaught Place, New Delhi',
        termsAcceptance: { version: 'v1.0', acceptedAt: new Date().toISOString() }
      });
    assert.equal(donRes.status, 201);
    const donId = donRes.body.id || donRes.body._id;

    // Report incident against this listing
    const incRes = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${ngoToken}`)
      .send({
        listingId: donId,
        description: 'Severe bacterial food contamination',
        severity: 'Severe (hospitalization required)'
      });
    assert.equal(incRes.status, 201);
    const incId = incRes.body.id || incRes.body._id;

    // Resolve as CONFIRMED by admin -> escalates and blacklists donor
    const resolveRes = await request(app)
      .patch(`/api/incidents/${incId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'CONFIRMED',
        verifiedBillAmount: 5000,
        donorAgreedToPay: false
      });
    assert.equal(resolveRes.status, 200);

    // Now login with blacklisted phone -> must return 403 Forbidden
    const loginAfter = await request(app)
      .post('/api/auth/login')
      .send({ phone: testPhone, password: 'password123' });
    assert.equal(loginAfter.status, 403);

    // Writing a new donation with the blacklisted token -> must return 403 Forbidden
    const postDonationBlocked = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${blUserToken}`)
      .send({
        title: 'Attempted Post After Ban',
        quantity: '50 Servings',
        address: 'Delhi',
        termsAcceptance: { version: 'v1.0', acceptedAt: new Date().toISOString() }
      });
    assert.equal(postDonationBlocked.status, 403);
  });
});

