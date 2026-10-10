import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import billingService from '../services/billing.service.mjs';
import prisma from '../config/prisma.mjs';

export const createSale = asyncHandler(async (req, res) => {
  const sale = await billingService.createSale(req.body, req.user, { req });
  return sendResponse(res, 201, { sale }, 'Sale created successfully');
});

export const getSales = asyncHandler(async (req, res) => {
  const query = { ...req.query };
  const { sales, meta } = await billingService.getSales(query, req.user);
  return sendResponse(res, 200, { sales }, 'Sales fetched successfully', meta);
});

export const getMySales = asyncHandler(async (req, res) => {
  const { sales, meta } = await billingService.getMySales(req.user.id, req.query, req.user);
  return sendResponse(res, 200, { sales }, 'Personal sales fetched successfully', meta);
});

export const getSaleById = asyncHandler(async (req, res) => {
  const sale = await billingService.getSaleById(req.params.id, req.user);
  return sendResponse(res, 200, { sale }, 'Sale fetched successfully');
});

export const returnSale = asyncHandler(async (req, res) => {
  const sale = await billingService.returnSale(req.params.id, req.body, req.user, { req });
  return sendResponse(res, 200, { sale }, 'Sale return processed successfully');
});

// ─── DELIVERY CHALLANS ───
export const createDeliveryChallan = asyncHandler(async (req, res) => {
  const { customerId, warehouseId, deliveryAddress, transportDetails, vehicleNumber, deliveryDate } = req.body;
  const challanNumber = `CHAL-${Date.now().toString().slice(-6)}`;

  const challan = await prisma.deliveryChallan.create({
    data: {
      challanNumber,
      customerId: customerId || null,
      warehouseId: warehouseId || null,
      deliveryAddress: deliveryAddress || null,
      transportDetails: transportDetails || vehicleNumber || null,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : new Date(),
      status: 'DELIVERED',
    },
  });

  return sendResponse(res, 201, { challan }, 'Delivery challan generated successfully');
});

export const getDeliveryChallans = asyncHandler(async (req, res) => {
  const challans = await prisma.deliveryChallan.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return sendResponse(res, 200, { challans }, 'Delivery challans fetched successfully');
});

// ─── SALES RETURNS ───
export const getSalesReturns = asyncHandler(async (req, res) => {
  const returns = await prisma.salesReturn.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      sale: {
        select: {
          id: true,
          invoiceNumber: true,
          grandTotal: true,
          customer: { select: { id: true, name: true, phone: true } },
        },
      },
    },
  });
  return sendResponse(res, 200, { returns }, 'Sales returns fetched successfully');
});

// ─── PAYMENT IN (Customer Collection) ───
export const createPaymentIn = asyncHandler(async (req, res) => {
  const {
    customerId,
    saleId,
    amount,
    method,
    paymentMode,
    paymentMethod,
    transactionId,
    referenceNumber,
    note,
    notes,
  } = req.body;

  const amt = Number(amount);
  if (!amt || amt <= 0) {
    throw ApiError.badRequest('Payment amount must be greater than 0');
  }

  const selectedMethod = (method || paymentMode || paymentMethod || 'CASH').toUpperCase();
  const selectedTxId = transactionId || referenceNumber || null;
  const selectedNote = note || notes || null;

  const payment = await prisma.$transaction(async (tx) => {
    const pay = await tx.payment.create({
      data: {
        customerId: customerId || null,
        saleId: saleId || null,
        amount: amt,
        method: selectedMethod,
        transactionId: selectedTxId,
        note: selectedNote,
      },
    });

    if (customerId) {
      await tx.customer.update({
        where: { id: customerId },
        data: { balance: { decrement: amt } },
      });
    }

    if (saleId) {
      const sale = await tx.sale.findUnique({ where: { id: saleId } });
      if (sale) {
        const newPaid = Number(sale.paidAmount || 0) + amt;
        const grand = Number(sale.grandTotal);
        const status = newPaid >= grand ? 'PAID' : 'PARTIAL';
        await tx.sale.update({
          where: { id: saleId },
          data: { paidAmount: newPaid, paymentStatus: status },
        });
      }
    }

    return pay;
  });

  return sendResponse(res, 201, { payment }, 'Payment recorded successfully');
});

export const getPaymentsIn = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.customerId) where.customerId = req.query.customerId;
  if (req.query.method) where.method = req.query.method.toUpperCase();

  const payments = await prisma.payment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true, balance: true } },
      sale: { select: { id: true, invoiceNumber: true, grandTotal: true, paymentStatus: true } },
    },
  });

  return sendResponse(res, 200, { payments }, 'Payments-In fetched successfully');
});

export const recordPayment = asyncHandler(async (req, res) => {
  const sale = await billingService.recordPayment(req.params.id, req.body, req.user);
  return sendResponse(res, 200, { sale }, 'Payment recorded successfully');
});

export const getSaleAuditTrail = asyncHandler(async (req, res) => {
  const auditData = await billingService.getSaleAuditTrail(req.params.id, req.user);
  return sendResponse(res, 200, auditData, 'Invoice audit trail fetched successfully');
});

export const getSaleCreditNotes = asyncHandler(async (req, res) => {
  const sale = await billingService.getSaleById(req.params.id, req.user);
  return sendResponse(
    res,
    200,
    {
      invoiceNumber: sale.invoiceNumber,
      creditNotes: sale.returns || sale.creditNotes || [],
      returns: sale.returns || [],
    },
    'Credit notes fetched successfully'
  );
});

export const preventInvoiceEdit = asyncHandler(async (req, res) => {
  throw ApiError.forbidden(
    'Finalized invoices cannot be modified directly. Use returns/credit-notes for item adjustments or payment recording.'
  );
});

export const preventInvoiceDelete = asyncHandler(async (req, res) => {
  throw ApiError.forbidden(
    'Finalized invoices cannot be deleted. Original invoice records and transaction history are permanently preserved.'
  );
});

export default {
  createSale,
  getSales,
  getMySales,
  getSaleById,
  getSaleAuditTrail,
  recordPayment,
  returnSale,
  getSaleCreditNotes,
  preventInvoiceEdit,
  preventInvoiceDelete,
  createDeliveryChallan,
  getDeliveryChallans,
  getSalesReturns,
  createPaymentIn,
  getPaymentsIn,
};

