import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import prisma from '../config/prisma.mjs';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.mjs';

const mapCustomer = (c) => {
  if (!c) return null;
  return {
    ...c,
    _id: c.id,
    creditLimit: Number(c.creditLimit),
    balance: Number(c.balance),
    currentCredit: Number(c.balance),
  };
};

export const getCustomers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const where = {};

  if (req.query.isActive !== undefined) {
    where.isActive = req.query.isActive === 'true';
  }
  if (req.query.search) {
    where.OR = [
      { name: { contains: req.query.search, mode: 'insensitive' } },
      { phone: { contains: req.query.search, mode: 'insensitive' } },
      { email: { contains: req.query.search, mode: 'insensitive' } },
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { sales: true } },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  const mapped = customers.map((c) => ({
    ...mapCustomer(c),
    totalOrders: c._count?.sales || 0,
  }));

  return sendResponse(
    res,
    200,
    { customers: mapped },
    'Customers fetched successfully',
    buildPaginationMeta(total, page, limit)
  );
});

export const getCustomerById = asyncHandler(async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
  });
  if (!customer) {
    throw ApiError.notFound('Customer not found');
  }
  return sendResponse(res, 200, { customer: mapCustomer(customer) }, 'Customer fetched successfully');
});

export const createCustomer = asyncHandler(async (req, res) => {
  const { name, phone, email, address, gstin, state, creditLimit = 0, balance = 0 } = req.body;

  if (phone) {
    const existing = await prisma.customer.findUnique({ where: { phone } });
    if (existing) {
      throw ApiError.conflict(`Customer with phone '${phone}' already exists`);
    }
  }

  const customer = await prisma.customer.create({
    data: {
      name,
      phone,
      email,
      address,
      gstin,
      state,
      creditLimit: Number(creditLimit),
      balance: Number(balance),
    },
  });

  return sendResponse(res, 201, { customer: mapCustomer(customer) }, 'Customer created successfully');
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, phone, email, address, gstin, state, creditLimit, balance, isActive } = req.body;

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
      ...(address !== undefined && { address }),
      ...(gstin !== undefined && { gstin }),
      ...(state !== undefined && { state }),
      ...(creditLimit !== undefined && { creditLimit: Number(creditLimit) }),
      ...(balance !== undefined && { balance: Number(balance) }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return sendResponse(res, 200, { customer: mapCustomer(customer) }, 'Customer updated successfully');
});

export const getCustomerPurchases = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where: { customerId: req.params.id },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    }),
    prisma.sale.count({ where: { customerId: req.params.id } }),
  ]);

  return sendResponse(
    res,
    200,
    { purchases: sales.map((s) => ({ ...s, _id: s.id })) },
    'Customer purchases fetched successfully',
    buildPaginationMeta(total, page, limit)
  );
});

export const getCustomerPayments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: { customerId: req.params.id },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.payment.count({ where: { customerId: req.params.id } }),
  ]);

  return sendResponse(
    res,
    200,
    { payments: payments.map((p) => ({ ...p, _id: p.id })) },
    'Customer payments fetched successfully',
    buildPaginationMeta(total, page, limit)
  );
});

export const getCustomerCredit = asyncHandler(async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
  });
  if (!customer) {
    throw ApiError.notFound('Customer not found');
  }

  const creditLimit = Number(customer.creditLimit);
  const currentCredit = Number(customer.balance);

  return sendResponse(
    res,
    200,
    {
      customerId: customer.id,
      name: customer.name,
      creditLimit,
      currentCredit,
      availableCredit: Math.max(0, creditLimit - currentCredit),
    },
    'Customer credit details fetched successfully'
  );
});

export default {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  getCustomerPurchases,
  getCustomerPayments,
  getCustomerCredit,
};
