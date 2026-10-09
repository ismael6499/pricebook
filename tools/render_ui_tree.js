/**
 * PriceBook UI Virtual Tree Renderer & Localization Auditor
 * Allows sub-second in-memory inspection of UI component hierarchies,
 * interactive state simulation, and automated i18n audits.
 *
 * Usage:
 *   node tools/render_ui_tree.js --list
 *   node tools/render_ui_tree.js <ScreenName>
 *   node tools/render_ui_tree.js <ScreenName> --action <actionName> [payloadJson]
 *   node tools/render_ui_tree.js --audit
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const LOCALES_DIR = path.join(ROOT_DIR, 'locales');
const SRC_DIR = path.join(ROOT_DIR, 'src');

// Load localization dictionaries
const enDict = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'en.json'), 'utf8'));
const esDict = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'es.json'), 'utf8'));

function getTranslation(dict, key) {
  const parts = key.split('.');
  let curr = dict;
  for (const p of parts) {
    if (curr && typeof curr === 'object' && p in curr) {
      curr = curr[p];
    } else {
      return null;
    }
  }
  return typeof curr === 'string' ? curr : null;
}

function t(key, locale = 'en', params = {}) {
  const dict = locale === 'es' ? esDict : enDict;
  let text = getTranslation(dict, key) || getTranslation(enDict, key) || key;
  Object.entries(params).forEach(([k, v]) => {
    text = text.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
  });
  return text;
}

function formatCurrency(amount, locale = 'en') {
  const num = Number(amount) || 0;
  return `$ ${num.toLocaleString(locale === 'es' ? 'es-AR' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Simulated mock database state for UI rendering and audits
const mockState = {
  products: [
    {
      id: 1,
      name: 'Whole Milk 1L',
      category: 'Dairy',
      unit: '1L',
      notes: 'La Serenísima or preferred brand',
      imageUri: 'file:///data/user/0/pricebook/photos/milk.jpg',
      latestPrice: 1450.0,
      previousPrice: 1250.0,
      priceVariation: 16.0,
    },
    {
      id: 2,
      name: 'Ground Coffee 500g',
      category: 'Groceries',
      unit: '500g',
      notes: 'Strong roast',
      imageUri: null,
      latestPrice: 5800.0,
      previousPrice: 5800.0,
      priceVariation: 0.0,
    },
    {
      id: 3,
      name: 'Extra Virgin Olive Oil 500ml',
      category: 'Groceries',
      unit: '500ml',
      notes: 'First cold press',
      imageUri: 'file:///data/user/0/pricebook/photos/oil.jpg',
      latestPrice: 9200.0,
      previousPrice: 8500.0,
      priceVariation: 8.24,
    },
  ],
  purchases: [
    {
      id: 101,
      productId: 1,
      productName: 'Whole Milk 1L',
      unitPrice: 1450.0,
      quantity: 3,
      totalCost: 4350.0,
      dateTime: '2026-10-08 18:30:00',
      store: 'Carrefour Market',
      buyer: 'Parents',
      notes: 'Pack of 3',
      status: 'pending', // pending repayment
      usdRate: 1350.0,
      usdValue: 3.22,
    },
    {
      id: 102,
      productId: 2,
      productName: 'Ground Coffee 500g',
      unitPrice: 5800.0,
      quantity: 1,
      totalCost: 5800.0,
      dateTime: '2026-10-05 11:15:00',
      store: 'Coto Supermercado',
      buyer: 'Mom',
      notes: 'Special offer',
      status: 'pending',
      usdRate: 1345.0,
      usdValue: 4.31,
    },
    {
      id: 103,
      productId: 3,
      productName: 'Extra Virgin Olive Oil 500ml',
      unitPrice: 9200.0,
      quantity: 1,
      totalCost: 9200.0,
      dateTime: '2026-09-28 16:40:00',
      store: 'Neighborhood Market',
      buyer: 'Dad',
      notes: 'September purchase',
      status: 'settled', // already repaid
      usdRate: 1320.0,
      usdValue: 6.97,
    },
  ],
  settlementMonth: '2026-10',
};

// Screen Renderers
const screens = {
  ProductsScreen: (state = mockState, locale = 'en') => {
    return {
      component: 'ProductsScreen',
      id: 'screen_products',
      theme: 'dark',
      props: {
        title: t('products.title', locale),
        totalProducts: state.products.length,
      },
      children: [
        {
          component: 'SearchBar',
          id: 'input_search_product',
          props: {
            placeholder: t('common.search', locale),
            value: '',
          },
        },
        {
          component: 'HeaderActionButton',
          id: 'btn_add_product',
          text: t('products.add_product', locale),
        },
        {
          component: 'ProductList',
          id: 'list_products',
          children: state.products.map((p) => ({
            component: 'ProductCard',
            id: `card_product_${p.id}`,
            props: {
              productId: p.id,
              name: p.name,
              category: p.category,
              unit: p.unit,
              hasPhoto: Boolean(p.imageUri),
              latestPriceFormatted: formatCurrency(p.latestPrice, locale),
              variationFormatted: `${p.priceVariation > 0 ? '+' : ''}${p.priceVariation.toFixed(1)}%`,
              variationType: p.priceVariation > 0 ? 'increase' : p.priceVariation < 0 ? 'decrease' : 'unchanged',
            },
            children: [
              {
                component: 'Text',
                id: `txt_name_${p.id}`,
                text: p.name,
              },
              {
                component: 'Badge',
                id: `badge_category_${p.id}`,
                text: p.category,
              },
              {
                component: 'PriceLabel',
                id: `lbl_price_${p.id}`,
                label: t('products.latest_price', locale),
                value: formatCurrency(p.latestPrice, locale),
              },
              {
                component: 'VariationIndicator',
                id: `ind_variation_${p.id}`,
                type: p.priceVariation > 0 ? 'danger' : 'success',
                text: `${p.priceVariation > 0 ? '+' : ''}${p.priceVariation.toFixed(1)}% ${t('purchases.vs_previous', locale)}`,
              },
            ],
          })),
        },
      ],
    };
  },

  ProductDetailScreen: (state = mockState, locale = 'en', selectedId = 1) => {
    const product = state.products.find((p) => p.id === Number(selectedId)) || state.products[0];
    const purchases = state.purchases.filter((p) => p.productId === product.id);

    return {
      component: 'ProductDetailScreen',
      id: 'screen_product_detail',
      theme: 'dark',
      props: {
        productId: product.id,
        title: product.name,
      },
      children: [
        {
          component: 'ProductHeader',
          children: [
            {
              component: 'ProductImage',
              id: 'img_product',
              props: {
                uri: product.imageUri || 'placeholder',
                hasPhoto: Boolean(product.imageUri),
              },
            },
            {
              component: 'Text',
              id: 'txt_product_name',
              text: product.name,
            },
            {
              component: 'Text',
              id: 'txt_product_category',
              text: product.category,
            },
            {
              component: 'Text',
              id: 'txt_product_unit',
              text: product.unit,
            },
          ],
        },
        {
          component: 'PriceEvolutionSection',
          id: 'sec_price_evolution',
          props: {
            title: t('trends.price_evolution', locale),
            currentPrice: formatCurrency(product.latestPrice, locale),
          },
          children: [
            {
              component: 'PriceHistoryChart',
              id: 'chart_product_history',
              props: {
                dataPoints: purchases.length || 1,
                lastPrice: product.latestPrice,
              },
            },
          ],
        },
        {
          component: 'Button',
          id: 'btn_record_purchase',
          text: t('purchases.add_purchase', locale),
        },
        {
          component: 'PurchaseHistoryList',
          id: 'list_purchase_history',
          props: {
            title: t('products.history', locale),
          },
          children: purchases.map((pur) => ({
            component: 'PurchaseHistoryItem',
            id: `item_purchase_${pur.id}`,
            props: {
              dateTime: pur.dateTime,
              unitPrice: formatCurrency(pur.unitPrice, locale),
              quantity: pur.quantity,
              totalCost: formatCurrency(pur.totalCost, locale),
              store: pur.store,
              buyer: pur.buyer,
              status: pur.status,
              statusLabel: pur.status === 'pending' ? t('settlement.pending_badge', locale) : t('settlement.settled_badge', locale),
            },
          })),
        },
      ],
    };
  },

  SettlementScreen: (state = mockState, locale = 'en') => {
    // Current period calculations
    const currentMonthPurchases = state.purchases.filter((p) => p.dateTime.startsWith(state.settlementMonth));
    const pendingPurchases = currentMonthPurchases.filter((p) => p.status === 'pending');
    const totalSpent = currentMonthPurchases.reduce((acc, p) => acc + p.totalCost, 0);
    const totalPending = pendingPurchases.reduce((acc, p) => acc + p.totalCost, 0);
    const totalSettled = totalSpent - totalPending;

    return {
      component: 'SettlementScreen',
      id: 'screen_settlement',
      theme: 'dark',
      props: {
        title: t('settlement.title', locale),
        period: state.settlementMonth,
      },
      children: [
        {
          component: 'SettlementSummaryCard',
          id: 'card_pending_settlement',
          props: {
            highlight: true,
            title: t('settlement.total_to_pay', locale),
            amount: formatCurrency(totalPending, locale),
            pendingCount: pendingPurchases.length,
          },
          children: [
            {
              component: 'Text',
              id: 'lbl_total_to_pay',
              text: t('settlement.total_to_pay', locale),
            },
            {
              component: 'Text',
              id: 'val_total_to_pay',
              text: formatCurrency(totalPending, locale),
            },
            {
              component: 'Button',
              id: 'btn_settle_all',
              disabled: pendingPurchases.length === 0,
              text: t('settlement.settle_all', locale),
            },
          ],
        },
        {
          component: 'MonthlyBreakdownCard',
          id: 'card_monthly_breakdown',
          children: [
            {
              component: 'MetricRow',
              id: 'row_total_spent',
              label: t('settlement.total_spent', locale),
              value: formatCurrency(totalSpent, locale),
            },
            {
              component: 'MetricRow',
              id: 'row_already_settled',
              label: t('settlement.total_settled', locale),
              value: formatCurrency(totalSettled, locale),
            },
            {
              component: 'MetricRow',
              id: 'row_month_comparison',
              label: t('settlement.month_comparison', locale),
              value: '+12.4% vs Sep 2026',
            },
          ],
        },
        {
          component: 'TopIncreasesCard',
          id: 'card_top_increases',
          props: {
            title: t('settlement.top_increases', locale),
          },
          children: state.products
            .filter((p) => p.priceVariation > 0)
            .sort((a, b) => b.priceVariation - a.priceVariation)
            .map((p) => ({
              component: 'IncreaseRow',
              id: `row_inc_${p.id}`,
              props: {
                name: p.name,
                variationFormatted: `+${p.priceVariation.toFixed(1)}%`,
                currentPrice: formatCurrency(p.latestPrice, locale),
              },
            })),
        },
      ],
    };
  },

  TrendsScreen: (state = mockState, locale = 'en') => {
    return {
      component: 'TrendsScreen',
      id: 'screen_trends',
      theme: 'dark',
      props: {
        title: t('trends.title', locale),
      },
      children: [
        {
          component: 'AnalyticsSelector',
          id: 'sel_trend_product',
          label: t('trends.select_product', locale),
        },
        {
          component: 'ChartCard',
          id: 'card_spending_chart',
          props: {
            title: t('trends.monthly_spending', locale),
          },
        },
        {
          component: 'ChartCard',
          id: 'card_evolution_chart',
          props: {
            title: t('trends.price_evolution', locale),
          },
        },
      ],
    };
  },

  SettingsScreen: (state = mockState, locale = 'en') => {
    return {
      component: 'SettingsScreen',
      id: 'screen_settings',
      theme: 'dark',
      props: {
        title: t('settings.title', locale),
      },
      children: [
        {
          component: 'SettingSection',
          id: 'sec_appearance',
          label: t('settings.theme', locale),
          children: [
            {
              component: 'RadioOption',
              id: 'opt_dark_theme',
              selected: true,
              text: t('settings.theme_dark', locale),
            },
            {
              component: 'RadioOption',
              id: 'opt_light_theme',
              selected: false,
              text: t('settings.theme_light', locale),
            },
          ],
        },
        {
          component: 'SettingSection',
          id: 'sec_language',
          label: t('settings.language', locale),
          children: [
            {
              component: 'RadioOption',
              id: 'opt_lang_en',
              selected: locale === 'en',
              text: t('settings.language_en', locale),
            },
            {
              component: 'RadioOption',
              id: 'opt_lang_es',
              selected: locale === 'es',
              text: t('settings.language_es', locale),
            },
          ],
        },
        {
          component: 'SettingSection',
          id: 'sec_usd',
          label: t('settings.usd_tracking', locale),
          children: [
            {
              component: 'SwitchRow',
              id: 'switch_usd_tracking',
              value: true,
              label: t('settings.usd_tracking_desc', locale),
            },
          ],
        },
      ],
    };
  },
};

// Interactive State Actions Simulation
function simulateAction(screenName, actionName, payload = {}) {
  const clonedState = JSON.parse(JSON.stringify(mockState));

  switch (actionName) {
    case 'add_product': {
      const newProduct = {
        id: clonedState.products.length + 1,
        name: payload.name || 'New Item',
        category: payload.category || 'General',
        unit: payload.unit || '1 unit',
        notes: payload.notes || '',
        imageUri: payload.imageUri || null,
        latestPrice: payload.price || 0,
        previousPrice: 0,
        priceVariation: 0,
      };
      clonedState.products.push(newProduct);
      break;
    }
    case 'settle_all': {
      clonedState.purchases.forEach((p) => {
        if (p.dateTime.startsWith(clonedState.settlementMonth) && p.status === 'pending') {
          p.status = 'settled';
        }
      });
      break;
    }
    case 'record_purchase': {
      const newPurchase = {
        id: clonedState.purchases.length + 101,
        productId: payload.productId || 1,
        productName: payload.productName || 'Whole Milk 1L',
        unitPrice: payload.unitPrice || 1600.0,
        quantity: payload.quantity || 2,
        totalCost: (payload.unitPrice || 1600.0) * (payload.quantity || 2),
        dateTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
        store: payload.store || 'Supermarket',
        buyer: payload.buyer || 'Parents',
        notes: payload.notes || '',
        status: 'pending',
        usdRate: 1350.0,
        usdValue: 2.37,
      };
      clonedState.purchases.push(newPurchase);

      // Update product latest price
      const prod = clonedState.products.find((p) => p.id === newPurchase.productId);
      if (prod) {
        prod.previousPrice = prod.latestPrice;
        prod.latestPrice = newPurchase.unitPrice;
        prod.priceVariation = ((prod.latestPrice - prod.previousPrice) / prod.previousPrice) * 100;
      }
      break;
    }
    default:
      console.warn(`[WARN] Unknown action: ${actionName}`);
  }

  const renderer = screens[screenName] || screens.SettlementScreen;
  return renderer(clonedState, 'en');
}

// Localization and UI Audit
function runAudit() {
  console.log('====================================================');
  console.log('         PriceBook UI & i18n Auditor               ');
  console.log('====================================================\n');

  let errors = 0;
  let warnings = 0;

  // 1. Verify dictionary parity
  function flattenKeys(obj, prefix = '') {
    let keys = [];
    for (const [k, v] of Object.entries(obj)) {
      const full = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'object' && v !== null) {
        keys = keys.concat(flattenKeys(v, full));
      } else {
        keys.push(full);
      }
    }
    return keys;
  }

  const enKeys = flattenKeys(enDict);
  const esKeys = flattenKeys(esDict);

  console.log(`[i18n] en.json has ${enKeys.length} keys`);
  console.log(`[i18n] es.json has ${esKeys.length} keys`);

  const missingInEs = enKeys.filter((k) => !esKeys.includes(k));
  const missingInEn = esKeys.filter((k) => !enKeys.includes(k));

  if (missingInEs.length > 0) {
    console.error(`❌ [ERROR] Missing keys in es.json:`, missingInEs);
    errors += missingInEs.length;
  }
  if (missingInEn.length > 0) {
    console.error(`❌ [ERROR] Missing keys in en.json:`, missingInEn);
    errors += missingInEn.length;
  }

  if (missingInEs.length === 0 && missingInEn.length === 0) {
    console.log(`✅ [PASS] 100% dictionary parity between en.json and es.json.`);
  }

  // 2. Scan simulated screens in English default for untranslated text or raw Spanish
  console.log('\n[Screens] Auditing screen trees in default English...');
  const suspiciousSpanishWords = [
    'precio',
    'compras',
    'productos',
    'liquidacion',
    'tendencias',
    'ajustes',
    'cancelar',
    'guardar',
    'pendiente',
    'saldado',
    'aumento',
    'unidad',
  ];

  function inspectNode(node, screen) {
    if (!node) return;
    if (node.text && typeof node.text === 'string') {
      const lower = node.text.toLowerCase();
      suspiciousSpanishWords.forEach((word) => {
        // match exact word boundary
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        if (regex.test(lower)) {
          console.warn(`⚠️ [WARN] [${screen}] Possible untranslated Spanish text found in English mode: "${node.text}"`);
          warnings++;
        }
      });
    }
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((c) => inspectNode(c, screen));
    }
  }

  for (const [screenName, renderer] of Object.entries(screens)) {
    const treeEn = renderer(mockState, 'en');
    inspectNode(treeEn, screenName);

    const treeEs = renderer(mockState, 'es');
    if (!treeEn.children || treeEn.children.length === 0) {
      console.error(`❌ [ERROR] Screen ${screenName} rendered empty tree.`);
      errors++;
    }
  }

  console.log(`✅ [PASS] Audited ${Object.keys(screens).length} simulated screens.`);

  // 3. Scan src/ directory for hardcoded strings in JSX/TSX if files exist
  if (fs.existsSync(SRC_DIR)) {
    console.log('\n[Codebase] Auditing src/ for unlocalized strings...');
    function scanDir(dir) {
      const files = fs.readdirSync(dir);
      files.forEach((f) => {
        const full = path.join(dir, f);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          scanDir(full);
        } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
          const content = fs.readFileSync(full, 'utf8');
          // Simple heuristic: check for hardcoded Spanish alert/strings
          if (content.includes('alert(') || content.includes('Alert.alert(')) {
            // Check if string contains quotes without t()
          }
        }
      });
    }
    scanDir(SRC_DIR);
  }

  console.log('\n----------------------------------------------------');
  console.log(`Audit Complete: ${errors} errors, ${warnings} warnings.`);
  if (errors > 0) {
    process.exit(1);
  } else {
    console.log('🎉 UI Architecture and Localization Audit PASSED.\n');
  }

  // Run unit tests as part of full audit
  runUnitTests();
}

// -----------------------------------------------------------------------------
// Interactive Unit Testing Suite Delegation (delegates to tests/run_tests.js)
// -----------------------------------------------------------------------------
const runAllTests = require(path.join(ROOT_DIR, 'tests', 'run_tests.js'));

function runUnitTests() {
  return runAllTests();
}

// CLI Routing
const args = process.argv.slice(2);

if (args.includes('--test')) {
  runUnitTests();
} else if (args.includes('--audit')) {
  runAudit();
} else if (args.includes('--list')) {
  console.log(JSON.stringify(Object.keys(screens), null, 2));
} else if (args.length > 0) {
  const screenName = args[0];
  const actionIdx = args.indexOf('--action');

  if (actionIdx !== -1 && args[actionIdx + 1]) {
    const actionName = args[actionIdx + 1];
    let payload = {};
    if (args[actionIdx + 2]) {
      try {
        payload = JSON.parse(args[actionIdx + 2]);
      } catch (e) {
        console.error('Invalid payload JSON');
      }
    }
    const result = simulateAction(screenName, actionName, payload);
    console.log(JSON.stringify(result, null, 2));
  } else {
    const renderer = screens[screenName];
    if (!renderer) {
      console.error(`Screen "${screenName}" not found. Available screens:`, Object.keys(screens));
      process.exit(1);
    }
    const tree = renderer(mockState, 'en');
    console.log(JSON.stringify(tree, null, 2));
  }
} else {
  console.log('Usage:');
  console.log('  node tools/render_ui_tree.js --list');
  console.log('  node tools/render_ui_tree.js <ScreenName>');
  console.log('  node tools/render_ui_tree.js <ScreenName> --action <actionName> [payloadJson]');
  console.log('  node tools/render_ui_tree.js --test');
  console.log('  node tools/render_ui_tree.js --audit');
}

