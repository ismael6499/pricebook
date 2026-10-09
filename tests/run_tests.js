/**
 * PriceBook Unit Test Runner
 * Executes all modular test suites in tests/unit/ and reports results.
 *
 * Usage:
 *   node tests/run_tests.js
 *   node tests/run_tests.js tests/unit/homologator.test.js
 */

const fs = require('fs');
const path = require('path');
const { getTestSummary, resetStats } = require('./test_helper');

function runAllTests() {
  const startTime = Date.now();
  resetStats();

  console.log('====================================================');
  console.log('         PriceBook Modular Unit Test Suite          ');
  console.log('====================================================');

  const unitDir = path.join(__dirname, 'unit');
  const targetArg = process.argv[2];

  let testFiles = [];
  if (targetArg && fs.existsSync(targetArg)) {
    testFiles = [path.resolve(targetArg)];
  } else {
    testFiles = fs
      .readdirSync(unitDir)
      .filter((file) => file.endsWith('.test.js'))
      .map((file) => path.join(unitDir, file));
  }

  testFiles.forEach((file) => {
    try {
      const suiteFn = require(file);
      if (typeof suiteFn === 'function') {
        suiteFn();
      }
    } catch (err) {
      console.error(`\n❌ Error executing test file: ${path.basename(file)}`);
      console.error(err);
    }
  });

  const durationMs = Date.now() - startTime;
  const summary = getTestSummary();

  console.log('\n----------------------------------------------------');
  console.log(`Unit Tests Summary: ${summary.passed} passed, ${summary.failed} failed (${durationMs}ms).`);

  if (summary.failed > 0) {
    console.error('❌ Some unit tests failed!\n');
    if (require.main === module) {
      process.exit(1);
    }
    return false;
  } else {
    console.log('🎉 All in-memory unit tests PASSED successfully!\n');
    return true;
  }
}

module.exports = runAllTests;

if (require.main === module) {
  runAllTests();
}
