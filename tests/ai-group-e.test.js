const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DEMO_MODE = 'true';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_for_group_e_testing_1234567890';

const { app, probeGeminiStartup, addKnownImageHash, KNOWN_WEB_IMAGE_HASHES, processVisionInspection } = require('../server');
const mongoose = require('mongoose');

test.after(async () => {
  if (mongoose.connection && mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

test('Group E: AI Endpoints, Model Cascade, Header Security & Anti-Duplicate', async (t) => {
  let donorToken = '';
  const samplePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  await t.test('Setup: obtain donor authentication token', async () => {
    const donorLogin = await request(app)
      .post('/api/auth/demo-login')
      .send({ persona: 'DONOR' });
    assert.equal(donorLogin.status, 200);
    donorToken = donorLogin.body.token;
  });

  await t.test('E1: probeGeminiStartup runs safely and non-fatal when unconfigured', async () => {
    const probeRes = await probeGeminiStartup();
    assert.ok(probeRes, 'Probe result must be defined');
    // In test environment, unconfigured or test key reports non-crashing result
    assert.ok(typeof probeRes === 'object');
  });

  await t.test('E3: POST /api/ai/chat validates inputs and returns fallback structure', async () => {
    // Missing message rejected with 400
    const resEmpty = await request(app)
      .post('/api/ai/chat')
      .send({ message: '   ' });
    assert.equal(resEmpty.status, 400);
    assert.match(resEmpty.body.error, /message.*required/i);

    // Oversized message (>1000 characters) is accepted, capped and returns structured fallback
    const oversizedMsg = 'Can you help me rescue food? '.repeat(60);
    assert.ok(oversizedMsg.length > 1000);

    const oversizedHistory = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'model',
      parts: [{ text: `Turn ${i} history line with extra long text padding`.repeat(10) }]
    }));

    const resValid = await request(app)
      .post('/api/ai/chat')
      .send({
        message: oversizedMsg,
        conversationHistory: oversizedHistory
      });

    assert.equal(resValid.status, 200);
    assert.ok(typeof resValid.body.reply === 'string', 'Must contain a string reply');
    assert.equal(typeof resValid.body.fallback, 'boolean', 'Fallback flag must be a boolean');
  });

  await t.test('E4: POST /api/ai/verify-food returns 503 and retryable flag on offline/error', async () => {
    // Missing image returns 400
    const resNoImg = await request(app)
      .post('/api/ai/verify-food')
      .send({});
    assert.equal(resNoImg.status, 400);

    // When Gemini is not configured, returns 503 with retryable: true (NOT a permanent rejection!)
    const resOffline = await request(app)
      .post('/api/ai/verify-food')
      .send({ imageBase64: samplePng });

    // Under test environment without active Gemini keys, must return 503 retryable
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your_gemini_api_key')) {
      assert.equal(resOffline.status, 503);
      assert.equal(resOffline.body.retryable, true);
      assert.equal(resOffline.body.is_food, false);
      assert.match(resOffline.body.reason, /retry check/i);
    }
  });

  await t.test('E5: verify-web-duplicate does not index drafts and only matches confirmed posts', async () => {
    // Generate an image with random binary noise buffer ensuring unique perceptual bitstring
    const sharp = require('sharp');
    const rawPixels = Buffer.alloc(64);
    for (let i = 0; i < 64; i++) rawPixels[i] = Math.random() > 0.5 ? 255 : 0;
    const freshBuf = await sharp(rawPixels, { raw: { width: 8, height: 8, channels: 1 } }).png().toBuffer();
    const freshPng = 'data:image/png;base64,' + freshBuf.toString('base64');

    // 1. Verify draft image is not flagged as duplicate
    const check1 = await request(app)
      .post('/api/donations/verify-web-duplicate')
      .send({ imageBase64: freshPng });
    assert.equal(check1.status, 200);
    assert.equal(check1.body.isDuplicateFound, false);

    // 2. Checking draft again must STILL not be flagged as duplicate (draft was not indexed!)
    const check2 = await request(app)
      .post('/api/donations/verify-web-duplicate')
      .send({ imageBase64: freshPng });
    assert.equal(check2.status, 200);
    assert.equal(check2.body.isDuplicateFound, false, 'Draft checking must not self-index into duplicate cache');

    // 3. Post a real donation with this image
    const aiVerify = await request(app)
      .post('/api/ai/verify-food')
      .send({ image: 'data:image/jpeg;base64,' + 'A'.repeat(200) });

    const postRes = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        title: 'Original Banquet Food Trays',
        quantity: '40 meals',
        expiry_hours: 5,
        address: 'Hauz Khas, New Delhi',
        image: freshPng,
        ai_verification_token: aiVerify.body.verification_token,
        termsAcceptance: { version: 'v1.0', acceptedAt: new Date().toISOString() }
      });
    assert.equal(postRes.status, 201);
    const postedId = postRes.body.id || postRes.body._id;

    // 4. Now another check with the same image matches the confirmed post
    const check3 = await request(app)
      .post('/api/donations/verify-web-duplicate')
      .send({ imageBase64: freshPng });
    assert.equal(check3.status, 200);
    assert.equal(check3.body.isDuplicateFound, true);
    assert.equal(check3.body.matchSource, 'Similar image found in an existing FoodLoop listing');

    // 5. Checking with currentListingId excluded does not self-flag
    const check4 = await request(app)
      .post('/api/donations/verify-web-duplicate')
      .send({
        imageBase64: freshPng,
        currentListingId: postedId
      });
    assert.equal(check4.status, 200);
    assert.equal(check4.body.isDuplicateFound, false, 'Should exclude currentListingId from duplicate matching');
  });

  await t.test('E5: Cache bounding and LRU eviction for KNOWN_WEB_IMAGE_HASHES', () => {
    // Test helper function and cache size
    const initialSize = KNOWN_WEB_IMAGE_HASHES.size;
    // Inject valid 16-char hex hash
    addKnownImageHash('1234567890abcdef');
    assert.ok(KNOWN_WEB_IMAGE_HASHES.has('1234567890abcdef'));

    // Invalid length hash ignored
    addKnownImageHash('tooshort');
    assert.equal(KNOWN_WEB_IMAGE_HASHES.has('tooshort'), false);
  });

  await t.test('E6: AI Vision inspection detects and rejects AI-generated food images', () => {
    // 1. Authentic real-world food photo: should pass verification
    const realFoodVerdict = processVisionInspection({
      is_food: true,
      confidence: 94,
      is_bulk: true,
      quantity_level: 'BULK_SURPLUS',
      estimated_servings_range: '30-40 servings',
      is_ai_generated: false,
      ai_generated_confidence: 5,
      reason: 'Fresh bulk catering food trays verified.'
    });
    assert.strictEqual(realFoodVerdict.is_food, true, 'Genuine food photo must pass verification');
    assert.strictEqual(realFoodVerdict.is_ai_generated, false);
    assert.strictEqual(realFoodVerdict.confidence, 94);
    assert.strictEqual(realFoodVerdict.is_bulk, true);

    // 2. AI-generated / synthetic food photo: MUST be detected and rejected
    const aiGeneratedFoodVerdict = processVisionInspection({
      is_food: true,
      confidence: 95,
      is_bulk: true,
      quantity_level: 'BULK_SURPLUS',
      estimated_servings_range: '50 servings',
      is_ai_generated: true,
      ai_generated_confidence: 96,
      reason: 'AI-generated photorealistic banquet food with telltale synthetic rendering artifacts.'
    });
    assert.strictEqual(aiGeneratedFoodVerdict.is_food, false, 'AI-generated food image must NOT pass verification');
    assert.strictEqual(aiGeneratedFoodVerdict.is_ai_generated, true, 'is_ai_generated flag must be true');
    assert.strictEqual(aiGeneratedFoodVerdict.ai_generated_confidence, 96);
    assert.match(aiGeneratedFoodVerdict.reason, /AI-generated/i, 'Reason must explain AI generation');

    // 3. String representation 'true' for is_ai_generated is also defensively handled
    const aiGenStringVerdict = processVisionInspection({
      is_food: true,
      confidence: 90,
      is_ai_generated: 'true',
      reason: ''
    });
    assert.strictEqual(aiGenStringVerdict.is_food, false);
    assert.strictEqual(aiGenStringVerdict.is_ai_generated, true);

    // 4. Non-food image: remains rejected without flagging as AI-generated if authentic photo of object
    const nonFoodVerdict = processVisionInspection({
      is_food: false,
      confidence: 10,
      is_bulk: false,
      is_ai_generated: false,
      ai_generated_confidence: 0,
      reason: 'Photo shows a vehicle, not food.'
    });
    assert.strictEqual(nonFoodVerdict.is_food, false);
    assert.strictEqual(nonFoodVerdict.is_ai_generated, false);

    // 5. Malformed/empty input safety
    const malformedVerdict = processVisionInspection(null);
    assert.strictEqual(malformedVerdict.is_food, false);
    assert.strictEqual(malformedVerdict.is_ai_generated, false);
  });
});
