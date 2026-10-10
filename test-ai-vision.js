// Legacy test migrated to offline-first test suite
// Run full test suite with: npm test
const { spawnSync } = require('child_process');
console.log('🔄 Delegating test-ai-vision.js to tests/legacy-migrated.test.js...\n');
const res = spawnSync(process.execPath, ['--test', 'tests/legacy-migrated.test.js'], { stdio: 'inherit' });
process.exit(res.status || 0);
