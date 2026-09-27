import mongoose from 'mongoose';
import { connectDB, disconnectDB } from './config/db.mjs';
import { User } from './models/User.mjs';
import { Category } from './models/Category.mjs';
import { Product } from './models/Product.mjs';
import { Customer } from './models/Customer.mjs';
import { Supplier } from './models/Supplier.mjs';
import { ShopSettings } from './models/ShopSettings.mjs';
import { StockTransaction } from './models/StockTransaction.mjs';
import { ROLES, STOCK_TRANSACTION_TYPES } from './utils/constants.mjs';

/**
 * Seed database with initial required accounts, store settings, and sample catalog.
 * WARNING: FOR DEVELOPMENT / TESTING PURPOSES ONLY. CHANGE PASSWORDS IN PRODUCTION.
 */
const seedDatabase = async () => {
  try {
    console.log('--- Starting Database Seeding ---');
    await connectDB();

    // 1. Clear existing collections for a clean dev seed
    console.log('Clearing existing records...');
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Customer.deleteMany({}),
      Supplier.deleteMany({}),
      ShopSettings.deleteMany({}),
      StockTransaction.deleteMany({})
    ]);

    // 2. Seed Default Staff Accounts
    console.log('Seeding staff accounts...');
    const adminUser = await User.create({
      name: 'System Administrator',
      email: 'admin@shop.com',
      phone: '+91 9900112233',
      password: 'Admin@12345',
      role: ROLES.ADMIN,
      isActive: true
    });

    const managerUser = await User.create({
      name: 'Store Manager',
      email: 'manager@shop.com',
      phone: '+91 9900112244',
      password: 'Manager@12345',
      role: ROLES.MANAGER,
      isActive: true
    });

    const cashierUser = await User.create({
      name: 'Front Desk Cashier',
      email: 'cashier@shop.com',
      phone: '+91 9900112255',
      password: 'Cashier@12345',
      role: ROLES.CASHIER,
      isActive: true
    });

    console.log('Staff accounts created:');
    console.log('  ADMIN:   admin@shop.com   / Admin@12345');
    console.log('  MANAGER: manager@shop.com / Manager@12345');
    console.log('  CASHIER: cashier@shop.com / Cashier@12345');

    // 3. Seed Shop Settings
    console.log('Seeding shop settings...');
    await ShopSettings.create({
      shopName: 'Bilzet Super Mart',
      ownerName: 'Bilzet Retail Private Limited',
      phone: '+91 80 2345 6789',
      email: 'store@bilzet.com',
      address: '108 Commercial Boulevard, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
      gstin: '29ABCDE1234F1Z5',
      invoicePrefix: 'INV',
      currency: 'INR',
      taxSettings: {
        enableGst: true,
        defaultGstRate: 18
      },
      upiId: 'bilzetmart@okaxis'
    });

    // 4. Seed Categories
    console.log('Seeding categories...');
    const groceries = await Category.create({
      name: 'Groceries & Staples',
      description: 'Daily household food items, grains, spices'
    });
    const dairy = await Category.create({
      name: 'Dairy & Beverages',
      description: 'Milk, cheese, butter, juices, and soft drinks'
    });
    const electronics = await Category.create({
      name: 'Electronics & Accessories',
      description: 'Cables, chargers, earphones, and gadgets'
    });
    const personalCare = await Category.create({
      name: 'Personal Care',
      description: 'Soaps, shampoos, toothpaste, skincare'
    });

    // 5. Seed Products
    console.log('Seeding products...');
    const productsData = [
      {
        name: 'Basmati Rice Premium 5kg',
        sku: 'RICE-BAS-5KG',
        barcode: '890123456001',
        category: groceries._id,
        brand: 'India Gate',
        description: 'Aged long grain premium aromatic basmati rice',
        unit: 'packet',
        purchasePrice: 420.0,
        sellingPrice: 550.0,
        gstRate: 5,
        stock: 50,
        minimumStock: 10
      },
      {
        name: 'Organic Whole Milk 1L',
        sku: 'MILK-ORG-1L',
        barcode: '890123456002',
        category: dairy._id,
        brand: 'Amul',
        description: 'Pasteurized homogenized toned milk',
        unit: 'liter',
        purchasePrice: 52.0,
        sellingPrice: 66.0,
        gstRate: 0,
        stock: 100,
        minimumStock: 20
      },
      {
        name: 'USB-C Fast Charging Cable 1.5m',
        sku: 'CBL-USBC-15M',
        barcode: '890123456003',
        category: electronics._id,
        brand: 'boAt',
        description: 'Braided 65W fast charging type-C cable',
        unit: 'piece',
        purchasePrice: 180.0,
        sellingPrice: 349.0,
        gstRate: 18,
        stock: 30,
        minimumStock: 5
      },
      {
        name: 'Herbal Moisture Soap 125g',
        sku: 'SOP-HRB-125G',
        barcode: '890123456004',
        category: personalCare._id,
        brand: 'Himalaya',
        description: 'Ayurvedic neem & turmeric cleansing soap',
        unit: 'piece',
        purchasePrice: 35.0,
        sellingPrice: 55.0,
        gstRate: 12,
        stock: 80,
        minimumStock: 15
      },
      {
        name: 'Alfonso Mango Drink 500ml',
        sku: 'BEV-MNG-500ML',
        barcode: '890123456005',
        category: dairy._id,
        brand: 'Maaza',
        description: 'Rich mango fruit beverage',
        unit: 'piece',
        purchasePrice: 28.0,
        sellingPrice: 40.0,
        gstRate: 12,
        stock: 4, // Intentionally low stock to test low-stock alerts
        minimumStock: 10
      }
    ];

    for (const p of productsData) {
      const product = await Product.create(p);
      await StockTransaction.create({
        product: product._id,
        type: STOCK_TRANSACTION_TYPES.INITIAL,
        quantity: product.stock,
        previousStock: 0,
        newStock: product.stock,
        referenceType: 'Initial',
        reason: 'Seeded initial inventory balance',
        createdBy: adminUser._id
      });
    }

    // 6. Seed Customers
    console.log('Seeding customers...');
    await Customer.create([
      {
        name: 'Rahul Sharma',
        phone: '9876543210',
        email: 'rahul.sharma@example.com',
        address: 'Flat 402, Green Acres Apartment, Bengaluru',
        creditLimit: 5000,
        currentCredit: 0
      },
      {
        name: 'Priya Patel',
        phone: '9876501234',
        email: 'priya.patel@example.com',
        address: '12 Sunrise Enclave, Bengaluru',
        creditLimit: 10000,
        currentCredit: 1200
      },
      {
        name: 'Amit Verma',
        phone: '9811223344',
        email: 'amit.verma@example.com',
        address: 'B-24 Industrial Area, Bengaluru',
        creditLimit: 15000,
        currentCredit: 0
      }
    ]);

    // 7. Seed Suppliers
    console.log('Seeding suppliers...');
    await Supplier.create([
      {
        name: 'Metro FMCG Distributors',
        phone: '9822334455',
        email: 'orders@metrofmcg.com',
        address: 'Warehouse Complex #4, Yeshwanthpur, Bengaluru',
        gstin: '29ABCDE9999F1Z1',
        openingBalance: 0,
        currentBalance: 0
      },
      {
        name: 'Omni Tech Solutions Pvt Ltd',
        phone: '9833445566',
        email: 'supply@omnitech.com',
        address: 'Tech Park Zone B, Electronic City, Bengaluru',
        gstin: '29ABCDE8888F1Z2',
        openingBalance: 5000,
        currentBalance: 5000
      }
    ]);

    console.log('--- Database Seeding Completed Successfully ---');
    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('Error during database seeding:', error);
    await disconnectDB();
    process.exit(1);
  }
};

seedDatabase();
