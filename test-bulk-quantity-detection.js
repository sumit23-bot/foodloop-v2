// Test: AI Bulk vs Low Quantity Detection & Persistence in FoodLoop
const fs = require('fs');

async function getBase64(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${url} -> ${r.status}`);
  return Buffer.from(await r.arrayBuffer()).toString('base64');
}

async function run() {
  console.log('================================================================');
  console.log('🤖 AI BULK SURPLUS & LOW QUANTITY DETECTION TEST SUITE');
  console.log('================================================================\n');

  // 1. Test Single Portion (Salad Bowl)
  console.log('[STEP 1] Testing Low Quantity Photo (Single Salad Bowl)...');
  const singlePortionB64 = await getBase64('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400');
  const resLow = await fetch('http://localhost:5000/api/ai/verify-food', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: `data:image/jpeg;base64,${singlePortionB64}` })
  });
  const dataLow = await resLow.json();
  console.log('Low Quantity Result:', dataLow);

  if (dataLow.is_food === true && dataLow.is_bulk === false && dataLow.quantity_level === 'LOW_QUANTITY') {
    console.log('✅ PASS: Low quantity / single portion correctly detected!\n');
  } else {
    throw new Error('❌ FAIL: Expected is_bulk: false and quantity_level: LOW_QUANTITY');
  }

  // 2. Test Bulk Catering Surplus (Buffet Trays)
  console.log('[STEP 2] Testing Bulk Surplus Photo (Buffet Chafing Trays)...');
  const bulkPortionB64 = await getBase64('https://images.unsplash.com/photo-1555244162-803834f70033?w=400');
  const resBulk = await fetch('http://localhost:5000/api/ai/verify-food', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: `data:image/jpeg;base64,${bulkPortionB64}` })
  });
  const dataBulk = await resBulk.json();
  console.log('Bulk Surplus Result:', dataBulk);

  if (dataBulk.is_food === true && dataBulk.is_bulk === true && dataBulk.quantity_level === 'BULK_SURPLUS') {
    console.log('✅ PASS: Bulk surplus quantity correctly detected!\n');
  } else {
    throw new Error('❌ FAIL: Expected is_bulk: true and quantity_level: BULK_SURPLUS');
  }

  // 3. Test Registration & Posting with Bulk Metadata
  console.log('[STEP 3] Testing Donation Posting & Storage with Bulk Attributes...');
  const donorPhone = '+9198' + Math.floor(10000000 + Math.random() * 90000000);
  const regRes = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Delhi Banquet Caterer',
      phone: donorPhone,
      password: 'Password123!',
      role: 'donor'
    })
  });
  const regData = await regRes.json();
  const token = regData.token;

  const postRes = await fetch('http://localhost:5000/api/donations', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: 'Grand Banquet Shahi Paneer & Pulao',
      food_type: 'Vegetarian',
      quantity: '40 Meals',
      expiry_hours: 4,
      address: 'Community Hall, Sector 15, Rohini, New Delhi',
      phone: donorPhone,
      termsAcceptance: {
        version: 'v1.0',
        acceptedAt: new Date().toISOString()
      },
      is_bulk: dataBulk.is_bulk,
      quantity_level: dataBulk.quantity_level,
      estimated_servings_range: dataBulk.estimated_servings_range,
      ai_portion_reason: dataBulk.reason
    })
  });
  const postData = await postRes.json();
  console.log('Donation Created:', {
    id: postData._id || postData.id,
    title: postData.title,
    is_bulk: postData.is_bulk,
    quantity_level: postData.quantity_level,
    estimated_servings_range: postData.estimated_servings_range
  });

  if (postData.is_bulk === true && postData.quantity_level === 'BULK_SURPLUS') {
    console.log('✅ PASS: Bulk metadata persisted into donation listing!\n');
  } else {
    throw new Error('❌ FAIL: Bulk metadata not persisted properly in listing.');
  }

  // 4. Verify in GET /api/donations
  console.log('[STEP 4] Fetching all donations to verify feed display...');
  const feedRes = await fetch('http://localhost:5000/api/donations');
  const feedData = await feedRes.json();
  const target = feedData.find(d => (d._id || d.id) === (postData._id || postData.id));

  if (target && target.is_bulk === true && target.quantity_level === 'BULK_SURPLUS') {
    console.log('✅ PASS: Feed correctly provides is_bulk and quantity_level to client!\n');
  } else {
    throw new Error('❌ FAIL: Target listing missing bulk fields in feed.');
  }

  console.log('================================================================');
  console.log('🎉 ALL BULK & LOW QUANTITY DETECTION TESTS PASSED (100%)');
  console.log('================================================================');
}

run().catch(err => {
  console.error('\n❌ Test Error:', err.message);
  process.exit(1);
});
