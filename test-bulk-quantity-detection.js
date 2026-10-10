// Legacy test migrated to offline-first test suite
// Run full test suite with: npm test
const { spawnSync } = require('child_process');
console.log('🔄 Delegating test-bulk-quantity-detection.js to tests/donations-group-c.test.js...\n');
const res = spawnSync(process.execPath, ['--test', 'tests/donations-group-c.test.js'], { stdio: 'inherit' });
process.exit(res.status || 0);
