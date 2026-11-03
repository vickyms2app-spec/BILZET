import crypto from 'crypto';
import prisma from '../config/prisma.mjs';
import { ApiError } from '../utils/apiError.mjs';
import { verifyCAStoreAccess } from './caPortal.service.mjs';

/**
 * CA Exceptions & Audit Inbox Service for BILZET
 * Implements authoritative B2B, B2C & SEZ classification,
 * live billing synchronization, and exception resolution workflows.
 */

// Store synchronization timestamps in memory
const storeSyncTimestamps = new Map();

/**
 * Determine authoritative Customer Type classification based on statutory GST rules.
 * @param {Object} params - { sale, customer, store }
 * @returns {Object} { customerType, sezTaxTreatment, reason }
 */
export const classifyCustomerAndTransaction = ({ sale, customer, store }) => {
  // 1. SEZ (Special Economic Zone) Classification
  // Under Section 7(5)(b) of the IGST Act, 2017, supply of goods/services to an SEZ unit or
  // SEZ developer is deemed an Inter-State supply regardless of location.
  const isExplicitSez = Boolean(
    customer?.isSez === true ||
    customer?.customerType === 'SEZ' ||
    customer?.sezUnitType ||
    sale?.isSez === true ||
    sale?.customerType === 'SEZ' ||
    (customer?.businessType && String(customer.businessType).toUpperCase().includes('SEZ')) ||
    (customer?.name && String(customer.name).toUpperCase().includes('SEZ'))
  );

  const rawGstin = (customer?.gstin || sale?.customerGstin || '').trim().toUpperCase();
  const isValidGstinFormat = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(rawGstin);

  if (isExplicitSez) {
    const isZeroRatedOrLut = Boolean(
      sale?.sezTaxTreatment === 'WITHOUT_PAYMENT_UNDER_LUT' ||
      (!sale?.taxTotal && !sale?.igst)
    );
    const sezTaxTreatment = isZeroRatedOrLut ? 'WITHOUT_PAYMENT_UNDER_LUT' : 'WITH_PAYMENT';

    return {
      customerType: 'SEZ',
      sezTaxTreatment,
      reason: `SEZ recipient identified: ${customer?.name || 'SEZ Unit/Developer'}. Place of supply deemed inter-state under Sec 7(5)(b) of IGST Act (${sezTaxTreatment === 'WITH_PAYMENT' ? 'With payment of IGST' : 'Without payment of IGST under LUT/Bond'}).`,
    };
  }

  // 2. Corrupted or invalid GSTIN format -> Flag as UNCLASSIFIED
  if (rawGstin && !isValidGstinFormat) {
    return {
      customerType: 'UNCLASSIFIED',
      sezTaxTreatment: null,
      reason: `Customer provided GSTIN "${rawGstin}" which fails statutory 15-character structural validation. Transaction flagged for CA classification.`,
    };
  }

  // 3. High-Value Transaction or trade customer without GSTIN -> UNCLASSIFIED
  // Statutory threshold: Inter-state > ₹50,000 or high-value supply (> ₹2,50,000) or trade credit customer
  const grandTotal = Number(sale?.grandTotal || sale?.total || 0);
  const isTradeCustomer = customer?.businessType === 'B2B' || (Number(customer?.creditLimit || 0) > 0);
  if (!rawGstin && (grandTotal >= 50000 || isTradeCustomer)) {
    return {
      customerType: 'UNCLASSIFIED',
      sezTaxTreatment: null,
      reason: `Transaction value of ₹${grandTotal.toFixed(2)} exceeds statutory threshold without recipient GSTIN details. Requires CA classification verification.`,
    };
  }

  // 4. Valid B2B supply (Recipient has valid 15-character registered GSTIN)
  if (rawGstin && isValidGstinFormat) {
    return {
      customerType: 'B2B',
      sezTaxTreatment: null,
      reason: `Valid recipient GSTIN verified: ${rawGstin} (${customer?.name || 'Registered Business Buyer'}). Registered as B2B supply.`,
    };
  }

  // 5. Valid B2C supply (Consumer / retail / unregistered recipient within thresholds)
  if (!rawGstin && grandTotal < 50000) {
    return {
      customerType: 'B2C',
      sezTaxTreatment: null,
      reason: `Retail supply to unregistered consumer without recipient GSTIN within normal statutory limits. Classified as B2C.`,
    };
  }

  // Fallback
  return {
    customerType: 'UNCLASSIFIED',
    sezTaxTreatment: null,
    reason: 'Insufficient transaction data to conclusively classify recipient under statutory GST reporting rules.',
  };
};

/**
 * Get paginated, filtered exceptions for an authorized store with live category counts.
 */
export const getStoreExceptions = async (caUser, storeId, query = {}) => {
  const store = await verifyCAStoreAccess(caUser, storeId);
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(query.limit || '25', 10)));
  const skip = (page - 1) * limit;

  // Base query for the store
  const where = {
    businessId: store.id,
  };

  // Category filter
  if (query.category && query.category !== 'ALL') {
    where.category = query.category.toUpperCase();
  }

  // Customer Type filter (Supports multi-select comma-separated)
  if (query.customerType && query.customerType !== 'ALL') {
    const types = String(query.customerType)
      .split(',')
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    if (types.length === 1) {
      where.customerType = types[0];
    } else if (types.length > 1) {
      where.customerType = { in: types };
    }
  }

  // Status filter
  if (query.status && query.status !== 'ALL') {
    where.status = query.status.toUpperCase();
  }

  // Date range filter
  if (query.startDate || query.endDate) {
    where.createdAt = {};
    if (query.startDate) {
      where.createdAt.gte = new Date(query.startDate);
    }
    if (query.endDate) {
      const eDate = new Date(query.endDate);
      eDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = eDate;
    }
  }

  // Amount range filter
  if (query.minAmount || query.maxAmount) {
    where.amount = {};
    if (query.minAmount) {
      where.amount.gte = Number(query.minAmount);
    }
    if (query.maxAmount) {
      where.amount.lte = Number(query.maxAmount);
    }
  }

  // Search filter
  if (query.search && String(query.search).trim()) {
    const s = String(query.search).trim();
    where.OR = [
      { referenceNumber: { contains: s, mode: 'insensitive' } },
      { customerName: { contains: s, mode: 'insensitive' } },
      { customerGstin: { contains: s, mode: 'insensitive' } },
      { title: { contains: s, mode: 'insensitive' } },
      { description: { contains: s, mode: 'insensitive' } },
    ];
  }

  // Sort options
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
  const orderBy = { [sortBy]: sortOrder };

  // Fetch paginated exceptions and counts
  const [exceptions, total, allStoreExceptions] = await Promise.all([
    prisma.caException.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    prisma.caException.count({ where }),
    prisma.caException.findMany({
      where: { businessId: store.id },
      select: { category: true, customerType: true, status: true },
    }),
  ]);

  // Aggregate category counts for the horizontal filter bar badges
  const counts = {
    all: allStoreExceptions.length,
    gstMismatches: allStoreExceptions.filter((e) => e.category === 'GST_MISMATCH').length,
    returnsCreditNotes: allStoreExceptions.filter((e) => e.category === 'RETURNS_CREDIT_NOTE').length,
    missingInvoices: allStoreExceptions.filter((e) => e.category === 'MISSING_INVOICE').length,
    pendingDocuments: allStoreExceptions.filter((e) => e.category === 'PENDING_DOCUMENT').length,
  };

  // Aggregate customer type counts for filter panel
  const customerTypeCounts = {
    b2b: allStoreExceptions.filter((e) => e.customerType === 'B2B').length,
    b2c: allStoreExceptions.filter((e) => e.customerType === 'B2C').length,
    sez: allStoreExceptions.filter((e) => e.customerType === 'SEZ').length,
    unclassified: allStoreExceptions.filter((e) => e.customerType === 'UNCLASSIFIED').length,
  };

  const lastSync = storeSyncTimestamps.get(store.id) || new Date().toISOString();

  return {
    store: {
      id: store.id,
      name: store.name,
      gstin: store.gstin || '',
      state: store.state || 'Tamil Nadu',
    },
    exceptions: exceptions.map((e) => ({
      ...e,
      amount: Number(e.amount || 0),
      gstAmount: Number(e.gstAmount || 0),
      taxableAmount: Number(e.taxableAmount || 0),
      expectedGst: Number(e.expectedGst || 0),
      differenceAmount: Number(e.differenceAmount || 0),
      cgst: Number(e.cgst || 0),
      sgst: Number(e.sgst || 0),
      igst: Number(e.igst || 0),
      portalCgst: e.portalCgst !== null && e.portalCgst !== undefined ? Number(e.portalCgst) : null,
      portalSgst: e.portalSgst !== null && e.portalSgst !== undefined ? Number(e.portalSgst) : null,
      portalIgst: e.portalIgst !== null && e.portalIgst !== undefined ? Number(e.portalIgst) : null,
      portalTaxable: e.portalTaxable !== null && e.portalTaxable !== undefined ? Number(e.portalTaxable) : null,
      reviewNotes: e.reviewNotes || [],
      history: e.history || [],
      documents: e.documents || [],
    })),
    counts,
    customerTypeCounts,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    lastSync,
  };
};

/**
 * Fetch complete details of a single exception.
 */
export const getExceptionById = async (caUser, exceptionId) => {
  const exception = await prisma.caException.findUnique({
    where: { id: exceptionId },
  });

  if (!exception) {
    throw ApiError.notFound('Exception record not found');
  }

  const store = await verifyCAStoreAccess(caUser, exception.businessId);

  // Link source transaction if available
  let sourceInvoice = null;
  if (exception.invoiceId) {
    sourceInvoice = await prisma.sale.findUnique({
      where: { id: exception.invoiceId },
      include: { customer: true, items: true, returns: { include: { items: true } } },
    });
  }

  return {
    exception: {
      ...exception,
      amount: Number(exception.amount || 0),
      gstAmount: Number(exception.gstAmount || 0),
      taxableAmount: Number(exception.taxableAmount || 0),
      expectedGst: Number(exception.expectedGst || 0),
      differenceAmount: Number(exception.differenceAmount || 0),
      cgst: Number(exception.cgst || 0),
      sgst: Number(exception.sgst || 0),
      igst: Number(exception.igst || 0),
      portalCgst: exception.portalCgst !== null && exception.portalCgst !== undefined ? Number(exception.portalCgst) : null,
      portalSgst: exception.portalSgst !== null && exception.portalSgst !== undefined ? Number(exception.portalSgst) : null,
      portalIgst: exception.portalIgst !== null && exception.portalIgst !== undefined ? Number(exception.portalIgst) : null,
      portalTaxable: exception.portalTaxable !== null && exception.portalTaxable !== undefined ? Number(exception.portalTaxable) : null,
      reviewNotes: exception.reviewNotes || [],
      history: exception.history || [],
      documents: exception.documents || [],
    },
    store: {
      id: store.id,
      name: store.name,
      gstin: store.gstin || '',
      state: store.state || 'Tamil Nadu',
    },
    sourceInvoice,
  };
};

/**
 * Live BILZET billing synchronization engine.
 * Scans active invoices, returns, credit notes, purchases, and customers
 * to detect anomalies and refresh exceptions idempotently.
 */
export const syncStoreExceptions = async (caUser, storeId) => {
  const store = await verifyCAStoreAccess(caUser, storeId);
  const storeState = store.state || 'Tamil Nadu';

  // 1. Fetch sales transactions with related customer and line items
  const sales = await prisma.sale.findMany({
    where: { businessId: store.id },
    include: {
      customer: true,
      items: true,
      returns: { include: { items: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 150,
  });

  // 2. Fetch purchases and expenses for document check
  const [purchases, expenses] = await Promise.all([
    prisma.purchase.findMany({
      where: { businessId: store.id },
      take: 100,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.expense.findMany({
      where: { businessId: store.id },
      take: 50,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const detectedExceptions = [];

  // ─── Scan 1: Sales Invoices & Customer Classification ──────────────
  for (const sale of sales) {
    const classification = classifyCustomerAndTransaction({
      sale,
      customer: sale.customer,
      store,
    });

    const subtotal = Number(sale.subtotal || 0);
    const taxTotal = Number(sale.taxTotal || 0);
    const grandTotal = Number(sale.grandTotal || 0);
    const calculatedTotal = Number((subtotal + taxTotal).toFixed(2));
    const arithmeticVariance = Number(Math.abs(calculatedTotal - grandTotal).toFixed(2));

    // A. Arithmetic Mismatch
    if (arithmeticVariance > 1.0) {
      detectedExceptions.push({
        id: `exc-arith-${sale.id}`,
        businessId: store.id,
        category: 'GST_MISMATCH',
        exceptionType: 'ARITHMETIC_VARIANCE',
        title: `Arithmetic Mismatch on Invoice #${sale.invoiceNumber || sale.id}`,
        description: `Subtotal (₹${subtotal.toFixed(2)}) + GST (₹${taxTotal.toFixed(2)}) = ₹${calculatedTotal.toFixed(2)}, which does not equal recorded Grand Total of ₹${grandTotal.toFixed(2)} (Variance: ₹${arithmeticVariance.toFixed(2)}).`,
        referenceNumber: sale.invoiceNumber || `INV-${sale.id.slice(0, 8)}`,
        invoiceId: sale.id,
        invoiceDate: sale.createdAt,
        customerType: classification.customerType,
        customerName: sale.customer?.name || 'Walk-in Counter Customer',
        customerGstin: sale.customer?.gstin || null,
        placeOfSupply: sale.customer?.state || storeState,
        amount: grandTotal,
        gstAmount: taxTotal,
        taxableAmount: subtotal,
        expectedGst: Number((grandTotal - subtotal).toFixed(2)),
        differenceAmount: arithmeticVariance,
        cgst: Number((taxTotal / 2).toFixed(2)),
        sgst: Number((taxTotal / 2).toFixed(2)),
        igst: 0,
        portalCgst: Number((taxTotal / 2).toFixed(2)),
        portalSgst: Number((taxTotal / 2).toFixed(2)),
        portalIgst: 0,
        portalTaxable: subtotal,
        sezTaxTreatment: classification.sezTaxTreatment,
        status: 'OPEN',
        severity: 'HIGH',
        sourceType: 'SALES_INVOICE',
        sourceId: sale.id,
      });
    }

    // B. SEZ Supply Improper Tax Split
    if (classification.customerType === 'SEZ') {
      const hasCgstSgst = Number(sale.taxTotal || 0) > 0 && !sale.isInterState;
      if (hasCgstSgst) {
        detectedExceptions.push({
          id: `exc-sez-${sale.id}`,
          businessId: store.id,
          category: 'GST_MISMATCH',
          exceptionType: 'SEZ_TAX_TREATMENT_MISMATCH',
          title: `Improper CGST/SGST Charged on SEZ Recipient: Invoice #${sale.invoiceNumber}`,
          description: `SEZ customer '${sale.customer?.name}' was billed with domestic CGST/SGST (₹${taxTotal.toFixed(2)}) instead of statutory Inter-State IGST or Zero-Rated LUT supply under Section 7(5)(b) of the IGST Act.`,
          referenceNumber: sale.invoiceNumber,
          invoiceId: sale.id,
          invoiceDate: sale.createdAt,
          customerType: 'SEZ',
          customerName: sale.customer?.name || 'SEZ Unit/Developer',
          customerGstin: sale.customer?.gstin || null,
          placeOfSupply: `${sale.customer?.state || storeState} [SEZ Unit]`,
          amount: grandTotal,
          gstAmount: taxTotal,
          taxableAmount: subtotal,
          expectedGst: 0,
          differenceAmount: taxTotal,
          cgst: Number((taxTotal / 2).toFixed(2)),
          sgst: Number((taxTotal / 2).toFixed(2)),
          igst: 0,
          portalCgst: 0,
          portalSgst: 0,
          portalIgst: 0,
          portalTaxable: subtotal,
          sezTaxTreatment: classification.sezTaxTreatment,
          status: 'OPEN',
          severity: 'HIGH',
          sourceType: 'SALES_INVOICE',
          sourceId: sale.id,
        });
      }
    }

    // C. Unclassified High-Value Transaction or Corrupted GSTIN
    if (classification.customerType === 'UNCLASSIFIED') {
      detectedExceptions.push({
        id: `exc-unc-${sale.id}`,
        businessId: store.id,
        category: 'MISSING_INVOICE',
        exceptionType: 'UNCLASSIFIED_CUSTOMER',
        title: `High-Value Supply Lacking Valid GST Classification: Invoice #${sale.invoiceNumber}`,
        description: classification.reason,
        referenceNumber: sale.invoiceNumber,
        invoiceId: sale.id,
        invoiceDate: sale.createdAt,
        customerType: 'UNCLASSIFIED',
        customerName: sale.customer?.name || 'Unregistered Commercial Entity',
        customerGstin: sale.customer?.gstin || null,
        placeOfSupply: sale.customer?.state || storeState,
        amount: grandTotal,
        gstAmount: taxTotal,
        taxableAmount: subtotal,
        expectedGst: taxTotal,
        differenceAmount: 0,
        cgst: Number((taxTotal / 2).toFixed(2)),
        sgst: Number((taxTotal / 2).toFixed(2)),
        igst: 0,
        portalCgst: Number((taxTotal / 2).toFixed(2)),
        portalSgst: Number((taxTotal / 2).toFixed(2)),
        portalIgst: 0,
        portalTaxable: subtotal,
        sezTaxTreatment: null,
        status: 'OPEN',
        severity: 'MEDIUM',
        sourceType: 'SALES_INVOICE',
        sourceId: sale.id,
      });
    }

    // D. Excess Sales Return
    if (sale.returns && sale.returns.length > 0) {
      let totalReturnedAmount = 0;
      for (const ret of sale.returns) {
        totalReturnedAmount += Number(ret.totalAmount || ret.grandTotal || 0);
      }
      if (totalReturnedAmount > grandTotal) {
        detectedExceptions.push({
          id: `exc-ret-${sale.id}`,
          businessId: store.id,
          category: 'RETURNS_CREDIT_NOTE',
          exceptionType: 'EXCESS_RETURN',
          title: `Excess Return Refund Exceeding Sale Value: Invoice #${sale.invoiceNumber}`,
          description: `Total refunded returns of ₹${totalReturnedAmount.toFixed(2)} exceed the original invoice grand total of ₹${grandTotal.toFixed(2)}.`,
          referenceNumber: sale.invoiceNumber,
          invoiceId: sale.id,
          invoiceDate: sale.createdAt,
          customerType: classification.customerType,
          customerName: sale.customer?.name || 'Walk-in Customer',
          customerGstin: sale.customer?.gstin || null,
          placeOfSupply: sale.customer?.state || storeState,
          amount: totalReturnedAmount,
          gstAmount: taxTotal,
          taxableAmount: subtotal,
          expectedGst: 0,
          differenceAmount: Number((totalReturnedAmount - grandTotal).toFixed(2)),
          cgst: Number((taxTotal / 2).toFixed(2)),
          sgst: Number((taxTotal / 2).toFixed(2)),
          igst: 0,
          portalCgst: 0,
          portalSgst: 0,
          portalIgst: 0,
          portalTaxable: subtotal,
          sezTaxTreatment: classification.sezTaxTreatment,
          status: 'OPEN',
          severity: 'URGENT',
          sourceType: 'SALES_RETURN',
          sourceId: sale.returns[0]?.id || sale.id,
        });
      }
    }
  }

  // ─── Scan 2: Purchases Missing Invoices ──────────────
  for (const pur of purchases) {
    const pTotal = Number(pur.grandTotal || pur.total || 0);
    const pTax = Number(pur.taxTotal || 0);
    const pSubtotal = Number(pur.subtotal || pTotal - pTax);
    if (pTotal >= 25000 && !pur.documentUrl && !pur.fileUrl) {
      detectedExceptions.push({
        id: `exc-pur-${pur.id}`,
        businessId: store.id,
        category: 'PENDING_DOCUMENT',
        exceptionType: 'MISSING_PURCHASE_BILL',
        title: `Missing Supplier Tax Invoice: Purchase Voucher #${pur.invoiceNumber || pur.id}`,
        description: `High-value purchase of ₹${pTotal.toFixed(2)} from supplier requires uploaded invoice voucher for valid Input Tax Credit (ITC).`,
        referenceNumber: pur.invoiceNumber || `PUR-${pur.id.slice(0, 8)}`,
        invoiceId: pur.id,
        invoiceDate: pur.createdAt,
        customerType: 'B2B',
        customerName: pur.supplier?.name || 'Commercial Supplier',
        customerGstin: pur.supplier?.gstin || null,
        placeOfSupply: storeState,
        amount: pTotal,
        gstAmount: pTax,
        taxableAmount: pSubtotal,
        expectedGst: pTax,
        differenceAmount: 0,
        cgst: Number((pTax / 2).toFixed(2)),
        sgst: Number((pTax / 2).toFixed(2)),
        igst: 0,
        portalCgst: Number((pTax / 2).toFixed(2)),
        portalSgst: Number((pTax / 2).toFixed(2)),
        portalIgst: 0,
        portalTaxable: pSubtotal,
        sezTaxTreatment: null,
        status: 'OPEN',
        severity: 'HIGH',
        sourceType: 'PURCHASE',
        sourceId: pur.id,
      });
    }
  }

  // ─── Idempotent Upsert into Database ──────────────
  let newExceptionsCount = 0;
  for (const exc of detectedExceptions) {
    try {
      const existing = await prisma.caException.findFirst({
        where: {
          businessId: store.id,
          referenceNumber: exc.referenceNumber,
          exceptionType: exc.exceptionType,
        },
      });

      if (!existing) {
        await prisma.caException.create({
          data: {
            ...exc,
            history: [
              {
                timestamp: new Date(),
                action: 'EXCEPTION_DETECTED',
                actor: `${caUser.name || 'CA Auditor'} (via Sync Now)`,
                note: exc.description,
              },
            ],
            reviewNotes: [],
            documents: [],
          },
        });
        newExceptionsCount++;
      } else if (existing.status !== 'RESOLVED') {
        // Refresh values if still open or under review
        await prisma.caException.update({
          where: { id: existing.id },
          data: {
            amount: exc.amount,
            gstAmount: exc.gstAmount,
            taxableAmount: exc.taxableAmount,
            differenceAmount: exc.differenceAmount,
            description: exc.description,
            customerType: exc.customerType,
            sezTaxTreatment: exc.sezTaxTreatment,
          },
        });
      }
    } catch (_) {
      // Continue sync even if single record fails
    }
  }

  const nowIso = new Date().toISOString();
  storeSyncTimestamps.set(store.id, nowIso);

  return {
    success: true,
    exceptionsSynced: detectedExceptions.length,
    newExceptions: newExceptionsCount,
    lastSync: nowIso,
  };
};

/**
 * Update Exception Status (RESOLVED, IN_REVIEW, REOPENED).
 * Preserves audit trail with authenticated CA, timestamp, previous status, and resolution reason.
 */
export const updateExceptionStatus = async (caUser, exceptionId, data) => {
  const exception = await prisma.caException.findUnique({
    where: { id: exceptionId },
  });

  if (!exception) {
    throw ApiError.notFound('Exception record not found');
  }

  await verifyCAStoreAccess(caUser, exception.businessId);

  const newStatus = String(data.status || 'RESOLVED').toUpperCase();
  const previousStatus = exception.status;
  const reason = data.reason || data.notes || 'Status updated by Chartered Accountant';

  const historyEntry = {
    timestamp: new Date(),
    action: newStatus === 'RESOLVED' ? 'EXCEPTION_RESOLVED' : (newStatus === 'REOPENED' ? 'EXCEPTION_REOPENED' : 'STATUS_UPDATED'),
    actor: `${caUser.name || 'Chartered Accountant'} (${caUser.role || 'CA'})`,
    previousStatus,
    newStatus,
    note: reason,
  };

  const updatedHistory = Array.isArray(exception.history)
    ? [...exception.history, historyEntry]
    : [historyEntry];

  const updatePayload = {
    status: newStatus,
    history: updatedHistory,
  };

  if (newStatus === 'RESOLVED') {
    updatePayload.resolvedById = caUser.id;
    updatePayload.resolvedByName = caUser.name || 'CA Auditor';
    updatePayload.resolvedAt = new Date();
    updatePayload.resolutionReason = reason;
  } else if (newStatus === 'REOPENED') {
    updatePayload.resolvedById = null;
    updatePayload.resolvedByName = null;
    updatePayload.resolvedAt = null;
    updatePayload.resolutionReason = null;
  }

  const updated = await prisma.caException.update({
    where: { id: exceptionId },
    data: updatePayload,
  });

  // Log to centralized audit trail
  try {
    await prisma.auditLog.create({
      data: {
        userId: caUser.id,
        action: newStatus === 'RESOLVED' ? 'EXCEPTION_RESOLVED' : 'EXCEPTION_STATUS_CHANGED',
        entity: 'CA_EXCEPTION',
        entityId: exception.id,
        changes: {
          referenceNumber: exception.referenceNumber,
          previousStatus,
          newStatus,
          reason,
        },
      },
    });
  } catch (_) {}

  return {
    success: true,
    exception: {
      ...updated,
      amount: Number(updated.amount || 0),
      gstAmount: Number(updated.gstAmount || 0),
      differenceAmount: Number(updated.differenceAmount || 0),
    },
  };
};

/**
 * Add a Review Note to an exception.
 */
export const addExceptionNote = async (caUser, exceptionId, data) => {
  const exception = await prisma.caException.findUnique({
    where: { id: exceptionId },
  });

  if (!exception) {
    throw ApiError.notFound('Exception record not found');
  }

  await verifyCAStoreAccess(caUser, exception.businessId);

  if (!data.note || !String(data.note).trim()) {
    throw ApiError.badRequest('Note content cannot be empty');
  }

  const noteEntry = {
    id: `note-${crypto.randomUUID().slice(0, 8)}`,
    author: caUser.name || 'CA Auditor',
    role: caUser.role || 'CA',
    timestamp: new Date(),
    note: String(data.note).trim(),
  };

  const historyEntry = {
    timestamp: new Date(),
    action: 'NOTE_ADDED',
    actor: `${caUser.name || 'CA Auditor'} (${caUser.role || 'CA'})`,
    note: String(data.note).trim(),
  };

  const updatedNotes = Array.isArray(exception.reviewNotes)
    ? [...exception.reviewNotes, noteEntry]
    : [noteEntry];

  const updatedHistory = Array.isArray(exception.history)
    ? [...exception.history, historyEntry]
    : [historyEntry];

  const updated = await prisma.caException.update({
    where: { id: exceptionId },
    data: {
      reviewNotes: updatedNotes,
      history: updatedHistory,
    },
  });

  return {
    success: true,
    exception: updated,
    newNote: noteEntry,
  };
};

/**
 * Request Supporting Document for an exception.
 */
export const requestExceptionDocument = async (caUser, exceptionId, data) => {
  const exception = await prisma.caException.findUnique({
    where: { id: exceptionId },
  });

  if (!exception) {
    throw ApiError.notFound('Exception record not found');
  }

  await verifyCAStoreAccess(caUser, exception.businessId);

  const documentType = data.documentType || 'Tax Invoice Voucher';
  const message = data.message || `Please provide supporting ${documentType} for review of ${exception.referenceNumber}.`;

  const docRequest = {
    id: `req-${crypto.randomUUID().slice(0, 8)}`,
    documentType,
    message,
    requestedBy: caUser.name || 'CA Auditor',
    requestedAt: new Date(),
    status: 'REQUESTED',
  };

  const historyEntry = {
    timestamp: new Date(),
    action: 'DOCUMENT_REQUESTED',
    actor: `${caUser.name || 'CA Auditor'} (${caUser.role || 'CA'})`,
    note: `Document requested: ${documentType}. Message: ${message}`,
  };

  const updatedDocs = Array.isArray(exception.documents)
    ? [...exception.documents, docRequest]
    : [docRequest];

  const updatedHistory = Array.isArray(exception.history)
    ? [...exception.history, historyEntry]
    : [historyEntry];

  const updated = await prisma.caException.update({
    where: { id: exceptionId },
    data: {
      documents: updatedDocs,
      history: updatedHistory,
      status: exception.status === 'OPEN' ? 'IN_REVIEW' : exception.status,
    },
  });

  return {
    success: true,
    exception: updated,
    request: docRequest,
  };
};

/**
 * Classify or Re-classify Customer Type for an exception and its backing invoice.
 */
export const classifyExceptionCustomer = async (caUser, exceptionId, data) => {
  const exception = await prisma.caException.findUnique({
    where: { id: exceptionId },
  });

  if (!exception) {
    throw ApiError.notFound('Exception record not found');
  }

  await verifyCAStoreAccess(caUser, exception.businessId);

  const validTypes = ['B2B', 'B2C', 'SEZ', 'UNCLASSIFIED'];
  const newType = String(data.customerType || '').toUpperCase();
  if (!validTypes.includes(newType)) {
    throw ApiError.badRequest(`Invalid customer type. Must be one of: ${validTypes.join(', ')}`);
  }

  const sezTaxTreatment = newType === 'SEZ'
    ? (data.sezTaxTreatment || exception.sezTaxTreatment || 'WITH_PAYMENT')
    : null;

  const reason = data.reason || `Classification updated to ${newType} by CA.`;

  const historyEntry = {
    timestamp: new Date(),
    action: 'CLASSIFICATION_CHANGED',
    actor: `${caUser.name || 'CA Auditor'} (${caUser.role || 'CA'})`,
    previousType: exception.customerType,
    newType,
    sezTaxTreatment,
    note: reason,
  };

  const updatedHistory = Array.isArray(exception.history)
    ? [...exception.history, historyEntry]
    : [historyEntry];

  // Update Exception
  const updated = await prisma.caException.update({
    where: { id: exceptionId },
    data: {
      customerType: newType,
      sezTaxTreatment,
      history: updatedHistory,
    },
  });

  // Also update backing sale if linked
  if (exception.invoiceId) {
    try {
      await prisma.sale.update({
        where: { id: exception.invoiceId },
        data: {
          customerType: newType,
          isSez: newType === 'SEZ',
          sezTaxTreatment,
        },
      });
    } catch (_) {}
  }

  return {
    success: true,
    exception: updated,
  };
};

export default {
  classifyCustomerAndTransaction,
  getStoreExceptions,
  getExceptionById,
  syncStoreExceptions,
  updateExceptionStatus,
  addExceptionNote,
  requestExceptionDocument,
  classifyExceptionCustomer,
};
