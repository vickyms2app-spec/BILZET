import { getAuthoritativePrisma } from '../config/prisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { createInvoicePdf } from '../templates/invoice.template.mjs';

const PRISMA_CONNECTION_ERROR_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017']);

const mapDatabaseError = (err) => {
  if (err instanceof ApiError) {
    throw err;
  }
  if (
    err?.name === 'PrismaClientInitializationError' ||
    PRISMA_CONNECTION_ERROR_CODES.has(err?.code)
  ) {
    throw new ApiError(
      503,
      'Invoice service temporarily unavailable: database connection failed'
    );
  }
  throw err;
};

const toFiniteNumber = (value, fallback = 0) => {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const fetchAuthorizedSale = async (
  saleId,
  { businessId = null, user = null, requireTenantMatch = true } = {}
) => {
  if (!saleId || typeof saleId !== 'string' || !saleId.trim()) {
    throw ApiError.badRequest('Valid sale ID is required');
  }

  const db = getAuthoritativePrisma();

  let sale;
  try {
    sale = await db.sale.findUnique({
      where: { id: saleId.trim() },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            gstin: true,
            phone: true,
            email: true,
            address: true,
            state: true,
          },
        },
        customer: {
          select: {
            id: true,
            businessId: true,
            name: true,
            phone: true,
            email: true,
            address: true,
            gstin: true,
          },
        },
        items: {
          select: {
            id: true,
            name: true,
            quantity: true,
            rate: true,
            gstRate: true,
            discount: true,
            total: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  } catch (err) {
    mapDatabaseError(err);
  }

  if (!sale) {
    throw ApiError.notFound('Sale not found');
  }

  if (!sale.businessId || !sale.business) {
    throw ApiError.forbidden('Access denied: Invoice has no valid business ownership');
  }

  if (
    sale.customerId &&
    (!sale.customer || sale.customer.businessId !== sale.businessId)
  ) {
    throw ApiError.forbidden('Access denied: Invoice customer relationship is invalid');
  }

  if (businessId !== null) {
    if (!businessId || typeof businessId !== 'string' || !businessId.trim()) {
      throw ApiError.forbidden('Access denied: Valid business ID is required');
    }
    if (sale.businessId !== businessId.trim()) {
      throw ApiError.forbidden('Access denied: Invoice belongs to another organization');
    }
  } else if (user) {
    const isSuperAdmin = user.role === 'SUPER_ADMIN' || Boolean(user.isSuperAdmin);
    if (!isSuperAdmin) {
      if (!user.businessId || sale.businessId !== user.businessId) {
        throw ApiError.forbidden('Access denied: Invoice belongs to another organization');
      }
    }
  } else if (requireTenantMatch) {
    throw ApiError.forbidden('Access denied: Business context is required');
  }

  return sale;
};

const normalizeSaleForPdf = (sale) => {
  const subtotal = toFiniteNumber(sale.subtotal, 0);
  const discount = toFiniteNumber(sale.discountTotal, 0);
  const tax = toFiniteNumber(sale.taxTotal, 0);
  const grandTotal = toFiniteNumber(sale.grandTotal, 0);
  const paidAmount = toFiniteNumber(sale.paidAmount, 0);
  const dueAmount = Math.max(0, Number((grandTotal - paidAmount).toFixed(2)));

  return {
    id: sale.id,
    invoiceNumber: sale.invoiceNumber,
    createdAt: sale.createdAt,
    paymentStatus: sale.paymentStatus || 'UNPAID',
    paymentMethod: sale.paymentMethod || 'CASH',
    cashier: sale.createdBy
      ? {
          id: sale.createdBy.id,
          name: sale.createdBy.name,
          email: sale.createdBy.email,
        }
      : null,
    customer: sale.customer
      ? {
          id: sale.customer.id,
          name: sale.customer.name,
          phone: sale.customer.phone,
          email: sale.customer.email,
          address: sale.customer.address,
          gstin: sale.customer.gstin,
        }
      : null,
    items: (sale.items || []).map((item) => ({
      id: item.id,
      name: item.name || 'Item',
      quantity: toFiniteNumber(item.quantity, 1),
      unitPrice: toFiniteNumber(item.rate, 0),
      gstRate: toFiniteNumber(item.gstRate, 0),
      discount: toFiniteNumber(item.discount, 0),
      total: toFiniteNumber(item.total, 0),
    })),
    subtotal,
    discount,
    tax,
    grandTotal,
    paidAmount,
    dueAmount,
  };
};

const buildShopDetailsForPdf = async (business) => {
  const db = getAuthoritativePrisma();

  let shopSettings = null;
  try {
    shopSettings = await db.shopSettings.findFirst();
  } catch (err) {
    mapDatabaseError(err);
  }

  return {
    shopName: business.name || shopSettings?.shopName || 'Bilzet Retail Mart',
    phone: business.phone || shopSettings?.phone || 'N/A',
    email: business.email || shopSettings?.email || 'N/A',
    address: business.address || shopSettings?.address || '',
    city: shopSettings?.city || '',
    state: business.state || shopSettings?.state || '',
    pincode: shopSettings?.pincode || '',
    gstin: business.gstin || shopSettings?.gstin || '',
    upiId: shopSettings?.upiId || 'merchant@upi',
  };
};

const collectPdfStreamToBuffer = (doc) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let settled = false;

    const cleanup = () => {
      doc.off('data', onData);
      doc.off('end', onEnd);
      doc.off('error', onError);
    };

    const onData = (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    };

    const onEnd = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(Buffer.concat(chunks));
    };

    const onError = (err) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    doc.on('data', onData);
    doc.on('end', onEnd);
    doc.on('error', onError);
    doc.end();
  });

export const generateSaleInvoicePdf = async (saleId, user = null) => {
  const sale = await fetchAuthorizedSale(saleId, {
    user,
    requireTenantMatch: Boolean(user),
  });

  const normalizedSale = normalizeSaleForPdf(sale);
  const shopDetails = await buildShopDetailsForPdf(sale.business);

  return await createInvoicePdf(normalizedSale, shopDetails);
};

export const generateSaleInvoicePdfBuffer = async (saleId, businessId) => {
  const sale = await fetchAuthorizedSale(saleId, {
    businessId: businessId ?? '',
    requireTenantMatch: true,
  });

  const normalizedSale = normalizeSaleForPdf(sale);
  const shopDetails = await buildShopDetailsForPdf(sale.business);

  const doc = await createInvoicePdf(normalizedSale, shopDetails);
  const buffer = await collectPdfStreamToBuffer(doc);

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw ApiError.internal('Failed to generate invoice PDF buffer');
  }

  return buffer;
};

export default {
  generateSaleInvoicePdf,
  generateSaleInvoicePdfBuffer,
};
