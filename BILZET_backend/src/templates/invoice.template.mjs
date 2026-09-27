import PDFDocument from 'pdfkit';
import { generateQRCodeBuffer, buildUPIPaymentString } from '../utils/generateQRCode.mjs';

/**
 * Builds a professional A4 PDF invoice stream using PDFKit.
 *
 * @param {Object} sale - Populated sale document
 * @param {Object} shop - ShopSettings document
 * @returns {Promise<PDFDocument>} PDFKit document stream
 */
export const createInvoicePdf = async (sale, shop) => {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    info: {
      Title: `Invoice - ${sale.invoiceNumber}`,
      Author: shop.shopName
    }
  });

  const pageWidth = 595.28;
  const leftMargin = 40;
  const rightMargin = 555.28;
  const usableWidth = rightMargin - leftMargin;

  // Header: Shop Information
  doc.fillColor('#1a365d').fontSize(20).font('Helvetica-Bold').text(shop.shopName, leftMargin, 40);
  doc.fillColor('#4a5568').fontSize(9).font('Helvetica');
  doc.text(shop.address, leftMargin, 65);
  doc.text(`${shop.city || ''}, ${shop.state || ''} - ${shop.pincode || ''}`, leftMargin, 77);
  doc.text(`Phone: ${shop.phone || 'N/A'} | Email: ${shop.email || 'N/A'}`, leftMargin, 89);
  if (shop.gstin) {
    doc.text(`GSTIN: ${shop.gstin}`, leftMargin, 101);
  }

  // Invoice Title & Meta (Right Aligned)
  doc.fillColor('#2b6cb0').fontSize(16).font('Helvetica-Bold').text('TAX INVOICE', 350, 40, { align: 'right', width: 205 });
  doc.fillColor('#4a5568').fontSize(9).font('Helvetica');
  doc.text(`Invoice No: ${sale.invoiceNumber}`, 350, 65, { align: 'right', width: 205 });
  doc.text(`Date: ${new Date(sale.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}`, 350, 77, { align: 'right', width: 205 });
  doc.text(`Cashier: ${sale.cashier?.name || 'Authorized'}`, 350, 89, { align: 'right', width: 205 });
  doc.text(`Status: ${sale.paymentStatus}`, 350, 101, { align: 'right', width: 205 });

  // Divider
  doc.strokeColor('#cbd5e0').lineWidth(1).moveTo(leftMargin, 118).lineTo(rightMargin, 118).stroke();

  // Customer Information Section
  doc.fillColor('#2d3748').fontSize(10).font('Helvetica-Bold').text('BILL TO:', leftMargin, 126);
  doc.fillColor('#4a5568').fontSize(9).font('Helvetica');
  if (sale.customer) {
    doc.text(`Customer: ${sale.customer.name}`, leftMargin, 140);
    doc.text(`Phone: ${sale.customer.phone || 'N/A'}`, leftMargin, 152);
    if (sale.customer.address) doc.text(`Address: ${sale.customer.address}`, leftMargin, 164);
    if (sale.customer.gstin) doc.text(`GSTIN: ${sale.customer.gstin}`, leftMargin, 176);
  } else {
    doc.text('Walk-in Customer / Retail Sale', leftMargin, 140);
  }

  // Table Setup
  const tableTop = 200;
  const colX = {
    product: leftMargin,
    qty: 230,
    price: 285,
    gst: 350,
    discount: 410,
    total: 475
  };

  // Table Header Background
  doc.rect(leftMargin, tableTop, usableWidth, 20).fill('#edf2f7');
  doc.fillColor('#2d3748').fontSize(8.5).font('Helvetica-Bold');
  doc.text('ITEM & DESCRIPTION', colX.product + 5, tableTop + 5);
  doc.text('QTY', colX.qty, tableTop + 5, { width: 45, align: 'center' });
  doc.text('RATE (₹)', colX.price, tableTop + 5, { width: 55, align: 'right' });
  doc.text('GST %', colX.gst, tableTop + 5, { width: 45, align: 'center' });
  doc.text('DISC (₹)', colX.discount, tableTop + 5, { width: 55, align: 'right' });
  doc.text('TOTAL (₹)', colX.total, tableTop + 5, { width: 75, align: 'right' });

  let y = tableTop + 25;
  doc.font('Helvetica').fontSize(8.5);

  sale.items.forEach((item, index) => {
    // Alternating zebra row
    if (index % 2 === 1) {
      doc.rect(leftMargin, y - 3, usableWidth, 18).fill('#f7fafc');
    }

    doc.fillColor('#2d3748');
    const itemName = item.name.length > 32 ? item.name.substring(0, 30) + '...' : item.name;
    doc.text(itemName, colX.product + 5, y);
    doc.text(String(item.quantity), colX.qty, y, { width: 45, align: 'center' });
    doc.text(item.unitPrice.toFixed(2), colX.price, y, { width: 55, align: 'right' });
    doc.text(`${item.gstRate}%`, colX.gst, y, { width: 45, align: 'center' });
    doc.text(item.discount.toFixed(2), colX.discount, y, { width: 55, align: 'right' });
    doc.text(item.total.toFixed(2), colX.total, y, { width: 75, align: 'right' });

    y += 18;
  });

  // Table bottom border
  doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(leftMargin, y + 2).lineTo(rightMargin, y + 2).stroke();
  y += 15;

  // Totals Section (Right side)
  const totalsX = 350;
  const valuesX = 475;
  const totalsWidth = 75;

  doc.font('Helvetica').fontSize(9).fillColor('#4a5568');
  doc.text('Subtotal:', totalsX, y);
  doc.text(`₹${sale.subtotal.toFixed(2)}`, valuesX, y, { width: totalsWidth, align: 'right' });
  y += 14;

  if (sale.discount > 0) {
    doc.text('Discount:', totalsX, y);
    doc.text(`- ₹${sale.discount.toFixed(2)}`, valuesX, y, { width: totalsWidth, align: 'right' });
    y += 14;
  }

  doc.text('Tax (GST):', totalsX, y);
  doc.text(`+ ₹${sale.tax.toFixed(2)}`, valuesX, y, { width: totalsWidth, align: 'right' });
  y += 16;

  // Grand Total Box
  doc.rect(totalsX - 10, y - 3, usableWidth - (totalsX - leftMargin) + 10, 24).fill('#ebf8ff');
  doc.fillColor('#2b6cb0').fontSize(11).font('Helvetica-Bold');
  doc.text('Grand Total:', totalsX, y + 3);
  doc.text(`₹${sale.grandTotal.toFixed(2)}`, valuesX, y + 3, { width: totalsWidth, align: 'right' });
  y += 30;

  // Payment Breakdown
  doc.font('Helvetica').fontSize(9).fillColor('#4a5568');
  doc.text(`Payment Method: ${sale.paymentMethod.toUpperCase()}`, totalsX, y);
  y += 14;
  doc.text('Amount Paid:', totalsX, y);
  doc.text(`₹${sale.paidAmount.toFixed(2)}`, valuesX, y, { width: totalsWidth, align: 'right' });
  y += 14;
  doc.font('Helvetica-Bold');
  doc.text('Balance Due:', totalsX, y);
  doc.text(`₹${sale.dueAmount.toFixed(2)}`, valuesX, y, { width: totalsWidth, align: 'right' });

  // Optional UPI QR Code (Bottom Left)
  try {
    const upiPayString = buildUPIPaymentString({
      upiId: shop.upiId || 'merchant@upi',
      payeeName: shop.shopName,
      amount: sale.dueAmount > 0 ? sale.dueAmount : sale.grandTotal,
      transactionNote: `Bill ${sale.invoiceNumber}`,
      transactionRef: sale.invoiceNumber
    });
    const qrBuffer = await generateQRCodeBuffer(upiPayString);
    doc.image(qrBuffer, leftMargin, y - 50, { width: 75, height: 75 });
    doc.font('Helvetica').fontSize(7.5).fillColor('#718096');
    doc.text('Scan to Pay via UPI', leftMargin, y + 30);
  } catch {
    // If QR generation fails, skip gracefully
  }

  // Footer / Thank You Note
  const footerY = 750;
  doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(leftMargin, footerY).lineTo(rightMargin, footerY).stroke();
  doc.font('Helvetica-Oblique').fontSize(9).fillColor('#718096');
  doc.text('Thank you for shopping with us! Please retain this invoice for warranty and returns.', leftMargin, footerY + 8, {
    align: 'center',
    width: usableWidth
  });

  return doc;
};

export default createInvoicePdf;
