/**
 * Precision monetary arithmetic utilities to prevent floating point errors.
 */

export const round2 = (num) => {
  return Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;
};

/**
 * Calculate financial snapshot for a single item in a sale.
 * @param {Object} product - Product document from database
 * @param {number} quantity - Quantity being purchased
 * @param {number} itemDiscount - Discount on this item (amount, optional)
 */
export const calculateItemFinancials = (product, quantity, itemDiscount = 0) => {
  const qty = Number(quantity);
  const unitPrice = round2(product.sellingPrice);
  const purchasePrice = round2(product.purchasePrice);
  const gstRate = Number(product.gstRate || 0);
  const discount = Math.max(0, round2(itemDiscount));

  // Base price = quantity * unitPrice
  const rawBase = round2(qty * unitPrice);
  // Net price after discount
  const discountedBase = Math.max(0, round2(rawBase - discount));
  
  // Tax calculation: GST on discounted base
  const tax = round2((discountedBase * gstRate) / 100);
  const total = round2(discountedBase + tax);

  return {
    productId: product._id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    quantity: qty,
    unitPrice,
    purchasePrice,
    gstRate,
    discount,
    tax,
    total
  };
};

/**
 * Calculate complete order totals from calculated items.
 * @param {Array} calculatedItems
 * @param {number} orderDiscount - Order level overall discount
 * @param {number} paidAmount - Amount customer paid
 */
export const calculateSaleTotals = (calculatedItems, orderDiscount = 0, paidAmount = 0) => {
  let subtotal = 0;
  let totalItemTax = 0;
  let totalItemDiscount = 0;

  for (const item of calculatedItems) {
    const itemBase = round2(item.quantity * item.unitPrice);
    subtotal = round2(subtotal + itemBase);
    totalItemTax = round2(totalItemTax + item.tax);
    totalItemDiscount = round2(totalItemDiscount + item.discount);
  }

  const overallDiscount = Math.max(0, round2(orderDiscount));
  const totalDiscount = round2(totalItemDiscount + overallDiscount);

  // Grand total = subtotal - totalDiscount + totalItemTax
  const grandTotal = Math.max(0, round2(subtotal - totalDiscount + totalItemTax));
  const paid = Math.max(0, round2(paidAmount));
  const due = Math.max(0, round2(grandTotal - paid));

  let paymentStatus = 'PAID';
  if (paid === 0 && grandTotal > 0) {
    paymentStatus = 'DUE';
  } else if (paid < grandTotal) {
    paymentStatus = 'PARTIAL';
  } else {
    paymentStatus = 'PAID';
  }

  return {
    subtotal,
    discount: totalDiscount,
    tax: totalItemTax,
    grandTotal,
    paidAmount: paid,
    dueAmount: due,
    paymentStatus
  };
};

/**
 * Calculate purchase item totals
 */
export const calculatePurchaseItem = (product, quantity, purchasePrice, gstRate = 0, discount = 0) => {
  const qty = Number(quantity);
  const price = round2(purchasePrice);
  const rate = Number(gstRate || 0);
  const disc = Math.max(0, round2(discount));

  const rawBase = round2(qty * price);
  const discountedBase = Math.max(0, round2(rawBase - disc));
  const tax = round2((discountedBase * rate) / 100);
  const total = round2(discountedBase + tax);

  return {
    product: product._id,
    name: product.name,
    quantity: qty,
    purchasePrice: price,
    gstRate: rate,
    discount: disc,
    tax,
    total
  };
};
