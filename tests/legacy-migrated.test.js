const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');

// Ensure DEMO_MODE for test environment
process.env.DEMO_MODE = 'true';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_legacy_migrated_secret_key_2026';

const { app, resolveIncidentLiability } = require('../server');

test('Legacy Migrated Suite: resolveIncidentLiability business rules', async (t) => {
  await t.test('Case 1: Donor Agrees + Mild Severity -> 100% Donor, 0% Platform, No Escalation', () => {
    const res = resolveIncidentLiability({ severity: 'Mild (no medical attention needed)' }, 10000, true);
    assert.strictEqual(res.donorOwes, 10000);
    assert.strictEqual(res.platformContribution, 0);
    assert.strictEqual(res.legalEscalation, false);
    assert.strictEqual(res.legalBasis.length, 0);
  });

  await t.test('Case 2: Donor Agrees + Life-threatening -> 80% Donor, 20% Platform, Legal Escalation', () => {
    const res = resolveIncidentLiability({ severity: 'Life-threatening (ICU / death)' }, 50000, true);
    assert.strictEqual(res.donorOwes, 40000);
    assert.strictEqual(res.platformContribution, 10000);
    assert.strictEqual(res.legalEscalation, true);
    assert.ok(res.legalBasis.includes('BNS Section 274'));
    assert.ok(res.legalBasis.includes('BNS Section 275'));
    assert.ok(res.legalBasis.includes('FSSA Section 59'));
  });

  await t.test('Case 3: Donor Refuses + Mild Severity -> 80% Donor, 20% Platform, Legal Escalation', () => {
    const res = resolveIncidentLiability({ severity: 'Mild (no medical attention needed)' }, 20000, false);
    assert.strictEqual(res.donorOwes, 16000);
    assert.strictEqual(res.platformContribution, 4000);
    assert.strictEqual(res.legalEscalation, true);
    assert.strictEqual(res.legalBasis.length, 3);
  });

  await t.test('Case 4: Donor Refuses + Life-threatening -> 80% Donor, 20% Platform, Escalated', () => {
    const res = resolveIncidentLiability({ severity: 'Life-threatening (ICU / death)' }, 100000, false);
    assert.strictEqual(res.donorOwes, 80000);
    assert.strictEqual(res.platformContribution, 20000);
    assert.strictEqual(res.legalEscalation, true);
    assert.strictEqual(res.legalBasis.length, 3);
  });

  await t.test('Case 5: Donor Agrees + Severe Hospitalization -> 80% Donor, 20% Platform, Escalated', () => {
    const res = resolveIncidentLiability({ severity: 'Severe (hospitalization required)' }, 60000, true);
    assert.strictEqual(res.donorOwes, 48000);
    assert.strictEqual(res.platformContribution, 12000);
    assert.strictEqual(res.legalEscalation, true);
  });

  await t.test('Case 6: Donor Agrees + Moderate Outpatient -> 100% Donor, 0% Platform, No Escalation', () => {
    const res = resolveIncidentLiability({ severity: 'Moderate (outpatient treatment)' }, 5000, true);
    assert.strictEqual(res.donorOwes, 5000);
    assert.strictEqual(res.platformContribution, 0);
    assert.strictEqual(res.legalEscalation, false);
  });
});

test('Legacy Migrated Suite: AI verification endpoint payload validation', async (t) => {
  await t.test('Missing imageBase64 returns 400', async () => {
    const res = await request(app)
      .post('/api/ai/verify-food')
      .send({});
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.is_food, false);
  });

  await t.test('Malformed imageBase64 returns 400', async () => {
    const res = await request(app)
      .post('/api/ai/verify-food')
      .send({ imageBase64: 'not-base64-content' });
    assert.strictEqual(res.status, 400);
  });
});

test('Legacy Migrated Suite: End-to-end incident lifecycle & blacklist regression', async (t) => {
  const donorPhone = `981${Math.floor(100000 + Math.random() * 900000)}`;
  const donorToken = jwt.sign(
    { id: 'usr_leg_donor', name: 'Legacy Donor Corp', phone: donorPhone, role: 'DONOR' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const ngoToken = jwt.sign(
    { id: 'usr_leg_ngo', name: 'Legacy NGO Worker', phone: '9876500011', role: 'NGO', organization: 'Robin Hood Army' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const adminToken = jwt.sign(
    { id: 'usr_leg_admin', name: 'FoodLoop Safety Admin', role: 'ADMIN' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  let listingId;
  let incidentId;

  await t.test('1. Reject donation without terms acceptance', async () => {
    const res = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        title: 'Surplus Lunch Boxes',
        quantity: '30 Meals',
        expiry_hours: 4,
        address: 'Test Kitchen'
      });
    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /Terms & Conditions acceptance is required/);
  });

  await t.test('2. Accept donation with valid terms acceptance and 10+ meals', async () => {
    const res = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        title: 'Regression Surplus Feast',
        quantity: '40 servings',
        expiry_hours: 5,
        address: 'Connaught Place Hub, Delhi',
        termsAcceptance: {
          version: 'v1.0',
          acceptedAt: new Date().toISOString()
        }
      });
    assert.strictEqual(res.status, 201);
    listingId = res.body._id || res.body.id;
    assert.ok(listingId);
    assert.strictEqual(res.body.termsAcceptance?.version, 'v1.0');
    assert.ok(res.body.termsAcceptance?.ip);
  });

  await t.test('3. Claim listing as verified NGO', async () => {
    const res = await request(app)
      .patch(`/api/donations/${listingId}/claim`)
      .set('Authorization', `Bearer ${ngoToken}`)
      .send({
        claimant_org: 'Robin Hood Army',
        claimant_phone: '9876500011'
      });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'CLAIMED');
  });

  await t.test('4. File food safety incident report by claimant NGO', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${ngoToken}`)
      .send({
        listingId,
        description: 'Severe stomach distress observed in distribution recipients.',
        severity: 'Severe (hospitalization required)',
        documents: ['data:image/jpeg;base64,mockdoc']
      });
    assert.strictEqual(res.status, 201);
    incidentId = res.body._id || res.body.id;
    assert.ok(incidentId);
    assert.strictEqual(res.body.status, 'REPORTED');
  });

  await t.test('5. Admin adjudication confirms incident, splits liability, and escalates', async () => {
    const res = await request(app)
      .patch(`/api/incidents/${incidentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'CONFIRMED',
        verifiedBillAmount: 60000,
        donorAgreedToPay: false
      });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'CONFIRMED');
    assert.strictEqual(res.body.donor_owes || res.body.donorOwes, 48000);
    assert.strictEqual(res.body.platform_contribution || res.body.platformContribution, 12000);
    assert.strictEqual(res.body.legal_escalation || res.body.legalEscalation, true);
  });

  await t.test('6. Blacklisted donor is blocked from creating subsequent listings', async () => {
    const res = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        title: 'Attempted Post by Blacklisted Donor',
        quantity: '25 servings',
        expiry_hours: 4,
        address: 'Blocked Address',
        termsAcceptance: { version: 'v1.0', acceptedAt: new Date().toISOString() }
      });
    assert.strictEqual(res.status, 403);
    assert.match(res.body.error, /blacklisted/i);
  });
});
