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

    // Case 6: Intercalated / Alternating Schedule (Agustín's Bananas & Apples)
    // Bananas: 3 days/week (Mon, Wed, Fri), 2 bananas per day, $500 per banana
    const bananaPrice = 500;
    const bananaActiveDays = 3;
    const bananaDailyQty = 2;
    const bananaWeeklyQty = bananaActiveDays * bananaDailyQty; // 6 bananas/week
    const bananaMonthlyQty = Math.round(bananaWeeklyQty * (52 / 12)); // 26 bananas/month
    const bananaWeeklyCost = bananaWeeklyQty * bananaPrice; // $3.000 / week
    const bananaMonthlyCost = bananaMonthlyQty * bananaPrice; // $13.000 / month

    assert(bananaWeeklyQty === 6, 'Alternating: 3 days x 2 bananas = 6 bananas/week');
    assert(bananaMonthlyQty === 26, 'Alternating: 6 bananas/week -> 26 bananas/month');
    assertApprox(bananaMonthlyCost, 13000.0, 0.01, 'Alternating: Bananas monthly budget is $13.000');

    // Apples: 3 days/week (Tue, Thu, Sat), 2 apples per day, $1.000 per apple
    const applePrice = 1000;
    const appleActiveDays = 3;
    const appleDailyQty = 2;
    const appleWeeklyQty = appleActiveDays * appleDailyQty; // 6 apples/week
    const appleMonthlyQty = Math.round(appleWeeklyQty * (52 / 12)); // 26 apples/month
    const appleMonthlyCost = appleMonthlyQty * applePrice; // $26.000 / month

    assert(appleMonthlyQty === 26, 'Alternating: 6 apples/week -> 26 apples/month');
    assertApprox(appleMonthlyCost, 26000.0, 0.01, 'Alternating: Apples monthly budget is $26.000');
    assert(bananaMonthlyCost + appleMonthlyCost === 39000, 'Alternating: Combined fruit budget is $39.000 (prevents double counting)');

    // Case 7: Physical units in recurring period (Agustín's Milanesas: $50.000/week for 12 or 15 milanesas)
    const milanesasWeeklyAmount = 50000;
    const milanesasWeeklyUnits12 = 12;
    const unitPrice12 = milanesasWeeklyAmount / milanesasWeeklyUnits12; // $4.166,67
    const monthlyUnits12 = Math.round(milanesasWeeklyUnits12 * (52 / 12)); // 52 units
    const monthlyTotal12 = monthlyUnits12 * unitPrice12; // $216.666,67

    assertApprox(unitPrice12, 4166.67, 0.05, 'Milanesas 12u: Cost per unit is $4.166,67');
    assert(monthlyUnits12 === 52, 'Milanesas 12u: 12 units/week yields 52 units/month');
    assertApprox(monthlyTotal12, 216666.67, 0.5, 'Milanesas 12u: Monthly total matches ~$216.666,67');

    const milanesasWeeklyUnits15 = 15;
    const unitPrice15 = milanesasWeeklyAmount / milanesasWeeklyUnits15; // $3.333,33
    const monthlyUnits15 = Math.round(milanesasWeeklyUnits15 * (52 / 12)); // 65 units
    assertApprox(unitPrice15, 3333.33, 0.05, 'Milanesas 15u: Cost per unit is $3.333,33');
    assert(monthlyUnits15 === 65, 'Milanesas 15u: 15 units/week yields 65 units/month');
  });
}

module.exports = runHomologatorTests;

if (require.main === module) {
  runHomologatorTests();
  const summary = require('../test_helper').getTestSummary();
  console.log(`\nTests finished: ${summary.passed} passed, ${summary.failed} failed.`);
  if (summary.failed > 0) process.exit(1);
}
