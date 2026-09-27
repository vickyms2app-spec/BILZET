import dotenv from 'dotenv';
dotenv.config();
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSuperAdmin() {
  const superAdminEmail = 'vickyms2app@gmail.com';
  const superAdminName = 'admin';
  const superAdminPassword = 'AdminPassword123!';

  console.log(`Checking super admin user: ${superAdminEmail}...`);

  const existing = await prisma.user.findFirst({
    where: {
      email: {
        equals: superAdminEmail,
        mode: 'insensitive',
      },
    },
  });

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(superAdminPassword, salt);

  let adminUser;
  if (existing) {
    adminUser = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: superAdminName,
        email: superAdminEmail,
        phone: null,
        role: 'ADMIN',
        isActive: true,
        passwordHash,
      },
    });
    console.log(`Updated Super Admin: ${adminUser.email} (id: ${adminUser.id})`);
  } else {
    adminUser = await prisma.user.create({
      data: {
        name: superAdminName,
        email: superAdminEmail,
        passwordHash,
        phone: null,
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log(`Created Super Admin: ${adminUser.email} (id: ${adminUser.id})`);
  }

  // Ensure default subscriptions exist for all users who don't have one
  const users = await prisma.user.findMany({
    include: { subscriptions: true },
  });

  for (const u of users) {
    if (!u.subscriptions.length) {
      await prisma.subscription.create({
        data: {
          userId: u.id,
          planName: u.email.toLowerCase() === superAdminEmail ? 'Super Admin Enterprise' : 'Free Starter',
          planTier: u.email.toLowerCase() === superAdminEmail ? 'ENTERPRISE' : 'FREE',
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          amount: u.email.toLowerCase() === superAdminEmail ? 0.00 : 0.00,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        },
      });
      console.log(`Created default subscription for ${u.email}`);
    }
  }

  // Ensure default app config exists
  const config = await prisma.appConfig.findUnique({
    where: { id: 'global-config' },
  });
  if (!config) {
    await prisma.appConfig.create({
      data: {
        id: 'global-config',
        maintenanceMode: false,
        announcementText: 'Welcome to BILZET v10.4 — Fast GST billing & POS platform.',
        announcementType: 'info',
      },
    });
    console.log('Initialized global AppConfig');
  }

  console.log('Super admin seeding complete!');
}

seedSuperAdmin()
  .catch((err) => {
    console.error('Super Admin Seed Error:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
