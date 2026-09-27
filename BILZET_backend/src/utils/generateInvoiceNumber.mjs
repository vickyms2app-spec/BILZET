import mongoose from 'mongoose';

/**
 * Generates the next sequential unique invoice number for the current year.
 * Format: INV-YYYY-000001
 * 
 * @param {string} prefix - Optional custom prefix from ShopSettings (default: 'INV')
 * @param {ClientSession|null} session - Optional mongoose session
 * @returns {Promise<string>} Unique invoice number
 */
export const generateInvoiceNumber = async (prefix = 'INV', session = null) => {
  const currentYear = new Date().getFullYear();
  const Sale = mongoose.model('Sale');

  const pattern = new RegExp(`^${prefix}-${currentYear}-(\\d+)$`);

  // Query highest invoice number for current prefix and year
  const query = Sale.findOne({
    invoiceNumber: { $regex: `^${prefix}-${currentYear}-` }
  })
    .sort({ invoiceNumber: -1 })
    .select('invoiceNumber');

  if (session) {
    query.session(session);
  }

  const lastSale = await query.exec();

  let nextSequence = 1;

  if (lastSale && lastSale.invoiceNumber) {
    const match = lastSale.invoiceNumber.match(pattern);
    if (match && match[1]) {
      nextSequence = parseInt(match[1], 10) + 1;
    }
  }

  const paddedSequence = String(nextSequence).padStart(6, '0');
  return `${prefix}-${currentYear}-${paddedSequence}`;
};

/**
 * Generates the next sequential purchase number.
 * Format: PUR-YYYY-000001
 */
export const generatePurchaseNumber = async (prefix = 'PUR', session = null) => {
  const currentYear = new Date().getFullYear();
  const Purchase = mongoose.model('Purchase');

  const pattern = new RegExp(`^${prefix}-${currentYear}-(\\d+)$`);

  const query = Purchase.findOne({
    purchaseNumber: { $regex: `^${prefix}-${currentYear}-` }
  })
    .sort({ purchaseNumber: -1 })
    .select('purchaseNumber');

  if (session) {
    query.session(session);
  }

  const lastPurchase = await query.exec();
  let nextSequence = 1;

  if (lastPurchase && lastPurchase.purchaseNumber) {
    const match = lastPurchase.purchaseNumber.match(pattern);
    if (match && match[1]) {
      nextSequence = parseInt(match[1], 10) + 1;
    }
  }

  const paddedSequence = String(nextSequence).padStart(6, '0');
  return `${prefix}-${currentYear}-${paddedSequence}`;
};

export default {
  generateInvoiceNumber,
  generatePurchaseNumber
};
