import { Sale } from '../models/Sale.mjs';
import { ShopSettings } from '../models/ShopSettings.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { createInvoicePdf } from '../templates/invoice.template.mjs';


export const generateSaleInvoicePdf = async (saleId) => {
  const sale = await Sale.findById(saleId)
    .populate('customer', 'name phone email address gstin')
    .populate('cashier', 'name email');

  if (!sale) {
    throw ApiError.notFound('Sale not found');
  }

  let shopSettings = await ShopSettings.findOne();
  if (!shopSettings) {
    shopSettings = {
      shopName: 'Bilzet Retail Mart',
      phone: '+91 9876543210',
      email: 'contact@bilzet.com',
      address: '123 Commercial Plaza, Main Market',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      gstin: '29ABCDE1234F1Z5',
      upiId: 'merchant@upi'
    };
  }

  return await createInvoicePdf(sale, shopSettings);
};

export default {
  generateSaleInvoicePdf
};
