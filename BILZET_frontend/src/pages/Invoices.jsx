import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  Printer,
  Download,
  Eye,
  Sliders,
  FileText,
  Calendar,
  IndianRupee,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { salesApi, settingsApi } from "../api";
import { mockDashboardData } from "../api/mockData";
import TaxInvoice from "../components/invoice/TaxInvoice";

export default function Invoices() {
  const nav = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [invoices, setInvoices] = useState(mockDashboardData.recentSales || []);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [shopSettings, setShopSettings] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load shop settings for invoice formatting
    const local = localStorage.getItem("bilzet_invoice_settings");
    if (local) {
      try {
        setShopSettings(JSON.parse(local));
      } catch (e) {}
    } else {
      settingsApi.get().then((res) => {
        if (res) setShopSettings(res);
      }).catch(() => {});
    }

    // Load sales invoices
    setLoading(true);
    salesApi
      .list()
      .then((res) => {
        if (res && res.sales && res.sales.length > 0) {
          setInvoices(res.sales);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer?.phone?.includes(search);

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "PAID" && (inv.status === "COMPLETED" || inv.status === "PAID" || inv.paymentStatus === "PAID" || inv.paymentStatus === "Paid")) ||
      (statusFilter === "UNPAID" && (inv.status === "UNPAID" || inv.paymentStatus === "UNPAID" || inv.paymentStatus === "Unpaid"));

    return matchesSearch && matchesStatus;
  });

  const handleOpenInvoice = (inv) => {
    setSelectedInvoice(inv);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ══════════════════════════════════════════════════
          TOP HEADER
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Invoices & Sales Bills
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {filteredInvoices.length} Bills
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage sales invoices, GST collections, and customer receipts with instant A4/Thermal printing
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => nav("/settings")}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
          >
            <Sliders size={14} className="text-slate-500" />
            <span>Customize Template</span>
          </button>

          <button
            onClick={() => nav("/billing")}
            className="flex items-center gap-2 bg-[#1a5cff] hover:bg-[#1248cc] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-blue-500/25 transition active:scale-95"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Create Bill</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          FILTER & SEARCH TOOLBAR
      ══════════════════════════════════════════════════ */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 max-w-md px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          <Search size={15} className="text-slate-400" />
          <input
            placeholder="Search by invoice #, customer name, or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none w-full text-slate-700 placeholder-slate-400"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {[
            { id: "ALL", label: "All Bills" },
            { id: "PAID", label: "Paid" },
            { id: "UNPAID", label: "Unpaid / Credit" },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setStatusFilter(pill.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === pill.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          INVOICES TABLE
      ══════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Customer Details</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Payment Mode</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Taxable</th>
                <th className="py-3.5 px-4 text-right">Grand Total</th>
                <th className="py-3.5 px-4 text-center">Print / View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FileText size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-slate-600">No invoices match your search</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try clearing filters or search terms</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isPaid =
                    inv.status === "COMPLETED" ||
                    inv.status === "PAID" ||
                    inv.paymentStatus === "PAID" ||
                    inv.paymentStatus === "Paid";

                  return (
                    <tr
                      key={inv._id || inv.id || inv.invoiceNumber}
                      className="hover:bg-slate-50/70 transition cursor-pointer"
                      onClick={() => handleOpenInvoice(inv)}
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-black text-blue-600 font-mono tracking-tight">
                          {inv.invoiceNumber}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800">{inv.customer?.name || "Cash Customer"}</p>
                        {inv.customer?.phone && (
                          <p className="text-[11px] text-slate-400 font-mono">{inv.customer.phone}</p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        {new Date(inv.createdAt || Date.now()).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      <td className="py-3.5 px-4 uppercase text-slate-600 font-semibold">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {inv.paymentMethod || "CASH"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isPaid
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {isPaid ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                          <span>{isPaid ? "PAID" : "UNPAID"}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-medium text-slate-600">
                        ₹{(inv.subtotal || inv.grandTotal || 0).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm">
                        ₹{(inv.grandTotal || 0).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>

                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenInvoice(inv)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition border border-slate-200"
                            title="View Tax Invoice"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => handleOpenInvoice(inv)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition border border-slate-200"
                            title="Print Tax Invoice"
                          >
                            <Printer size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          TAX INVOICE MODAL (VIEW & PRINT)
      ══════════════════════════════════════════════════ */}
      {selectedInvoice && (
        <TaxInvoice
          invoice={selectedInvoice}
          shopSettings={shopSettings}
          isModal={true}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}
