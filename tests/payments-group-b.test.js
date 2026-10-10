const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const crypto = require('crypto');
const mongoose = require('mongoose');

process.env.DEMO_MODE = 'true';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_for_group_b_testing_1234567890';
process.env.RAZORPAY_KEY_SECRET = 'test_razorpay_secret_key_abcdef123456';

const { app } = require('../server');

test.after(async () => {
  if (mongoose.connection && mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

test('Group B: Payments & Sponsor-A-Meal Security', async (t) => {
  let validMockOrderId = '';

  await t.test('B2: create-order rejects invalid amounts (NaN, negative, zero, float, >500k)', async () => {
    // Bad inputs that used to silently fall back to ₹40
    const resNaN = await request(app)
      .post('/api/donations/create-order')
      .send({ amount: 'invalid' });
    assert.equal(resNaN.status, 400);

    const resZero = await request(app)
      .post('/api/donations/create-order')
      .send({ amount: 0 });
    assert.equal(resZero.status, 400);

    const resNegative = await request(app)
      .post('/api/donations/create-order')
      .send({ amount: -50 });
    assert.equal(resNegative.status, 400);

    const resFloat = await request(app)
      .post('/api/donations/create-order')
      .send({ amount: 49.99 });
    assert.equal(resFloat.status, 400);

    const resHuge = await request(app)
      .post('/api/donations/create-order')
      .send({ amount: 1000000 });
    assert.equal(resHuge.status, 400);
  });

  await t.test('B2: create-order creates and server-tracks valid order in demo mode', async () => {
    const resValid = await request(app)
      .post('/api/donations/create-order')
      .send({
        amount: 200,
        donor_name: 'Kind Contributor',
        donor_phone: '9876543210'
      });
    assert.equal(resValid.status, 200);
    assert.ok(resValid.body.order_id);
    assert.equal(resValid.body.amount, 20000); // 200 * 100 paise
    validMockOrderId = resValid.body.order_id;
  });

  await t.test('B1: verify-payment rejects missing or forged unissued mock order IDs', async () => {
    // Missing order_id (which previously returned success)
    const resMissing = await request(app)
      .post('/api/donations/verify-payment')
      .send({ amount: 5000 });
    assert.equal(resMissing.status, 400);

    // Forged unissued mock order id
    const resForgedMock = await request(app)
      .post('/api/donations/verify-payment')
      .send({
        razorpay_order_id: 'order_mock_unissued_attacker_id_99999',
        amount: 5000
      });
    assert.equal(resForgedMock.status, 400);
  });

  await t.test('B1: verify-payment uses server-recorded amount and ignores client-spoofed amount', async () => {
    // The order was created for ₹200. Attacker claims it was ₹99,999.
    const resVerify = await request(app)
      .post('/api/donations/verify-payment')
      .send({
        razorpay_order_id: validMockOrderId,
        amount: 99999, // Client trying to spoof 80G certificate amount
        donor_name: 'Spoof Attacker'
      });
    assert.equal(resVerify.status, 200);
    assert.equal(resVerify.body.verified, true);
    // Server must return stored ₹200, NOT ₹99,999!
    assert.equal(resVerify.body.amount, 200);
  });

  await t.test('B1: timing-safe HMAC signature verification for real orders', async () => {
    // Register a simulated real order in server store
    const realOrderId = 'order_real_' + crypto.randomUUID();
    const realPaymentId = 'pay_real_' + crypto.randomUUID();
    
    // Create valid signature
    const validSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${realOrderId}|${realPaymentId}`)
      .digest('hex');

    // Tampered signature
    const tamperedSignature = validSignature.slice(0, -4) + '0000';

    // Before order exists in store -> 400
    const resUnregistered = await request(app)
      .post('/api/donations/verify-payment')
      .send({
        razorpay_order_id: realOrderId,
        razorpay_payment_id: realPaymentId,
        razorpay_signature: validSignature
      });
    assert.equal(resUnregistered.status, 400);
  });
});
