import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import prisma from '../config/prisma.mjs';

const mapOrder = (o) => {
  if (!o) return null;
  return {
    ...o,
    _id: o.id,
    status: o.orderStatus,
    orderStatus: o.orderStatus,
    totalAmount: Number(o.totalAmount || 0),
  };
};

export const getOnlineOrders = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.status) {
    where.orderStatus = req.query.status.toUpperCase();
  }

  const orders = await prisma.onlineOrder.findMany({
    where,
    orderBy: { orderDate: 'desc' },
  });

  return sendResponse(res, 200, { orders: orders.map(mapOrder) }, 'Online orders fetched successfully');
});

export const createOnlineOrder = asyncHandler(async (req, res) => {
  const { customerName, customerPhone, customerEmail, deliveryAddress, totalAmount, items } = req.body;

  if (!customerName || !totalAmount) {
    throw ApiError.badRequest('Customer name and order total are required');
  }

  const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

  const order = await prisma.onlineOrder.create({
    data: {
      orderNumber,
      customerName,
      customerPhone: customerPhone || null,
      customerEmail: customerEmail || null,
      deliveryAddress: deliveryAddress || null,
      totalAmount: Number(totalAmount),
      items: items || null,
      orderStatus: 'PENDING',
      paymentStatus: 'PAID',
    },
  });

  return sendResponse(res, 201, { order: mapOrder(order) }, 'Online order placed successfully');
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, paymentStatus } = req.body;

  const order = await prisma.onlineOrder.update({
    where: { id },
    data: {
      ...(status && { orderStatus: status.toUpperCase() }),
      ...(paymentStatus && { paymentStatus: paymentStatus.toUpperCase() }),
    },
  });

  return sendResponse(res, 200, { order: mapOrder(order) }, 'Order status updated');
});

export default {
  getOnlineOrders,
  createOnlineOrder,
  updateOrderStatus,
};
