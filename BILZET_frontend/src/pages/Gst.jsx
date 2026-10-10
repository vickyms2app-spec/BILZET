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
  Search
} from "lucide-react";
import { reportsApi, settingsApi } from "../api";

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
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
      JSON.stringify(
        {
          gstin: shopSettings?.gstin || "UNREGISTERED",
          fp: new Date().toISOString().slice(0, 7).replace("-", ""),
          b2b: gstData.invoices
            .filter((inv) => inv.customer?.gstin)
            .map((inv) => ({
              ctin: inv.customer.gstin,
              inv: [
                {
                  inum: inv.invoiceNumber,
                  idt: new Date(inv.createdAt).toISOString().slice(0, 10),
                  val: Number(inv.grandTotal || 0),
                  pos: shopSettings?.stateCode || "33",
                  rchrg: "N",
                  inv_typ: "R",
                  itms: (inv.items || []).map((it, idx) => ({
                    num: idx + 1,
                    itm_det: {
                      txval: Number(it.subtotal || 0),
                      rt: Number(it.taxRate || 18),
                      camt: Number(it.taxTotal || 0) / 2,
                      samt: Number(it.taxTotal || 0) / 2,
                      csamt: 0,
                    },
                  })),
                },
              ],
            })),
          b2cs: gstData.invoices
            .filter((inv) => !inv.customer?.gstin)
            .map((inv) => ({
              sply_ty: "INTER",
              pos: shopSettings?.stateCode || "33",
              typ: "OE",
              txval: Number(inv.subtotal || 0),
              rt: 18,
              camt: Number(inv.taxTotal || 0) / 2,
              samt: Number(inv.taxTotal || 0) / 2,
            })),
        },
        null,
        2
      )
    );
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `GSTR1_${shopSettings?.gstin || "BILZET"}_${new Date().toISOString().slice(0, 7)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
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
              Sales, B2B invoices, and B2C retail orders formatted for direct JSON upload to the GST portal.
            </p>
          </div>
          <button
            onClick={handleDownloadGstr1Json}
            className="mt-5 btn-secondary text-xs font-semibold w-full justify-between"
          >
            <span>Download GSTR-1 JSON</span>
            <Download size={13} />
          </button>
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
