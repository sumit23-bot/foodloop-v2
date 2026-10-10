// Legacy test migrated to offline-first test suite
// Run full test suite with: npm test
const { spawnSync } = require('child_process');
console.log('🔄 Delegating test-a1.js to tests/ai-group-e.test.js...\n');
const res = spawnSync(process.execPath, ['--test', 'tests/ai-group-e.test.js'], { stdio: 'inherit' });
process.exit(res.status || 0);
