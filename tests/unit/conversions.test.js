/**
 * Unit Tests: Unit, Grams, Weight & Package Equivalences
 * Tests calculations for price per 100g, 1kg, individual units, and package optimizations.
 */

const { assert, assertApprox, testSuite } = require('../test_helper');

function runConversionsTests() {
  testSuite('Unit, Grams & Package Equivalences', () => {
    // 1. Grams to kg and 100g conversions (e.g. 1.2kg package for $15.000)
    const pkgPrice = 15000;
    const pkgGrams = 1200; // 1.2 kg
    const pkgUnits = 12; // 12 units (e.g. 12 milanesas)

    const cost100g = (pkgPrice / pkgGrams) * 100;
    const costKg = (pkgPrice / pkgGrams) * 1000;
    const costUnit = pkgPrice / pkgUnits;

    assertApprox(cost100g, 1250.0, 0.01, 'Weight: $15.000 for 1200g -> $1.250 per 100g');
    assertApprox(costKg, 12500.0, 0.01, 'Weight: $15.000 for 1200g -> $12.500 per 1kg');
    assertApprox(costUnit, 1250.0, 0.01, 'Unit: $15.000 for 12 units -> $1.250 per unit');

    // 2. Package comparison: 500g for $4.200 vs 1kg for $7.800
    const pkgA_Price = 4200;
    const pkgA_Grams = 500;
    const pkgA_KgCost = (pkgA_Price / pkgA_Grams) * 1000; // $8.400 / kg

    const pkgB_Price = 7800;
    const pkgB_Grams = 1000;
    const pkgB_KgCost = (pkgB_Price / pkgB_Grams) * 1000; // $7.800 / kg

    assertApprox(pkgA_KgCost, 8400.0, 0.01, 'Comparison: Package A 500g is $8.400/kg');
    assertApprox(pkgB_KgCost, 7800.0, 0.01, 'Comparison: Package B 1kg is $7.800/kg');
    assert(pkgB_KgCost < pkgA_KgCost, 'Comparison: Package B is more economical per kg');

    // 3. Small units: 6-egg pack ($1.800) vs 30-egg tray ($7.500)
    const eggs6_Price = 1800;
    const eggs6_Unit = eggs6_Price / 6; // $300 / unit

    const eggs30_Price = 7500;
    const eggs30_Unit = eggs30_Price / 30; // $250 / unit

    assertApprox(eggs6_Unit, 300.0, 0.01, 'Eggs: 6 pack costs $300 per unit');
    assertApprox(eggs30_Unit, 250.0, 0.01, 'Eggs: 30 tray costs $250 per unit');
    assert(eggs30_Unit < eggs6_Unit, 'Eggs: Tray saves $50 per unit');

    // 4. Volume / Liquids: Cooking oil (900ml for $2.700 vs 1.5L for $4.200)
    const oil900_Price = 2700;
    const oil900_Ml = 900;
    const oil900_100ml = (oil900_Price / oil900_Ml) * 100; // $300 / 100ml
    const oil900_1L = (oil900_Price / oil900_Ml) * 1000;  // $3.000 / 1L

    const oil1500_Price = 4200;
    const oil1500_Ml = 1500;
    const oil1500_100ml = (oil1500_Price / oil1500_Ml) * 100; // $280 / 100ml
    const oil1500_1L = (oil1500_Price / oil1500_Ml) * 1000;  // $2.800 / 1L

    assertApprox(oil900_100ml, 300.0, 0.01, 'Volume: 900ml oil at $2.700 -> $300 per 100ml');
    assertApprox(oil900_1L, 3000.0, 0.01, 'Volume: 900ml oil at $2.700 -> $3.000 per 1L');
    assertApprox(oil1500_100ml, 280.0, 0.01, 'Volume: 1.5L oil at $4.200 -> $280 per 100ml');
    assertApprox(oil1500_1L, 2800.0, 0.01, 'Volume: 1.5L oil at $4.200 -> $2.800 per 1L');
    assert(oil1500_1L < oil900_1L, 'Volume: 1.5L bottle saves $200 per liter over deceptive 900ml bottle');

    // 5. Multi-pack volume: 6 cans of 473ml beer ($7.200)
    const packPrice = 7200;
    const canMl = 473;
    const packCans = 6;
    const totalMl = canMl * packCans; // 2838 ml
    const beerCostPer100ml = (packPrice / totalMl) * 100; // ~253.70
    const beerCostPerLiter = (packPrice / totalMl) * 1000; // ~2537.00
    const beerCostPerCan = packPrice / packCans; // $1.200

    assertApprox(beerCostPer100ml, 253.70, 0.05, 'Volume Pack: 6x473ml beer -> ~$253,70 per 100ml');
    assertApprox(beerCostPerLiter, 2536.99, 0.1, 'Volume Pack: 6x473ml beer -> ~$2.537 per 1L');
    assertApprox(beerCostPerCan, 1200.0, 0.01, 'Volume Pack: Beer cost per individual can is $1.200');
  });
}

module.exports = runConversionsTests;

if (require.main === module) {
  runConversionsTests();
  const summary = require('../test_helper').getTestSummary();
  console.log(`\nTests finished: ${summary.passed} passed, ${summary.failed} failed.`);
  if (summary.failed > 0) process.exit(1);
}
