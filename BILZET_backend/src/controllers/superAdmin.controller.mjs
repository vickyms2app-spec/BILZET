import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';

export const getOverviewStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalCustomers,
      totalSales,
      salesAggregate,
      subscriptions,
      recentUsers,
      appConfig,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.customer.count(),
      prisma.sale.count(),
      prisma.sale.aggregate({
        _sum: { grandTotal: true },
      }),
      prisma.subscription.findMany(),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      }),
      prisma.appConfig.findUnique({ where: { id: 'global-config' } }),
    ]);

    // Calculate subscription breakdown
    let mrr = 0;
    const tierCounts = { FREE: 0, PRO: 0, ENTERPRISE: 0 };
    subscriptions.forEach((s) => {
      const tier = (s.planTier || 'FREE').toUpperCase();
      if (tierCounts[tier] !== undefined) {
        tierCounts[tier]++;
      }
      if (s.status === 'ACTIVE') {
        mrr += Number(s.amount || 0);
      }
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        suspendedUsers: totalUsers - activeUsers,
        totalCustomers,
        totalSales,
        totalRevenue: Number(salesAggregate._sum.grandTotal || 0),
        mrr,
        tierCounts,
        recentUsers,
        appConfig: appConfig || {
          maintenanceMode: false,
          announcementText: null,
          announcementType: 'info',
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 20, status = '' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * take;

    const where = {};
    if (search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
        { phone: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }
    if (status === 'active') where.isActive = true;
    if (status === 'suspended') where.isActive = false;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          subscriptions: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: { sales: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users: users.map((u) => ({
          ...u,
          _id: u.id,
          activeSubscription: u.subscriptions?.[0] || null,
          salesCount: u._count.sales,
        })),
        pagination: {
          total,
          page: pageNum,
          limit: take,
          totalPages: Math.ceil(total / take) || 1,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) throw ApiError.notFound('User not found.');

    if (targetUser.email.toLowerCase() === 'vickyms2app@gmail.com') {
      throw ApiError.badRequest('The master super admin account cannot be suspended.');
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: Boolean(isActive) },
      select: { id: true, name: true, email: true, isActive: true },
    });

    res.json({
      success: true,
      message: `User account ${updated.isActive ? 'activated' : 'suspended'} successfully.`,
      data: { user: updated },
    });
  } catch (err) {
    next(err);
  }
};

export const resetUserPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      throw ApiError.badRequest('New password must be at least 6 characters long.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    res.json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (err) {
    next(err);
  }
};

export const getSubscriptions = async (req, res, next) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, role: true },
        },
      },
    });

    res.json({
      success: true,
      data: {
        subscriptions: subscriptions.map((s) => ({
          ...s,
          _id: s.id,
          user: s.user ? { ...s.user, _id: s.user.id } : null,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { planName, planTier, status, billingCycle, amount, maxSubUsers, expiresAt } = req.body;

    const data = {};
    if (planName !== undefined) data.planName = planName;
    if (planTier !== undefined) data.planTier = planTier;
    if (status !== undefined) data.status = status;
    if (billingCycle !== undefined) data.billingCycle = billingCycle;
    if (amount !== undefined) data.amount = amount;
    if (maxSubUsers !== undefined) data.maxSubUsers = parseInt(maxSubUsers, 10) || 0;
    if (expiresAt !== undefined) data.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const updated = await prisma.subscription.update({
      where: { id },
      data,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json({
      success: true,
      message: 'Subscription updated successfully.',
      data: { subscription: updated },
    });
  } catch (err) {
    next(err);
  }
};

export const getAllCustomers = async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * take;

    const where = {};
    if (search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { phone: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
        { gstin: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        customers: customers.map((c) => ({ ...c, _id: c.id })),
        pagination: {
          total,
          page: pageNum,
          limit: take,
          totalPages: Math.ceil(total / take) || 1,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getAppConfig = async (req, res, next) => {
  try {
    let config = await prisma.appConfig.findUnique({
      where: { id: 'global-config' },
    });
    if (!config) {
      config = await prisma.appConfig.create({
        data: {
          id: 'global-config',
          maintenanceMode: false,
          announcementText: null,
          announcementType: 'info',
        },
      });
    }

    res.json({
      success: true,
      data: { appConfig: config },
    });
  } catch (err) {
    next(err);
  }
};

export const updateAppConfig = async (req, res, next) => {
  try {
    const { maintenanceMode, announcementText, announcementType } = req.body;

    const data = {};
    if (maintenanceMode !== undefined) data.maintenanceMode = Boolean(maintenanceMode);
    if (announcementText !== undefined) data.announcementText = announcementText;
    if (announcementType !== undefined) data.announcementType = announcementType;

    const updated = await prisma.appConfig.upsert({
      where: { id: 'global-config' },
      create: {
        id: 'global-config',
        ...data,
      },
      update: data,
    });

    res.json({
      success: true,
      message: 'Global platform configuration updated.',
      data: { appConfig: updated },
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getOverviewStats,
  getUsers,
  updateUserStatus,
  resetUserPassword,
  getSubscriptions,
  updateSubscription,
  getAllCustomers,
  getAppConfig,
  updateAppConfig,
};
