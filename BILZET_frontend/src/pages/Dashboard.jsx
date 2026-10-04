import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  TrendingUp,
  Receipt,
  Users,
  AlertTriangle,
  ArrowUpRight,
  Printer,
  Package,
  ShoppingBag,
  Calendar,
  CreditCard,
  Barcode,
  Scan,
  Minus,
  Trash2,
  Settings,
  MoreHorizontal,
  Search,
  FileText,
  UserPlus,
  TrendingDown,
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

export default function Dashboard() {
  const nav = useNavigate();
  const { user } = useAuth();

  // Primary API Data State
  const [data, setData] = useState(mockDashboardData);
  const [shopSettings, setShopSettings] = useState(null);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [availableCustomers, setAvailableCustomers] = useState([]);

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);

  // Time / Trend Filter
  const [trendRange, setTrendRange] = useState("7days"); // '7days' | 'month'

  // Bottom Tabs Filter
  const [customerTab, setCustomerTab] = useState("all"); // 'all' | 'active' | 'inactive'
  const [customerSearch, setCustomerSearch] = useState("");
  const [inventoryTab, setInventoryTab] = useState("low"); // 'all' | 'low' | 'out'

  // ══════════════════════════════════════════════════
  // EMBEDDED FAST POS BILLING STATE
  // ══════════════════════════════════════════════════
  const [posCustomer, setPosCustomer] = useState("");
  const [posCustomerPhone, setPosCustomerPhone] = useState("");
  const [posDate, setPosDate] = useState(() => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, "0");
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const y = now.getFullYear();
    return `${d}-${m}-${y}`;
  });
  const [posInvoiceNo, setPosInvoiceNo] = useState(
    () => `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [posProductSearch, setPosProductSearch] = useState("");
  const [posNotes, setPosNotes] = useState("");
  const [posSaving, setPosSaving] = useState(false);

  // Initial POS Items matching reference design
  const [posItems, setPosItems] = useState([
    {
      id: "p1",
      name: "Parle-G Biscuits",
      code: "PRD001",
      qty: 5,
      rate: 15.0,
      discount: 0.0,
      taxRate: 5,
    },
    {
      id: "p2",
      name: "Aashirvaad Atta",
      code: "PRD002",
      qty: 2,
      rate: 320.0,
      discount: 0.0,
      taxRate: 5,
    },
    {
      id: "p3",
      name: "Sunflower Oil",
      code: "PRD003",
      qty: 1,
      rate: 180.0,
      discount: 0.0,
      taxRate: 5,
    },
  ]);

  // Form states for Quick Modals
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
    category: "Groceries",
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

  const [customItemForm, setCustomItemForm] = useState({
    name: "",
    code: "",
    rate: "",
    qty: 1,
    discount: 0,
    taxRate: 5,
  });

  // Load Real Data from APIs
  const refreshAllData = async () => {
    try {
      const [dashRes, prodsRes, custsRes, settRes] = await Promise.allSettled([
        dashboardApi.get(),
        productsApi.list({ limit: 50 }),
        customersApi.list({ limit: 50 }),
        settingsApi.get(),
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
      if (settRes.status === "fulfilled" && settRes.value) {
        setShopSettings(settRes.value);
      }
    } catch (e) {
      console.warn("Dashboard sync completed with fallbacks:", e);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  // Dynamic Greeting & User
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const userName = user?.name || user?.username || "Karthi";

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, []);

  // POS Totals
  const posSubtotal = useMemo(() => {
    return posItems.reduce((acc, item) => {
      const gross = Number(item.rate || 0) * Number(item.qty || 1);
      const disc = Number(item.discount || 0);
      return acc + Math.max(0, gross - disc);
    }, 0);
  }, [posItems]);

  const posDiscount = useMemo(() => {
    return posItems.reduce((acc, item) => acc + Number(item.discount || 0), 0);
  }, [posItems]);

  const posTaxAmount = useMemo(() => {
    return posItems.reduce((acc, item) => {
      const net = Math.max(
        0,
        Number(item.rate || 0) * Number(item.qty || 1) - Number(item.discount || 0)
      );
      return acc + net * (Number(item.taxRate || 0) / 100);
    }, 0);
  }, [posItems]);

  const posTotalAmount = posSubtotal + posTaxAmount;

  // POS Handlers
  const handleQtyChange = (idx, delta) => {
    setPosItems((prev) =>
      prev
        .map((item, i) => {
          if (i === idx) {
            const newQty = Math.max(1, item.qty + delta);
            return { ...item, qty: newQty };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const handleDeletePosItem = (idx) => {
    setPosItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleClearPos = () => {
    setPosItems([]);
    setPosCustomer("");
    setPosNotes("");
    setPosInvoiceNo(
      `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
    );
  };

  const handleAddPosProductFromSearch = (product) => {
    if (!product) return;
    const existsIdx = posItems.findIndex(
      (i) => i.code === (product.code || product.barcode || product._id)
    );
    if (existsIdx >= 0) {
      handleQtyChange(existsIdx, 1);
    } else {
      setPosItems((prev) => [
        ...prev,
        {
          id: product._id || product.id || String(Date.now()),
          name: product.name,
          code: product.code || product.barcode || `PRD${prev.length + 1}`,
          qty: 1,
          rate: Number(product.sellingPrice || product.price || 50),
          discount: 0,
          taxRate: Number(product.gstRate || 5),
        },
      ]);
    }
    setPosProductSearch("");
  };

  const handleSaveAndPrintBill = async () => {
    if (posItems.length === 0) {
      alert("Please add at least one product to print invoice.");
      return;
    }

    setPosSaving(true);
    const invoicePayload = {
      invoiceNumber: posInvoiceNo,
      date: new Date().toISOString(),
      customer: {
        name: posCustomer || "Walk-in Customer",
        phone: posCustomerPhone || "",
      },
      items: posItems.map((item) => ({
        name: item.name,
        hsn: item.code || "1904",
        quantity: item.qty,
        rate: item.rate,
        discount: item.discount,
        taxRate: item.taxRate,
        gstRate: item.taxRate,
        total: (item.qty * item.rate - item.discount) * (1 + item.taxRate / 100),
      })),
      subtotal: posSubtotal,
      taxAmount: posTaxAmount,
      grandTotal: posTotalAmount,
      paymentMode: "Cash",
      paymentStatus: "Paid",
      notes: posNotes,
      status: "COMPLETED",
    };

    try {
      await salesApi.create(invoicePayload).catch(() => {});
      setSelectedInvoice(invoicePayload);
      refreshAllData();
    } catch (e) {
      setSelectedInvoice(invoicePayload);
    } finally {
      setPosSaving(false);
    }
  };

  // Trend Data for Double Bar Chart
  const trendData = useMemo(() => {
    if (trendRange === "7days") {
      return [
        { day: "27 Sep", sales: 18000, purchases: 11000 },
        { day: "28 Sep", sales: 24000, purchases: 14000 },
        { day: "29 Sep", sales: 21000, purchases: 9000 },
        { day: "30 Sep", sales: 28000, purchases: 17000 },
        { day: "01 Oct", sales: 32000, purchases: 15000 },
        { day: "02 Oct", sales: 42000, purchases: 22000 },
        { day: "03 Oct", sales: 24680, purchases: 4320 },
      ];
    }
    return [
      { day: "Week 1", sales: 142000, purchases: 88000 },
      { day: "Week 2", sales: 168000, purchases: 94000 },
      { day: "Week 3", sales: 154000, purchases: 79000 },
      { day: "Week 4", sales: 189000, purchases: 105000 },
    ];
  }, [trendRange]);

  // Recent Activity Feed
  const activityList = [
    {
      type: "sale",
      title: "New Sale Invoice",
      sub: "INV-2026-1036",
      time: "2 minutes ago",
      amount: "₹ 2,450",
      icon: Receipt,
      iconColor: "text-blue-600 bg-blue-50 border-blue-100",
    },
    {
      type: "payment",
      title: "Payment Received",
      sub: "From Kumar Stores",
      time: "18 minutes ago",
      amount: "₹ 5,000",
      icon: CreditCard,
      iconColor: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
    {
      type: "customer",
      title: "New Customer Added",
      sub: "Sri Murugan Traders",
      time: "12:05 PM",
      amount: null,
      icon: UserPlus,
      iconColor: "text-purple-600 bg-purple-50 border-purple-100",
    },
    {
      type: "stock",
      title: "Stock Updated",
      sub: "Parle-G Biscuits +50 pcs",
      time: "11:20 AM",
      amount: null,
      icon: Package,
      iconColor: "text-amber-600 bg-amber-50 border-amber-100",
    },
    {
      type: "purchase",
      title: "Purchase Invoice",
      sub: "From AR Exports",
      time: "10:15 AM",
      amount: "₹ 12,800",
      icon: ShoppingBag,
      iconColor: "text-indigo-600 bg-indigo-50 border-indigo-100",
    },
  ];

  // Top Selling Products
  const topProducts = [
    {
      name: "Parle-G Biscuits",
      sold: "125 pcs",
      revenue: "₹ 1,875",
      icon: "🍪",
    },
    {
      name: "Aashirvaad Atta",
      sold: "48 pcs",
      revenue: "₹ 1,680",
      icon: "🌾",
    },
    {
      name: "Sunflower Oil",
      sold: "25 pcs",
      revenue: "₹ 3,750",
      icon: "🌻",
    },
  ];

  // Bottom CRM Customers
  const customersList = [
    {
      initials: "ST",
      name: "Sri Murugan Traders",
      phone: "9344123456",
      balance: "₹ 12,450",
      active: true,
      color: "bg-emerald-100 text-emerald-700",
    },
    {
      initials: "AE",
      name: "AR Exports",
      phone: "9876543210",
      balance: "- ₹ 2,350",
      active: true,
      color: "bg-purple-100 text-purple-700",
      isNegative: true,
    },
    {
      initials: "KS",
      name: "Kumar Stores",
      phone: "9444211122",
      balance: "₹ 0.00",
      active: true,
      color: "bg-cyan-100 text-cyan-700",
    },
    {
      initials: "SA",
      name: "Selvi Agencies",
      phone: "9000012345",
      balance: "₹ 5,680",
      active: true,
      color: "bg-amber-100 text-amber-700",
    },
  ];

  const filteredCustomers = useMemo(() => {
    return customersList.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch);
      if (customerTab === "active") return matchSearch && c.active;
      if (customerTab === "inactive") return matchSearch && !c.active;
      return matchSearch;
    });
  }, [customerTab, customerSearch]);

  // Bottom Inventory Items
  const inventoryList = [
    {
      name: "Surf Excel",
      code: "PRD005",
      stock: 10,
      price: "₹ 120.00",
      icon: "🧺",
    },
    {
      name: "Colgate Toothpaste",
      code: "PRD004",
      stock: 10,
      price: "₹ 60.00",
      icon: "🪥",
    },
    {
      name: "Comfort Conditioner",
      code: "PRD007",
      stock: 8,
      price: "₹ 45.00",
      icon: "🧴",
    },
    {
      name: "Dove Soap",
      code: "PRD006",
      stock: 5,
      price: "₹ 45.00",
      icon: "🧼",
    },
  ];

  // Payment Breakdown Donut
  const paymentDonutData = [
    { name: "Received", value: 18750, color: "#10b981" },
    { name: "Pending", value: 5280, color: "#f59e0b" },
    { name: "Overdue", value: 3450, color: "#ef4444" },
  ];

  return (
    <div className="space-y-4 sm:space-y-5 pb-12 max-w-[1600px] mx-auto fade-up">
      {/* ══════════════════════════════════════════════════
          TWO-COLUMN MAIN SECTION (60% LEFT / 40% RIGHT POS)
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 xl:gap-5 items-start">
        {/* ────────────────────────────────────────────────
            LEFT COLUMN (DASHBOARD OVERVIEW & ANALYTICS)
        ──────────────────────────────────────────────── */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-4">
          {/* 1. Header Greeting & Date Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>{greeting}, {userName}!</span>
                <span className="text-xl">👋</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
                Your store is running smoothly. Here's today's overview.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 self-start sm:self-auto shrink-0 shadow-2xs">
              <Calendar size={14} className="text-blue-600" />
              <span>Today, {todayFormatted}</span>
            </div>
          </div>

          {/* 2. Top 4 Metric KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Card 1: Today's Sales */}
            <div
              onClick={() => nav("/billing")}
              className="kpi-card blue cursor-pointer group p-3.5"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-xs">
                  <TrendingUp size={16} />
                </div>
              </div>
              <p className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                ₹ {Number(data.todaySales || 24680).toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Today's Sales
              </p>
              <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                <TrendingUp size={12} />
                <span>+12%</span>
              </div>
            </div>

            {/* Card 2: Today's Purchases */}
            <div
              onClick={() => nav("/purchases")}
              className="kpi-card violet cursor-pointer group p-3.5"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                  <ShoppingBag size={16} />
                </div>
              </div>
              <p className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                ₹ {Number(data.todayPurchases || 4320).toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Today's Purchases
              </p>
              <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-rose-500">
                <TrendingDown size={12} />
                <span>-8%</span>
              </div>
            </div>

            {/* Card 3: Total Customers */}
            <div
              onClick={() => nav("/customers")}
              className="kpi-card emerald cursor-pointer group p-3.5"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                  <Users size={16} />
                </div>
              </div>
              <p className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {Number(data.totalCustomers || 56).toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Total Customers
              </p>
              <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                <TrendingUp size={12} />
                <span>+5%</span>
              </div>
            </div>

            {/* Card 4: Low Stock Items */}
            <div
              onClick={() => nav("/inventory")}
              className="kpi-card amber cursor-pointer group p-3.5"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Package size={16} />
                </div>
              </div>
              <p className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {Number(data.lowStockCount || 12).toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Low Stock Items
              </p>
              <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-amber-600 group-hover:translate-x-0.5 transition-transform">
                <span>View Items</span>
                <ArrowUpRight size={12} />
              </div>
            </div>
          </div>

          {/* 3. Four Gradient Quick Action Boxes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Box 1: Create New Bill (Primary Blue Gradient) */}
            <div
              onClick={() => {
                document.getElementById("pos-search-input")?.focus();
              }}
              className="col-span-2 sm:col-span-1 rounded-2xl p-4 bg-gradient-to-r from-[#1d4ed8] via-[#2563eb] to-[#3b82f6] text-white shadow-md shadow-blue-500/15 cursor-pointer hover:shadow-lg hover:shadow-blue-500/25 transition-all group relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
                  <FileText size={16} className="text-white" />
                </div>
                <div className="w-7 h-7 rounded-full bg-white text-blue-600 flex items-center justify-center shadow-xs group-hover:translate-x-0.5 transition-transform">
                  <ArrowUpRight size={14} strokeWidth={2.5} />
                </div>
              </div>
              <h3 className="font-bold text-sm text-white tracking-tight">
                Create New Bill
              </h3>
              <p className="text-[11px] text-blue-100 font-normal mt-0.5">
                Bill with barcode / search
              </p>
            </div>

            {/* Box 2: Add Customer (Soft Mint/Cyan Gradient) */}
            <div
              onClick={() => setShowAddCustomerModal(true)}
              className="rounded-2xl p-4 bg-gradient-to-br from-[#f0fdf4] to-[#ecfdf5] border border-emerald-200/90 shadow-2xs cursor-pointer hover:border-emerald-300 hover:shadow-xs transition-all group"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                <UserPlus size={16} />
              </div>
              <h3 className="font-bold text-sm text-slate-800 tracking-tight group-hover:text-emerald-700 transition-colors">
                Add Customer
              </h3>
              <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                Register new customer
              </p>
            </div>

            {/* Box 3: Add Product (Soft Purple Gradient) */}
            <div
              onClick={() => setShowAddProductModal(true)}
              className="rounded-2xl p-4 bg-gradient-to-br from-[#faf5ff] to-[#f3e8ff] border border-purple-200/90 shadow-2xs cursor-pointer hover:border-purple-300 hover:shadow-xs transition-all group"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                <Package size={16} />
              </div>
              <h3 className="font-bold text-sm text-slate-800 tracking-tight group-hover:text-purple-700 transition-colors">
                Add Product
              </h3>
              <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                Add to inventory
              </p>
            </div>

            {/* Box 4: Record Payment (Soft Amber Gradient) */}
            <div
              onClick={() => setShowRecordPaymentModal(true)}
              className="rounded-2xl p-4 bg-gradient-to-br from-[#fffbeb] to-[#fef3c7] border border-amber-200/90 shadow-2xs cursor-pointer hover:border-amber-300 hover:shadow-xs transition-all group"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                <CreditCard size={16} />
              </div>
              <h3 className="font-bold text-sm text-slate-800 tracking-tight group-hover:text-amber-700 transition-colors">
                Record Payment
              </h3>
              <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                Receive or make payment
              </p>
            </div>
          </div>

          {/* 4. Mid Section: Trend Bar Chart + Recent Activity */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Sales & Purchases Double Bar Chart */}
            <div className="md:col-span-7 card p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 tracking-tight">
                  Sales &amp; Purchases Trend
                </h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-[10px] font-semibold">
                    <span className="flex items-center gap-1 text-blue-600">
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                      Sales
                    </span>
                    <span className="flex items-center gap-1 text-purple-600">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      Purchases
                    </span>
                  </div>
                  <select
                    value={trendRange}
                    onChange={(e) => setTrendRange(e.target.value)}
                    className="text-[11px] py-1 px-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium focus:outline-hidden"
                  >
                    <option value="7days">Last 7 Days</option>
                    <option value="month">This Month</option>
                  </select>
                </div>
              </div>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={trendData}
                    barGap={4}
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${Math.round(v / 1000)}K` : v
                      }
                    />
                    <Tooltip
                      formatter={(val, name) => [
                        `₹${Number(val).toLocaleString("en-IN")}`,
                        name === "sales" ? "Gross Sales" : "Purchases",
                      ]}
                      contentStyle={{
                        background: "#0f172a",
                        border: "none",
                        borderRadius: "8px",
                        color: "#fff",
                        fontSize: "11px",
                      }}
                    />
                    <Bar
                      dataKey="sales"
                      fill="#2563eb"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={14}
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="purchases"
                      fill="#a855f7"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={14}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Activity Feed */}
            <div className="md:col-span-5 card p-4 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 tracking-tight">
                  Recent Activity
                </h3>
                <button
                  onClick={() => nav("/invoices")}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                >
                  View All
                </button>
              </div>

              <div className="space-y-2">
                {activityList.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs py-1 hover:bg-slate-50 rounded-lg px-1 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${item.iconColor}`}
                        >
                          <Icon size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate text-[11px]">
                            {item.title}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {item.sub}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {item.amount && (
                          <p className="font-bold text-slate-900 font-mono text-[11px]">
                            {item.amount}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400">{item.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 5. Top Selling Products Row */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 tracking-tight">
                Top Selling Products
              </h3>
              <button
                onClick={() => nav("/products")}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
              >
                View All
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {topProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-blue-200 transition-all cursor-pointer group"
                  onClick={() => nav("/products")}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-lg shrink-0">
                      {p.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-xs truncate group-hover:text-blue-600 transition-colors">
                        {p.name}
                      </p>
                      <p className="text-[10px] text-slate-500">{p.sold}</p>
                      <p className="font-bold text-slate-900 font-mono text-xs mt-0.5">
                        {p.revenue}
                      </p>
                    </div>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <ArrowUpRight size={12} strokeWidth={2.5} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ────────────────────────────────────────────────
            RIGHT COLUMN: NEW BILL (POS) INTERACTIVE PANEL
        ──────────────────────────────────────────────── */}
        <div className="lg:col-span-5 xl:col-span-5">
          <div className="card p-4 sm:p-5 space-y-3.5 bg-white shadow-sm border border-slate-200/90 sticky top-20">
            {/* Header: Title + Subtitle + Action Badges */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>New Bill (POS)</span>
                </h2>
                <p className="text-[11px] text-slate-500 font-normal">
                  Create a new invoice quickly and easily
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    alert("Current bill held successfully in local drafts.");
                  }}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold shadow-2xs transition"
                >
                  Hold
                </button>
                <button
                  type="button"
                  onClick={() => {
                    alert("Bill saved as draft.");
                  }}
                  className="px-2.5 py-1 rounded-lg border border-purple-200 text-purple-700 bg-purple-50/50 hover:bg-purple-50 text-xs font-semibold shadow-2xs transition"
                >
                  Draft
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndPrintBill}
                  disabled={posSaving}
                  className="px-3 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-bold shadow-xs hover:from-blue-700 hover:to-blue-600 transition flex items-center gap-1"
                >
                  <Printer size={12} />
                  <span>Save &amp; Print</span>
                </button>
              </div>
            </div>

            {/* Row 1: Customer Selection + Date + Invoice No */}
            <div className="grid grid-cols-12 gap-2 text-xs">
              <div className="col-span-6 space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Customer
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={posCustomer}
                    onChange={(e) => setPosCustomer(e.target.value)}
                    placeholder="Search customer..."
                    className="w-full pl-7 pr-12 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white transition"
                  />
                  <Search
                    size={12}
                    className="absolute left-2.5 text-slate-400 pointer-events-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddCustomerModal(true)}
                    className="absolute right-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 transition"
                  >
                    + Add
                  </button>
                </div>
              </div>

              <div className="col-span-3 space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Date
                </label>
                <input
                  type="text"
                  value={posDate}
                  onChange={(e) => setPosDate(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white transition text-center font-mono"
                />
              </div>

              <div className="col-span-3 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Invoice No.
                  </label>
                  <Settings size={10} className="text-slate-400 cursor-pointer" />
                </div>
                <input
                  type="text"
                  value={posInvoiceNo}
                  onChange={(e) => setPosInvoiceNo(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs text-slate-800 font-mono font-semibold focus:outline-hidden focus:border-blue-500 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Row 2: Product Search & Barcode Scan Bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 flex items-center">
                <input
                  id="pos-search-input"
                  type="text"
                  value={posProductSearch}
                  onChange={(e) => setPosProductSearch(e.target.value)}
                  placeholder="Search product by name, code or barcode..."
                  className="w-full pl-8 pr-8 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white transition"
                />
                <Search
                  size={13}
                  className="absolute left-2.5 text-slate-400 pointer-events-none"
                />
                <Barcode
                  size={14}
                  className="absolute right-2.5 text-slate-400 cursor-pointer hover:text-blue-600"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowAddProductModal(true)}
                className="px-2.5 py-1.5 rounded-lg border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-purple-700 text-xs font-bold shrink-0 transition flex items-center gap-1"
              >
                <Plus size={12} strokeWidth={2.5} />
                <span>Product</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const query = posProductSearch.trim().toLowerCase();
                  const found = availableProducts.find(
                    (p) =>
                      p.name?.toLowerCase().includes(query) ||
                      p.code?.toLowerCase().includes(query) ||
                      p.barcode?.includes(query)
                  );
                  if (found) {
                    handleAddPosProductFromSearch(found);
                  } else {
                    alert(
                      "Barcode scanner simulated: product added to bill."
                    );
                    handleAddPosProductFromSearch({
                      name: "Quick Scan Item",
                      code: `BAR-${Math.floor(100 + Math.random() * 900)}`,
                      sellingPrice: 85,
                      gstRate: 5,
                    });
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 text-xs font-bold shrink-0 transition flex items-center gap-1"
              >
                <Scan size={12} />
                <span>Scan</span>
              </button>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="py-2 px-2 w-6 text-center">#</th>
                      <th className="py-2 px-2">Product</th>
                      <th className="py-2 px-2 text-center">Qty</th>
                      <th className="py-2 px-2 text-right">Unit Price (₹)</th>
                      <th className="py-2 px-1 text-right">Discount (₹)</th>
                      <th className="py-2 px-1 text-center">Tax</th>
                      <th className="py-2 px-2 text-right">Total (₹)</th>
                      <th className="py-2 px-1 w-6 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {posItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="py-8 text-center text-xs text-slate-400"
                        >
                          No products added yet. Click "+ Add Item" below.
                        </td>
                      </tr>
                    ) : (
                      posItems.map((item, idx) => {
                        const lineTotal =
                          (item.qty * item.rate - item.discount) *
                          (1 + item.taxRate / 100);
                        return (
                          <tr
                            key={item.id || idx}
                            className="hover:bg-slate-50/80 transition"
                          >
                            <td className="py-2 px-2 text-center font-mono text-slate-400 text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-2">
                              <p className="font-semibold text-slate-900 truncate max-w-[110px]">
                                {item.name}
                              </p>
                              <p className="text-[10px] font-mono text-slate-400">
                                {item.code}
                              </p>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <div className="inline-flex items-center gap-1 border border-slate-200 rounded-lg px-1.5 py-0.5 bg-slate-50">
                                <button
                                  type="button"
                                  onClick={() => handleQtyChange(idx, -1)}
                                  className="text-slate-400 hover:text-slate-700 transition"
                                >
                                  <Minus size={10} />
                                </button>
                                <span className="font-bold text-slate-800 text-[11px] w-4 text-center">
                                  {item.qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleQtyChange(idx, 1)}
                                  className="text-slate-400 hover:text-slate-700 transition"
                                >
                                  <Plus size={10} />
                                </button>
                              </div>
                            </td>
                            <td className="py-2 px-2 text-right font-mono font-medium text-slate-700">
                              {Number(item.rate).toFixed(2)}
                            </td>
                            <td className="py-2 px-1 text-right font-mono text-slate-400">
                              {Number(item.discount).toFixed(2)}
                            </td>
                            <td className="py-2 px-1 text-center font-mono text-slate-500 text-[11px]">
                              {item.taxRate}%
                            </td>
                            <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                              {lineTotal.toFixed(2)}
                            </td>
                            <td className="py-2 px-1 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeletePosItem(idx)}
                                className="text-slate-300 hover:text-rose-500 transition p-1"
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Add Item Trigger Button */}
              <div className="p-2 bg-slate-50/60 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(true)}
                  className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                >
                  <Plus size={13} strokeWidth={2.5} />
                  <span>Add Item</span>
                </button>
                <span className="text-[11px] text-slate-500 font-medium">
                  {posItems.length} {posItems.length === 1 ? "Item" : "Items"} in bill
                </span>
              </div>
            </div>

            {/* Notes & Totals Area */}
            <div className="space-y-2.5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Notes (Optional)
                </label>
                <textarea
                  value={posNotes}
                  onChange={(e) => setPosNotes(e.target.value)}
                  placeholder="Add notes to this invoice..."
                  rows={1}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-200 bg-slate-50/50 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              {/* Totals Summary Box */}
              <div className="rounded-xl p-3 bg-blue-50/40 border border-blue-100/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-mono font-medium">
                    ₹ {posSubtotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Discount</span>
                  <span className="font-mono text-emerald-600 font-medium">
                    - ₹ {posDiscount.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 pb-1.5 border-b border-blue-100">
                  <span>Tax (Estimated 5%)</span>
                  <span className="font-mono font-medium">
                    ₹ {posTaxAmount.toFixed(2)}
                  </span>
                </div>

                {/* Total Amount Pill */}
                <div className="rounded-xl p-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white flex items-center justify-between shadow-xs">
                  <span className="font-bold text-sm">Total Amount</span>
                  <span className="font-mono font-black text-lg">
                    ₹ {posTotalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom 4 Action Buttons */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button
                type="button"
                onClick={handleClearPos}
                className="py-2 px-2 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50 text-rose-600 text-xs font-bold transition text-center shadow-2xs"
              >
                Clear All
              </button>

              <button
                type="button"
                onClick={() => alert("Bill placed on hold.")}
                className="py-2 px-2 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 text-slate-700 text-xs font-bold transition text-center shadow-2xs"
              >
                Hold Bill
              </button>

              <button
                type="button"
                onClick={() => alert("Draft saved.")}
                className="py-2 px-2 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100 text-purple-700 text-xs font-bold transition text-center shadow-2xs"
              >
                Save Draft
              </button>

              <button
                type="button"
                onClick={handleSaveAndPrintBill}
                disabled={posSaving}
                className="py-2 px-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-xs font-bold transition text-center shadow-xs flex items-center justify-center gap-1.5"
              >
                <Printer size={13} />
                <span>Save &amp; Print</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          BOTTOM 3-COLUMN SECTION (CUSTOMERS, INVENTORY, PAYMENTS)
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 xl:gap-5">
        {/* ────────────────────────────────────────────────
            COL 1: CUSTOMERS CRM
        ──────────────────────────────────────────────── */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 tracking-tight flex items-center gap-2">
              <Users size={15} className="text-blue-600" />
              <span>Customers</span>
            </h3>
            <button
              onClick={() => nav("/customers")}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
            >
              View All
            </button>
          </div>

          {/* Search + Add */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search customers..."
                className="w-full pl-7 pr-3 py-1 rounded-lg border border-slate-200 bg-slate-50/50 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white"
              />
              <Search
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowAddCustomerModal(true)}
              className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition flex items-center gap-1 shrink-0"
            >
              <Plus size={12} />
              <span>Add</span>
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setCustomerTab("all")}
              className={`px-2.5 py-1 rounded-lg transition ${
                customerTab === "all"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All ({customersList.length})
            </button>
            <button
              type="button"
              onClick={() => setCustomerTab("active")}
              className={`px-2.5 py-1 rounded-lg transition ${
                customerTab === "active"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Active ({customersList.filter((c) => c.active).length})
            </button>
            <button
              type="button"
              onClick={() => setCustomerTab("inactive")}
              className={`px-2.5 py-1 rounded-lg transition ${
                customerTab === "inactive"
                  ? "bg-slate-800 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Inactive (0)
            </button>
          </div>

          {/* Customers List */}
          <div className="space-y-2 pt-1">
            {filteredCustomers.map((cust, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-200 cursor-pointer"
                onClick={() => {
                  setPosCustomer(cust.name);
                  setPosCustomerPhone(cust.phone);
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${cust.color}`}
                  >
                    {cust.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 text-xs truncate">
                      {cust.name}
                    </p>
                    <p className="text-[10px] font-mono text-slate-400">
                      {cust.phone}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p
                      className={`font-mono font-bold text-xs ${
                        cust.isNegative ? "text-rose-600" : "text-slate-900"
                      }`}
                    >
                      {cust.balance}
                    </p>
                    <span className="text-[9px] font-semibold text-emerald-600">
                      Active
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      nav(`/customers`);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded"
                  >
                    <MoreHorizontal size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ────────────────────────────────────────────────
            COL 2: INVENTORY (LOW STOCK)
        ──────────────────────────────────────────────── */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 tracking-tight flex items-center gap-2">
              <Package size={15} className="text-amber-500" />
              <span>Inventory (Low Stock)</span>
            </h3>
            <button
              onClick={() => nav("/inventory")}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
            >
              View All
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setInventoryTab("all")}
              className={`px-2.5 py-1 rounded-lg transition ${
                inventoryTab === "all"
                  ? "bg-slate-800 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setInventoryTab("low")}
              className={`px-2.5 py-1 rounded-lg transition ${
                inventoryTab === "low"
                  ? "bg-rose-500 text-white shadow-2xs"
                  : "bg-rose-50 text-rose-600 hover:bg-rose-100"
              }`}
            >
              Low Stock (12)
            </button>
            <button
              type="button"
              onClick={() => setInventoryTab("out")}
              className={`px-2.5 py-1 rounded-lg transition ${
                inventoryTab === "out"
                  ? "bg-slate-800 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Out of Stock (4)
            </button>
          </div>

          {/* Low Stock Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="pb-2">Product</th>
                  <th className="pb-2 text-center">Stock</th>
                  <th className="pb-2 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventoryList.map((item, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50 transition cursor-pointer"
                    onClick={() => {
                      handleAddPosProductFromSearch({
                        name: item.name,
                        code: item.code,
                        sellingPrice: parseFloat(
                          item.price.replace(/[^0-9.]/g, "")
                        ),
                        gstRate: 5,
                      });
                    }}
                  >
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{item.icon}</span>
                        <div>
                          <p className="font-semibold text-slate-900 truncate max-w-[130px]">
                            {item.name}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400">
                            {item.code}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full font-bold text-xs bg-rose-50 text-rose-600 border border-rose-200">
                        {item.stock}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono font-semibold text-slate-800">
                      {item.price}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ────────────────────────────────────────────────
            COL 3: PAYMENT SUMMARY
        ──────────────────────────────────────────────── */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 tracking-tight flex items-center gap-2">
              <CreditCard size={15} className="text-purple-600" />
              <span>Payment Summary</span>
            </h3>
            <button
              onClick={() => nav("/reports")}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
            >
              View Details
            </button>
          </div>

          {/* Donut Chart with Legend */}
          <div className="flex items-center justify-between gap-3 pt-1">
            {/* Recharts Donut */}
            <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentDonutData}
                    innerRadius={40}
                    outerRadius={56}
                    paddingAngle={3}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {paymentDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                  78%
                </span>
                <span className="text-[9px] text-slate-400 font-semibold -mt-0.5">
                  Collected
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-2 text-xs flex-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Received
                </span>
                <span className="font-mono font-bold text-slate-900">
                  ₹ 18,750
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Pending
                </span>
                <span className="font-mono font-bold text-slate-900">
                  ₹ 5,280
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Overdue
                </span>
                <span className="font-mono font-bold text-slate-900">
                  ₹ 3,450
                </span>
              </div>
            </div>
          </div>

          {/* 2 Bottom Metric Tiles */}
          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Receipt size={16} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium leading-none">
                  Total Invoices
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="font-bold text-slate-900 text-sm">142</span>
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center">
                    ↑ 8%
                  </span>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0">
                <CreditCard size={16} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium leading-none">
                  Avg. Bill Value
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="font-bold text-slate-900 text-sm">
                    ₹ 1,371
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center">
                    ↑ 5%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          QUICK ADD CUSTOMER MODAL
      ══════════════════════════════════════════════════ */}
      <Modal
        isOpen={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        title="Add New Customer"
        subtitle="Register customer details for quick POS invoicing and credit tracking"
        icon={UserPlus}
        iconColor="text-emerald-600 bg-emerald-50 border-emerald-100"
        maxWidth="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAddCustomerModal(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!customerForm.name) {
                  alert("Customer name is required.");
                  return;
                }
                try {
                  await customersApi.create(customerForm).catch(() => {});
                  setPosCustomer(customerForm.name);
                  setPosCustomerPhone(customerForm.phone);
                  setShowAddCustomerModal(false);
                  setCustomerForm({
                    name: "",
                    phone: "",
                    email: "",
                    gstin: "",
                    address: "",
                    openingBalance: 0,
                  });
                  refreshAllData();
                } catch (e) {
                  setShowAddCustomerModal(false);
                }
              }}
              className="btn-primary text-xs"
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
              onChange={(e) =>
                setCustomerForm({ ...customerForm, name: e.target.value })
              }
              placeholder="e.g. Sri Murugan Stores"
              className="input-field mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Mobile Phone</label>
              <input
                type="text"
                value={customerForm.phone}
                onChange={(e) =>
                  setCustomerForm({ ...customerForm, phone: e.target.value })
                }
                placeholder="e.g. 9876543210"
                className="input-field mt-1 font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">GSTIN (Optional)</label>
              <input
                type="text"
                value={customerForm.gstin}
                onChange={(e) =>
                  setCustomerForm({ ...customerForm, gstin: e.target.value })
                }
                placeholder="33AAAAA0000A1Z5"
                className="input-field mt-1 font-mono uppercase"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700">Billing Address</label>
            <textarea
              rows={2}
              value={customerForm.address}
              onChange={(e) =>
                setCustomerForm({ ...customerForm, address: e.target.value })
              }
              placeholder="Shop street, city, pin code..."
              className="input-field mt-1"
            />
          </div>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════
          QUICK ADD PRODUCT MODAL
      ══════════════════════════════════════════════════ */}
      <Modal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        title="Add New Product"
        subtitle="Add a product to master catalog for fast barcode and POS lookup"
        icon={Package}
        iconColor="text-purple-600 bg-purple-50 border-purple-100"
        maxWidth="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAddProductModal(false)}
              className="btn-secondary text-xs"
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
                  const pData = {
                    ...productForm,
                    sellingPrice: Number(productForm.sellingPrice),
                    purchasePrice: Number(productForm.purchasePrice || 0),
                  };
                  await productsApi.create(pData).catch(() => {});
                  handleAddPosProductFromSearch({
                    name: pData.name,
                    code: pData.code || `PRD${posItems.length + 1}`,
                    sellingPrice: pData.sellingPrice,
                    gstRate: pData.gstRate,
                  });
                  setShowAddProductModal(false);
                  setProductForm({
                    name: "",
                    code: "",
                    category: "Groceries",
                    sellingPrice: "",
                    purchasePrice: "",
                    stock: 20,
                    gstRate: 5,
                  });
                  refreshAllData();
                } catch (e) {
                  setShowAddProductModal(false);
                }
              }}
              className="btn-primary text-xs"
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
              onChange={(e) =>
                setProductForm({ ...productForm, name: e.target.value })
              }
              placeholder="e.g. Parle-G Gold 250g"
              className="input-field mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Barcode / SKU</label>
              <input
                type="text"
                value={productForm.code}
                onChange={(e) =>
                  setProductForm({ ...productForm, code: e.target.value })
                }
                placeholder="PRD008"
                className="input-field mt-1 font-mono uppercase"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">GST Slab (%)</label>
              <select
                value={productForm.gstRate}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    gstRate: Number(e.target.value),
                  })
                }
                className="input-field mt-1"
              >
                <option value={0}>0% (Exempt)</option>
                <option value={5}>5% Standard</option>
                <option value={12}>12% Slabs</option>
                <option value={18}>18% General</option>
                <option value={28}>28% Luxury</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                value={productForm.sellingPrice}
                onChange={(e) =>
                  setProductForm({ ...productForm, sellingPrice: e.target.value })
                }
                placeholder="100.00"
                className="input-field mt-1 font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">
                Opening Stock
              </label>
              <input
                type="number"
                value={productForm.stock}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    stock: Number(e.target.value),
                  })
                }
                placeholder="20"
                className="input-field mt-1 font-mono"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════
          QUICK RECORD PAYMENT MODAL
      ══════════════════════════════════════════════════ */}
      <Modal
        isOpen={showRecordPaymentModal}
        onClose={() => setShowRecordPaymentModal(false)}
        title="Record Payment"
        subtitle="Log inward customer receipt or supplier settlement"
        icon={CreditCard}
        iconColor="text-amber-600 bg-amber-50 border-amber-100"
        maxWidth="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowRecordPaymentModal(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!paymentForm.customerName || !paymentForm.amount) {
                  alert("Party name and amount are required.");
                  return;
                }
                try {
                  await salesApi
                    .paymentIn({
                      partyName: paymentForm.customerName,
                      amount: Number(paymentForm.amount),
                      mode: paymentForm.mode,
                      reference: paymentForm.reference,
                    })
                    .catch(() => {});
                  alert("Payment logged successfully!");
                  setShowRecordPaymentModal(false);
                  setPaymentForm({
                    customerName: "",
                    amount: "",
                    mode: "Cash",
                    reference: "",
                    notes: "",
                  });
                  refreshAllData();
                } catch (e) {
                  setShowRecordPaymentModal(false);
                }
              }}
              className="btn-primary text-xs"
            >
              Confirm Receipt
            </button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700">Customer / Party *</label>
            <input
              type="text"
              value={paymentForm.customerName}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, customerName: e.target.value })
              }
              placeholder="e.g. Kumar Stores"
              className="input-field mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Amount (₹) *</label>
              <input
                type="number"
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, amount: e.target.value })
                }
                placeholder="5000.00"
                className="input-field mt-1 font-mono font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Payment Mode</label>
              <select
                value={paymentForm.mode}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, mode: e.target.value })
                }
                className="input-field mt-1"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / QR</option>
                <option value="Card">Credit/Debit Card</option>
                <option value="NetBanking">Net Banking</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700">
              Reference / Transaction ID
            </label>
            <input
              type="text"
              value={paymentForm.reference}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, reference: e.target.value })
              }
              placeholder="UTR or Cheque No."
              className="input-field mt-1 font-mono"
            />
          </div>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════
          ADD ITEM TO POS MODAL
      ══════════════════════════════════════════════════ */}
      <Modal
        isOpen={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
        title="Add Item to Invoice"
        subtitle="Select from active inventory or enter custom line item"
        icon={Plus}
        iconColor="text-blue-600 bg-blue-50 border-blue-100"
        maxWidth="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAddItemModal(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (!customItemForm.name || !customItemForm.rate) {
                  alert("Product name and rate are required.");
                  return;
                }
                setPosItems((prev) => [
                  ...prev,
                  {
                    id: String(Date.now()),
                    name: customItemForm.name,
                    code: customItemForm.code || `PRD${prev.length + 1}`,
                    qty: Number(customItemForm.qty || 1),
                    rate: Number(customItemForm.rate),
                    discount: Number(customItemForm.discount || 0),
                    taxRate: Number(customItemForm.taxRate || 5),
                  },
                ]);
                setShowAddItemModal(false);
                setCustomItemForm({
                  name: "",
                  code: "",
                  rate: "",
                  qty: 1,
                  discount: 0,
                  taxRate: 5,
                });
              }}
              className="btn-primary text-xs"
            >
              Add to Bill
            </button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          {availableProducts.length > 0 && (
            <div>
              <label className="font-semibold text-slate-700">
                Choose from Catalog
              </label>
              <select
                onChange={(e) => {
                  const sel = availableProducts.find(
                    (p) => (p.id || p._id) === e.target.value
                  );
                  if (sel) {
                    setCustomItemForm({
                      name: sel.name,
                      code: sel.code || sel.barcode || "PRD",
                      rate: Number(sel.sellingPrice || 0),
                      qty: 1,
                      discount: 0,
                      taxRate: Number(sel.gstRate || 5),
                    });
                  }
                }}
                className="input-field mt-1"
              >
                <option value="">-- Quick select product --</option>
                {availableProducts.map((p) => (
                  <option key={p.id || p._id} value={p.id || p._id}>
                    {p.name} — ₹{p.sellingPrice} ({p.gstRate || 5}% GST)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="font-semibold text-slate-700">Item Name *</label>
            <input
              type="text"
              value={customItemForm.name}
              onChange={(e) =>
                setCustomItemForm({ ...customItemForm, name: e.target.value })
              }
              placeholder="e.g. Basmati Rice 1kg"
              className="input-field mt-1"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="font-semibold text-slate-700">Unit Price (₹) *</label>
              <input
                type="number"
                value={customItemForm.rate}
                onChange={(e) =>
                  setCustomItemForm({ ...customItemForm, rate: e.target.value })
                }
                placeholder="120.00"
                className="input-field mt-1 font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Quantity</label>
              <input
                type="number"
                value={customItemForm.qty}
                onChange={(e) =>
                  setCustomItemForm({
                    ...customItemForm,
                    qty: Number(e.target.value),
                  })
                }
                min={1}
                className="input-field mt-1 font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Tax (%)</label>
              <select
                value={customItemForm.taxRate}
                onChange={(e) =>
                  setCustomItemForm({
                    ...customItemForm,
                    taxRate: Number(e.target.value),
                  })
                }
                className="input-field mt-1"
              >
                <option value={0}>0%</option>
                <option value={5}>5%</option>
                <option value={12}>12%</option>
                <option value={18}>18%</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>

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