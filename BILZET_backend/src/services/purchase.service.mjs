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

  let targetSupplierId = supplierId || altSupplierId;

  // If no supplier ID provided, check for newSupplier data or auto-create/match
  if (!targetSupplierId && (purchaseData.newSupplier || purchaseData.supplierName)) {
    const sName = (purchaseData.newSupplier?.name || purchaseData.supplierName || '').trim();
    const sCompany = (purchaseData.newSupplier?.companyName || purchaseData.companyName || '').trim();
    const sPhone = (purchaseData.newSupplier?.phone || purchaseData.supplierPhone || '').trim();
    const sEmail = (purchaseData.newSupplier?.email || purchaseData.supplierEmail || '').trim();
    const sAddress = (purchaseData.newSupplier?.address || purchaseData.supplierAddress || '').trim();
    const sGstin = (purchaseData.newSupplier?.gstin || purchaseData.supplierGstin || '').trim();

    if (sName) {
      let existing = null;
      if (sPhone) {
        existing = await prisma.supplier.findFirst({ where: { phone: sPhone } });
      }
      if (!existing && sCompany) {
        existing = await prisma.supplier.findFirst({
          where: { companyName: { equals: sCompany, mode: 'insensitive' } },
        });
      }
      if (!existing) {
        existing = await prisma.supplier.findFirst({
          where: { name: { equals: sName, mode: 'insensitive' } },
        });
      }

      if (existing) {
        targetSupplierId = existing.id;
        const toUpdate = {};
        if (sCompany && !existing.companyName) toUpdate.companyName = sCompany;
        if (sAddress && !existing.address) toUpdate.address = sAddress;
        if (sGstin && !existing.gstin) toUpdate.gstin = sGstin;
        if (Object.keys(toUpdate).length > 0) {
          await prisma.supplier.update({ where: { id: existing.id }, data: toUpdate });
        }
      } else {
        const created = await prisma.supplier.create({
          data: {
            name: sName,
            companyName: sCompany || null,
            phone: sPhone || null,
            email: sEmail || null,
            address: sAddress || null,
            gstin: sGstin || null,
            balance: 0,
            isActive: true,
          },
        });
        targetSupplierId = created.id;
      }
    }
  }

  if (!targetSupplierId) {
    throw ApiError.badRequest('Supplier ID or valid Supplier details are required');
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

  // 2. Fetch and resolve all products (link existing or auto-create if new)
  let subtotal = 0;
  let taxTotal = 0;
  const processedItems = [];

  for (const item of items) {
    let product = null;
    const prodId = item.productId || item.id;

    if (prodId) {
      product = await prisma.product.findUnique({ where: { id: prodId } });
    }

    if (!product) {
      if (item.barcode) {
        product = await prisma.product.findFirst({ where: { barcode: String(item.barcode).trim() } });
      }
      if (!product && item.sku) {
        product = await prisma.product.findFirst({ where: { sku: String(item.sku).trim() } });
      }
      if (!product && item.name) {
        product = await prisma.product.findFirst({
          where: { name: { equals: item.name.trim(), mode: 'insensitive' } },
        });
      }
    }

    const price = Number(item.purchasePrice || item.rate || product?.purchasePrice || 0);
    const gstRate = Number(item.gstRate ?? item.taxRate ?? item.gst ?? product?.gstRate ?? 18);

    if (!product) {
      const pName = item.name?.trim() || `Product-${Date.now().toString().slice(-4)}`;
      const pSku = item.sku?.trim() || `SKU-${Date.now().toString().slice(-6)}`;
      product = await prisma.product.create({
        data: {
          name: pName,
          sku: pSku,
          barcode: item.barcode?.trim() || null,
          purchasePrice: price,
          sellingPrice: round2(price * 1.3) || 10,
          stock: 0,
          minimumStock: 5,
          gstRate,
          isActive: true,
        },
      });
    }

    const qty = Number(item.quantity || item.qty || 1);
    const itemSubtotal = round2(qty * price);
    const itemTax = round2((itemSubtotal * gstRate) / 100);
    const itemTotal = round2(itemSubtotal + itemTax);

    subtotal = round2(subtotal + itemSubtotal);
    taxTotal = round2(taxTotal + itemTax);

    processedItems.push({
      productId: product.id,
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
      const current = await tx.product.findUnique({ where: { id: item.productId } });
      const currentStock = current ? Number(current.stock || 0) : 0;
      const newStock = currentStock + item.quantity;

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
          previousStock: currentStock,
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
        supplier: { select: { id: true, name: true, companyName: true, phone: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true, barcode: true } } } },
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

  let targetSupplierId = supplierId;
  if (!targetSupplierId && (poData.newSupplier || poData.supplierName)) {
    const sName = (poData.newSupplier?.name || poData.supplierName || '').trim();
    const sCompany = (poData.newSupplier?.companyName || poData.companyName || '').trim();
    const sPhone = (poData.newSupplier?.phone || poData.supplierPhone || '').trim();
    const sEmail = (poData.newSupplier?.email || poData.supplierEmail || '').trim();
    const sAddress = (poData.newSupplier?.address || poData.supplierAddress || '').trim();
    const sGstin = (poData.newSupplier?.gstin || poData.supplierGstin || '').trim();

    if (sName) {
      let existing = null;
      if (sPhone) {
        existing = await prisma.supplier.findFirst({ where: { phone: sPhone } });
      }
      if (!existing && sCompany) {
        existing = await prisma.supplier.findFirst({
          where: { companyName: { equals: sCompany, mode: 'insensitive' } },
        });
      }
      if (!existing) {
        existing = await prisma.supplier.findFirst({
          where: { name: { equals: sName, mode: 'insensitive' } },
        });
      }

      if (existing) {
        targetSupplierId = existing.id;
        const toUpdate = {};
        if (sCompany && !existing.companyName) toUpdate.companyName = sCompany;
        if (sAddress && !existing.address) toUpdate.address = sAddress;
        if (sGstin && !existing.gstin) toUpdate.gstin = sGstin;
        if (Object.keys(toUpdate).length > 0) {
          await prisma.supplier.update({ where: { id: existing.id }, data: toUpdate });
        }
      } else {
        const created = await prisma.supplier.create({
          data: {
            name: sName,
            companyName: sCompany || null,
            phone: sPhone || null,
            email: sEmail || null,
            address: sAddress || null,
            gstin: sGstin || null,
            balance: 0,
            isActive: true,
          },
        });
        targetSupplierId = created.id;
      }
    }
  }

  if (!targetSupplierId) {
    throw ApiError.badRequest('Supplier ID or valid Supplier details are required');
  }

  const poNumber = poData.poNumber || `PO-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
  let subtotal = 0;
  let taxTotal = 0;

  const processedItems = await Promise.all(
    items.map(async (item) => {
      let product = null;
      if (item.productId) {
        product = await prisma.product.findUnique({ where: { id: item.productId } });
      }
      if (!product && item.barcode) {
        product = await prisma.product.findFirst({ where: { barcode: String(item.barcode).trim() } });
      }
      if (!product && item.sku) {
        product = await prisma.product.findFirst({ where: { sku: String(item.sku).trim() } });
      }
      if (!product && item.name) {
        product = await prisma.product.findFirst({
          where: { name: { equals: item.name.trim(), mode: 'insensitive' } },
        });
      }

      const name = item.name?.trim() || product?.name || 'Custom Product';
      const sku = item.sku?.trim() || product?.sku || null;
      const barcode = item.barcode?.trim() || product?.barcode || null;
      const qty = Number(item.quantity || 1);
      const rate = Number(
        item.expectedPrice || item.unitPrice || item.purchasePrice || item.rate || product?.purchasePrice || 0
      );
      const gst = Number(item.gstRate ?? item.taxRate ?? product?.gstRate ?? 18);
      const lineSub = round2(qty * rate);
      const lineTax = round2((lineSub * gst) / 100);
      subtotal = round2(subtotal + lineSub);
      taxTotal = round2(taxTotal + lineTax);

      return {
        productId: product ? product.id : (item.productId || null),
        name,
        sku,
        barcode,
        quantity: qty,
        unitPrice: rate,
        rate,
        purchasePrice: rate,
        gstRate: gst,
        taxRate: gst,
        taxAmount: lineTax,
        total: round2(lineSub + lineTax),
      };
    })
  );

  return await prisma.purchaseOrder.create({
    data: {
      poNumber,
      supplierId: targetSupplierId,
      warehouseId: warehouseId || null,
      expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
      notes: notes || null,
      subtotal,
      taxTotal,
      grandTotal: round2(subtotal + taxTotal),
      items: processedItems,
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
