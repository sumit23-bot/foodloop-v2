const mongoose = require('mongoose');
const sharp = require('sharp');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/foodloop';

// Generate synthetic sample clothing image with burn-in banner
async function generateSampleImage(text, bgColor = '#1e293b', accentColor = '#3b82f6') {
  const width = 640;
  const height = 480;
  const safeText = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0f172a;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#grad)"/>
      <circle cx="${width/2}" cy="${height/2 - 20}" r="90" fill="${accentColor}" fill-opacity="0.25" stroke="${accentColor}" stroke-width="3"/>
      <text x="${width/2}" y="${height/2 - 10}" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle">${safeText}</text>
      <text x="${width/2}" y="${height/2 + 25}" font-family="Arial, sans-serif" font-size="16" fill="#94a3b8" text-anchor="middle">ClothesLoop Verified Garment</text>
      
      <!-- Watermark Burn-in -->
      <rect x="0" y="${height - 60}" width="${width}" height="60" fill="rgba(15, 23, 42, 0.9)"/>
      <text x="16" y="${height - 35}" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#38bdf8">🛡️ ClothesLoop Verified Live Hardware Proof</text>
      <text x="16" y="${height - 15}" font-family="Arial, sans-serif" font-size="12" fill="#cbd5e1">28.6139° N, 77.2090° E • Delhi-NCR • ${new Date().toLocaleDateString()}</text>
    </svg>
  `;

  const buf = await sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
  return 'data:image/jpeg;base64,' + buf.toString('base64');
}

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.');

  const db = mongoose.connection.db;

  // 1. Clean and reset WinterDriveCampaign collection
  console.log('Cleaning duplicate campaigns...');
  await db.collection('winterdrivecampaigns').deleteMany({});

  const sampleCampaigns = [
    {
      brand_name: 'Zara Cares / Inditex',
      brand_logo: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=100&auto=format&fit=crop&q=60',
      sponsor_user_id: 'sys_zara',
      campaign_title: 'Zara India Winter Warmth Mission 2026',
      description: 'Corporate matching drive: providing thermal-lined winter kits for families in Delhi-NCR night shelters.',
      target_kits: 500,
      funded_kits: 312,
      kit_price_inr: 500,
      status: 'ACTIVE',
      created_at: new Date()
    },
    {
      brand_name: 'FabIndia Earth CSR',
      brand_logo: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=100&auto=format&fit=crop&q=60',
      sponsor_user_id: 'sys_fabindia',
      campaign_title: 'FabIndia Handloom Winter Shield Drive',
      description: 'Sponsoring insulated artisan woolen kits for street dwellers and old-age shelter residents.',
      target_kits: 300,
      funded_kits: 195,
      kit_price_inr: 500,
      status: 'ACTIVE',
      created_at: new Date()
    },
    {
      brand_name: 'Raymond CSR Foundation',
      brand_logo: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=100&auto=format&fit=crop&q=60',
      sponsor_user_id: 'sys_raymond',
      campaign_title: 'Raymond Woolen Blanket & Shield Mission',
      description: 'Sponsoring 1,000 heavy woolen relief blankets and thermal sets for night shelters in North India.',
      target_kits: 1000,
      funded_kits: 420,
      kit_price_inr: 500,
      status: 'ACTIVE',
      created_at: new Date()
    },
    {
      brand_name: 'H&M Foundation India',
      brand_logo: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=100&auto=format&fit=crop&q=60',
      sponsor_user_id: 'sys_hm',
      campaign_title: 'H&M Conscious Winter Garment Rescue',
      description: 'Closed-loop apparel take-back program supporting emergency night-shelters across NCR.',
      target_kits: 600,
      funded_kits: 380,
      kit_price_inr: 500,
      status: 'ACTIVE',
      created_at: new Date()
    }
  ];

  await db.collection('winterdrivecampaigns').insertMany(sampleCampaigns);
  console.log(`Inserted ${sampleCampaigns.length} distinct brand campaigns.`);

  // 2. Clean up test duplicates in clothesdonations
  console.log('Cleaning duplicate test donations...');
  await db.collection('clothesdonations').deleteMany({});

  const imgCoat = await generateSampleImage('🧥 Woolen Overcoat & Muffler', '#1e3a5f', '#38bdf8');
  const imgLehenga = await generateSampleImage('✨ Bridal Silk Lehenga', '#831843', '#f472b6');
  const imgUniform = await generateSampleImage('📦 School Sweaters (Lot of 35)', '#14532d', '#4ade80');
  const imgBaby = await generateSampleImage('👶 Infant Warm Fleece Kit', '#581c87', '#c084fc');
  const imgShirts = await generateSampleImage('👔 Men\'s Formal Shirts (Pack)', '#334155', '#94a3b8');
  const imgAnarkali = await generateSampleImage('💫 Georgette Anarkali Gown', '#701a75', '#e879f9');
  const imgRags = await generateSampleImage('♻️ Shredded Denim Fabric', '#78350f', '#f59e0b');

  const diverseClothes = [
    {
      donor_id: 'donor_rohan_1',
      donor_name: 'Rohan Sharma (Manager)',
      phone: '9811122233',
      image: imgCoat,
      image_hash: 'hash_coat_01',
      coords: { lat: 28.6139, lon: 77.2090 },
      category: 'Men',
      size: 'XL',
      season: 'Winter',
      garment_type: 'Heavy Woolen Overcoat & Winter Muffler',
      is_washed_sanitized: true,
      is_bulk_donation: false,
      bulk_note: '',
      is_resale_eligible: false,
      resale_price: 0,
      resale_status: 'NOT_LISTED',
      ai_is_clothing: true,
      ai_confidence: 98,
      ai_condition_grade: 'Gently Used',
      ai_reason: 'Clean, thick insulated winter overcoat with matching muffler.',
      is_winter_priority: true,
      routed_for_recycling: false,
      status: 'OPEN',
      claimed_by_ngo: '',
      trust_score: 100,
      dispute_logs: [],
      created_at: new Date(Date.now() - 3600000 * 2)
    },
    {
      donor_id: 'donor_priya_2',
      donor_name: 'Ananya Singhania',
      phone: '9811883344',
      image: imgLehenga,
      image_hash: 'hash_lehenga_02',
      coords: { lat: 28.5355, lon: 77.3910 },
      category: 'Women',
      size: 'M',
      season: 'All-Season',
      garment_type: 'Designer Silk Bridal Lehenga & Dupatta',
      is_washed_sanitized: true,
      is_bulk_donation: false,
      bulk_note: '',
      is_resale_eligible: true,
      resale_price: 5500,
      resale_status: 'LISTED',
      charity_fee_percent: 10,
      charity_amount: 550,
      ai_is_clothing: true,
      ai_confidence: 99,
      ai_condition_grade: 'New with tags',
      ai_reason: 'Exquisite bridal wear, flawless condition with rich zari embroidery.',
      is_winter_priority: false,
      routed_for_recycling: false,
      status: 'OPEN',
      claimed_by_ngo: '',
      trust_score: 100,
      dispute_logs: [],
      created_at: new Date(Date.now() - 3600000 * 4)
    },
    {
      donor_id: 'donor_dps_3',
      donor_name: 'Delhi Public School HR & CSR',
      phone: '9811002233',
      image: imgUniform,
      image_hash: 'hash_uniform_03',
      coords: { lat: 28.5678, lon: 77.1890 },
      category: 'Kids',
      size: 'Mixed (S, M)',
      season: 'Winter',
      garment_type: 'School Uniform Sweaters & Blazers (Lot of 35)',
      is_washed_sanitized: true,
      is_bulk_donation: true,
      bulk_note: 'Annual Lost & Found student uniform collection (35 woolen items)',
      is_resale_eligible: false,
      resale_price: 0,
      resale_status: 'NOT_LISTED',
      ai_is_clothing: true,
      ai_confidence: 96,
      ai_condition_grade: 'Wearable',
      ai_reason: 'Warm navy school sweaters and blazers, clean and wearable.',
      is_winter_priority: true,
      routed_for_recycling: false,
      status: 'OPEN',
      claimed_by_ngo: '',
      trust_score: 100,
      dispute_logs: [],
      created_at: new Date(Date.now() - 3600000 * 6)
    },
    {
      donor_id: 'donor_meera_4',
      donor_name: 'Meera Kapoor',
      phone: '9877112233',
      image: imgBaby,
      image_hash: 'hash_baby_04',
      coords: { lat: 28.6280, lon: 77.2180 },
      category: 'Infant',
      size: '0-2 Yrs',
      season: 'Winter',
      garment_type: 'Infant Warm Fleece Onesies & Thermal Booties Kit',
      is_washed_sanitized: true,
      is_bulk_donation: false,
      bulk_note: '',
      is_resale_eligible: false,
      resale_price: 0,
      resale_status: 'NOT_LISTED',
      ai_is_clothing: true,
      ai_confidence: 95,
      ai_condition_grade: 'Gently Used',
      ai_reason: 'High warmth baby fleece clothing with soft lining.',
      is_winter_priority: true,
      routed_for_recycling: false,
      status: 'OPEN',
      claimed_by_ngo: '',
      trust_score: 100,
      dispute_logs: [],
      created_at: new Date(Date.now() - 3600000 * 8)
    },
    {
      donor_id: 'donor_karan_5',
      donor_name: 'Karan Mehra',
      phone: '9822334455',
      image: imgShirts,
      image_hash: 'hash_shirts_05',
      coords: { lat: 28.5800, lon: 77.2300 },
      category: 'Men',
      size: 'L',
      season: 'All-Season',
      garment_type: 'Cotton Formal Shirts & Chinos (Pack of 4)',
      is_washed_sanitized: true,
      is_bulk_donation: false,
      bulk_note: '',
      is_resale_eligible: false,
      resale_price: 0,
      resale_status: 'NOT_LISTED',
      ai_is_clothing: true,
      ai_confidence: 94,
      ai_condition_grade: 'Wearable',
      ai_reason: 'Good quality office shirts and trousers, freshly ironed.',
      is_winter_priority: false,
      routed_for_recycling: false,
      status: 'OPEN',
      claimed_by_ngo: '',
      trust_score: 100,
      dispute_logs: [],
      created_at: new Date(Date.now() - 3600000 * 10)
    },
    {
      donor_id: 'donor_radhika_6',
      donor_name: 'Radhika Oberoi',
      phone: '9899445566',
      image: imgAnarkali,
      image_hash: 'hash_anarkali_06',
      coords: { lat: 28.5200, lon: 77.2100 },
      category: 'Women',
      size: 'L',
      season: 'All-Season',
      garment_type: 'Embroidered Partywear Anarkali Gown',
      is_washed_sanitized: true,
      is_bulk_donation: false,
      bulk_note: '',
      is_resale_eligible: true,
      resale_price: 2800,
      resale_status: 'LISTED',
      charity_fee_percent: 10,
      charity_amount: 280,
      ai_is_clothing: true,
      ai_confidence: 97,
      ai_condition_grade: 'Gently Used',
      ai_reason: 'Fine festive wear with zari thread work and lining.',
      is_winter_priority: false,
      routed_for_recycling: false,
      status: 'OPEN',
      claimed_by_ngo: '',
      trust_score: 100,
      dispute_logs: [],
      created_at: new Date(Date.now() - 3600000 * 12)
    },
    {
      donor_id: 'donor_vikram_7',
      donor_name: 'Sunil Verma',
      phone: '9811556677',
      image: imgRags,
      image_hash: 'hash_rags_07',
      coords: { lat: 28.6500, lon: 77.1500 },
      category: 'Men',
      size: 'Mixed',
      season: 'All-Season',
      garment_type: 'Torn Work Denims & Frayed Rags (Fiber Lot)',
      is_washed_sanitized: true,
      is_bulk_donation: true,
      bulk_note: 'Torn denims and scrap fabric unsuitable for wearing (~15kg)',
      is_resale_eligible: false,
      resale_price: 0,
      resale_status: 'NOT_LISTED',
      ai_is_clothing: true,
      ai_confidence: 89,
      ai_condition_grade: 'Not Wearable',
      ai_reason: 'Severe tears and fraying across fabric; routed for fiber shredding.',
      is_winter_priority: false,
      routed_for_recycling: true,
      status: 'OPEN',
      claimed_by_ngo: '',
      claimed_by_recycler: '',
      trust_score: 100,
      dispute_logs: [],
      created_at: new Date(Date.now() - 3600000 * 14)
    },
    {
      donor_id: 'donor_priya_v',
      donor_name: 'Priya Varma',
      phone: '9810112233',
      image: await generateSampleImage('🧥 Quilted Puffer Jacket', '#0f766e', '#14b8a6'),
      image_hash: 'hash_more_puffer_08',
      coords: { lat: 28.5700, lon: 77.2400 },
      category: 'Women',
      size: 'S',
      season: 'Winter',
      garment_type: 'Insulated Quilted Down Jacket',
      is_washed_sanitized: true,
      is_bulk_donation: false,
      bulk_note: '',
      is_resale_eligible: false,
      resale_price: 0,
      resale_status: 'NOT_LISTED',
      ai_is_clothing: true,
      ai_confidence: 96,
      ai_condition_grade: 'Gently Used',
      ai_reason: 'Windproof thermal jacket, perfect condition for winter relief.',
      is_winter_priority: true,
      routed_for_recycling: false,
      status: 'OPEN',
      claimed_by_ngo: '',
      trust_score: 100,
      dispute_logs: [],
      created_at: new Date(Date.now() - 3600000 * 16)
    },
    {
      donor_id: 'donor_amrit_s',
      donor_name: 'Amrit Singh',
      phone: '9876543210',
      image: await generateSampleImage('🧤 Winter Thermal Set & Beanie', '#1e3a8a', '#60a5fa'),
      image_hash: 'hash_more_thermal_09',
      coords: { lat: 28.6300, lon: 77.2200 },
      category: 'Men',
      size: 'M',
      season: 'Winter',
      garment_type: 'Merino Wool Thermal Inners & Beanie Cap',
      is_washed_sanitized: true,
      is_bulk_donation: false,
      bulk_note: '',
      is_resale_eligible: false,
      resale_price: 0,
      resale_status: 'NOT_LISTED',
      ai_is_clothing: true,
      ai_confidence: 98,
      ai_condition_grade: 'New with tags',
      ai_reason: 'Unused thermal base layers with fleece cap.',
      is_winter_priority: true,
      routed_for_recycling: false,
      status: 'OPEN',
      claimed_by_ngo: '',
      trust_score: 100,
      dispute_logs: [],
      created_at: new Date(Date.now() - 3600000 * 18)
    },
    {
      donor_id: 'donor_neha_g',
      donor_name: 'Neha Gupta',
      phone: '9891234567',
      image: await generateSampleImage('👗 Velvet Reception Sherwani', '#4c0519', '#fb7185'),
      image_hash: 'hash_more_sherwani_10',
      coords: { lat: 28.5400, lon: 77.2600 },
      category: 'Men',
      size: 'L',
      season: 'All-Season',
      garment_type: 'Royal Velvet Reception Sherwani & Stole',
      is_washed_sanitized: true,
      is_bulk_donation: false,
      bulk_note: '',
      is_resale_eligible: true,
      resale_price: 4200,
      resale_status: 'LISTED',
      charity_fee_percent: 10,
      charity_amount: 420,
      ai_is_clothing: true,
      ai_confidence: 99,
      ai_condition_grade: 'Gently Used',
      ai_reason: 'Premium luxury wedding wear in pristine state.',
      is_winter_priority: false,
      routed_for_recycling: false,
      status: 'OPEN',
      claimed_by_ngo: '',
      trust_score: 100,
      dispute_logs: [],
      created_at: new Date(Date.now() - 3600000 * 20)
    },
    {
      donor_id: 'donor_aarav_k',
      donor_name: 'Dr. Aarav Kapoor',
      phone: '9818889900',
      image: await generateSampleImage('🧒 Kids Hoodies (Lot of 5)', '#312e81', '#a5b4fc'),
      image_hash: 'hash_more_hoodies_11',
      coords: { lat: 28.5900, lon: 77.2000 },
      category: 'Kids',
      size: 'M',
      season: 'Winter',
      garment_type: 'Cotton Fleece Hooded Sweatshirts (Pack of 5)',
      is_washed_sanitized: true,
      is_bulk_donation: true,
      bulk_note: 'Clean cotton fleece hoodies for boys/girls aged 8-12',
      is_resale_eligible: false,
      resale_price: 0,
      resale_status: 'NOT_LISTED',
      ai_is_clothing: true,
      ai_confidence: 95,
      ai_condition_grade: 'Gently Used',
      ai_reason: 'Thick cozy children hoodies with zippers in great shape.',
      is_winter_priority: true,
      routed_for_recycling: false,
      status: 'OPEN',
      claimed_by_ngo: '',
      trust_score: 100,
      dispute_logs: [],
      created_at: new Date(Date.now() - 3600000 * 22)
    },
    {
      donor_id: 'donor_simran_b',
      donor_name: 'Simran Bajaj',
      phone: '9871239871',
      image: await generateSampleImage('🧣 Kashmiri Pashmina Shawl', '#4a044e', '#f0abfc'),
      image_hash: 'hash_more_shawl_12',
      coords: { lat: 28.6100, lon: 77.2500 },
      category: 'Women',
      size: 'Free Size',
      season: 'Winter',
      garment_type: 'Authentic Kashmiri Hand-Woven Pashmina Shawl',
      is_washed_sanitized: true,
      is_bulk_donation: false,
      bulk_note: '',
      is_resale_eligible: true,
      resale_price: 3200,
      resale_status: 'LISTED',
      charity_fee_percent: 10,
      charity_amount: 320,
      ai_is_clothing: true,
      ai_confidence: 97,
      ai_condition_grade: 'New with tags',
      ai_reason: 'High density warm wool with delicate embroidery.',
      is_winter_priority: true,
      routed_for_recycling: false,
      status: 'OPEN',
      claimed_by_ngo: '',
      trust_score: 100,
      dispute_logs: [],
      created_at: new Date(Date.now() - 3600000 * 24)
    },
    {
      donor_id: 'donor_recycled_2',
      donor_name: 'Kabir Textiles',
      phone: '9819998877',
      image: await generateSampleImage('♻️ Cotton Cutting Offcuts (Lot)', '#3f3f46', '#a1a1aa'),
      image_hash: 'hash_more_recycle_13',
      coords: { lat: 28.6600, lon: 77.1200 },
      category: 'Men',
      size: 'Mixed',
      season: 'All-Season',
      garment_type: 'Factory Cotton Cut pieces & Worn Knitwear',
      is_washed_sanitized: true,
      is_bulk_donation: true,
      bulk_note: 'Clean factory cutting scrap and damaged knit wear (20kg)',
      is_resale_eligible: false,
      resale_price: 0,
      resale_status: 'NOT_LISTED',
      ai_is_clothing: true,
      ai_confidence: 91,
      ai_condition_grade: 'Not Wearable',
      ai_reason: 'Unusable cutting scrap; suitable for industrial yarn spinning.',
      is_winter_priority: false,
      routed_for_recycling: true,
      status: 'OPEN',
      claimed_by_ngo: '',
      claimed_by_recycler: '',
      trust_score: 100,
      dispute_logs: [],
      created_at: new Date(Date.now() - 3600000 * 26)
    }
  ];

  await db.collection('clothesdonations').insertMany(diverseClothes);
  console.log(`Inserted ${diverseClothes.length} distinct, authentic clothing listings.`);

  console.log('Seeding complete!');
  process.exit(0);
}

run().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
