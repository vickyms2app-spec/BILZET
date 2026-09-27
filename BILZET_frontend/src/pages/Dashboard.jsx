import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  TrendingUp,
  Receipt,
  Users,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  Printer,
  Eye,
  Sliders,
  CheckCircle2,
  Clock,
  Package,
  ShieldCheck,
} from "lucide-react";
import { dashboardApi, settingsApi } from "../api";
import { mockDashboardData } from "../api/mockData";
import Logo from "../components/common/Logo";
import TaxInvoice from "../components/invoice/TaxInvoice";
import EmptyStateIllustration from "../components/illustrations/EmptyStateIllustration";

export default function Dashboard() {
  const nav = useNavigate();
  const [data, setData] = useState(mockDashboardData);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [shopSettings, setShopSettings] = useState(null);

  useEffect(() => {
    // Load shop settings
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

    // Load dashboard metrics
    dashboardApi
      .get()
      .then((res) => {
        if (res) setData(res);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    {
      title: "Today's Gross Sales",
      value: `₹${(data.todaySales || data.totalSales || 4947).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      sub: "+14.2% vs previous period",
      icon: TrendingUp,
      color: "from-blue-600 to-indigo-600",
      glow: "rgba(26, 92, 255, 0.15)",
    },
    {
      title: "Total GST Collected",
      value: `₹${(data.gstCollected || 387.4).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      sub: "100% Tax Compliant Outward",
      icon: Receipt,
      color: "from-teal-500 to-emerald-600",
      glow: "rgba(0, 196, 204, 0.15)",
    },
    {
      title: "Registered Customers",
      value: `${data.totalCustomers || 18} Accounts`,
      sub: "Active B2B & Retail Clients",
      icon: Users,
      color: "from-cyan-500 to-blue-600",
      glow: "rgba(6, 182, 212, 0.15)",
    },
    {
      title: "Inventory Stock Watch",
      value: `${data.lowStockCount || 2} Low Items`,
      sub: "Requires replenishment",
      icon: AlertTriangle,
      color: "from-amber-500 to-orange-600",
      glow: "rgba(245, 158, 11, 0.15)",
    },
  ];

  const recentSales = data.recentSales || [];

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* ══════════════════════════════════════════════════
          HERO BANNER: CREATIVE ILLUSTRATIVE WELCOME
      ══════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#0b1736] via-[#0f2452] to-[#081229] border border-cyan-500/20 shadow-xl text-white">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-1/4 w-80 h-80 rounded-full bg-cyan-400/15 blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-10 right-0 w-72 h-72 rounded-full bg-blue-600/20 blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                <Sparkles size={12} />
                Next-Gen Retail POS
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                GST Ready (Version 10.4)
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
              Speed, Clarity &amp; Precision for Your Business.
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              Create instant GST tax invoices, track multi-warehouse inventory, and customize your invoice format with instant UPI QR payments.
            </p>

            {/* Quick Action Pills */}
            <div className="pt-2 flex flex-wrap gap-2.5">
              <button
                onClick={() => nav("/billing")}
                className="flex items-center gap-2 bg-[#1a5cff] hover:bg-[#1248cc] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-blue-500/30 transition active:scale-95"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>Create New Bill</span>
              </button>

              <button
                onClick={() => nav("/settings")}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white border border-white/15 px-4 py-2.5 rounded-xl font-bold text-xs transition"
              >
                <Sliders size={14} className="text-cyan-400" />
                <span>Customize Invoice Studio</span>
              </button>

              <button
                onClick={() => nav("/inventory")}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white border border-white/15 px-4 py-2.5 rounded-xl font-bold text-xs transition"
              >
                <Package size={14} className="text-teal-400" />
                <span>Stock Inventory</span>
              </button>
            </div>
          </div>

          {/* Right Brand Badge Card */}
          <div className="hidden lg:flex flex-col items-center justify-center p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md shrink-0 w-64 text-center">
            <Logo variant="full" theme="dark" size="md" className="mb-3" />
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
              <ShieldCheck size={14} />
              <span>100% Tax Compliant</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Place of Supply: 33-Tamil Nadu
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          METRICS GRID
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div
              key={idx}
              className="relative bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group"
            >
              {/* Colored top accent bar */}
              <div
                className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${m.color}`}
              />

              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {m.title}
                  </p>
                  <h2 className="text-2xl font-black text-slate-900 mt-2 tracking-tight group-hover:text-blue-600 transition-colors">
                    {m.value}
                  </h2>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 shadow-xs">
                  <Icon size={18} />
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 font-medium">{m.sub}</span>
                <span className="text-blue-600 font-bold flex items-center gap-0.5">
                  View <ArrowUpRight size={12} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════
          RECENT SALES INVOICES & QUICK COMPLIANCE
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: RECENT INVOICES (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Customer Invoices</h2>
              <p className="text-xs text-slate-400">Click any invoice to view or print the A4 GST Tax receipt</p>
            </div>
            <button
              onClick={() => nav("/invoices")}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          {recentSales.length === 0 ? (
            <div className="py-10 text-center">
              <EmptyStateIllustration className="w-36 h-auto mx-auto mb-3" />
              <p className="font-bold text-sm text-slate-700">No Sales Recorded Yet</p>
              <p className="text-xs text-slate-400 mt-1">Generate your first bill using the button below</p>
              <button
                onClick={() => nav("/billing")}
                className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 inline-flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>Create Bill</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSales.slice(0, 5).map((inv) => {
                    const isPaid =
                      inv.status === "COMPLETED" ||
                      inv.status === "PAID" ||
                      inv.paymentStatus === "PAID" ||
                      inv.paymentStatus === "Paid";

                    return (
                      <tr
                        key={inv._id || inv.id || inv.invoiceNumber}
                        onClick={() => setSelectedInvoice(inv)}
                        className="hover:bg-slate-50/80 transition cursor-pointer"
                      >
                        <td className="py-3 px-3 font-mono font-bold text-blue-600">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {inv.customer?.name || "Walk-in Customer"}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {new Date(inv.createdAt || Date.now()).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </td>
                        <td className="py-3 px-3">
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
                        <td className="py-3 px-3 text-right font-black text-slate-900">
                          ₹{(inv.grandTotal || 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="View Invoice"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                              title="Print Invoice"
                            >
                              <Printer size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RIGHT: GST & STORE COMPLIANCE STATUS (1 Col) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">GST Compliance Status</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Active
              </span>
            </div>

            <div className="my-5 space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <p className="text-xs text-slate-500 font-medium">Configured GSTIN</p>
                <p className="text-sm font-mono font-bold text-slate-900 mt-0.5">
                  {shopSettings?.gstin || "33AAAAA0000A1Z5"}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  State: {shopSettings?.state || "Tamil Nadu"} (Code: {shopSettings?.stateCode || "33"})
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <p className="text-xs text-slate-500 font-medium">Default Paper &amp; Template</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  {shopSettings?.paperSize || "A4 Standard"} · {shopSettings?.template || "Modern Gradient"}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  UPI VPA: {shopSettings?.upiId || "bilzet@hdfcbank"}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => nav("/gst")}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              Export GSTR-1 &amp; Reports
            </button>
            <button
              onClick={() => nav("/settings")}
              className="w-full py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              Edit Store Profile &amp; QR
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          TAX INVOICE PREVIEW MODAL
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