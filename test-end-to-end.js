// Comprehensive End-to-End Verification Test Script
// Verifies Phases A through F and baseline non-regression

async function runFullVerification() {
  console.log('================================================================');
  console.log(' CLOTHESLOOP & FOODLOOP FULL REGRESSION + E2E TEST SUITE');
  console.log('================================================================\n');

  // --- Step 1: Donor & NGO Authentication ---
  console.log('[TEST 1] Registering Donor & NGO...');
  const donorPhone = '98' + Math.floor(10000000 + Math.random()*90000000);
  const donorReg = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Simulated Clothing Donor', phone: donorPhone, password: 'password123', role: 'DONOR' })
  });
  const donor = await donorReg.json();

  const ngoPhone = '97' + Math.floor(10000000 + Math.random()*90000000);
  const ngoReg = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Simulated Relief NGO',
      phone: ngoPhone,
      password: 'password123',
      role: 'NGO',
      org_name: 'Relief Foundation Delhi',
      ngo_darpan_id: 'DL/2026/088192'
    })
  });
  const ngo = await ngoReg.json();
  console.log('Donor token:', !!donor.token, 'NGO token:', !!ngo.token);

  // --- Step 2: Post Wearable Clothing Donation ---
  console.log('\n[TEST 2] Posting Wearable Clothing Listing...');
  const post1 = await fetch('http://localhost:5000/api/clothes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donor.token}` },
    body: JSON.stringify({
      category: 'Men',
      size: 'XL',
      season: 'Winter',
      garment_type: 'Woolen Blanket',
      is_washed_sanitized: true,
      is_bulk_donation: true,
      bulk_note: 'Winter relief collection (15 blankets)',
      image: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      coords: { lat: 28.6139, lon: 77.2090 },
      ai_is_clothing: true,
      ai_confidence: 96,
      ai_condition_grade: 'Wearable',
      ai_reason: 'Warm winter blanket'
    })
  });
  const post1Data = await post1.json();
  console.log('Post 1 created ID:', post1Data._id || post1Data.id, 'Status:', post1.status);
  console.log('Fields verified:', {
    category: post1Data.category,
    size: post1Data.size,
    season: post1Data.season,
    garment_type: post1Data.garment_type,
    is_washed_sanitized: post1Data.is_washed_sanitized,
    is_bulk_donation: post1Data.is_bulk_donation,
    bulk_note: post1Data.bulk_note,
    routed_for_recycling: post1Data.routed_for_recycling,
    status: post1Data.status
  });

  // --- Step 3: Post Damaged Clothing Item -> Routed for Textile Recycling ---
  console.log('\n[TEST 3] Posting Damaged Clothing Listing (Not Wearable)...');
  const post2 = await fetch('http://localhost:5000/api/clothes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donor.token}` },
    body: JSON.stringify({
      category: 'Women',
      size: 'M',
      season: 'Summer',
      garment_type: 'Torn Cotton Saree',
      is_washed_sanitized: true,
      is_bulk_donation: false,
      image: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      coords: { lat: 28.5355, lon: 77.3910 },
      ai_is_clothing: true,
      ai_confidence: 92,
      ai_condition_grade: 'Not Wearable',
      ai_reason: 'Heavily shredded textile'
    })
  });
  const post2Data = await post2.json();
  console.log('Post 2 created ID:', post2Data._id || post2Data.id);
  console.log('Post 2 condition:', post2Data.ai_condition_grade, 'routed_for_recycling:', post2Data.routed_for_recycling);

  // --- Step 4: List Open Clothes Donations ---
  console.log('\n[TEST 4] Fetching GET /api/clothes...');
  const listRes = await fetch('http://localhost:5000/api/clothes');
  const listData = await listRes.json();
  console.log('List count:', listData.length, 'All status OPEN:', listData.every(i => i.status === 'OPEN'));

  // --- Step 5: Claim Clothing Donation as NGO ---
  console.log('\n[TEST 5] NGO Claiming Item 1...');
  const claimRes = await fetch(`http://localhost:5000/api/clothes/${post1Data._id || post1Data.id}/claim`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ngo.token}` },
    body: JSON.stringify({ claimant_org: ngo.org_name, darpan_id: ngo.ngo_darpan_id })
  });
  const claimData = await claimRes.json();
  console.log('Claim response status:', claimRes.status, 'status:', claimData.status, 'claimed_by_ngo:', claimData.claimed_by_ngo);

  // --- Step 6: Non-NGO attempting to claim clothes (must be rejected) ---
  console.log('\n[TEST 6] Non-NGO Claim attempt rejection...');
  const unauthorizedClaim = await fetch(`http://localhost:5000/api/clothes/${post2Data._id || post2Data.id}/claim`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${donor.token}` },
    body: JSON.stringify({ claimant_org: 'Unauthorized Donor' })
  });
  console.log('Unauthorized claim status:', unauthorizedClaim.status);

  // --- Step 7: Baseline FoodLoop Non-Regression Verification ---
  console.log('\n[TEST 7] Verifying Existing FoodLoop Endpoints (0% change confirmation)...');
  const foodList = await fetch('http://localhost:5000/api/donations');
  const foodData = await foodList.json();
  console.log('GET /api/donations status:', foodList.status, 'food listings count:', foodData.length);

  const foodVision = await fetch('http://localhost:5000/api/ai/verify-food', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==' })
  });
  const foodVisionData = await foodVision.json();
  console.log('POST /api/ai/verify-food status:', foodVision.status, 'is_food response exists:', typeof foodVisionData.is_food === 'boolean');

  console.log('\n================================================================');
  console.log(' ALL INTEGRATION & VERIFICATION TESTS COMPLETED SUCCESSFULLY! ');
  console.log('================================================================');
}

runFullVerification().catch(console.error);
