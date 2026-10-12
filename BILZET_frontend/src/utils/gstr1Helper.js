import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Format currency into Indian Rupees format for PDF (uses "Rs." for 100% font compatibility).
 */
function formatCurrency(num) {
  const val = Number(num || 0);
  return `Rs. ${val.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Helper to round to 2 decimal places.
 */
function round2(num) {
  return Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;
}

/**
 * Extract 2-digit state code from GSTIN or fallback.
 */
export function getStateCode(gstin, fallback = "33") {
  if (gstin && typeof gstin === "string" && gstin.trim().length >= 2) {
    const code = gstin.trim().slice(0, 2);
    if (/^\d{2}$/.test(code)) return code;
  }
  return fallback;
}

/**
 * Transforms raw sales and credit notes into standard GSTR-1 structures.
 */
export function buildGstr1Data({ invoices = [], creditNotes = [], shopSettings = {}, period = null }) {
  const shopGstin = (shopSettings?.gstin || "").trim().toUpperCase() || "UNREGISTERED";
  const shopStateCode = getStateCode(shopGstin, shopSettings?.stateCode || "33");
  const now = new Date();
  const returnPeriod =
    period || `${String(now.getMonth() + 1).padStart(2, "0")}${now.getFullYear()}`; // MMYYYY

  // 1. Group B2B by recipient GSTIN (ctin)
  const b2bMap = new Map();
  // 2. Group B2CL (Interstate unregistered with invoice value > 2,50,000)
  const b2clMap = new Map();
  // 3. Group B2CS aggregated by { sply_ty, pos, typ, rt }
  const b2csMap = new Map();
  // 4. Group HSN summary (Table 12)
  const hsnMap = new Map();

  let totalTaxable = 0;
  let totalIgst = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalCess = 0;
  let totalInvoiceVal = 0;

  let b2bCount = 0;
  let b2clCount = 0;
  let b2csCount = 0;

  let firstInum = "";
  let lastInum = "";

  const sortedInvoices = [...invoices].sort(
    (a, b) => new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date)
  );

  sortedInvoices.forEach((inv, index) => {
    const inum = inv.invoiceNumber || `INV-${index + 1}`;
    if (!firstInum) firstInum = inum;
    lastInum = inum;

    const idtRaw = inv.createdAt || inv.date || new Date().toISOString();
    const d = new Date(idtRaw);
    const idt = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;

    const grandVal = round2(inv.grandTotal || inv.totalAmount || inv.total || 0);
    const customerGstin = (inv.customer?.gstin || "").trim().toUpperCase();
    const isB2B = customerGstin.length >= 10;
    const recipientStateCode = getStateCode(customerGstin, inv.customer?.stateCode || shopStateCode);
    const isInterstate = recipientStateCode !== shopStateCode;

    totalInvoiceVal = round2(totalInvoiceVal + grandVal);

    // Group items of this invoice by tax rate
    const rateGroupMap = new Map();
    const items = Array.isArray(inv.items) ? inv.items : [];

    if (items.length === 0) {
      // Single fallback item if items array empty
      const sub = round2(inv.subtotal || grandVal / 1.18);
      const tax = round2(grandVal - sub);
      const rt = 18;
      rateGroupMap.set(rt, {
        rt,
        txval: sub,
        iamt: isInterstate ? tax : 0,
        camt: isInterstate ? 0 : round2(tax / 2),
        samt: isInterstate ? 0 : round2(tax / 2),
        csamt: 0,
      });

      // HSN fallback
      const hsnKey = `9983_${rt}`;
      if (!hsnMap.has(hsnKey)) {
        hsnMap.set(hsnKey, {
          hsn_sc: "9983",
          desc: "Services / General Goods",
          uqc: "OTH",
          qty: 1,
          val: grandVal,
          txval: sub,
          iamt: isInterstate ? tax : 0,
          camt: isInterstate ? 0 : round2(tax / 2),
          samt: isInterstate ? 0 : round2(tax / 2),
          csamt: 0,
        });
      } else {
        const h = hsnMap.get(hsnKey);
        h.qty += 1;
        h.val = round2(h.val + grandVal);
        h.txval = round2(h.txval + sub);
        h.iamt = round2(h.iamt + (isInterstate ? tax : 0));
        h.camt = round2(h.camt + (isInterstate ? 0 : tax / 2));
        h.samt = round2(h.samt + (isInterstate ? 0 : tax / 2));
      }

      totalTaxable = round2(totalTaxable + sub);
      if (isInterstate) {
        totalIgst = round2(totalIgst + tax);
      } else {
        totalCgst = round2(totalCgst + tax / 2);
        totalSgst = round2(totalSgst + tax / 2);
      }
    } else {
      items.forEach((it) => {
        const qty = Number(it.quantity || 1);
        const sub = round2(it.subtotal || it.taxableAmount || (Number(it.unitPrice || 0) * qty));
        const rt = Number(it.taxRate ?? it.gstRate ?? (it.taxTotal ? round2((it.taxTotal / sub) * 100) : 18));
        const taxTotal = round2(it.taxTotal ?? it.tax ?? (sub * rt) / 100);

        const iamt = isInterstate ? taxTotal : 0;
        const camt = isInterstate ? 0 : round2(taxTotal / 2);
        const samt = isInterstate ? 0 : round2(taxTotal / 2);

        if (!rateGroupMap.has(rt)) {
          rateGroupMap.set(rt, {
            rt,
            txval: sub,
            iamt,
            camt,
            samt,
            csamt: 0,
          });
        } else {
          const rg = rateGroupMap.get(rt);
          rg.txval = round2(rg.txval + sub);
          rg.iamt = round2(rg.iamt + iamt);
          rg.camt = round2(rg.camt + camt);
          rg.samt = round2(rg.samt + samt);
        }

        totalTaxable = round2(totalTaxable + sub);
        totalIgst = round2(totalIgst + iamt);
        totalCgst = round2(totalCgst + camt);
        totalSgst = round2(totalSgst + samt);

        // HSN Table 12
        const hsnCode = (it.product?.hsnCode || it.hsnCode || "8471").trim();
        const desc = (it.product?.name || it.name || "Goods").trim();
        const hsnKey = `${hsnCode}_${rt}`;
        const itemVal = round2(sub + taxTotal);

        if (!hsnMap.has(hsnKey)) {
          hsnMap.set(hsnKey, {
            hsn_sc: hsnCode,
            desc,
            uqc: "NOS",
            qty,
            val: itemVal,
            txval: sub,
            iamt,
            camt,
            samt,
            csamt: 0,
          });
        } else {
          const h = hsnMap.get(hsnKey);
          h.qty += qty;
          h.val = round2(h.val + itemVal);
          h.txval = round2(h.txval + sub);
          h.iamt = round2(h.iamt + iamt);
          h.camt = round2(h.camt + camt);
          h.samt = round2(h.samt + samt);
        }
      });
    }

    const itms = Array.from(rateGroupMap.values()).map((rg, idx) => ({
      num: idx + 1,
      itm_det: rg,
    }));

    if (isB2B) {
      b2bCount += 1;
      if (!b2bMap.has(customerGstin)) {
        b2bMap.set(customerGstin, {
          ctin: customerGstin,
          inv: [],
        });
      }
      b2bMap.get(customerGstin).inv.push({
        inum,
        idt,
        val: grandVal,
        pos: recipientStateCode,
        rchrg: "N",
        inv_typ: "R",
        itms,
      });
    } else if (isInterstate && grandVal > 250000) {
      // Table 5: B2CL
      b2clCount += 1;
      if (!b2clMap.has(recipientStateCode)) {
        b2clMap.set(recipientStateCode, {
          pos: recipientStateCode,
          inv: [],
        });
      }
      b2clMap.get(recipientStateCode).inv.push({
        inum,
        idt,
        val: grandVal,
        itms,
      });
    } else {
      // Table 7: B2CS (Aggregated by Supply Type, POS, Rate)
      b2csCount += 1;
      const sply_ty = isInterstate ? "INTER" : "INTRA";
      rateGroupMap.forEach((rg) => {
        const b2csKey = `${sply_ty}_${recipientStateCode}_${rg.rt}`;
        if (!b2csMap.has(b2csKey)) {
          b2csMap.set(b2csKey, {
            sply_ty,
            pos: recipientStateCode,
            typ: "OE",
            rt: rg.rt,
            txval: rg.txval,
            iamt: rg.iamt,
            camt: rg.camt,
            samt: rg.samt,
            csamt: 0,
          });
        } else {
          const entry = b2csMap.get(b2csKey);
          entry.txval = round2(entry.txval + rg.txval);
          entry.iamt = round2(entry.iamt + rg.iamt);
          entry.camt = round2(entry.camt + rg.camt);
          entry.samt = round2(entry.samt + rg.samt);
        }
      });
    }
  });

  // Table 12 HSN Summary formatted array
  const hsnData = Array.from(hsnMap.values()).map((h, idx) => ({
    num: idx + 1,
    ...h,
  }));

  // Table 13 Documents Issued
  const docIssue = {
    doc_det: [
      {
        doc_num: 1,
        doc_typ: "Invoices for outward supply",
        docs: [
          {
            num: 1,
            from: firstInum || "INV-0001",
            to: lastInum || "INV-0001",
            tot_cnt: invoices.length || 1,
            canc: 0,
            net_issue: invoices.length || 1,
          },
        ],
      },
    ],
  };

  const b2bArray = Array.from(b2bMap.values());
  const b2clArray = Array.from(b2clMap.values());
  const b2csArray = Array.from(b2csMap.values());

  const totalTax = round2(totalIgst + totalCgst + totalSgst + totalCess);

  return {
    schema: {
      gstin: shopGstin,
      fp: returnPeriod,
      version: "GSTR1_v2.0",
      hash: "hash_bilzet_auto",
      b2b: b2bArray,
      b2cl: b2clArray,
      b2cs: b2csArray,
      cdnr: [],
      cdnur: [],
      nil: {
        inv: [
          {
            nil_amt: 0,
            expt_amt: 0,
            ngsup_amt: 0,
            sply_ty: "INTRA",
          },
        ],
      },
      hsn: {
        data: hsnData,
      },
      doc_issue: docIssue,
    },
    metrics: {
      totalInvoices: invoices.length,
      totalTaxable,
      totalIgst,
      totalCgst,
      totalSgst,
      totalCess,
      totalTax,
      grandTotal: totalInvoiceVal,
      b2bCount,
      b2clCount,
      b2csCount,
      hsnCount: hsnData.length,
    },
  };
}

/**
 * Download standard GSTR-1 JSON file.
 */
export function downloadGstr1Json({ invoices = [], creditNotes = [], shopSettings = {}, period = null }) {
  const { schema, metrics } = buildGstr1Data({ invoices, creditNotes, shopSettings, period });
  const gstinClean = (schema.gstin || "BILZET").replace(/[^a-zA-Z0-9]/g, "");
  const filename = `GSTR1_${gstinClean}_${schema.fp}.json`;

  const jsonString = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(schema, null, 2));
  const link = document.createElement("a");
  link.setAttribute("href", jsonString);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();

  return { filename, metrics };
}

/**
 * Generate and download an executive Form GSTR-1 Summary PDF Report.
 */
export function generateGstr1Pdf({ invoices = [], creditNotes = [], shopSettings = {}, period = null }) {
  const { schema, metrics } = buildGstr1Data({ invoices, creditNotes, shopSettings, period });

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

  // Colors
  const primaryNavy = [15, 39, 71]; // #0F2747
  const accentBlue = [37, 99, 235]; // #2563EB
  const textDark = [15, 23, 42]; // #0F172A
  const textMuted = [100, 116, 139]; // #64748B
  const borderLight = [226, 232, 240]; // #E2E8F0

  const shopName = shopSettings?.shopName || "BILZET RETAIL STORE";
  const tradeName = shopSettings?.ownerName || shopName;
  const shopGstin = schema.gstin || "UNREGISTERED";
  const shopState = shopSettings?.state || "Tamil Nadu";
  const filingPeriod = schema.fp;

  // 1. Top Decorative Bar
  doc.setFillColor(...primaryNavy);
  doc.rect(0, 0, pageWidth, 5, "F");

  // 2. Title & Form Badge
  doc.setFillColor(...accentBlue);
  doc.roundedRect(marginX, cursorY, 28, 7, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("FORM GSTR-1", marginX + 3.5, cursorY + 4.8);

  cursorY += 12;

  // Header Title
  doc.setTextColor(...textDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Details of Outward Supplies of Goods or Services", marginX, cursorY);

  cursorY += 5;
  doc.setTextColor(...textMuted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Statutory Outward Tax Summary & Return Pack &middot; Goods and Services Tax Act, 2017`,
    marginX,
    cursorY
  );

  cursorY += 8;

  // 3. Business Profile Summary Box
  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    theme: "plain",
    body: [
      [
        { content: "1. Legal Name of Business:", styles: { fontStyle: "bold", textColor: textDark, cellWidth: 50 } },
        { content: shopName, styles: { textColor: textDark } },
        { content: "Return Period (F.P.):", styles: { fontStyle: "bold", textColor: textDark, cellWidth: 40 } },
        { content: filingPeriod, styles: { fontStyle: "bold", textColor: accentBlue } },
      ],
      [
        { content: "2. Trade Name:", styles: { fontStyle: "bold", textColor: textDark } },
        { content: tradeName, styles: { textColor: textDark } },
        { content: "State Jurisdiction:", styles: { fontStyle: "bold", textColor: textDark } },
        { content: `${shopState} (${schema.b2b[0]?.inv[0]?.pos || "33"})`, styles: { textColor: textDark } },
      ],
      [
        { content: "3. GSTIN of Taxpayer:", styles: { fontStyle: "bold", textColor: textDark } },
        { content: shopGstin, styles: { fontStyle: "bold", textColor: primaryNavy } },
        { content: "Filing Generation Date:", styles: { fontStyle: "bold", textColor: textDark } },
        { content: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), styles: { textColor: textDark } },
      ],
    ],
    styles: {
      fontSize: 8.5,
      cellPadding: 2,
      lineColor: borderLight,
      lineWidth: 0.2,
    },
  });

  cursorY = doc.lastAutoTable.finalY + 8;

  // 4. Executive Summary KPI Grid (Table Totals)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...primaryNavy);
  doc.text("Executive Summary: Outward Tax Liability & Turnover", marginX, cursorY);

  cursorY += 4;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    head: [
      [
        "Metric / Classification",
        "Total Count",
        "Taxable Value",
        "Central Tax (CGST)",
        "State Tax (SGST)",
        "Integrated Tax (IGST)",
        "Total Tax Liability",
      ],
    ],
    body: [
      [
        "4A, 4B. B2B Invoices (Registered)",
        String(metrics.b2bCount),
        formatCurrency(schema.b2b.reduce((acc, c) => acc + c.inv.reduce((ia, i) => ia + i.itms.reduce((ta, t) => ta + t.itm_det.txval, 0), 0), 0)),
        formatCurrency(schema.b2b.reduce((acc, c) => acc + c.inv.reduce((ia, i) => ia + i.itms.reduce((ta, t) => ta + t.itm_det.camt, 0), 0), 0)),
        formatCurrency(schema.b2b.reduce((acc, c) => acc + c.inv.reduce((ia, i) => ia + i.itms.reduce((ta, t) => ta + t.itm_det.samt, 0), 0), 0)),
        formatCurrency(schema.b2b.reduce((acc, c) => acc + c.inv.reduce((ia, i) => ia + i.itms.reduce((ta, t) => ta + t.itm_det.iamt, 0), 0), 0)),
        formatCurrency(
          schema.b2b.reduce((acc, c) => acc + c.inv.reduce((ia, i) => ia + i.itms.reduce((ta, t) => ta + t.itm_det.camt + t.itm_det.samt + t.itm_det.iamt, 0), 0), 0)
        ),
      ],
      [
        "5A. B2C Large (> Rs. 2.5 Lakh)",
        String(metrics.b2clCount),
        formatCurrency(schema.b2cl.reduce((acc, c) => acc + c.inv.reduce((ia, i) => ia + i.itms.reduce((ta, t) => ta + t.itm_det.txval, 0), 0), 0)),
        "Rs. 0.00",
        "Rs. 0.00",
        formatCurrency(schema.b2cl.reduce((acc, c) => acc + c.inv.reduce((ia, i) => ia + i.itms.reduce((ta, t) => ta + t.itm_det.iamt, 0), 0), 0)),
        formatCurrency(schema.b2cl.reduce((acc, c) => acc + c.inv.reduce((ia, i) => ia + i.itms.reduce((ta, t) => ta + t.itm_det.iamt, 0), 0), 0)),
      ],
      [
        "7. B2C Small Supplies (Retail)",
        String(metrics.b2csCount),
        formatCurrency(schema.b2cs.reduce((acc, c) => acc + c.txval, 0)),
        formatCurrency(schema.b2cs.reduce((acc, c) => acc + c.camt, 0)),
        formatCurrency(schema.b2cs.reduce((acc, c) => acc + c.samt, 0)),
        formatCurrency(schema.b2cs.reduce((acc, c) => acc + c.iamt, 0)),
        formatCurrency(schema.b2cs.reduce((acc, c) => acc + c.camt + c.samt + c.iamt, 0)),
      ],
      [
        "8. Nil Rated & Exempted Supplies",
        "0",
        "Rs. 0.00",
        "Rs. 0.00",
        "Rs. 0.00",
        "Rs. 0.00",
        "Rs. 0.00",
      ],
      [
        "9B. Credit / Debit Notes (CDNR)",
        "0",
        "Rs. 0.00",
        "Rs. 0.00",
        "Rs. 0.00",
        "Rs. 0.00",
        "Rs. 0.00",
      ],
      [
        { content: "GRAND TOTAL SUMMARY", styles: { fontStyle: "bold", fillColor: [241, 245, 249] } },
        { content: String(metrics.totalInvoices), styles: { fontStyle: "bold", fillColor: [241, 245, 249] } },
        { content: formatCurrency(metrics.totalTaxable), styles: { fontStyle: "bold", fillColor: [241, 245, 249] } },
        { content: formatCurrency(metrics.totalCgst), styles: { fontStyle: "bold", fillColor: [241, 245, 249] } },
        { content: formatCurrency(metrics.totalSgst), styles: { fontStyle: "bold", fillColor: [241, 245, 249] } },
        { content: formatCurrency(metrics.totalIgst), styles: { fontStyle: "bold", fillColor: [241, 245, 249] } },
        { content: formatCurrency(metrics.totalTax), styles: { fontStyle: "bold", textColor: accentBlue, fillColor: [241, 245, 249] } },
      ],
    ],
    headStyles: {
      fillColor: primaryNavy,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      lineColor: borderLight,
      lineWidth: 0.2,
    },
  });

  cursorY = doc.lastAutoTable.finalY + 8;

  // 5. Table 4: B2B Invoices Detailed Schedule
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryNavy);
  doc.text("Table 4: Taxable Outward Supplies Made to Registered Persons (B2B)", marginX, cursorY);

  cursorY += 3.5;

  const b2bRows = [];
  schema.b2b.forEach((customer) => {
    customer.inv.forEach((inv) => {
      inv.itms.forEach((it) => {
        b2bRows.push([
          customer.ctin,
          inv.inum,
          inv.idt,
          formatCurrency(inv.val),
          inv.pos,
          inv.rchrg,
          `${it.itm_det.rt}%`,
          formatCurrency(it.itm_det.txval),
          formatCurrency(it.itm_det.iamt),
          formatCurrency(it.itm_det.camt),
          formatCurrency(it.itm_det.samt),
        ]);
      });
    });
  });

  if (b2bRows.length === 0) {
    b2bRows.push([
      { content: "No B2B invoices recorded in this tax period (All supplies were consumer retail).", colSpan: 11, styles: { halign: "center", textColor: textMuted } },
    ]);
  }

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    head: [
      [
        "GSTIN",
        "Invoice #",
        "Date",
        "Invoice Val",
        "POS",
        "RCM",
        "Rate",
        "Taxable",
        "IGST",
        "CGST",
        "SGST",
      ],
    ],
    body: b2bRows,
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      lineColor: borderLight,
      lineWidth: 0.2,
    },
  });

  cursorY = doc.lastAutoTable.finalY + 8;

  // Check if we need page break for HSN
  if (cursorY > pageHeight - 65) {
    doc.addPage();
    cursorY = 16;
  }

  // 6. Table 12: HSN-wise Summary of Outward Supplies
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryNavy);
  doc.text("Table 12: HSN-wise Summary of Outward Supplies", marginX, cursorY);

  cursorY += 3.5;

  const hsnRows = schema.hsn.data.map((h) => [
    h.hsn_sc,
    h.desc.length > 25 ? `${h.desc.slice(0, 22)}...` : h.desc,
    h.uqc,
    String(h.qty),
    formatCurrency(h.val),
    formatCurrency(h.txval),
    formatCurrency(h.iamt),
    formatCurrency(h.camt),
    formatCurrency(h.samt),
  ]);

  if (hsnRows.length === 0) {
    hsnRows.push([
      { content: "No HSN summarized records available.", colSpan: 9, styles: { halign: "center", textColor: textMuted } },
    ]);
  }

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    head: [
      [
        "HSN / SAC",
        "Description",
        "UQC",
        "Total Qty",
        "Total Value",
        "Taxable Value",
        "Integrated Tax",
        "Central Tax",
        "State Tax",
      ],
    ],
    body: hsnRows,
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      lineColor: borderLight,
      lineWidth: 0.2,
    },
  });

  cursorY = doc.lastAutoTable.finalY + 8;

  // 7. Table 13: Documents Issued Schedule
  if (cursorY > pageHeight - 50) {
    doc.addPage();
    cursorY = 16;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryNavy);
  doc.text("Table 13: Documents Issued Summary", marginX, cursorY);

  cursorY += 3.5;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    head: [["Nature of Document", "From Series", "To Series", "Total Issued", "Cancelled", "Net Valid Issued"]],
    body: [
      [
        "Invoices for outward supply",
        schema.doc_issue.doc_det[0]?.docs[0]?.from || "INV-0001",
        schema.doc_issue.doc_det[0]?.docs[0]?.to || "INV-0001",
        String(schema.doc_issue.doc_det[0]?.docs[0]?.tot_cnt || 1),
        "0",
        String(schema.doc_issue.doc_det[0]?.docs[0]?.net_issue || 1),
      ],
    ],
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      lineColor: borderLight,
      lineWidth: 0.2,
    },
  });

  cursorY = doc.lastAutoTable.finalY + 12;

  // 8. Sign-off / Verification Declaration
  if (cursorY > pageHeight - 40) {
    doc.addPage();
    cursorY = 16;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...textMuted);
  doc.text(
    "Verification: I hereby solemnly affirm and declare that the information given hereinabove is true and correct to the best of my knowledge and belief and nothing has been concealed therefrom.",
    marginX,
    cursorY,
    { maxWidth: pageWidth - marginX * 2 }
  );

  cursorY += 12;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textDark);
  doc.text("For " + shopName.toUpperCase(), marginX, cursorY);
  doc.text("Authorized Signatory", pageWidth - marginX - 35, cursorY);

  // Page numbers on all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `BILZET Tax Engine &bull; Form GSTR-1 Return &bull; Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: "center" }
    );
  }

  const gstinClean = (schema.gstin || "BILZET").replace(/[^a-zA-Z0-9]/g, "");
  const filename = `GSTR1_Summary_${gstinClean}_${schema.fp}.pdf`;
  doc.save(filename);

  return { filename, metrics };
}

export default {
  getStateCode,
  buildGstr1Data,
  downloadGstr1Json,
  generateGstr1Pdf,
};
