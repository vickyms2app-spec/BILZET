import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[NeonDB Seed] Starting database seeding...');

  // 1. Seed Shop Settings
  const existingSettings = await prisma.shopSettings.findFirst();
  if (!existingSettings) {
    await prisma.shopSettings.create({
      data: {
        shopName: 'BILZET Retail Mart',
        ownerName: 'demo',
        phone: '+91 9876543210',
        email: 'billing@bilzet.app',
        address: '123 Commercial Plaza, Main Market',
        gstin: '33AAAAA0000A1Z5',
        state: 'Tamil Nadu',
        stateCode: '33',
        invoicePrefix: 'INV-2026-',
        paperSize: 'A4',
        terms: 'Thank you for your business. Goods once sold are subject to applicable return policies.',
      },
    });
    console.log('[NeonDB Seed] Shop Settings seeded.');
  }

  // 2. Seed Admin & Cashier Users
  const adminEmail = 'admin@bilzet.app';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Admin@123', salt);

    await prisma.user.create({
      data: {
        name: 'Bilzet Admin',
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
        phone: '9876543210',
      },
    });
    console.log('[NeonDB Seed] Admin user created: admin@bilzet.app (Admin@123)');
  }

  // 3. Seed Standard Categories
  const categories = [
    { name: 'Grains & Cereals', description: 'Rice, wheat, pulses and flour' },
    { name: 'Dairy & Eggs', description: 'Milk, butter, cheese and eggs' },
    { name: 'Cooking Oils', description: 'Sunflower, mustard and groundnut oils' },
    { name: 'Beverages', description: 'Tea, coffee, juices and soft drinks' },
    { name: 'Snacks & Chocolates', description: 'Biscuits, chips and confectioneries' },
    { name: 'Personal & Home Care', description: 'Soaps, detergents and cleaning' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
  console.log('[NeonDB Seed] Standard categories seeded.');

  // 4. Seed Products
  const grainCat = await prisma.category.findUnique({ where: { name: 'Grains & Cereals' } });
  const dairyCat = await prisma.category.findUnique({ where: { name: 'Dairy & Eggs' } });
  const oilCat = await prisma.category.findUnique({ where: { name: 'Cooking Oils' } });

  const products = [
    {
      name: 'Premium Basmati Rice 5kg',
      sku: 'RIC-BAS-01',
      barcode: '890123456001',
      categoryId: grainCat?.id,
      brand: 'India Gate',
      unit: 'bag',
      purchasePrice: 380,
      sellingPrice: 450,
      gstRate: 5,
      stock: 45,
      minimumStock: 10,
    },
    {
      name: 'Organic Whole Wheat Atta 10kg',
      sku: 'ATT-ORG-03',
      barcode: '890123456002',
      categoryId: grainCat?.id,
      brand: 'Aashirvaad',
      unit: 'bag',
      purchasePrice: 330,
      sellingPrice: 400,
      gstRate: 0,
      stock: 28,
      minimumStock: 10,
    },
    {
      name: 'Cold-Pressed Sunflower Oil 1L',
      sku: 'OIL-SUN-02',
      barcode: '890123456003',
      categoryId: oilCat?.id,
      brand: 'Fortune',
      unit: 'bottle',
      purchasePrice: 150,
      sellingPrice: 180,
      gstRate: 5,
      stock: 32,
      minimumStock: 8,
    },
    {
      name: 'Amul Salted Butter 500g',
      sku: 'BTR-AML-500',
      barcode: '890123456004',
      categoryId: dairyCat?.id,
      brand: 'Amul',
      unit: 'pack',
      purchasePrice: 240,
      sellingPrice: 275,
      gstRate: 12,
      stock: 3,
      minimumStock: 10,
    },
  ];

  for (const prod of products) {
    await prisma.product.upsert({
      where: { sku: prod.sku },
      update: {},
      create: prod,
    });
  }
  console.log('[NeonDB Seed] Sample catalogue products seeded.');

  // 5. Seed Sample Customer
  const customerPhone = '9876543210';
  const existingCust = await prisma.customer.findUnique({ where: { phone: customerPhone } });
  if (!existingCust) {
    await prisma.customer.create({
      data: {
        name: 'Rajesh Kumar',
        phone: customerPhone,
        email: 'rajesh@example.com',
        address: '24 MG Road, Chennai',
        gstin: '33ABCDE1234F1Z5',
        creditLimit: 25000,
        balance: 0,
      },
    });
    console.log('[NeonDB Seed] Sample customer seeded.');
  }

  console.log('✅ [NeonDB Seed] Complete! All tables initialized in PostgreSQL NeonDB.');
}

main()
  .catch((e) => {
    console.error('[NeonDB Seed Error]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
