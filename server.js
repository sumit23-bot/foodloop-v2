const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// ==========================================
// 1. MONGODB CONNECTION (SEPARATE DATABASE: foodloop_v2)
// ==========================================
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/foodloop_v2';

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log(' Connected to MongoDB (Database: foodloop_v2)');
    // Auto-create all collections on startup
    await Promise.all([
      Contact.createCollection(),
      Donation.createCollection(),
      DonorProfile.createCollection(),
      UsedPin.createCollection(),
      User.createCollection()
    ]);
    console.log(' All 5 collections initialized in foodloop_v2');
  })
  .catch((err) => console.error(' MongoDB Connection Error:', err));

// ==========================================
// 2. SCHEMAS & MODELS (MATCHING ORIGINAL FOODLOOP)
// ==========================================

// 1. Contacts Collection
const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Contact = mongoose.model('Contact', contactSchema);

// 2. Donations Collection
const donationSchema = new mongoose.Schema({
  foodTitle: { type: String, required: true },
  foodType: { type: String, default: 'Veg' },
  quantity: { type: String, required: true },
  expiryHours: { type: Number },
  donorName: { type: String },
  donorContact: { type: String },
  pickupAddress: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  status: { type: String, default: 'Available' },
  createdAt: { type: Date, default: Date.now }
});
const Donation = mongoose.model('Donation', donationSchema);

// 3. Donor Profiles Collection
const donorProfileSchema = new mongoose.Schema({
  organizationName: { type: String, required: true },
  donorType: { type: String }, // Restaurant, Mess, Individual, Event
  email: { type: String, required: true },
  phone: { type: String },
  address: { type: String },
  verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const DonorProfile = mongoose.model('DonorProfile', donorProfileSchema);

// 4. Used Pins Collection (For Claim/Verification Pins)
const usedPinSchema = new mongoose.Schema({
  pin: { type: String, required: true, unique: true },
  usedAt: { type: Date, default: Date.now }
});
const UsedPin = mongoose.model('UsedPin', usedPinSchema);

// 5. Users Collection
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['donor', 'receiver', 'volunteer', 'admin'], default: 'donor' },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// ==========================================
// 3. SAMPLE API ROUTES
// ==========================================

// Contact form API
app.post('/api/contact', async (req, res) => {
  try {
    const contact = new Contact(req.body);
    await contact.save();
    res.status(201).json({ message: 'Contact submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get & Create Donations API
app.get('/api/donations', async (req, res) => {
  try {
    const data = await Donation.find();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/donations', async (req, res) => {
  try {
    const donation = new Donation(req.body);
    await donation.save();
    res.status(201).json(donation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ==========================================
// 4. START SERVER
// ==========================================
app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
});