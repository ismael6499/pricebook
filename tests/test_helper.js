/**
 * Test Helper for PriceBook In-Memory Unit Tests
 */

let passedCount = 0;
let failedCount = 0;

function resetStats() {
  passedCount = 0;
  failedCount = 0;
}

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName} ${details ? '(' + details + ')' : ''}`);
    failedCount++;
  }
}

function assertApprox(actual, expected, tolerance, testName) {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    console.log(`  ✅ [PASS] ${testName} [actual: ${actual.toFixed(2)}, expected: ${expected.toFixed(2)}]`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName} [actual: ${actual.toFixed(2)}, expected: ${expected.toFixed(2)}, diff: ${diff.toFixed(2)}]`);
    failedCount++;
  }
}

function testSuite(name, fn) {
  console.log(`\n▶ [Suite] ${name}`);
  fn();
}

function getTestSummary() {
  return {
    passed: passedCount,
    failed: failedCount,
    total: passedCount + failedCount,
  };
}

module.exports = {
  assert,
  assertApprox,
  testSuite,
  getTestSummary,
  resetStats,
};
