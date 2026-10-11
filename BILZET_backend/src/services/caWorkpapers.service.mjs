import prisma from '../config/prisma.mjs';
import { verifyCAStoreAccess, getFinancialSummaryForCA, getStoreInvoicesForCA, getStoreCreditNotesForCA, getStorePurchasesForCA, getStoreDiscrepanciesForCA } from './caPortal.service.mjs';

/**
 * Service for CA Audit Workpapers & Reporting in BILZET CA Connect
 */

export const generateAuditWorkpapers = async (caUser, storeId, query = {}) => {
  const store = await verifyCAStoreAccess(caUser, storeId);

  const [summaryRes, invoicesRes, creditNotesRes, purchasesRes, discrepanciesRes] = await Promise.all([
    getFinancialSummaryForCA(caUser, storeId, query),
    getStoreInvoicesForCA(caUser, storeId, { ...query, limit: 100 }),
    getStoreCreditNotesForCA(caUser, storeId, query),
    getStorePurchasesForCA(caUser, storeId, { limit: 100 }),
    getStoreDiscrepanciesForCA(caUser, storeId, {}),
  ]);

  const metrics = summaryRes.metrics;
  const invoices = invoicesRes.invoices;
  const creditNotes = creditNotesRes.creditNotes;
  const purchases = purchasesRes.purchases;
  const discrepancies = discrepanciesRes.discrepancies;

  // Workpaper 1: Sales & Output GST Register
  const salesRegister = invoices.map((inv) => ({
    invoiceNumber: inv.invoiceNumber,
    date: inv.date,
    customerName: inv.customer?.name || 'Walk-in Retail Customer',
    customerGstin: inv.customer?.gstin || 'N/A',
    supplyType: inv.customer?.isB2B ? 'B2B' : 'B2C',
    taxableAmount: inv.taxableAmount,
    cgst: inv.cgst,
    sgst: inv.sgst,
    igst: inv.igst,
    taxTotal: inv.taxTotal,
    grandTotal: inv.grandTotal,
    returnedAmount: inv.totalReturnedAmount,
    netPayable: inv.netPayable,
    paymentStatus: inv.paymentStatus,
  }));

  // Workpaper 2: Credit Notes & Tax Reversals
  const creditNotesRegister = creditNotes.map((cn) => ({
    creditNoteNumber: cn.creditNoteNumber,
    returnDate: cn.returnDate || cn.createdAt,
    originalInvoiceNumber: cn.invoiceNumber,
    customerName: cn.customer?.name || 'Walk-in Retail Customer',
    taxableReversal: cn.taxableAmount,
    cgstReversal: cn.cgstAdjustment,
    sgstReversal: cn.sgstAdjustment,
    igstReversal: cn.igstAdjustment,
    totalGstAdjustment: cn.gstAdjustment,
    totalCreditValue: cn.totalAmount,
    refundStatus: cn.refundStatus,
  }));

  // Workpaper 3: Purchases & Input Tax Credit (ITC) Register
  const purchasesRegister = purchases.map((p) => ({
    invoiceNumber: p.invoiceNumber,
    supplierName: p.supplierName,
    supplierGstin: p.supplierGstin || 'Unregistered',
    subtotal: p.subtotal,
    taxTotal: p.taxTotal,
    grandTotal: p.grandTotal,
    paidAmount: p.paidAmount,
    balanceDue: p.balanceDue,
    itcEligible: Boolean(p.supplierGstin && p.taxTotal > 0),
  }));

  // Workpaper 4: Discrepancies & Corrections Status
  const discrepanciesRegister = discrepancies.map((d) => ({
    title: d.title,
    discrepancyType: d.discrepancyType,
    referenceNumber: d.referenceNumber,
    amount: d.amount,
    status: d.status,
    correctionResponse: d.correctionResponse,
    verifiedAt: d.verifiedAt,
  }));

  salesRegister.rowCount = salesRegister.length;
  creditNotesRegister.rowCount = creditNotesRegister.length;
  purchasesRegister.rowCount = purchasesRegister.length;
  discrepanciesRegister.rowCount = discrepanciesRegister.length;

  const summary = {
    grossSales: metrics.totalSalesBeforeReturns,
    salesReturns: metrics.totalReturnsAndCreditNotes,
    netTurnover: metrics.netSalesAfterReturns,
    grossOutputGst: metrics.gstCollectedOnSales,
    gstReversalOnReturns: metrics.gstAdjustmentsFromReturns,
    netOutputGstLiability: metrics.netGst,
    totalPurchases: purchases.reduce((acc, p) => acc + (p.grandTotal || 0), 0),
    totalEligibleITC: purchases.reduce((acc, p) => acc + (p.itcEligible ? p.taxTotal || 0 : 0), 0),
    openDiscrepanciesCount: discrepancies.filter((d) => d.status !== 'VERIFIED' && d.status !== 'RESOLVED').length,
    resolvedDiscrepanciesCount: discrepancies.filter((d) => d.status === 'VERIFIED' || d.status === 'RESOLVED').length,
  };

  const workpapers = {
    metadata: {
      storeId: store.id,
      storeName: store.name,
      gstin: store.gstin,
      address: store.address,
      state: store.state,
      auditedBy: caUser.name || caUser.email,
      auditTimestamp: new Date().toISOString(),
      reportTitle: `CA Audit & Accounting Workpapers — ${store.name}`,
    },
    store,
    executiveSummary: summary,
    reconciliationSummary: summary,
    salesRegister,
    creditNotesRegister,
    purchasesRegister,
    discrepanciesRegister,
  };

  return workpapers;
};

export default {
  generateAuditWorkpapers,
};
