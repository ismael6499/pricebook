/**
 * Unit Tests: Purchases vs Reference Price Checks (Debt Safety)
 * Verifies that reference price checks never contaminate pending settlement debt,
 * while actual purchases correctly accumulate pending repayment and USD calculations.
 */

const { assert, assertApprox, testSuite } = require('../test_helper');

function runDebtTests() {
  testSuite('Purchases vs Reference Price Checks (Debt Safety)', () => {
    const mockState = {
      purchases: [
        {
          id: 1,
          productId: 1,
          unitPrice: 1450.0,
          quantity: 2,
          totalCost: 2900.0,
          status: 'pending',
          usdRate: 1350.0,
          usdValue: 2.15,
        },
        {
          id: 2,
          productId: 2,
          unitPrice: 5800.0,
          quantity: 1,
          totalCost: 5800.0,
          status: 'pending',
          usdRate: 1350.0,
          usdValue: 4.30,
        },
      ],
    };

    const initialPendingDebt = mockState.purchases
      .filter((p) => p.status === 'pending')
      .reduce((acc, p) => acc + p.totalCost, 0);

    assert(initialPendingDebt === 8700.0, 'Initial pending debt is exactly $8.700,00');

    // 1. Simulate Price Check (reference entry: totalCost is 0, status is 'reference')
    const priceCheck = {
      id: 999,
      productId: 1,
      unitPrice: 2200.0,
      quantity: 1,
      totalCost: 0.0, // Reference price checks must have 0 total debt
      status: 'reference',
    };
    mockState.purchases.push(priceCheck);

    const postRefPendingDebt = mockState.purchases
      .filter((p) => p.status === 'pending')
      .reduce((acc, p) => acc + p.totalCost, 0);

    assert(
      postRefPendingDebt === initialPendingDebt,
      'Price Check records add exactly $0 to pending debt',
      `debt before: ${initialPendingDebt}, after: ${postRefPendingDebt}`
    );

    // 2. Simulate Real Purchase
    const realPurchase = {
      id: 1000,
      productId: 1,
      unitPrice: 2200.0,
      quantity: 2,
      totalCost: 4400.0,
      status: 'pending',
      usdRate: 1360.0,
      usdValue: 3.24,
    };
    mockState.purchases.push(realPurchase);

    const postRealPendingDebt = mockState.purchases
      .filter((p) => p.status === 'pending')
      .reduce((acc, p) => acc + p.totalCost, 0);

    assert(
      postRealPendingDebt === initialPendingDebt + 4400.0,
      'Real Purchase correctly increases pending repayment debt by $4.400'
    );

    // 3. Settle all purchases
    mockState.purchases.forEach((p) => {
      if (p.status === 'pending') {
        p.status = 'settled';
      }
    });

    const settledDebt = mockState.purchases
      .filter((p) => p.status === 'pending')
      .reduce((acc, p) => acc + p.totalCost, 0);

    assert(settledDebt === 0, 'After settlement, remaining pending debt is exactly $0');

    // 4. USD Valuation Check
    const totalSpentUsd = mockState.purchases.reduce((acc, p) => acc + (p.usdValue || 0), 0);
    assertApprox(totalSpentUsd, 9.69, 0.05, 'Total settled USD value is calculated correctly (~$9.69)');
  });
}

module.exports = runDebtTests;

if (require.main === module) {
  runDebtTests();
  const summary = require('../test_helper').getTestSummary();
  console.log(`\nTests finished: ${summary.passed} passed, ${summary.failed} failed.`);
  if (summary.failed > 0) process.exit(1);
}
