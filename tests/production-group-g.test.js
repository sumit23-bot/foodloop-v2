const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.DEMO_MODE = 'true';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_group_g_secret_key_2026';

const { app } = require('../server');

test('Fix Group G: Health Check, Contact Sanitization & Global Error Handling', async (t) => {
  const adminToken = jwt.sign(
    { id: 'usr_g_admin', name: 'Admin G', role: 'ADMIN' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  await t.test('G5: GET /api/health returns system telemetry', async () => {
    const res = await request(app).get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.ok(typeof res.body.uptime === 'number');
    assert.ok(['connected', 'memory'].includes(res.body.db_mode));
    assert.strictEqual(res.body.demo_mode, true);
    assert.ok(res.body.gemini_status);
  });

  await t.test('G6: POST /api/contact validates required fields and email', async () => {
    // Missing email
    const res1 = await request(app)
      .post('/api/contact')
      .send({ name: 'Alice', message: 'Hello FoodLoop' });
    assert.strictEqual(res1.status, 400);

    // Invalid email format
    const res2 = await request(app)
      .post('/api/contacts')
      .send({ name: 'Alice', email: 'not-an-email', message: 'Hello' });
    assert.strictEqual(res2.status, 400);

    // Empty message
    const res3 = await request(app)
      .post('/api/contact')
      .send({ name: 'Alice', email: 'alice@example.com', message: '   ' });
    assert.strictEqual(res3.status, 400);
  });

  await t.test('G6: POST /api/contact & /api/contacts accepts valid message and sanitizes lengths', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({
        name: '  Robin Hood Volunteer  ',
        email: 'VOLUNTEER@EXAMPLE.COM',
        message: 'Thank you for coordinating surplus pickup at Sector 14.',
        donor_phone: '+919876543210'
      });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.note);
    assert.strictEqual(res.body.note.name, 'Robin Hood Volunteer');
    assert.strictEqual(res.body.note.email, 'volunteer@example.com');
  });

  await t.test('G6: GET /api/contacts requires auth and retrieves notes', async () => {
    // Unauthenticated request rejected
    const unauth = await request(app).get('/api/contact');
    assert.strictEqual(unauth.status, 401);

    // Authenticated request returns notes array
    const auth = await request(app)
      .get('/api/contacts')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.strictEqual(auth.status, 200);
    assert.ok(Array.isArray(auth.body));
  });

  await t.test('G4: API catch-all returns JSON 404', async () => {
    const res = await request(app).get('/api/non-existent-route-endpoint');
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.error, 'Endpoint not found');
  });
});
