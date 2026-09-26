# FoodLoop

**AI-Verified Surplus Food Rescue — Closing the Loop from Plate to Purpose**

FoodLoop is a real-time platform that connects surplus food donors (restaurants, banquet halls, households) directly with verified NGOs, shelters, and gaushalas — replacing manual, unverifiable food-donation coordination with a system where every photo, every claim, and every handover is cryptographically and AI-verified.

---

## Table of Contents
- [Problem](#problem)
- [Core Features](#core-features)
- [Tech Stack](#tech-stack)
- [How It Works](#how-it-works)
- [Business Model](#business-model)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [License](#license)

---

## Problem

India wastes an estimated 78–80 million tonnes of food every year (₹1.55 lakh crore, nearly 1% of GDP — UNEP Food Waste Index Report, 2024), while roughly 194 million Indians remain undernourished. The gap isn't food — it's **trust**: donors don't know which NGO is genuine, and NGOs can't verify whether a listed donation is real, safe, or still available by the time they arrive. FoodLoop closes that trust gap with verification at every step.

---

## Core Features

### 🔒 Trust & Verification
- **Live-Capture + Gallery Upload** — donors can either photograph food live via camera or upload from their gallery; both paths go through the identical AI-verification and fraud-check pipeline.
- **Google Gemini AI Vision Verification** — every photo is analyzed by Gemini with a structured, low-temperature prompt that returns a JSON verdict (`is_food`, `confidence`, `reason`). A photo is only accepted if `is_food` is true **and** confidence is ≥60% — a real, calibrated decision boundary rather than an all-accept/all-reject check. The model call falls back across a chain of Gemini models for reliability.
- **Canvas-Level Pixel Geotagging** — GPS coordinates and a timestamp are burned directly into the image's pixels at the moment of capture (not just displayed as an overlay), making the proof tamper-resistant.
- **Perceptual Image Hashing** — uses `sharp` to compute a perceptual hash (not a simple exact-match hash), so a cropped, resized, or re-compressed re-upload of the same photo is still caught as a likely duplicate/fraud attempt.
- **NGO Darpan Verification** — only NGOs verified against the NITI Aayog NGO Darpan ID registry can claim a listing.
- **Geofenced Dispute Engine** — a 300-metre proof-of-ground radius check on dispute filing, backed by a 2-strike rule that blacklists repeat offenders via a shared `trust_score` on the user's account.
- **QR-Code Handshake** — a real, scannable QR code (generated with `qrcode.react`, scanned with `html5-qrcode`) confirms a safe, verified physical handover between donor and NGO.

### 🌱 Sustainability
- **Dual-Loop Architecture** — food that can't reach people in time is automatically routed toward animal shelters and biogas/waste-to-energy facilities instead of a landfill.
- **Live Radar Map** — a Leaflet-based map (using Esri's no-key tile service, chosen after OpenStreetMap and CartoDB's free tiers proved unreliable under repeated dev-testing traffic) shows nearby verified NGOs, shelters, and biogas plants in real time.
- **80G Tax Receipts** — generated with `jsPDF` after a verified handover, correctly attributed to the *claiming NGO's own* 80G registration number (a for-profit platform cannot legally issue an 80G certificate on its own behalf — only a registered charitable entity can).

### 💳 Payments
- **Sponsor-a-Meal** — lets someone with no surplus food of their own contribute cash directly toward FoodLoop's rescue operations. Integrated with **Razorpay** (order creation + HMAC-verified payment confirmation), currently wired in test/sandbox mode pending business KYC for live payments.

### 🤖 AI Assistant
- **Gemini-Powered Chatbot** — a chat widget grounded in a FoodLoop-specific knowledge base (site features, how-it-works, FAQs), able to answer naturally in Hindi, English, or Hinglish.

### 🔐 Security
- **JWT + bcrypt authentication** for all accounts.
- **express-validator** input validation and **express-rate-limit** rate limiting on donation-posting and dispute-filing routes to prevent spam/abuse.
- **In-memory failover mode** — if MongoDB is unreachable, the app falls back to in-memory storage so a demo/session isn't blocked by a database outage.

---

## Tech Stack

This is a **MERN**-based application:

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + Vite, Leaflet.js (radar map), `qrcode.react` + `html5-qrcode` (QR generation & scanning), `jsPDF` (certificate generation) |
| **Backend** | Node.js + Express.js, RESTful API architecture |
| **Database** | MongoDB (Mongoose ODM), with an in-memory fallback store |
| **AI** | Google Gemini API — Vision (food verification) + Chat (assistant) |
| **Payments** | Razorpay (Node SDK, order creation, HMAC signature verification) |
| **Security** | JSON Web Tokens (JWT), bcrypt password hashing, `sharp` (perceptual image hashing), `express-validator`, `express-rate-limit` |

---

## How It Works

1. **Capture / Upload** — a donor photographs (or uploads) surplus food; GPS + timestamp are burned into the image.
2. **AI Verifies** — Gemini Vision confirms it's genuine, edible food before the listing goes live.
3. **Radar Listing** — the verified listing instantly appears on the live map for every nearby verified NGO/shelter/biogas partner.
4. **NGO Claims** — a Darpan-verified NGO claims the listing and coordinates pickup.
5. **QR Handshake** — an on-site QR scan confirms a safe, physical handover.
6. **Impact Logged** — an 80G receipt (where the NGO has a valid registration number) is issued, and both parties' trust scores are updated.

---

## Business Model

FoodLoop's core rescue loop — posting and claiming surplus food — is **free forever** for individual donors and NGOs. Revenue is designed to come only from an optional institutional layer (bulk/business donor tools, corporate CSR reporting) and from the **Sponsor-a-Meal** platform fee on cash contributions — never from the people the platform exists to help.

---

## Environment Variables

Create a `.env` file (see `.env.example`) with:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_google_gemini_api_key
JWT_SECRET=your_jwt_secret
RAZORPAY_KEY_ID=your_razorpay_test_key_id
RAZORPAY_KEY_SECRET=your_razorpay_test_key_secret
```

Razorpay keys should be **test-mode** keys during development/demo — live payments require completing Razorpay's business KYC first.

---

## Getting Started

```bash
# Backend
npm install
npm start

# Frontend (in a separate terminal)
cd client
npm install
npm run dev
```

The backend serves the built React app from `client/dist` in production, and falls back to serving the repo root directly if no build is present.

---

## Project Structure

```
foodloop-v2/
├── server.js              # Express API, Mongoose schemas, all backend routes
├── .env.example            # Environment variable template
├── client/
│   ├── src/
│   │   ├── App.jsx         # Root component & state
│   │   ├── main.jsx        # React entry point
│   │   └── components/     # Navbar, Hero, DonorForm, RadarMap, Modals,
│   │                        # RescueFeeds, GeminiChatWidget, Footer, etc.
│   └── vite.config.js
└── package.json
```

---

## License

See `LICENSE` file in the repository.
