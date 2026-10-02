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
  const { sales, meta } = await billingService.getSales(query);
  return sendResponse(res, 200, { sales }, 'Sales fetched successfully', meta);
});

export const getSaleById = asyncHandler(async (req, res) => {
  const sale = await billingService.getSaleById(req.params.id);
  return sendResponse(res, 200, { sale }, 'Sale fetched successfully');
});

export const returnSale = asyncHandler(async (req, res) => {
  const sale = await billingService.returnSale(req.params.id, req.body, req.user, { req });
  return sendResponse(res, 200, { sale }, 'Sale return processed successfully');
});

// ─── DELIVERY CHALLANS ───
export const createDeliveryChallan = asyncHandler(async (req, res) => {
  const { customerId, warehouseId, deliveryAddress, transportDetails, deliveryDate } = req.body;
  const challanNumber = `CHAL-${Date.now().toString().slice(-6)}`;

  const challan = await prisma.deliveryChallan.create({
    data: {
      challanNumber,
      customerId: customerId || null,
      warehouseId: warehouseId || null,
      deliveryAddress: deliveryAddress || null,
      transportDetails: transportDetails || null,
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

// ─── PAYMENT IN (Customer Collection) ───
export const createPaymentIn = asyncHandler(async (req, res) => {
  const { customerId, saleId, amount, method = 'CASH', transactionId, note } = req.body;

  const amt = Number(amount);
  if (!amt || amt <= 0) {
    throw ApiError.badRequest('Payment amount must be greater than 0');
  }

  const payment = await prisma.$transaction(async (tx) => {
    const pay = await tx.payment.create({
      data: {
        customerId: customerId || null,
        saleId: saleId || null,
        amount: amt,
        method: method.toUpperCase(),
        transactionId: transactionId || null,
        note: note || null,
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

export default {
  createSale,
  getSales,
  getSaleById,
  returnSale,
  createDeliveryChallan,
  getDeliveryChallans,
  createPaymentIn,
};
