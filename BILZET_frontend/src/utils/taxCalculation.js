/**
 * Shared Tax Calculation Service for Bilzet
 * Supports both GST Inclusive (MRP) and GST Exclusive (+Tax) pricing modes
 * Ensures consistent tax breakdown, rounding, and currency formatting across:
 * - Add/Edit Product forms (Products.jsx, Dashboard.jsx)
 * - POS / Billing checkout (Billing.jsx)
 * - Quotations module (Quotations.jsx)
 * - Invoices & Sales Operations (SalesOperations.jsx)
 */

export const GST_RATES = [0, 3, 5, 12, 18, 28];

export const DECIMAL_UNITS = [
  "kg",
  "gram",
  "litre",
  "liter",
  "ml",
  "millilitre",
  "metre",
  "meter",
];

/**
 * Returns true if the selected unit supports decimal quantities (e.g. 1.5 kg, 2.75 L)
 */
export function isDecimalUnit(unit) {
  if (!unit) return false;
  return DECIMAL_UNITS.includes(String(unit).toLowerCase().trim());
}

/**
 * Formats a numeric value into standard Indian Rupee notation (e.g. ₹1,180.00)
 */
export function formatCurrencyINR(amount) {
  const num = Number(amount || 0);
  return (
    "₹" +
    num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/**
 * Calculate Product Form Pricing Breakdown
 *
 * Option A (GST Inclusive):
 *  - Entered Selling Price is the final price including GST.
 *  - Taxable value = entered / (1 + (gstRate / 100))
 *  - GST Amount = entered - taxable value
 *  - Final Selling Price = entered
 *
 * Option B (GST Exclusive):
 *  - Entered Selling Price is the taxable base price.
 *  - GST Amount = entered * (gstRate / 100)
 *  - Final Selling Price = entered + GST Amount
 *
 * @param {Object} params
 * @param {number|string} params.sellingPrice - Manually entered selling price
 * @param {number|string} params.gstRate - GST rate % (0, 3, 5, 12, 18, 28)
 * @param {string} [params.pricingMethod] - 'INCLUSIVE' | 'EXCLUSIVE'
 * @param {boolean} [params.isTaxInclusive] - Alternative boolean flag
 * @returns {Object} { taxableValue, gstAmount, finalSellingPrice, enteredPrice, gstRate, isInclusive }
 */
export function calculateProductPriceBreakdown({
  sellingPrice = 0,
  gstRate = 18,
  pricingMethod = "INCLUSIVE",
  isTaxInclusive,
}) {
  const entered = Math.max(0, Number(sellingPrice) || 0);
  const rate = Math.max(0, Number(gstRate) || 0);
  const isInc =
    isTaxInclusive !== undefined
      ? Boolean(isTaxInclusive)
      : pricingMethod === "INCLUSIVE";

  let taxableValue = 0;
  let gstAmount = 0;
  let finalSellingPrice = 0;

  if (isInc) {
    // Option A: GST Inclusive
    taxableValue = Number(((entered * 100) / (100 + rate)).toFixed(2));
    gstAmount = Number((entered - taxableValue).toFixed(2));
    finalSellingPrice = Number(entered.toFixed(2));
  } else {
    // Option B: GST Exclusive
    taxableValue = Number(entered.toFixed(2));
    gstAmount = Number(((taxableValue * rate) / 100).toFixed(2));
    finalSellingPrice = Number((taxableValue + gstAmount).toFixed(2));
  }

  return {
    taxableValue,
    gstAmount,
    finalSellingPrice,
    enteredPrice: entered,
    gstRate: rate,
    isInclusive: isInc,
  };
}

/**
 * Calculate Line Item Tax for Billing & Quotations
 * Reuses the same decimal-safe arithmetic across all transaction modules.
 */
export function calculateLineItemTax({
  rate = 0,
  qty = 1,
  discount = 0,
  gstRate = 0,
  isTaxInclusive = true,
  pricingMethod,
  placeOfSupply = "",
}) {
  const numRate = Math.max(0, Number(rate) || 0);
  const numQty = Math.max(0, Number(qty) || 0);
  const numDiscount = Math.max(0, Number(discount) || 0);
  const numGstRate = Math.max(0, Number(gstRate) || 0);

  const isInc =
    isTaxInclusive !== undefined
      ? Boolean(isTaxInclusive)
      : pricingMethod === "INCLUSIVE";

  let taxable = 0;
  let tax = 0;
  let total = 0;

  if (isInc) {
    const gross = Math.max(0, numRate * numQty - numDiscount);
    taxable = Number(((gross * 100) / (100 + numGstRate)).toFixed(2));
    tax = Number((gross - taxable).toFixed(2));
    total = Number(gross.toFixed(2));
  } else {
    taxable = Math.max(0, Number((numRate * numQty - numDiscount).toFixed(2)));
    tax = Number(((taxable * numGstRate) / 100).toFixed(2));
    total = Number((taxable + tax).toFixed(2));
  }

  const isInterState = placeOfSupply && !placeOfSupply.startsWith("33");
  const cgst = isInterState ? 0 : Number((tax / 2).toFixed(2));
  const sgst = isInterState ? 0 : Number((tax - cgst).toFixed(2));
  const igst = isInterState ? tax : 0;

  return {
    taxable,
    tax,
    total,
    cgst,
    sgst,
    igst,
    isTaxInclusive: isInc,
  };
}
