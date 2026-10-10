import prisma from '../config/prisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.mjs';

/**
 * Builds date range filtering for date-wise, month-wise, and year-wise queries.
 */
export const buildDateFilter = (query = {}) => {
  const dateFilter = {};
  let hasFilter = false;

  if (query.year) {
    const yr = parseInt(query.year, 10);
    if (!isNaN(yr)) {
      if (query.month) {
        const m = parseInt(query.month, 10) - 1;
        dateFilter.gte = new Date(Date.UTC(yr, m, 1, 0, 0, 0, 0));
        dateFilter.lte = new Date(Date.UTC(yr, m + 1, 0, 23, 59, 59, 999));
        hasFilter = true;
      } else {
        dateFilter.gte = new Date(Date.UTC(yr, 0, 1, 0, 0, 0, 0));
        dateFilter.lte = new Date(Date.UTC(yr, 11, 31, 23, 59, 59, 999));
        hasFilter = true;
      }
    }
  } else if (query.month) {
    const currentYear = new Date().getFullYear();
    const m = parseInt(query.month, 10) - 1;
    dateFilter.gte = new Date(Date.UTC(currentYear, m, 1, 0, 0, 0, 0));
    dateFilter.lte = new Date(Date.UTC(currentYear, m + 1, 0, 23, 59, 59, 999));
    hasFilter = true;
  }

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
 * Maps a sale record to enrich it with product-level return details,
 * GST adjustments, distinct payment status, and net balance due.
 */
export const mapSale = (s) => {
  if (!s) return null;
  const subtotal = Number(s.subtotal || 0);
  const discountTotal = Number(s.discountTotal || 0);
  const grandTotal = Number(s.grandTotal || 0);
  const originalTaxTotal = Number(s.taxTotal || 0);
  const paidAmount = Number(s.paidAmount || 0);

  // Analyze returns and build product-level return & GST adjustment mapping
  const returns = s.returns || [];
  let totalReturnedAmount = 0;
  let totalReturnedQty = 0;
  let totalReturnedGst = 0;
  const returnItemsMap = {};

  for (const ret of returns) {
    totalReturnedAmount += Number(ret.totalAmount || 0);
    const rItems = ret.items || [];
    for (const rItem of rItems) {
      const key = rItem.productId || rItem.saleItemId || rItem.name;
      if (!returnItemsMap[key]) {
        returnItemsMap[key] = { quantity: 0, totalRefund: 0, taxAmount: 0 };
      }
      const rQty = Number(rItem.quantity || 0);
      const rTotal = Number(rItem.total || 0);
      returnItemsMap[key].quantity += rQty;
      returnItemsMap[key].totalRefund += rTotal;
      totalReturnedQty += rQty;

      const rTax = Number(rItem.taxAmount || 0);
      returnItemsMap[key].taxAmount += rTax;
      totalReturnedGst += rTax;
    }
  }

  const customerState = s.customer?.state || s.customerState || null;
  const businessState = s.business?.state || s.businessState || 'Tamil Nadu';
  const isInterState = Boolean(
    s.isInterState !== undefined
      ? s.isInterState
      : (customerState &&
         businessState &&
         customerState.trim().toLowerCase() !== businessState.trim().toLowerCase())
  );

  let totalOriginalItemsQty = 0;
  const enrichedItems = (s.items || []).map((item) => {
    const lineRate = Number(item.rate !== undefined ? item.rate : (item.price || item.sellingPrice || 0));
    const lineQty = Number(item.quantity !== undefined ? item.quantity : (item.qty || 1));
    totalOriginalItemsQty += lineQty;
    const lineDiscount = Number(item.discount || 0);
    const gstRate = Number(item.gstRate !== undefined ? item.gstRate : (item.taxPercent || 0));
    const isTaxInclusive = Boolean(
      item.isTaxInclusive ||
      item.pricingMethod === 'INCLUSIVE' ||
      s.taxInclusive ||
      s.pricingMethod === 'INCLUSIVE'
    );

    let taxable = 0;
    let lineTax = 0;
    let lineTotal = 0;

    if (item.taxableAmount !== undefined && item.taxAmount !== undefined && item.total !== undefined) {
      // Use frozen snapshot values from database (Req 6)
      taxable = Number(item.taxableAmount);
      lineTax = Number(item.taxAmount);
      lineTotal = Number(item.total);
    } else if (isTaxInclusive) {
      const gross = Math.max(0, lineRate * lineQty - lineDiscount);
      taxable = Number(((gross * 100) / (100 + gstRate)).toFixed(2));
      lineTax = Number((gross - taxable).toFixed(2));
      lineTotal = Number(gross.toFixed(2));
    } else {
      taxable = Math.max(0, lineRate * lineQty - lineDiscount);
      lineTax = Number(((taxable * gstRate) / 100).toFixed(2));
      lineTotal = Number((taxable + lineTax).toFixed(2));
    }

    const itemKey = item.productId || item.id || item.name;
    const retInfo =
      returnItemsMap[itemKey] ||
      returnItemsMap[item.productId] ||
      returnItemsMap[item.id] || { quantity: 0, totalRefund: 0, taxAmount: 0 };
    const returnedQty = Math.min(lineQty, retInfo.quantity);
    const remainingQty = Math.max(0, lineQty - returnedQty);

    const lineGstAdjustment =
      retInfo.taxAmount > 0
        ? retInfo.taxAmount
        : lineQty > 0
        ? Number(((returnedQty / lineQty) * lineTax).toFixed(2))
        : 0;
    const netTaxAmount = Math.max(0, Number((lineTax - lineGstAdjustment).toFixed(2)));

    const lineRefundTotal =
      retInfo.totalRefund > 0
        ? retInfo.totalRefund
        : lineQty > 0
        ? Number(((returnedQty / lineQty) * lineTotal).toFixed(2))
        : 0;
    const netTotal = Math.max(0, Number((lineTotal - lineRefundTotal).toFixed(2)));
    const netTaxable = Math.max(0, Number((taxable - (lineRefundTotal - lineGstAdjustment)).toFixed(2)));

    const hsn = String(item.hsn || item.hsnCode || item.sku || '1904').trim();
    const itemCgst = isInterState ? 0 : Number((netTaxAmount / 2).toFixed(2));
    const itemSgst = isInterState ? 0 : Number((netTaxAmount / 2).toFixed(2));
    const itemIgst = isInterState ? netTaxAmount : 0;

    return {
      ...item,
      _id: item.id,
      name: item.name || 'Standard Product',
      hsn,
      hsnCode: hsn,
      sku: item.sku || null,
      quantity: lineQty,
      originalQuantity: lineQty,
      returnedQuantity: returnedQty,
      remainingQuantity: remainingQty,
      rate: lineRate,
      unitPrice: lineRate,
      discount: lineDiscount,
      gstRate,
      taxPercent: gstRate,
      taxableAmount: taxable,
      netTaxableAmount: netTaxable,
      originalTaxAmount: lineTax,
      gstAdjustment: lineGstAdjustment,
      taxAmount: netTaxAmount,
      cgst: itemCgst,
      sgst: itemSgst,
      igst: itemIgst,
      originalTotal: lineTotal,
      refundedAmount: lineRefundTotal,
      total: netTotal,
      netTotal,
      isTaxInclusive,
      pricingMethod: isTaxInclusive ? 'INCLUSIVE' : 'EXCLUSIVE',
    };
  });

  // Calculate HSN Summary breakdown (Req 7, Req 10)
  const hsnMap = {};
  for (const it of enrichedItems) {
    const key = `${it.hsn}_${it.gstRate}`;
    if (!hsnMap[key]) {
      hsnMap[key] = {
        hsn: it.hsn,
        hsnCode: it.hsn,
        gstRate: it.gstRate,
        taxableAmount: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        taxAmount: 0,
        totalAmount: 0,
      };
    }
    hsnMap[key].taxableAmount = Number((hsnMap[key].taxableAmount + it.taxableAmount).toFixed(2));
    hsnMap[key].cgst = Number((hsnMap[key].cgst + it.cgst).toFixed(2));
    hsnMap[key].sgst = Number((hsnMap[key].sgst + it.sgst).toFixed(2));
    hsnMap[key].igst = Number((hsnMap[key].igst + it.igst).toFixed(2));
    hsnMap[key].taxAmount = Number((hsnMap[key].taxAmount + it.taxAmount).toFixed(2));
    hsnMap[key].totalAmount = Number((hsnMap[key].totalAmount + it.total).toFixed(2));
  }
  const hsnSummary = Object.values(hsnMap);

  // Calculate return status
  let returnStatus = s.returnStatus || 'NONE';
  if (totalReturnedQty >= totalOriginalItemsQty && totalOriginalItemsQty > 0) {
    returnStatus = 'RETURNED';
  } else if (totalReturnedQty > 0 || returns.length > 0) {
    returnStatus = 'PARTIALLY_RETURNED';
  }

  // Calculate overall GST and Net amounts
  const sumItemGstAdjustment = Number(enrichedItems.reduce((acc, it) => acc + (it.gstAdjustment || 0), 0).toFixed(2));
  if (sumItemGstAdjustment > 0) {
    totalReturnedGst = sumItemGstAdjustment;
  } else if (totalReturnedGst === 0 && totalReturnedAmount > 0 && grandTotal > 0) {
    totalReturnedGst = Number(((totalReturnedAmount / grandTotal) * originalTaxTotal).toFixed(2));
  }
  const gstAdjustment = Number(totalReturnedGst.toFixed(2));
  const netGstPayable = Math.max(0, Number((originalTaxTotal - gstAdjustment).toFixed(2)));
  const roundOff = Number(s.roundOff !== undefined ? s.roundOff : 0);
  const netPayable = Math.max(0, Number((grandTotal - totalReturnedAmount).toFixed(2)));
  const balanceDue = Math.max(0, Number((netPayable - paidAmount).toFixed(2)));

  const cgstAdjustment = isInterState ? 0 : Number((gstAdjustment / 2).toFixed(2));
  const sgstAdjustment = isInterState ? 0 : Number((gstAdjustment / 2).toFixed(2));
  const igstAdjustment = isInterState ? gstAdjustment : 0;

  const returnedTaxableAmount = Math.max(0, Number((totalReturnedAmount - gstAdjustment).toFixed(2)));
  const netTaxableAmount = Math.max(0, Number((subtotal - returnedTaxableAmount).toFixed(2)));

  // Payment status calculation: NEVER treat PENDING and UNPAID as identical!
  let paymentStatus = s.paymentStatus || 'UNPAID';

  if (s.paymentStatus === 'PENDING') {
    paymentStatus = 'PENDING';
  } else if (paidAmount >= netPayable && netPayable > 0) {
    paymentStatus = 'PAID';
  } else if (paidAmount > 0 && paidAmount < netPayable) {
    paymentStatus = s.paymentStatus === 'PARTIAL' ? 'PARTIAL' : 'PARTIALLY_PAID';
  } else if (paidAmount === 0 && s.paymentStatus !== 'PENDING') {
    paymentStatus = 'UNPAID';
  }

  const cgst = isInterState ? 0 : Number((netGstPayable / 2).toFixed(2));
  const sgst = isInterState ? 0 : Number((netGstPayable / 2).toFixed(2));
  const igst = isInterState ? netGstPayable : 0;

  // Format enriched returns / credit notes
  const enrichedReturns = (s.returns || []).map((ret) => {
    let retTaxableTotal = 0;
    let retGstTotal = 0;
    const retItems = (ret.items || []).map((rItem) => {
      const lineItem = (s.items || []).find(
        (si) => si.productId === rItem.productId || si.id === rItem.productId || si.name === rItem.name
      );
      const rQty = Number(rItem.quantity || 0);
      const lineRate = Number(rItem.rate || lineItem?.rate || 0);
      const lineGstRate = Number(lineItem?.gstRate || 0);
      const lineOrigQty = Number(lineItem?.quantity || 1);
      const lineTax = Number(lineItem?.taxAmount || 0);
      const lineTotal = Number(lineItem?.total || 0);

      const rTax = lineOrigQty > 0 ? Number(((rQty / lineOrigQty) * lineTax).toFixed(2)) : 0;
      const rTotal = Number(rItem.total || (lineOrigQty > 0 ? ((rQty / lineOrigQty) * lineTotal).toFixed(2) : 0));
      const rTaxable = Number((rTotal - rTax).toFixed(2));

      retTaxableTotal += rTaxable;
      retGstTotal += rTax;

      return {
        ...rItem,
        name: lineItem?.name || 'Returned Product',
        sku: lineItem?.sku || null,
        hsn: lineItem?.hsnCode || '1904',
        hsnCode: lineItem?.hsnCode || '1904',
        quantity: rQty,
        rate: lineRate,
        gstRate: lineGstRate,
        taxableAmount: rTaxable,
        taxAmount: rTax,
        gstAdjustment: rTax,
        cgst: isInterState ? 0 : Number((rTax / 2).toFixed(2)),
        sgst: isInterState ? 0 : Number((rTax / 2).toFixed(2)),
        igst: isInterState ? rTax : 0,
        total: rTotal,
      };
    });

    const retTotalAmount = Number(ret.totalAmount || (retTaxableTotal + retGstTotal).toFixed(2));
    const creditNoteNumber = ret.returnNumber
      ? ret.returnNumber.replace(/^RET-/, 'CN-')
      : `CN-${ret.id || Date.now().toString().slice(-6)}`;

    return {
      ...ret,
      creditNoteNumber,
      invoiceNumber: s.invoiceNumber,
      invoiceId: s.id,
      originalInvoiceDate: s.createdAt,
      returnDate: ret.createdAt,
      reason: ret.reason || 'Customer Return',
      refundStatus: ret.refundStatus || 'COMPLETED',
      totalAmount: retTotalAmount,
      taxableAmount: Number(retTaxableTotal.toFixed(2)),
      gstAdjustment: Number(retGstTotal.toFixed(2)),
      cgstAdjustment: isInterState ? 0 : Number((retGstTotal / 2).toFixed(2)),
      sgstAdjustment: isInterState ? 0 : Number((retGstTotal / 2).toFixed(2)),
      igstAdjustment: isInterState ? Number(retGstTotal.toFixed(2)) : 0,
      isInterState,
      settlementDetails: {
        refundAmount: retTotalAmount,
        method: ret.refundMethod || ret.refundPaymentMethod || s.paymentMethod || 'CASH',
        status: ret.refundStatus || 'COMPLETED',
      },
      items: retItems,
    };
  });

  return {
    ...s,
    _id: s.id,
    subtotal,
    taxableAmount: subtotal,
    originalTaxableAmount: subtotal,
    discountTotal,
    originalGrandTotal: grandTotal,
    originalInvoiceAmount: grandTotal,
    originalTaxTotal,
    totalReturnedAmount: Number(totalReturnedAmount.toFixed(2)),
    totalReturnedValue: Number(totalReturnedAmount.toFixed(2)),
    returnedAmount: Number(totalReturnedAmount.toFixed(2)),
    returnedTaxableAmount,
    gstAdjustment,
    totalGstAdjustment: gstAdjustment,
    cgstAdjustment,
    sgstAdjustment,
    igstAdjustment,
    netTaxableAmount,
    netTaxTotal: netGstPayable,
    netGst: netGstPayable,
    taxTotal: netGstPayable,
    cgst,
    sgst,
    igst,
    roundOff,
    grandTotal,
    netPayable,
    netInvoiceValue: netPayable,
    paidAmount,
    paymentsReceived: paidAmount,
    balanceDue,
    outstandingBalance: balanceDue,
    paymentStatus,
    returnStatus,
    hasReturns: enrichedReturns.length > 0,
    isInterState,
    isTaxInclusive: Boolean(s.taxInclusive || s.pricingMethod === 'INCLUSIVE'),
    pricingMethod: s.taxInclusive || s.pricingMethod === 'INCLUSIVE' ? 'INCLUSIVE' : 'EXCLUSIVE',
    hsnSummary,
    items: enrichedItems,
    returns: enrichedReturns,
    creditNotes: enrichedReturns,
    payments: s.payments || [],
    auditLogs: s.auditLogs || [],
  };
};

export const createSale = async (saleData, user, context = {}) => {
  const {
    customerId,
    customerName,
    customerPhone,
    customerAddress,
    customerEmail,
    customerGstin,
    items,
    discount = 0,
    paymentMethod = 'CASH',
    paidAmount = 0,
    notes,
  } = saleData;

  if (!items || items.length === 0) {
    throw ApiError.badRequest('At least one item is required to generate an invoice');
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Resolve or Automatically Create Customer Record
    let customer = null;
    const cleanPhone = customerPhone && String(customerPhone).trim() ? String(customerPhone).trim() : null;
    const cleanName = customerName && String(customerName).trim() ? String(customerName).trim() : null;
    const cleanAddress = customerAddress && String(customerAddress).trim() ? String(customerAddress).trim() : null;
    const cleanEmail = customerEmail && String(customerEmail).trim() ? String(customerEmail).trim() : null;
    const cleanGstin = customerGstin && String(customerGstin).trim() ? String(customerGstin).trim() : null;

    if (customerId) {
      customer = await tx.customer.findUnique({ where: { id: customerId } });
    }

    if (!customer && cleanPhone) {
      customer = await tx.customer.findUnique({ where: { phone: cleanPhone } });
    }

    const isGenericWalkin =
      !cleanPhone &&
      (!cleanName ||
        cleanName.toLowerCase() === 'walk-in' ||
        cleanName.toLowerCase() === 'walk-in customer' ||
        cleanName.toLowerCase() === 'counter sale');

    if (!customer && !isGenericWalkin && (cleanPhone || cleanName)) {
      try {
        customer = await tx.customer.create({
          data: {
            businessId: user?.businessId || null,
            name: cleanName || `Customer ${cleanPhone}`,
            phone: cleanPhone || '',
            email: cleanEmail || '',
            address: cleanAddress || '',
            gstin: cleanGstin || '',
            state: saleData.customerState || 'Tamil Nadu',
            balance: 0,
          },
        });
      } catch (_) {
        // Fallback gracefully if duplicate phone exists
        if (cleanPhone) {
          customer = await tx.customer.findUnique({ where: { phone: cleanPhone } });
        }
      }
    }

    if (customer && saleData.customerState && customer.state !== saleData.customerState) {
      try {
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: { state: saleData.customerState },
        });
      } catch (_) {}
    }

    // Resolve business and determine intra-state vs inter-state
    let business = null;
    const activeBusinessId = user?.businessId || saleData.businessId || null;
    if (activeBusinessId) {
      business = await tx.business.findUnique({ where: { id: activeBusinessId } });
    }
    const storeState = business?.state || user?.business?.state || 'Tamil Nadu';
    const customerState = saleData.customerState || customer?.state || null;
    const isInterState = Boolean(
      customerState &&
      storeState &&
      customerState.trim().toLowerCase() !== storeState.trim().toLowerCase()
    );

    const isInvoiceTaxInclusive = Boolean(
      saleData.taxInclusive === true ||
      saleData.pricingMethod === 'INCLUSIVE' ||
      saleData.isTaxInclusive === true
    );

    // 2. Validate Items, Calculate Line-by-Line GST & Stock Deductions (Req 1, 2, 3, 4, 6, 8, 9)
    let subtotal = 0;
    let taxTotal = 0;
    const calculatedItems = [];

    for (const item of items) {
      const qty = Number(item.quantity !== undefined ? item.quantity : (item.qty !== undefined ? item.qty : 0));
      if (isNaN(qty) || qty <= 0) {
        throw ApiError.badRequest('Item quantity must be a positive number greater than 0');
      }
      const rate = Number(item.rate !== undefined ? item.rate : (item.price !== undefined ? item.price : (item.sellingPrice || 0)));
      if (isNaN(rate) || rate < 0) {
        throw ApiError.badRequest('Item rate cannot be negative');
      }
      const itemDiscount = Number(item.discount || 0);
      if (isNaN(itemDiscount) || itemDiscount < 0) {
        throw ApiError.badRequest('Item discount cannot be negative');
      }
      if (itemDiscount > rate * qty) {
        throw ApiError.badRequest('Item discount cannot exceed total item price');
      }
      const gstRate = Number(item.gstRate !== undefined ? item.gstRate : (item.taxPercent !== undefined ? item.taxPercent : 18));
      if (isNaN(gstRate) || gstRate < 0 || gstRate > 100) {
        throw ApiError.badRequest('GST rate must be between 0 and 100');
      }

      const isItemInclusive =
        item.isTaxInclusive !== undefined
          ? Boolean(item.isTaxInclusive)
          : item.pricingMethod
          ? item.pricingMethod === 'INCLUSIVE'
          : isInvoiceTaxInclusive;

      let lineTaxable = 0;
      let lineTax = 0;
      let lineTotal = 0;

      if (isItemInclusive) {
        const gross = Math.max(0, Number((rate * qty - itemDiscount).toFixed(2)));
        lineTaxable = Number(((gross * 100) / (100 + gstRate)).toFixed(2));
        lineTax = Number((gross - lineTaxable).toFixed(2));
        lineTotal = Number(gross.toFixed(2));
      } else {
        lineTaxable = Math.max(0, Number((rate * qty - itemDiscount).toFixed(2)));
        lineTax = Number(((lineTaxable * gstRate) / 100).toFixed(2));
        lineTotal = Number((lineTaxable + lineTax).toFixed(2));
      }

      subtotal += lineTaxable;
      taxTotal += lineTax;

      const itemCgst = isInterState ? 0 : Number((lineTax / 2).toFixed(2));
      const itemSgst = isInterState ? 0 : Number((lineTax / 2).toFixed(2));
      const itemIgst = isInterState ? lineTax : 0;

      // Look up product first to resolve correct product name, HSN, and validate stock
      let product = null;
      if (item.productId) {
        product = await tx.product.findUnique({ where: { id: item.productId } });
        if (product && product.stock < qty) {
          throw ApiError.badRequest(
            `Insufficient stock for '${product.name}'. Available: ${product.stock}, Requested: ${qty}`
          );
        }
      }

      const hsn = String(item.hsn || item.hsnCode || product?.hsnCode || product?.hsn || product?.sku || '1904').trim();

      calculatedItems.push({
        productId: product ? product.id : null,
        name: item.name || product?.name || 'Standard Product',
        sku: item.sku || product?.sku || null,
        hsn,
        hsnCode: hsn,
        quantity: Math.max(1, Math.round(qty)),
        rate,
        discount: itemDiscount,
        taxableAmount: lineTaxable,
        gstRate,
        taxAmount: lineTax,
        cgst: itemCgst,
        sgst: itemSgst,
        igst: itemIgst,
        total: lineTotal,
        isTaxInclusive: isItemInclusive,
        pricingMethod: isItemInclusive ? 'INCLUSIVE' : 'EXCLUSIVE',
      });

      // Deduct inventory stock if productId is linked
      if (product) {
        const newStock = product.stock - qty;
        await tx.product.update({
          where: { id: product.id },
          data: { stock: newStock },
        });

        await tx.stockTransaction.create({
          data: {
            productId: product.id,
            type: 'SALE',
            quantity: -qty,
            previousStock: product.stock,
            newStock,
            reason: 'Direct invoice sale',
          },
        });
      }
    }

    subtotal = Number(subtotal.toFixed(2));
    taxTotal = Number(taxTotal.toFixed(2));
    const invoiceDiscount = Number(discount || 0);
    const rawGrandTotal = Number((subtotal + taxTotal - invoiceDiscount).toFixed(2));

    let roundOff = 0;
    let grandTotal = rawGrandTotal;

    if (saleData.roundOff !== undefined) {
      roundOff = Number(Number(saleData.roundOff).toFixed(2));
      grandTotal = Number((rawGrandTotal + roundOff).toFixed(2));
    } else if (saleData.enableRoundOff === true) {
      const rounded = Math.round(rawGrandTotal);
      roundOff = Number((rounded - rawGrandTotal).toFixed(2));
      grandTotal = rounded;
    } else if (saleData.grandTotal !== undefined && Math.abs(Number(saleData.grandTotal) - rawGrandTotal) < 0.01) {
      grandTotal = Number(saleData.grandTotal);
      roundOff = 0;
    }

    let invoiceNumber = saleData.invoiceNumber && String(saleData.invoiceNumber).trim();
    if (invoiceNumber) {
      const existing = await tx.sale.findUnique({ where: { invoiceNumber } });
      if (existing) {
        invoiceNumber = `${invoiceNumber}-${Date.now().toString().slice(-4)}`;
      }
    } else {
      invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    }
    const createdAt = saleData.invoiceDate || saleData.date || saleData.createdAt
      ? new Date(saleData.invoiceDate || saleData.date || saleData.createdAt)
      : new Date();
    const dueAmount = Math.max(0, grandTotal - Number(paidAmount || 0));

    if (dueAmount > 0 && customer) {
      await tx.customer.update({
        where: { id: customer.id },
        data: { balance: Number(customer.balance) + dueAmount },
      });
    }

    // Determine payment status strictly
    let paymentStatus = 'UNPAID';
    if (saleData.paymentStatus === 'PENDING') {
      paymentStatus = 'PENDING';
    } else if (Number(paidAmount) >= grandTotal && grandTotal > 0) {
      paymentStatus = 'PAID';
    } else if (Number(paidAmount) > 0) {
      paymentStatus = saleData.paymentStatus === 'PARTIAL' ? 'PARTIAL' : 'PARTIALLY_PAID';
    } else {
      paymentStatus = 'UNPAID';
    }

    // 3. Create Sale & SaleItems
    const sale = await tx.sale.create({
      data: {
        invoiceNumber,
        businessId: activeBusinessId,
        customerId: customer ? customer.id : null,
        subtotal,
        discountTotal: invoiceDiscount,
        taxTotal,
        roundOff,
        grandTotal,
        paidAmount: Number(paidAmount || 0),
        paymentMethod: paymentMethod.toUpperCase(),
        paymentStatus,
        returnStatus: 'NONE',
        status: 'COMPLETED',
        createdById: user ? user.id : null,
        createdAt,
        items: {
          create: calculatedItems,
        },
      },
      include: {
        items: true,
        customer: true,
        business: true,
        returns: { include: { items: true } },
      },
    });

    // 4. Create Payment record if paid amount > 0
    if (Number(paidAmount) > 0) {
      await tx.payment.create({
        data: {
          saleId: sale.id,
          customerId: customer ? customer.id : null,
          amount: Number(paidAmount),
          method: paymentMethod.toUpperCase(),
          note: `Payment for ${invoiceNumber}`,
        },
      });
    }

    // 5. Maintain Audit Trail (Req 7)
    await tx.auditLog.create({
      data: {
        userId: user ? user.id : null,
        action: 'INVOICE_CREATED',
        entity: 'SALE',
        entityId: sale.id,
        changes: {
          invoiceNumber,
          grandTotal,
          taxTotal,
          paidAmount: Number(paidAmount || 0),
          paymentStatus,
          paymentMethod: paymentMethod.toUpperCase(),
          itemCount: calculatedItems.length,
        },
      },
    });

    if (Number(paidAmount) > 0) {
      await tx.auditLog.create({
        data: {
          userId: user ? user.id : null,
          action: 'PAYMENT_RECORDED',
          entity: 'SALE',
          entityId: sale.id,
          changes: {
            invoiceNumber,
            amountPaid: Number(paidAmount),
            paymentMethod: paymentMethod.toUpperCase(),
            paymentStatus,
          },
        },
      });
    }

    return mapSale({
      ...sale,
      customer: customer || sale.customer,
      customerState,
      businessState: storeState,
      isInterState,
    });
  });
};

export const getSales = async (query = {}, user = null) => {
  const { page, limit, skip } = getPaginationParams(query);
  const where = {};
  const andConditions = [];

  if (user && user.role !== 'SUPER_ADMIN') {
    if (user.businessId) {
      andConditions.push({
        OR: [
          { businessId: user.businessId },
          { businessId: null, createdById: user.id },
        ],
      });
    } else if (user.id) {
      andConditions.push({ createdById: user.id });
    }
  }

  if (query.customerId) where.customerId = query.customerId;

  // Search filter
  if (query.search && String(query.search).trim()) {
    const s = String(query.search).trim();
    andConditions.push({
      OR: [
        { invoiceNumber: { contains: s, mode: 'insensitive' } },
        { customer: { name: { contains: s, mode: 'insensitive' } } },
        { customer: { phone: { contains: s } } },
        { customer: { gstin: { contains: s, mode: 'insensitive' } } },
      ],
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  // Date-wise, Month-wise, Year-wise filters (Req 6)
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
  }

  // Return status filter (Req 2)
  if (query.returnStatus && query.returnStatus !== 'ALL') {
    where.returnStatus = query.returnStatus.toUpperCase();
  }

  // Status general parameter
  if (query.status && query.status !== 'ALL') {
    const st = query.status.toUpperCase();
    if (['PAID', 'UNPAID', 'PENDING', 'PARTIAL', 'PARTIALLY_PAID', 'PARTIALLY PAID'].includes(st)) {
      if (st === 'PARTIALLY PAID' || st === 'PARTIALLY_PAID' || st === 'PARTIAL') {
        where.paymentStatus = { in: ['PARTIALLY_PAID', 'PARTIAL'] };
      } else {
        where.paymentStatus = st;
      }
    } else if (['NONE', 'PARTIALLY_RETURNED', 'RETURNED'].includes(st)) {
      where.returnStatus = st;
    } else {
      where.status = st;
    }
  }

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true, gstin: true, address: true, state: true } },
        items: true,
        payments: true,
        returns: { include: { items: true } },
        createdBy: { select: { id: true, name: true, email: true, businessId: true } },
      },
    }),
    prisma.sale.count({ where }),
  ]);

  return {
    sales: sales.map(mapSale),
    meta: buildPaginationMeta(total, page, limit),
  };
};

export const getMySales = async (userId, query = {}, user = null) => {
  const { page, limit, skip } = getPaginationParams(query);
  const where = { createdById: userId };

  if (user && user.role !== 'SUPER_ADMIN' && user.businessId) {
    where.businessId = user.businessId;
  }

  if (query.customerId) where.customerId = query.customerId;

  if (query.search && String(query.search).trim()) {
    const s = String(query.search).trim();
    where.OR = [
      { invoiceNumber: { contains: s, mode: 'insensitive' } },
      { customer: { name: { contains: s, mode: 'insensitive' } } },
      { customer: { phone: { contains: s } } },
      { customer: { gstin: { contains: s, mode: 'insensitive' } } },
    ];
  }

  const dateFilter = buildDateFilter(query);
  if (dateFilter) {
    where.createdAt = dateFilter;
  }

  if (query.paymentStatus && query.paymentStatus !== 'ALL') {
    const ps = query.paymentStatus.toUpperCase();
    if (ps === 'PARTIALLY PAID' || ps === 'PARTIALLY_PAID' || ps === 'PARTIAL') {
      where.paymentStatus = { in: ['PARTIALLY_PAID', 'PARTIAL'] };
    } else {
      where.paymentStatus = ps;
    }
  }

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
        customer: { select: { id: true, name: true, phone: true, email: true, gstin: true, address: true, state: true } },
        items: true,
        payments: true,
        returns: { include: { items: true } },
        createdBy: { select: { id: true, name: true, email: true, businessId: true } },
      },
    }),
    prisma.sale.count({ where }),
  ]);

  return {
    sales: sales.map(mapSale),
    meta: buildPaginationMeta(total, page, limit),
  };
};

export const getSaleById = async (saleId, user = null) => {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      customer: true,
      items: true,
      payments: true,
      returns: { include: { items: true } },
      auditLogs: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
      createdBy: { select: { id: true, name: true, email: true, businessId: true } },
    },
  });

  if (!sale) {
    throw ApiError.notFound('Sale not found');
  }

  // Anti-IDOR Multi-Tenant Verification
  if (user && user.role !== 'SUPER_ADMIN') {
    const saleBusinessId = sale.businessId || sale.createdBy?.businessId;
    if (saleBusinessId && user.businessId && saleBusinessId !== user.businessId) {
      throw ApiError.forbidden('Access denied: Invoice belongs to another organization');
    }
  }

  return mapSale(sale);
};

export const getSaleAuditTrail = async (saleId, user = null) => {
  const sale = await getSaleById(saleId, user);
  const logs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entityId: saleId },
        { entity: 'SALE', entityId: saleId },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  const formattedLogs = logs.map((log) => ({
    id: log.id,
    action: log.action,
    entity: log.entity,
    changes: log.changes,
    performedBy: log.user
      ? { id: log.user.id, name: log.user.name, email: log.user.email, role: log.user.role }
      : null,
    timestamp: log.createdAt,
  }));

  return {
    invoiceId: saleId,
    invoiceNumber: sale.invoiceNumber,
    auditTrail: formattedLogs,
    auditLogs: formattedLogs,
  };
};

export const recordPayment = async (saleId, paymentData = {}, user = null) => {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      customer: true,
      items: true,
      payments: true,
      returns: { include: { items: true } },
      createdBy: { select: { id: true, businessId: true } },
    },
  });

  if (!sale) throw ApiError.notFound('Sale not found');

  if (user && user.role !== 'SUPER_ADMIN') {
    const saleBusinessId = sale.businessId || sale.createdBy?.businessId;
    if (saleBusinessId && user.businessId && saleBusinessId !== user.businessId) {
      throw ApiError.forbidden('Access denied: Invoice belongs to another organization');
    }
  }

  const amount = Number(paymentData.amount || 0);
  if (isNaN(amount) || amount <= 0) {
    throw ApiError.badRequest('Payment amount must be greater than zero');
  }

  const mapped = mapSale(sale);
  if (mapped.balanceDue <= 0) {
    throw ApiError.conflict('Invoice is already fully paid');
  }

  if (amount > mapped.balanceDue + 0.01) {
    throw ApiError.badRequest(`Payment amount (₹${amount}) exceeds outstanding balance (₹${mapped.balanceDue})`);
  }

  return await prisma.$transaction(async (tx) => {
    const newPaidAmount = Number((Number(sale.paidAmount || 0) + amount).toFixed(2));
    const newBalance = Math.max(0, Number((mapped.netPayable - newPaidAmount).toFixed(2)));
    const newPaymentStatus = newBalance === 0 ? 'PAID' : 'PARTIALLY_PAID';

    // 1. Create Payment record
    const payment = await tx.payment.create({
      data: {
        saleId: sale.id,
        customerId: sale.customerId || null,
        amount,
        method: (paymentData.paymentMethod || 'CASH').toUpperCase(),
        note: paymentData.note || `Payment of ₹${amount} received for invoice ${sale.invoiceNumber}`,
      },
    });

    // 2. Update Customer balance
    if (sale.customerId) {
      await tx.customer.update({
        where: { id: sale.customerId },
        data: { balance: { decrement: amount } },
      });
    }

    // 3. Update Sale
    const updatedSale = await tx.sale.update({
      where: { id: sale.id },
      data: {
        paidAmount: newPaidAmount,
        paymentStatus: newPaymentStatus,
      },
      include: {
        customer: true,
        items: true,
        payments: true,
        returns: { include: { items: true } },
      },
    });

    // 4. Audit Log
    await tx.auditLog.create({
      data: {
        userId: user ? user.id : null,
        action: 'PAYMENT_RECORDED',
        entity: 'SALE',
        entityId: sale.id,
        changes: {
          invoiceNumber: sale.invoiceNumber,
          paymentId: payment.id,
          amountPaid: amount,
          paymentMethod: (paymentData.paymentMethod || 'CASH').toUpperCase(),
          previousPaidAmount: Number(sale.paidAmount || 0),
          newPaidAmount,
          previousPaymentStatus: sale.paymentStatus,
          newPaymentStatus,
          balanceRemaining: newBalance,
        },
      },
    });

    return mapSale(updatedSale);
  });
};

export const returnSale = async (saleId, returnData = {}, user = null) => {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      customer: true,
      items: true,
      returns: { include: { items: true } },
      createdBy: { select: { id: true, businessId: true } },
      business: true,
    },
  });
  if (!sale) throw ApiError.notFound('Sale not found');

  // Anti-IDOR Multi-Tenant Verification
  if (user && user.role !== 'SUPER_ADMIN') {
    const saleBusinessId = sale.businessId || sale.createdBy?.businessId;
    if (saleBusinessId && user.businessId && saleBusinessId !== user.businessId) {
      throw ApiError.forbidden('Access denied: Invoice belongs to another organization');
    }
  }

  if (sale.returnStatus === 'RETURNED' || sale.status === 'REFUNDED') {
    throw ApiError.conflict('This sale has already been fully returned/refunded');
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Concurrency Guard: Re-fetch latest sale state inside transaction row lock
    const currentSale = await tx.sale.findUnique({
      where: { id: saleId },
      include: {
        customer: true,
        items: true,
        returns: { include: { items: true } },
        createdBy: { select: { id: true, businessId: true } },
        business: true,
      },
    });

    if (!currentSale) throw ApiError.notFound('Sale not found');
    if (currentSale.returnStatus === 'RETURNED' || currentSale.status === 'REFUNDED') {
      throw ApiError.conflict('This sale has already been fully returned/refunded');
    }

    // Calculate existing returned quantities per item
    const existingReturnedByProduct = {};
    for (const prevRet of (currentSale.returns || [])) {
      for (const rItem of (prevRet.items || [])) {
        const key = rItem.productId;
        existingReturnedByProduct[key] = (existingReturnedByProduct[key] || 0) + Number(rItem.quantity || 0);
      }
    }

    let itemsToProcess = [];

    if (Array.isArray(returnData.items) && returnData.items.length > 0) {
      // Partial return specified by caller
      for (const reqItem of returnData.items) {
        const lineItem = currentSale.items.find(
          (si) => si.id === reqItem.saleItemId || si.id === reqItem.id || si.productId === reqItem.productId || si.name.toLowerCase() === (reqItem.name || '').toLowerCase()
        );
        if (!lineItem) {
          throw ApiError.badRequest(`Invoice item '${reqItem.name || reqItem.productId || reqItem.saleItemId}' not found on this invoice`);
        }
        const alreadyReturned = (lineItem.productId ? existingReturnedByProduct[lineItem.productId] : 0) || 0;
        const remainingQty = lineItem.quantity - alreadyReturned;
        const qtyToReturn = Number(reqItem.quantity !== undefined ? reqItem.quantity : 1);

        if (isNaN(qtyToReturn) || qtyToReturn <= 0) {
          throw ApiError.badRequest(`Return quantity for '${lineItem.name}' must be greater than zero`);
        }
        if (remainingQty <= 0) {
          throw ApiError.badRequest(`All units of '${lineItem.name}' on this invoice have already been returned.`);
        }
        if (qtyToReturn > remainingQty) {
          throw ApiError.badRequest(
            `Cannot return ${qtyToReturn} units of ${lineItem.name}. Only ${remainingQty} units available for return.`
          );
        }

        const unitRate = Number(lineItem.rate);
        const lineRatio = qtyToReturn / lineItem.quantity;
        const lineRefund = Number((Number(lineItem.total) * lineRatio).toFixed(2));
        const lineTaxRefund = Number((Number(lineItem.taxAmount || 0) * lineRatio).toFixed(2));

        itemsToProcess.push({
          lineItem,
          productId: lineItem.productId,
          quantity: qtyToReturn,
          rate: unitRate,
          total: lineRefund,
          taxAmount: lineTaxRefund,
        });
      }
    } else {
      // Full return of all remaining items
      for (const lineItem of currentSale.items) {
        const alreadyReturned = (lineItem.productId ? existingReturnedByProduct[lineItem.productId] : 0) || 0;
        const remainingQty = lineItem.quantity - alreadyReturned;
        if (remainingQty > 0) {
          const lineRatio = remainingQty / lineItem.quantity;
          const lineRefund = Number((Number(lineItem.total) * lineRatio).toFixed(2));
          const lineTaxRefund = Number((Number(lineItem.taxAmount || 0) * lineRatio).toFixed(2));
          itemsToProcess.push({
            lineItem,
            productId: lineItem.productId,
            quantity: remainingQty,
            rate: Number(lineItem.rate),
            total: lineRefund,
            taxAmount: lineTaxRefund,
          });
        }
      }
    }

    if (itemsToProcess.length === 0) {
      throw ApiError.badRequest('No items available to return');
    }

    let returnTotalAmount = 0;
    let returnGstTotal = 0;

    // Restore stock and create stock transactions
    for (const procItem of itemsToProcess) {
      returnTotalAmount += procItem.total;
      returnGstTotal += procItem.taxAmount;

      if (procItem.productId) {
        const product = await tx.product.findUnique({ where: { id: procItem.productId } });
        if (product) {
          const newStock = product.stock + procItem.quantity;
          await tx.product.update({
            where: { id: procItem.productId },
            data: { stock: newStock },
          });

          await tx.stockTransaction.create({
            data: {
              productId: procItem.productId,
              type: 'RETURN',
              quantity: procItem.quantity,
              previousStock: product.stock,
              newStock,
              reason: `Item return — Invoice ${currentSale.invoiceNumber}`,
            },
          });
        }
      }
    }

    const returnSeq = Date.now().toString().slice(-6);
    const returnNumber = `RET-${returnSeq}`;
    const creditNoteNumber = `CN-${returnSeq}`;
    const refundMethod = (returnData.refundMethod || returnData.paymentMethod || currentSale.paymentMethod || 'CASH').toUpperCase();

    // Create SalesReturn with nested SalesReturnItems
    await tx.salesReturn.create({
      data: {
        returnNumber,
        saleId,
        customerId: currentSale.customerId || null,
        totalAmount: Number(returnTotalAmount.toFixed(2)),
        reason: returnData?.reason || 'Customer Return',
        refundStatus: 'COMPLETED',
        items: {
          create: itemsToProcess.map((pi) => ({
            productId: pi.productId || pi.lineItem?.productId || pi.lineItem?.id,
            quantity: pi.quantity,
            rate: pi.rate,
            total: pi.total,
          })),
        },
      },
    });

    // Check if entire sale is now returned
    let totalOriginalQty = 0;
    let totalAllReturnedQty = 0;
    for (const si of currentSale.items) {
      totalOriginalQty += si.quantity;
      const prevRet = existingReturnedByProduct[si.productId] || 0;
      const thisRet = itemsToProcess.find((p) => p.productId === si.productId)?.quantity || 0;
      totalAllReturnedQty += prevRet + thisRet;
    }

    const isFullReturn = totalAllReturnedQty >= totalOriginalQty;
    const newReturnStatus = isFullReturn ? 'RETURNED' : 'PARTIALLY_RETURNED';

    // If customer settlement requested or sale had unpaid customer dues, update balance
    if (currentSale.customerId) {
      if (refundMethod === 'CREDIT' || refundMethod === 'STORE_CREDIT') {
        await tx.customer.update({
          where: { id: currentSale.customerId },
          data: { balance: { decrement: returnTotalAmount } },
        });
      } else if (Number(currentSale.paidAmount || 0) < Number(currentSale.grandTotal)) {
        const remainingDue = Number(currentSale.grandTotal) - Number(currentSale.paidAmount || 0);
        const balanceToCredit = Math.min(remainingDue, returnTotalAmount);
        if (balanceToCredit > 0) {
          await tx.customer.update({
            where: { id: currentSale.customerId },
            data: { balance: { decrement: balanceToCredit } },
          });
        }
      }
    }

    // Preserve the original invoice and update statuses (Req 6 & 8)
    const updated = await tx.sale.update({
      where: { id: saleId },
      data: {
        returnStatus: newReturnStatus,
        status: isFullReturn ? 'REFUNDED' : currentSale.status,
      },
      include: {
        customer: true,
        items: true,
        payments: true,
        returns: { include: { items: true } },
        business: true,
      },
    });

    // Audit logs for return and GST adjustment (Req 7, 12, 14)
    await tx.auditLog.create({
      data: {
        userId: user ? user.id : null,
        action: 'RETURN_PROCESSED',
        entity: 'SALE',
        entityId: currentSale.id,
        changes: {
          invoiceNumber: currentSale.invoiceNumber,
          returnNumber,
          creditNoteNumber,
          returnStatus: newReturnStatus,
          refundAmount: Number(returnTotalAmount.toFixed(2)),
          refundMethod,
          itemCount: itemsToProcess.length,
          reason: returnData?.reason || 'Customer Return',
        },
      },
    });

    await tx.auditLog.create({
      data: {
        userId: user ? user.id : null,
        action: 'GST_ADJUSTED',
        entity: 'SALE',
        entityId: currentSale.id,
        changes: {
          invoiceNumber: currentSale.invoiceNumber,
          returnNumber,
          creditNoteNumber,
          gstAdjustment: Number(returnGstTotal.toFixed(2)),
          originalTaxTotal: Number(currentSale.taxTotal || 0),
          netTaxTotal: Math.max(0, Number(currentSale.taxTotal || 0) - returnGstTotal),
          reason: `GST adjustment credit note ${creditNoteNumber} for return ${returnNumber}`,
        },
      },
    });

    return mapSale(updated);
  });
};

export default {
  buildDateFilter,
  mapSale,
  createSale,
  getSales,
  getMySales,
  getSaleById,
  getSaleAuditTrail,
  recordPayment,
  returnSale,
};
