# 🍲 FoodLoop V2 — Smart Food Redistribution & Waste Mitigation Platform

FoodLoop V2 is an intelligent web platform designed to bridge the gap between surplus food generators (restaurants, event venues, college mess, and households) and local NGOs/shelters in real time. 

V2 enhances food safety, real-time map matching, and route coordination to minimize food waste and optimize distribution logistics.

---

## 🚀 Key Features

* **Live Surplus Radar:** Real-time geo-mapping to visualize nearby surplus food listings and donation requests.
* **Instant Listing & Matching:** Quick posting interface for donors to list excess edible food with quantity, shelf-life, and pickup details.
* **NGO/Volunteer Dashboard:** Direct claims and streamlined logistics coordination for verified volunteers and organizations.
* **Responsive UI:** Fast, mobile-first web interface built for quick on-ground actions.

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3, JavaScript (ES6+)
* **Backend:** Node.js, Express.js
* **Mapping & Location Services:** Leaflet / OpenStreetMap API
* **Package Management:** npm

---

## 📁 Project Structure

```text
├── index.html        # Landing page & donor/claim portal
├── map.html          # Interactive food radar & geo-tracking interface
├── style.css         # Styling & responsive design rules
├── script.js         # Client-side validation & UI interactions
├── map.js            # Map logic, markers & location handling
├── server.js         # Express backend server & endpoints
├── package.json      # Dependencies and startup scripts
└── README.md         # Project documentation
```

---

## ⚙️ Environment Setup

1. **Clone the repository and install dependencies:**
   ```bash
   git clone <repo-url>
   cd foodloop-v2
   npm install
   ```

2. **Configure environment variables:**
   Copy the provided `.env.example` template into a new `.env` file:
   ```bash
   cp .env.example .env
   ```

3. **Fill in required configuration variables in `.env`:**
   - `PORT`: Port for the Express server to listen on (e.g., `5000`).
   - `MONGO_URI`: MongoDB connection string (e.g., `mongodb://127.0.0.1:27017/foodloop` or a MongoDB Atlas cluster URI). If MongoDB is offline, FoodLoop operates in high-resilience in-memory cache mode.
   - `GEMINI_API_KEY`: Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/app/apikey). Enables live food verification and chatbot NLP.
   - `JWT_SECRET`: A secure random cryptographic secret string used to sign and verify JSON Web Tokens for authenticated sessions.

4. **Security Notice:**
   - **Never commit `.env` to version control.** It is strictly excluded by `.gitignore`. Always keep API keys and secrets private.

5. **Start the server:**
   ```bash
   npm start
   ```

---

## 🌐 Deployment

When deploying FoodLoop V2 to cloud hosting platforms (such as Render, Railway, Heroku, or AWS):

- **Environment Variables:** Do **not** upload or commit `.env`. Instead, add each required environment variable (`PORT`, `MONGO_URI`, `GEMINI_API_KEY`, `JWT_SECRET`) directly into the hosting platform's web dashboard (under "Environment Variables" or "Config Vars").
- **Database:** Connect to a managed cloud database such as **MongoDB Atlas**. Ensure the database user has read/write permissions and network access rules whitelist the deployment server's IP address.
- **Node.js Runtime:** Ensure the target environment runs Node.js 18+ to support native `fetch` and modern cryptographic modules.
