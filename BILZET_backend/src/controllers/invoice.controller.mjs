import { asyncHandler } from '../utils/asyncHandler.mjs';
import invoiceService from '../services/invoice.service.mjs';

export const getInvoicePdf = asyncHandler(async (req, res) => {
  const doc = await invoiceService.generateSaleInvoicePdf(req.params.saleId);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="invoice-${req.params.saleId}.pdf"`
  );

  doc.pipe(res);
  doc.end();
});

export default {
  getInvoicePdf
};
