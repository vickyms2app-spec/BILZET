import mongoose from 'mongoose';
import { Purchase } from '../models/Purchase.mjs';
import { Product } from '../models/Product.mjs';
import { Supplier } from '../models/Supplier.mjs';
import { Payment } from '../models/Payment.mjs';
import { StockTransaction } from '../models/StockTransaction.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { withTransaction } from '../utils/transaction.mjs';
import { calculatePurchaseItem, round2 } from '../utils/calculations.mjs';
import { generatePurchaseNumber } from '../utils/generateInvoiceNumber.mjs';
import { STOCK_TRANSACTION_TYPES, AUDIT_ACTIONS, PAYMENT_STATUSES } from '../utils/constants.mjs';
import { recordAudit } from '../middleware/audit.middleware.mjs';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.mjs';

/**
 * Creates a purchase order atomically: increases stock, creates stock transactions, updates supplier balance, and records payment.
 */
export const createPurchase = async (purchaseData, user, context = {}) => {
  const { supplier: supplierId, items, discount = 0, paidAmount = 0, purchaseDate } = purchaseData;

  return await withTransaction(async (session) => {
    // 1. Validate Supplier
    const supQuery = Supplier.findById(supplierId);
    if (session) supQuery.session(session);
    const supplier = await supQuery.exec();

    if (!supplier) {
      throw ApiError.notFound('Supplier not found');
    }
    if (!supplier.isActive) {
      throw ApiError.badRequest('Supplier is inactive');
    }

    // 2. Fetch and validate all products
    const productIds = items.map((i) => i.productId);
    const prodQuery = Product.find({ _id: { $in: productIds } });
    if (session) prodQuery.session(session);
    const dbProducts = await prodQuery.exec();

    const productMap = new Map();
    dbProducts.forEach((p) => productMap.set(p._id.toString(), p));

    const calculatedItems = [];
    let subtotal = 0;
    let totalTax = 0;
    let totalItemDiscount = 0;

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw ApiError.notFound(`Product with ID '${item.productId}' not found`);
      }

      const calculated = calculatePurchaseItem(
        product,
        item.quantity,
        item.purchasePrice,
        item.gstRate || 0,
        item.discount || 0
      );

      calculatedItems.push(calculated);
      subtotal = round2(subtotal + item.quantity * item.purchasePrice);
      totalTax = round2(totalTax + calculated.tax);
      totalItemDiscount = round2(totalItemDiscount + calculated.discount);
    }

    const overallDiscount = Math.max(0, round2(discount));
    const finalDiscount = round2(totalItemDiscount + overallDiscount);
    const grandTotal = Math.max(0, round2(subtotal - finalDiscount + totalTax));
    const paid = Math.max(0, round2(paidAmount));
    const dueAmount = Math.max(0, round2(grandTotal - paid));

    let paymentStatus = PAYMENT_STATUSES.PAID;
    if (paid === 0 && grandTotal > 0) {
      paymentStatus = PAYMENT_STATUSES.DUE;
    } else if (paid < grandTotal) {
      paymentStatus = PAYMENT_STATUSES.PARTIAL;
    }

    // 3. Generate Purchase Number
    const purchaseNumber = await generatePurchaseNumber('PUR', session);

    // 4. Create Purchase Record
    const purchasePayload = {
      purchaseNumber,
      supplier: supplier._id,
      items: calculatedItems,
      subtotal,
      discount: finalDiscount,
      tax: totalTax,
      grandTotal,
      paidAmount: paid,
      dueAmount,
      paymentStatus,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      createdBy: user._id
    };

    const [createdPurchase] = session
      ? await Purchase.create([purchasePayload], { session })
      : [await Purchase.create(purchasePayload)];

    // 5. Increase Product Stock & Create StockTransactions
    for (const item of calculatedItems) {
      const product = productMap.get(item.product.toString());
      const prevStock = product.stock;
      const newStock = prevStock + item.quantity;

      const updateProd = Product.findByIdAndUpdate(
        item.product,
        {
          $inc: { stock: item.quantity },
          purchasePrice: item.purchasePrice // update latest cost price
        },
        { new: true }
      );
      if (session) updateProd.session(session);
      await updateProd.exec();

      const stockTxPayload = {
        product: item.product,
        type: STOCK_TRANSACTION_TYPES.PURCHASE,
        quantity: item.quantity,
        previousStock: prevStock,
        newStock,
        referenceType: 'Purchase',
        referenceId: createdPurchase._id,
        reason: `Purchased via PO ${purchaseNumber}`,
        createdBy: user._id
      };

      if (session) {
        await StockTransaction.create([stockTxPayload], { session });
      } else {
        await StockTransaction.create(stockTxPayload);
      }
    }

    // 6. Update Supplier Balance (dueAmount increases supplier currentBalance)
    if (dueAmount > 0) {
      supplier.currentBalance = round2(supplier.currentBalance + dueAmount);
      if (session) await supplier.save({ session });
      else await supplier.save();
    }

    // 7. Record Payment if paidAmount > 0
    if (paid > 0) {
      const paymentPayload = {
        purchase: createdPurchase._id,
        supplier: supplier._id,
        amount: paid,
        method: 'cash',
        type: 'PURCHASE_PAYMENT',
        status: 'COMPLETED',
        notes: `Payment for Purchase ${purchaseNumber}`,
        receivedBy: user._id
      };

      if (session) {
        await Payment.create([paymentPayload], { session });
      } else {
        await Payment.create(paymentPayload);
      }
    }

    // 8. Audit Log
    await recordAudit({
      user,
      action: AUDIT_ACTIONS.CREATE_PURCHASE,
      entity: 'Purchase',
      entityId: createdPurchase._id,
      description: `Purchase ${purchaseNumber} recorded. Grand Total: ₹${grandTotal}, Paid: ₹${paid}`,
      metadata: { purchaseNumber, grandTotal, paidAmount: paid },
      req: context.req
    });

    return createdPurchase;
  });
};

/**
 * Lists purchases with pagination and filters.
 */
export const getPurchases = async (query = {}) => {
  const { page, limit, skip, sort } = getPaginationParams(query);
  const filter = {};

  if (query.supplierId) {
    filter.supplier = query.supplierId;
  }
  if (query.paymentStatus) {
    filter.paymentStatus = query.paymentStatus;
  }
  if (query.search) {
    filter.purchaseNumber = { $regex: query.search, $options: 'i' };
  }
  if (query.startDate || query.endDate) {
    filter.purchaseDate = {};
    if (query.startDate) filter.purchaseDate.$gte = new Date(query.startDate);
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      filter.purchaseDate.$lte = end;
    }
  }

  const [purchases, total] = await Promise.all([
    Purchase.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('supplier', 'name phone email currentBalance')
      .populate('createdBy', 'name email')
      .exec(),
    Purchase.countDocuments(filter)
  ]);

  return {
    purchases,
    meta: buildPaginationMeta(total, page, limit)
  };
};

/**
 * Gets a single purchase by ID.
 */
export const getPurchaseById = async (id) => {
  const purchase = await Purchase.findById(id)
    .populate('supplier')
    .populate('createdBy', 'name email');

  if (!purchase) {
    throw ApiError.notFound('Purchase not found');
  }

  return purchase;
};

export default {
  createPurchase,
  getPurchases,
  getPurchaseById
};
