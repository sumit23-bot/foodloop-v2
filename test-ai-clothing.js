// FoodLoop ClothesLoop - AI Clothing Vision Calibration Test Suite
// Step B3: Deliberately test the calibration on 3 distinct cases:
// 1. Clear photo of genuinely donatable clothing in good condition -> is_clothing: true, conf >= 60, Wearable or better
// 2. Clearly non-clothing photo (laptop) -> is_clothing: false
// 3. Photo of visibly torn/damaged clothing -> is_clothing: true, condition_grade: 'Needs Repair' or 'Not Wearable'

const sharp = require('sharp');

async function getBase64(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${url} -> ${r.status}`);
  return Buffer.from(await r.arrayBuffer()).toString('base64');
}

async function callVerifyClothing(label, base64) {
  console.log(`\n========================================`);
  console.log(`[TEST CASE] ${label}`);
  console.log(`========================================`);
  const r = await fetch('http://localhost:5000/api/ai/verify-clothing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: `data:image/jpeg;base64,${base64}` })
  });
  const data = await r.json();
  console.log('Response:', JSON.stringify(data, null, 2));
  return data;
}

async function main() {
  console.log('Starting Step B3: Clothing Vision Verification Calibration Suite...');

  // Case 1: Genuinely donatable clothing in good condition (clean jacket)
  let cleanClothingBase64;
  try {
    cleanClothingBase64 = await getBase64('https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400');
  } catch (e) {
    cleanClothingBase64 = await getBase64('https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400');
  }
  const r1 = await callVerifyClothing('1. Good Wearable Clothing (Clean Jacket)', cleanClothingBase64);

  // Case 2: Non-clothing photo (MacBook laptop)
  const laptopBase64 = await getBase64('https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400');
  const r2 = await callVerifyClothing('2. Non-Clothing Object (MacBook Laptop)', laptopBase64);

  // Case 3: Visibly torn / damaged clothing (Ripped distressed denim jeans with large tears)
  let tornClothingBase64;
  try {
    tornClothingBase64 = await getBase64('https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400');
  } catch (e) {
    tornClothingBase64 = await getBase64('https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=400');
  }
  const r3 = await callVerifyClothing('3. Visibly Torn / Damaged Clothing (Ripped Jeans)', tornClothingBase64);

  console.log('\n========================================');
  console.log('        STEP B3 CALIBRATION SUMMARY');
  console.log('========================================');

  const p1 = r1.is_clothing === true && (r1.confidence >= 60) && ['New with tags', 'Gently Used', 'Wearable'].includes(r1.condition_grade);
  const p2 = r2.is_clothing === false;
  const p3 = r3.is_clothing === true && ['Needs Repair', 'Not Wearable'].includes(r3.condition_grade);

  console.log(`Case 1 (Good Clothing):    ${p1 ? '✅ PASS' : '❌ FAIL'} (is_clothing=${r1.is_clothing}, conf=${r1.confidence}, grade="${r1.condition_grade}")`);
  console.log(`Case 2 (Laptop/Non-Cloth): ${p2 ? '✅ PASS' : '❌ FAIL'} (is_clothing=${r2.is_clothing}, conf=${r2.confidence}, reason="${r2.reason}")`);
  console.log(`Case 3 (Damaged/Torn):     ${p3 ? '✅ PASS' : '❌ FAIL'} (is_clothing=${r3.is_clothing}, conf=${r3.confidence}, grade="${r3.condition_grade}")`);

  const distinctOutcomes = (
    r1.is_clothing !== r2.is_clothing &&
    r1.condition_grade !== r3.condition_grade &&
    r3.is_clothing === true
  );

  console.log(`\nDistinct calibrated outcomes: ${distinctOutcomes ? '✅ PASS (3 visibly different, correct results)' : '❌ FAIL'}`);
}

main().catch(console.error);
