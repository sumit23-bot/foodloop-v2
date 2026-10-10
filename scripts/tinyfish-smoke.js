// scripts/tinyfish-smoke.js
// Live smoke test for TinyFish API: performs ONE search and ONE fetch.
// NEVER prints the API key or raw response payloads.

require('dotenv').config();

async function runSmoke() {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey || !apiKey.trim() || apiKey.includes('your_') || apiKey.includes('<PASTE')) {
    console.log('ℹ️ TinyFish API key is not configured or placeholder. Skipping live smoke test.');
    process.exit(0);
  }

  const searchUrl = process.env.TINYFISH_SEARCH_URL || 'https://api.search.tinyfish.ai';
  const fetchUrl = process.env.TINYFISH_FETCH_URL || 'https://api.fetch.tinyfish.ai';

  console.log('🐟 Starting TinyFish live smoke check...');

  // 1. Search Check
  try {
    const t0 = Date.now();
    const sUrl = new URL(searchUrl);
    sUrl.searchParams.set('query', 'food waste India');
    sUrl.searchParams.set('location', 'IN');
    sUrl.searchParams.set('language', 'en');

    const sRes = await fetch(sUrl.toString(), {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey.trim(),
        'User-Agent': 'FoodLoop-Hackathon/1.0'
      }
    });
    const sLatency = Date.now() - t0;
    console.log(`[Search] HTTP Status: ${sRes.status} | Latency: ${sLatency}ms`);

    if (sRes.ok) {
      const sJson = await sRes.json();
      const count = Array.isArray(sJson.results) ? sJson.results.length : 0;
      console.log(`[Search] Success: ${count} results returned.`);
    } else {
      console.log(`[Search] Note: non-200 response (${sRes.status}).`);
    }
  } catch (err) {
    console.log(`[Search] Network/Request error: ${err.message}`);
  }

  // 2. Fetch Check
  try {
    const t0 = Date.now();
    const fRes = await fetch(fetchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey.trim(),
        'User-Agent': 'FoodLoop-Hackathon/1.0'
      },
      body: JSON.stringify({
        urls: ['https://fssai.gov.in'],
        format: 'markdown',
        per_url_timeout_ms: 10000
      })
    });
    const fLatency = Date.now() - t0;
    console.log(`[Fetch]  HTTP Status: ${fRes.status} | Latency: ${fLatency}ms`);

    if (fRes.ok) {
      const fJson = await fRes.json();
      const count = Array.isArray(fJson.results) ? fJson.results.length : 0;
      const errCount = Array.isArray(fJson.errors) ? fJson.errors.length : 0;
      console.log(`[Fetch]  Success: ${count} pages fetched, ${errCount} errors reported.`);
    } else {
      console.log(`[Fetch]  Note: non-200 response (${fRes.status}).`);
    }
  } catch (err) {
    console.log(`[Fetch]  Network/Request error: ${err.message}`);
  }

  console.log('🏁 TinyFish smoke test complete.');
}

runSmoke().catch(e => {
  console.error('Smoke script unexpected failure:', e.message);
  process.exit(1);
});
