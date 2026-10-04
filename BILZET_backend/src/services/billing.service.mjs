import prisma from '../config/prisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.mjs';

const mapSale = (s) => {
  if (!s) return null;
  return {
    ...s,
    _id: s.id,
    subtotal: Number(s.subtotal),
    discountTotal: Number(s.discountTotal),
    taxTotal: Number(s.taxTotal),
    grandTotal: Number(s.grandTotal),
    paidAmount: Number(s.paidAmount),
    items: s.items?.map((item) => ({
      ...item,
      _id: item.id,
      rate: Number(item.rate),
      discount: Number(item.discount),
      gstRate: Number(item.gstRate),
      taxAmount: Number(item.taxAmount),
      total: Number(item.total),
    })),
  };
};

export const createSale = async (saleData, user, context = {}) => {
  const {
    customerId,
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
    // 1. Verify customer if given
    let customer = null;
    if (customerId) {
      customer = await tx.customer.findUnique({ where: { id: customerId } });
      if (!customer) throw ApiError.notFound('Customer not found');
    }

    // 2. Fetch products and calculate line totals
    const calculatedItems = [];
    let subtotal = 0;
    let taxTotal = 0;

    for (const item of items) {
      let product = null;
      if (item.productId) {
        product = await tx.product.findUnique({ where: { id: item.productId } });
      }

      const rate = product ? Number(product.sellingPrice) : Number(item.rate || 0);
      const qty = Number(item.quantity || 1);
      const gstRate = product ? Number(product.gstRate) : Number(item.gstRate || 0);
      const itemSub = rate * qty;
      const itemTax = (itemSub * gstRate) / 100;
      const itemTotal = itemSub + itemTax;

      subtotal += itemSub;
      taxTotal += itemTax;

      calculatedItems.push({
        productId: product ? product.id : null,
        name: product ? product.name : item.name || 'Item',
        sku: product ? product.sku : item.sku || null,
        quantity: qty,
        rate,
        discount: 0,
        gstRate,
        taxAmount: itemTax,
        total: itemTotal,
      });

      // Decrement stock if product exists — enforce no overselling
      if (product) {
        if (product.stock < qty) {
          throw ApiError.badRequest(
            `Insufficient stock for '${product.name}'. Available: ${product.stock}, Requested: ${qty}`
          );
        }
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

    const grandTotal = subtotal + taxTotal - Number(discount || 0);
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const dueAmount = Math.max(0, grandTotal - Number(paidAmount || 0));

    // Update customer balance if due amount > 0
    if (dueAmount > 0 && customer) {
      await tx.customer.update({
        where: { id: customer.id },
        data: { balance: Number(customer.balance) + dueAmount },
      });
    }

    const paymentStatus =
      Number(paidAmount) >= grandTotal
        ? 'PAID'
        : Number(paidAmount) > 0
        ? 'PARTIAL'
        : 'UNPAID';

    // 3. Create Sale & SaleItems
    const sale = await tx.sale.create({
      data: {
        invoiceNumber,
        customerId: customer ? customer.id : null,
        subtotal,
        discountTotal: Number(discount || 0),
        taxTotal,
        grandTotal,
        paidAmount: Number(paidAmount || 0),
        paymentMethod: paymentMethod.toUpperCase(),
        paymentStatus,
        status: 'COMPLETED',
        createdById: user ? user.id : null,
        items: {
          create: calculatedItems,
        },
      },
      include: {
        items: true,
        customer: true,
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

    return mapSale(sale);
  });
};

export const getSales = async (query = {}) => {
  const { page, limit, skip } = getPaginationParams(query);
  const where = {};

  if (query.customerId) where.customerId = query.customerId;
  if (query.search) {
    where.invoiceNumber = { contains: query.search, mode: 'insensitive' };
  }

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        items: true,
      },
    }),
    prisma.sale.count({ where }),
  ]);

  return {
    sales: sales.map(mapSale),
    meta: buildPaginationMeta(total, page, limit),
  };
};

export const getSaleById = async (saleId) => {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      customer: true,
      items: true,
      payments: true,
    },
  });

  if (!sale) {
    throw ApiError.notFound('Sale not found');
  }

  return mapSale(sale);
};

export const returnSale = async (saleId, returnData, user) => {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { items: true },
  });
  if (!sale) throw ApiError.notFound('Sale not found');

  if (sale.status === 'REFUNDED') {
    throw ApiError.conflict('This sale has already been returned/refunded');
  }

  return await prisma.$transaction(async (tx) => {
    // Restore stock for each returned item
    for (const item of sale.items) {
      if (item.productId) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (product) {
          const newStock = product.stock + item.quantity;
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: newStock },
          });

          await tx.stockTransaction.create({
            data: {
              productId: item.productId,
              type: 'RETURN',
              quantity: item.quantity,
              previousStock: product.stock,
              newStock,
              reason: `Stock returned via sale refund — Invoice ${sale.invoiceNumber}`,
            },
          });
        }
      }
    }

    // Create SalesReturn record
    const returnNumber = `RET-${Date.now().toString().slice(-6)}`;
    await tx.salesReturn.create({
      data: {
        returnNumber,
        saleId,
        customerId: sale.customerId || null,
        totalAmount: sale.grandTotal,
        reason: returnData?.reason || 'Customer Return',
        refundStatus: 'COMPLETED',
      },
    });

    // If sale was unpaid/credit, reduce customer balance
    if (sale.customerId && Number(sale.paidAmount || 0) < Number(sale.grandTotal)) {
      const unpaidAmount = Number(sale.grandTotal) - Number(sale.paidAmount || 0);
      await tx.customer.update({
        where: { id: sale.customerId },
        data: { balance: { decrement: unpaidAmount } },
      });
    }

    // Mark the sale as refunded
    const updated = await tx.sale.update({
      where: { id: saleId },
      data: { status: 'REFUNDED' },
    });

    return mapSale(updated);
  });
};

export default {
  createSale,
  getSales,
  getSaleById,
  returnSale,
};
