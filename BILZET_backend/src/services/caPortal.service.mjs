import prisma from '../config/prisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.mjs';
import { mapSale, buildDateFilter } from './billing.service.mjs';
import realtimeService from './realtime.service.mjs';

/**
 * Chartered Accountant (CA) Portal Service
 * Enforces store-level authorization and financial synchronization.
 */

/**
 * Retrieve all businesses/stores that the given CA is explicitly authorized to audit.
 * @param {Object} caUser - Authenticated CA user object
 */
export const getAuthorizedStoresForCA = async (caUser) => {
  if (!caUser) throw ApiError.unauthorized('Authentication required');

  const isSuperAdmin = caUser.role === 'SUPER_ADMIN' || caUser.isSuperAdmin;
  const isAdmin = caUser.role === 'ADMIN' || caUser.role === 'OWNER';

  if (isSuperAdmin || (isAdmin && !caUser.businessId)) {
    const allStores = await prisma.business.findMany({
      orderBy: { name: 'asc' },
    });
    return allStores.map((s) => ({
      id: s.id,
      name: s.name,
      gstin: s.gstin || '',
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
      state: s.state || 'Tamil Nadu',
      isAuthorized: true,
    }));
  }

  // 1. Direct business assignment on User record
  const directBusinessIds = caUser.businessId ? [caUser.businessId] : [];

  // 2. Explicit CAStoreAccess assignments
  let assignedBusinessIds = [];
  try {
    const assignments = await prisma.caStoreAccess.findMany({
      where: {
        caUserId: caUser.id,
        status: 'ACTIVE',
      },
    });
    assignedBusinessIds = assignments.map((a) => a.businessId);
  } catch (_) {
    // Graceful fallback if table is empty or in mock
  }

  // 3. Staff invitations linking the CA's email to a business
  let staffBusinessIds = [];
  if (caUser.email) {
    const staffRecords = await prisma.staff.findMany({
      where: {
        email: { equals: caUser.email.trim(), mode: 'insensitive' },
        status: 'ACTIVE',
      },
    });
    staffBusinessIds = staffRecords.map((s) => s.businessId).filter(Boolean);
  }

  // Combined authorized business IDs (unique)
  const combinedIds = Array.from(
    new Set([...directBusinessIds, ...assignedBusinessIds, ...staffBusinessIds])
  );

  if (combinedIds.length === 0) {
    return [];
  }

  const stores = await prisma.business.findMany({
    where: {
      id: { in: combinedIds },
    },
    orderBy: { name: 'asc' },
  });

  return stores.map((s) => ({
    id: s.id,
    name: s.name,
    gstin: s.gstin || '',
    phone: s.phone || '',
    email: s.email || '',
    address: s.address || '',
    state: s.state || 'Tamil Nadu',
    isAuthorized: true,
  }));
};

/**
 * Strictly verifies that the CA is authorized for the given store.
 * Throws 403 Forbidden if not authorized.
 */
export const verifyCAStoreAccess = async (caUser, storeId) => {
  if (!storeId) {
    throw ApiError.badRequest('Store ID is required');
  }

  if (caUser.role === 'SUPER_ADMIN' || caUser.isSuperAdmin) {
    return { id: storeId };
  }

  if ((caUser.role === 'ADMIN' || caUser.role === 'OWNER') && (!caUser.businessId || caUser.businessId === storeId)) {
    return { id: storeId };
  }

  const authorizedStores = await getAuthorizedStoresForCA(caUser);
  const isAuthorized = authorizedStores.some((s) => s.id === storeId);

  if (!isAuthorized) {
    throw ApiError.forbidden(
      `Access denied: Chartered Accountant is not authorized to access store records for store '${storeId}'`
    );
  }

  return authorizedStores.find((s) => s.id === storeId);
};

/**
 * Format invoice for CA audit view with full GST breakdown, balance due, and returns.
 * Guarantees 100% database-backed synchronization with shop owner's view.
 */
export const formatCAInvoice = (sale, store = null) => {
  const mapped = mapSale(sale);
  const storeState = store?.state || 'Tamil Nadu';

  return {
    ...mapped,
    id: mapped.id,
    _id: mapped.id,
    storeId: mapped.businessId,
    storeName: store?.name || mapped.business?.name || 'Authorized Store',
    date: mapped.createdAt,
    customer: {
      id: mapped.customer?.id,
      name: mapped.customer?.name || 'Counter Sale / Walk-in',
      phone: mapped.customer?.phone || '',
      email: mapped.customer?.email || '',
      gstin: mapped.customer?.gstin || '',
      address: mapped.customer?.address || '',
      state: mapped.customer?.state || storeState,
      isB2B: Boolean(mapped.customer?.gstin && mapped.customer.gstin.trim().length >= 10),
    },
    hasReturns: Boolean(mapped.returns && mapped.returns.length > 0),
  };
};

/**
 * Fetch invoices for an authorized store with filtering, pagination, and search.
 */
export const getStoreInvoicesForCA = async (caUser, storeId, query = {}) => {
  const store = await verifyCAStoreAccess(caUser, storeId);
  const { page, limit, skip } = getPaginationParams(query);

  const where = {
    businessId: storeId,
  };

  // Search filter (invoiceNumber, customer name, phone, or GSTIN)
  if (query.search && String(query.search).trim()) {
    const s = String(query.search).trim();
    where.OR = [
      { invoiceNumber: { contains: s, mode: 'insensitive' } },
      { customer: { name: { contains: s, mode: 'insensitive' } } },
      { customer: { phone: { contains: s } } },
      { customer: { gstin: { contains: s, mode: 'insensitive' } } },
    ];
  }

  // Date-wise, month-wise, and year-wise filtering (Req 6)
  const dateFilter = buildDateFilter(query);
  if (dateFilter) {
    where.createdAt = dateFilter;
  }

  // Payment status filter (Req 2)
  if (query.paymentStatus && query.paymentStatus !== 'ALL') {
    const ps = query.paymentStatus.toUpperCase();
    if (ps === 'PARTIALLY PAID' || ps === 'PARTIALLY_PAID' || ps === 'PARTIAL') {
      where.paymentStatus = { in: ['PARTIALLY_PAID', 'PARTIAL'] };
    } else {
      where.paymentStatus = ps;
    }
  } else if (query.status && query.status !== 'ALL') {
    const st = query.status.toUpperCase();
    if (['PAID', 'UNPAID', 'PENDING', 'PARTIAL', 'PARTIALLY_PAID', 'PARTIALLY PAID'].includes(st)) {
      if (st === 'PARTIALLY PAID' || st === 'PARTIALLY_PAID' || st === 'PARTIAL') {
        where.paymentStatus = { in: ['PARTIALLY_PAID', 'PARTIAL'] };
      } else {
        where.paymentStatus = st;
      }
    } else if (['NONE', 'PARTIALLY_RETURNED', 'RETURNED'].includes(st)) {
      where.returnStatus = st;
    }
  }

  // Return status filter (Req 2)
  if (query.returnStatus && query.returnStatus !== 'ALL') {
    where.returnStatus = query.returnStatus.toUpperCase();
  }

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        items: true,
        payments: true,
        returns: { include: { items: true } },
      },
    }),
    prisma.sale.count({ where }),
  ]);

  return {
    store,
    invoices: sales.map((sale) => formatCAInvoice(sale, store)),
    meta: buildPaginationMeta(total, page, limit),
  };
};

/**
 * Fetch a single invoice record for CA audit, enforcing store authorization.
 */
export const getInvoiceByIdForCA = async (caUser, invoiceId) => {
  const sale = await prisma.sale.findUnique({
    where: { id: invoiceId },
    include: {
      customer: true,
      items: true,
      payments: true,
      returns: { include: { items: true } },
      auditLogs: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
      business: true,
    },
  });

  if (!sale) {
    throw ApiError.notFound('Invoice not found');
  }

  // Verify CA is authorized for this invoice's store
  const store = await verifyCAStoreAccess(caUser, sale.businessId);

  return formatCAInvoice(sale, store);
};

/**
 * Fetch complete audit trail of an invoice for the authorized CA.
 */
export const getInvoiceAuditTrailForCA = async (caUser, invoiceId) => {
  const sale = await prisma.sale.findUnique({
    where: { id: invoiceId },
    include: {
      customer: true,
      items: true,
      business: true,
    },
  });

  if (!sale) {
    throw ApiError.notFound('Invoice not found');
  }

  await verifyCAStoreAccess(caUser, sale.businessId);

  const logs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entityId: invoiceId },
        { entity: 'SALE', entityId: invoiceId },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  return {
    invoiceId,
    invoiceNumber: sale.invoiceNumber,
    auditTrail: logs.map((log) => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      changes: log.changes,
      performedBy: log.user
        ? { id: log.user.id, name: log.user.name, email: log.user.email, role: log.user.role }
        : null,
      timestamp: log.createdAt,
    })),
  };
};


/**
 * Compute financial summary & tax audit metrics for the authorized store.
 */
export const getFinancialSummaryForCA = async (caUser, storeId, query = {}) => {
  const store = await verifyCAStoreAccess(caUser, storeId);

  const where = {
    businessId: storeId,
  };

  const dateFilter = buildDateFilter(query);
  if (dateFilter) {
    where.createdAt = dateFilter;
  }

  const sales = await prisma.sale.findMany({
    where,
    include: {
      customer: true,
      items: true,
      returns: {
        include: { items: true },
      },
    },
  });

  let totalInvoices = sales.length;
  let totalSalesBeforeReturns = 0;
  let totalReturnsCount = 0;
  let totalReturnsAmount = 0;
  let gstCollectedOnSales = 0;
  let gstAdjustmentsFromReturns = 0;
  let totalPaid = 0;
  let totalBalanceDue = 0;

  let totalTaxable = 0;
  let taxableAdjustmentsFromReturns = 0;

  let totalOriginalCgst = 0;
  let totalOriginalSgst = 0;
  let totalOriginalIgst = 0;

  let totalCgstAdjustment = 0;
  let totalSgstAdjustment = 0;
  let totalIgstAdjustment = 0;

  let b2bCount = 0;
  let b2bTaxable = 0;
  let b2bTax = 0;

  let b2cCount = 0;
  let b2cTaxable = 0;
  let b2cTax = 0;

  // Slabs tracking: 0%, 5%, 12%, 18%, 28%
  const slabs = {
    '0': { rate: 0, taxable: 0, tax: 0 },
    '5': { rate: 5, taxable: 0, tax: 0 },
    '12': { rate: 12, taxable: 0, tax: 0 },
    '18': { rate: 18, taxable: 0, tax: 0 },
    '28': { rate: 28, taxable: 0, tax: 0 },
    other: { rate: 'other', taxable: 0, tax: 0 },
  };

  for (const sale of sales) {
    const formatted = formatCAInvoice(sale, store);

    const originalGrand = Number(formatted.originalGrandTotal ?? formatted.grandTotal ?? 0);
    const retAmount = Number(formatted.totalReturnedAmount ?? 0);
    const origGst = Number(formatted.originalTaxTotal ?? (formatted.taxTotal + (formatted.gstAdjustment || 0)));
    const gstAdj = Number(formatted.gstAdjustment ?? 0);
    const origTaxable = Number(formatted.originalTaxableAmount ?? formatted.taxableAmount ?? 0);
    const taxableReversal = Number(formatted.returnedTaxableAmount ?? 0);

    totalSalesBeforeReturns += originalGrand;
    totalReturnsAmount += retAmount;
    gstCollectedOnSales += origGst;
    gstAdjustmentsFromReturns += gstAdj;
    totalTaxable += origTaxable;
    taxableAdjustmentsFromReturns += taxableReversal;

    totalPaid += Number(formatted.paidAmount || 0);
    totalBalanceDue += Number(formatted.balanceDue || 0);

    // Intra vs Inter-state adjustments
    totalCgstAdjustment += Number(formatted.cgstAdjustment || 0);
    totalSgstAdjustment += Number(formatted.sgstAdjustment || 0);
    totalIgstAdjustment += Number(formatted.igstAdjustment || 0);

    // Original tax components
    const isInter = formatted.isInterState;
    if (isInter) {
      totalOriginalIgst += origGst;
    } else {
      totalOriginalCgst += origGst / 2;
      totalOriginalSgst += origGst / 2;
    }

    if (sale.returns && sale.returns.length > 0) {
      totalReturnsCount += sale.returns.length;
    }

    if (formatted.customer.isB2B) {
      b2bCount++;
      b2bTaxable += origTaxable;
      b2bTax += origGst;
    } else {
      b2cCount++;
      b2cTaxable += origTaxable;
      b2cTax += origGst;
    }

    // Slabs breakdown from items
    for (const item of formatted.items) {
      const slabKey = String(Math.round(item.gstRate));
      if (slabs[slabKey]) {
        slabs[slabKey].taxable += item.taxableAmount;
        slabs[slabKey].tax += item.originalTaxAmount || item.taxAmount;
      } else {
        slabs.other.taxable += item.taxableAmount;
        slabs.other.tax += item.originalTaxAmount || item.taxAmount;
      }
    }
  }

  const netSalesAfterReturns = Math.max(0, totalSalesBeforeReturns - totalReturnsAmount);
  const netGst = Math.max(0, gstCollectedOnSales - gstAdjustmentsFromReturns);
  const netTaxable = Math.max(0, totalTaxable - taxableAdjustmentsFromReturns);

  return {
    store,
    period: {
      startDate: query.startDate || null,
      endDate: query.endDate || null,
      month: query.month || null,
      year: query.year || null,
    },
    metrics: {
      // 7 Core CA Dashboard Requirements:
      totalInvoices,
      totalSalesBeforeReturns: Number(totalSalesBeforeReturns.toFixed(2)),
      totalReturnsAndCreditNotes: Number(totalReturnsAmount.toFixed(2)),
      totalReturnsAmount: Number(totalReturnsAmount.toFixed(2)),
      netSalesAfterReturns: Number(netSalesAfterReturns.toFixed(2)),
      gstCollectedOnSales: Number(gstCollectedOnSales.toFixed(2)),
      gstAdjustmentsFromReturns: Number(gstAdjustmentsFromReturns.toFixed(2)),
      paymentsReceived: Number(totalPaid.toFixed(2)),
      outstandingBalances: Number(totalBalanceDue.toFixed(2)),

      // Additional audit & reconciliation metrics:
      netGst: Number(netGst.toFixed(2)),
      totalReturnsCount,
      totalPaid: Number(totalPaid.toFixed(2)),
      totalBalanceDue: Number(totalBalanceDue.toFixed(2)),
      totalTaxable: Number(totalTaxable.toFixed(2)),
      taxableAdjustmentsFromReturns: Number(taxableAdjustmentsFromReturns.toFixed(2)),
      netTaxable: Number(netTaxable.toFixed(2)),
      totalGst: Number(gstCollectedOnSales.toFixed(2)),
      totalCgst: Number(totalOriginalCgst.toFixed(2)),
      totalSgst: Number(totalOriginalSgst.toFixed(2)),
      totalIgst: Number(totalOriginalIgst.toFixed(2)),
      cgstAdjustment: Number(totalCgstAdjustment.toFixed(2)),
      sgstAdjustment: Number(totalSgstAdjustment.toFixed(2)),
      igstAdjustment: Number(totalIgstAdjustment.toFixed(2)),
      totalGrandTotal: Number(totalSalesBeforeReturns.toFixed(2)),
    },
    gstFiling: {
      b2b: {
        count: b2bCount,
        taxable: Number(b2bTaxable.toFixed(2)),
        tax: Number(b2bTax.toFixed(2)),
      },
      b2c: {
        count: b2cCount,
        taxable: Number(b2cTaxable.toFixed(2)),
        tax: Number(b2cTax.toFixed(2)),
      },
      slabs,
    },
  };
};

/**
 * Inspect credit notes and returns for a specific invoice for CA audit.
 */
export const getInvoiceCreditNotesForCA = async (caUser, invoiceId) => {
  const invoice = await getInvoiceByIdForCA(caUser, invoiceId);
  return {
    invoiceNumber: invoice.invoiceNumber,
    creditNotes: invoice.returns || invoice.creditNotes || [],
    hasReturns: invoice.hasReturns,
  };
};

/**
 * Fetch all credit notes for an authorized store with optional filtering.
 */
export const getStoreCreditNotesForCA = async (caUser, storeId, query = {}) => {
  const store = await verifyCAStoreAccess(caUser, storeId);
  const where = {
    sale: { businessId: storeId },
  };

  const dateFilter = buildDateFilter(query);
  if (dateFilter) {
    where.createdAt = dateFilter;
  }

  if (query.search && String(query.search).trim()) {
    const s = String(query.search).trim();
    where.OR = [
      { returnNumber: { contains: s, mode: 'insensitive' } },
      { reason: { contains: s, mode: 'insensitive' } },
      { sale: { invoiceNumber: { contains: s, mode: 'insensitive' } } },
      { sale: { customer: { name: { contains: s, mode: 'insensitive' } } } },
      { sale: { customer: { phone: { contains: s } } } },
      { sale: { customer: { gstin: { contains: s, mode: 'insensitive' } } } },
    ];
  }

  const returns = await prisma.salesReturn.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      items: true,
      sale: {
        include: {
          items: true,
          customer: true,
          business: true,
          returns: {
            include: { items: true },
          },
        },
      },
    },
  });

  const creditNotes = returns.map((ret) => {
    const saleReturns = ret.sale?.returns && ret.sale.returns.length > 0 ? ret.sale.returns : [ret];
    const mappedSale = mapSale({ ...ret.sale, returns: saleReturns, businessState: store.state || 'Tamil Nadu' });
    const enriched = (mappedSale?.returns || []).find((r) => r.id === ret.id) || (mappedSale?.returns || [])[0] || ret;
    const cnNumber = enriched.creditNoteNumber || (ret.returnNumber ? ret.returnNumber.replace(/^RET-/, 'CN-') : `CN-${ret.id}`);

    const creditAmount = Number(enriched.totalAmount || enriched.totalRefund || ret.totalAmount || ret.totalRefund || 0);
    return {
      ...enriched,
      amount: creditAmount,
      totalAmount: creditAmount,
      creditNoteNumber: cnNumber,
      invoiceNumber: enriched.invoiceNumber || ret.sale?.invoiceNumber,
      invoiceId: enriched.invoiceId || ret.sale?.id,
      storeId,
      storeName: store.name,
      customer: mappedSale?.customer || ret.sale?.customer,
      isInterState: mappedSale?.isInterState,
    };
  });

  return {
    store,
    creditNotes,
    total: creditNotes.length,
  };
};

/**
 * Fetch all invoice activities and audit events for an authorized store.
 * Synchronizes committed invoices, payments, returns, and adjustments for CA audit.
 */
export const getStoreActivityForCA = async (caUser, storeId, query = {}) => {
  const store = await verifyCAStoreAccess(caUser, storeId);
  const where = {
    businessId: storeId,
  };

  const dateFilter = buildDateFilter(query);
  if (dateFilter) {
    where.createdAt = dateFilter;
  }

  const sales = await prisma.sale.findMany({
    where,
    select: {
      id: true,
      invoiceNumber: true,
      grandTotal: true,
      paidAmount: true,
      paymentStatus: true,
      returnStatus: true,
      createdAt: true,
      customer: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const saleMap = new Map(sales.map((s) => [s.id, s]));
  const saleIds = Array.from(saleMap.keys());

  const logWhere = {
    entity: 'SALE',
    entityId: { in: saleIds },
  };
  if (dateFilter) {
    logWhere.createdAt = dateFilter;
  }

  const logs = await prisma.auditLog.findMany({
    where: logWhere,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  const activity = logs.map((log) => {
    const sale = saleMap.get(log.entityId);
    const changes = log.changes || {};
    const invoiceNumber = sale?.invoiceNumber || changes.invoiceNumber || 'INV';
    const customerName = sale?.customer?.name || changes.customerName || 'Walk-in Retail Customer';
    const eventType = changes.eventType || log.action;

    return {
      id: log.id,
      invoiceId: log.entityId,
      invoiceNumber,
      customerName,
      customerPhone: sale?.customer?.phone || changes.customerPhone || null,
      eventType,
      action: log.action,
      changes,
      details: {
        ...changes,
        invoiceNumber,
        customerName,
        eventType,
      },
      before: changes.before || null,
      after: changes.after || null,
      adjustment: changes.adjustment || null,
      storeId,
      storeName: store.name,
      performedBy: log.user,
      timestamp: log.createdAt,
      status: 'SYNCHRONIZED',
    };
  });

  return {
    store,
    activity,
    total: activity.length,
  };
};

/**
 * 4. Purchases and Supplier Audit
 */
export const getStorePurchasesForCA = async (caUser, storeId, query = {}) => {
  const store = await verifyCAStoreAccess(caUser, storeId);
  const { page, limit, skip } = getPaginationParams(query);

  const where = {};
  if (query.status && query.status !== 'ALL') {
    where.status = query.status.toUpperCase();
  }
  if (query.paymentStatus && query.paymentStatus !== 'ALL') {
    where.paymentStatus = query.paymentStatus.toUpperCase();
  }

  const [purchases, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: true,
        items: { include: { product: true } },
        returns: true,
      },
    }),
    prisma.purchase.count({ where }),
  ]);

  const formattedPurchases = purchases.map((p) => {
    const subtotal = Number(p.subtotal || 0);
    const taxTotal = Number(p.taxTotal || 0);
    const grandTotal = Number(p.grandTotal || 0);
    const paidAmount = Number(p.paidAmount || 0);
    const balanceDue = Math.max(0, grandTotal - paidAmount);

    return {
      id: p.id,
      invoiceNumber: p.invoiceNumber,
      poNumber: p.poNumber,
      supplierName: p.supplier?.name || 'Authorized Supplier',
      supplierGstin: p.supplier?.gstin || null,
      supplierPhone: p.supplier?.phone || null,
      supplierBalance: Number(p.supplier?.balance || 0),
      subtotal,
      taxTotal,
      grandTotal,
      paidAmount,
      balanceDue,
      paymentStatus: p.paymentStatus,
      paymentMethod: p.paymentMethod,
      status: p.status,
      purchaseDate: p.purchaseDate || p.createdAt,
      itemCount: p.items?.length || 0,
      items: (p.items || []).map((it) => ({
        id: it.id,
        productName: it.product?.name || 'Purchase Item',
        quantity: it.quantity,
        rate: Number(it.purchasePrice || 0),
        taxRate: Number(it.gstRate || 0),
        taxAmount: Number(it.taxAmount || 0),
        total: Number(it.total || 0),
      })),
      returns: p.returns || [],
    };
  });

  return {
    store,
    purchases: formattedPurchases,
    meta: buildPaginationMeta(total, page, limit),
  };
};

export const getStoreSuppliersForCA = async (caUser, storeId) => {
  const store = await verifyCAStoreAccess(caUser, storeId);
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: 'asc' },
    include: {
      purchases: { select: { id: true, grandTotal: true, paidAmount: true } },
    },
  });

  return {
    store,
    suppliers: suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      companyName: s.companyName,
      phone: s.phone,
      email: s.email,
      gstin: s.gstin,
      balance: Number(s.balance || 0),
      purchaseCount: s.purchases?.length || 0,
    })),
  };
};

/**
 * 5. Bank and Payment Reconciliation
 */
export const getStorePaymentsForCA = async (caUser, storeId, query = {}) => {
  const store = await verifyCAStoreAccess(caUser, storeId);
  const { page, limit, skip } = getPaginationParams(query);

  const where = {
    OR: [
      { sale: { businessId: storeId } },
      { customer: { businessId: storeId } },
    ],
  };
  if (query.method && query.method !== 'ALL') {
    where.method = query.method.toUpperCase();
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        sale: { select: { id: true, invoiceNumber: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
    }),
    prisma.payment.count({ where }),
  ]);

  let totalReconciled = 0;
  const formattedPayments = payments.map((p) => {
    const amount = Number(p.amount || 0);
    totalReconciled += amount;

    return {
      id: p.id,
      saleId: p.saleId,
      invoiceNumber: p.sale?.invoiceNumber || (p.saleId ? `Invoice #${p.saleId.slice(0, 8)}` : 'Payment In (On-Account)'),
      customerName: p.customer?.name || 'Walk-in Retail Customer',
      amount,
      method: p.method,
      transactionId: p.transactionId || null,
      note: p.note,
      createdAt: p.createdAt,
      reconciliationStatus: p.transactionId ? 'MATCHED' : 'RECORDED',
    };
  });

  return {
    store,
    payments: formattedPayments,
    totalAmount: totalReconciled,
    meta: buildPaginationMeta(total, page, limit),
  };
};

/**
 * 6. Expenses and Financial Review
 */
export const getStoreExpensesForCA = async (caUser, storeId, query = {}) => {
  const store = await verifyCAStoreAccess(caUser, storeId);
  const { page, limit, skip } = getPaginationParams(query);

  const where = {};
  if (query.category && query.category !== 'ALL') {
    where.category = query.category;
  }
  const dateFilter = buildDateFilter(query);
  if (dateFilter) {
    where.createdAt = dateFilter;
  }

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        recordedBy: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.expense.count({ where }),
  ]);

  let totalExpenseAmount = 0;
  const categoryBreakdown = {};

  const formattedExpenses = expenses.map((e) => {
    const amt = Number(e.amount || 0);
    totalExpenseAmount += amt;
    categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + amt;

    return {
      id: e.id,
      title: e.title,
      category: e.category,
      amount: amt,
      paymentMethod: e.paymentMethod,
      date: e.date || e.createdAt,
      note: e.note,
      recordedBy: e.recordedBy?.name || 'Admin',
    };
  });

  return {
    store,
    expenses: formattedExpenses,
    totalAmount: Number(totalExpenseAmount.toFixed(2)),
    categoryBreakdown,
    meta: buildPaginationMeta(total, page, limit),
  };
};

/**
 * 8. Inventory Audit and Stock Movements
 */
export const getStoreInventoryForCA = async (caUser, storeId, query = {}) => {
  const store = await verifyCAStoreAccess(caUser, storeId);
  const { page, limit, skip } = getPaginationParams(query);

  const where = { businessId: storeId };
  if (query.search) {
    where.name = { contains: String(query.search).trim(), mode: 'insensitive' };
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
    }),
    prisma.product.count({ where }),
  ]);

  let totalValuation = 0;
  let lowStockCount = 0;

  const formattedProducts = products.map((p) => {
    const stock = Number(p.stock || 0);
    const cost = Number(p.costPrice || p.price || 0);
    const selling = Number(p.sellingPrice || p.price || 0);
    const val = stock * cost;
    totalValuation += val;

    if (stock <= (p.minStockLevel || 5)) {
      lowStockCount++;
    }

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      hsnCode: p.hsnCode || '1904',
      stock,
      unit: p.unit || 'pcs',
      costPrice: cost,
      sellingPrice: selling,
      taxPercent: Number(p.taxPercent || p.gstRate || 0),
      valuation: Number(val.toFixed(2)),
      isLowStock: stock <= (p.minStockLevel || 5),
    };
  });

  // Recent stock transactions / movements
  const recentMovements = await prisma.stockTransaction.findMany({
    take: 50,
    orderBy: { createdAt: 'desc' },
    include: {
      product: { select: { id: true, name: true, sku: true } },
    },
  });

  return {
    store,
    products: formattedProducts,
    summary: {
      totalProducts: total,
      totalValuation: Number(totalValuation.toFixed(2)),
      lowStockCount,
    },
    recentMovements: recentMovements.map((m) => ({
      id: m.id,
      productName: m.product?.name || 'Stock Item',
      type: m.type,
      quantity: m.quantity,
      previousStock: m.previousStock,
      newStock: m.newStock,
      reason: m.reason,
      createdAt: m.createdAt,
    })),
    meta: buildPaginationMeta(total, page, limit),
  };
};

/**
 * 2. Audit Workflow & Task Pipeline
 */
export const getStoreTasksForCA = async (caUser, storeId, query = {}) => {
  const store = await verifyCAStoreAccess(caUser, storeId);
  const where = { businessId: storeId };
  if (query.status && query.status !== 'ALL') {
    where.status = query.status.toUpperCase();
  }
  if (query.category && query.category !== 'ALL') {
    where.category = query.category.toUpperCase();
  }

  const tasks = await prisma.auditTask.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  const counts = {
    PENDING: 0,
    IN_REVIEW: 0,
    FLAGGED: 0,
    CORRECTION_REQUESTED: 0,
    RESOLVED: 0,
    COMPLETED: 0,
  };
  tasks.forEach((t) => {
    if (counts[t.status] !== undefined) counts[t.status]++;
  });

  return {
    store,
    tasks,
    counts,
    total: tasks.length,
  };
};

export const createTaskForCA = async (caUser, storeId, data) => {
  const store = await verifyCAStoreAccess(caUser, storeId);
  if (!data.title) throw ApiError.badRequest('Task title is required');

  const task = await prisma.auditTask.create({
    data: {
      businessId: storeId,
      title: data.title,
      description: data.description || null,
      category: (data.category || 'GENERAL').toUpperCase(),
      status: (data.status || 'PENDING').toUpperCase(),
      priority: (data.priority || 'MEDIUM').toUpperCase(),
      assignedToId: data.assignedToId || null,
      createdById: caUser.id,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      entityType: data.entityType || null,
      entityId: data.entityId || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: caUser.id,
      action: 'TASK_CREATED',
      entity: 'AUDIT_TASK',
      entityId: task.id,
      changes: { title: task.title, category: task.category, storeId },
    },
  });

  return task;
};

export const updateTaskForCA = async (caUser, storeId, taskId, data) => {
  await verifyCAStoreAccess(caUser, storeId);
  const existing = await prisma.auditTask.findUnique({ where: { id: taskId } });
  if (!existing || existing.businessId !== storeId) {
    throw ApiError.notFound('Audit task not found');
  }

  const updated = await prisma.auditTask.update({
    where: { id: taskId },
    data: {
      title: data.title ?? existing.title,
      description: data.description ?? existing.description,
      status: data.status ? data.status.toUpperCase() : existing.status,
      priority: data.priority ? data.priority.toUpperCase() : existing.priority,
      resolutionNotes: data.resolutionNotes ?? existing.resolutionNotes,
      dueDate: data.dueDate ? new Date(data.dueDate) : existing.dueDate,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: caUser.id,
      action: 'TASK_UPDATED',
      entity: 'AUDIT_TASK',
      entityId: taskId,
      changes: { before: existing, after: updated },
    },
  });

  return updated;
};

export const deleteTaskForCA = async (caUser, storeId, taskId) => {
  await verifyCAStoreAccess(caUser, storeId);
  const existing = await prisma.auditTask.findUnique({ where: { id: taskId } });
  if (!existing || existing.businessId !== storeId) {
    throw ApiError.notFound('Audit task not found');
  }

  await prisma.auditTask.delete({ where: { id: taskId } });
  return { success: true };
};

/**
 * 10. Discrepancies & Corrections
 */
export const getStoreDiscrepanciesForCA = async (caUser, storeId, query = {}) => {
  const store = await verifyCAStoreAccess(caUser, storeId);
  const where = { businessId: storeId };
  if (query.status && query.status !== 'ALL') {
    where.status = query.status.toUpperCase();
  }

  const discrepancies = await prisma.auditDiscrepancy.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return {
    store,
    discrepancies,
    total: discrepancies.length,
  };
};

export const flagDiscrepancyForCA = async (caUser, storeId, data) => {
  const store = await verifyCAStoreAccess(caUser, storeId);
  if (!data.title || !data.description) {
    throw ApiError.badRequest('Title and description are required to flag a discrepancy');
  }

  const discrepancy = await prisma.auditDiscrepancy.create({
    data: {
      businessId: storeId,
      taskId: data.taskId || null,
      title: data.title,
      description: data.description,
      entityType: (data.entityType || 'INVOICE').toUpperCase(),
      entityId: data.entityId || null,
      referenceNumber: data.referenceNumber || null,
      discrepancyType: (data.discrepancyType || 'TAX_MISMATCH').toUpperCase(),
      amount: data.amount ? Number(data.amount) : null,
      status: 'CORRECTION_REQUESTED',
      flaggedById: caUser.id,
      correctionRequested: data.correctionRequested || data.description,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: caUser.id,
      action: 'DISCREPANCY_FLAGGED',
      entity: 'DISCREPANCY',
      entityId: discrepancy.id,
      changes: {
        title: discrepancy.title,
        entityType: discrepancy.entityType,
        referenceNumber: discrepancy.referenceNumber,
        storeId,
      },
    },
  });

  try {
    realtimeService.broadcastBusinessEvent(storeId, 'DISCREPANCY_FLAGGED', {
      discrepancyId: discrepancy.id,
      title: discrepancy.title,
      entityType: discrepancy.entityType,
      referenceNumber: discrepancy.referenceNumber,
      discrepancy,
    }, { userId: caUser.id, action: 'DISCREPANCY_FLAGGED' });
  } catch (_) {}

  return discrepancy;
};

export const resolveDiscrepancy = async (user, discrepancyId, data) => {
  const disc = await prisma.auditDiscrepancy.findUnique({ where: { id: discrepancyId } });
  if (!disc) throw ApiError.notFound('Discrepancy record not found');

  const updated = await prisma.auditDiscrepancy.update({
    where: { id: discrepancyId },
    data: {
      status: 'RESOLVED',
      correctionResponse: data.correctionResponse || data.resolutionNotes || 'Correction submitted by store owner',
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'CORRECTION_RESOLVED',
      entity: 'DISCREPANCY',
      entityId: discrepancyId,
      changes: { correctionResponse: updated.correctionResponse },
    },
  });

  try {
    realtimeService.broadcastBusinessEvent(disc.businessId, 'DISCREPANCY_RESOLVED', {
      discrepancyId,
      discrepancy: updated,
    }, { userId: user.id, action: 'CORRECTION_RESOLVED' });
  } catch (_) {}

  return updated;
};

export const verifyDiscrepancyForCA = async (caUser, discrepancyId, data = {}) => {
  const disc = await prisma.auditDiscrepancy.findUnique({ where: { id: discrepancyId } });
  if (!disc) throw ApiError.notFound('Discrepancy record not found');
  await verifyCAStoreAccess(caUser, disc.businessId);

  const updated = await prisma.auditDiscrepancy.update({
    where: { id: discrepancyId },
    data: {
      status: 'VERIFIED',
      verifiedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: caUser.id,
      action: 'CORRECTION_VERIFIED',
      entity: 'DISCREPANCY',
      entityId: discrepancyId,
      changes: { status: 'VERIFIED', verifiedAt: updated.verifiedAt },
    },
  });

  try {
    realtimeService.broadcastBusinessEvent(disc.businessId, 'DISCREPANCY_VERIFIED', {
      discrepancyId,
      discrepancy: updated,
    }, { userId: caUser.id, action: 'CORRECTION_VERIFIED' });
  } catch (_) {}

  return updated;
};

/**
 * 10B. CA Correction Workflow: Request, Approve & Reject Invoice Correction
 */
export const requestInvoiceCorrection = async (caUser, storeId, invoiceId, data = {}) => {
  await verifyCAStoreAccess(caUser, storeId);
  const invoice = await prisma.sale.findUnique({
    where: { id: invoiceId },
    include: { customer: true, items: true },
  });
  if (!invoice) throw ApiError.notFound('Invoice not found');

  // Check period closing protection
  const invoiceDate = new Date(invoice.createdAt);
  const periodStr = `${invoiceDate.getFullYear()}-${String(invoiceDate.getMonth() + 1).padStart(2, '0')}`;
  const closedPeriod = await prisma.periodClosing.findFirst({
    where: { businessId: storeId, period: periodStr, status: { in: ['CLOSED', 'SIGNED_OFF'] } },
  });
  if (closedPeriod) {
    throw ApiError.badRequest(
      `Period '${periodStr}' has already been closed/signed off. Retroactive corrections must be handled as controlled tax adjustments.`
    );
  }

  const discrepancy = await prisma.auditDiscrepancy.create({
    data: {
      businessId: storeId,
      entityType: 'INVOICE',
      entityId: invoiceId,
      referenceNumber: invoice.invoiceNumber,
      title: data.title || `Correction Requested for ${invoice.invoiceNumber}`,
      description: data.reason || data.description || 'Chartered Accountant requested invoice correction',
      discrepancyType: data.discrepancyType || 'INVOICE_CORRECTION',
      amount: data.amount ? Number(data.amount) : Number(invoice.grandTotal),
      status: 'CORRECTION_REQUESTED',
      flaggedById: caUser.id,
      correctionRequested: JSON.stringify(data.proposedChanges || data),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: caUser.id,
      action: 'INVOICE_CORRECTION_REQUESTED',
      entity: 'SALE',
      entityId: invoiceId,
      changes: {
        eventType: 'INVOICE_CORRECTION_REQUESTED',
        discrepancyId: discrepancy.id,
        invoiceNumber: invoice.invoiceNumber,
        proposedChanges: data.proposedChanges || data,
        requestedBy: caUser.name || caUser.email,
      },
    },
  });

  try {
    realtimeService.broadcastBusinessEvent(storeId, 'INVOICE_CORRECTION_REQUESTED', {
      discrepancyId: discrepancy.id,
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      discrepancy,
    }, { userId: caUser.id, action: 'INVOICE_CORRECTION_REQUESTED' });
  } catch (_) {}

  return discrepancy;
};

export const approveInvoiceCorrection = async (user, discrepancyId, approvalData = {}) => {
  const discrepancy = await prisma.auditDiscrepancy.findUnique({
    where: { id: discrepancyId },
  });
  if (!discrepancy) throw ApiError.notFound('Discrepancy not found');
  if (discrepancy.status !== 'CORRECTION_REQUESTED' && discrepancy.status !== 'FLAGGED') {
    throw ApiError.badRequest('Only pending corrections can be approved');
  }

  const storeId = discrepancy.businessId;

  // Verify role authorization
  const isSuperAdmin = user.role === 'SUPER_ADMIN' || user.isSuperAdmin;
  const isAdmin = user.role === 'ADMIN' || user.role === 'OWNER' || user.role === 'MANAGER';
  if (!isSuperAdmin && !isAdmin && user.businessId !== storeId) {
    throw ApiError.forbidden('Only store administrator or authorized reviewer can approve invoice corrections');
  }

  const updatedDiscrepancy = await prisma.auditDiscrepancy.update({
    where: { id: discrepancyId },
    data: {
      status: 'VERIFIED',
      verifiedAt: new Date(),
      correctionResponse: approvalData.notes || 'Approved and applied by store reviewer',
    },
  });

  let updatedSale = null;
  if (discrepancy.entityType === 'INVOICE' && discrepancy.entityId) {
    const sale = await prisma.sale.findUnique({ where: { id: discrepancy.entityId } });
    if (sale) {
      const updateData = {};
      if (approvalData.dueDate) updateData.dueDate = new Date(approvalData.dueDate);

      if (Object.keys(updateData).length > 0) {
        updatedSale = await prisma.sale.update({
          where: { id: discrepancy.entityId },
          data: updateData,
        });
      }

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'INVOICE_CORRECTION_APPLIED',
          entity: 'SALE',
          entityId: discrepancy.entityId,
          changes: {
            eventType: 'INVOICE_CORRECTION_APPLIED',
            discrepancyId,
            approvedBy: user.name || user.email,
            approvalData,
          },
        },
      });
    }
  }

  try {
    realtimeService.broadcastBusinessEvent(storeId, 'INVOICE_CORRECTION_APPLIED', {
      discrepancyId,
      discrepancy: updatedDiscrepancy,
      invoiceId: discrepancy.entityId,
      invoiceNumber: discrepancy.referenceNumber,
      approvedBy: user.name || user.email,
    }, { userId: user.id, action: 'INVOICE_CORRECTION_APPLIED' });
  } catch (_) {}

  return { discrepancy: updatedDiscrepancy, sale: updatedSale };
};

export const rejectInvoiceCorrection = async (user, discrepancyId, data = {}) => {
  const discrepancy = await prisma.auditDiscrepancy.findUnique({ where: { id: discrepancyId } });
  if (!discrepancy) throw ApiError.notFound('Discrepancy not found');

  const updated = await prisma.auditDiscrepancy.update({
    where: { id: discrepancyId },
    data: {
      status: 'DISMISSED',
      correctionResponse: data.reason || 'Rejected by authorized reviewer',
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'INVOICE_CORRECTION_REJECTED',
      entity: 'DISCREPANCY',
      entityId: discrepancyId,
      changes: { reason: data.reason, rejectedBy: user.name || user.email },
    },
  });

  try {
    realtimeService.broadcastBusinessEvent(discrepancy.businessId, 'INVOICE_CORRECTION_REJECTED', {
      discrepancyId,
      reason: data.reason,
    }, { userId: user.id, action: 'INVOICE_CORRECTION_REJECTED' });
  } catch (_) {}

  return updated;
};

/**
 * 9. Documents & Evidence
 */
export const getStoreDocumentsForCA = async (caUser, storeId, query = {}) => {
  const store = await verifyCAStoreAccess(caUser, storeId);
  const where = { businessId: storeId };
  if (query.category && query.category !== 'ALL') {
    where.category = query.category.toUpperCase();
  }

  const documents = await prisma.auditDocument.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return {
    store,
    documents,
    total: documents.length,
  };
};

export const createDocumentForCA = async (caUser, storeId, docData) => {
  const store = await verifyCAStoreAccess(caUser, storeId);
  if (!docData.title || !docData.fileUrl) {
    throw ApiError.badRequest('Document title and fileUrl are required');
  }

  const doc = await prisma.auditDocument.create({
    data: {
      businessId: storeId,
      title: docData.title,
      fileUrl: docData.fileUrl,
      fileType: docData.fileType || 'PDF',
      fileSize: docData.fileSize ? Number(docData.fileSize) : null,
      category: (docData.category || 'SUPPORTING_EVIDENCE').toUpperCase(),
      entityType: docData.entityType || null,
      entityId: docData.entityId || null,
      uploadedById: caUser.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: caUser.id,
      action: 'DOCUMENT_ATTACHED',
      entity: 'DOCUMENT',
      entityId: doc.id,
      changes: { title: doc.title, category: doc.category, storeId },
    },
  });

  return doc;
};

/**
 * 13. Period Closing & Handover
 */
export const getStorePeriodClosingsForCA = async (caUser, storeId) => {
  const store = await verifyCAStoreAccess(caUser, storeId);
  const periods = await prisma.periodClosing.findMany({
    where: { businessId: storeId },
    orderBy: { period: 'desc' },
  });

  return {
    store,
    periods,
    total: periods.length,
  };
};

export const closePeriodForCA = async (caUser, storeId, data) => {
  const store = await verifyCAStoreAccess(caUser, storeId);
  if (!data.period) throw ApiError.badRequest('Period identifier (e.g. 2026-09) is required');

  const summary = await getFinancialSummaryForCA(caUser, storeId, {
    month: data.month,
    year: data.year,
  });

  const m = summary.metrics;
  const existing = await prisma.periodClosing.findFirst({
    where: { businessId: storeId, period: data.period },
  });

  let closing;
  if (existing) {
    closing = await prisma.periodClosing.update({
      where: { id: existing.id },
      data: {
        status: 'CLOSED',
        totalSales: m.totalSalesBeforeReturns,
        totalGstCollected: m.gstCollectedOnSales,
        totalGstAdjusted: m.gstAdjustmentsFromReturns,
        netGstPayable: m.netGst,
        signOffNotes: data.signOffNotes || 'Period accounts reconciled and closed',
      },
    });
  } else {
    closing = await prisma.periodClosing.create({
      data: {
        businessId: storeId,
        period: data.period,
        periodType: data.periodType || 'MONTHLY',
        status: 'CLOSED',
        totalSales: m.totalSalesBeforeReturns,
        totalPurchases: 0,
        totalGstCollected: m.gstCollectedOnSales,
        totalGstAdjusted: m.gstAdjustmentsFromReturns,
        netGstPayable: m.netGst,
        discrepanciesCount: 0,
        resolvedDiscrepancies: 0,
        signOffNotes: data.signOffNotes || 'Period accounts reconciled and closed',
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: caUser.id,
      action: 'PERIOD_CLOSED',
      entity: 'PERIOD_CLOSING',
      entityId: closing.id,
      changes: { period: closing.period, netGstPayable: closing.netGstPayable, storeId },
    },
  });

  try {
    realtimeService.broadcastBusinessEvent(storeId, 'PERIOD_CLOSED', {
      periodId: closing.id,
      period: closing.period,
      status: closing.status,
    }, { userId: caUser.id, action: 'PERIOD_CLOSED' });
  } catch (_) {}

  return closing;
};

export const signOffPeriodForCA = async (caUser, storeId, periodId, data = {}) => {
  await verifyCAStoreAccess(caUser, storeId);
  const existing = await prisma.periodClosing.findUnique({ where: { id: periodId } });
  if (!existing || existing.businessId !== storeId) {
    throw ApiError.notFound('Period record not found');
  }

  const updated = await prisma.periodClosing.update({
    where: { id: periodId },
    data: {
      status: 'SIGNED_OFF',
      signedOffById: caUser.id,
      signedOffAt: new Date(),
      signOffNotes: data.signOffNotes || 'CA authorized audit review complete and signed off',
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: caUser.id,
      action: 'PERIOD_SIGNED_OFF',
      entity: 'PERIOD_CLOSING',
      entityId: periodId,
      changes: { status: 'SIGNED_OFF', signedOffAt: updated.signedOffAt, signOffNotes: updated.signOffNotes },
    },
  });

  try {
    realtimeService.broadcastBusinessEvent(storeId, 'PERIOD_SIGNED_OFF', {
      periodId: updated.id,
      period: updated.period,
      status: updated.status,
    }, { userId: caUser.id, action: 'PERIOD_SIGNED_OFF' });
  } catch (_) {}

  return updated;
};

export default {
  getAuthorizedStoresForCA,
  verifyCAStoreAccess,
  formatCAInvoice,
  getStoreInvoicesForCA,
  getInvoiceByIdForCA,
  getInvoiceAuditTrailForCA,
  getFinancialSummaryForCA,
  getInvoiceCreditNotesForCA,
  getStoreCreditNotesForCA,
  getStoreActivityForCA,
  getStorePurchasesForCA,
  getStoreSuppliersForCA,
  getStorePaymentsForCA,
  getStoreExpensesForCA,
  getStoreInventoryForCA,
  getStoreTasksForCA,
  createTaskForCA,
  updateTaskForCA,
  deleteTaskForCA,
  getStoreDiscrepanciesForCA,
  flagDiscrepancyForCA,
  resolveDiscrepancy,
  verifyDiscrepancyForCA,
  requestInvoiceCorrection,
  approveInvoiceCorrection,
  rejectInvoiceCorrection,
  getStoreDocumentsForCA,
  createDocumentForCA,
  getStorePeriodClosingsForCA,
  closePeriodForCA,
  signOffPeriodForCA,
};

