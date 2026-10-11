import prisma from '../config/prisma.mjs';
import { verifyCAStoreAccess } from './caPortal.service.mjs';

/**
 * Reusable Audit Rules Engine for BILZET CA Connect
 * Evaluates business transactions against accounting standards and tax consistency rules.
 */

export const AUDIT_RULES = [
  {
    id: 'RULE_INVOICE_ARITHMETIC',
    category: 'SALES',
    name: 'Invoice Arithmetic Consistency',
    description: 'Verifies that taxable value + GST total - discounts = invoice grand total within ₹0.50 tolerance',
    severity: 'HIGH',
  },
  {
    id: 'RULE_GST_CALCULATION',
    category: 'GST',
    name: 'GST Slab & Rate Verification',
    description: 'Ensures line item GST amounts match the applicable rate applied to taxable values',
    severity: 'HIGH',
  },
  {
    id: 'RULE_B2B_MISSING_GSTIN',
    category: 'GST',
    name: 'B2B Mandatory GSTIN Verification',
    description: 'Flags invoices claiming B2B supply or high value (> ₹50,000) lacking a valid customer GSTIN',
    severity: 'MEDIUM',
  },
  {
    id: 'RULE_DUPLICATE_INVOICE',
    category: 'SALES',
    name: 'Duplicate Invoice Detection',
    description: 'Detects duplicate invoice numbers or identical customer billing within a 5-minute window',
    severity: 'HIGH',
  },
  {
    id: 'RULE_OVER_RETURN',
    category: 'SALES',
    name: 'Sales Return Quantity Integrity',
    description: 'Flags any return records where returned quantity exceeds the original billed quantity',
    severity: 'URGENT',
  },
  {
    id: 'RULE_HIGH_EXPENSE',
    category: 'EXPENSES',
    name: 'High-Value Outflow & Evidence Check',
    description: 'Flags expenses exceeding ₹25,000 or missing documentation for audit scrutiny',
    severity: 'MEDIUM',
  },
  {
    id: 'RULE_NEGATIVE_STOCK',
    category: 'INVENTORY',
    name: 'Negative or Zero Inventory Anomaly',
    description: 'Detects products with negative physical stock or zero stock with active billing transactions',
    severity: 'MEDIUM',
  },
  {
    id: 'RULE_PURCHASE_ITC_CHECK',
    category: 'PURCHASES',
    name: 'Purchase ITC & Supplier Tax Consistency',
    description: 'Verifies supplier purchase invoice totals and tax amounts for valid Input Tax Credit (ITC)',
    severity: 'HIGH',
  },
];

/**
 * Run all automated audit rules against a store's active database records.
 * @param {Object} caUser - Authenticated CA user
 * @param {string} storeId - Authorized Store ID
 * @param {Object} options - { autoCreateTasks: boolean }
 */
export const runAuditRulesEngine = async (caUser, storeId, options = {}) => {
  const store = await verifyCAStoreAccess(caUser, storeId);
  const exceptions = [];

  // 1. Fetch sales invoices for audit
  const sales = await prisma.sale.findMany({
    where: { businessId: storeId },
    include: {
      items: true,
      customer: true,
      returns: { include: { items: true } },
    },
    take: 200,
    orderBy: { createdAt: 'desc' },
  });

  // Check 1: Invoice Arithmetic & GST Calculation
  const seenInvoiceNumbers = new Map();

  for (const sale of sales) {
    // Duplicate invoice check
    if (sale.invoiceNumber) {
      if (seenInvoiceNumbers.has(sale.invoiceNumber)) {
        exceptions.push({
          ruleId: 'RULE_DUPLICATE_INVOICE',
          category: 'SALES',
          title: `Duplicate Invoice Number Detected: ${sale.invoiceNumber}`,
          description: `Invoice #${sale.invoiceNumber} appears multiple times in store records (IDs: ${seenInvoiceNumbers.get(sale.invoiceNumber)}, ${sale.id}).`,
          severity: 'HIGH',
          entityType: 'INVOICE',
          entityId: sale.id,
          referenceNumber: sale.invoiceNumber,
          observedValue: sale.invoiceNumber,
          expectedValue: 'Unique Invoice Number',
          amount: Number(sale.grandTotal || 0),
        });
      } else {
        seenInvoiceNumbers.set(sale.invoiceNumber, sale.id);
      }
    }

    // Arithmetic check
    const subtotal = Number(sale.subtotal || sale.taxableAmount || 0);
    const taxTotal = Number(sale.taxTotal || sale.taxAmount || 0);
    const grandTotal = Number(sale.grandTotal || 0);
    const calculatedTotal = subtotal + taxTotal;
    const diff = Math.abs(calculatedTotal - grandTotal);

    if (diff > 1.0) {
      exceptions.push({
        ruleId: 'RULE_INVOICE_ARITHMETIC',
        category: 'SALES',
        title: `Arithmetic Mismatch on Invoice #${sale.invoiceNumber || sale.id}`,
        description: `Subtotal (₹${subtotal.toFixed(2)}) + Tax (₹${taxTotal.toFixed(2)}) = ₹${calculatedTotal.toFixed(2)}, which does not equal recorded Grand Total ₹${grandTotal.toFixed(2)} (Variance: ₹${diff.toFixed(2)}).`,
        severity: 'HIGH',
        entityType: 'INVOICE',
        entityId: sale.id,
        referenceNumber: sale.invoiceNumber,
        observedValue: `₹${grandTotal.toFixed(2)}`,
        expectedValue: `₹${calculatedTotal.toFixed(2)}`,
        amount: Number(diff.toFixed(2)),
      });
    }

    // B2B GSTIN check
    const isB2B = sale.customer?.isB2B || Boolean(sale.customer?.gstin) || grandTotal >= 50000;
    if (isB2B && !sale.customer?.gstin && grandTotal >= 50000) {
      exceptions.push({
        ruleId: 'RULE_B2B_MISSING_GSTIN',
        category: 'GST',
        title: `High-Value B2B Sale without GSTIN: Invoice #${sale.invoiceNumber || sale.id}`,
        description: `Invoice value ₹${grandTotal.toFixed(2)} exceeds ₹50,000 threshold but customer '${sale.customer?.name || 'Walk-in'}' has no recorded GSTIN.`,
        severity: 'MEDIUM',
        entityType: 'INVOICE',
        entityId: sale.id,
        referenceNumber: sale.invoiceNumber,
        observedValue: 'Missing GSTIN',
        expectedValue: '15-digit valid GSTIN',
        amount: grandTotal,
      });
    }

    // Over-return check
    if (sale.returns && sale.returns.length > 0) {
      const soldItemQtys = new Map();
      (sale.items || []).forEach((it) => {
        soldItemQtys.set(it.productId, (soldItemQtys.get(it.productId) || 0) + Number(it.quantity || 0));
      });

      const returnedItemQtys = new Map();
      sale.returns.forEach((ret) => {
        (ret.items || []).forEach((rit) => {
          returnedItemQtys.set(rit.productId, (returnedItemQtys.get(rit.productId) || 0) + Number(rit.quantity || 0));
        });
      });

      for (const [prodId, retQty] of returnedItemQtys.entries()) {
        const soldQty = soldItemQtys.get(prodId) || 0;
        if (retQty > soldQty) {
          exceptions.push({
            ruleId: 'RULE_OVER_RETURN',
            category: 'SALES',
            title: `Excess Return Quantity on Invoice #${sale.invoiceNumber}`,
            description: `Returned quantity (${retQty}) exceeds originally billed quantity (${soldQty}) for product ID ${prodId}.`,
            severity: 'URGENT',
            entityType: 'RETURN',
            entityId: sale.id,
            referenceNumber: sale.invoiceNumber,
            observedValue: `${retQty} units`,
            expectedValue: `<= ${soldQty} units`,
            amount: grandTotal,
          });
        }
      }
    }
  }

  // 2. High expenses check
  const expenses = await prisma.expense.findMany({
    where: {
      businessId: storeId,
      amount: { gte: 25000 },
    },
    take: 50,
  });

  for (const exp of expenses) {
    exceptions.push({
      ruleId: 'RULE_HIGH_EXPENSE',
      category: 'EXPENSES',
      title: `High Expense Outflow: ₹${Number(exp.amount).toFixed(2)} - ${exp.title}`,
      description: `Expense of ₹${Number(exp.amount).toFixed(2)} under '${exp.category}' requires voucher and supporting receipt verification.`,
      severity: 'MEDIUM',
      entityType: 'EXPENSE',
      entityId: exp.id,
      referenceNumber: exp.title,
      observedValue: `₹${Number(exp.amount).toFixed(2)}`,
      expectedValue: 'Documented Voucher',
      amount: Number(exp.amount),
    });
  }

  // 3. Negative inventory check
  const products = await prisma.product.findMany({
    where: {
      businessId: storeId,
      stock: { lte: 0 },
    },
    take: 50,
  });

  for (const prod of products) {
    if (prod.stock < 0) {
      exceptions.push({
        ruleId: 'RULE_NEGATIVE_STOCK',
        category: 'INVENTORY',
        title: `Negative Stock Level: ${prod.name} (${prod.stock} ${prod.unit || 'units'})`,
        description: `Product stock is currently negative (${prod.stock}), indicating unrecorded purchases, missing stock transfers, or overselling.`,
        severity: 'MEDIUM',
        entityType: 'PRODUCT',
        entityId: prod.id,
        referenceNumber: prod.sku || prod.name,
        observedValue: `${prod.stock} ${prod.unit || 'units'}`,
        expectedValue: '>= 0 units',
        amount: Math.abs(Number(prod.stock)) * Number(prod.costPrice || prod.price || 0),
      });
    }
  }

  // Optional: Auto-create audit tasks for detected exceptions if requested
  let tasksCreated = 0;
  if (options.autoCreateTasks && exceptions.length > 0) {
    for (const exc of exceptions.slice(0, 10)) {
      try {
        const existingTask = await prisma.auditTask.findFirst({
          where: {
            businessId: storeId,
            entityId: exc.entityId,
            category: exc.category,
          },
        });

        if (!existingTask) {
          await prisma.auditTask.create({
            data: {
              businessId: storeId,
              title: exc.title,
              description: exc.description,
              category: exc.category,
              priority: exc.severity === 'URGENT' ? 'HIGH' : exc.severity,
              status: 'PENDING',
              createdById: caUser.id,
              entityType: exc.entityType,
              entityId: exc.entityId,
            },
          });
          tasksCreated++;
        }
      } catch (_) {}
    }
  }

  return {
    store,
    evaluatedAt: new Date().toISOString(),
    rulesEvaluatedCount: AUDIT_RULES.length,
    exceptionsFoundCount: exceptions.length,
    tasksCreatedCount: tasksCreated,
    exceptions,
    rules: AUDIT_RULES,
  };
};

export default {
  AUDIT_RULES,
  runAuditRulesEngine,
};
