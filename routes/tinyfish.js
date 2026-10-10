// routes/tinyfish.js
// TinyFish Live Web Intelligence Routes for FoodLoop

const express = require('express');
const rateLimit = require('express-rate-limit');
const tinyfish = require('../services/tinyfish');

function createRateLimiter(max, windowMinutes) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Rate limit exceeded. Please try again later.' }
  });
}

function normalizeStr(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getDomain(urlStr) {
  try {
    return new URL(urlStr).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function isGovOrTrustDomain(domain) {
  return (
    domain.endsWith('.gov.in') ||
    domain.endsWith('.nic.in') ||
    domain.endsWith('.org.in') ||
    domain.endsWith('.org') ||
    domain === 'ngodarpan.gov.in'
  );
}

module.exports = ({ requireAuth }) => {
  const router = express.Router();

  const newsLimiter = createRateLimiter(30, 10);
  const ngoLimiter = createRateLimiter(5, 10);
  const partnersLimiter = createRateLimiter(20, 10);

  // 1. GET /status
  router.get('/status', (req, res) => {
    const enabled = process.env.TINYFISH_ENABLED === 'true';
    const available = tinyfish.isAvailable();
    return res.json({
      enabled,
      available,
      features: {
        news: available,
        ngoCheck: available,
        partners: available,
        chat: available
      }
    });
  });

  // 2. GET /news
  router.get('/news', newsLimiter, async (req, res) => {
    if (!tinyfish.isAvailable()) {
      return res.json({ available: false, items: [] });
    }

    try {
      const [res1, res2] = await Promise.all([
        tinyfish.search({
          query: 'food waste India',
          domain_type: 'news',
          location: 'IN',
          language: 'en',
          recency_minutes: 43200
        }, { ttlSeconds: 1800 }),
        tinyfish.search({
          query: 'food donation India',
          domain_type: 'news',
          location: 'IN',
          language: 'en',
          recency_minutes: 43200
        }, { ttlSeconds: 1800 })
      ]);

      const items1 = (res1.ok && res1.data?.results) ? res1.data.results : [];
      const items2 = (res2.ok && res2.data?.results) ? res2.data.results : [];

      const seenUrls = new Set();
      const combined = [];

      for (const item of [...items1, ...items2]) {
        if (!item || !item.url || seenUrls.has(item.url)) continue;
        seenUrls.add(item.url);
        combined.push(item);
      }

      // Sort newest first if date is present
      combined.sort((a, b) => {
        if (a.date && b.date) {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        return 0;
      });

      const top6 = combined.slice(0, 6).map(item => ({
        title: item.title,
        snippet: item.snippet,
        url: item.url,
        publisher: item.publisher || item.site_name,
        site_name: item.site_name,
        date: item.date
      }));

      return res.json({
        available: true,
        items: top6
      });
    } catch {
      return res.json({ available: false, items: [] });
    }
  });

  // 3. POST /ngo-check
  router.post('/ngo-check', ngoLimiter, async (req, res) => {
    const { org_name, city, darpan_id } = req.body || {};

    // Input Validation
    if (typeof org_name !== 'string' || org_name.trim().length < 3 || org_name.trim().length > 120) {
      return res.status(400).json({ error: 'org_name must be a string between 3 and 120 characters' });
    }
    if (city !== undefined && (typeof city !== 'string' || city.trim().length > 60)) {
      return res.status(400).json({ error: 'city must be a string up to 60 characters' });
    }
    if (darpan_id !== undefined && (typeof darpan_id !== 'string' || darpan_id.trim().length > 30)) {
      return res.status(400).json({ error: 'darpan_id must be a string up to 30 characters' });
    }

    const disclaimer = 'Advisory only: public web footprint, not an official verification.';

    if (!tinyfish.isAvailable()) {
      return res.json({
        available: false,
        confidence: 'UNKNOWN',
        evidence: [],
        darpan_id_seen: false,
        disclaimer
      });
    }

    try {
      const cleanOrg = org_name.replace(/["']/g, '').trim();
      const cleanCity = (city || '').replace(/["']/g, '').trim();
      const queryStr = `"${cleanOrg}" NGO ${cleanCity} India`.trim();

      const searchRes = await tinyfish.search({
        query: queryStr,
        location: 'IN',
        exclude_domains: 'facebook.com,instagram.com,youtube.com,pinterest.com,quora.com'
      }, { timeoutMs: 8000, ttlSeconds: 1800 });

      if (!searchRes.ok || !searchRes.data?.results || searchRes.data.results.length === 0) {
        return res.json({
          available: true,
          confidence: 'UNKNOWN',
          evidence: [],
          darpan_id_seen: false,
          disclaimer
        });
      }

      const top5 = searchRes.data.results.slice(0, 5);
      const top2Urls = top5.slice(0, 2).map(r => r.url);

      // Attempt to fetch top 2 pages
      const fetchRes = await tinyfish.fetchPages(top2Urls, {
        format: 'markdown',
        per_url_timeout_ms: 15000,
        ttlSeconds: 1800
      });

      const fetchedMap = new Map();
      if (fetchRes.ok && fetchRes.data?.results) {
        for (const item of fetchRes.data.results) {
          fetchedMap.set(item.url, item);
        }
      }

      const normalizedOrg = normalizeStr(cleanOrg);
      const normalizedDarpan = darpan_id ? normalizeStr(darpan_id) : '';

      const matchedDomains = new Set();
      let trustDomainMatched = false;
      let darpanSeen = false;
      const evidence = [];

      for (const item of top5) {
        const domain = getDomain(item.url);
        const fetchedPage = fetchedMap.get(item.url);
        const fullText = `${item.title} ${item.snippet} ${item.url} ${fetchedPage?.text || ''}`;
        const normFullText = normalizeStr(fullText);

        const nameMatched = normalizedOrg.length >= 3 && normFullText.includes(normalizedOrg);
        if (normalizedDarpan && normFullText.includes(normalizedDarpan)) {
          darpanSeen = true;
        }

        if (nameMatched) {
          matchedDomains.add(domain);
          if (isGovOrTrustDomain(domain)) {
            trustDomainMatched = true;
          }
        }

        if (evidence.length < 3) {
          evidence.push({
            title: item.title,
            url: item.url,
            site_name: item.site_name || domain,
            matched: nameMatched
          });
        }
      }

      let confidence = 'UNKNOWN';
      if (matchedDomains.size >= 2 && trustDomainMatched) {
        confidence = 'HIGH';
      } else if (matchedDomains.size >= 1) {
        confidence = 'MEDIUM';
      } else if (top5.length > 0) {
        confidence = 'LOW';
      }

      return res.json({
        available: true,
        confidence,
        evidence,
        darpan_id_seen: darpanSeen,
        disclaimer
      });
    } catch {
      return res.json({
        available: false,
        confidence: 'UNKNOWN',
        evidence: [],
        darpan_id_seen: false,
        disclaimer
      });
    }
  });

  // 4. GET /partners (requires auth)
  const authMiddleware = typeof requireAuth === 'function' ? requireAuth : (req, res, next) => next();

  router.get('/partners', authMiddleware, partnersLimiter, async (req, res) => {
    const { city, type } = req.query;

    const allowedTypes = ['gaushala', 'animal_shelter', 'biogas'];
    if (!type || !allowedTypes.includes(type)) {
      return res.status(400).json({ error: 'type must be one of: gaushala, animal_shelter, biogas' });
    }

    if (typeof city !== 'string' || !/^[a-zA-Z\s\-]{2,60}$/.test(city.trim())) {
      return res.status(400).json({ error: 'city must be between 2 and 60 letters, spaces, or hyphens' });
    }

    if (!tinyfish.isAvailable()) {
      return res.json({ available: false, items: [] });
    }

    const cleanCity = city.trim();
    let queryText = '';
    if (type === 'gaushala') {
      queryText = `gaushala in ${cleanCity} India`;
    } else if (type === 'animal_shelter') {
      queryText = `animal shelter in ${cleanCity} India`;
    } else if (type === 'biogas') {
      queryText = `biogas plant food waste ${cleanCity} India`;
    }

    try {
      const searchRes = await tinyfish.search({
        query: queryText,
        exclude_domains: 'facebook.com,instagram.com,youtube.com,pinterest.com,quora.com'
      }, {
        ttlSeconds: 21600 // Cache 6 hours
      });

      if (!searchRes.ok || !searchRes.data?.results) {
        return res.json({ available: false, items: [] });
      }

      const top5 = searchRes.data.results.slice(0, 5).map(item => ({
        title: item.title,
        snippet: item.snippet,
        url: item.url,
        site_name: item.site_name
      }));

      return res.json({
        available: true,
        items: top5
      });
    } catch {
      return res.json({ available: false, items: [] });
    }
  });

  return router;
};
