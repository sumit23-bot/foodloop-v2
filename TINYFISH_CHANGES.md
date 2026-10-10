# TinyFish API Integration

### Summary
Integrated TinyFish Web Intelligence API into FoodLoop for live food-waste news, food-safety grounded chat, NGO web footprint verification, and gaushala/shelter partner search.

### Files Added
- `services/tinyfish.js`
- `services/chatGrounding.js`
- `routes/tinyfish.js`
- `scripts/tinyfish-smoke.js`
- `tests/tinyfish.test.js`
- `client/src/components/tinyfish/tinyfish.css`
- `client/src/components/tinyfish/TinyFishErrorBoundary.jsx`
- `client/src/components/tinyfish/useTinyFishStatus.js`
- `client/src/components/tinyfish/TinyFishBadge.jsx`
- `client/src/components/tinyfish/LiveNewsTicker.jsx`
- `client/src/components/tinyfish/NgoWebCheck.jsx`
- `client/src/components/tinyfish/PartnerFinder.jsx`

### Files Modified
- `.env.example`
- `.gitignore`
- `server.js`
- `package.json`
- `client/src/App.jsx`
- `client/src/components/GeminiChatWidget.jsx`
- `client/src/components/Modals.jsx`
- `client/src/components/RescueFeeds.jsx`

### Env Vars
`TINYFISH_ENABLED`, `TINYFISH_API_KEY`, `TINYFISH_SEARCH_URL`, `TINYFISH_FETCH_URL`, `TINYFISH_SEARCH_TIMEOUT_MS`, `TINYFISH_FETCH_TIMEOUT_MS`, `TINYFISH_CACHE_TTL_SECONDS`, `TINYFISH_MAX_SEARCH_PER_MIN`, `TINYFISH_MAX_FETCH_URLS_PER_MIN`.

### Fallback Behaviour
All TinyFish routes return HTTP 200 with `{ available: false }` or empty items on error, timeout, rate limit, or disabled flag. Core app operations (donations, claims, QR, disputes, chat, payments) function normally even if TinyFish is unreachable.

### How to Revert
1. Runtime: set `TINYFISH_ENABLED=false` in `.env`.
2. Git (before push): `git reset --hard pre-tinyfish-main-20261010-1808`
3. Git (after push): `git revert HEAD`

### Noticed, Not Fixed
- `client/dist` chunks warning for large bundles (>500kB) in Vite build output.
- Minor deprecated geolocation fallback warning on insecure origins in older browsers.

### Test Results
- Smoke test: PASS (Search returned 10 results in 1633ms, Fetch succeeded in 1241ms).
- Unit test suite (`npm run test:tinyfish`): 9/9 tests passed (service, circuit breaker, rate limit, sanitization, grounding gate, route validation, auth, strict NGO whole-word context matching).
- Live endpoints verification: PASS (/status 200, /news 6 articles, /ngo-check Goonj & Robin Hood Army HIGH, xyzzz LOW, food safety chat sources grounded, general chat ungrounded).
