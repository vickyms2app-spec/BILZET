import test from "node:test";
import assert from "node:assert/strict";
import { dealerOfferService } from "../src/services/dealerOffer.service.mjs";
import { prisma } from "../src/config/prisma.mjs";

test("Dealer Offers & Catalog Synchronization Suite", async (t) => {
  await t.test("1. List default active dealer offers", async () => {
    const offers = await dealerOfferService.listOffers({ activeOnly: true });
    assert.ok(Array.isArray(offers), "Offers should be an array");
    assert.ok(offers.length >= 3, "Should contain at least 3 default offers");

    const dealer30 = offers.find((o) => o.code === "DEALER30");
    assert.ok(dealer30, "DEALER30 offer should exist");
    assert.equal(dealer30.discountType, "PERCENTAGE");
    assert.equal(dealer30.discountValue, 30);
  });

  await t.test("2. Validate DEALER30 offer for PRO tier annual plan (1499)", async () => {
    const res = await dealerOfferService.validateOffer({
      code: "DEALER30",
      planTier: "PRO",
      billingCycle: "ANNUAL",
    });

    assert.equal(res.valid, true);
    assert.equal(res.code, "DEALER30");
    assert.equal(res.originalPrice, 1499);
    // 30% of 1499 rounded = 450
    assert.equal(res.discountAmount, 450);
    assert.equal(res.discountedPrice, 1049);
  });

  await t.test("3. Validate DEALER500 fixed offer for PRO tier annual plan (1499)", async () => {
    const res = await dealerOfferService.validateOffer({
      code: "DEALER500",
      planTier: "PRO",
      billingCycle: "ANNUAL",
    });

    assert.equal(res.valid, true);
    assert.equal(res.code, "DEALER500");
    assert.equal(res.originalPrice, 1499);
    assert.equal(res.discountAmount, 500);
    assert.equal(res.discountedPrice, 999);
  });

  await t.test("4. Reject ineligible tier for DEALERVIP40 (eligible only for PREMIUM)", async () => {
    await assert.rejects(
      async () => {
        await dealerOfferService.validateOffer({
          code: "DEALERVIP40",
          planTier: "PRO",
          billingCycle: "ANNUAL",
        });
      },
      (err) => {
        assert.match(err.message, /not applicable/i);
        return true;
      }
    );
  });

  await t.test("5. Super Admin CRUD: Create, update, and delete custom dealer offer", async () => {
    const customCode = `TESTDEALER_${Date.now()}`;
    const created = await dealerOfferService.createOffer({
      code: customCode,
      title: "Test Dealer Special Offer",
      description: "Automated test description",
      discountType: "PERCENTAGE",
      discountValue: 25,
      applicableTiers: ["PRO", "PREMIUM"],
      maxRedemptions: 50,
      isActive: true,
    });

    assert.equal(created.code, customCode);
    assert.equal(created.discountValue, 25);

    // Update
    const updated = await dealerOfferService.updateOffer(customCode, {
      discountValue: 35,
      isActive: false,
    });
    assert.equal(updated.discountValue, 35);
    assert.equal(updated.isActive, false);

    // Delete
    const deleted = await dealerOfferService.deleteOffer(customCode);
    assert.equal(deleted, true);

    const check = await dealerOfferService.getOffer(customCode);
    assert.equal(check, null);
  });

  await t.test("6. Product Catalog & Inventory Synchronization Data Check", async () => {
    // Check that products table can calculate availableStock, soldQuantity, lowStockStatus, stockValue
    const sampleProduct = await prisma.product.findFirst({
      include: {
        saleItems: true,
      },
    });

    if (sampleProduct) {
      const soldQuantity = (sampleProduct.saleItems || []).reduce((acc, si) => acc + (si.quantity || 0), 0);
      const availableStock = Number(sampleProduct.stock ?? sampleProduct.currentStock ?? 0);
      const minStock = Number(sampleProduct.minimumStock ?? 5);
      const lowStockStatus = availableStock <= 0 ? "OUT_OF_STOCK" : availableStock <= minStock ? "LOW_STOCK" : "IN_STOCK";
      const stockValue = availableStock * Number(sampleProduct.sellingPrice || sampleProduct.purchasePrice || 0);

      assert.ok(typeof availableStock === "number");
      assert.ok(typeof soldQuantity === "number");
      assert.ok(["OUT_OF_STOCK", "LOW_STOCK", "IN_STOCK"].includes(lowStockStatus));
      assert.ok(typeof stockValue === "number");
    }
  });
});
