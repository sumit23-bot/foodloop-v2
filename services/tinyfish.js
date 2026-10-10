// services/tinyfish.js
// TinyFish Web Intelligence Client with caching, rate limiting, circuit breaking, and sanitization

const CACHE_MAX_SIZE = 200;
const cache = new Map(); // key -> { data, expiresAt }
const inflight = new Map(); // key -> Promise

// Circuit Breaker State
let consecutiveFailures = 0;
let circuitOpenUntil = 0;

// Local sliding window throttles
const searchTimestamps = [];
const fetchTimestamps = [];

// Usage stats (safe to inspect, no secrets)
const stats = {
  calls: 0,
  successes: 0,
  failures: {
    DISABLED: 0,
    NO_KEY: 0,
    TIMEOUT: 0,
    RATE_LIMITED: 0,
    NO_CREDITS: 0,
    UNAUTHORIZED: 0,
    BAD_REQUEST: 0,
    UPSTREAM_ERROR: 0,
    BAD_RESPONSE: 0,
    CIRCUIT_OPEN: 0
  },
  cacheHits: 0,
  lastSuccessTime: null
};

// URL validation: must be https, no localhost/private IP
function isValidHttpsUrl(rawUrl) {
  if (typeof rawUrl !== 'string') return false;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      /^127\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
      /^0\./.test(hostname) ||
      /^\[.*\]$/.test(hostname) ||
      /^\d+\.\d+\.\d+\.\d+$/.test(hostname)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function sanitizeText(str, maxLen = 400) {
  if (typeof str !== 'string') return '';
  const cleaned = str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen).trim() : cleaned;
}

function pruneSlidingWindow(timestamps, windowMs = 60000) {
  const now = Date.now();
  while (timestamps.length > 0 && timestamps[0] <= now - windowMs) {
    timestamps.shift();
  }
}

function checkCircuitBreaker() {
  const now = Date.now();
  if (circuitOpenUntil > now) {
    return false;
  }
  return true;
}

function recordFailure(code, isUpstream = false) {
  if (stats.failures[code] !== undefined) {
    stats.failures[code]++;
  }
  if (isUpstream) {
    consecutiveFailures++;
    if (consecutiveFailures >= 3) {
      circuitOpenUntil = Date.now() + 60000;
    }
  }
}

function recordSuccess() {
  stats.successes++;
  stats.lastSuccessTime = new Date().toISOString();
  consecutiveFailures = 0;
  circuitOpenUntil = 0;
}

function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  const isExpired = Date.now() > entry.expiresAt;
  return { data: entry.data, isExpired };
}

function setCache(key, data, ttlSeconds) {
  if (cache.size >= CACHE_MAX_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  const ttl = (ttlSeconds || parseInt(process.env.TINYFISH_CACHE_TTL_SECONDS, 10) || 1800) * 1000;
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}

function isAvailable() {
  const enabled = process.env.TINYFISH_ENABLED === 'true';
  const hasKey = Boolean(process.env.TINYFISH_API_KEY && process.env.TINYFISH_API_KEY.trim());
  return Boolean(enabled && hasKey && checkCircuitBreaker());
}

async function search(params = {}, opts = {}) {
  stats.calls++;

  if (process.env.TINYFISH_ENABLED !== 'true') {
    stats.failures.DISABLED++;
    return { ok: false, code: 'DISABLED', retryable: false };
  }

  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    stats.failures.NO_KEY++;
    return { ok: false, code: 'NO_KEY', retryable: false };
  }

  if (!checkCircuitBreaker()) {
    stats.failures.CIRCUIT_OPEN++;
    return { ok: false, code: 'CIRCUIT_OPEN', retryable: true };
  }

  // Throttle check
  const maxPerMin = parseInt(process.env.TINYFISH_MAX_SEARCH_PER_MIN, 10) || 20;
  pruneSlidingWindow(searchTimestamps);
  if (searchTimestamps.length >= maxPerMin) {
    stats.failures.RATE_LIMITED++;
    return { ok: false, code: 'RATE_LIMITED', retryable: true };
  }

  // Sorted cache key
  const sortedParams = Object.keys(params).sort().map(k => `${k}=${encodeURIComponent(params[k] ?? '')}`).join('&');
  const cacheKey = `search:${sortedParams}`;

  const cached = getCache(cacheKey);
  if (cached && !cached.isExpired && !opts.skipCache) {
    stats.cacheHits++;
    return { ok: true, data: cached.data, cached: true };
  }

  // In-flight coalescing
  if (inflight.has(cacheKey)) {
    return inflight.get(cacheKey);
  }

  const executionPromise = (async () => {
    const searchBaseUrl = process.env.TINYFISH_SEARCH_URL || 'https://api.search.tinyfish.ai';
    const url = new URL(searchBaseUrl);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    }

    const timeoutMs = opts.timeoutMs || parseInt(process.env.TINYFISH_SEARCH_TIMEOUT_MS, 10) || 8000;
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    searchTimestamps.push(Date.now());

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey.trim(),
          'User-Agent': 'FoodLoop-Hackathon/1.0'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutHandle);

      if (response.status === 401) {
        recordFailure('UNAUTHORIZED', false);
        return cached ? { ok: true, data: cached.data, stale: true } : { ok: false, code: 'UNAUTHORIZED', retryable: false };
      }
      if (response.status === 402) {
        recordFailure('NO_CREDITS', false);
        return cached ? { ok: true, data: cached.data, stale: true } : { ok: false, code: 'NO_CREDITS', retryable: false };
      }
      if (response.status === 429) {
        recordFailure('RATE_LIMITED', true);
        return cached ? { ok: true, data: cached.data, stale: true } : { ok: false, code: 'RATE_LIMITED', retryable: true };
      }
      if (response.status === 400) {
        recordFailure('BAD_REQUEST', false);
        return { ok: false, code: 'BAD_REQUEST', retryable: false };
      }
      if (!response.ok) {
        recordFailure('UPSTREAM_ERROR', true);
        return cached ? { ok: true, data: cached.data, stale: true } : { ok: false, code: 'UPSTREAM_ERROR', retryable: true };
      }

      let json;
      try {
        json = await response.json();
      } catch {
        recordFailure('BAD_RESPONSE', true);
        return cached ? { ok: true, data: cached.data, stale: true } : { ok: false, code: 'BAD_RESPONSE', retryable: true };
      }

      // Sanitize search results
      const rawResults = Array.isArray(json?.results) ? json.results : [];
      const sanitizedResults = [];
      for (const item of rawResults) {
        if (!item || !isValidHttpsUrl(item.url)) continue;
        sanitizedResults.push({
          position: typeof item.position === 'number' ? item.position : sanitizedResults.length + 1,
          site_name: sanitizeText(item.site_name || '', 100),
          title: sanitizeText(item.title || '', 160),
          snippet: sanitizeText(item.snippet || '', 400),
          url: item.url.trim(),
          date: item.date ? sanitizeText(String(item.date), 40) : undefined,
          publisher: item.publisher ? sanitizeText(String(item.publisher), 100) : undefined
        });
      }

      const cleanData = {
        query: sanitizeText(json?.query || params.query || '', 200),
        results: sanitizedResults,
        total_results: typeof json?.total_results === 'number' ? json.total_results : sanitizedResults.length,
        page: typeof json?.page === 'number' ? json.page : 1
      };

      setCache(cacheKey, cleanData, opts.ttlSeconds);
      recordSuccess();
      return { ok: true, data: cleanData };
    } catch (err) {
      clearTimeout(timeoutHandle);
      const isAbort = err.name === 'AbortError' || err.message?.includes('aborted');
      const code = isAbort ? 'TIMEOUT' : 'UPSTREAM_ERROR';
      recordFailure(code, true);
      return cached ? { ok: true, data: cached.data, stale: true } : { ok: false, code, retryable: true };
    } finally {
      inflight.delete(cacheKey);
    }
  })();

  inflight.set(cacheKey, executionPromise);
  return executionPromise;
}

async function fetchPages(urls = [], opts = {}) {
  stats.calls++;

  if (process.env.TINYFISH_ENABLED !== 'true') {
    stats.failures.DISABLED++;
    return { ok: false, code: 'DISABLED', retryable: false };
  }

  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    stats.failures.NO_KEY++;
    return { ok: false, code: 'NO_KEY', retryable: false };
  }

  if (!checkCircuitBreaker()) {
    stats.failures.CIRCUIT_OPEN++;
    return { ok: false, code: 'CIRCUIT_OPEN', retryable: true };
  }

  // Validate and filter URLs (max 10, valid https)
  const validUrls = Array.isArray(urls)
    ? urls.filter(u => isValidHttpsUrl(u)).slice(0, 10)
    : [];

  if (validUrls.length === 0) {
    return { ok: true, data: { results: [], errors: [] } };
  }

  // Throttle check (counts URLs)
  const maxUrlsPerMin = parseInt(process.env.TINYFISH_MAX_FETCH_URLS_PER_MIN, 10) || 60;
  pruneSlidingWindow(fetchTimestamps);
  if (fetchTimestamps.length + validUrls.length > maxUrlsPerMin) {
    stats.failures.RATE_LIMITED++;
    return { ok: false, code: 'RATE_LIMITED', retryable: true };
  }

  const sortedUrlsKey = [...validUrls].sort().join(',');
  const cacheKey = `fetch:${sortedUrlsKey}:${opts.format || 'markdown'}`;

  const cached = getCache(cacheKey);
  if (cached && !cached.isExpired && !opts.skipCache) {
    stats.cacheHits++;
    return { ok: true, data: cached.data, cached: true };
  }

  if (inflight.has(cacheKey)) {
    return inflight.get(cacheKey);
  }

  const executionPromise = (async () => {
    const fetchBaseUrl = process.env.TINYFISH_FETCH_URL || 'https://api.fetch.tinyfish.ai';
    const timeoutMs = opts.timeoutMs || parseInt(process.env.TINYFISH_FETCH_TIMEOUT_MS, 10) || 20000;
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    for (let i = 0; i < validUrls.length; i++) {
      fetchTimestamps.push(Date.now());
    }

    try {
      const response = await fetch(fetchBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey.trim(),
          'User-Agent': 'FoodLoop-Hackathon/1.0'
        },
        body: JSON.stringify({
          urls: validUrls,
          format: opts.format || 'markdown',
          purpose: opts.purpose ? sanitizeText(opts.purpose, 200) : undefined,
          per_url_timeout_ms: opts.per_url_timeout_ms || 15000
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutHandle);

      if (response.status === 401) {
        recordFailure('UNAUTHORIZED', false);
        return cached ? { ok: true, data: cached.data, stale: true } : { ok: false, code: 'UNAUTHORIZED', retryable: false };
      }
      if (response.status === 402) {
        recordFailure('NO_CREDITS', false);
        return cached ? { ok: true, data: cached.data, stale: true } : { ok: false, code: 'NO_CREDITS', retryable: false };
      }
      if (response.status === 429) {
        recordFailure('RATE_LIMITED', true);
        return cached ? { ok: true, data: cached.data, stale: true } : { ok: false, code: 'RATE_LIMITED', retryable: true };
      }
      if (response.status === 400) {
        recordFailure('BAD_REQUEST', false);
        return { ok: false, code: 'BAD_REQUEST', retryable: false };
      }
      if (!response.ok) {
        recordFailure('UPSTREAM_ERROR', true);
        return cached ? { ok: true, data: cached.data, stale: true } : { ok: false, code: 'UPSTREAM_ERROR', retryable: true };
      }

      let json;
      try {
        json = await response.json();
      } catch {
        recordFailure('BAD_RESPONSE', true);
        return cached ? { ok: true, data: cached.data, stale: true } : { ok: false, code: 'BAD_RESPONSE', retryable: true };
      }

      // Sanitize fetch results
      const rawResults = Array.isArray(json?.results) ? json.results : [];
      const sanitizedResults = [];
      for (const res of rawResults) {
        if (!res || !isValidHttpsUrl(res.url)) continue;
        sanitizedResults.push({
          url: res.url.trim(),
          final_url: res.final_url && isValidHttpsUrl(res.final_url) ? res.final_url.trim() : res.url.trim(),
          title: sanitizeText(res.title || '', 160),
          description: sanitizeText(res.description || '', 400),
          language: sanitizeText(res.language || '', 10),
          text: sanitizeText(res.text || '', 20000),
          latency_ms: typeof res.latency_ms === 'number' ? res.latency_ms : 0,
          format: res.format || 'markdown'
        });
      }

      const rawErrors = Array.isArray(json?.errors) ? json.errors : [];
      const sanitizedErrors = rawErrors.map(errItem => ({
        url: sanitizeText(errItem?.url || '', 200),
        error: sanitizeText(errItem?.error || 'failed', 80),
        status: errItem?.status
      }));

      const cleanData = {
        results: sanitizedResults,
        errors: sanitizedErrors
      };

      setCache(cacheKey, cleanData, opts.ttlSeconds);
      recordSuccess();
      return { ok: true, data: cleanData };
    } catch (err) {
      clearTimeout(timeoutHandle);
      const isAbort = err.name === 'AbortError' || err.message?.includes('aborted');
      const code = isAbort ? 'TIMEOUT' : 'UPSTREAM_ERROR';
      recordFailure(code, true);
      return cached ? { ok: true, data: cached.data, stale: true } : { ok: false, code, retryable: true };
    } finally {
      inflight.delete(cacheKey);
    }
  })();

  inflight.set(cacheKey, executionPromise);
  return executionPromise;
}

function getStats() {
  return {
    calls: stats.calls,
    successes: stats.successes,
    failures: { ...stats.failures },
    cacheHits: stats.cacheHits,
    lastSuccessTime: stats.lastSuccessTime
  };
}

function _resetForTests() {
  cache.clear();
  inflight.clear();
  searchTimestamps.length = 0;
  fetchTimestamps.length = 0;
  consecutiveFailures = 0;
  circuitOpenUntil = 0;
  stats.calls = 0;
  stats.successes = 0;
  for (const k of Object.keys(stats.failures)) {
    stats.failures[k] = 0;
  }
  stats.cacheHits = 0;
  stats.lastSuccessTime = null;
}

module.exports = {
  isAvailable,
  search,
  fetchPages,
  getStats,
  _resetForTests,
  isValidHttpsUrl,
  sanitizeText
};
