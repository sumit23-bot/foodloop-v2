const http = require('http');

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (_) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting ClothesLoop Monetization Backend Tests...');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Register Donor User
    const donorPhone = '9811' + Math.floor(100000 + Math.random() * 900000);
    const regRes = await request('POST', '/api/auth/register', {
      name: 'Delhi Public School HR',
      phone: donorPhone,
      password: 'password123',
      role: 'DONOR',
      org_name: 'Delhi Public School R.K. Puram'
    });
    assert(regRes.status === 201 && regRes.data.token, 'Register donor user with default FREE tier');
    let donorToken = regRes.data.token;

    // 2. Check FREE tier cannot access bulk-analytics (expect 403)
    const bulkForbidden = await request('GET', '/api/clothes/bulk-analytics', null, {
      Authorization: `Bearer ${donorToken}`
    });
    assert(bulkForbidden.status === 403, 'Bulk analytics returns 403 for FREE tier');

    // 3. Upgrade tier to BULK_INSTITUTIONAL
    const upgradeRes = await request('POST', '/api/clothes/upgrade-tier', {}, {
      Authorization: `Bearer ${donorToken}`
    });
    assert(upgradeRes.status === 200 && upgradeRes.data.success && upgradeRes.data.user.clothes_account_tier === 'BULK_INSTITUTIONAL', 'Upgrade tier to BULK_INSTITUTIONAL');
    if (upgradeRes.data.token) donorToken = upgradeRes.data.token;

    // 4. Post a Bulk Clothes Donation
    const dummyImg = 'data:image/jpeg;base64,' + Buffer.from('bulk-clothes-donation-test').toString('base64');
    const bulkDonationRes = await request('POST', '/api/clothes', {
      category: 'Kids',
      size: 'Mixed (S, M, L)',
      season: 'Winter',
      garment_type: 'School Uniform Sweaters & Blazers',
      is_washed_sanitized: true,
      is_bulk_donation: true,
      bulk_note: '50 School Blazers & Sweaters from Annual Lost & Found Drive',
      ai_is_clothing: true,
      ai_confidence: 94,
      ai_condition_grade: 'Gently Used',
      ai_reason: 'Authentic school woolen garments',
      image: dummyImg,
      coords: { lat: 28.5678, lon: 77.1890 }
    }, {
      Authorization: `Bearer ${donorToken}`
    });
    assert(bulkDonationRes.status === 201 && bulkDonationRes.data.is_bulk_donation, 'Create bulk institutional donation');

    // 5. Access bulk-analytics as BULK_INSTITUTIONAL
    const bulkAnalyticsRes = await request('GET', '/api/clothes/bulk-analytics', null, {
      Authorization: `Bearer ${donorToken}`
    });
    assert(
      bulkAnalyticsRes.status === 200 &&
      bulkAnalyticsRes.data.tier === 'BULK_INSTITUTIONAL' &&
      bulkAnalyticsRes.data.stats.total_bulk_batches >= 1 &&
      bulkAnalyticsRes.data.csr_certificate &&
      bulkAnalyticsRes.data.csr_certificate.certificate_id,
      'Access bulk analytics & CSR certificate stats'
    );

    // 6. Test Non-wearable clothing routed for recycling
    const nonWearableImg = 'data:image/jpeg;base64,' + Buffer.from('shredded-rags-test').toString('base64');
    const recyclingPost = await request('POST', '/api/clothes', {
      category: 'Men',
      size: 'L',
      season: 'All-Season',
      garment_type: 'Torn Work Denims & Rags',
      is_washed_sanitized: true,
      is_bulk_donation: false,
      ai_is_clothing: true,
      ai_confidence: 88,
      ai_condition_grade: 'Not Wearable',
      ai_reason: 'Extensively torn fabric, suitable for fiber recycling only',
      image: nonWearableImg,
      coords: { lat: 28.6139, lon: 77.2090 }
    }, {
      Authorization: `Bearer ${donorToken}`
    });
    assert(recyclingPost.status === 201 && recyclingPost.data.routed_for_recycling === true, 'Not Wearable clothes routed for recycling');
    const recyclingItemId = recyclingPost.data._id || recyclingPost.data.id;

    // 7. Register Recycler User
    const recyclerPhone = '9822' + Math.floor(100000 + Math.random() * 900000);
    const recReg = await request('POST', '/api/auth/register', {
      name: 'GreenFiber Recyclers Lead',
      phone: recyclerPhone,
      password: 'password123',
      role: 'RECYCLER',
      org_name: 'GreenFiber India Private Limited'
    });
    assert(recReg.status === 201 && recReg.data.role === 'RECYCLER', 'Register user with role RECYCLER');
    const recyclerToken = recReg.data.token;

    // 8. Recycler fetches recycling batches
    const recBatches = await request('GET', '/api/clothes/recycling-batches', null, {
      Authorization: `Bearer ${recyclerToken}`
    });
    assert(recBatches.status === 200 && Array.isArray(recBatches.data) && recBatches.data.some(b => String(b._id || b.id) === String(recyclingItemId)), 'Recycler retrieves un-claimed recycling batches');

    // 9. Recycler claims batch
    const claimRec = await request('PATCH', `/api/clothes/${recyclingItemId}/claim-for-recycling`, {}, {
      Authorization: `Bearer ${recyclerToken}`
    });
    assert(claimRec.status === 200 && claimRec.data.status === 'CLAIMED' && claimRec.data.claimed_by_recycler.includes('GreenFiber'), 'Recycler claims batch for industrial shredding');

    // 10. Brand CSR Campaigns: Public GET and Protected POST
    const publicCamps = await request('GET', '/api/clothes/campaigns');
    assert(publicCamps.status === 200 && Array.isArray(publicCamps.data) && publicCamps.data.length >= 2, 'Public listing of Brand CSR campaigns');

    const newCampRes = await request('POST', '/api/clothes/campaigns', {
      brand_name: 'Raymond CSR Foundation',
      brand_logo: 'https://example.com/raymond.png',
      campaign_title: 'Raymond Warmth Shield 2026',
      description: 'Sponsoring 1000 winter blankets for Delhi-NCR night shelters.',
      target_kits: 1000,
      kit_price_inr: 500
    }, {
      Authorization: `Bearer ${donorToken}`
    });
    assert(newCampRes.status === 201 && newCampRes.data.campaign_title === 'Raymond Warmth Shield 2026', 'Create brand CSR campaign');
    const createdCampId = newCampRes.data._id || newCampRes.data.id;

    // 11. Sponsor-a-Winter-Kit: Order creation & Payment verification
    const kitOrderRes = await request('POST', '/api/clothes/sponsor-winter-kit', {
      kits_count: 2,
      campaign_id: createdCampId,
      donor_name: 'Ananya Sharma',
      donor_phone: '9811998877'
    });
    assert(kitOrderRes.status === 200 && kitOrderRes.data.order_id && kitOrderRes.data.amount === 100000, 'Create Sponsor-a-Winter-Kit order (2 kits = ₹1000 = 100000 paise)');

    const kitVerifyRes = await request('POST', '/api/clothes/sponsor-winter-kit/verify', {
      razorpay_order_id: kitOrderRes.data.order_id,
      razorpay_payment_id: 'pay_mock_' + Date.now(),
      campaign_id: createdCampId,
      kits_count: 2,
      donor_name: 'Ananya Sharma'
    });
    assert(kitVerifyRes.status === 200 && kitVerifyRes.data.verified === true && kitVerifyRes.data.kits_count === 2, 'Verify Sponsor-a-Winter-Kit payment');

    // Verify campaign funded_kits incremented
    const updatedCamps = await request('GET', '/api/clothes/campaigns');
    const targetCamp = updatedCamps.data.find(c => String(c._id || c.id) === String(createdCampId));
    assert(targetCamp && targetCamp.funded_kits === 2, 'Winter drive campaign funded_kits incremented by 2');

    // 12. Wedding & Special Wear Resale listing + Purchase + 10% charity split
    const weddingImg = 'data:image/jpeg;base64,' + Buffer.from('wedding-lehenga-test').toString('base64');
    const weddingPost = await request('POST', '/api/clothes', {
      category: 'Women',
      size: 'M',
      season: 'All-Season',
      garment_type: 'Designer Silk Bridal Lehenga',
      is_washed_sanitized: true,
      is_bulk_donation: false,
      is_resale_eligible: true,
      resale_price: 5000,
      ai_is_clothing: true,
      ai_confidence: 96,
      ai_condition_grade: 'New with tags',
      ai_reason: 'Premium bridal festive wear',
      image: weddingImg,
      coords: { lat: 28.5355, lon: 77.3910 }
    }, {
      Authorization: `Bearer ${donorToken}`
    });
    assert(
      weddingPost.status === 201 &&
      weddingPost.data.is_resale_eligible === true &&
      weddingPost.data.resale_price === 5000 &&
      weddingPost.data.resale_status === 'LISTED' &&
      weddingPost.data.charity_amount === 500,
      'List wedding wear item for resale with ₹500 (10%) charity calculation'
    );
    const weddingItemId = weddingPost.data._id || weddingPost.data.id;

    // Resale purchase order creation
    const purchaseOrder = await request('POST', `/api/clothes/${weddingItemId}/purchase`, {});
    assert(
      purchaseOrder.status === 200 &&
      purchaseOrder.data.order_id &&
      purchaseOrder.data.resale_price === 5000 &&
      purchaseOrder.data.charity_cut === 500 &&
      purchaseOrder.data.donor_cut === 4500,
      'Create wedding resale purchase order with 10% (₹500) charity and 90% (₹4500) donor cut'
    );

    // Resale purchase verification
    const purchaseVerify = await request('POST', `/api/clothes/${weddingItemId}/purchase/verify`, {
      razorpay_order_id: purchaseOrder.data.order_id,
      razorpay_payment_id: 'pay_resale_' + Date.now(),
      buyer_name: 'Simran Khurana',
      buyer_phone: '9844112233'
    });
    assert(
      purchaseVerify.status === 200 &&
      purchaseVerify.data.verified === true &&
      purchaseVerify.data.item.resale_status === 'SOLD' &&
      purchaseVerify.data.item.status === 'CLAIMED' &&
      purchaseVerify.data.charity_split.foodloop_charity_cut === 500,
      'Verify wedding resale purchase and update listing to SOLD'
    );

    // 13. Non-Regression: Baseline FoodLoop food rescue endpoints untouched
    const foodList = await request('GET', '/api/donations');
    assert(foodList.status === 200 && Array.isArray(foodList.data), 'FoodLoop food donations GET untouched and operational');

    const chatRes = await request('POST', '/api/ai/chat', { message: 'Hello FoodLoop!' });
    assert(chatRes.status === 200 && chatRes.data.reply, 'FoodLoop AI Assistant endpoint untouched and operational');

    console.log(`\n==========================================`);
    console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log(`==========================================`);
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTests();
