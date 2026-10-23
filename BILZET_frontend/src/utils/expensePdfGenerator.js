import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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
    });
  } catch {
    return String(dateStr);
  }
}

/**
 * Generates and downloads a high-fidelity PDF report for Business Expenses.
 *
 * @param {Object} params
 * @param {Array} params.expenses - List of expense objects to export
 * @param {Object} params.shopSettings - Store configuration (shopName, address, phone, email, gstin)
 * @param {string} params.selectedCategory - Active category filter label
 * @param {string} params.searchQuery - Active search filter query
 * @param {boolean} params.autoDownload - Whether to trigger doc.save() (default true)
 * @returns {Object} { doc, fileName }
 */
export function generateExpensePdf({
  expenses = [],
  shopSettings = {},
  selectedCategory = "ALL",
  categoryLabel = "All Categories",
  searchQuery = "",
  autoDownload = true,
}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  let cursorY = 16;

  // Brand Palette (Apple SaaS & BILZET Blue)
  const primaryNavy = [15, 23, 42]; // #0F172A
  const accentBlue = [0, 122, 255]; // #007AFF
  const textDark = [29, 29, 31]; // #1D1D1F
  const textMuted = [110, 110, 115]; // #6E6E73
  const bgLight = [245, 245, 247]; // #F5F5F7
  const borderLight = [229, 229, 234]; // #E5E5EA

  const shopName = shopSettings?.shopName || shopSettings?.name || "BILZET RETAIL STORE";
  const shopAddress = shopSettings?.address || "";
  const shopPhone = shopSettings?.phone || "";
  const shopEmail = shopSettings?.email || "";
  const shopGstin = shopSettings?.gstin || "";

  // ════════════════════════════════════════════════════════════════
  // 1. HEADER SECTION (Brand, Store Info, Report Title)
  // ════════════════════════════════════════════════════════════════
  // Top Decorative Accent Bar
  doc.setFillColor(...accentBlue);
  doc.rect(0, 0, pageWidth, 4, "F");

  // BILZET Badge
  doc.setFillColor(...accentBlue);
  doc.roundedRect(marginX, cursorY, 22, 6.5, 1.2, 1.2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("BILZET", marginX + 3.8, cursorY + 4.5);

  // Store Name
  doc.setTextColor(...primaryNavy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(shopName, marginX + 25, cursorY + 5.2);

  // Report Title Pill (Right aligned)
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...accentBlue);
  doc.text("BUSINESS EXPENSE REPORT", pageWidth - marginX, cursorY + 5.2, { align: "right" });

  cursorY += 11;

  // Store Contact Sub-line
  const contactParts = [];
  if (shopAddress) contactParts.push(shopAddress);
  if (shopPhone) contactParts.push(`Phone: ${shopPhone}`);
  if (shopEmail) contactParts.push(`Email: ${shopEmail}`);
  if (shopGstin) contactParts.push(`GSTIN: ${shopGstin}`);

  if (contactParts.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.text(contactParts.join("  |  "), marginX, cursorY, { maxWidth: pageWidth - marginX * 2 });
    cursorY += 5.5;
  }

  // Divider Line
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.3);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 4.5;

  // Metadata Bar (Report Generation Date & Active Filters)
  const now = new Date();
  const generatedAt = now.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  doc.setFillColor(...bgLight);
  doc.roundedRect(marginX, cursorY, pageWidth - marginX * 2, 9, 1.2, 1.2, "F");
  doc.setDrawColor(...borderLight);
  doc.roundedRect(marginX, cursorY, pageWidth - marginX * 2, 9, 1.2, 1.2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...textDark);
  doc.text(`Generated: ${generatedAt}`, marginX + 3, cursorY + 5.8);

  const filterParts = [];
  if (selectedCategory && selectedCategory !== "ALL") {
    filterParts.push(`Category: ${categoryLabel}`);
  }
  if (searchQuery) {
    filterParts.push(`Search: "${searchQuery}"`);
  }
  const filterSummary = filterParts.length > 0 ? filterParts.join("  •  ") : "Showing: All Matching Expenses";

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textMuted);
  doc.text(filterSummary, pageWidth - marginX - 3, cursorY + 5.8, { align: "right" });

  cursorY += 13;

  // ════════════════════════════════════════════════════════════════
  // 2. SUMMARY METRICS CARDS (4 Compact Metrics)
  // ════════════════════════════════════════════════════════════════
  const totalAmount = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalCount = expenses.length;
  const avgExpense = totalCount > 0 ? totalAmount / totalCount : 0;
  const maxExpense = expenses.reduce((max, item) => Math.max(max, Number(item.amount) || 0), 0);

  const metricBoxWidth = (pageWidth - marginX * 2 - 9) / 4;
  const metricBoxHeight = 15;

  const metricsData = [
    { label: "TOTAL EXPENDITURE", val: formatCurrency(totalAmount), sub: `${totalCount} records` },
    { label: "TOTAL ENTRIES", val: String(totalCount), sub: "Recorded payouts" },
    { label: "AVERAGE PAYOUT", val: formatCurrency(avgExpense), sub: "Per recorded entry" },
    { label: "LARGEST EXPENSE", val: formatCurrency(maxExpense), sub: "Peak single payout" },
  ];

  metricsData.forEach((m, idx) => {
    const x = marginX + idx * (metricBoxWidth + 3);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, cursorY, metricBoxWidth, metricBoxHeight, 1.2, 1.2, "F");
    doc.setDrawColor(...borderLight);
    doc.roundedRect(x, cursorY, metricBoxWidth, metricBoxHeight, 1.2, 1.2, "S");

    // Label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...textMuted);
    doc.text(m.label, x + 3, cursorY + 4.5);

    // Value
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...textDark);
    doc.text(m.val, x + 3, cursorY + 9.5);

    // Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...textMuted);
    doc.text(m.sub, x + 3, cursorY + 13);
  });

  cursorY += metricBoxHeight + 7;

  // Section Heading
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...primaryNavy);
  doc.text("ITEMIZED EXPENSE LEDGER", marginX, cursorY);

  cursorY += 3;

  // ════════════════════════════════════════════════════════════════
  // 3. EXPENSES TABLE (autoTable with repeat header & pagination)
  // ════════════════════════════════════════════════════════════════
  const tableHead = [
    ["#", "Date", "Expense Title / Payee", "Category", "Payment Method", "Remarks / Notes", "Amount"],
  ];

  const tableBody = expenses.map((item, idx) => {
    const dateFormatted = formatDate(item.date || item.createdAt);
    const title = item.title || "Expense";
    const cat = item.category ? item.category.toUpperCase().replace(/_/g, " ") : "GENERAL";
    const method = item.paymentMethod ? item.paymentMethod.toUpperCase().replace(/_/g, " ") : "CASH";
    const notes = item.description || item.note || "—";
    const amt = formatCurrency(item.amount);

    return [
      idx + 1,
      dateFormatted,
      title,
      cat,
      method,
      notes,
      amt,
    ];
  });

  // Table Footer Row for Total
  const tableFoot = [
    [
      { content: "Total Expenses", colSpan: 6, styles: { halign: "right", fontStyle: "bold" } },
      { content: formatCurrency(totalAmount), styles: { halign: "right", fontStyle: "bold" } },
    ],
  ];

  autoTable(doc, {
    startY: cursorY,
    head: tableHead,
    body: tableBody,
    foot: tableFoot,
    theme: "plain",
    showHead: "everyPage",
    margin: { left: marginX, right: marginX, bottom: 16 },
    headStyles: {
      fillColor: bgLight,
      textColor: textDark,
      fontStyle: "bold",
      fontSize: 7.5,
      cellPadding: 2.2,
      lineColor: borderLight,
      lineWidth: 0.2,
    },
    footStyles: {
      fillColor: bgLight,
      textColor: textDark,
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: 2.5,
      lineColor: borderLight,
      lineWidth: 0.2,
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
      0: { halign: "center", cellWidth: 8 },
      1: { cellWidth: 22 },
      2: { fontStyle: "bold", cellWidth: 42 },
      3: { cellWidth: 26 },
      4: { cellWidth: 24 },
      5: { cellWidth: 34 },
      6: { halign: "right", fontStyle: "bold", cellWidth: 26 },
    },
  });

  // ════════════════════════════════════════════════════════════════
  // 4. FOOTER & PAGE NUMBERING ON ALL PAGES
  // ════════════════════════════════════════════════════════════════
  const totalPages = doc.internal.getNumberOfPages();

  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);

    // Footer divider line
    doc.setDrawColor(...borderLight);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 11, pageWidth - marginX, pageHeight - 11);

    // Footer left: Verification & System note
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...textMuted);
    doc.text(
      "BILZET Business Management System  |  Official Financial Expense Report",
      marginX,
      pageHeight - 6.5
    );

    // Footer right: Page number
    doc.text(`Page ${page} of ${totalPages}`, pageWidth - marginX, pageHeight - 6.5, { align: "right" });
  }

  // ════════════════════════════════════════════════════════════════
  // 5. SAVE & DOWNLOAD FILE
  // ════════════════════════════════════════════════════════════════
  const todayDateStr = now.toISOString().split("T")[0];
  const fileName = `BILZET_Business_Expenses_${todayDateStr}.pdf`;

  if (autoDownload) {
    doc.save(fileName);
  }

  return { doc, fileName };
}
