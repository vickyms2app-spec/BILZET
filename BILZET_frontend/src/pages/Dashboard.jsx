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
  Warehouse,
  ShoppingBag,
  UserCheck,
  Globe,
  BarChart3,
  Calendar,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { dashboardApi, settingsApi } from "../api";
import { mockDashboardData } from "../api/mockData";
import Logo from "../components/common/Logo";
import TaxInvoice from "../components/invoice/TaxInvoice";
import DateNavigator from "../components/common/DateNavigator";

export default function Dashboard() {
  const nav = useNavigate();
  const [data, setData] = useState(mockDashboardData);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [timeRange, setTimeRange] = useState("week"); // 'today' | 'week' | 'month' | 'year'
  const [dateFilter, setDateFilter] = useState({ mode: "month", label: "Current Month" });
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
      value: `₹${Number(data.todaySales ?? data.totalSales ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      sub: "Active Live Outward Billing",
      icon: TrendingUp,
      color: "blue",
      iconBg: "bg-blue-50 text-blue-600 border-blue-100",
    },
    {
      title: "Total GST Collected",
      value: `₹${Number(data.gstCollected ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      sub: "100% Tax Compliant Outward",
      icon: Receipt,
      color: "teal",
      iconBg: "bg-teal-50 text-teal-600 border-teal-100",
    },
    {
      title: "Registered Customers",
      value: `${data.totalCustomers ?? 0}`,
      sub: "Active B2B & Retail Clients",
      icon: Users,
      color: "violet",
      iconBg: "bg-violet-50 text-violet-600 border-violet-100",
    },
    {
      title: "Inventory Stock Watch",
      value: `${data.lowStockCount ?? data.lowStockProducts ?? 0} Low`,
      sub: "Items require replenishment",
      icon: AlertTriangle,
      color: "amber",
      iconBg: "bg-amber-50 text-amber-600 border-amber-100",
    },
  ];

  // Dynamic Chart Data based on timeRange
  const chartDatasets = {
    today: [
      { time: "9 AM", sales: 2400, bills: 4 },
      { time: "11 AM", sales: 5800, bills: 8 },
      { time: "1 PM", sales: 8900, bills: 12 },
      { time: "3 PM", sales: 4200, bills: 6 },
      { time: "5 PM", sales: 12400, bills: 15 },
      { time: "7 PM", sales: 9800, bills: 11 },
      { time: "9 PM", sales: 6100, bills: 7 },
    ],
    week: [
      { time: "Mon", sales: 18400, bills: 22 },
      { time: "Tue", sales: 24100, bills: 31 },
      { time: "Wed", sales: 29800, bills: 36 },
      { time: "Thu", sales: 21500, bills: 28 },
      { time: "Fri", sales: 34200, bills: 42 },
      { time: "Sat", sales: 48900, bills: 58 },
      { time: "Sun", sales: 42100, bills: 50 },
    ],
    month: [
      { time: "Week 1", sales: 142000, bills: 165 },
      { time: "Week 2", sales: 168000, bills: 190 },
      { time: "Week 3", sales: 154000, bills: 175 },
      { time: "Week 4", sales: 189000, bills: 215 },
    ],
    year: [
      { time: "Q1", sales: 480000, bills: 580 },
      { time: "Q2", sales: 590000, bills: 670 },
      { time: "Q3", sales: 640000, bills: 740 },
      { time: "Q4", sales: 790000, bills: 890 },
    ],
  };

  const currentChartData = chartDatasets[timeRange] || chartDatasets.week;

  const categoryData = [
    { name: "Groceries & Staples", value: 34200 },
    { name: "Fresh Produce", value: 21400 },
    { name: "Packaged Goods", value: 18600 },
    { name: "Dairy & Beverages", value: 14500 },
    { name: "Personal Care", value: 9200 },
  ];

  const recentSales = data.recentSales || [];

  return (
    <div className="space-y-5 pb-12 max-w-7xl mx-auto fade-up">
      {/* ══════════════════════════════════════════════════
          HERO BANNER
      ══════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl p-6 sm:p-7 bg-gradient-to-br from-[#0c1628] via-[#0f1f45] to-[#091228] border border-slate-800/60 shadow-lg text-white">
        <div className="absolute top-0 right-1/3 w-80 h-80 rounded-full bg-cyan-500/8 blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-12 right-0 w-72 h-72 rounded-full bg-blue-600/10 blur-[90px] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-cyan-500/12 text-cyan-300 border border-cyan-500/20">
                <Sparkles size={11} className="text-cyan-300" />
                Enterprise ERP Suite
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Multi-Godown · GST Compliant · Version 10.4
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-[2.15rem] font-bold tracking-tight text-white leading-tight">
              Speed, Clarity &amp; Precision for Your Business
            </h1>

            <p className="text-sm text-slate-400 font-normal leading-relaxed max-w-xl">
              Unified billing, Godown warehouse tracking, vendor purchase orders, staff payroll and online order management in one seamless cloud suite.
            </p>

            {/* Primary Action Button */}
            <div className="pt-1.5 flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => nav("/billing")}
                className="btn-primary text-xs shadow-lg shadow-blue-600/20"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>Create New Bill</span>
              </button>
            </div>
          </div>

          {/* Right Brand Badge Card */}
          <div className="hidden lg:flex flex-col items-center justify-center p-5 rounded-xl bg-white/[0.04] border border-white/[0.07] shrink-0 w-56 text-center gap-2">
            <Logo variant="full" theme="dark" size="md" />
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mt-1">
              <ShieldCheck size={13} />
              <span>100% Tax Compliant</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Place of Supply: 33-Tamil Nadu
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          METRICS GRID
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div
              key={idx}
              className={`kpi-card ${m.color} group cursor-pointer`}
              onClick={() =>
                nav(
                  idx === 0
                    ? "/billing"
                    : idx === 1
                    ? "/gst"
                    : idx === 2
                    ? "/customers"
                    : "/inventory"
                )
              }
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-tight">
                  {m.title}
                </p>
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${m.iconBg}`}
                >
                  <Icon size={16} strokeWidth={2} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
                {m.value}
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">{m.sub}</span>
                <span className="text-blue-600 font-semibold flex items-center gap-0.5 text-xs group-hover:translate-x-0.5 transition-transform">
                  View <ArrowUpRight size={12} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════
          DATE & TIMEFRAME NAVIGATOR (DAY / MONTH / YEAR)
      ══════════════════════════════════════════════════ */}
      <DateNavigator
        initialView="day"
        onChange={(selected) => {
          setDateFilter(selected);
          if (selected.mode === "day") setTimeRange("today");
          else if (selected.mode === "month") setTimeRange("month");
          else if (selected.mode === "year") setTimeRange("year");
          else setTimeRange("week");
        }}
      />

      {/* ══════════════════════════════════════════════════
          REALTIME ERP RECHARTS ANALYTICS
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Sales Revenue Trend AreaChart */}
        <div className="lg:col-span-2 card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <BarChart3 size={16} className="text-blue-600" />
                <span>Revenue &amp; Billing Trend</span>
              </h2>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Outward sales velocity &amp; daily bill transaction counts
              </p>
            </div>

            {/* Timeframe Toggles */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-600 self-start sm:self-auto">
              {[
                { id: "today", label: "Today" },
                { id: "week", label: "Week" },
                { id: "month", label: "Month" },
                { id: "year", label: "Year" },
              ].map((tf) => (
                <button
                  key={tf.id}
                  onClick={() => setTimeRange(tf.id)}
                  className={`px-3 py-1 rounded-lg transition ${
                    timeRange === tf.id
                      ? "bg-white text-blue-600 shadow-2xs"
                      : "hover:text-slate-900"
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${v / 1000}k` : v}`} />
                <Tooltip
                  formatter={(val) => [`₹${Number(val).toLocaleString("en-IN")}`, "Gross Sales"]}
                  contentStyle={{
                    background: "#0f172a",
                    border: "none",
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#salesGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Top Performing Categories BarChart */}
        <div className="card p-5 space-y-4">
          <div className="pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Category Breakdown</h2>
            <p className="text-xs text-slate-500 font-normal mt-0.5">Top revenue contributors by stock class</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 10, fill: "#475569" }}
                  width={90}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val) => [`₹${Number(val).toLocaleString("en-IN")}`, "Revenue"]}
                  contentStyle={{
                    background: "#0f172a",
                    border: "none",
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="value" fill="#0284c7" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          RECENT SALES INVOICES & QUICK COMPLIANCE
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT: RECENT INVOICES (2 Cols) */}
        <div className="lg:col-span-2 card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Recent Customer Invoices</h2>
              <p className="text-xs text-slate-500 font-normal mt-0.5">Click any invoice to view or print the A4 GST Tax receipt</p>
            </div>
            <button
              onClick={() => nav("/invoices")}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition group whitespace-nowrap"
            >
              <span>View All</span>
              <ArrowUpRight size={13} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>

          {recentSales.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Receipt size={20} />
              </div>
              <p className="font-semibold text-sm text-slate-800">No Sales Recorded Yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">Generate your first tax invoice and print an instant thermal or A4 receipt.</p>
              <button
                onClick={() => nav("/billing")}
                className="btn-primary mt-4 text-xs"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>Create Bill</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Invoice #</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
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
                        className="hover:bg-slate-50/80 transition cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 font-mono font-semibold text-blue-600 text-xs">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800">
                          {inv.customer?.name || "Walk-in Customer"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {new Date(inv.createdAt || Date.now()).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`badge ${isPaid ? "badge-paid" : "badge-unpaid"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? "bg-emerald-500" : "bg-amber-500"}`} />
                            {isPaid ? "PAID" : "UNPAID"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                          ₹{(inv.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="View Invoice"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
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
        <div className="card p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">GST Compliance Status</h2>
            <span className="badge badge-active">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </span>
          </div>

          <div className="space-y-3 flex-1">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Configured GSTIN</p>
              <p className="text-xs font-mono font-bold text-slate-900 tracking-wider">
                {shopSettings?.gstin || "33AAAAA0000A1Z5"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                State: <strong className="font-semibold text-slate-700">{shopSettings?.state || "Tamil Nadu"}</strong> (Code: {shopSettings?.stateCode || "33"})
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Default Paper &amp; Template</p>
              <p className="text-xs font-semibold text-slate-900">
                {shopSettings?.paperSize || "A4 Standard"} · {shopSettings?.template || "Modern Gradient"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                UPI VPA: <span className="font-mono text-slate-700">{shopSettings?.upiId || "bilzet@hdfcbank"}</span>
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <button
              onClick={() => nav("/gst")}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2"
            >
              <span>Export GSTR-1 &amp; Reports</span>
              <ArrowUpRight size={13} />
            </button>
            <button
              onClick={() => nav("/settings")}
              className="btn-secondary w-full text-xs"
            >
              <Sliders size={13} className="text-slate-400" />
              <span>Edit Store Profile &amp; QR</span>
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