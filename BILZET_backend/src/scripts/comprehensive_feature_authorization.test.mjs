/**
 * comprehensive_feature_authorization.test.mjs
 * End-to-end verification of subscription feature authorization across all application areas.
 */
import assert from 'assert';
import {
  isFeatureAllowedByTier,
  getPlanSeatLimit,
  getPlanBillLimit,
  FEATURE_ENTITLEMENTS,
  resolveFeatureKey,
} from '../config/plans.config.mjs';
import { requirePlanTier } from '../middleware/plan.middleware.mjs';

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    failed++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    failed++;
  }
}

console.log('\n=============================================================');
console.log('BILZET — Comprehensive Feature Authorization Audit Tests');
console.log('=============================================================\n');

// 1. Team & Sub-Users Quotas & Custom Roles
runTest('1. Team seat limits: Free=0, Pro=5, Premium=Unlimited(-1)', () => {
  assert.strictEqual(getPlanSeatLimit('FREE'), 0, 'Free plan must have 0 sub-user seats');
  assert.strictEqual(getPlanSeatLimit('PRO'), 5, 'Pro plan must have 5 sub-user seats');
  assert.strictEqual(getPlanSeatLimit('PREMIUM'), -1, 'Premium plan must have unlimited (-1) seats');
});

runTest('2. Team sub-users feature requires minimum PRO tier', () => {
  assert.strictEqual(isFeatureAllowedByTier('users.sub_users', 'FREE'), false);
  assert.strictEqual(isFeatureAllowedByTier('users.sub_users', 'PRO'), true);
  assert.strictEqual(isFeatureAllowedByTier('users.sub_users', 'PREMIUM'), true);
});

runTest('3. Custom roles studio requires minimum PREMIUM tier', () => {
  assert.strictEqual(isFeatureAllowedByTier('users.custom_roles', 'FREE'), false);
  assert.strictEqual(isFeatureAllowedByTier('users.custom_roles', 'PRO'), false);
  assert.strictEqual(isFeatureAllowedByTier('users.custom_roles', 'PREMIUM'), true);
  // Alias test
  assert.strictEqual(isFeatureAllowedByTier('custom_roles', 'FREE'), false);
  assert.strictEqual(isFeatureAllowedByTier('custom_roles', 'PRO'), false);
  assert.strictEqual(isFeatureAllowedByTier('custom_roles', 'PREMIUM'), true);
});

// 2. Invoices & Billing
runTest('4. Bill limit: Free=100 bills/yr, Pro=Unlimited(-1), Premium=Unlimited(-1)', () => {
  assert.strictEqual(getPlanBillLimit('FREE'), 100);
  assert.strictEqual(getPlanBillLimit('PRO'), -1);
  assert.strictEqual(getPlanBillLimit('PREMIUM'), -1);
});

runTest('5. Watermark removal requires minimum PRO tier', () => {
  assert.strictEqual(isFeatureAllowedByTier('invoice.remove_watermark', 'FREE'), false);
  assert.strictEqual(isFeatureAllowedByTier('invoice.remove_watermark', 'PRO'), true);
  assert.strictEqual(isFeatureAllowedByTier('invoice.remove_watermark', 'PREMIUM'), true);
});

runTest('6. Thermal 80mm printing requires PRO; Thermal 58mm requires PREMIUM', () => {
  assert.strictEqual(isFeatureAllowedByTier('printing.thermal_80mm', 'FREE'), false);
  assert.strictEqual(isFeatureAllowedByTier('printing.thermal_80mm', 'PRO'), true);
  assert.strictEqual(isFeatureAllowedByTier('printing.thermal_58mm', 'FREE'), false);
  assert.strictEqual(isFeatureAllowedByTier('printing.thermal_58mm', 'PRO'), false);
  assert.strictEqual(isFeatureAllowedByTier('printing.thermal_58mm', 'PREMIUM'), true);
});

// 3. Reports & Exports
runTest('7. Sales daily/monthly reports allowed on Free; P&L and Excel export require PRO', () => {
  assert.strictEqual(isFeatureAllowedByTier('reports.sales_daily_monthly', 'FREE'), true);
  assert.strictEqual(isFeatureAllowedByTier('reports.profit_loss', 'FREE'), false);
  assert.strictEqual(isFeatureAllowedByTier('reports.profit_loss', 'PRO'), true);
  assert.strictEqual(isFeatureAllowedByTier('reports.xlsx_export', 'FREE'), false);
  assert.strictEqual(isFeatureAllowedByTier('reports.xlsx_export', 'PRO'), true);
});

runTest('8. GST calculation preview is Free; GSTR-1/3B exports require PRO', () => {
  assert.strictEqual(isFeatureAllowedByTier('reports.gst_preview', 'FREE'), true);
  assert.strictEqual(isFeatureAllowedByTier('gst.gstr1_draft', 'FREE'), false);
  assert.strictEqual(isFeatureAllowedByTier('gst.gstr1_draft', 'PRO'), true);
  assert.strictEqual(isFeatureAllowedByTier('gst.gstr3b_summary', 'FREE'), false);
  assert.strictEqual(isFeatureAllowedByTier('gst.gstr3b_summary', 'PRO'), true);
});

// 4. Multi-Store & Branches
runTest('9. Multi-store and multi-branch management requires PREMIUM', () => {
  assert.strictEqual(isFeatureAllowedByTier('stores.multi_store', 'FREE'), false);
  assert.strictEqual(isFeatureAllowedByTier('stores.multi_store', 'PRO'), false);
  assert.strictEqual(isFeatureAllowedByTier('stores.multi_store', 'PREMIUM'), true);
  assert.strictEqual(isFeatureAllowedByTier('multi_store', 'FREE'), false);
  assert.strictEqual(isFeatureAllowedByTier('multi_store', 'PREMIUM'), true);
});

// 5. Audit Logs
runTest('10. Audit logs require PREMIUM', () => {
  assert.strictEqual(isFeatureAllowedByTier('audit.logs', 'FREE'), false);
  assert.strictEqual(isFeatureAllowedByTier('audit.logs', 'PRO'), false);
  assert.strictEqual(isFeatureAllowedByTier('audit.logs', 'PREMIUM'), true);
  assert.strictEqual(isFeatureAllowedByTier('audit_logs', 'FREE'), false);
  assert.strictEqual(isFeatureAllowedByTier('audit_logs', 'PREMIUM'), true);
});

// 6. Purchase Orders & Vendor Management
runTest('11. Purchase Orders require minimum PRO tier', () => {
  assert.strictEqual(isFeatureAllowedByTier('purchases.orders', 'FREE'), false);
  assert.strictEqual(isFeatureAllowedByTier('purchases.orders', 'PRO'), true);
  assert.strictEqual(isFeatureAllowedByTier('purchases.orders', 'PREMIUM'), true);
  assert.strictEqual(isFeatureAllowedByTier('purchase_orders', 'FREE'), false);
  assert.strictEqual(isFeatureAllowedByTier('purchase_orders', 'PRO'), true);
});

// 7. Advanced Inventory (Batch, Expiry, Serial Numbers)
runTest('12. Advanced inventory (batch/expiry/serial) requires PREMIUM', () => {
  assert.strictEqual(isFeatureAllowedByTier('inventory.advanced', 'FREE'), false);
  assert.strictEqual(isFeatureAllowedByTier('inventory.advanced', 'PRO'), false);
  assert.strictEqual(isFeatureAllowedByTier('inventory.advanced', 'PREMIUM'), true);
});

// 8. Open API, Webhooks, Custom Domain White-Label
runTest('13. Open API and White-Label Portal require PREMIUM', () => {
  assert.strictEqual(isFeatureAllowedByTier('integration.open_api', 'FREE'), false);
  assert.strictEqual(isFeatureAllowedByTier('integration.open_api', 'PRO'), false);
  assert.strictEqual(isFeatureAllowedByTier('integration.open_api', 'PREMIUM'), true);
  assert.strictEqual(isFeatureAllowedByTier('branding.white_label', 'FREE'), false);
  assert.strictEqual(isFeatureAllowedByTier('branding.white_label', 'PRO'), false);
  assert.strictEqual(isFeatureAllowedByTier('branding.white_label', 'PREMIUM'), true);
});

// 9. Dual-Layer Backend Middleware 403 Response Contract
await runAsyncTest('14. requirePlanTier middleware returns standard 403 contract when blocked', async () => {
  const middleware = requirePlanTier('PRO', 'Team sub-users', 'users.sub_users');

  let responseStatus = null;
  let responseJson = null;

  const mockReq = {
    user: { id: 'usr_mock_free_test', role: 'ADMIN', businessId: 'biz_mock_free_test' },
  };
  const mockRes = {
    status(code) {
      responseStatus = code;
      return {
        json(body) {
          responseJson = body;
        },
      };
    },
  };
  const mockNext = () => {
    throw new Error('Should not have called next() for Free user accessing Pro feature');
  };

  await middleware(mockReq, mockRes, mockNext);

  assert.strictEqual(responseStatus, 403, 'Must return 403 HTTP status');
  assert.strictEqual(responseJson.success, false);
  assert.strictEqual(responseJson.statusCode, 403);
  assert.strictEqual(responseJson.requiredPlan, 'PRO');
  assert.strictEqual(responseJson.feature, 'users.sub_users');
  assert.strictEqual(responseJson.currentPlan, 'FREE');
});

// 10. Inactive / Expired Subscription Reverts to Free
runTest('15. Inactive or expired subscription (isActive=false) denies paid features', () => {
  assert.strictEqual(isFeatureAllowedByTier('users.sub_users', 'PRO', false), false);
  assert.strictEqual(isFeatureAllowedByTier('ca.connect', 'PREMIUM', false), false);
  assert.strictEqual(isFeatureAllowedByTier('audit.logs', 'PREMIUM', false), false);
});

console.log('\n─────────────────────────────────────────────────────────────');
console.log(`Test Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL FEATURE AUTHORIZATION AUDIT TESTS PASSED SUCCESSFULLY! ✓\n');
}
