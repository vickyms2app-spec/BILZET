import { Payment } from '../models/Payment.mjs';
import { Customer } from '../models/Customer.mjs';
import { Supplier } from '../models/Supplier.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { withTransaction } from '../utils/transaction.mjs';
import { round2 } from '../utils/calculations.mjs';
import { AUDIT_ACTIONS } from '../utils/constants.mjs';
import { recordAudit } from '../middleware/audit.middleware.mjs';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.mjs';

/**
 * Collects credit payment from a customer.
 */
export const collectCreditPayment = async (paymentData, user, context = {}) => {
  const { customerId, amount, method, referenceNumber, notes } = paymentData;

  return await withTransaction(async (session) => {
    const custQuery = Customer.findById(customerId);
    if (session) custQuery.session(session);
    const customer = await custQuery.exec();

    if (!customer) {
      throw ApiError.notFound('Customer not found');
    }

    if (customer.currentCredit <= 0) {
      throw ApiError.badRequest(`Customer '${customer.name}' has no outstanding credit balance`);
    }

    const paymentAmount = round2(amount);
    if (paymentAmount > customer.currentCredit) {
      throw ApiError.badRequest(
        `Payment amount (₹${paymentAmount}) exceeds customer's outstanding credit (₹${customer.currentCredit})`
      );
    }

    // 1. Create Payment record
    const paymentPayload = {
      customer: customer._id,
      amount: paymentAmount,
      method,
      type: 'CREDIT_COLLECTION',
      referenceNumber: referenceNumber || '',
      status: 'COMPLETED',
      notes: notes || `Credit payment received from ${customer.name}`,
      receivedBy: user._id
    };

    const [payment] = session
      ? await Payment.create([paymentPayload], { session })
      : [await Payment.create(paymentPayload)];

    // 2. Reduce Customer credit balance
    customer.currentCredit = round2(customer.currentCredit - paymentAmount);
    if (session) await customer.save({ session });
    else await customer.save();

    // 3. Audit Log
    await recordAudit({
      user,
      action: AUDIT_ACTIONS.CREATE_PAYMENT,
      entity: 'Payment',
      entityId: payment._id,
      description: `Collected ₹${paymentAmount} credit payment from customer '${customer.name}'`,
      metadata: { customerId: customer._id, amount: paymentAmount, remainingCredit: customer.currentCredit },
      req: context.req
    });

    return {
      payment,
      remainingCredit: customer.currentCredit
    };
  });
};

/**
 * Pays outstanding balance to a supplier.
 */
export const makeSupplierPayment = async (paymentData, user, context = {}) => {
  const { supplierId, amount, method, referenceNumber, notes } = paymentData;

  return await withTransaction(async (session) => {
    const supQuery = Supplier.findById(supplierId);
    if (session) supQuery.session(session);
    const supplier = await supQuery.exec();

    if (!supplier) {
      throw ApiError.notFound('Supplier not found');
    }

    const payAmount = round2(amount);

    const paymentPayload = {
      supplier: supplier._id,
      amount: payAmount,
      method,
      type: 'PURCHASE_PAYMENT',
      referenceNumber: referenceNumber || '',
      status: 'COMPLETED',
      notes: notes || `Settlement payment to supplier ${supplier.name}`,
      receivedBy: user._id
    };

    const [payment] = session
      ? await Payment.create([paymentPayload], { session })
      : [await Payment.create(paymentPayload)];

    supplier.currentBalance = round2(supplier.currentBalance - payAmount);
    if (session) await supplier.save({ session });
    else await supplier.save();

    await recordAudit({
      user,
      action: AUDIT_ACTIONS.CREATE_PAYMENT,
      entity: 'Payment',
      entityId: payment._id,
      description: `Paid ₹${payAmount} to supplier '${supplier.name}'`,
      metadata: { supplierId: supplier._id, amount: payAmount, remainingBalance: supplier.currentBalance },
      req: context.req
    });

    return {
      payment,
      remainingBalance: supplier.currentBalance
    };
  });
};

/**
 * Lists all payments with filters and pagination.
 */
export const getPayments = async (query = {}) => {
  const { page, limit, skip, sort } = getPaginationParams(query);
  const filter = {};

  if (query.customerId) filter.customer = query.customerId;
  if (query.supplierId) filter.supplier = query.supplierId;
  if (query.method) filter.method = query.method;
  if (query.type) filter.type = query.type;
  if (query.startDate || query.endDate) {
    filter.paymentDate = {};
    if (query.startDate) filter.paymentDate.$gte = new Date(query.startDate);
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      filter.paymentDate.$lte = end;
    }
  }

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('customer', 'name phone')
      .populate('supplier', 'name phone')
      .populate('sale', 'invoiceNumber')
      .populate('receivedBy', 'name email')
      .exec(),
    Payment.countDocuments(filter)
  ]);

  return {
    payments,
    meta: buildPaginationMeta(total, page, limit)
  };
};

export default {
  collectCreditPayment,
  makeSupplierPayment,
  getPayments
};
