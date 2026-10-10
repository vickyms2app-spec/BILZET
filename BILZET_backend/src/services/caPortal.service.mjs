import prisma from '../config/prisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.mjs';
import { mapSale, buildDateFilter } from './billing.service.mjs';

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

  if (isSuperAdmin) {
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

    return {
      ...enriched,
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
};

