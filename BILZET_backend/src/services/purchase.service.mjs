import prisma from '../config/prisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.mjs';

const round2 = (num) => Math.round((Number(num) + Number.EPSILON) * 100) / 100;

export const createPurchase = async (purchaseData, user = {}, context = {}) => {
  const {
    supplierId,
    supplier: altSupplierId,
    items,
    warehouseId,
    discountTotal = 0,
    paidAmount = 0,
    paymentMethod = 'CASH',
    purchaseDate,
    dueDate,
    poNumber,
  } = purchaseData;

  const targetSupplierId = supplierId || altSupplierId;
  if (!targetSupplierId) {
    throw ApiError.badRequest('Supplier ID is required');
  }

  if (!items || !items.length) {
    throw ApiError.badRequest('At least one purchase item is required');
  }

  // 1. Verify supplier exists
  const supplier = await prisma.supplier.findUnique({
    where: { id: targetSupplierId },
  });
  if (!supplier) {
    throw ApiError.notFound('Supplier not found');
  }
  if (!supplier.isActive) {
    throw ApiError.badRequest('Supplier is currently inactive');
  }

  // 2. Fetch all products
  const productIds = items.map((i) => i.productId || i.id);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });
  const productMap = new Map();
  products.forEach((p) => productMap.set(p.id, p));

  let subtotal = 0;
  let taxTotal = 0;
  const processedItems = [];

  for (const item of items) {
    const prodId = item.productId || item.id;
    const product = productMap.get(prodId);
    if (!product) {
      throw ApiError.notFound(`Product with ID '${prodId}' not found`);
    }

    const qty = Number(item.quantity || item.qty || 1);
    const price = Number(item.purchasePrice || item.rate || product.purchasePrice || 0);
    const gstRate = Number(item.gstRate ?? item.taxRate ?? item.gst ?? product.gstRate ?? 0);
    const itemSubtotal = round2(qty * price);
    const itemTax = round2((itemSubtotal * gstRate) / 100);
    const itemTotal = round2(itemSubtotal + itemTax);

    subtotal = round2(subtotal + itemSubtotal);
    taxTotal = round2(taxTotal + itemTax);

    processedItems.push({
      productId: prodId,
      quantity: qty,
      purchasePrice: price,
      gstRate,
      taxAmount: itemTax,
      total: itemTotal,
    });
  }

  const grandTotal = Math.max(0, round2(subtotal + taxTotal - Number(discountTotal || 0)));
  let paid = Math.max(0, round2(paidAmount));
  if ((paidAmount === undefined || paidAmount === null || paidAmount === 0) && purchaseData.paymentStatus === 'PAID') {
    paid = grandTotal;
  }
  const due = Math.max(0, round2(grandTotal - paid));

  let paymentStatus = 'PAID';
  if (paid === 0 && grandTotal > 0) {
    paymentStatus = 'UNPAID';
  } else if (paid < grandTotal) {
    paymentStatus = 'PARTIAL';
  }

  const invoiceNumber =
    purchaseData.invoiceNumber ||
    `PUR-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

  // Execute atomically in a transaction
  return await prisma.$transaction(async (tx) => {
    // A. Create Purchase record
    const purchase = await tx.purchase.create({
      data: {
        invoiceNumber,
        poNumber: poNumber || null,
        supplierId: targetSupplierId,
        warehouseId: warehouseId || null,
        subtotal,
        taxTotal,
        discountTotal: Number(discountTotal || 0),
        grandTotal,
        paidAmount: paid,
        paymentStatus,
        paymentMethod: paymentMethod.toUpperCase(),
        status: 'COMPLETED',
        dueDate: dueDate ? new Date(dueDate) : null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        items: {
          create: processedItems,
        },
      },
      include: {
        items: { include: { product: true } },
        supplier: true,
      },
    });

    // B. Update stock & cost price for each product
    for (const item of processedItems) {
      const current = productMap.get(item.productId);
      const newStock = (current.stock || 0) + item.quantity;

      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: newStock,
          purchasePrice: item.purchasePrice,
        },
      });

      // Update warehouse-specific stock if warehouseId provided
      if (warehouseId) {
        await tx.warehouseStock.upsert({
          where: {
            warehouseId_productId: {
              warehouseId,
              productId: item.productId,
            },
          },
          update: {
            quantity: { increment: item.quantity },
          },
          create: {
            warehouseId,
            productId: item.productId,
            quantity: item.quantity,
          },
        });
      }

      // Record stock transaction
      await tx.stockTransaction.create({
        data: {
          productId: item.productId,
          type: 'IN',
          quantity: item.quantity,
          previousStock: current.stock || 0,
          newStock,
          reason: `Purchased via bill ${invoiceNumber}`,
        },
      });
    }

    // C. Update Supplier balance if credit / pending
    if (due > 0) {
      await tx.supplier.update({
        where: { id: targetSupplierId },
        data: {
          balance: { increment: due },
        },
      });
    }

    return purchase;
  });
};

export const getPurchases = async (query = {}) => {
  const { page, limit, skip } = getPaginationParams(query);
  const where = {};

  if (query.supplierId) where.supplierId = query.supplierId;
  if (query.warehouseId) where.warehouseId = query.warehouseId;
  if (query.paymentStatus) where.paymentStatus = query.paymentStatus.toUpperCase();

  if (query.search) {
    where.OR = [
      { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
      { poNumber: { contains: query.search, mode: 'insensitive' } },
      { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
    ];
  }

  const [purchases, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: { select: { id: true, name: true, phone: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    }),
    prisma.purchase.count({ where }),
  ]);

  return {
    purchases,
    meta: buildPaginationMeta(total, page, limit),
  };
};

export const getPurchaseById = async (id) => {
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: { include: { product: true } },
      returns: true,
    },
  });

  if (!purchase) {
    throw ApiError.notFound('Purchase order not found');
  }

  return purchase;
};

// ─── PURCHASE ORDERS (PO) ───
export const createPurchaseOrder = async (poData) => {
  const { supplierId, warehouseId, expectedDelivery, notes, items = [] } = poData;

  const poNumber = `PO-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
  let subtotal = 0;
  let taxTotal = 0;

  items.forEach((item) => {
    const qty = Number(item.quantity || 1);
    const rate = Number(item.expectedPrice || item.unitPrice || item.rate || 0);
    const gst = Number(item.gstRate || item.taxRate || 0);
    const lineSub = round2(qty * rate);
    subtotal = round2(subtotal + lineSub);
    taxTotal = round2(taxTotal + (lineSub * gst) / 100);
  });

  return await prisma.purchaseOrder.create({
    data: {
      poNumber,
      supplierId,
      warehouseId: warehouseId || null,
      expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
      notes: notes || null,
      subtotal,
      taxTotal,
      grandTotal: round2(subtotal + taxTotal),
      status: 'PENDING',
    },
    include: { supplier: true },
  });
};

export const getPurchaseOrders = async (query = {}) => {
  const where = {};
  if (query.status) where.status = query.status.toUpperCase();
  if (query.supplierId) where.supplierId = query.supplierId;

  return await prisma.purchaseOrder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { supplier: true },
  });
};

export const updatePurchaseOrderStatus = async (id, status) => {
  return await prisma.purchaseOrder.update({
    where: { id },
    data: { status: status.toUpperCase() },
  });
};

// ─── PURCHASE RETURNS ───
export const createPurchaseReturn = async (returnData) => {
  const { purchaseId, supplierId, items = [], reason } = returnData;

  let totalAmount = 0;
  items.forEach((i) => {
    totalAmount = round2(totalAmount + (Number(i.quantity || 1) * Number(i.rate || 0)));
  });

  const returnNumber = `PRET-${Date.now().toString().slice(-6)}`;

  return await prisma.$transaction(async (tx) => {
    const pret = await tx.purchaseReturn.create({
      data: {
        returnNumber,
        purchaseId,
        supplierId,
        totalAmount,
        reason: reason || 'Defective/Damaged Stock',
        status: 'COMPLETED',
      },
    });

    // Decrease stock back for returned items
    for (const item of items) {
      if (item.productId) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: Number(item.quantity) } },
        });
      }
    }

    // Adjust supplier balance
    if (supplierId && totalAmount > 0) {
      await tx.supplier.update({
        where: { id: supplierId },
        data: { balance: { decrement: totalAmount } },
      });
    }

    return pret;
  });
};

// ─── DEBIT NOTES ───
export const createDebitNote = async (debitData) => {
  let { supplierId, referenceInvoice, amount, reason, purchaseId } = debitData;
  if (!supplierId && purchaseId) {
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      select: { supplierId: true, invoiceNumber: true },
    });
    if (purchase) {
      supplierId = purchase.supplierId;
      if (!referenceInvoice) referenceInvoice = purchase.invoiceNumber;
    }
  }

  if (!supplierId) {
    throw ApiError.badRequest('Supplier ID or valid Purchase reference is required');
  }

  const debitNoteNumber = `DN-${Date.now().toString().slice(-6)}`;

  return await prisma.debitNote.create({
    data: {
      debitNoteNumber,
      supplierId,
      referenceInvoice: referenceInvoice || null,
      amount: Number(amount || 0),
      reason: reason || 'Adjustment against returned goods',
      status: 'ISSUED',
    },
  });
};

export const getDebitNotes = async (query = {}) => {
  return await prisma.debitNote.findMany({
    orderBy: { createdAt: 'desc' },
  });
};

export default {
  createPurchase,
  getPurchases,
  getPurchaseById,
  createPurchaseOrder,
  getPurchaseOrders,
  updatePurchaseOrderStatus,
  createPurchaseReturn,
  createDebitNote,
  getDebitNotes,
};
