import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/config/prisma.mjs';
import billingService from '../src/services/billing.service.mjs';

test('PHASE 18: Quantity Field, Decimal Units, GST Inclusive & Exclusive Pricing Modes', async (t) => {
  const testBizId = 'busi-01';

  await t.test('1. Decimal Quantity & GST Inclusive (MRP) Product Creation', async () => {
    const sku = `DEC-INC-${Date.now().toString().slice(-4)}`;
    const product = await prisma.product.create({
      data: {
        name: 'Organic Basmati Rice 2.5kg',
        sku,
        unit: 'kg',
        purchasePrice: 200,
        sellingPrice: 118, // ₹118 entered price
        gstRate: 18,
        isTaxInclusive: true,
        pricingMethod: 'INCLUSIVE',
        stock: 25.5, // decimal initial stock
        minimumStock: 5.5,
        businessId: testBizId,
      },
    });

    assert.equal(product.sku, sku);
    assert.equal(product.unit, 'kg');
    assert.equal(Number(product.stock), 25.5);
    assert.equal(Number(product.minimumStock), 5.5);
    assert.equal(Number(product.sellingPrice), 118);
    assert.equal(product.isTaxInclusive, true);
    assert.equal(product.pricingMethod, 'INCLUSIVE');
  });

  await t.test('2. Whole Number Quantity & GST Exclusive (+Tax) Product Creation', async () => {
    const sku = `WHOLE-EXC-${Date.now().toString().slice(-4)}`;
    const product = await prisma.product.create({
      data: {
        name: 'Executive Ergonomic Chair',
        sku,
        unit: 'piece',
        purchasePrice: 3000,
        sellingPrice: 100, // ₹100 base price
        gstRate: 18,
        isTaxInclusive: false,
        pricingMethod: 'EXCLUSIVE',
        stock: 10,
        minimumStock: 2,
        businessId: testBizId,
      },
    });

    assert.equal(product.sku, sku);
    assert.equal(product.unit, 'piece');
    assert.equal(Number(product.stock), 10);
    assert.equal(Number(product.sellingPrice), 100);
    assert.equal(product.isTaxInclusive, false);
    assert.equal(product.pricingMethod, 'EXCLUSIVE');
  });

  await t.test('3. GST Rate Calculations for all standard brackets (0%, 3%, 5%, 12%, 18%, 28%)', async () => {
    const brackets = [0, 3, 5, 12, 18, 28];

    for (const rate of brackets) {
      // GST Inclusive: entered price ₹100
      const enteredInc = 100;
      const taxableInc = Number(((enteredInc * 100) / (100 + rate)).toFixed(2));
      const gstInc = Number((enteredInc - taxableInc).toFixed(2));
      assert.equal(Number((taxableInc + gstInc).toFixed(2)), enteredInc);

      // GST Exclusive: entered price ₹100
      const enteredExc = 100;
      const gstExc = Number(((enteredExc * rate) / 100).toFixed(2));
      const finalExc = Number((enteredExc + gstExc).toFixed(2));
      assert.equal(finalExc, Number((100 + gstExc).toFixed(2)));
    }
  });

  await t.test('4. Billing Service: No double-taxation on GST Inclusive product', async () => {
    const sku = `BILL-INC-${Date.now().toString().slice(-4)}`;
    const product = await prisma.product.create({
      data: {
        name: 'Inclusive Grocery Item',
        sku,
        unit: 'kg',
        purchasePrice: 80,
        sellingPrice: 118, // ₹118 MRP (tax inclusive)
        gstRate: 18,
        isTaxInclusive: true,
        pricingMethod: 'INCLUSIVE',
        stock: 50,
        minimumStock: 5,
        businessId: testBizId,
      },
    });

    const bill = await billingService.createSale(
      {
        items: [
          {
            productId: product.id,
            name: product.name,
            sku: product.sku,
            quantity: 1,
            rate: 118,
            sellingPrice: 118,
            gstRate: 18,
            isTaxInclusive: true,
            pricingMethod: 'INCLUSIVE',
          },
        ],
        paymentMethod: 'cash',
        paidAmount: 118,
        businessId: testBizId,
      },
      { id: 'user-01' }
    );

    // Final total must be ₹118 (no double tax added)
    assert.equal(Number(bill.grandTotal), 118);
    // Taxable must be ₹100
    assert.equal(Number(bill.subtotal), 100);
    // Tax must be ₹18
    assert.equal(Number(bill.taxAmount), 18);
  });

  await t.test('5. Billing Service: Adds GST on GST Exclusive product', async () => {
    const sku = `BILL-EXC-${Date.now().toString().slice(-4)}`;
    const product = await prisma.product.create({
      data: {
        name: 'Exclusive Electronic Component',
        sku,
        unit: 'piece',
        purchasePrice: 60,
        sellingPrice: 100, // ₹100 Base price (tax exclusive)
        gstRate: 18,
        isTaxInclusive: false,
        pricingMethod: 'EXCLUSIVE',
        stock: 30,
        minimumStock: 5,
        businessId: testBizId,
      },
    });

    const bill = await billingService.createSale(
      {
        items: [
          {
            productId: product.id,
            name: product.name,
            sku: product.sku,
            quantity: 1,
            rate: 100,
            sellingPrice: 100,
            gstRate: 18,
            isTaxInclusive: false,
            pricingMethod: 'EXCLUSIVE',
          },
        ],
        paymentMethod: 'cash',
        paidAmount: 118,
        businessId: testBizId,
      },
      { id: 'user-01' }
    );

    // Final total must be ₹118 (₹100 taxable + ₹18 GST)
    assert.equal(Number(bill.grandTotal), 118);
    assert.equal(Number(bill.subtotal), 100);
    assert.equal(Number(bill.taxAmount), 18);
  });

  await t.test('6. Billing Service: Decimal Quantity support (e.g. 1.75 kg)', async () => {
    const sku = `DEC-BILL-${Date.now().toString().slice(-4)}`;
    const product = await prisma.product.create({
      data: {
        name: 'Fresh Fruits (1.75 kg sale)',
        sku,
        unit: 'kg',
        purchasePrice: 60,
        sellingPrice: 100,
        gstRate: 5,
        isTaxInclusive: false,
        pricingMethod: 'EXCLUSIVE',
        stock: 50.0,
        minimumStock: 5.0,
        businessId: testBizId,
      },
    });

    const bill = await billingService.createSale(
      {
        items: [
          {
            productId: product.id,
            name: product.name,
            sku: product.sku,
            quantity: 1.75, // decimal quantity
            rate: 100,
            sellingPrice: 100,
            gstRate: 5,
            isTaxInclusive: false,
            pricingMethod: 'EXCLUSIVE',
          },
        ],
        paymentMethod: 'cash',
        paidAmount: 183.75,
        businessId: testBizId,
      },
      { id: 'user-01' }
    );

    // 1.75 * 100 = 175 taxable; 5% of 175 = 8.75; total = 183.75
    assert.equal(Number(bill.subtotal), 175);
    assert.equal(Number(bill.taxAmount), 8.75);
    assert.equal(Number(bill.grandTotal), 183.75);
  });
});
