// Checkpoint A1: test 3 images against /api/ai/verify-food
// Run from project root: node test-a1.js
const sharp = require('sharp');

async function getBase64(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${url} → ${r.status}`);
  return Buffer.from(await r.arrayBuffer()).toString('base64');
}

async function callVerify(label, base64) {
  console.log(`\n=== ${label} ===`);
  const r = await fetch('http://localhost:5000/api/ai/verify-food', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: `data:image/jpeg;base64,${base64}` })
  });
  const d = await r.json();
  console.log(JSON.stringify(d, null, 2));
  return d;
}

async function main() {
  // Case 1: real food — Unsplash salad bowl
  const food = await getBase64('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400');
  const r1 = await callVerify('1. Real Food (salad bowl)', food);

  // Case 2: not food — Unsplash MacBook laptop
  const laptop = await getBase64('https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400');
  const r2 = await callVerify('2. Not Food (laptop)', laptop);

  // Case 3: ambiguous — SVG of empty white dinner plate, rendered as JPEG via sharp
  const plateSvg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="400" fill="#f5f0e8"/>
    <circle cx="200" cy="200" r="150" fill="#e0dcd2"/>
    <circle cx="200" cy="200" r="145" fill="#fafafa" stroke="#ccc" stroke-width="1"/>
    <circle cx="200" cy="200" r="100" fill="#f0eeea" stroke="#ddd" stroke-width="1"/>
    <rect x="55" y="90" width="8" height="220" rx="4" fill="#b0a8a0"/>
    <rect x="338" y="90" width="8" height="220" rx="4" fill="#b0a8a0"/>
  </svg>`;
  const plateBuf = await sharp(Buffer.from(plateSvg)).jpeg({ quality: 90 }).toBuffer();
  const r3 = await callVerify('3. Ambiguous (empty plate + cutlery, no food)', plateBuf.toString('base64'));

  console.log('\n======= CHECKPOINT A1 SUMMARY =======');
  const p1 = r1?.is_food === true && (r1?.confidence ?? 0) >= 60;
  const p2 = r2?.is_food === false;
  const p3 = r3?.is_food === false;
  console.log(`Case 1 (food verified, conf≥60): ${p1 ? '✅ PASS' : '❌ FAIL'} — is_food=${r1?.is_food}, confidence=${r1?.confidence}`);
  console.log(`Case 2 (laptop rejected):        ${p2 ? '✅ PASS' : '❌ FAIL'} — is_food=${r2?.is_food}, confidence=${r2?.confidence}`);
  console.log(`Case 3 (empty plate rejected):   ${p3 ? '✅ PASS' : '⚠️  returned is_food=true'} — is_food=${r3?.is_food}, confidence=${r3?.confidence}`);
  console.log('\nOverall:', (p1 && p2) ? '✅ Core cases pass (food + non-food)' : '❌ FAILED');
}

main().catch(console.error);
