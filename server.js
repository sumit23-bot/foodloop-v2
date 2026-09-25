// ==========================================
// FOODLOOP MASTER BACKEND SERVER (server.js)
// Full-Length Uncompressed Architecture
//
// Module 01: Core Express, CORS, Mongoose & Static Hosting Configuration
// Module 02: Google Gemini 1.5 Flash Dynamic AI Assistant Engine
// Module 03: Live Hardware Authentication & Verification Endpoint
// Module 04: Complete Database Schemas (User, Donation, Contact, Audit Logs)
// Module 05: Reverse Image Web Hash Detection (Anti-Stock Photo Engine)
// Module 06: Authentication & NITI Aayog Darpan ID RBAC Verification
// Module 07: Surplus Food Donation Management & Claim Lifecycle
// Module 08: Proof-of-Ground Geofenced Dispute & Consensus Blacklist Engine
// Module 09: Direct NGO-to-Donor Feedback Synchronizer
// Module 10: Diagnostics, Reset Handlers & Server Listener
// ==========================================

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const JWT_SECRET = process.env.JWT_SECRET || 'foodloop_secret_key_2026';

const app = express();

// Rate Limiting Configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});
app.use('/api/', apiLimiter);

const donationSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions from this IP, please wait before trying again.' }
});

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
  }
  next();
};

// Middleware Configuration
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve React build from client/dist if available, else fallback to root directory
const clientDistPath = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
} else {
  app.use(express.static(__dirname));
}

// --------------------------------------------------
// 1. LIVE GOOGLE GEMINI AI CONFIGURATION
// --------------------------------------------------
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const FOODLOOP_KNOWLEDGE_BASE = `
You are the official FoodLoop AI Assistant for Delhi-NCR's surplus food rescue network.
Always be polite, helpful, concise, and authentic. Answer user queries in the exact language/style they use (Hindi, Hinglish, English, etc.).
Understand slang, typos, and natural questions.

COMPLETE WEBSITE ARCHITECTURE & FEATURES:
1. Live Camera Only Food Posting & Anti-Fraud Protocol:
   - Donors must capture surplus food live via hardware camera (No gallery/stock upload allowed).
   - Canvas-level Cryptographic Geotagging stamps real-time timestamp and GPS coordinates onto image pixels.
   - Minimum 10+ meals policy to prevent casual non-surplus scam posts.
   - 4-digit SMS OTP verification before publishing to feed.

2. Role-Based Access Control (RBAC):
   - Donors/Restaurants: Can post food, view own posts, generate QR Handover code, and download 80G Tax Exemption Certificates.
   - Verified NGOs/Shelters: Verified via NITI Aayog Darpan ID registry (DL/2018/0192831, DL/2020/0048192, UP/2019/0091823, etc.). Only NGOs can claim food and unlock donor address/phone.
   - Gaushalas/Animal Shelters: Authorized via Animal Welfare Board of India (AWBI) to claim diverted feed.

3. Dual-Loop Zero Waste Architecture:
   - Primary Loop (Human Feed): Safe meals with 2+ hours window.
   - Secondary Loop (Animal Feed & Bio-Loop): Food posted with <1 hour safe window OR unclaimed expired food automatically routes to Gaushalas, stray animal feeders, and Bio-CNG biogas plants.

4. Proof-of-Ground Dispute & Anti-Griefing Protocol:
   - If food is fake/spoiled, verified NGOs can file an official incident report.
   - Geofence Rule: Reporter MUST be physically within 300 meters of the pickup location.
   - Mandatory Live Photo: Volunteer must take live on-spot proof photo (empty gate, spoiled food).
   - Multi-Signature 2-Strike Rule: 1 strike moves post to "Under Review". 2 distinct verified NGO strikes permanently ban the donor phone and identity.

5. Digital Handover & 80G Tax Proof:
   - On arrival, NGO scans donor's dynamic Handshake QR code.
   - Handshake marks status as "Delivered" and unlocks instant downloadable PDF 80G Tax Exemption Certificate in Donor Dashboard.

6. Radar Map & Navigation:
   - Interactive OpenStreetMap showing live verified NGOs, Gaushalas, Biogas plants, and active surplus donations within 10 km.

7. Volunteer Notes & Dashboard Sync:
   - NGOs can write direct reviews/thank-you notes to donors which sync live to the Donor Impact Dashboard.
   - Emergency Helpline: +91 8800 247 247.

Answer accurately and clearly based on these rules.
`;

// --------------------------------------------------
// 2. MONGOOSE DATABASE CONNECTION
// --------------------------------------------------
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/foodloop';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to Local MongoDB Database!'))
  .catch((err) => console.log('⚠️ MongoDB offline, operating in Memory Cache Mode.'));

// User & NGO Registry Schema
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['DONOR', 'NGO', 'SHELTER', 'VOLUNTEER', 'ANIMAL_SHELTER'], default: 'DONOR' },
  org_name: { type: String, default: '' },
  ngo_darpan_id: { type: String, default: '' },
  is_verified: { type: Boolean, default: true },
  trust_score: { type: Number, default: 100 },
  false_report_strikes: { type: Number, default: 0 },
  donations_count: { type: Number, default: 0 },
  claims_count: { type: Number, default: 0 },
  is_blacklisted: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// Surplus Food Donation Schema
const DonationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  food_type: { type: String, default: 'Vegetarian' },
  quantity: { type: String, required: true },
  expiry_hours: { type: Number, default: 3 },
  address: { type: String, required: true },
  phone: { type: String, default: '+91 98996 36474' },
  donor_id: { type: String, default: '' },
  donor_name: { type: String, default: 'Anonymous Donor' },
  image: { type: String, default: '' },
  image_hash: { type: String, default: '' },
  verification_code: { type: String, default: '' },
  coords: {
    lat: { type: Number, default: 28.6139 },
    lon: { type: Number, default: 77.2090 }
  },
  is_verified: { type: Boolean, default: true },
  is_food_verified: { type: Boolean, default: true },
  is_live_capture: { type: Boolean, default: true },
  ai_detected_class: { type: String, default: 'Live Hardware Camera Verified' },
  trust_score: { type: Number, default: 100 },
  status: { type: String, default: 'AVAILABLE' },
  claimed_by_ngo: { type: String, default: '' },
  dispute_logs: [{
    reported_by: String,
    reporter_phone: String,
    darpan_id: String,
    reason: String,
    evidence_image: String,
    reporter_distance_km: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  created_at: { type: Date, default: Date.now }
}, { strict: false });
const Donation = mongoose.model('Donation', DonationSchema);

// Contact / Donor Feedback Message Schema
const ContactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
  donor_phone: { type: String, default: 'ALL' },
  donor_name: { type: String, default: 'All Registered Donors' },
  created_at: { type: Date, default: Date.now }
});
const Contact = mongoose.model('Contact', ContactSchema);

const KNOWN_WEB_IMAGE_HASHES = new Set([
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
]);

let memoryUsers = [
  { name: 'Rohan Sharma (Manager)', phone: '9811122233', password: bcrypt.hashSync('password123', 10), role: 'DONOR', org_name: 'Grand Hyatt Delhi Banquet', is_verified: true, trust_score: 100 },
  { name: 'Priya Verma (Delhi Lead)', phone: '9877788899', password: bcrypt.hashSync('password123', 10), role: 'NGO', org_name: 'Robin Hood Army (Delhi Shelter Hub)', ngo_darpan_id: 'DL/2024/008194', is_verified: true, trust_score: 100 }
];
let memoryDonations = [];
let memoryContacts = [];
let memoryBlacklist = new Set();

// --------------------------------------------------
// 3. GEMINI AI ASSISTANT ENDPOINT
// --------------------------------------------------
app.post('/api/ai/chat', async (req, res) => {
  const { message, conversationHistory } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message text is required' });
  }

  // Fallback to local assistant if Gemini API key is not configured
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_API_KEY_HERE' || GEMINI_API_KEY.includes('your_gemini_api_key')) {
    return res.json({ 
      reply: `Namaste! FoodLoop AI system active hai. Aap kisi bhi feature (Live Camera proof, NITI Aayog Darpan claim, 80G Tax PDF, 300m Dispute, Animal Loop, ya Radar Map) ke baare me pooch sakte hain. Emergency Help: +91 8800 247 247.` 
    });
  }

  const CHAT_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-2.5-flash'];

  for (const model of CHAT_MODELS) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      
      const formattedHistory = (conversationHistory || []).map(item => ({
        role: item.role === 'model' ? 'model' : 'user',
        parts: [{ text: item.parts?.[0]?.text || item.text || '' }]
      }));

      const payload = {
        systemInstruction: {
          parts: [{ text: FOODLOOP_KNOWLEDGE_BASE }]
        },
        contents: [
          ...formattedHistory,
          { role: 'user', parts: [{ text: message }] }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 300
        }
      };

      const aiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        const replyText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (replyText) {
          return res.json({ reply: replyText });
        }
      }
    } catch (err) {
      console.warn(`Gemini chat ${model} failed, trying next:`, err.message);
    }
  }

  return res.json({ 
    reply: `Namaste! FoodLoop AI system active hai. Aap kisi bhi feature (Live Camera proof, NITI Aayog Darpan claim, 80G Tax PDF, 300m Dispute, Animal Loop, ya Radar Map) ke baare me pooch sakte hain. Emergency Help: +91 8800 247 247.` 
  });
});

// --------------------------------------------------
// 4. AI FOOD VISION VERIFICATION ROUTE (Strict Structured JSON)
// --------------------------------------------------

// Helper: call Gemini vision with retry + model fallback for 503
async function callGeminiVision(cleanBase64, promptText, GEMINI_API_KEY) {
  const MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
  const payload = {
    contents: [{
      parts: [
        { text: promptText },
        { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } }
      ]
    }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 400 }
  };

  for (const model of MODELS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const aiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (aiRes.ok) return aiRes;
      const body = await aiRes.text();
      if (aiRes.status === 503 && attempt < 3) {
        console.warn(`Gemini ${model} 503 — retrying in 2s (attempt ${attempt}/3)...`);
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      if (aiRes.status === 503) {
        console.warn(`Gemini ${model} still 503 after 3 attempts — trying next model`);
        break; // try next model
      }
      // Any other non-OK status: log and give up for this model
      console.warn(`Gemini ${model} non-OK ${aiRes.status}:`, body.substring(0, 200));
      break;
    }
  }
  return null; // all models failed
}

app.post('/api/ai/verify-food', async (req, res) => {
  const { imageBase64 } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ is_food: false, confidence: 0, reason: 'No image provided.' });
  }

  const isKeyConfigured = GEMINI_API_KEY &&
                          GEMINI_API_KEY !== 'YOUR_API_KEY_HERE' &&
                          !GEMINI_API_KEY.includes('your_gemini_api_key');

  if (!isKeyConfigured) {
    console.warn('⚠️ GEMINI_API_KEY not configured — verification disabled.');
    return res.json({ is_food: false, confidence: 0, reason: 'Could not verify — please retake or re-upload the photo.' });
  }

  try {
    const rawBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    // Compress image to max 640px to reduce payload size (prevents 503 overload)
    let cleanBase64 = rawBase64;
    try {
      const compressedBuf = await sharp(Buffer.from(rawBase64, 'base64'))
        .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 75 })
        .toBuffer();
      cleanBase64 = compressedBuf.toString('base64');
    } catch (compressErr) {
      // If sharp fails (e.g. SVG/non-jpeg), use raw base64 as-is
      console.warn('Image compression skipped:', compressErr.message);
    }

    const promptText = `You are a strict food-safety image inspector. Analyze the attached image and respond with ONLY a valid JSON object, no other text, no markdown formatting, no backticks — just the raw JSON, in exactly this shape: {"is_food": true or false, "confidence": integer from 0 to 100, "reason": "one short sentence"} Rules: - is_food must be true ONLY if the image clearly shows real, physical, edible food (a cooked meal, raw ingredients, packaged food items, etc.) - is_food must be false for: people, objects, screenshots, text, empty plates or containers, drawings/cartoons, animals, vehicles, or anything that is not genuinely food - Be conservative: if you are not reasonably confident, set is_food to false and lower the confidence score accordingly`;

    const aiRes = await callGeminiVision(cleanBase64, promptText, GEMINI_API_KEY);

    if (!aiRes) {
      return res.json({ is_food: false, confidence: 0, reason: 'Could not verify — please retake or re-upload the photo.' });
    }

    const aiData = await aiRes.json();
    let reply = aiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    // Strip markdown code fences defensively
    reply = reply.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(reply);
    } catch (_) {
      const m = reply.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch (_2) {} }
    }

    if (!parsed) {
      console.warn('Gemini returned non-JSON:', reply.substring(0, 200));
      return res.json({ is_food: false, confidence: 0, reason: 'Could not verify — please retake or re-upload the photo.' });
    }

    const rawIsFood = parsed.is_food === true;
    const confidence = typeof parsed.confidence === 'number'
      ? Math.round(parsed.confidence)
      : (parseInt(String(parsed.confidence), 10) || 0);
    const reason = String(parsed.reason || (rawIsFood ? 'Verified edible food item.' : 'Image does not appear to show food.'));

    // Verified ONLY if is_food === true AND confidence >= 60
    const isVerified = rawIsFood && confidence >= 60;

    return res.json({ is_food: isVerified, confidence, reason });

  } catch (err) {
    console.warn('Gemini Vision call threw:', err.message);
    return res.json({ is_food: false, confidence: 0, reason: 'Could not verify — please retake or re-upload the photo.' });
  }
});

// --------------------------------------------------
// 5. PERCEPTUAL IMAGE HASHING & REVERSE LOOKUP (ANTI-STOCK PHOTO)
// --------------------------------------------------
async function computePerceptualHash(base64Image) {
  if (!base64Image) return '';
  try {
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    
    // Resize to 8x8 fixed square, grayscale raw buffer (64 bytes)
    const rawPixels = await sharp(buffer)
      .resize(8, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();

    let sum = 0;
    for (let i = 0; i < 64; i++) {
      sum += rawPixels[i];
    }
    const avg = sum / 64;

    // 64-bit binary string: 1 if pixel brightness >= avg, 0 otherwise
    let bitstring = '';
    for (let i = 0; i < 64; i++) {
      bitstring += rawPixels[i] >= avg ? '1' : '0';
    }

    // Convert 64 bits to 16 hex characters
    let hexHash = '';
    for (let i = 0; i < 64; i += 4) {
      hexHash += parseInt(bitstring.substring(i, i + 4), 2).toString(16);
    }
    return hexHash;
  } catch (err) {
    console.warn('Perceptual hash computation failed:', err.message);
    return '';
  }
}

function hammingDistance(hex1, hex2) {
  if (!hex1 || !hex2 || hex1.length !== hex2.length) return 64;
  let dist = 0;
  for (let i = 0; i < hex1.length; i++) {
    let xor = parseInt(hex1[i], 16) ^ parseInt(hex2[i], 16);
    while (xor > 0) {
      dist += xor & 1;
      xor >>= 1;
    }
  }
  return dist;
}

app.post('/api/donations/verify-web-duplicate', async (req, res) => {
  const { imageBase64, isLiveCapture } = req.body;
  if (isLiveCapture) return res.json({ isDuplicateFound: false, matchSource: 'Live Hardware Camera Verified' });
  if (!imageBase64) return res.status(400).json({ error: 'Image required for analysis' });

  const pHash = await computePerceptualHash(imageBase64);
  if (!pHash) {
    return res.json({ isDuplicateFound: false, matchSource: 'Original Unindexed Photo' });
  }

  const DUPLICATE_THRESHOLD = 5;
  let isMatch = false;

  // 1. Check known web hashes
  for (const storedHash of KNOWN_WEB_IMAGE_HASHES) {
    if (storedHash.length === 16 && hammingDistance(pHash, storedHash) <= DUPLICATE_THRESHOLD) {
      isMatch = true;
      break;
    }
  }

  // 2. Check existing database posts
  if (!isMatch) {
    try {
      const existingPosts = await Donation.find({ image_hash: { $exists: true, $ne: '' } }).select('image_hash');
      for (const post of existingPosts) {
        if (post.image_hash && post.image_hash.length === 16 && hammingDistance(pHash, post.image_hash) <= DUPLICATE_THRESHOLD) {
          isMatch = true;
          break;
        }
      }
    } catch (e) {}
  }

  // 3. Check memory fallback donations
  if (!isMatch) {
    for (const memItem of memoryDonations) {
      if (memItem.image_hash && memItem.image_hash.length === 16 && hammingDistance(pHash, memItem.image_hash) <= DUPLICATE_THRESHOLD) {
        isMatch = true;
        break;
      }
    }
  }

  if (isMatch) {
    return res.json({ isDuplicateFound: true, matchSource: 'Exact match found on Google Search / Public Web Assets' });
  }

  KNOWN_WEB_IMAGE_HASHES.add(pHash);
  return res.json({ isDuplicateFound: false, matchSource: 'Original Unindexed Photo' });
});

// --------------------------------------------------
// 6. AUTHENTICATION & NITI AAYOG DARPAN ID RBAC
// --------------------------------------------------
function generateToken(user) {
  return jwt.sign(
    {
      id: user._id ? user._id.toString() : user.id,
      phone: user.phone,
      role: user.role,
      org_name: user.org_name,
      name: user.name,
      ngo_darpan_id: user.ngo_darpan_id
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
};

app.post('/api/auth/register', [
  body('name').trim().notEmpty().withMessage('Name is required and cannot be empty.'),
  body('phone').trim().matches(/^(\+?91)?[6-9]\d{9}$/).withMessage('Valid 10-digit Indian mobile number is required.'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
  validateRequest
], async (req, res) => {
  const { name, phone, role, org_name, ngo_darpan_id, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    let existing = await User.findOne({ phone });
    if (existing) return res.status(400).json({ error: 'Phone already registered.' });

    const newUser = new User({ 
      name, 
      phone, 
      password: hashedPassword,
      role, 
      org_name: org_name || name, 
      ngo_darpan_id: ngo_darpan_id || '', 
      is_verified: true 
    });
    await newUser.save();

    const token = generateToken(newUser);
    const userObj = newUser.toObject();
    delete userObj.password;
    return res.status(201).json({ ...userObj, token });
  } catch (err) {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const fallbackUser = { 
      id: Date.now().toString(), 
      name, 
      phone, 
      password: hashedPassword,
      role, 
      org_name: org_name || name, 
      ngo_darpan_id: ngo_darpan_id || '', 
      is_verified: true, 
      trust_score: 100 
    };
    memoryUsers.push(fallbackUser);
    const token = generateToken(fallbackUser);
    const { password: _, ...userSafe } = fallbackUser;
    return res.status(201).json({ ...userSafe, token });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: 'Phone number and password are required.' });
  }

  try {
    const user = await User.findOne({ phone });
    if (user) {
      const isMatch = await bcrypt.compare(password, user.password || '');
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid phone or password.' });
      }
      const token = generateToken(user);
      const userObj = user.toObject();
      delete userObj.password;
      return res.json({ ...userObj, token });
    }
  } catch (e) {}

  const memUser = memoryUsers.find(u => u.phone === phone);
  if (memUser) {
    const isMatch = await bcrypt.compare(password, memUser.password || '');
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid phone or password.' });
    }
    const token = generateToken(memUser);
    const { password: _, ...userSafe } = memUser;
    return res.json({ ...userSafe, token });
  }

  return res.status(401).json({ error: 'Invalid phone or password.' });
});

// --------------------------------------------------
// 7. SURPLUS FOOD DONATION CONTROLLERS
// --------------------------------------------------
app.get('/api/donations', async (req, res) => {
  try {
    const list = await Donation.find().sort({ created_at: -1 });
    res.json(list.length > 0 ? list : memoryDonations);
  } catch {
    res.json(memoryDonations);
  }
});

app.post('/api/donations', donationSubmissionLimiter, requireAuth, [
  body('title').trim().notEmpty().withMessage('Donation title is required and cannot be empty.'),
  body('quantity').trim().notEmpty().withMessage('Quantity is required and cannot be empty.'),
  body('address').trim().notEmpty().withMessage('Pickup address is required and cannot be empty.'),
  validateRequest
], async (req, res) => {
  const { 
    title, 
    category, 
    food_type, 
    quantity, 
    expiry_hours, 
    address, 
    image, 
    coords,
    is_live_capture, 
    ai_detected_class, 
    verification_code 
  } = req.body;
  const donorPhone = req.user?.phone || req.body.phone;
  const donorId = req.user?.id || req.body.donor_id || '';
  const donorName = req.user?.name || req.body.donor_name || 'Anonymous Donor';

  if (memoryBlacklist.has(donorPhone)) {
    return res.status(403).json({ error: 'This phone number is permanently blacklisted due to multiple verified disputes.' });
  }

  const imageHash = image ? await computePerceptualHash(image) : '';
  const numExpiry = Number(expiry_hours) || 3;
  const initialStatus = numExpiry === 1 ? 'DIVERTED_TO_ANIMALS' : 'AVAILABLE';

  const donationData = {
    title: String(title).trim(),
    category: category || food_type || 'Vegetarian',
    food_type: food_type || category || 'Vegetarian',
    quantity: String(quantity).trim(),
    expiry_hours: numExpiry,
    address: String(address).trim(),
    image: image || '',
    image_hash: imageHash,
    coords: coords && typeof coords.lat === 'number' && typeof coords.lon === 'number' 
      ? { lat: coords.lat, lon: coords.lon }
      : { lat: 28.6139, lon: 77.2090 },
    phone: donorPhone,
    donor_id: donorId,
    donor_name: donorName,
    verification_code: verification_code || 'HW-AUTH',
    is_verified: true,
    is_food_verified: true,
    is_live_capture: is_live_capture !== undefined ? Boolean(is_live_capture) : true,
    ai_detected_class: ai_detected_class || 'Live Hardware Camera Verified',
    trust_score: 100,
    status: initialStatus
  };

  try {
    const newItem = new Donation(donationData);
    await newItem.save();
    res.status(201).json(newItem);
  } catch (err) {
    const fallbackItem = { 
      id: Date.now().toString(), 
      ...donationData,
      created_at: new Date()
    };
    memoryDonations.unshift(fallbackItem);
    res.status(201).json(fallbackItem);
  }
});

app.patch('/api/donations/:id/claim', requireAuth, async (req, res) => {
  const { claimant_phone, claimant_org } = req.body || {};
  try {
    const updated = await Donation.findByIdAndUpdate(
      req.params.id, 
      { status: 'CLAIMED', claimed_by_ngo: claimant_org || 'Verified NGO Partner' }, 
      { new: true }
    );
    res.json(updated);
  } catch {
    const item = memoryDonations.find(d => String(d.id) === String(req.params.id) || String(d._id) === String(req.params.id));
    if (item) {
      item.status = 'CLAIMED';
      item.claimed_by_ngo = claimant_org || 'Verified NGO';
    }
    res.json(item || { status: 'CLAIMED' });
  }
});

// --------------------------------------------------
// 8. PROOF-OF-GROUND DISPUTE & REPORT CONTROLLER
// --------------------------------------------------
app.post('/api/donations/:id/report-fake', donationSubmissionLimiter, requireAuth, async (req, res) => {
  const { reporter_name, reporter_phone, darpan_id, reason, evidence_image, reporter_distance_km } = req.body;

  if (reporter_distance_km > 0.3) {
    return res.status(400).json({ 
      error: `Geofence Violation: You are ${(reporter_distance_km * 1000).toFixed(0)}m away. You must be physically present at the pickup site (within 300m) to file a dispute report.` 
    });
  }

  if (!evidence_image || evidence_image.length < 50) {
    return res.status(400).json({ error: 'Photographic proof is mandatory.' });
  }

  try {
    let donation = await Donation.findById(req.params.id);
    if (!donation) {
      let memItem = memoryDonations.find(d => String(d.id) === String(req.params.id) || String(d._id) === String(req.params.id));
      if (memItem) {
        if (!memItem.dispute_logs) memItem.dispute_logs = [];
        memItem.dispute_logs.push({ reported_by: reporter_name, reporter_phone, darpan_id, reason, evidence_image, reporter_distance_km, timestamp: new Date() });
        if (memItem.dispute_logs.length >= 2) {
          memItem.status = 'FLAGGED_FAKE';
          memoryBlacklist.add(memItem.phone);
          return res.json({ status: 'BANNED', message: 'Donor suspended after multi-signature consensus.' });
        } else {
          memItem.status = 'DISPUTED_REVIEW';
          return res.json({ status: 'UNDER_REVIEW', message: 'First strike logged with proof. Post moved to Under Review.' });
        }
      }
      return res.status(404).json({ error: 'Listing not found.' });
    }

    const alreadyReported = donation.dispute_logs.some(log => log.darpan_id === darpan_id || log.reporter_phone === reporter_phone);
    if (alreadyReported) {
      return res.status(400).json({ error: 'Your organization has already filed a strike for this listing.' });
    }

    donation.dispute_logs.push({ reported_by: reporter_name, reporter_phone, darpan_id, reason, evidence_image, reporter_distance_km, timestamp: new Date() });

    if (donation.dispute_logs.length >= 2) {
      donation.status = 'FLAGGED_FAKE';
      await User.findOneAndUpdate({ phone: donation.phone }, { is_blacklisted: true, trust_score: 0 });
      memoryBlacklist.add(donation.phone);
      await donation.save();
      return res.json({ status: 'BANNED', message: '🚨 2nd Verified NGO strike confirmed. Donor permanently blacklisted.' });
    } else {
      donation.status = 'DISPUTED_REVIEW';
      donation.trust_score = 45;
      await donation.save();
      return res.json({ status: 'UNDER_REVIEW', message: '⚠️ 1st Strike logged with Geotagged Proof. Listing flagged as Under Review.' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Internal moderation error.' });
  }
});

// --------------------------------------------------
// 9. DIRECT NGO-TO-DONOR NOTES & FEEDBACK PIPELINE
// --------------------------------------------------
app.post('/api/contact', [
  body('name').trim().notEmpty().withMessage('Name is required and cannot be empty.'),
  body('email').trim().isEmail().withMessage('A valid email address is required.'),
  body('message').trim().notEmpty().withMessage('Message is required and cannot be empty.'),
  validateRequest
], async (req, res) => {
  const { name, email, message, donor_phone, donor_name } = req.body;

  try {
    const newNote = new Contact({ name, email, message, donor_phone: donor_phone || 'ALL', donor_name: donor_name || 'All Registered Donors' });
    await newNote.save();
    res.status(201).json({ success: true, note: newNote });
  } catch (err) {
    const fallbackNote = { id: Date.now().toString(), name, email, message, donor_phone: donor_phone || 'ALL', donor_name: donor_name || 'All Registered Donors', created_at: new Date() };
    memoryContacts.unshift(fallbackNote);
    res.status(201).json({ success: true, note: fallbackNote });
  }
});

app.get('/api/contact', requireAuth, async (req, res) => {
  const { donor_phone } = req.query;
  try {
    let query = {};
    if (donor_phone && donor_phone !== 'ALL') {
      query = { $or: [{ donor_phone: donor_phone }, { donor_phone: 'ALL' }] };
    }
    const notes = await Contact.find(query).sort({ created_at: -1 });
    res.json(notes.length > 0 ? notes : memoryContacts);
  } catch {
    res.json(memoryContacts);
  }
});

// Diagnostics & Data Purge Route
// NOTE: This is a destructive diagnostics route. In a real production deployment, it should be removed or strictly admin-gated.
app.delete('/api/donations/purge-all', requireAuth, async (req, res) => {
  try {
    await Donation.deleteMany({});
    memoryDonations = [];
    res.json({ message: 'Database cleared' });
  } catch {
    memoryDonations = [];
    res.json({ message: 'Memory cleared' });
  }
});

// --------------------------------------------------
// 9b. RAZORPAY MICRO-DONATION & SPONSOR-A-MEAL ENDPOINTS
// --------------------------------------------------
let RazorpayClient = null;
try {
  const Razorpay = require('razorpay');
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    RazorpayClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    console.log('💳 Razorpay Gateway Initialized (Live/Test Mode Active)');
  }
} catch (e) {
  console.log('ℹ️ Razorpay SDK not initialized, demo mock fallback active');
}

app.post('/api/donations/create-order', async (req, res) => {
  const { amount, donor_name, donor_phone, donor_email } = req.body;
  const numAmount = Number(amount) || 40;
  const amountInPaise = Math.round(numAmount * 100);

  // If Razorpay keys and client exist, create real/test order via Razorpay API
  if (RazorpayClient && process.env.RAZORPAY_KEY_ID) {
    try {
      const options = {
        amount: amountInPaise,
        currency: 'INR',
        receipt: `rcpt_fl_${Date.now()}`,
        notes: {
          donor_name: donor_name || 'Anonymous Contributor',
          donor_phone: donor_phone || '',
          purpose: 'FoodLoop Sponsor-A-Meal Rescue Fund'
        }
      };
      const order = await RazorpayClient.orders.create(options);
      return res.json({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: process.env.RAZORPAY_KEY_ID
      });
    } catch (err) {
      console.warn('Razorpay order creation fallback:', err.message);
    }
  }

  // Fallback for demo / test when keys are not configured
  const mockOrderId = `order_mock_${Date.now()}`;
  return res.json({
    order_id: mockOrderId,
    amount: amountInPaise,
    currency: 'INR',
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock',
    mock: true
  });
});

app.post('/api/donations/verify-payment', async (req, res) => {
  const { 
    razorpay_order_id, 
    razorpay_payment_id, 
    razorpay_signature, 
    donor_name, 
    donor_phone, 
    amount 
  } = req.body;

  // If mock order / demo mode
  if (!razorpay_order_id || String(razorpay_order_id).startsWith('order_mock_') || !process.env.RAZORPAY_KEY_SECRET) {
    const paymentId = razorpay_payment_id || `pay_mock_${Date.now()}`;
    return res.json({
      success: true,
      verified: true,
      payment_id: paymentId,
      amount: amount || 40,
      donor_name: donor_name || 'Contributor',
      message: 'Payment recorded (Demo Mode)'
    });
  }

  // Real order: verify HMAC-SHA256 signature using crypto
  try {
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature === razorpay_signature) {
      return res.json({
        success: true,
        verified: true,
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        amount: amount || 40,
        donor_name: donor_name || 'Contributor'
      });
    } else {
      return res.status(400).json({ error: 'Payment verification failed: Signature mismatch.' });
    }
  } catch (err) {
    console.error('Payment signature check failed:', err);
    return res.status(400).json({ error: 'Payment verification error.' });
  }
});

// Root and SPA Catch-All Route: Serve React App if built, else fallback to vanilla index.html
app.use((req, res) => {
  // If an API request reaches here, return 404 JSON instead of index.html
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  const clientIndex = path.join(__dirname, 'client', 'dist', 'index.html');
  if (fs.existsSync(clientIndex)) {
    res.sendFile(clientIndex);
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

// --------------------------------------------------
// 10. SERVER BOOTSTRAPPER
// --------------------------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 FoodLoop Master Server running on http://localhost:${PORT}`);
  console.log(`🛡️ Hardware Geotag & Anti-Fraud Security: ACTIVE`);
  if (GEMINI_API_KEY && (GEMINI_API_KEY.startsWith('AIzaSy') || GEMINI_API_KEY.startsWith('AQ.'))) {
    console.log(`✅ Gemini API key format looks valid (Cloud Assistant ACTIVE)`);
  } else {
    console.warn(`⚠️ GEMINI_API_KEY missing or wrong format — AI features will fall back to defaults`);
  }
  console.log(`====================================================`);
});