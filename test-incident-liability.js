// Standalone unit test for resolveIncidentLiability business rule
// Run with: node test-incident-liability.js

const { resolveIncidentLiability } = require('./server.js');

function runTests() {
  console.log('==================================================');
  console.log('🧪 RUNNING INCIDENT LIABILITY RESOLUTION TESTS');
  console.log('==================================================\n');

  let passed = 0;
  let total = 0;

  function assert(label, condition, details) {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ PASS: ${label}`);
    } else {
      console.error(`❌ FAIL: ${label}\n   Details: ${JSON.stringify(details)}`);
    }
  }

  // Test Case 1: Donor agrees + Mild severity (non-serious)
  // Expected: Donor owes 100%, Platform contribution 0%, No legal escalation
  const res1 = resolveIncidentLiability(
    { severity: 'Mild (no medical attention needed)' },
    10000,
    true
  );
  assert(
    'Case 1: Donor Agrees + Mild Severity (100% Donor, 0% Platform, No Escalation)',
    res1.donorOwes === 10000 &&
    res1.platformContribution === 0 &&
    res1.legalEscalation === false &&
    res1.legalBasis.length === 0,
    res1
  );

  // Test Case 2: Donor agrees + Life-threatening severity (serious life risk)
  // Expected: Serious incident overrides donor agreement -> 80% donor, 20% platform, Legal escalation with citations
  const res2 = resolveIncidentLiability(
    { severity: 'Life-threatening (ICU / death)' },
    50000,
    true
  );
  assert(
    'Case 2: Donor Agrees + Life-threatening Severity (80% Donor, 20% Platform, Escalated)',
    res2.donorOwes === 40000 &&
    res2.platformContribution === 10000 &&
    res2.legalEscalation === true &&
    res2.legalBasis.includes('BNS Section 274') &&
    res2.legalBasis.includes('BNS Section 275') &&
    res2.legalBasis.includes('FSSA Section 59'),
    res2
  );

  // Test Case 3: Donor refuses + Mild severity
  // Expected: Donor refusal triggers 20% safety net + legal escalation
  const res3 = resolveIncidentLiability(
    { severity: 'Mild (no medical attention needed)' },
    20000,
    false
  );
  assert(
    'Case 3: Donor Refuses + Mild Severity (80% Donor, 20% Platform, Escalated)',
    res3.donorOwes === 16000 &&
    res3.platformContribution === 4000 &&
    res3.legalEscalation === true &&
    res3.legalBasis.length === 3,
    res3
  );

  // Test Case 4: Donor refuses + Life-threatening severity
  // Expected: 80% donor, 20% platform, Legal escalation with citations
  const res4 = resolveIncidentLiability(
    { severity: 'Life-threatening (ICU / death)' },
    100000,
    false
  );
  assert(
    'Case 4: Donor Refuses + Life-threatening Severity (80% Donor, 20% Platform, Escalated)',
    res4.donorOwes === 80000 &&
    res4.platformContribution === 20000 &&
    res4.legalEscalation === true &&
    res4.legalBasis.length === 3,
    res4
  );

  // Bonus Case 5: Donor agrees + Severe (hospitalization required)
  // Expected: Serious life risk (hospitalization) -> 80% donor, 20% platform, Legal escalation
  const res5 = resolveIncidentLiability(
    { severity: 'Severe (hospitalization required)' },
    60000,
    true
  );
  assert(
    'Case 5: Donor Agrees + Severe Hospitalization (80% Donor, 20% Platform, Escalated)',
    res5.donorOwes === 48000 &&
    res5.platformContribution === 12000 &&
    res5.legalEscalation === true &&
    res5.legalBasis.length === 3,
    res5
  );

  // Bonus Case 6: Donor agrees + Moderate outpatient treatment (non-serious)
  // Expected: 100% donor, 0% platform, No legal escalation
  const res6 = resolveIncidentLiability(
    { severity: 'Moderate (outpatient treatment)' },
    5000,
    true
  );
  assert(
    'Case 6: Donor Agrees + Moderate Outpatient (100% Donor, 0% Platform, No Escalation)',
    res6.donorOwes === 5000 &&
    res6.platformContribution === 0 &&
    res6.legalEscalation === false,
    res6
  );

  console.log('\n==================================================');
  console.log(`📊 TEST RESULTS: ${passed}/${total} passed (${((passed/total)*100).toFixed(0)}%)`);
  console.log('==================================================');

  if (passed !== total) {
    process.exit(1);
  }
  process.exit(0);
}

// Only execute test suite directly when run via CLI
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
