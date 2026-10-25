import prisma from '../config/prisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.mjs';
import realtimeService from './realtime.service.mjs';
import billingService from './billing.service.mjs';

/**
 * Builds date range filtering for quotations.
 */
export const buildQuotationDateFilter = (query = {}) => {
  const dateFilter = {};
  let hasFilter = false;

  if (query.startDate || query.endDate) {
    if (query.startDate) {
      dateFilter.gte = new Date(query.startDate);
      hasFilter = true;
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
      hasFilter = true;
    }
  }

  if (query.date) {
    const d = new Date(query.date);
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    dateFilter.gte = start;
    dateFilter.lte = end;
    hasFilter = true;
  }

  return hasFilter ? dateFilter : null;
};

/**
 * Maps quotation record for API response.
 */
export const mapQuotation = (q) => {
  if (!q) return null;
  const isConverted = Boolean(q.convertedToInvoiceId || q.convertedToInvoice || q.invoiceNumber);
  return {
    ...q,
    _id: q.id,
    convertedToInvoice: isConverted,
    invoiceNumber: q.invoiceNumber || null,
    subtotal: Number(q.subtotal || 0),
    discountTotal: Number(q.discountTotal || 0),
    taxTotal: Number(q.taxTotal || 0),
    grandTotal: Number(q.grandTotal || 0),
    items: (q.items || []).map((item, idx) => ({
      ...item,
      id: item.id || `qi-${idx + 1}`,
      rate: Number(item.rate || item.price || 0),
      quantity: Number(item.quantity || 1),
      discount: Number(item.discount || 0),
      gstRate: Number(item.gstRate || 0),
      taxAmount: Number(item.taxAmount || 0),
      taxableAmount: Number(item.taxableAmount || 0),
      total: Number(item.total || 0),
      isTaxInclusive: Boolean(item.isTaxInclusive || item.pricingMethod === 'INCLUSIVE'),
    })),
  };
};

/**
 * Generate sequential, collision-free Quotation Number
 */
export const generateQuotationNumber = async (businessId) => {
  const year = new Date().getFullYear();
  const totalCount = await prisma.quotation.count();
  let seq = totalCount + 1;
  let candidate = `QUO-${year}-${String(seq).padStart(4, '0')}`;
  
  // Loop until an unused quotation number candidate is found
  let attempts = 0;
  while (attempts < 50) {
    const existing = await prisma.quotation.findUnique({
      where: { quotationNumber: candidate },
    });
    if (!existing) break;
    seq++;
    candidate = `QUO-${year}-${String(seq).padStart(4, '0')}`;
    attempts++;
  }

  if (attempts >= 50) {
    candidate = `QUO-${year}-${Date.now().toString().slice(-6)}`;
  }

  return candidate;
};

export class QuotationService {
  /**
   * Fetch paginated list of quotations
   */
  async getQuotations(query = {}, user) {
    const { page, limit, skip } = getPaginationParams(query);
    const businessId = query.businessId || user?.businessId || 'busi-01';

    const where = {};
    if (businessId) {
      where.businessId = businessId;
    }

    if (query.status && query.status !== 'ALL') {
      where.status = query.status.toUpperCase();
    }

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    const dateFilter = buildQuotationDateFilter(query);
    if (dateFilter) {
      where.createdAt = dateFilter;
    }

    const rawList = await prisma.quotation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        items: true,
      },
    });

    let filtered = rawList;
    if (query.search) {
      const s = String(query.search).toLowerCase();
      filtered = rawList.filter((q) => {
        const num = (q.quotationNumber || '').toLowerCase();
        const cName = (q.customer?.name || q.customerName || '').toLowerCase();
        const cPhone = (q.customer?.phone || q.customerPhone || '').toLowerCase();
        return num.includes(s) || cName.includes(s) || cPhone.includes(s);
      });
    }

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limit);

    return {
      quotations: paginated.map(mapQuotation),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  /**
   * Get single quotation by ID
   */
  async getQuotationById(id, user) {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true,
      },
    });

    if (!quotation) {
      throw ApiError.notFound('Quotation not found');
    }

    return mapQuotation(quotation);
  }

  /**
   * Create a new quotation (DOES NOT touch or deduct stock)
   */
  async createQuotation(data, user) {
    const businessId = data.businessId || user?.businessId || 'busi-01';
    const quotationNumber = data.quotationNumber || (await generateQuotationNumber(businessId));

    // Resolve customer info
    let customerId = data.customerId || null;
    let customerName = data.customerName || '';
    let customerPhone = data.customerPhone || '';
    let customerGstin = data.customerGstin || null;
    let customerAddress = data.customerAddress || null;

    if (customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (customer) {
        customerName = customerName || customer.name;
        customerPhone = customerPhone || customer.phone || '';
        customerGstin = customerGstin || customer.gstin || null;
        customerAddress = customerAddress || customer.address || null;
      }
    }

    const rawItems = Array.isArray(data.items) ? data.items : [];
    if (rawItems.length === 0) {
      throw ApiError.badRequest('Quotation must contain at least one item');
    }

    // Process line items with accurate tax calculations (Inclusive & Exclusive)
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    let grandTotal = 0;

    const itemsToCreate = rawItems.map((item, idx) => {
      const qty = Math.max(0.01, Number(item.quantity !== undefined ? item.quantity : (item.qty || 1)));
      const rate = Math.max(0, Number(item.rate !== undefined ? item.rate : (item.price || item.unitPrice || 0)));
      const discount = Math.max(0, Number(item.discount || 0));
      const gstRate = Math.max(0, Number(item.gstRate !== undefined ? item.gstRate : (item.taxPercent || 0)));
      const isTaxInclusive = Boolean(item.isTaxInclusive || item.pricingMethod === 'INCLUSIVE');

      let taxable = 0;
      let lineTax = 0;
      let lineTotal = 0;

      if (isTaxInclusive) {
        const gross = Math.max(0, rate * qty - discount);
        taxable = Number(((gross * 100) / (100 + gstRate)).toFixed(2));
        lineTax = Number((gross - taxable).toFixed(2));
        lineTotal = Number(gross.toFixed(2));
      } else {
        taxable = Math.max(0, rate * qty - discount);
        lineTax = Number(((taxable * gstRate) / 100).toFixed(2));
        lineTotal = Number((taxable + lineTax).toFixed(2));
      }

      subtotal += rate * qty;
      discountTotal += discount;
      taxTotal += lineTax;
      grandTotal += lineTotal;

      return {
        id: `qi-${Date.now()}-${idx + 1}`,
        productId: item.productId || item._id || null,
        name: item.name || item.productName || 'Quoted Product',
        sku: item.sku || null,
        hsnCode: item.hsnCode || item.hsn || null,
        unit: item.unit || 'piece',
        quantity: qty,
        rate: Number(rate.toFixed(2)),
        discount: Number(discount.toFixed(2)),
        gstRate: Number(gstRate.toFixed(2)),
        taxableAmount: Number(taxable.toFixed(2)),
        taxAmount: Number(lineTax.toFixed(2)),
        total: Number(lineTotal.toFixed(2)),
        isTaxInclusive,
        pricingMethod: isTaxInclusive ? 'INCLUSIVE' : 'EXCLUSIVE',
      };
    });

    const quotationDate = data.quotationDate ? new Date(data.quotationDate) : new Date();
    const expiryDate = data.expiryDate
      ? new Date(data.expiryDate)
      : new Date(quotationDate.getTime() + 15 * 86400000); // 15 days default validity

    const newQuotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        businessId,
        customerId,
        customerName,
        customerPhone,
        customerGstin,
        customerAddress,
        status: (data.status || 'DRAFT').toUpperCase(),
        quotationDate,
        expiryDate,
        subtotal: Number(subtotal.toFixed(2)),
        discountTotal: Number(discountTotal.toFixed(2)),
        taxTotal: Number(taxTotal.toFixed(2)),
        grandTotal: Number(grandTotal.toFixed(2)),
        notes: data.notes || 'Quotation valid for 15 days from date of issue.',
        terms: data.terms || '1. Prices are valid until quotation expiry date.\n2. Payment terms as agreed upon invoice creation.',
        createdById: user?.id || null,
        convertedToInvoiceId: null,
        items: itemsToCreate,
      },
      include: {
        customer: true,
        items: true,
      },
    });

    try {
      realtimeService.broadcastBusinessEvent(businessId, 'QUOTATION_CREATED', {
        quotation: mapQuotation(newQuotation),
      }, { userId: user?.id, action: 'QUOTATION_CREATED' });
    } catch (_) {}

    return mapQuotation(newQuotation);
  }

  /**
   * Update existing quotation (only if not already converted)
   */
  async updateQuotation(id, data, user) {
    const existing = await prisma.quotation.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      throw ApiError.notFound('Quotation not found');
    }

    if (existing.convertedToInvoiceId) {
      throw ApiError.badRequest('Cannot edit quotation that has already been converted to an invoice');
    }

    const updateData = {};
    if (data.status) updateData.status = data.status.toUpperCase();
    if (data.customerName) updateData.customerName = data.customerName;
    if (data.customerPhone) updateData.customerPhone = data.customerPhone;
    if (data.customerAddress) updateData.customerAddress = data.customerAddress;
    if (data.customerGstin) updateData.customerGstin = data.customerGstin;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.terms !== undefined) updateData.terms = data.terms;
    if (data.expiryDate) updateData.expiryDate = new Date(data.expiryDate);

    // If items are being updated, recalculate totals
    if (Array.isArray(data.items) && data.items.length > 0) {
      let subtotal = 0;
      let discountTotal = 0;
      let taxTotal = 0;
      let grandTotal = 0;

      const updatedItems = data.items.map((item, idx) => {
        const qty = Math.max(0.01, Number(item.quantity !== undefined ? item.quantity : (item.qty || 1)));
        const rate = Math.max(0, Number(item.rate !== undefined ? item.rate : (item.price || item.unitPrice || 0)));
        const discount = Math.max(0, Number(item.discount || 0));
        const gstRate = Math.max(0, Number(item.gstRate !== undefined ? item.gstRate : (item.taxPercent || 0)));
        const isTaxInclusive = Boolean(item.isTaxInclusive || item.pricingMethod === 'INCLUSIVE');

        let taxable = 0;
        let lineTax = 0;
        let lineTotal = 0;

        if (isTaxInclusive) {
          const gross = Math.max(0, rate * qty - discount);
          taxable = Number(((gross * 100) / (100 + gstRate)).toFixed(2));
          lineTax = Number((gross - taxable).toFixed(2));
          lineTotal = Number(gross.toFixed(2));
        } else {
          taxable = Math.max(0, rate * qty - discount);
          lineTax = Number(((taxable * gstRate) / 100).toFixed(2));
          lineTotal = Number((taxable + lineTax).toFixed(2));
        }

        subtotal += rate * qty;
        discountTotal += discount;
        taxTotal += lineTax;
        grandTotal += lineTotal;

        return {
          id: item.id || `qi-${Date.now()}-${idx + 1}`,
          quotationId: id,
          productId: item.productId || item._id || null,
          name: item.name || 'Quoted Product',
          sku: item.sku || null,
          hsnCode: item.hsnCode || item.hsn || null,
          unit: item.unit || 'piece',
          quantity: qty,
          rate: Number(rate.toFixed(2)),
          discount: Number(discount.toFixed(2)),
          gstRate: Number(gstRate.toFixed(2)),
          taxableAmount: Number(taxable.toFixed(2)),
          taxAmount: Number(lineTax.toFixed(2)),
          total: Number(lineTotal.toFixed(2)),
          isTaxInclusive,
          pricingMethod: isTaxInclusive ? 'INCLUSIVE' : 'EXCLUSIVE',
        };
      });

      updateData.subtotal = Number(subtotal.toFixed(2));
      updateData.discountTotal = Number(discountTotal.toFixed(2));
      updateData.taxTotal = Number(taxTotal.toFixed(2));
      updateData.grandTotal = Number(grandTotal.toFixed(2));
      updateData.items = updatedItems;
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: updateData,
      include: { customer: true, items: true },
    });

    return mapQuotation(updated);
  }

  /**
   * Update quotation status (DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED)
   */
  async updateQuotationStatus(id, status, user) {
    const validStatuses = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'];
    const norm = String(status || '').toUpperCase();
    if (!validStatuses.includes(norm)) {
      throw ApiError.badRequest(`Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`);
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: { status: norm },
      include: { customer: true, items: true },
    });

    try {
      const targetBusinessId = updated.businessId || user?.businessId || 'default';
      realtimeService.broadcastBusinessEvent(targetBusinessId, 'QUOTATION_STATUS_CHANGED', {
        id,
        status: norm,
      }, { userId: user?.id, action: 'STATUS_CHANGED' });
    } catch (_) {}

    return mapQuotation(updated);
  }

  /**
   * Convert Quotation into an Invoice
   * - Automatically transfers customer, products, quantities, prices, discounts, and tax details
   * - Uses existing billingService.createSale() ensuring a single stock deduction
   * - Quotations NEVER deducted stock, so this is the ONLY stock deduction (NO duplicate deductions)
   * - Links quotation to the generated sale (convertedToInvoiceId)
   */
  async convertToInvoice(id, payload = {}, user, { req } = {}) {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { customer: true, items: true },
    });

    if (!quotation) {
      throw ApiError.notFound('Quotation not found');
    }

    if (quotation.convertedToInvoiceId) {
      // Find and return existing converted sale
      const existingSale = await prisma.sale.findUnique({
        where: { id: quotation.convertedToInvoiceId },
        include: { items: true, customer: true },
      });
      if (existingSale) {
        return {
          sale: existingSale,
          quotation: mapQuotation(quotation),
          message: 'Quotation was already converted to an invoice',
          alreadyConverted: true,
        };
      }
    }

    // Build sale payload from quotation items
    const saleItems = (quotation.items || []).map((qItem) => ({
      productId: qItem.productId,
      name: qItem.name,
      sku: qItem.sku,
      hsnCode: qItem.hsnCode,
      unit: qItem.unit || 'piece',
      quantity: Number(qItem.quantity),
      rate: Number(qItem.rate),
      discount: Number(qItem.discount || 0),
      gstRate: Number(qItem.gstRate || 0),
      taxableAmount: Number(qItem.taxableAmount || 0),
      taxAmount: Number(qItem.taxAmount || 0),
      total: Number(qItem.total || 0),
      isTaxInclusive: Boolean(qItem.isTaxInclusive || qItem.pricingMethod === 'INCLUSIVE'),
      pricingMethod: qItem.pricingMethod || (qItem.isTaxInclusive ? 'INCLUSIVE' : 'EXCLUSIVE'),
    }));

    const salePayload = {
      customerId: quotation.customerId || payload.customerId || null,
      customerName: quotation.customerName || quotation.customer?.name || payload.customerName || 'Walk-in Customer',
      customerPhone: quotation.customerPhone || quotation.customer?.phone || payload.customerPhone || '',
      businessId: quotation.businessId || user?.businessId || 'busi-01',
      items: saleItems,
      paymentMethod: payload.paymentMethod || 'CASH',
      paidAmount: payload.paidAmount !== undefined ? Number(payload.paidAmount) : 0,
      paymentStatus: payload.paymentStatus || (Number(payload.paidAmount || 0) >= Number(quotation.grandTotal) ? 'PAID' : 'UNPAID'),
      notes: payload.notes || `Generated from Quotation #${quotation.quotationNumber}`,
      referenceQuotationNumber: quotation.quotationNumber,
      quotationId: quotation.id,
    };

    // Create the sale using billingService (handles single stock deduction, customer balance, audit trail)
    const sale = await billingService.createSale(salePayload, user, { req });

    // Update quotation status to ACCEPTED & link the resulting invoice ID
    const updatedQuotation = await prisma.quotation.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
        convertedToInvoiceId: sale.id,
        invoiceNumber: sale.invoiceNumber,
        convertedToInvoice: true,
        convertedAt: new Date(),
      },
      include: { customer: true, items: true },
    });

    try {
      const targetBusinessId = quotation.businessId || user?.businessId || 'default';
      realtimeService.broadcastBusinessEvent(targetBusinessId, 'QUOTATION_CONVERTED', {
        quotationId: id,
        quotationNumber: quotation.quotationNumber,
        saleId: sale.id,
        invoiceNumber: sale.invoiceNumber,
      }, { userId: user?.id, action: 'QUOTATION_CONVERTED' });
    } catch (_) {}

    return {
      sale,
      quotation: mapQuotation(updatedQuotation),
      message: 'Quotation successfully converted to invoice',
    };
  }

  /**
   * Delete quotation
   */
  async deleteQuotation(id, user) {
    const quotation = await prisma.quotation.findUnique({ where: { id } });
    if (!quotation) {
      throw ApiError.notFound('Quotation not found');
    }

    if (quotation.convertedToInvoiceId) {
      throw ApiError.badRequest('Cannot delete quotation linked to a finalized invoice');
    }

    await prisma.quotation.delete({ where: { id } });

    try {
      const targetBusinessId = quotation.businessId || user?.businessId || 'default';
      realtimeService.broadcastBusinessEvent(targetBusinessId, 'QUOTATION_DELETED', {
        id,
      }, { userId: user?.id, action: 'QUOTATION_DELETED' });
    } catch (_) {}

    return { success: true };
  }
}

export const quotationService = new QuotationService();
export default quotationService;
