/**
 * Unit Tests: Spending Homologator & Frequency Engine
 * Tests math formulas for weekly, daily, monthly, and custom N-day periods.
 */

const { assert, assertApprox, testSuite } = require('../test_helper');

function runHomologatorTests() {
  testSuite('Spending Homologator & Frequency Engine', () => {
    // Case 1: Mom's case: "$15.000 per week"
    const amountWeekly = 15000;
    const dayCost = amountWeekly / 7;
    const weekCost = amountWeekly;
    const month30Cost = (amountWeekly / 7) * 30;
    const month31Cost = (amountWeekly / 7) * 31;
    const monthAvgCost = amountWeekly * (52 / 12); // ~4.3333 weeks = $65.000

    assertApprox(dayCost, 2142.86, 0.05, 'Weekly: Day cost of $15.000/week is $2.142,86');
    assertApprox(weekCost, 15000.0, 0.01, 'Weekly: Week cost is exactly $15.000,00');
    assertApprox(month30Cost, 64285.71, 0.05, 'Weekly: 30-day month cost is $64.285,71');
    assertApprox(month31Cost, 66428.57, 0.05, 'Weekly: 31-day month cost is $66.428,57');
    assertApprox(monthAvgCost, 65000.0, 0.01, 'Weekly: Calendar average month (4.33 wks) is $65.000,00');

    // Case 2: Daily bread: "$2.500 per day"
    const dailyAmount = 2500;
    const dailyWeek = dailyAmount * 7;
    const dailyMonth30 = dailyAmount * 30;
    const dailyMonth31 = dailyAmount * 31;
    const dailyMonthAvg = dailyAmount * 30.4167;
    assertApprox(dailyWeek, 17500.0, 0.01, 'Daily: 7 days is $17.500');
    assertApprox(dailyMonth30, 75000.0, 0.01, 'Daily: 30-day month is $75.000');
    assertApprox(dailyMonth31, 77500.0, 0.01, 'Daily: 31-day month is $77.500');
    assertApprox(dailyMonthAvg, 76041.75, 0.5, 'Daily: Calendar avg month is $76.041,75');

    // Case 3: Custom interval: "$9.000 every 3 days"
    const customAmount = 9000;
    const customInterval = 3;
    const customDay = customAmount / customInterval;
    const customWeek = customDay * 7;
    const customMonth30 = customDay * 30;
    const customMonth31 = customDay * 31;
    const customMonthAvg = customDay * 30.4167;
    const customPlanQty = 30.4167 / customInterval;
    assertApprox(customDay, 3000.0, 0.01, 'Custom: $9.000 every 3 days -> $3.000/day');
    assertApprox(customWeek, 21000.0, 0.01, 'Custom: $9.000 every 3 days -> $21.000/week');
    assertApprox(customMonth30, 90000.0, 0.01, 'Custom: $9.000 every 3 days -> $90.000/month (30d)');
    assertApprox(customMonth31, 93000.0, 0.01, 'Custom: $9.000 every 3 days -> $93.000/month (31d)');
    assertApprox(customMonthAvg, 91250.1, 0.5, 'Custom: $9.000 every 3 days -> $91.250/month (avg)');
    assertApprox(customPlanQty, 10.14, 0.05, 'Custom: 3 days period yields ~10.14 purchases/month');

    // Case 4: Monthly fixed: "$80.000 per month"
    const monthlyAmount = 80000;
    const monthlyDay = monthlyAmount / 30.4167;
    const monthlyWeek = monthlyDay * 7;
    const monthlyPlanQty = 1;
    assertApprox(monthlyDay, 2630.13, 0.5, 'Monthly: $80.000/month -> $2.630,13/day');
    assertApprox(monthlyWeek, 18410.9, 0.5, 'Monthly: $80.000/month -> $18.410,90/week');
    assert(monthlyPlanQty === 1, 'Monthly: Monthly plan item quantity is exactly 1');

    // Case 5: Biweekly interval: "$35.000 every 14 days"
    const biweeklyAmount = 35000;
    const biweeklyDay = biweeklyAmount / 14;
    const biweeklyWeek = biweeklyDay * 7;
    const biweeklyMonthAvg = biweeklyDay * 30.4167;
    assertApprox(biweeklyDay, 2500.0, 0.01, 'Biweekly: $35.000 every 14 days -> $2.500/day');
    assertApprox(biweeklyWeek, 17500.0, 0.01, 'Biweekly: $35.000 every 14 days -> $17.500/week');
    assertApprox(biweeklyMonthAvg, 76041.75, 0.5, 'Biweekly: $35.000 every 14 days -> $76.041,75/month');
  });
}

module.exports = runHomologatorTests;

if (require.main === module) {
  runHomologatorTests();
  const summary = require('../test_helper').getTestSummary();
  console.log(`\nTests finished: ${summary.passed} passed, ${summary.failed} failed.`);
  if (summary.failed > 0) process.exit(1);
}
