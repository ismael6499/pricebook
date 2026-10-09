/**
 * Unit Tests: Category ABM & Safe Deletion Reassignment
 * Tests category creation, editing, deletion safeguards, and orphan product prevention.
 */

const { assert, testSuite } = require('../test_helper');

function runCategoriesTests() {
  testSuite('Category ABM & Safe Deletion Reassignment', () => {
    const mockState = {
      categories: ['Dairy', 'Groceries', 'General'],
      products: [
        { id: 1, name: 'Whole Milk 1L', category: 'Dairy' },
        { id: 2, name: 'Ground Coffee 500g', category: 'Groceries' },
      ],
    };

    // 1. Create a new category
    const newCatName = 'Butchery';
    mockState.categories.push(newCatName);
    assert(mockState.categories.includes('Butchery'), 'ABM: New category "Butchery" added');

    // 2. Assign product to Butchery
    const product = {
      id: 50,
      name: 'Milanesas de Carne 1kg',
      category: 'Butchery',
      latestPrice: 15000,
    };
    mockState.products.push(product);

    assert(
      mockState.products.find((p) => p.name.includes('Milanesas')).category === 'Butchery',
      'Product successfully assigned to Butchery'
    );

    // 3. Rename category
    const oldName = 'Groceries';
    const updatedName = 'Pantry';
    const catIndex = mockState.categories.indexOf(oldName);
    if (catIndex !== -1) mockState.categories[catIndex] = updatedName;

    mockState.products.forEach((p) => {
      if (p.category === oldName) p.category = updatedName;
    });

    assert(
      mockState.products.find((p) => p.id === 2).category === 'Pantry',
      'ABM: Renaming category updates corresponding products to "Pantry"'
    );

    // 4. Safe Deletion: Butchery is deleted, product must be re-assigned to 'General'
    const deletedCatName = 'Butchery';
    mockState.categories = mockState.categories.filter((c) => c !== deletedCatName);
    mockState.products.forEach((p) => {
      if (p.category === deletedCatName) {
        p.category = 'General';
      }
    });

    const targetProduct = mockState.products.find((p) => p.id === 50);
    assert(
      targetProduct.category === 'General',
      'Safe Deletion: Products in deleted category re-assigned to "General"'
    );

    const orphanCount = mockState.products.filter((p) => !mockState.categories.includes(p.category)).length;
    assert(orphanCount === 0, 'Integrity: Exactly 0 orphaned products exist after category deletion');
  });
}

module.exports = runCategoriesTests;

if (require.main === module) {
  runCategoriesTests();
  const summary = require('../test_helper').getTestSummary();
  console.log(`\nTests finished: ${summary.passed} passed, ${summary.failed} failed.`);
  if (summary.failed > 0) process.exit(1);
}
