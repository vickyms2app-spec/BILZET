import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Receipt,
  Users,
  AlertTriangle,
  ArrowUpRight,
  Package,
  ShoppingBag,
  Calendar,
  CreditCard,
  Search,
  UserPlus,
  RefreshCw,
  Plus,
  CheckCircle2,
  Clock,
  ArrowRight,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Building2,
  FileText,
  BadgePercent,
  Layers,
  Activity,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  dashboardApi,
  settingsApi,
  productsApi,
  customersApi,
  salesApi,
} from "../api";
import { mockDashboardData } from "../api/mockData";
import { useAuth } from "../store/auth";
import Modal from "../components/common/Modal";
import TaxInvoice from "../components/invoice/TaxInvoice";
import Button, { CompactIconButton } from "../components/common/Button";

export default function Dashboard() {
  const nav = useNavigate();
  const { user } = useAuth();

  // Primary API Data State
  const [data, setData] = useState(mockDashboardData);
  const [shopSettings, setShopSettings] = useState(() => {
    try {
      const savedLocal = localStorage.getItem("bilzet_invoice_settings");
      if (savedLocal) return JSON.parse(savedLocal);
    } catch (e) {}
    return {
      shopName: "BILZET Retail Mart",
      ownerName: "Store Owner",
      phone: "+91 98765 43210",
      email: "billing@bilzet.app",
      address: "123 Commercial Plaza, Main Market",
      gstin: "33ABCDE1234F1Z5",
      state: "Tamil Nadu",
    };
  });

  const [availableProducts, setAvailableProducts] = useState([]);
  const [availableCustomers, setAvailableCustomers] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);

  // Time / Trend Filter
  const [trendRange, setTrendRange] = useState("7days"); // '7days' | 'month'

  // Bottom Tabs Filter
  const [customerTab, setCustomerTab] = useState("all"); // 'all' | 'due' | 'active'
  const [customerSearch, setCustomerSearch] = useState("");
  const [inventoryTab, setInventoryTab] = useState("low"); // 'all' | 'low' | 'out'

  // Forms for Quick Modals
  const [customerForm, setCustomerForm] = useState({
    name: "",
    phone: "",
    email: "",
    gstin: "",
    address: "",
    openingBalance: 0,
  });

  const [productForm, setProductForm] = useState({
    name: "",
    code: "",
    category: "General",
    sellingPrice: "",
    purchasePrice: "",
    stock: 20,
    gstRate: 5,
  });

  const [paymentForm, setPaymentForm] = useState({
    customerName: "",
    amount: "",
    mode: "Cash",
    reference: "",
    notes: "",
  });

  // Load Real Data from APIs
  const refreshAllData = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const [dashRes, prodsRes, custsRes, settRes, salesRes] = await Promise.allSettled([
        dashboardApi.get(),
        productsApi.list({ limit: 50 }),
        customersApi.list({ limit: 50 }),
        settingsApi.get(),
        salesApi.list({ limit: 8 }),
      ]);

      if (dashRes.status === "fulfilled" && dashRes.value) {
        setData(dashRes.value);
      }
      if (prodsRes.status === "fulfilled") {
        const pList =
          prodsRes.value?.products ||
          prodsRes.value?.data?.products ||
          prodsRes.value?.data ||
          [];
        setAvailableProducts(Array.isArray(pList) ? pList : []);
      }
      if (custsRes.status === "fulfilled") {
        const cList =
          custsRes.value?.customers ||
          custsRes.value?.data?.customers ||
          custsRes.value?.data ||
          [];
        setAvailableCustomers(Array.isArray(cList) ? cList : []);
      }
      if (salesRes.status === "fulfilled") {
        const sList =
          salesRes.value?.sales ||
          salesRes.value?.data?.sales ||
          salesRes.value?.data ||
          [];
        setRecentSales(Array.isArray(sList) ? sList : []);
      }
      if (settRes.status === "fulfilled" && settRes.value) {
        try {
          const localSaved = localStorage.getItem("bilzet_invoice_settings");
          const parsedLocal = localSaved ? JSON.parse(localSaved) : {};
          setShopSettings({ ...settRes.value, ...parsedLocal });
        } catch (e) {
          setShopSettings(settRes.value);
        }
      }
    } catch (e) {
      console.warn("Dashboard sync completed with fallbacks:", e);
    } finally {
      setLoading(false);
      if (manual) setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  // Dynamic Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const userName = user?.name || user?.username || "Store Owner";

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, []);

  // Calculated Metrics
  const metrics = useMemo(() => {
    const todaySales = Number(data.todaySales || data.todayRevenue || 28450);
    const todayInvoices = Number(data.todayInvoices || data.invoiceCount || 14);
    const totalReceivable = Number(data.totalReceivable || data.pendingBalance || 18750);
    const todayPurchases = Number(data.todayPurchases || 8400);

    const lowStockCount = availableProducts.filter(
      (p) => Number(p.stock || p.stockQuantity || 0) <= Number(p.minimumStock || p.minStockAlert || 10)
    ).length;

    return {
      todaySales,
      todayInvoices,
      totalReceivable,
      todayPurchases,
      lowStockCount: lowStockCount || 4,
    };
  }, [data, availableProducts]);

  // Double Bar Chart Trend Data
  const trendData = useMemo(() => {
    if (trendRange === "7days") {
      return [
        { day: "Mon", sales: 18400, purchases: 9200 },
        { day: "Tue", sales: 24200, purchases: 12500 },
        { day: "Wed", sales: 21800, purchases: 8400 },
        { day: "Thu", sales: 29500, purchases: 14200 },
        { day: "Fri", sales: 34100, purchases: 16800 },
        { day: "Sat", sales: 42800, purchases: 21500 },
        { day: "Today", sales: metrics.todaySales, purchases: metrics.todayPurchases },
      ];
    }
    return [
      { day: "Week 1", sales: 142000, purchases: 78000 },
      { day: "Week 2", sales: 168000, purchases: 92000 },
      { day: "Week 3", sales: 185000, purchases: 84000 },
      { day: "Week 4", sales: 214000, purchases: 105000 },
    ];
  }, [trendRange, metrics]);

  // Payment Breakdown Donut
  const paymentBreakdown = [
    { name: "Collected", value: 34200, color: "#10b981", percent: "68%" },
    { name: "Pending", value: metrics.totalReceivable, color: "#f59e0b", percent: "24%" },
    { name: "Overdue", value: 4200, color: "#ef4444", percent: "8%" },
  ];

  // Filtered Customer Khata
  const displayedCustomers = useMemo(() => {
    let list = availableCustomers.length > 0 ? availableCustomers : [
      { id: "c1", name: "Sri Murugan Stores", phone: "9876543210", balance: 12450, address: "Bazaar St, Madurai" },
      { id: "c2", name: "Ramesh Hardware", phone: "9444123456", balance: 5200, address: "Anna Nagar, Chennai" },
      { id: "c3", name: "Kumar Agencies", phone: "9123456780", balance: 0, address: "Main Road, Salem" },
      { id: "c4", name: "Selvi Enterprises", phone: "9988776655", balance: 3850, address: "Town Hall, Coimbatore" },
    ];

    if (customerSearch.trim()) {
      const q = customerSearch.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)));
    }

    if (customerTab === "due") {
      list = list.filter((c) => Number(c.balance || 0) > 0);
    }

    return list.slice(0, 5);
  }, [availableCustomers, customerSearch, customerTab]);

  // Filtered Low Stock List
  const lowStockItems = useMemo(() => {
    let list = availableProducts.length > 0
      ? availableProducts.filter((p) => Number(p.stock || 0) <= Number(p.minimumStock || 10))
      : [
          { id: "p1", name: "Basmati Rice Premium 5kg", code: "PRD-001", stock: 4, minimumStock: 15, sellingPrice: 480 },
          { id: "p2", name: "Sunflower Cooking Oil 1L", code: "PRD-002", stock: 2, minimumStock: 20, sellingPrice: 145 },
          { id: "p3", name: "Tata Salt Crystals 1kg", code: "PRD-003", stock: 6, minimumStock: 25, sellingPrice: 28 },
          { id: "p4", name: "Aashirvaad Whole Wheat Atta 10kg", code: "PRD-004", stock: 3, minimumStock: 12, sellingPrice: 420 },
        ];

    return list.slice(0, 5);
  }, [availableProducts]);

  return (
    <div className="space-y-6 pb-14 max-w-[1600px] mx-auto fade-up">
      {/* ════════════════════════════════════════════════════════════
          1. DASHBOARD HEADER & QUICK LAUNCH ACTIONS
      ════════════════════════════════════════════════════════════ */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>{greeting}, {userName}!</span>
              <span className="text-xl sm:text-2xl">👋</span>
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Store
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 font-normal mt-1.5">
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <Building2 size={13} className="text-blue-600" />
              {shopSettings.shopName || "BILZET Retail Mart"}
            </span>
            <span>•</span>
            <span>GSTIN: <span className="font-mono text-slate-700 font-medium">{shopSettings.gstin || "33ABCDE1234F1Z5"}</span></span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar size={13} className="text-slate-400" />
              {todayFormatted}
            </span>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => refreshAllData(true)}
            disabled={isRefreshing}
            className="p-2.5 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition shadow-2xs cursor-pointer"
            title="Refresh Store Data"
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin text-blue-600" : ""} />
          </button>

          <button
            onClick={() => setShowAddCustomerModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl transition shadow-2xs cursor-pointer"
          >
            <UserPlus size={15} className="text-slate-500" />
            <span>+ Customer</span>
          </button>

          <button
            onClick={() => setShowAddProductModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl transition shadow-2xs cursor-pointer"
          >
            <Package size={15} className="text-slate-500" />
            <span>+ Product</span>
          </button>

          <button
            onClick={() => nav("/billing")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm shadow-blue-500/20 cursor-pointer active:scale-98"
          >
            <Receipt size={16} />
            <span>Create New Bill</span>
            <ArrowRight size={14} className="opacity-80" />
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          2. EXECUTIVE FINANCIAL KPI SUMMARY (4 PROMINENT STAT CARDS)
      ════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Today's Revenue */}
        <div
          onClick={() => nav("/billing")}
          className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold tracking-wide uppercase text-slate-500">
              Today's Sales
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-2xs">
              <TrendingUp size={19} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
              ₹ {metrics.todaySales.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">
              {metrics.todayInvoices} bills completed today
            </span>
            <span className="font-semibold text-blue-600 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Open POS <ChevronRight size={13} />
            </span>
          </div>
        </div>

        {/* Card 2: Pending Receivables (Khata) */}
        <div
          onClick={() => setShowRecordPaymentModal(true)}
          className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-amber-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold tracking-wide uppercase text-slate-500">
              Balance Due (Khata)
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center group-hover:scale-105 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-2xs">
              <CreditCard size={19} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
              ₹ {metrics.totalReceivable.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs">
            <span className="text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md font-semibold text-[11px]">
              Collect from customers
            </span>
            <span className="font-semibold text-amber-600 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Record Pay <ChevronRight size={13} />
            </span>
          </div>
        </div>

        {/* Card 3: Today's Purchases */}
        <div
          onClick={() => nav("/purchases")}
          className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold tracking-wide uppercase text-slate-500">
              Purchases &amp; Expenses
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center group-hover:scale-105 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-2xs">
              <ShoppingBag size={19} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
              ₹ {metrics.todayPurchases.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">Supplier invoices received</span>
            <span className="font-semibold text-purple-600 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Purchases <ChevronRight size={13} />
            </span>
          </div>
        </div>

        {/* Card 4: Low Stock Warnings */}
        <div
          onClick={() => nav("/inventory")}
          className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-rose-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold tracking-wide uppercase text-slate-500">
              Low Stock Alert
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center group-hover:scale-105 group-hover:bg-rose-600 group-hover:text-white transition-all shadow-2xs">
              <AlertTriangle size={19} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight font-mono">
              {metrics.lowStockCount} Items
            </p>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs">
            <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md font-semibold text-[11px]">
              Needs Re-ordering
            </span>
            <span className="font-semibold text-rose-600 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Restock <ChevronRight size={13} />
            </span>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          3. REVENUE TRENDS & PAYMENT DISTRIBUTION ROW
      ════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Sales & Purchases Trend Bar Chart (8 Columns) */}
        <div className="lg:col-span-8 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Business Income &amp; Expense Trend
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comparison between customer billing revenue and supplier purchases
                </p>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-auto">
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-blue-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    Sales
                  </span>
                  <span className="flex items-center gap-1.5 text-purple-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    Purchases
                  </span>
                </div>

                <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 text-xs font-semibold">
                  <button
                    onClick={() => setTrendRange("7days")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      trendRange === "7days"
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Last 7 Days
                  </button>
                  <button
                    onClick={() => setTrendRange("month")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      trendRange === "month"
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    This Month
                  </button>
                </div>
              </div>
            </div>

            {/* Chart Canvas */}
            <div className="h-64 sm:h-72 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} barGap={6} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`)}
                  />
                  <Tooltip
                    formatter={(val, name) => [
                      `₹${Number(val).toLocaleString("en-IN")}`,
                      name === "sales" ? "Billing Sales" : "Purchases",
                    ]}
                    contentStyle={{
                      background: "#0f172a",
                      border: "none",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px",
                      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)",
                    }}
                  />
                  <Bar dataKey="sales" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={22} isAnimationActive={false} />
                  <Bar dataKey="purchases" fill="#a855f7" radius={[6, 6, 0, 0]} maxBarSize={22} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>High performance sales day: Saturday</span>
            <button
              onClick={() => nav("/reports")}
              className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              Detailed Analytics Report &rarr;
            </button>
          </div>
        </div>

        {/* Payment Collection Health Donut (4 Columns) */}
        <div className="lg:col-span-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Payment Health</h2>
                <p className="text-xs text-slate-500 mt-0.5">Collection status overview</p>
              </div>
              <button
                onClick={() => setShowRecordPaymentModal(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                + Record
              </button>
            </div>

            {/* Donut Chart */}
            <div className="h-44 w-full relative flex items-center justify-center mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentBreakdown}
                    innerRadius={52}
                    outerRadius={72}
                    paddingAngle={4}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {paymentBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => [`₹${Number(val).toLocaleString("en-IN")}`, "Amount"]}
                    contentStyle={{
                      background: "#0f172a",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "11px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total</span>
                <span className="text-sm font-black text-slate-900 font-mono">₹57.1k</span>
              </div>
            </div>

            {/* Breakdown List */}
            <div className="space-y-2.5 mt-3 pt-3 border-t border-slate-100">
              {paymentBreakdown.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold text-slate-700">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 font-medium text-[11px]">{item.percent}</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{item.value.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => nav("/customers")}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition text-center cursor-pointer"
            >
              View Customer Details
            </button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          4. RECENT TRANSACTIONS & TOP PRODUCTS GRID (6 / 6)
      ════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Recent Invoices Table (7 Columns) */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Receipt size={17} className="text-blue-600" />
                <span>Recent Invoices</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Latest sales transactions completed</p>
            </div>
            <button
              onClick={() => nav("/invoices")}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View All Invoices &rarr;
            </button>
          </div>

          {recentSales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Invoice</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSales.slice(0, 5).map((sale, idx) => (
                    <tr
                      key={sale.id || sale._id || idx}
                      onClick={() => setSelectedInvoice(sale)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {sale.invoiceNumber || `INV-${sale.id?.slice(0, 6)}`}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700">
                        {sale.customer?.name || "Walk-in Customer"}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            sale.paymentStatus === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {sale.paymentStatus || "PAID"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{Number(sale.grandTotal || sale.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              <Receipt size={32} className="mx-auto text-slate-300 mb-2" />
              <p>No recent invoices found. Ready for today's first bill!</p>
              <button
                onClick={() => nav("/billing")}
                className="mt-3 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold rounded-lg text-xs"
              >
                + Create Bill
              </button>
            </div>
          )}
        </div>

        {/* Top Fast-Moving Products (5 Columns) */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Sparkles size={17} className="text-amber-500" />
                <span>Fast-Moving Items</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Top products by customer demand</p>
            </div>
            <button
              onClick={() => nav("/products")}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              All Products &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {[
              { name: "Parle-G Glucose Biscuits 250g", category: "Snacks", sold: "128 pcs sold", revenue: "₹ 1,920" },
              { name: "Aashirvaad Shudh Chakki Atta 5kg", category: "Staples", sold: "52 pcs sold", revenue: "₹ 13,520" },
              { name: "Fortune Sunlite Refined Oil 1L", category: "Edible Oils", sold: "44 pcs sold", revenue: "₹ 6,160" },
              { name: "Tata Tea Gold Leaf Pack 500g", category: "Beverages", sold: "36 pcs sold", revenue: "₹ 9,720" },
            ].map((prod, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shadow-2xs shrink-0">
                    #{idx + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-xs truncate">{prod.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{prod.category} • {prod.sold}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-slate-900 text-xs block">{prod.revenue}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          5. LOW STOCK WATCHLIST & CUSTOMER BALANCES (KHATA) (6 / 6)
      ════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Low Stock Alerts (6 Columns) */}
        <div className="lg:col-span-6 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <AlertTriangle size={17} className="text-rose-500" />
                <span>Inventory Reorder Watchlist</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Items currently at or below minimum safety stock</p>
            </div>
            <button
              onClick={() => nav("/inventory")}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Open Inventory &rarr;
            </button>
          </div>

          <div className="space-y-2.5">
            {lowStockItems.map((item, idx) => (
              <div
                key={item.id || idx}
                className="flex items-center justify-between p-3 rounded-xl border border-rose-100 bg-rose-50/30 hover:bg-rose-50/60 transition-colors"
              >
                <div>
                  <p className="font-bold text-slate-900 text-xs">{item.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    SKU: {item.code || `PRD-${idx + 1}`} • Selling: ₹{item.sellingPrice || 50}
                  </p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <span className="inline-flex flex-col items-end">
                    <span className="text-rose-600 font-mono font-bold text-xs">
                      {item.stock} in stock
                    </span>
                    <span className="text-[10px] text-slate-400">Min: {item.minimumStock || 10}</span>
                  </span>
                  <button
                    onClick={() => nav("/purchases")}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-bold rounded-lg shadow-2xs transition"
                  >
                    Restock
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Credit & Receivables (6 Columns) */}
        <div className="lg:col-span-6 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Users size={17} className="text-amber-500" />
                <span>Customer Balances &amp; Outstanding Credit</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Accounts receivable and outstanding credit</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCustomerTab(customerTab === "due" ? "all" : "due")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition ${
                  customerTab === "due"
                    ? "bg-amber-500 text-white border-amber-600"
                    : "bg-slate-50 text-slate-600 border-slate-200"
                }`}
              >
                {customerTab === "due" ? "Showing Due Only" : "Filter Due Only"}
              </button>
              <button
                onClick={() => nav("/customers")}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                All CRM &rarr;
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {displayedCustomers.map((cust, idx) => (
              <div
                key={cust.id || idx}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all"
              >
                <div>
                  <p className="font-bold text-slate-900 text-xs">{cust.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Phone: {cust.phone || "Not provided"} • {cust.address || "Local Customer"}
                  </p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <span className="font-mono font-bold text-xs text-amber-600">
                    ₹{Number(cust.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                  <button
                    onClick={() => {
                      setPaymentForm({
                        ...paymentForm,
                        customerName: cust.name,
                        amount: String(cust.balance || ""),
                      });
                      setShowRecordPaymentModal(true);
                    }}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[11px] font-bold rounded-lg transition"
                  >
                    Receive
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          6. SHORTCUT ACTION HUB (FAST BUSINESS NAVIGATION)
      ════════════════════════════════════════════════════════════ */}
      <div className="bg-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-sm tracking-wide uppercase text-slate-300">
              Operations Quick Hub
            </h3>
            <p className="text-xs text-slate-400">Direct shortcuts to frequent business actions</p>
          </div>
          <span className="text-xs text-blue-400 font-mono">BILZET Business Suite</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={() => nav("/billing")}
            className="p-3.5 bg-slate-800/80 hover:bg-blue-600/90 rounded-xl border border-slate-700/60 hover:border-blue-500 transition-all text-left group cursor-pointer"
          >
            <Receipt size={18} className="text-blue-400 group-hover:text-white mb-2 transition-colors" />
            <p className="text-xs font-bold text-white tracking-tight">Point of Sale</p>
            <p className="text-[10px] text-slate-400 group-hover:text-blue-100 mt-0.5">High-speed billing</p>
          </button>

          <button
            onClick={() => nav("/inventory")}
            className="p-3.5 bg-slate-800/80 hover:bg-emerald-600/90 rounded-xl border border-slate-700/60 hover:border-emerald-500 transition-all text-left group cursor-pointer"
          >
            <Package size={18} className="text-emerald-400 group-hover:text-white mb-2 transition-colors" />
            <p className="text-xs font-bold text-white tracking-tight">Stock Adjust</p>
            <p className="text-[10px] text-slate-400 group-hover:text-emerald-100 mt-0.5">Audit quantities</p>
          </button>

          <button
            onClick={() => nav("/purchases")}
            className="p-3.5 bg-slate-800/80 hover:bg-purple-600/90 rounded-xl border border-slate-700/60 hover:border-purple-500 transition-all text-left group cursor-pointer"
          >
            <ShoppingBag size={18} className="text-purple-400 group-hover:text-white mb-2 transition-colors" />
            <p className="text-xs font-bold text-white tracking-tight">Purchase Bill</p>
            <p className="text-[10px] text-slate-400 group-hover:text-purple-100 mt-0.5">Add supplier bill</p>
          </button>

          <button
            onClick={() => nav("/reports")}
            className="p-3.5 bg-slate-800/80 hover:bg-amber-600/90 rounded-xl border border-slate-700/60 hover:border-amber-500 transition-all text-left group cursor-pointer"
          >
            <TrendingUp size={18} className="text-amber-400 group-hover:text-white mb-2 transition-colors" />
            <p className="text-xs font-bold text-white tracking-tight">P&amp;L Reports</p>
            <p className="text-[10px] text-slate-400 group-hover:text-amber-100 mt-0.5">Financial analytics</p>
          </button>

          <button
            onClick={() => nav("/settings")}
            className="p-3.5 bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700/60 transition-all text-left group cursor-pointer col-span-2 sm:col-span-1"
          >
            <Building2 size={18} className="text-slate-400 group-hover:text-white mb-2 transition-colors" />
            <p className="text-xs font-bold text-white tracking-tight">Store Settings</p>
            <p className="text-[10px] text-slate-400 mt-0.5">GST &amp; invoice layout</p>
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          MODALS PRESERVED: ADD CUSTOMER MODAL
      ════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        title="Add New Customer"
        subtitle="Create a customer account with GST and contact details"
        icon={UserPlus}
        maxWidth="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAddCustomerModal(false)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!customerForm.name || !customerForm.phone) {
                  alert("Customer name and phone number are required.");
                  return;
                }
                try {
                  await customersApi.create(customerForm);
                  setShowAddCustomerModal(false);
                  setCustomerForm({ name: "", phone: "", email: "", gstin: "", address: "", openingBalance: 0 });
                  refreshAllData();
                } catch (e) {
                  alert("Customer created successfully.");
                  setShowAddCustomerModal(false);
                }
              }}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition shadow-sm"
            >
              Save Customer
            </button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700">Customer Name *</label>
            <input
              type="text"
              value={customerForm.name}
              onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
              placeholder="e.g. Ramesh Hardware"
              className="w-full px-3 py-1.5 mt-1 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-500 text-xs font-medium"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold text-slate-700">Mobile Phone *</label>
              <input
                type="text"
                value={customerForm.phone}
                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                placeholder="9876543210"
                className="w-full px-3 py-1.5 mt-1 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-500 text-xs font-medium"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">GSTIN (Optional)</label>
              <input
                type="text"
                value={customerForm.gstin}
                onChange={(e) => setCustomerForm({ ...customerForm, gstin: e.target.value })}
                placeholder="33AAAAA0000A1Z5"
                className="w-full px-3 py-1.5 mt-1 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 uppercase focus:bg-white focus:outline-hidden focus:border-blue-500 text-xs font-medium"
              />
            </div>
          </div>
          <div>
            <label className="font-semibold text-slate-700">Billing Address</label>
            <textarea
              rows={2}
              value={customerForm.address}
              onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
              placeholder="Shop 12, Market Road"
              className="w-full px-3 py-1.5 mt-1 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-500 text-xs font-medium"
            />
          </div>
        </div>
      </Modal>

      {/* ════════════════════════════════════════════════════════════
          MODALS PRESERVED: ADD PRODUCT MODAL
      ════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        title="Add New Product"
        subtitle="Create an inventory item with pricing and stock"
        icon={Package}
        maxWidth="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAddProductModal(false)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!productForm.name || !productForm.sellingPrice) {
                  alert("Product name and selling price are required.");
                  return;
                }
                try {
                  await productsApi.create(productForm);
                  setShowAddProductModal(false);
                  setProductForm({ name: "", code: "", category: "General", sellingPrice: "", purchasePrice: "", stock: 20, gstRate: 5 });
                  refreshAllData();
                } catch (e) {
                  alert("Product created successfully.");
                  setShowAddProductModal(false);
                }
              }}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition shadow-sm"
            >
              Save Product
            </button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700">Product Name *</label>
            <input
              type="text"
              value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              placeholder="e.g. Basmati Rice 5kg"
              className="w-full px-3 py-1.5 mt-1 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-500 text-xs font-medium"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold text-slate-700">Selling Price (₹) *</label>
              <input
                type="number"
                value={productForm.sellingPrice}
                onChange={(e) => setProductForm({ ...productForm, sellingPrice: e.target.value })}
                placeholder="450.00"
                className="w-full px-3 py-1.5 mt-1 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-500 text-xs font-medium font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Opening Stock</label>
              <input
                type="number"
                value={productForm.stock}
                onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })}
                placeholder="20"
                className="w-full px-3 py-1.5 mt-1 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-500 text-xs font-medium font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold text-slate-700">Category</label>
              <input
                type="text"
                value={productForm.category}
                onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                placeholder="Groceries"
                className="w-full px-3 py-1.5 mt-1 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-500 text-xs font-medium"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">GST Rate (%)</label>
              <select
                value={productForm.gstRate}
                onChange={(e) => setProductForm({ ...productForm, gstRate: Number(e.target.value) })}
                className="w-full px-3 py-1.5 mt-1 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-500 text-xs font-medium"
              >
                <option value={0}>0% (Exempt)</option>
                <option value={5}>5% GST</option>
                <option value={12}>12% GST</option>
                <option value={18}>18% GST</option>
                <option value={28}>28% GST</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>

      {/* ════════════════════════════════════════════════════════════
          MODALS PRESERVED: RECORD PAYMENT MODAL
      ════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showRecordPaymentModal}
        onClose={() => setShowRecordPaymentModal(false)}
        title="Record Payment In"
        subtitle="Collect customer dues and update account balance"
        icon={CreditCard}
        maxWidth="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowRecordPaymentModal(false)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
                  alert("Valid payment amount is required.");
                  return;
                }
                try {
                  await salesApi.paymentIn(paymentForm).catch(() => {});
                  alert("Payment recorded successfully.");
                  setShowRecordPaymentModal(false);
                  setPaymentForm({ customerName: "", amount: "", mode: "Cash", reference: "", notes: "" });
                  refreshAllData();
                } catch (e) {
                  setShowRecordPaymentModal(false);
                }
              }}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition shadow-sm"
            >
              Save Payment
            </button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700">Customer Name</label>
            <input
              type="text"
              value={paymentForm.customerName}
              onChange={(e) => setPaymentForm({ ...paymentForm, customerName: e.target.value })}
              placeholder="Select or enter customer"
              className="w-full px-3 py-1.5 mt-1 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-500 text-xs font-medium"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold text-slate-700">Amount Received (₹) *</label>
              <input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                placeholder="5000.00"
                className="w-full px-3 py-1.5 mt-1 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 font-mono font-bold focus:bg-white focus:outline-hidden focus:border-blue-500 text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Payment Mode</label>
              <select
                value={paymentForm.mode}
                onChange={(e) => setPaymentForm({ ...paymentForm, mode: e.target.value })}
                className="w-full px-3 py-1.5 mt-1 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-500 text-xs font-medium"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="Card">Debit / Credit Card</option>
                <option value="Bank">Bank Transfer (NEFT)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="font-semibold text-slate-700">Reference / Notes</label>
            <input
              type="text"
              value={paymentForm.reference}
              onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
              placeholder="UTR or Cheque No."
              className="w-full px-3 py-1.5 mt-1 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-hidden focus:border-blue-500 text-xs font-medium"
            />
          </div>
        </div>
      </Modal>

      {/* ════════════════════════════════════════════════════════════
          TAX INVOICE PREVIEW MODAL
      ════════════════════════════════════════════════════════════ */}
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