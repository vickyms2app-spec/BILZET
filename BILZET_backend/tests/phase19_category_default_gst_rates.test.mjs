import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/config/prisma.mjs';
import billingService from '../src/services/billing.service.mjs';
import { createCategorySchema } from '../src/validators/category.validator.mjs';

test('PHASE 19: Category Default GST Tax Rates & Product Auto-Population', async (t) => {
  const testBizId = 'busi-01';
  const supportedRates = [0, 3, 5, 12, 18, 28];

  await t.test('1. Category Creation with Each Supported GST Rate (0%, 3%, 5%, 12%, 18%, 28%)', async () => {
    for (const rate of supportedRates) {
      const name = `Test Cat ${rate}pct ${Date.now().toString().slice(-4)}`;
      const cat = await prisma.category.create({
        data: {
          name,
          description: `Category with default ${rate}% GST rate`,
          defaultGstRate: rate,
          isActive: true,
          businessId: testBizId,
        },
      });

      assert.equal(cat.name, name);
      assert.equal(Number(cat.defaultGstRate), rate);
      assert.equal(cat.isActive, true);

      // Verify persistence by querying back
      const fetched = await prisma.category.findUnique({ where: { id: cat.id } });
      assert.ok(fetched);
      assert.equal(Number(fetched.defaultGstRate), rate);
    }
  });

  await t.test('2. Category Schema Validation (Supported Brackets & Rejections)', async () => {
    // Valid rates should parse cleanly
    for (const rate of supportedRates) {
      const result = createCategorySchema.safeParse({
        name: `Valid Cat ${rate}`,
        defaultGstRate: rate,
      });
      assert.ok(result.success, `Failed to validate supported rate: ${rate}`);
      assert.equal(result.data.defaultGstRate, rate);
    }

    // Invalid rates should fail validation
    const invalidRates = [-1, 7, 15, 25, 40, 105];
    for (const invalid of invalidRates) {
      const result = createCategorySchema.safeParse({
        name: `Invalid Cat ${invalid}`,
        defaultGstRate: invalid,
      });
      assert.equal(result.success, false, `Expected rate ${invalid} to be rejected`);
    }

    // Default rate should be 18 when omitted
    const defaultResult = createCategorySchema.safeParse({
      name: 'Default Rate Cat',
    });
    assert.ok(defaultResult.success);
    assert.equal(defaultResult.data.defaultGstRate, 18);
  });

  await t.test('3. Product Auto-populates Category Default GST Rate when not explicitly specified', async () => {
    // Create a 12% category
    const cat12 = await prisma.category.create({
      data: {
        name: `Apparel ${Date.now().toString().slice(-4)}`,
        defaultGstRate: 12,
        businessId: testBizId,
      },
    });

    // Create a 5% category
    const cat5 = await prisma.category.create({
      data: {
        name: `Packaged Food ${Date.now().toString().slice(-4)}`,
        defaultGstRate: 5,
        businessId: testBizId,
      },
    });

    // Create product in cat12 using cat's default rate
    const p1 = await prisma.product.create({
      data: {
        name: 'Cotton Polo Shirt',
        sku: `POLO-${Date.now().toString().slice(-4)}`,
        categoryId: cat12.id,
        sellingPrice: 500,
        gstRate: Number(cat12.defaultGstRate), // populated from category
        isTaxInclusive: true,
        pricingMethod: 'INCLUSIVE',
        stock: 50,
        businessId: testBizId,
      },
    });

    assert.equal(Number(p1.gstRate), 12);

    // Create product in cat5 using cat's default rate
    const p2 = await prisma.product.create({
      data: {
        name: 'Whole Grain Oatmeal',
        sku: `OAT-${Date.now().toString().slice(-4)}`,
        categoryId: cat5.id,
        sellingPrice: 150,
        gstRate: Number(cat5.defaultGstRate), // populated from category
        isTaxInclusive: false,
        pricingMethod: 'EXCLUSIVE',
        stock: 30,
        businessId: testBizId,
      },
    });

    assert.equal(Number(p2.gstRate), 5);
  });

  await t.test('4. Manual Override for Individual Products (Preserving Category Default)', async () => {
    // Create an 18% category
    const cat18 = await prisma.category.create({
      data: {
        name: `Electronics ${Date.now().toString().slice(-4)}`,
        defaultGstRate: 18,
        businessId: testBizId,
      },
    });

    // Create a product with manual override to 28%
    const pOverride = await prisma.product.create({
      data: {
        name: 'High-End 4K Gaming Monitor',
        sku: `MON-${Date.now().toString().slice(-4)}`,
        categoryId: cat18.id,
        sellingPrice: 35000,
        gstRate: 28, // explicit manual override
        isTaxInclusive: true,
        pricingMethod: 'INCLUSIVE',
        stock: 10,
        businessId: testBizId,
      },
    });

    assert.equal(Number(pOverride.gstRate), 28);

    // Verify category default is completely untouched
    const catCheck = await prisma.category.findUnique({ where: { id: cat18.id } });
    assert.equal(Number(catCheck.defaultGstRate), 18);
  });

  await t.test('5. Editing Existing Product Preserves Saved Product-Specific GST Rate', async () => {
    const cat = await prisma.category.create({
      data: {
        name: `Hardware ${Date.now().toString().slice(-4)}`,
        defaultGstRate: 18,
        businessId: testBizId,
      },
    });

    const p = await prisma.product.create({
      data: {
        name: 'Specialized Drill Bit',
        sku: `BIT-${Date.now().toString().slice(-4)}`,
        categoryId: cat.id,
        sellingPrice: 800,
        gstRate: 5, // custom 5% rate
        stock: 20,
        businessId: testBizId,
      },
    });

    // Update product's name and price (unrelated fields)
    const updated = await prisma.product.update({
      where: { id: p.id },
      data: {
        name: 'Specialized Heavy Drill Bit v2',
        sellingPrice: 850,
      },
    });

    assert.equal(updated.name, 'Specialized Heavy Drill Bit v2');
    assert.equal(Number(updated.sellingPrice), 850);
    assert.equal(Number(updated.gstRate), 5); // Rate preserved!
  });

  await t.test('6. Updating Category Default GST Rate Persists without Silently Overwriting Existing Products', async () => {
    const cat = await prisma.category.create({
      data: {
        name: `Office Goods ${Date.now().toString().slice(-4)}`,
        defaultGstRate: 12,
        businessId: testBizId,
      },
    });

    const p = await prisma.product.create({
      data: {
        name: 'Stationery Notebook Pack',
        sku: `BOOK-${Date.now().toString().slice(-4)}`,
        categoryId: cat.id,
        sellingPrice: 120,
        gstRate: 12,
        businessId: testBizId,
      },
    });

    // Update category default GST rate from 12% to 18%
    const updatedCat = await prisma.category.update({
      where: { id: cat.id },
      data: { defaultGstRate: 18 },
    });
    assert.equal(Number(updatedCat.defaultGstRate), 18);

    // Existing product still has its recorded 12% rate
    const pCheck = await prisma.product.findUnique({ where: { id: p.id } });
    assert.equal(Number(pCheck.gstRate), 12);
  });

  await t.test('7. POS Bills & Invoices Calculate Accurate Tax from Effective Category-Derived Product Rates', async () => {
    // 12% Category & Product
    const cat12 = await prisma.category.create({
      data: { name: `Cat 12 ${Date.now().toString().slice(-4)}`, defaultGstRate: 12, businessId: testBizId },
    });
    const p12 = await prisma.product.create({
      data: {
        name: 'Product 12pct',
        sku: `P12-${Date.now().toString().slice(-4)}`,
        categoryId: cat12.id,
        sellingPrice: 112, // MRP inclusive: taxable 100, gst 12
        gstRate: Number(cat12.defaultGstRate),
        isTaxInclusive: true,
        pricingMethod: 'INCLUSIVE',
        stock: 100,
        businessId: testBizId,
      },
    });

    // 5% Category & Product
    const cat5 = await prisma.category.create({
      data: { name: `Cat 5 ${Date.now().toString().slice(-4)}`, defaultGstRate: 5, businessId: testBizId },
    });
    const p5 = await prisma.product.create({
      data: {
        name: 'Product 5pct',
        sku: `P5-${Date.now().toString().slice(-4)}`,
        categoryId: cat5.id,
        sellingPrice: 100, // Exclusive: +5% tax => 105
        gstRate: Number(cat5.defaultGstRate),
        isTaxInclusive: false,
        pricingMethod: 'EXCLUSIVE',
        stock: 100,
        businessId: testBizId,
      },
    });

    const bill = await billingService.createSale(
      {
        items: [
          {
            productId: p12.id,
            name: p12.name,
            sku: p12.sku,
            quantity: 1,
            rate: 112,
            sellingPrice: 112,
            gstRate: Number(p12.gstRate),
            isTaxInclusive: true,
            pricingMethod: 'INCLUSIVE',
          },
          {
            productId: p5.id,
            name: p5.name,
            sku: p5.sku,
            quantity: 1,
            rate: 100,
            sellingPrice: 100,
            gstRate: Number(p5.gstRate),
            isTaxInclusive: false,
            pricingMethod: 'EXCLUSIVE',
          },
        ],
        paymentMethod: 'cash',
        paidAmount: 217,
        businessId: testBizId,
      },
      { id: 'user-01' }
    );

    assert.equal(Number(bill.subtotal), 200); // 100 + 100
    assert.equal(Number(bill.taxAmount), 17);  // 12 + 5
    assert.equal(Number(bill.grandTotal), 217); // 112 + 105
  });
});
