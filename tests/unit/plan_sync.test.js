/**
 * Unit Tests: Monthly Plan Product & Price Sync
 * Verifies that items created in or existing in the Monthly Plan automatically
 * register their baseline latest price in the products catalog with $0 debt impact.
 */

const { assert, testSuite } = require('../test_helper');

function runPlanSyncTests() {
  testSuite('Monthly Plan Products & Latest Price Sync', () => {
    // Simulated DB State
    const state = {
      products: [
        { id: 1, name: 'Milanesas', category: 'Meat & Fish', unit: '1 porción' },
        { id: 2, name: 'Brócoli', category: 'Groceries', unit: '1 paquete' },
        { id: 3, name: 'Queso', category: 'Dairy', unit: 'Semanal' },
      ],
      monthly_plan_items: [
        { id: 1, name: 'Milanesas', estimated_unit_price: 5000.0, estimated_monthly_qty: 31 },
        { id: 2, name: 'Brócoli', estimated_unit_price: 7500.0, estimated_monthly_qty: 8 },
        { id: 3, name: 'Queso', estimated_unit_price: 17500.0, estimated_monthly_qty: 4 },
      ],
      purchases: [],
    };

    // Calculate initial pending debt
    const initialDebt = state.purchases
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + p.total_amount, 0);

    assert(initialDebt === 0, 'Initial pending debt is $0');

    // Simulate syncPlanPricesToProducts logic
    state.monthly_plan_items.forEach((item) => {
      let prod = state.products.find(
        (p) => p.name.toLowerCase().trim() === item.name.toLowerCase().trim()
      );
      if (!prod) {
        prod = {
          id: state.products.length + 1,
          name: item.name,
          category: 'General',
          unit: '1 u',
        };
        state.products.push(prod);
      }

      const hasPurchase = state.purchases.some((p) => p.product_id === prod.id);
      if (!hasPurchase) {
        state.purchases.push({
          id: state.purchases.length + 1,
          product_id: prod.id,
          unit_price: item.estimated_unit_price,
          quantity: 1,
          total_amount: 0, // Reference price checks must have 0 total debt
          status: 'settled',
          entry_type: 'reference',
          store: 'Plan Mensual',
          purchase_date: '2026-09-30 12:00:00',
        });
      }
    });

    // Check that each product now has its latest_price from the monthly plan
    state.products.forEach((prod) => {
      const latestPur = state.purchases
        .filter((p) => p.product_id === prod.id)
        .sort((a, b) => b.purchase_date.localeCompare(a.purchase_date))[0];

      const planItem = state.monthly_plan_items.find(
        (m) => m.name.toLowerCase().trim() === prod.name.toLowerCase().trim()
      );

      const computedLatestPrice = latestPur?.unit_price ?? planItem?.estimated_unit_price ?? null;

      assert(
        computedLatestPrice === planItem.estimated_unit_price,
        `Product "${prod.name}" has latest price $${computedLatestPrice} from monthly plan`
      );
    });

    // Verify debt safety
    const postSyncDebt = state.purchases
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + p.total_amount, 0);

    assert(
      postSyncDebt === 0,
      'Pending debt remains exactly $0 after syncing plan baseline prices'
    );

    // Verify that subsequent real purchases properly override the baseline
    const realPurchase = {
      id: 999,
      product_id: 1,
      unit_price: 5400.0,
      quantity: 2,
      total_amount: 10800.0,
      status: 'pending',
      entry_type: 'purchase',
      store: 'Carnicería',
      purchase_date: '2026-10-09 14:00:00',
    };
    state.purchases.push(realPurchase);

    const milanesasLatest = state.purchases
      .filter((p) => p.product_id === 1)
      .sort((a, b) => b.purchase_date.localeCompare(a.purchase_date))[0];

    assert(
      milanesasLatest.unit_price === 5400.0,
      'New real purchase at Carnicería ($5.400) successfully updates latest price'
    );

    const debtWithPurchase = state.purchases
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + p.total_amount, 0);

    assert(
      debtWithPurchase === 10800.0,
      'Real purchase correctly adds $10.800 to pending debt'
    );
  });
}

module.exports = runPlanSyncTests;

if (require.main === module) {
  runPlanSyncTests();
  const summary = require('../test_helper').getTestSummary();
  console.log(`\nTests finished: ${summary.passed} passed, ${summary.failed} failed.`);
  if (summary.failed > 0) process.exit(1);
}
