// FoodLoop v2 AI Vision Verification Automated Test Suite
// Run from project root: node test-ai-vision.js

const sharp = require('sharp');

const SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:5000/api/ai/verify-food';

async function getBase64FromUrl(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    return buf.toString('base64');
  } catch (err) {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.toString('base64');
  } finally {
    clearTimeout(id);
  }
}

async function callVerifyEndpoint(payload) {
  const res = await fetch(SERVER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runTests() {
  console.log('====================================================');
  console.log(' FOODLOOP v2 — AI VISION AUTOMATED TEST SUITE');
  console.log(' Target Endpoint: ' + SERVER_URL);
  console.log('====================================================\n');

  const results = [];

  function record(name, expected, actual, passed, details = '') {
    results.push({ name, expected, actual, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[${mark}] ${name}`);
    if (details) console.log(`       Details: ${details}`);
  }

  // --- Test Case 1: Real Food ---
  console.log('Running Test 1: Real Food Verification...');
  let foodBase64;
  try {
    const res = await fetch('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400');
    if (res.ok) {
      foodBase64 = Buffer.from(await res.arrayBuffer()).toString('base64');
    }
  } catch (e) {
    console.log('       Unsplash fetch fallback triggered:', e.message);
  }
  if (!foodBase64) {
    const fruitSvg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="400" fill="#fdfbf7"/>
      <ellipse cx="200" cy="280" rx="140" ry="60" fill="#d97706"/>
      <circle cx="160" cy="220" r="50" fill="#dc2626"/>
      <circle cx="230" cy="210" r="48" fill="#ea580c"/>
      <circle cx="200" cy="180" r="42" fill="#16a34a"/>
    </svg>`;
    const buf = await sharp(Buffer.from(fruitSvg)).jpeg().toBuffer();
    foodBase64 = buf.toString('base64');
  }
  const t1 = await callVerifyEndpoint({ imageBase64: `data:image/jpeg;base64,${foodBase64}` });
  const t1Pass = t1.status === 200 && t1.data?.is_food === true && (t1.data?.confidence ?? 0) >= 60;
  record(
    '1. Real Food (Salad Bowl)',
    '{ is_food: true, conf >= 60 }',
    `is_food=${t1.data?.is_food}, conf=${t1.data?.confidence}%`,
    t1Pass,
    t1.data?.reason || ''
  );

  // --- Test Case 2: Non-Food: Electronic Device (Laptop) ---
  console.log('\nRunning Test 2: Non-Food Electronic Device (Laptop)...');
  let laptopBase64;
  try {
    const res = await fetch('https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400');
    if (res.ok) {
      laptopBase64 = Buffer.from(await res.arrayBuffer()).toString('base64');
    }
  } catch (e) {
    console.log('       Unsplash fetch fallback triggered:', e.message);
  }
  if (!laptopBase64) {
    const laptopSvg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="400" fill="#1e293b"/>
      <rect x="70" y="80" width="260" height="170" rx="8" fill="#94a3b8"/>
      <rect x="80" y="90" width="240" height="145" fill="#0f172a"/>
      <polygon points="50,270 350,270 330,250 70,250" fill="#cbd5e1"/>
    </svg>`;
    const buf = await sharp(Buffer.from(laptopSvg)).jpeg().toBuffer();
    laptopBase64 = buf.toString('base64');
  }
  const t2 = await callVerifyEndpoint({ imageBase64: `data:image/jpeg;base64,${laptopBase64}` });
  const t2Pass = t2.status === 200 && t2.data?.is_food === false;
  record(
    '2. Non-Food: Electronics (Laptop)',
    '{ is_food: false }',
    `is_food=${t2.data?.is_food}, conf=${t2.data?.confidence}%`,
    t2Pass,
    t2.data?.reason || ''
  );

  // --- Test Case 3: Non-Food: Furniture (Chair) ---
  console.log('\nRunning Test 3: Non-Food Furniture (Chair)...');
  let chairBase64;
  try {
    const res = await fetch('https://images.unsplash.com/photo-1580481077197-09d0cb4214df?w=400');
    if (res.ok) {
      chairBase64 = Buffer.from(await res.arrayBuffer()).toString('base64');
    }
  } catch (e) {
    console.log('       Unsplash fetch fallback triggered:', e.message);
  }
  if (!chairBase64) {
    const chairSvg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="400" fill="#ffffff"/>
      <rect x="150" y="100" width="100" height="120" rx="8" fill="#78350f"/>
      <rect x="140" y="215" width="120" height="25" rx="4" fill="#92400e"/>
      <rect x="150" y="240" width="12" height="120" fill="#451a03"/>
      <rect x="238" y="240" width="12" height="120" fill="#451a03"/>
    </svg>`;
    const buf = await sharp(Buffer.from(chairSvg)).jpeg().toBuffer();
    chairBase64 = buf.toString('base64');
  }
  const t3 = await callVerifyEndpoint({ imageBase64: `data:image/jpeg;base64,${chairBase64}` });
  const t3Pass = t3.status === 200 && t3.data?.is_food === false;
  record(
    '3. Non-Food: Furniture (Chair)',
    '{ is_food: false }',
    `is_food=${t3.data?.is_food}, conf=${t3.data?.confidence}%`,
    t3Pass,
    t3.data?.reason || ''
  );

  // --- Test Case 4: Edge Case: Blank / White Square ---
  console.log('\nRunning Test 4: Edge Case (Blank White Square)...');
  const blankBuf = await sharp({
    create: {
      width: 250,
      height: 250,
      channels: 3,
      background: { r: 255, g: 255, b: 255 }
    }
  }).jpeg().toBuffer();
  const t4 = await callVerifyEndpoint({ imageBase64: `data:image/jpeg;base64,${blankBuf.toString('base64')}` });
  const t4Pass = t4.status === 200 && t4.data?.is_food === false;
  record(
    '4. Edge Case: Empty White Square',
    '{ is_food: false }',
    `is_food=${t4.data?.is_food}, conf=${t4.data?.confidence}%`,
    t4Pass,
    t4.data?.reason || ''
  );

  // --- Test Case 5: Malformed Payload ---
  console.log('\nRunning Test 5: Malformed Payload (Missing imageBase64)...');
  const t5 = await callVerifyEndpoint({});
  const t5Pass = t5.status === 400 && t5.data?.is_food === false;
  record(
    '5. Malformed Payload (Missing Image)',
    'HTTP 400, { is_food: false }',
    `HTTP ${t5.status}, is_food=${t5.data?.is_food}`,
    t5Pass,
    t5.data?.reason || 'Bad Request Handled'
  );

  // Print Summary Table
  console.log('\n========================================================================================');
  console.log('                          TEST EXECUTION SUMMARY TABLE');
  console.log('========================================================================================');
  console.log('| # | Test Case                           | Expected              | Actual                 | Result |');
  console.log('|---|-------------------------------------|-----------------------|------------------------|--------|');
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const num = (i + 1).toString().padEnd(2);
    const name = r.name.padEnd(35).slice(0, 35);
    const exp = r.expected.padEnd(21).slice(0, 21);
    const act = r.actual.padEnd(22).slice(0, 22);
    const status = r.passed ? 'PASS  ' : 'FAIL  ';
    console.log(`| ${num}| ${name} | ${exp} | ${act} | ${status} |`);
  }
  console.log('========================================================================================');

  const allPassed = results.every(r => r.passed);
  if (allPassed) {
    console.log('\n🎉 ALL 5 TEST CASES PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error('\n❌ SOME TEST CASES FAILED. Please review the table above.\n');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
