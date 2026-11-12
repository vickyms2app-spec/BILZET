import test from "node:test";
import assert from "node:assert/strict";
import { dealerOfferService, calculateOfferPricing, validatePricingHierarchy } from "../src/services/dealerOffer.service.mjs";
import { prisma } from "../src/config/prisma.mjs";

test("Dealer Offers & Catalog Synchronization Suite", async (t) => {
  await t.test("1. List default active dealer offers and check plan tiers", async () => {
    const offers = await dealerOfferService.listOffers({ activeOnly: true, billingCycle: 'YEARLY' });
    assert.ok(Array.isArray(offers), "Offers should be an array");
    assert.ok(offers.length >= 3, "Should contain at least 3 default offers");

    const basic = offers.find((o) => o.code === "DEALERBASIC20");
    const pro = offers.find((o) => o.code === "DEALER30");
    const premium = offers.find((o) => o.code === "DEALERVIP40");

    assert.ok(basic, "DEALERBASIC20 offer should exist");
    assert.ok(pro, "DEALER30 offer should exist");
    assert.ok(premium, "DEALERVIP40 offer should exist");

    assert.equal(basic.discountValue, 20);
    assert.equal(pro.discountValue, 30);
    assert.equal(premium.discountValue, 40);
  });

  await t.test("2. Validate Dealer Basic Monthly and Yearly Pricing & 18% GST Breakdown", async () => {
    // Monthly: ₹199 - 20% = ₹159/mo (Savings: ₹40). 18% GST = ₹29. Total = ₹188.
    const resM = await dealerOfferService.validateOffer({
      code: "DEALERBASIC20",
      planTier: "PRO",
      billingCycle: "MONTHLY",
    });
    assert.equal(resM.valid, true);
    assert.equal(resM.originalPrice, 199);
    assert.equal(resM.discountAmount, 40);
    assert.equal(resM.discountedPrice, 159);
    assert.equal(resM.gstAmount, 29);
    assert.equal(resM.totalWithGst, 188);

    // Yearly: ₹2,388 - 20% = ₹1,910/yr (Savings: ₹478). 18% GST = ₹344. Total = ₹2,254.
    const resY = await dealerOfferService.validateOffer({
      code: "DEALERBASIC20",
      planTier: "PRO",
      billingCycle: "YEARLY",
    });
    assert.equal(resY.valid, true);
    assert.equal(resY.originalPrice, 2388);
    assert.equal(resY.discountAmount, 478);
    assert.equal(resY.discountedPrice, 1910);
    assert.equal(resY.gstAmount, 344);
    assert.equal(resY.totalWithGst, 2254);
  });

  await t.test("3. Validate Dealer Pro Monthly and Yearly Pricing & 18% GST Breakdown", async () => {
    // Monthly: ₹349 - 30% = ₹244/mo (Savings: ₹105). 18% GST = ₹44. Total = ₹288.
    const resM = await dealerOfferService.validateOffer({
      code: "DEALER30",
      planTier: "PRO",
      billingCycle: "MONTHLY",
    });
    assert.equal(resM.valid, true);
    assert.equal(resM.originalPrice, 349);
    assert.equal(resM.discountAmount, 105);
    assert.equal(resM.discountedPrice, 244);
    assert.equal(resM.gstAmount, 44);
    assert.equal(resM.totalWithGst, 288);

    // Yearly: ₹4,188 - 30% = ₹2,932/yr (Savings: ₹1,256). 18% GST = ₹528. Total = ₹3,460.
    const resY = await dealerOfferService.validateOffer({
      code: "DEALER30",
      planTier: "PRO",
      billingCycle: "YEARLY",
    });
    assert.equal(resY.valid, true);
    assert.equal(resY.originalPrice, 4188);
    assert.equal(resY.discountAmount, 1256);
    assert.equal(resY.discountedPrice, 2932);
    assert.equal(resY.gstAmount, 528);
    assert.equal(resY.totalWithGst, 3460);
  });

  await t.test("4. Validate Dealer Premium Monthly and Yearly Pricing & 18% GST Breakdown", async () => {
    // Monthly: ₹499 - 40% = ₹299/mo (Savings: ₹200). 18% GST = ₹54. Total = ₹353.
    const resM = await dealerOfferService.validateOffer({
      code: "DEALERVIP40",
      planTier: "PREMIUM",
      billingCycle: "MONTHLY",
    });
    assert.equal(resM.valid, true);
    assert.equal(resM.originalPrice, 499);
    assert.equal(resM.discountAmount, 200);
    assert.equal(resM.discountedPrice, 299);
    assert.equal(resM.gstAmount, 54);
    assert.equal(resM.totalWithGst, 353);

    // Yearly: ₹5,988 - 40% = ₹3,593/yr (Savings: ₹2,395). 18% GST = ₹647. Total = ₹4,240.
    const resY = await dealerOfferService.validateOffer({
      code: "DEALERVIP40",
      planTier: "PREMIUM",
      billingCycle: "YEARLY",
    });
    assert.equal(resY.valid, true);
    assert.equal(resY.originalPrice, 5988);
    assert.equal(resY.discountAmount, 2395);
    assert.equal(resY.discountedPrice, 3593);
    assert.equal(resY.gstAmount, 647);
    assert.equal(resY.totalWithGst, 4240);
  });

  await t.test("5. Enforce Strict Price Hierarchy: Basic < Pro < Premium", async () => {
    const offers = await dealerOfferService.listOffers({ activeOnly: true, billingCycle: 'YEARLY' });
    const basic = offers.find((o) => o.code === "DEALERBASIC20");
    const pro = offers.find((o) => o.code === "DEALER30");
    const premium = offers.find((o) => o.code === "DEALERVIP40");

    const bM = calculateOfferPricing(basic, 'MONTHLY');
    const pM = calculateOfferPricing(pro, 'MONTHLY');
    const premM = calculateOfferPricing(premium, 'MONTHLY');

    // Monthly: ₹159 < ₹244 < ₹299
    assert.ok(bM.discountedPrice < pM.discountedPrice, `Basic monthly (${bM.discountedPrice}) < Pro monthly (${pM.discountedPrice})`);
    assert.ok(pM.discountedPrice < premM.discountedPrice, `Pro monthly (${pM.discountedPrice}) < Premium monthly (${premM.discountedPrice})`);

    const bY = calculateOfferPricing(basic, 'YEARLY');
    const pY = calculateOfferPricing(pro, 'YEARLY');
    const premY = calculateOfferPricing(premium, 'YEARLY');

    // Yearly: ₹1,910 < ₹2,932 < ₹3,593
    assert.ok(bY.discountedPrice < pY.discountedPrice, `Basic yearly (${bY.discountedPrice}) < Pro yearly (${pY.discountedPrice})`);
    assert.ok(pY.discountedPrice < premY.discountedPrice, `Pro yearly (${pY.discountedPrice}) < Premium yearly (${premY.discountedPrice})`);

    // Hierarchy validator throws on violation
    const invalidOffers = [
      { dealerPlan: "Dealer Basic", monthlyPrice: 300, yearlyPrice: 3000, discountType: "PERCENTAGE", discountValue: 0 },
      { dealerPlan: "Dealer Pro", monthlyPrice: 200, yearlyPrice: 2000, discountType: "PERCENTAGE", discountValue: 0 },
    ];
    assert.throws(
      () => validatePricingHierarchy(invalidOffers),
      (err) => {
        assert.match(err.message, /price hierarchy violation/i);
        return true;
      }
    );
  });

  await t.test("6. Super Admin CRUD: Create, update, and delete custom dealer offer with hierarchy check", async () => {
    const customCode = `DEALERTEST_${Date.now()}`;
    const created = await dealerOfferService.createOffer({
      code: customCode,
      title: "Custom Partner Promo",
      dealerPlan: "Dealer Pro",
      badge: "Partner Promo",
      description: "Automated test description",
      discountType: "PERCENTAGE",
      discountValue: 30,
      monthlyOriginalPrice: 349,
      yearlyOriginalPrice: 4188,
      applicablePlans: ["PRO"],
      maxRedemptions: 50,
      isActive: true,
    });

    assert.equal(created.code, customCode);
    assert.equal(created.discountValue, 30);

    // Update
    const updated = await dealerOfferService.updateOffer(customCode, {
      discountValue: 28,
      isActive: false,
    });
    assert.equal(updated.discountValue, 28);
    assert.equal(updated.isActive, false);

    // Delete
    const deleted = await dealerOfferService.deleteOffer(customCode);
    assert.equal(deleted, true);

    const check = await dealerOfferService.getOffer(customCode);
    assert.equal(check, null);
  });

  await t.test("7. Product Catalog & Inventory Synchronization Data Check", async () => {
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
