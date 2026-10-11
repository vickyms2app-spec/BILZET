import prisma from '../config/prisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { verifyCAStoreAccess } from './caPortal.service.mjs';

// In-memory persistent storage for bank reconciliation sessions per store
const bankStatementsStore = new Map();

/**
 * Service for Bank Statement Import & Reconciliation in CA Connect
 */

/**
 * Get current bank reconciliation session or status for a store
 */
export const getBankReconciliationSession = async (caUser, storeId) => {
  const store = await verifyCAStoreAccess(caUser, storeId);

  // Fetch recorded payments from store sales
  const sales = await prisma.sale.findMany({
    where: { businessId: storeId },
    select: { id: true, invoiceNumber: true, grandTotal: true, createdAt: true },
  });
  const saleMap = new Map(sales.map((s) => [s.id, s]));
  const saleIds = Array.from(saleMap.keys());

  const recordedPayments = await prisma.payment.findMany({
    where: { saleId: { in: saleIds } },
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { name: true, phone: true } },
    },
    take: 100,
  });

  const session = bankStatementsStore.get(storeId) || {
    storeId,
    importedAt: null,
    fileName: null,
    statementRows: [],
    matchedCount: 0,
    unmatchedCount: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
  };

  return {
    store,
    session,
    recordedPayments: recordedPayments.map((p) => {
      const sale = saleMap.get(p.saleId);
      return {
        id: p.id,
        saleId: p.saleId,
        invoiceNumber: sale?.invoiceNumber || 'INV',
        customerName: p.customer?.name || 'Retail Customer',
        amount: Number(p.amount || 0),
        method: p.method,
        transactionId: p.transactionId || null,
        date: p.createdAt,
      };
    }),
  };
};

/**
 * Import and parse bank statement lines
 * Accepts array of rows or CSV string:
 * [{ date, description, refNumber, debit, credit, amount }]
 */
export const importBankStatement = async (caUser, storeId, payload) => {
  const store = await verifyCAStoreAccess(caUser, storeId);
  const { fileName = 'Bank_Statement.csv', rows = [] } = payload;

  if (!Array.isArray(rows) || rows.length === 0) {
    throw ApiError.badRequest('Statement rows array is required and must not be empty');
  }

  // Fetch recorded payments for auto-matching
  const sales = await prisma.sale.findMany({
    where: { businessId: storeId },
    select: { id: true, invoiceNumber: true },
  });
  const saleMap = new Map(sales.map((s) => [s.id, s]));
  const saleIds = Array.from(saleMap.keys());

  const recordedPayments = await prisma.payment.findMany({
    where: { saleId: { in: saleIds } },
    select: { id: true, amount: true, transactionId: true, method: true, createdAt: true, saleId: true },
  });

  // Fetch recorded expenses
  const expenses = await prisma.expense.findMany({
    where: { businessId: storeId },
    select: { id: true, title: true, amount: true, createdAt: true },
  });

  let totalDeposits = 0;
  let totalWithdrawals = 0;
  let matchedCount = 0;

  const processedRows = rows.map((row, idx) => {
    const credit = Number(row.credit || (row.type === 'CREDIT' ? row.amount : 0) || 0);
    const debit = Number(row.debit || (row.type === 'DEBIT' ? row.amount : 0) || 0);
    const amount = credit > 0 ? credit : debit;
    totalDeposits += credit;
    totalWithdrawals += debit;

    let matchStatus = 'UNMATCHED';
    let matchedTransaction = null;
    let confidence = 0;

    // Credit matching (Inflows matched against customer payments)
    if (credit > 0) {
      const candidatePayment = recordedPayments.find(
        (p) => Math.abs(Number(p.amount) - credit) < 0.50
      );
      if (candidatePayment) {
        matchStatus = 'SUGGESTED_MATCH';
        confidence = 90;
        const linkedSale = saleMap.get(candidatePayment.saleId);
        matchedTransaction = {
          type: 'PAYMENT',
          id: candidatePayment.id,
          invoiceNumber: linkedSale?.invoiceNumber || 'INV',
          amount: Number(candidatePayment.amount),
          date: candidatePayment.createdAt,
        };
      }
    }

    // Debit matching (Outflows matched against expenses)
    if (debit > 0) {
      const candidateExpense = expenses.find(
        (e) => Math.abs(Number(e.amount) - debit) < 0.50
      );
      if (candidateExpense) {
        matchStatus = 'SUGGESTED_MATCH';
        confidence = 85;
        matchedTransaction = {
          type: 'EXPENSE',
          id: candidateExpense.id,
          reference: candidateExpense.title,
          amount: Number(candidateExpense.amount),
          date: candidateExpense.createdAt,
        };
      }
    }

    if (matchStatus === 'SUGGESTED_MATCH') matchedCount++;

    return {
      id: `stmt-${idx + 1}-${Date.now().toString(36)}`,
      date: row.date || new Date().toISOString().split('T')[0],
      description: row.description || 'Bank Transaction',
      refNumber: row.refNumber || row.reference || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      debit,
      credit,
      amount,
      balance: row.balance ? Number(row.balance) : null,
      matchStatus,
      confidence,
      matchedTransaction,
    };
  });

  const session = {
    storeId,
    importedAt: new Date().toISOString(),
    fileName,
    statementRows: processedRows,
    matchedCount,
    unmatchedCount: processedRows.length - matchedCount,
    totalDeposits: Number(totalDeposits.toFixed(2)),
    totalWithdrawals: Number(totalWithdrawals.toFixed(2)),
  };

  bankStatementsStore.set(storeId, session);

  // Durable Audit log
  await prisma.auditLog.create({
    data: {
      userId: caUser.id,
      action: 'BANK_STATEMENT_IMPORTED',
      entity: 'BANK_RECONCILIATION',
      entityId: storeId,
      changes: {
        fileName,
        totalRows: processedRows.length,
        totalDeposits,
        totalWithdrawals,
      },
    },
  });

  return {
    store,
    session,
  };
};

/**
 * Confirm, reject, or manually match a statement line
 */
export const updateStatementRowMatch = async (caUser, storeId, rowId, action, matchDetails = {}) => {
  await verifyCAStoreAccess(caUser, storeId);
  const session = bankStatementsStore.get(storeId);
  if (!session) throw ApiError.notFound('No active bank statement session found for this store');

  const row = session.statementRows.find((r) => r.id === rowId);
  if (!row) throw ApiError.notFound('Statement row not found');

  if (action === 'CONFIRM') {
    row.matchStatus = 'RECONCILED';
    row.confidence = 100;
  } else if (action === 'REJECT') {
    row.matchStatus = 'UNMATCHED';
    row.matchedTransaction = null;
    row.confidence = 0;
  } else if (action === 'MANUAL_MATCH') {
    row.matchStatus = 'RECONCILED';
    row.confidence = 100;
    row.matchedTransaction = matchDetails;
  }

  // Recalculate summary
  session.matchedCount = session.statementRows.filter((r) => r.matchStatus === 'RECONCILED' || r.matchStatus === 'SUGGESTED_MATCH').length;
  session.unmatchedCount = session.statementRows.length - session.matchedCount;

  bankStatementsStore.set(storeId, session);

  return {
    row,
    session,
  };
};

export default {
  getBankReconciliationSession,
  importBankStatement,
  updateStatementRowMatch,
};
