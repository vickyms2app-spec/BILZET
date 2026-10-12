import { useState, useEffect, useMemo } from "react";
import {
  Download,
  CheckCircle,
  AlertCircle,
  FileText,
  Percent,
  ShieldCheck,
  TrendingUp,
  Table as TableIcon,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { reportsApi, settingsApi } from "../api";
import { downloadGstr1Json, generateGstr1Pdf } from "../utils/gstr1Helper";

export default function Gst() {
  const [loading, setLoading] = useState(true);
  const [gstData, setGstData] = useState({
    totalTaxable: 0,
    totalCgst: 0,
    totalSgst: 0,
    totalGst: 0,
    invoices: [],
  });
  const [shopSettings, setShopSettings] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL"); // ALL, B2B, B2C
  const [exportingJson, setExportingJson] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportFeedback, setExportFeedback] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [res, settings] = await Promise.all([
        reportsApi.gst().catch(() => null),
        settingsApi.get().catch(() => null),
      ]);
      if (res) {
        setGstData(res);
      }
      if (settings) {
        setShopSettings(settings);
      }
    } catch (e) {
      console.error("Failed to load GST data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculate readiness score
  const readiness = useMemo(() => {
    let score = 0;
    if (shopSettings?.gstin && shopSettings.gstin.length >= 15) score += 40;
    if (shopSettings?.state || shopSettings?.stateCode) score += 20;
    if (gstData?.invoices?.length > 0) score += 40;
    else score += 20; // default readiness if no invoices yet
    return Math.min(100, score);
  }, [shopSettings, gstData]);

  // Export GSTR-1 as JSON
  const handleDownloadGstr1Json = () => {
    try {
      setExportingJson(true);
      setExportFeedback(null);
      const res = downloadGstr1Json({
        invoices: gstData.invoices,
        shopSettings,
      });
      setExportFeedback({
        type: "success",
        text: `GSTR-1 JSON export generated successfully (${res.metrics.totalInvoices} invoices, taxable: ₹${res.metrics.totalTaxable.toLocaleString("en-IN")}). Saved as ${res.filename}.`,
      });
    } catch (err) {
      setExportFeedback({
        type: "error",
        text: err?.message || "Failed to generate GSTR-1 JSON export",
      });
    } finally {
      setExportingJson(false);
    }
  };

  // Export GSTR-1 as PDF
  const handleDownloadGstr1Pdf = () => {
    try {
      setExportingPdf(true);
      setExportFeedback(null);
      const res = generateGstr1Pdf({
        invoices: gstData.invoices,
        shopSettings,
      });
      setExportFeedback({
        type: "success",
        text: `Official Form GSTR-1 Summary PDF report generated successfully (${res.metrics.totalInvoices} invoices, grand total: ₹${res.metrics.grandTotal.toLocaleString("en-IN")}). Saved as ${res.filename}.`,
      });
    } catch (err) {
      setExportFeedback({
        type: "error",
        text: err?.message || "Failed to generate GSTR-1 PDF report",
      });
    } finally {
      setExportingPdf(false);
    }
  };

  // Export HSN Report CSV
  const handleExportHsnCsv = () => {
    const hsnMap = new Map();
    gstData.invoices.forEach((inv) => {
      (inv.items || []).forEach((item) => {
        const code = item.product?.hsnCode || item.hsnCode || "General";
        const desc = item.product?.name || item.name || "Item";
        const qty = Number(item.quantity || 1);
        const taxable = Number(item.subtotal || 0);
        const tax = Number(item.taxTotal || 0);

        if (!hsnMap.has(code)) {
          hsnMap.set(code, { code, desc, qty: 0, taxable: 0, tax: 0 });
        }
        const record = hsnMap.get(code);
        record.qty += qty;
        record.taxable += taxable;
        record.tax += tax;
      });
    });

    const headers = ["HSN/SAC Code,Description,UQC,Total Qty,Total Taxable Value,CGST Amount,SGST Amount,Total Tax\n"];
    const rows = Array.from(hsnMap.values()).map((h) =>
      `"${h.code}","${h.desc}","NOS",${h.qty},${h.taxable.toFixed(2)},${(h.tax / 2).toFixed(2)},${(h.tax / 2).toFixed(2)},${h.tax.toFixed(2)}`
    );

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent([headers, ...rows].join("\n"));
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `HSN_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Filter invoices for table
  const filteredInvoices = useMemo(() => {
    return (gstData.invoices || []).filter((inv) => {
      const matchSearch =
        !searchTerm ||
        inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customer?.gstin?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;
      if (filterType === "B2B") return Boolean(inv.customer?.gstin);
      if (filterType === "B2C") return !inv.customer?.gstin;
      return true;
    });
  }, [gstData.invoices, searchTerm, filterType]);

  return (
    <div className="space-y-6 pb-12 fade-up">
      {/* ══════════════════════════════════════════════════
          TOP HEADER
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 grid place-items-center shrink-0 shadow-2xs">
            <Percent size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="page-title">GST &amp; Tax Center</h1>
              <span className="badge badge-info uppercase tracking-wider">Taxation</span>
            </div>
            <p className="page-desc">
              GSTR-1, GSTR-3B summaries, HSN breakdown, and automated GST portal exports
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs cursor-pointer"
            title="Refresh Tax Data"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              readiness >= 80
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            <ShieldCheck size={14} />
            <span>Data Readiness: {readiness}/100</span>
          </span>
        </div>
      </div>

      {/* Export Feedback Notification */}
      {exportFeedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs animate-in fade-in ${
            exportFeedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {exportFeedback.type === "success" ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <XCircle size={16} className="text-rose-600 shrink-0" />
            )}
            <p className="font-medium">{exportFeedback.text}</p>
          </div>
          <button
            onClick={() => setExportFeedback(null)}
            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 border border-slate-200/80">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Taxable Sales</p>
          <p className="text-lg font-bold text-slate-900 mt-1">₹{Number(gstData.totalTaxable || 0).toLocaleString("en-IN")}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Excluding GST charges</p>
        </div>
        <div className="card p-4 border border-slate-200/80">
          <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">CGST (Central Tax)</p>
          <p className="text-lg font-bold text-slate-900 mt-1">₹{Number(gstData.totalCgst || 0).toLocaleString("en-IN")}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Central Government share</p>
        </div>
        <div className="card p-4 border border-slate-200/80">
          <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">SGST (State Tax)</p>
          <p className="text-lg font-bold text-slate-900 mt-1">₹{Number(gstData.totalSgst || 0).toLocaleString("en-IN")}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">State Government share</p>
        </div>
        <div className="card p-4 border border-slate-200/80 bg-blue-50/40">
          <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Total GST Collected</p>
          <p className="text-lg font-bold text-blue-700 mt-1">₹{Number(gstData.totalGst || 0).toLocaleString("en-IN")}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{gstData.invoices?.length || 0} Invoices generated</p>
        </div>
      </div>

      {/* 3 GST Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
        {/* GSTR-1 */}
        <div className="card p-6 flex flex-col justify-between relative overflow-hidden border border-slate-200/80 shadow-xs">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mb-4">
              <FileText size={18} />
            </div>
            <h3 className="font-bold text-slate-900">GSTR-1 Draft Pack</h3>
            <p className="text-xs text-slate-500 font-normal mt-1.5 leading-relaxed">
              Sales, B2B invoices, B2C retail orders, and HSN schedule formatted for GST portal JSON and official summary PDF.
            </p>
          </div>
          <div className="mt-5 space-y-2">
            <button
              onClick={handleDownloadGstr1Json}
              disabled={exportingJson}
              className="btn-secondary text-xs font-semibold w-full justify-between cursor-pointer disabled:opacity-50"
            >
              <span>{exportingJson ? "Generating JSON..." : "Export GSTR-1 JSON"}</span>
              {exportingJson ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
            </button>
            <button
              onClick={handleDownloadGstr1Pdf}
              disabled={exportingPdf}
              className="btn-primary text-xs font-semibold w-full justify-between cursor-pointer bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              <span>{exportingPdf ? "Generating PDF..." : "Export GSTR-1 PDF"}</span>
              {exportingPdf ? <RefreshCw size={13} className="animate-spin" /> : <FileText size={13} />}
            </button>
          </div>
        </div>

        {/* GSTR-3B */}
        <div className="card p-6 flex flex-col justify-between relative overflow-hidden border border-slate-200/80 shadow-xs">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle size={18} />
            </div>
            <h3 className="font-bold text-slate-900">GSTR-3B Summary</h3>
            <p className="text-xs text-slate-500 font-normal mt-1.5 leading-relaxed">
              Net outward tax payable, CGST &amp; SGST breakdown, and monthly filing figures.
            </p>
          </div>
          <button
            onClick={() => setShowTable(!showTable)}
            className="mt-5 btn-secondary text-xs font-semibold w-full justify-between"
          >
            <span>{showTable ? "Hide Summary Table" : "View Summary Table"}</span>
            {showTable ? <ChevronUp size={13} /> : <TableIcon size={13} />}
          </button>
        </div>

        {/* HSN Summary */}
        <div className="card p-6 flex flex-col justify-between relative overflow-hidden border border-slate-200/80 shadow-xs">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-indigo-500" />
          <div>
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 border border-violet-100 flex items-center justify-center mb-4">
              <FileText size={18} />
            </div>
            <h3 className="font-bold text-slate-900">HSN / SAC Summary</h3>
            <p className="text-xs text-slate-500 font-normal mt-1.5 leading-relaxed">
              HSN-wise invoice details, quantity totals, rate brackets, and tax breakdown.
            </p>
          </div>
          <button
            onClick={handleExportHsnCsv}
            className="mt-5 btn-secondary text-xs font-semibold w-full justify-between"
          >
            <span>Export HSN CSV</span>
            <Download size={13} />
          </button>
        </div>
      </div>

      {/* Expandable Summary Table */}
      {showTable && (
        <div className="card p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-900">GST Invoice Reconciliation</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search invoice or customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white outline-none font-medium"
              >
                <option value="ALL">All Invoices</option>
                <option value="B2B">B2B (With GSTIN)</option>
                <option value="B2C">B2C (Retail)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Taxable</th>
                  <th className="py-2.5 px-3 text-right">CGST</th>
                  <th className="py-2.5 px-3 text-right">SGST</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-400">
                      No invoices found matching criteria
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id || inv.invoiceNumber} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="py-2.5 px-3 text-slate-500">{new Date(inv.createdAt).toLocaleDateString()}</td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium">
                        {inv.customer?.name || "Retail Walk-in"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.customer?.gstin
                              ? "bg-blue-50 text-blue-700 border border-blue-200/60"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {inv.customer?.gstin ? "B2B" : "B2C"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 font-mono">
                        ₹{Number(inv.subtotal || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                        ₹{(Number(inv.taxTotal || 0) / 2).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                        ₹{(Number(inv.taxTotal || 0) / 2).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                        ₹{Number(inv.grandTotal || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
