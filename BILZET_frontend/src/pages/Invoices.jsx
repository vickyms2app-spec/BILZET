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
import DateNavigator from "../components/common/DateNavigator";

export default function Invoices() {
  const nav = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [invoices, setInvoices] = useState([]);
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
        const salesList = res?.sales || res?.data?.sales || [];
        setInvoices(salesList);
      })
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, []);

  const [dateFilter, setDateFilter] = useState(null);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer?.phone?.includes(search);

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "PAID" && (inv.status === "COMPLETED" || inv.status === "PAID" || inv.paymentStatus === "PAID" || inv.paymentStatus === "Paid")) ||
      (statusFilter === "UNPAID" && (inv.status === "UNPAID" || inv.paymentStatus === "UNPAID" || inv.paymentStatus === "Unpaid"));

    let matchesDate = true;
    if (dateFilter?.startDate && dateFilter?.endDate) {
      const invDate = new Date(inv.createdAt || inv.date || inv.invoiceDate || Date.now());
      matchesDate = invDate >= dateFilter.startDate && invDate <= dateFilter.endDate;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleOpenInvoice = (inv) => {
    setSelectedInvoice(inv);
  };

  return (
    <div className="space-y-5 pb-12 fade-up">
      {/* ══════════════════════════════════════════════════
          TOP HEADER
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 grid place-items-center shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Invoices &amp; Sales Bills</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
                {filteredInvoices.length} {filteredInvoices.length === 1 ? "Bill" : "Bills"}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Manage sales invoices, GST collections, and customer receipts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => nav("/billing")}
            className="btn-primary text-xs"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Create Bill</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          DATE NAVIGATOR (DAY / MONTH / YEAR / RANGE)
      ══════════════════════════════════════════════════ */}
      <DateNavigator
        initialView="month"
        onChange={setDateFilter}
      />

      {/* ══════════════════════════════════════════════════
          FILTER & SEARCH TOOLBAR
      ══════════════════════════════════════════════════ */}
      <div className="card px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="search-field flex-1 max-w-md">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            placeholder="Search by invoice #, customer, or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status Filters */}
        <div className="seg-tabs">
          {[
            { id: "ALL", label: "All Bills" },
            { id: "PAID", label: "Paid" },
            { id: "UNPAID", label: "Unpaid" },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setStatusFilter(pill.id)}
              className={`seg-tab ${statusFilter === pill.id ? "active" : ""}`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          INVOICES TABLE
      ══════════════════════════════════════════════════ */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Invoice #</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mode</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Taxable</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Grand Total</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 px-4 text-center">
                    <div className="empty-state-icon mx-auto">
                      <FileText size={20} />
                    </div>
                    <p className="font-semibold text-sm text-slate-800">No invoices match your search</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Try clearing search filters or create a new invoice to get started.
                    </p>
                    <button
                      onClick={() => nav("/billing")}
                      className="btn-primary mt-4 text-xs inline-flex items-center gap-1.5"
                    >
                      <Plus size={13} strokeWidth={2.5} />
                      <span>Create New Bill</span>
                    </button>
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
                      <td className="py-3.5 px-4 font-mono font-semibold text-blue-600">
                        {inv.invoiceNumber}
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">{inv.customer?.name || "Cash Customer"}</p>
                        {inv.customer?.phone && (
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{inv.customer.phone}</p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        {new Date(inv.createdAt || Date.now()).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold tracking-wider uppercase">
                          {inv.paymentMethod || "CASH"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`badge ${isPaid ? "badge-paid" : "badge-unpaid"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? "bg-emerald-500" : "bg-amber-500"}`} />
                          {isPaid ? "PAID" : "UNPAID"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                        ₹{(inv.subtotal || inv.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                        ₹{(inv.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenInvoice(inv)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
                            title="View Tax Invoice"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => handleOpenInvoice(inv)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition"
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
