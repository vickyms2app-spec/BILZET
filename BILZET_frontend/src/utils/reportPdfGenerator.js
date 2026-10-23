import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { BILZET_LOGO_DARK_BASE64, BILZET_LOGO_ASPECT_RATIO } from "./bilzetLogoData.js";

/**
 * Format currency into readable Indian Rupees format compatible with standard PDF fonts.
 * Uses "Rs." prefix to ensure 100% compatibility across all PDF rendering engines.
 */
function formatCurrency(num) {
  const val = Number(num || 0);
  return `Rs. ${val.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format date string safely
 */
function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(dateStr);
  }
}

/**
 * Generates and downloads a high-fidelity PDF analytics report.
 *
 * @param {Object} params
 * @param {Object} params.shopSettings - Store configuration (name, address, gstin, phone, email)
 * @param {Object} params.dateRange - Selected date range object { label, displayPeriod, start, end }
 * @param {string} params.selectedPreset - Active preset key (e.g. TODAY, THIS_MONTH, CUSTOM)
 * @param {string} params.searchInvoiceQuery - Active invoice search filter
 * @param {Object} params.metrics - Financial summaries (totalRevenue, netSales, totalInvoices, etc.)
 * @param {Array} params.paymentMethodData - Array of payment distribution items
 * @param {Array} params.topProducts - Array of top selling products
 * @param {Array} params.transactions - Filtered transaction items
 */
export function generateReportsPdf({
  shopSettings = {},
  dateRange = {},
  selectedPreset = "THIS_MONTH",
  searchInvoiceQuery = "",
  metrics = {},
  paymentMethodData = [],
  topProducts = [],
  transactions = [],
}) {
  // 1. Initialize A4 Document (210 x 297 mm)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  let cursorY = 12;

  // Colors
  const primaryNavy = [15, 39, 71]; // #0F2747
  const accentBlue = [37, 99, 235]; // #2563EB
  const textDark = [15, 23, 42]; // #0F172A
  const textMuted = [100, 116, 139]; // #64748B
  const bgLight = [248, 250, 252]; // #F8FAFC
  const borderLight = [226, 232, 240]; // #E2E8F0

  const shopName = shopSettings?.shopName || "BILZET RETAIL STORE";
  const shopAddress = shopSettings?.address || "Business Premises, Commercial Plaza";
  const shopPhone = shopSettings?.phone || "";
  const shopEmail = shopSettings?.email || "";
  const shopGstin = shopSettings?.gstin || "";

  // ════════════════════════════════════════════════════════════════
  // 1. HEADER SECTION (Brand Logo, Store Info & Report Title)
  // ════════════════════════════════════════════════════════════════
  // Top Decorative Accent Bar
  doc.setFillColor(...primaryNavy);
  doc.rect(0, 0, pageWidth, 4, "F");

  // 1. Bilzet Official Logo (Top-Left, Proportional Scaling)
  const logoHeight = 11; // mm
  const logoWidth = Number((logoHeight * BILZET_LOGO_ASPECT_RATIO).toFixed(2)); // ~38.16 mm
  const logoX = marginX;
  const logoY = cursorY;

  try {
    doc.addImage(BILZET_LOGO_DARK_BASE64, "PNG", logoX, logoY, logoWidth, logoHeight, undefined, "FAST");
  } catch (err) {
    console.warn("PDF Logo render fallback:", err);
  }

  // 2. Store Identity Block (Left section, aligned to the right of the logo)
  const storeSpacing = 6;
  const storeBlockX = logoX + logoWidth + storeSpacing;
  const rightMarginX = pageWidth - marginX;

  // Store Name
  doc.setTextColor(...primaryNavy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(shopName, storeBlockX, cursorY + 4.2, { maxWidth: 78 });

  // Subtitle (Aligned to the EXACT same left edge as store name)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...textMuted);
  doc.text(shopAddress, storeBlockX, cursorY + 8.8, { maxWidth: 78 });

  // Store Contact Sub-line (if contact details exist)
  const contactParts = [];
  if (shopPhone) contactParts.push(`Phone: ${shopPhone}`);
  if (shopEmail) contactParts.push(`Email: ${shopEmail}`);
  if (shopGstin) contactParts.push(`GSTIN: ${shopGstin}`);

  if (contactParts.length > 0) {
    doc.setFontSize(7.5);
    doc.setTextColor(...textMuted);
    doc.text(contactParts.join("  |  "), storeBlockX, cursorY + 12.8, { maxWidth: 78 });
  }

  // 3. Right Section: EXECUTIVE ANALYTICS REPORT (Right edge aligned)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...primaryNavy);
  doc.text("EXECUTIVE ANALYTICS REPORT", rightMarginX, cursorY + 4.2, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...textMuted);
  doc.text("Official Financial Ledger Audit", rightMarginX, cursorY + 8.8, { align: "right" });
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`,
    rightMarginX,
    cursorY + 12.8,
    { align: "right" }
  );

  // 4. Subtle Horizontal Divider below the Header (aligned with table edges)
  const headerBottomY = cursorY + Math.max(logoHeight, contactParts.length > 0 ? 14 : 10) + 3;
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.4);
  doc.line(marginX, headerBottomY, rightMarginX, headerBottomY);

  cursorY = headerBottomY + 4.5;

  // 5. Reporting Period & Filter Metadata Bar
  doc.setFillColor(...bgLight);
  doc.roundedRect(marginX, cursorY, pageWidth - marginX * 2, 9, 1.5, 1.5, "F");
  doc.setDrawColor(...borderLight);
  doc.roundedRect(marginX, cursorY, pageWidth - marginX * 2, 9, 1.5, 1.5, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryNavy);
  const periodText = `Period: ${dateRange.label || "Selected Range"} (${dateRange.displayPeriod || "N/A"})`;
  doc.text(periodText, marginX + 3.5, cursorY + 5.8);

  const filterText = searchInvoiceQuery
    ? `Filter: Matching "${searchInvoiceQuery}"`
    : "Filter: All Recorded Transactions";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...textMuted);
  doc.text(filterText, rightMarginX - 3.5, cursorY + 5.8, { align: "right" });

  cursorY += 13.5;

  // ════════════════════════════════════════════════════════════════
  // 2. EXECUTIVE FINANCIAL SUMMARY (2 x 4 KPI Grid)
  // ════════════════════════════════════════════════════════════════
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...primaryNavy);
  doc.text("1. Executive Financial Summary", marginX, cursorY);
  cursorY += 3;

  const totalRevenue = Number(metrics.totalRevenue || 0);
  const totalInvoices = Number(metrics.totalInvoices || 0);
  const calculatedNetProfit = Number(metrics.calculatedNetProfit || 0);
  const grossMargin = Number(metrics.grossMargin || 0);
  const averageOrderValue = Number(metrics.averageOrderValue || 0);
  const totalTaxes = Number(metrics.totalTaxes || 0);
  const totalCollected = Number(metrics.totalCollected || 0);
  const totalPending = Number(metrics.totalPending || 0);

  const kpiTableData = [
    [
      { content: "Gross Sales Revenue\n" + formatCurrency(totalRevenue), styles: { fontStyle: "bold", halign: "center" } },
      { content: "Bills Generated\n" + `${totalInvoices} Invoices`, styles: { fontStyle: "bold", halign: "center" } },
      { content: "Estimated Net Profit\n" + formatCurrency(calculatedNetProfit), styles: { fontStyle: "bold", halign: "center", textColor: [16, 120, 70] } },
      { content: "Profit Margin\n" + `${grossMargin}% Margin`, styles: { fontStyle: "bold", halign: "center", textColor: [37, 99, 235] } },
    ],
    [
      { content: `Average Bill Value: ${formatCurrency(averageOrderValue)}`, styles: { halign: "center", fontSize: 8 } },
      { content: `Taxes / GST: ${formatCurrency(totalTaxes)}`, styles: { halign: "center", fontSize: 8 } },
      { content: `Collected: ${formatCurrency(totalCollected)}`, styles: { halign: "center", fontSize: 8, textColor: [16, 120, 70] } },
      { content: `Pending Dues: ${formatCurrency(totalPending)}`, styles: { halign: "center", fontSize: 8, textColor: [180, 83, 9] } },
    ],
  ];

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    body: kpiTableData,
    theme: "grid",
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      textColor: textDark,
      lineColor: borderLight,
      lineWidth: 0.25,
    },
    alternateRowStyles: {
      fillColor: bgLight,
    },
  });

  cursorY = doc.lastAutoTable.finalY + 8;

  // ════════════════════════════════════════════════════════════════
  // 3. PAYMENT METHOD DISTRIBUTION TABLE
  // ════════════════════════════════════════════════════════════════
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...primaryNavy);
  doc.text("2. Payment Tender Collections", marginX, cursorY);
  cursorY += 3;

  const paymentRows = (paymentMethodData || []).map((pm) => [
    pm.name || "Other",
    `${pm.count || 0} bills`,
    formatCurrency(pm.value || 0),
    `${pm.percentage || 0}%`,
  ]);

  if (paymentRows.length === 0) {
    paymentRows.push(["No payment distribution recorded for this period", "-", "-", "-"]);
  }

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    head: [["Payment Mode", "Transactions Count", "Collected Amount", "Share of Sales"]],
    body: paymentRows,
    theme: "striped",
    headStyles: {
      fillColor: primaryNavy,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: 2.5,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: textDark,
      lineColor: borderLight,
      lineWidth: 0.15,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 55 },
      1: { halign: "center", cellWidth: 40 },
      2: { halign: "right", cellWidth: 50 },
      3: { halign: "right" },
    },
  });

  cursorY = doc.lastAutoTable.finalY + 8;

  // ════════════════════════════════════════════════════════════════
  // 4. TOP PERFORMING PRODUCTS
  // ════════════════════════════════════════════════════════════════
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...primaryNavy);
  doc.text("3. Top Performing Products", marginX, cursorY);
  cursorY += 3;

  const productRows = (topProducts || []).slice(0, 10).map((p, idx) => [
    `#${idx + 1}`,
    p.name || "Product",
    `${p.quantity || 0} units`,
    formatCurrency(p.revenue || 0),
  ]);

  if (productRows.length === 0) {
    productRows.push(["-", "No product sales data recorded for this period", "-", "-"]);
  }

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    head: [["Rank", "Product Name", "Units Sold", "Total Turnover"]],
    body: productRows,
    theme: "striped",
    headStyles: {
      fillColor: primaryNavy,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: 2.5,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: textDark,
      lineColor: borderLight,
      lineWidth: 0.15,
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 16, fontStyle: "bold" },
      1: { fontStyle: "normal" },
      2: { halign: "center", cellWidth: 35 },
      3: { halign: "right", cellWidth: 45, fontStyle: "bold" },
    },
  });

  cursorY = doc.lastAutoTable.finalY + 8;

  // ════════════════════════════════════════════════════════════════
  // 5. DETAILED TRANSACTION AUDIT TABLE (Multi-page auto-continuation)
  // ════════════════════════════════════════════════════════════════
  // Check if we need to start on a fresh page if space is low
  if (cursorY > pageHeight - 50) {
    doc.addPage();
    cursorY = 16;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...primaryNavy);
  doc.text(`4. Period Transaction Audit Log (${transactions.length} Records)`, marginX, cursorY);
  cursorY += 3;

  const transactionRows = (transactions || []).map((t) => {
    const invNo = t.invoiceNumber || t.id?.slice(-8) || "INV";
    const dateFormatted = formatDate(t.createdAt || t.date);
    const custName = t.customer?.name || "Walk-in";
    const mode = t.paymentMethod || "CASH";
    const status = t.paymentStatus || "PAID";
    const itemsCount = Array.isArray(t.items) ? t.items.length : 1;
    const taxAmt = formatCurrency(t.taxTotal || 0);
    const grandTotalAmt = formatCurrency(t.grandTotal || 0);

    return [invNo, dateFormatted, custName, mode, status, `${itemsCount}`, taxAmt, grandTotalAmt];
  });

  if (transactionRows.length === 0) {
    transactionRows.push(["-", "No transactions found matching criteria", "-", "-", "-", "-", "-", "-"]);
  }

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX, bottom: 20 },
    head: [["Invoice #", "Date & Time", "Customer", "Mode", "Status", "Items", "Tax", "Grand Total"]],
    body: transactionRows,
    theme: "striped",
    showHead: "everyPage",
    headStyles: {
      fillColor: primaryNavy,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      cellPadding: 2.2,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: textDark,
      lineColor: borderLight,
      lineWidth: 0.15,
      overflow: "linebreak",
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 26 },
      1: { cellWidth: 32 },
      2: { cellWidth: 35 },
      3: { halign: "center", cellWidth: 16 },
      4: { halign: "center", cellWidth: 16 },
      5: { halign: "center", cellWidth: 12 },
      6: { halign: "right", cellWidth: 20 },
      7: { halign: "right", fontStyle: "bold" },
    },
  });

  // ════════════════════════════════════════════════════════════════
  // 6. FINAL SIGN-OFF & PAGE NUMBERING ON ALL PAGES
  // ════════════════════════════════════════════════════════════════
  const totalPages = doc.internal.getNumberOfPages();

  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);

    // Footer divider line
    doc.setDrawColor(...borderLight);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

    // Footer left: Verification note
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...textMuted);
    doc.text(
      "BILZET Retail Business Management System  |  Confidential Financial Audit Document",
      marginX,
      pageHeight - 7.5
    );

    // Footer right: Page number
    doc.text(`Page ${page} of ${totalPages}`, pageWidth - marginX, pageHeight - 7.5, { align: "right" });
  }

  // ════════════════════════════════════════════════════════════════
  // 7. GENERATE DYNAMIC FILENAME & SAVE FILE
  // ════════════════════════════════════════════════════════════════
  const todayStr = new Date().toISOString().split("T")[0];
  let fileName = `Reports_Analytics_${todayStr}.pdf`;

  if (selectedPreset === "CUSTOM" && dateRange.start && dateRange.end) {
    const sStr = new Date(dateRange.start).toISOString().split("T")[0];
    const eStr = new Date(dateRange.end).toISOString().split("T")[0];
    fileName = `Sales_Report_${sStr}_to_${eStr}.pdf`;
  } else if (selectedPreset) {
    const safePreset = selectedPreset.toLowerCase().replace(/[^a-z0-9]/g, "_");
    fileName = `Reports_Analytics_${safePreset}_${todayStr}.pdf`;
  }

  // Directly download the PDF file to user device
  if (typeof window !== "undefined" && typeof doc.save === "function") {
    doc.save(fileName);
  } else if (typeof doc.save === "function") {
    try {
      doc.save(fileName);
    } catch (_) {
      // Safe fallback in Node.js test environment
    }
  }
  return fileName;
}
