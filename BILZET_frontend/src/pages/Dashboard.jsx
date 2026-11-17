import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  RefreshCw,
  UserPlus,
  PackagePlus,
  CreditCard,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Copy,
  Check,
  ShoppingCart,
  Receipt,
  ExternalLink,
  MessageSquare,
  BarChart3,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  ArrowRight,
  Search,
  Building2,
  Eye,
  Share2,
  Wallet,
  Boxes,
  FileSpreadsheet,
  Scale,
  ShoppingBag,
  CheckSquare,
  Paperclip,
  QrCode,
  Phone,
  Filter,
  X,
  ChevronRight,
  Shield,
  HelpCircle,
  Package,
  Users,
} from "lucide-react";
import {
  dashboardApi,
  settingsApi,
  productsApi,
  customersApi,
  salesApi,
  caConnectApi,
  expensesApi,
} from "../api";
import { mockDashboardData } from "../api/mockData";
import { useAuth } from "../store/auth";
import Modal from "../components/common/Modal";
import TaxInvoice from "../components/invoice/TaxInvoice";
import UpiPaymentModal from "../components/payment/UpiPaymentModal";
import useRealtimeSync from "../hooks/useRealtimeSync";
import { useStore } from "../store/storeContext";
import {
  formatCurrencyINR,
  calculateProductPriceBreakdown,
} from "../utils/taxCalculation";

export default function Dashboard() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { currentStore } = useStore();

  // Primary API Data State
  const [data, setData] = useState(mockDashboardData);
  const [shopSettings, setShopSettings] = useState(() => {
    try {
      const savedLocal = localStorage.getItem("bilzet_invoice_settings");
      if (savedLocal) return JSON.parse(savedLocal);
    } catch (e) {}
    return {
      shopName: "Garden Greens",
      ownerName: "Store Owner",
      phone: "+91 98765 43210",
      email: "billing@gardengreens.app",
      address: "123 Commercial Plaza, Main Market",
      gstin: "33ABCDE1234F1Z5",
      state: "Tamil Nadu",
    };
  });

  const [availableProducts, setAvailableProducts] = useState([]);
  const [availableCustomers, setAvailableCustomers] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [gstCopied, setGstCopied] = useState(false);

  // Time & Filter States
  const [dateRange, setDateRange] = useState("month"); // 'today' | 'week' | 'month' | 'year'
  const [chartMetric, setChartMetric] = useState("all"); // 'all' | 'sales' | 'collections'
  const [invoiceFilter, setInvoiceFilter] = useState("ALL"); // 'ALL' | 'PAID' | 'UNPAID' | 'PENDING' | 'PARTIAL' | 'RETURNED'
  const [invoiceSearch, setInvoiceSearch] = useState("");

  // Modals State
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [upiModalInvoice, setUpiModalInvoice] = useState(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState(null);
  const [resolvingDiscrepancy, setResolvingDiscrepancy] = useState(false);

  // Quick Action Forms
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
    unit: "piece",
    pricingMethod: "INCLUSIVE",
    isTaxInclusive: true,
  });

  const [expenseForm, setExpenseForm] = useState({
    title: "",
    category: "Vendor Purchases",
    amount: "",
    paymentMode: "UPI",
    notes: "",
  });

  const productPriceBreakdown = useMemo(() => {
    return calculateProductPriceBreakdown({
      sellingPrice: productForm.sellingPrice,
      gstRate: productForm.gstRate,
      pricingMethod: productForm.pricingMethod || "INCLUSIVE",
    });
  }, [productForm.sellingPrice, productForm.gstRate, productForm.pricingMethod]);

  // Load Real Data from APIs
  const refreshAllData = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const [dashRes, prodsRes, custsRes, settRes, salesRes, discRes] = await Promise.allSettled([
        dashboardApi.get(),
        productsApi.list({ limit: 50 }),
        customersApi.list({ limit: 50 }),
        settingsApi.get(),
        salesApi.list({ limit: 12 }),
        caConnectApi.getDiscrepancies().catch(() => null),
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
      if (discRes.status === "fulfilled" && discRes.value?.discrepancies) {
        const openDisc = (discRes.value.discrepancies || []).filter(
          (d) => !["RESOLVED", "CLOSED", "APPROVED"].includes((d.status || "").toUpperCase())
        );
        setDiscrepancies(openDisc);
      }
      if (settRes.status === "fulfilled" && settRes.value) {
        try {
          const unwrappedBackend = settRes.value?.settings || settRes.value;
          const localSaved = localStorage.getItem("bilzet_invoice_settings");
          const rawLocal = localSaved ? JSON.parse(localSaved) : {};
          const parsedLocal = rawLocal?.settings ? { ...rawLocal, ...rawLocal.settings } : rawLocal;
          setShopSettings({ ...unwrappedBackend, ...parsedLocal });
        } catch (e) {
          setShopSettings(settRes.value?.settings || settRes.value);
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

  useRealtimeSync({
    onEvent: (type) => {
      if (
        type === "SALE_CREATED" ||
        type === "INVOICE_CREATED" ||
        type === "PURCHASE_CREATED" ||
        type === "EXPENSE_CREATED" ||
        type === "CUSTOMER_CREATED" ||
        type === "CUSTOMER_UPDATED" ||
        type === "PRODUCT_CREATED" ||
        type === "PRODUCT_UPDATED" ||
        type === "PAYMENT_RECORDED" ||
        type === "RETURN_PROCESSED" ||
        type === "INVOICE_VOIDED" ||
        type === "STOCK_ADJUSTED" ||
        type === "INVOICE_CORRECTION_APPLIED" ||
        type === "CA_DISCREPANCY_FLAGGED" ||
        type === "CA_DISCREPANCY_RESOLVED"
      ) {
        refreshAllData();
      }
    },
  });

  const storeDisplayName = currentStore?.name || shopSettings.shopName || "Garden Greens";
  const storeDisplayGstin = currentStore?.gstin || shopSettings.gstin || "33ABCDE1234F1Z5";

  // Copy GSTIN helper
  const handleCopyGstin = () => {
    navigator.clipboard.writeText(storeDisplayGstin);
    setGstCopied(true);
    setTimeout(() => setGstCopied(false), 2000);
  };

  // WhatsApp helper
  const handleWhatsAppShare = (inv) => {
    const custPhone = (inv.customer?.phone || "").replace(/\D/g, "");
    const amount = Number(inv.grandTotal || inv.totalAmount || 0).toLocaleString("en-IN");
    const invNo = inv.invoiceNumber || "INV-001";
    const msg = `Namaste ${inv.customer?.name || "Customer"}, your tax invoice #${invNo} from ${storeDisplayName} for ₹${amount} is ready. Thank you for doing business with us!`;
    if (custPhone && custPhone.length >= 10) {
      window.open(`https://wa.me/91${custPhone.slice(-10)}?text=${encodeURIComponent(msg)}`, "_blank");
    } else {
      navigator.clipboard.writeText(msg);
      alert(`Invoice WhatsApp message copied to clipboard:\n\n${msg}`);
    }
  };

  // Quick Add Customer Handler
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!customerForm.name.trim()) {
      alert("Customer name is required.");
      return;
    }
    try {
      await customersApi.create(customerForm);
      setShowAddCustomerModal(false);
      setCustomerForm({ name: "", phone: "", email: "", gstin: "", address: "", openingBalance: 0 });
      refreshAllData();
    } catch (err) {
      alert(err.message || "Failed to create customer");
    }
  };

  // Quick Add Product Handler
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      alert("Product name is required.");
      return;
    }
    try {
      await productsApi.create({
        ...productForm,
        sellingPrice: Number(productForm.sellingPrice || 0),
        purchasePrice: Number(productForm.purchasePrice || 0),
        stock: Number(productForm.stock || 0),
        taxableValue: productPriceBreakdown.taxableValue,
        gstAmount: productPriceBreakdown.gstAmount,
      });
      setShowAddProductModal(false);
      setProductForm({
        name: "",
        code: "",
        category: "General",
        sellingPrice: "",
        purchasePrice: "",
        stock: 20,
        gstRate: 5,
        unit: "piece",
        pricingMethod: "INCLUSIVE",
        isTaxInclusive: true,
      });
      refreshAllData();
    } catch (err) {
      alert(err.message || "Failed to create product");
    }
  };

  // Quick Add Expense Handler
  const handleCreateExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.title.trim() || !expenseForm.amount) {
      alert("Title and Amount are required.");
      return;
    }
    try {
      await expensesApi.create({
        ...expenseForm,
        amount: Number(expenseForm.amount || 0),
        date: new Date().toISOString(),
      });
      setShowAddExpenseModal(false);
      setExpenseForm({
        title: "",
        category: "Vendor Purchases",
        amount: "",
        paymentMode: "UPI",
        notes: "",
      });
      refreshAllData();
    } catch (err) {
      alert(err.message || "Failed to record expense");
    }
  };

  // Resolve Discrepancy Handler
  const handleResolveDiscrepancy = async (disc) => {
    setResolvingDiscrepancy(true);
    try {
      await caConnectApi.resolveDiscrepancy(disc.id || disc._id, {
        resolution: "ACCEPTED_BY_BUSINESS",
        notes: "Approved by store owner from dashboard control room.",
      });
      setSelectedDiscrepancy(null);
      refreshAllData();
    } catch (err) {
      alert(err.message || "Could not resolve discrepancy");
    } finally {
      setResolvingDiscrepancy(false);
    }
  };

  // Formatted Recent Sales list with realistic fallbacks
  const displayedSales = useMemo(() => {
    if (recentSales.length > 0) return recentSales;
    return [
      {
        id: "s1",
        invoiceNumber: "INV-2026-088",
        customer: { name: "Anand Textiles", phone: "9840112233" },
        paymentStatus: "PAID",
        paymentMode: "UPI",
        grandTotal: 34500,
        cgst: 1552.5,
        sgst: 1552.5,
        razorpayVerified: true,
        archivedDays: 4,
        createdAt: new Date().toISOString(),
      },
      {
        id: "s2",
        invoiceNumber: "INV-2026-087",
        customer: { name: "Sri Murugan Stores", phone: "9876543210" },
        paymentStatus: "PARTIALLY_PAID",
        paymentMode: "Bank Transfer",
        grandTotal: 68400,
        cgst: 3078,
        sgst: 3078,
        razorpayVerified: false,
        archivedDays: 12,
        createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
      },
      {
        id: "s3",
        invoiceNumber: "INV-2026-086",
        customer: { name: "Ramesh Hardware & Tools", phone: "9444123456" },
        paymentStatus: "UNPAID",
        paymentMode: "Credit (Khata)",
        grandTotal: 18250,
        cgst: 821.25,
        sgst: 821.25,
        razorpayVerified: false,
        archivedDays: 18,
        createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
      },
      {
        id: "s4",
        invoiceNumber: "INV-2026-085",
        customer: { name: "Selvi Supermarket", phone: "9988776655" },
        paymentStatus: "PAID",
        paymentMode: "Razorpay POS",
        grandTotal: 42300,
        cgst: 1903.5,
        sgst: 1903.5,
        razorpayVerified: true,
        archivedDays: 22,
        createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
      },
      {
        id: "s5",
        invoiceNumber: "INV-2026-084",
        customer: { name: "Kumar Agencies", phone: "9123456780" },
        paymentStatus: "RETURNED",
        paymentMode: "Credit Note Issued",
        grandTotal: 12400,
        cgst: 558,
        sgst: 558,
        razorpayVerified: true,
        archivedDays: 31,
        createdAt: new Date(Date.now() - 72 * 3600000).toISOString(),
      },
    ];
  }, [recentSales]);

  // Filtered Invoices for Table
  const filteredInvoices = useMemo(() => {
    return displayedSales.filter((inv) => {
      const matchesSearch =
        !invoiceSearch.trim() ||
        (inv.invoiceNumber || "").toLowerCase().includes(invoiceSearch.toLowerCase()) ||
        (inv.customer?.name || "").toLowerCase().includes(invoiceSearch.toLowerCase());

      if (!matchesSearch) return false;
      if (invoiceFilter === "ALL") return true;
      const statusUpper = (inv.paymentStatus || "").toUpperCase();
      if (invoiceFilter === "PAID") return statusUpper === "PAID";
      if (invoiceFilter === "UNPAID") return statusUpper === "UNPAID";
      if (invoiceFilter === "PENDING") return statusUpper === "PENDING";
      if (invoiceFilter === "PARTIAL") return statusUpper === "PARTIALLY_PAID" || statusUpper === "PARTIAL";
      if (invoiceFilter === "RETURNED") return statusUpper === "RETURNED" || statusUpper === "VOID";
      return true;
    });
  }, [displayedSales, invoiceFilter, invoiceSearch]);

  // Dynamic Sales Analytics Chart Data
  const chartData = useMemo(() => {
    if (dateRange === "today") {
      return [
        { label: "9 AM", sales: 8400, collections: 7200, expenses: 1500 },
        { label: "11 AM", sales: 24500, collections: 21000, expenses: 3200 },
        { label: "1 PM", sales: 42000, collections: 38000, expenses: 6800 },
        { label: "3 PM", sales: 31000, collections: 29500, expenses: 2400 },
        { label: "5 PM", sales: 58000, collections: 51200, expenses: 4500 },
        { label: "7 PM", sales: 74500, collections: 68000, expenses: 5100 },
        { label: "9 PM", sales: 38200, collections: 35000, expenses: 2200 },
      ];
    }
    if (dateRange === "week") {
      return [
        { label: "Mon", sales: 145000, collections: 128000, expenses: 42000 },
        { label: "Tue", sales: 168000, collections: 152000, expenses: 38000 },
        { label: "Wed", sales: 192000, collections: 174000, expenses: 51000 },
        { label: "Thu", sales: 178000, collections: 160000, expenses: 46000 },
        { label: "Fri", sales: 224000, collections: 201000, expenses: 59000 },
        { label: "Sat", sales: 286000, collections: 262000, expenses: 68000 },
        { label: "Sun", sales: 212000, collections: 198000, expenses: 44000 },
      ];
    }
    if (dateRange === "year") {
      return [
        { label: "Apr", sales: 940000, collections: 820000, expenses: 310000 },
        { label: "May", sales: 1050000, collections: 940000, expenses: 340000 },
        { label: "Jun", sales: 1120000, collections: 990000, expenses: 380000 },
        { label: "Jul", sales: 1080000, collections: 960000, expenses: 360000 },
        { label: "Aug", sales: 1190000, collections: 1050000, expenses: 390000 },
        { label: "Sep", sales: 1245850, collections: 1120000, expenses: 420000 },
        { label: "Oct", sales: 1310000, collections: 1190000, expenses: 440000 },
        { label: "Nov", sales: 1280000, collections: 1150000, expenses: 430000 },
        { label: "Dec", sales: 1420000, collections: 1290000, expenses: 480000 },
        { label: "Jan", sales: 1380000, collections: 1240000, expenses: 460000 },
        { label: "Feb", sales: 1440000, collections: 1310000, expenses: 470000 },
        { label: "Mar", sales: 1560000, collections: 1420000, expenses: 510000 },
      ];
    }
    // Default: 'month' (4 Weeks)
    return [
      { label: "Week 1", sales: 285000, collections: 248000, expenses: 84000 },
      { label: "Week 2", sales: 315000, collections: 279000, expenses: 98000 },
      { label: "Week 3", sales: 342000, collections: 305000, expenses: 112000 },
      { label: "Week 4", sales: 303850, collections: 248000, expenses: 126000 },
    ];
  }, [dateRange]);

  // Activity Feed Items
  const activityItems = [
    {
      id: "act-1",
      title: "Tax Invoice #INV-2026-088 Generated",
      desc: "₹34,500.00 to Anand Textiles via UPI QR",
      time: "10 mins ago",
      icon: FileText,
      color: "bg-[#12151C] text-[#5BF07B] border-[#12151C]",
    },
    {
      id: "act-2",
      title: "Khata Payment Received",
      desc: "₹25,000.00 from Sri Murugan Stores via NEFT",
      time: "42 mins ago",
      icon: CheckCircle2,
      color: "bg-[#DFFFE6] text-[#0E2A16] border-[#5BF07B]/40",
    },
    {
      id: "act-3",
      title: "GSTR-2B Auto-Reconciled",
      desc: "142 invoices matched with ITC portal, ₹36,400 confirmed",
      time: "2 hours ago",
      icon: ShieldCheck,
      color: "bg-white text-[#111318] border-[#E7E8EC]",
    },
    {
      id: "act-4",
      title: "Purchase Bill PO-2026-042 Logged",
      desc: "₹18,500.00 from ITC Agrotech • Stock updated",
      time: "4 hours ago",
      icon: ShoppingBag,
      color: "bg-[#FAFAFB] text-[#7C7F8A] border-[#E7E8EC]",
    },
    {
      id: "act-5",
      title: "CA Ramanathan Synced Audit Notes",
      desc: "Return invoices verified for Q2 filing",
      time: "Yesterday",
      icon: MessageSquare,
      color: "bg-[#12151C] text-white border-[#12151C]",
    },
  ];

  return (
    <div className="min-h-screen bg-[#E3E3E5] text-[#111318] p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 font-sans antialiased selection:bg-[#5BF07B] selection:text-[#0E2A16]">
      {/* ═════════════════════════════════════════════════════════════════
          1. HERO COMMAND CENTER: "Your Business at a Glance"
      ═════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-[28px] border border-[#E7E8EC] bg-[#F6F6F8] p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
        <div className="relative z-10 space-y-6">
          {/* Top Bar inside Hero: Brand, Status, Business Switcher, Filter & Refresh */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white text-[#111318] border border-[#E7E8EC] shadow-xs">
                  <Sparkles size={12} className="text-[#111318]" />
                  <span>BILZET Smart Finance v2.4</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-[#DFFFE6] text-[#0E2A16] border border-[#5BF07B]/40 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-[#5BF07B] animate-pulse" />
                  <span>GSTN &amp; CA Live Sync Active</span>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111318] tracking-tight font-['Manrope',sans-serif]">
                Your Business at a Glance
              </h1>
              <p className="text-xs sm:text-sm text-[#7C7F8A] font-medium max-w-xl">
                Comprehensive real-time ledger, GST compliance control room, and automated inventory sync.
              </p>
            </div>

            {/* Right Controls: Business Selector Badge, Date Filter & Refresh */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Business Selector Badge with GSTIN Copy */}
              <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white border border-[#E7E8EC] shadow-xs">
                <div className="w-7 h-7 rounded-full bg-[#12151C] text-[#5BF07B] flex items-center justify-center font-bold text-xs shrink-0">
                  <Building2 size={14} />
                </div>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-xs font-bold text-[#111318] truncate max-w-[140px]">
                    {storeDisplayName}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono text-[#7C7F8A]">
                      {storeDisplayGstin}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyGstin}
                      className="text-[#7C7F8A] hover:text-[#111318] cursor-pointer"
                      title="Copy GSTIN"
                    >
                      {gstCopied ? <Check size={11} className="text-[#5BF07B]" /> : <Copy size={11} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Date Filter Pills */}
              <div className="inline-flex p-1 rounded-full bg-white border border-[#E7E8EC] shadow-xs">
                {[
                  { key: "today", label: "Today" },
                  { key: "week", label: "Week" },
                  { key: "month", label: "Month" },
                  { key: "year", label: "FY 26-27" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setDateRange(tab.key)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      dateRange === tab.key
                        ? "bg-[#12151C] text-white shadow-xs"
                        : "text-[#7C7F8A] hover:text-[#111318] hover:bg-[#F6F6F8]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Refresh Sync Button */}
              <button
                type="button"
                onClick={() => refreshAllData(true)}
                disabled={isRefreshing}
                className="w-9 h-9 rounded-full bg-white hover:bg-[#FAFAFB] text-[#111318] border border-[#E7E8EC] flex items-center justify-center shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                title="Refresh All Records"
              >
                <RefreshCw size={15} className={isRefreshing ? "animate-spin text-[#111318]" : ""} />
              </button>
            </div>
          </div>

          {/* Central Highlight: Big Financial Headline & 4 Summary Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center pt-2">
            {/* Left Col: Big Total Revenue Metric */}
            <div className="lg:col-span-5 bg-white rounded-[24px] p-6 border border-[#E7E8EC] shadow-xs space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#7C7F8A] block">
                Total Net Revenue ({dateRange === "today" ? "Today" : dateRange === "week" ? "This Week" : dateRange === "year" ? "Fiscal Year" : "This Month"})
              </span>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-extrabold text-[#111318] font-['Manrope',sans-serif] tracking-tight">
                  ₹12,45,850.00
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold bg-[#DFFFE6] text-[#0E2A16] border border-[#5BF07B]/40">
                  <TrendingUp size={12} className="text-[#0E2A16]" />
                  +12.8%
                </span>
              </div>
              <p className="text-xs text-[#7C7F8A] font-medium">
                Collections: <span className="font-bold text-[#111318]">₹10,80,000.00</span> • Realized: <span className="font-bold text-[#0E2A16] bg-[#DFFFE6] px-1.5 py-0.5 rounded-full">86.7%</span>
              </p>
            </div>

            {/* Right Col: 4 Quick Summary Badges */}
            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Tile 1: Net Profit */}
              <div className="bg-white rounded-[20px] p-4 border border-[#E7E8EC] shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C7F8A]">Net Profit</span>
                  <div className="w-6 h-6 rounded-full bg-[#DFFFE6] text-[#0E2A16] flex items-center justify-center">
                    <TrendingUp size={12} />
                  </div>
                </div>
                <p className="text-base sm:text-lg font-bold text-[#111318] font-['Manrope',sans-serif]">
                  ₹3,18,420
                </p>
                <span className="text-[10px] font-bold text-[#0E2A16] block">
                  25.5% Margin
                </span>
              </div>

              {/* Tile 2: Total Invoices */}
              <div className="bg-white rounded-[20px] p-4 border border-[#E7E8EC] shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C7F8A]">Invoices</span>
                  <div className="w-6 h-6 rounded-full bg-[#FAFAFB] text-[#111318] border border-[#E7E8EC] flex items-center justify-center">
                    <FileText size={12} />
                  </div>
                </div>
                <p className="text-base sm:text-lg font-bold text-[#111318] font-['Manrope',sans-serif]">
                  142 Bills
                </p>
                <span className="text-[10px] font-medium text-[#7C7F8A] block">
                  AOV ₹8,773
                </span>
              </div>

              {/* Tile 3: Pending Receivables */}
              <div className="bg-white rounded-[20px] p-4 border border-[#E7E8EC] shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C7F8A]">Receivables</span>
                  <div className="w-6 h-6 rounded-full bg-[#12151C] text-[#5BF07B] flex items-center justify-center">
                    <CreditCard size={12} />
                  </div>
                </div>
                <p className="text-base sm:text-lg font-bold text-[#111318] font-['Manrope',sans-serif]">
                  ₹3,86,210
                </p>
                <span className="text-[10px] font-bold text-[#E5484D] block">
                  ₹1.12L Overdue
                </span>
              </div>

              {/* Tile 4: Stock Valuation */}
              <div className="bg-white rounded-[20px] p-4 border border-[#E7E8EC] shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C7F8A]">Stock Value</span>
                  <div className="w-6 h-6 rounded-full bg-[#FAFAFB] text-[#111318] border border-[#E7E8EC] flex items-center justify-center">
                    <Boxes size={12} />
                  </div>
                </div>
                <p className="text-base sm:text-lg font-bold text-[#111318] font-['Manrope',sans-serif]">
                  ₹6,25,000
                </p>
                <span className="text-[10px] font-medium text-[#7C7F8A] block">
                  8 Low Items
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions Row */}
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#E7E8EC]">
            <button
              type="button"
              onClick={() => nav("/billing")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#12151C] hover:bg-black active:scale-95 text-white font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
            >
              <Plus size={16} className="text-[#5BF07B]" strokeWidth={2.5} />
              <span>Create Invoice</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-mono font-bold text-[#5BF07B]">
                F2
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => setShowAddExpenseModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white hover:bg-[#FAFAFB] text-[#111318] border border-[#E7E8EC] font-semibold text-xs transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Wallet size={15} className="text-[#111318]" />
              <span>Add Expense</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddCustomerModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white hover:bg-[#FAFAFB] text-[#111318] border border-[#E7E8EC] font-semibold text-xs transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <UserPlus size={15} className="text-[#111318]" />
              <span>Add Customer</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddProductModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white hover:bg-[#FAFAFB] text-[#111318] border border-[#E7E8EC] font-semibold text-xs transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <PackagePlus size={15} className="text-[#111318]" />
              <span>Add Product</span>
            </button>

            <button
              type="button"
              onClick={() => nav("/ca-connect")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white hover:bg-[#FAFAFB] text-[#111318] border border-[#E7E8EC] font-semibold text-xs transition-all shadow-xs cursor-pointer active:scale-95 ml-auto"
            >
              <BriefcaseIcon />
              <span>CA Collaboration</span>
              <ArrowRight size={13} className="text-[#7C7F8A]" />
            </button>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════
          2. FOUR BENTO METRIC CARDS (KEEL FINTECH BENTO STYLE)
      ═════════════════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Sales */}
        <div className="bg-[#F6F6F8] rounded-[28px] p-6 border border-[#E7E8EC] shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_14px_38px_rgba(0,0,0,0.09)] transition-all space-y-4 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-full bg-white text-[#111318] flex items-center justify-center font-bold border border-[#E7E8EC] shadow-xs">
              <TrendingUp size={20} />
            </div>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-[#DFFFE6] text-[#0E2A16]">
              +12.8%
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-[#7C7F8A] uppercase tracking-wider">
              Total Sales
            </p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#111318] font-['Manrope',sans-serif] tracking-tight">
              ₹12.45 L
            </h3>
            <p className="text-[11px] text-[#7C7F8A]">
              142 invoices generated in active cycle
            </p>
          </div>

          {/* Micro trend visual */}
          <div className="pt-2 border-t border-[#E7E8EC] flex items-center justify-between text-xs text-[#7C7F8A]">
            <span>Realized: ₹10.80L</span>
            <span className="font-semibold text-[#0E2A16] bg-[#DFFFE6] px-2 py-0.5 rounded-full">86.7% Paid</span>
          </div>
        </div>

        {/* Card 2: Total Receivables */}
        <div className="bg-[#F6F6F8] rounded-[28px] p-6 border border-[#E7E8EC] shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_14px_38px_rgba(0,0,0,0.09)] transition-all space-y-4 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-full bg-white text-[#111318] flex items-center justify-center font-bold border border-[#E7E8EC] shadow-xs">
              <CreditCard size={20} />
            </div>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-[#FBD3D3] text-[#E5484D]">
              ₹1.12L Overdue
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-[#7C7F8A] uppercase tracking-wider">
              Total Receivables (Khata)
            </p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#111318] font-['Manrope',sans-serif] tracking-tight">
              ₹3.86 L
            </h3>
            <p className="text-[11px] text-[#7C7F8A]">
              Across 22 customer ledger accounts
            </p>
          </div>

          <div className="pt-2 border-t border-[#E7E8EC] flex items-center justify-between text-xs">
            <span className="text-[#7C7F8A]">4 accounts &gt; 30 days</span>
            <button
              type="button"
              onClick={() => nav("/customers")}
              className="font-bold text-[#111318] hover:underline cursor-pointer"
            >
              View Khata →
            </button>
          </div>
        </div>

        {/* Card 3: GST Liability - SIGNATURE DARK CONTRAST CARD */}
        <div className="bg-[#12151C] text-white rounded-[28px] p-6 border border-[#232733] shadow-[0_8px_30px_rgba(0,0,0,0.14)] hover:shadow-[0_14px_38px_rgba(0,0,0,0.2)] transition-all space-y-4 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-full bg-white/10 text-[#5BF07B] flex items-center justify-center font-bold border border-white/10 shadow-xs">
              <Scale size={20} />
            </div>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-[#5BF07B] text-[#0E2A16]">
              GSTR-3B Ready
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-[#A9ABB5] uppercase tracking-wider">
              Net GST Liability
            </p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-['Manrope',sans-serif] tracking-tight">
              ₹84,250
            </h3>
            <p className="text-[11px] text-[#7C7F8A]">
              CGST: ₹42,125 • SGST: ₹42,125
            </p>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-[#A9ABB5]">ITC: ₹38,600</span>
            <span className="font-bold text-[#5BF07B]">Due 20th Nov</span>
          </div>
        </div>

        {/* Card 4: Inventory Valuation */}
        <div className="bg-[#F6F6F8] rounded-[28px] p-6 border border-[#E7E8EC] shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_14px_38px_rgba(0,0,0,0.09)] transition-all space-y-4 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-full bg-white text-[#111318] flex items-center justify-center font-bold border border-[#E7E8EC] shadow-xs">
              <Boxes size={20} />
            </div>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-white text-[#7C7F8A] border border-[#E7E8EC]">
              8 Low Stock
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-[#7C7F8A] uppercase tracking-wider">
              Inventory Value
            </p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#111318] font-['Manrope',sans-serif] tracking-tight">
              ₹6.25 L
            </h3>
            <p className="text-[11px] text-[#7C7F8A]">
              156 SKUs in 2 Warehouses
            </p>
          </div>

          <div className="pt-2 border-t border-[#E7E8EC] flex items-center justify-between text-xs">
            <span className="text-[#7C7F8A] font-medium">148 In Stock</span>
            <button
              type="button"
              onClick={() => nav("/inventory")}
              className="font-bold text-[#111318] hover:underline cursor-pointer"
            >
              Restock →
            </button>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════
          3. SALES PERFORMANCE & CASH TRENDS (COMPOSED CHART)
      ═════════════════════════════════════════════════════════════════ */}
      <section className="bg-[#F6F6F8] rounded-[28px] border border-[#E7E8EC] p-6 sm:p-7 shadow-[0_8px_30px_rgba(0,0,0,0.06)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-[#111318] font-['Manrope',sans-serif]">
                Sales Performance &amp; Cash Flow
              </h2>
              <span className="px-3 py-0.5 rounded-full text-[10px] font-bold bg-white text-[#111318] border border-[#E7E8EC]">
                Live Stream
              </span>
            </div>
            <p className="text-xs text-[#7C7F8A]">
              Inflow vs Collections vs Outflow analysis across current billing cycle
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Chart Metric Filter */}
            <div className="flex items-center gap-1 p-1 rounded-full bg-white border border-[#E7E8EC] text-xs">
              <button
                type="button"
                onClick={() => setChartMetric("all")}
                className={`px-3 py-1 rounded-full font-semibold transition ${
                  chartMetric === "all" ? "bg-[#12151C] text-white shadow-xs" : "text-[#7C7F8A] hover:text-[#111318]"
                }`}
              >
                All Metrics
              </button>
              <button
                type="button"
                onClick={() => setChartMetric("sales")}
                className={`px-3 py-1 rounded-full font-semibold transition ${
                  chartMetric === "sales" ? "bg-[#12151C] text-white shadow-xs" : "text-[#7C7F8A] hover:text-[#111318]"
                }`}
              >
                Sales Only
              </button>
              <button
                type="button"
                onClick={() => setChartMetric("collections")}
                className={`px-3 py-1 rounded-full font-semibold transition ${
                  chartMetric === "collections" ? "bg-[#12151C] text-white shadow-xs" : "text-[#7C7F8A] hover:text-[#111318]"
                }`}
              >
                Collections
              </button>
            </div>

            {/* Legend Chips */}
            <div className="hidden lg:flex items-center gap-3 text-xs text-[#7C7F8A]">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-[#5BF07B]" />
                Sales (₹)
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-[#111318]" />
                Collections (₹)
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C3C5CE]" />
                Expenses (₹)
              </span>
            </div>
          </div>
        </div>

        {/* Recharts Composed Chart */}
        <div className="h-72 sm:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E8EC" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#7C7F8A", fontSize: 11, fontWeight: 500 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#7C7F8A", fontSize: 11, fontWeight: 500 }}
                tickFormatter={(v) => `₹${v >= 100000 ? (v / 100000).toFixed(1) + "L" : (v / 1000).toFixed(0) + "k"}`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  return (
                    <div className="bg-[#12151C] text-white rounded-[20px] p-3 shadow-xl border border-[#232733] text-xs space-y-1.5 min-w-[160px]">
                      <p className="font-bold text-white border-b border-white/10 pb-1">{label}</p>
                      {payload.map((entry, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-1.5 text-[#A9ABB5]">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            {entry.name === "sales" ? "Sales" : entry.name === "collections" ? "Collections" : "Expenses"}
                          </span>
                          <span className="font-bold font-mono text-[#5BF07B]">
                            ₹{Number(entry.value).toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              {(chartMetric === "all" || chartMetric === "sales") && (
                <Bar
                  dataKey="sales"
                  name="sales"
                  fill="#5BF07B"
                  radius={[6, 6, 0, 0]}
                  barSize={dateRange === "year" ? 14 : 24}
                />
              )}
              {(chartMetric === "all" || chartMetric === "collections") && (
                <Bar
                  dataKey="collections"
                  name="collections"
                  fill="#111318"
                  radius={[6, 6, 0, 0]}
                  barSize={dateRange === "year" ? 14 : 24}
                />
              )}
              {chartMetric === "all" && (
                <Line
                  type="monotone"
                  dataKey="expenses"
                  name="expenses"
                  stroke="#7C7F8A"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#7C7F8A", stroke: "#FFFFFF", strokeWidth: 2 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* 3 Analytics Footnotes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-[#E7E8EC]">
          <div className="flex items-center gap-3 p-3 rounded-[20px] bg-white border border-[#E7E8EC]">
            <div className="w-8 h-8 rounded-full bg-[#FAFAFB] text-[#111318] border border-[#E7E8EC] flex items-center justify-center shrink-0">
              <Sparkles size={15} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-[#7C7F8A]">Peak Sales Period</p>
              <p className="text-xs font-bold text-[#111318]">Saturdays &amp; Festive Eves (₹2.86L)</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-[20px] bg-white border border-[#E7E8EC]">
            <div className="w-8 h-8 rounded-full bg-[#DFFFE6] text-[#0E2A16] flex items-center justify-center shrink-0">
              <CheckCircle2 size={15} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-[#7C7F8A]">Digital Payment Ratio</p>
              <p className="text-xs font-bold text-[#111318]">68% UPI &amp; Cards • 32% Cash</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-[20px] bg-white border border-[#E7E8EC]">
            <div className="w-8 h-8 rounded-full bg-[#FAFAFB] text-[#111318] border border-[#E7E8EC] flex items-center justify-center shrink-0">
              <BarChart3 size={15} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-[#7C7F8A]">Average Order Value</p>
              <p className="text-xs font-bold text-[#111318]">₹8,773 / Transaction</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════
          4. GST CONTROL ROOM & COMPLIANCE CENTER
      ═════════════════════════════════════════════════════════════════ */}
      <section className="bg-[#F6F6F8] rounded-[28px] border border-[#E7E8EC] p-6 sm:p-7 shadow-[0_8px_30px_rgba(0,0,0,0.06)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-[#111318] font-['Manrope',sans-serif]">
                GST Control Room &amp; Compliance Center
              </h2>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-white text-[#111318] border border-[#E7E8EC]">
                GSTIN: {storeDisplayGstin}
              </span>
            </div>
            <p className="text-xs text-[#7C7F8A]">
              Real-time Output Tax, Input Tax Credit (ITC) reconciliation, and statutory return readiness
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => nav("/gst")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-[#FAFAFB] text-[#111318] font-bold text-xs transition cursor-pointer border border-[#E7E8EC] shadow-xs"
            >
              <FileSpreadsheet size={14} />
              <span>GSTR Reports Suite</span>
            </button>
          </div>
        </div>

        {/* GST 4-Key Metrics Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Output GST */}
          <div className="p-4 rounded-[20px] bg-white border border-[#E7E8EC] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C7F8A]">
              Total Output GST
            </span>
            <p className="text-xl sm:text-2xl font-bold text-[#111318] font-['Manrope',sans-serif]">
              ₹1,22,850
            </p>
            <p className="text-[10px] text-[#7C7F8A]">On ₹12.45L Taxable Sales</p>
          </div>

          {/* 2. Input GST (ITC) */}
          <div className="p-4 rounded-[20px] bg-[#DFFFE6] border border-[#5BF07B]/40 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0E2A16]">
              Input Tax Credit (ITC)
            </span>
            <p className="text-xl sm:text-2xl font-bold text-[#0E2A16] font-['Manrope',sans-serif]">
              ₹38,600
            </p>
            <p className="text-[10px] text-[#0E2A16]/80">From 38 Verified Vendor Bills</p>
          </div>

          {/* 3. Net GST Payable */}
          <div className="p-4 rounded-[20px] bg-[#12151C] text-white border border-[#232733] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#A9ABB5]">
              Net GST Payable
            </span>
            <p className="text-xl sm:text-2xl font-bold text-[#5BF07B] font-['Manrope',sans-serif]">
              ₹84,250
            </p>
            <p className="text-[10px] text-[#A9ABB5]">CGST ₹42,125 + SGST ₹42,125</p>
          </div>

          {/* 4. ITC Reconciliation Match Rate */}
          <div className="p-4 rounded-[20px] bg-white border border-[#E7E8EC] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C7F8A]">
              2B Reconciliation
            </span>
            <p className="text-xl sm:text-2xl font-bold text-[#111318] font-['Manrope',sans-serif]">
              98.4% Matched
            </p>
            <p className="text-[10px] text-[#7C7F8A]">142 Matched • 3 Under Review</p>
          </div>
        </div>

        {/* GST Filing Status & Exceptions Inbox */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
          {/* Left: Filing Status Cards */}
          <div className="lg:col-span-5 space-y-3">
            <div className="p-4 rounded-[20px] bg-white border border-[#E7E8EC] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#DFFFE6] text-[#0E2A16] flex items-center justify-center font-bold">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#111318]">GSTR-1 (Outward Sales)</p>
                  <p className="text-[11px] text-[#7C7F8A]">142 B2B/B2C invoices synced &amp; verified</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#DFFFE6] text-[#0E2A16]">
                Ready to File
              </span>
            </div>

            <div className="p-4 rounded-[20px] bg-white border border-[#E7E8EC] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FAFAFB] text-[#111318] border border-[#E7E8EC] flex items-center justify-center font-bold">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#111318]">GSTR-3B (Monthly Summary)</p>
                  <p className="text-[11px] text-[#7C7F8A]">Net tax liability computed: ₹84,250</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#12151C] text-white">
                Draft Prepared
              </span>
            </div>
          </div>

          {/* Right: Exceptions Inbox (Flagged items) */}
          <div className="lg:col-span-7 p-4 rounded-[20px] bg-white border border-[#E7E8EC] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-[#111318]" />
                <h3 className="text-xs font-bold text-[#111318] uppercase tracking-wider">
                  Exceptions Inbox (Audit Discrepancies)
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-[#E5484D]">
                3 items require verification
              </span>
            </div>

            <div className="space-y-2">
              {[
                {
                  id: "disc-1",
                  title: "GST Rate Mismatch on Raw Spice PO #442",
                  vendor: "Kaveri Agro Traders",
                  amount: "₹1,450.00 difference",
                  note: "Invoice shows 5% GST; portal detected 12% category code.",
                },
                {
                  id: "disc-2",
                  title: "Missing 2B Record: Packing Material PO #389",
                  vendor: "Premier Packaging",
                  amount: "₹2,100.00 ITC on hold",
                  note: "Supplier GSTR-1 not submitted by the 11th deadline.",
                },
              ].map((disc) => (
                <div
                  key={disc.id}
                  className="p-3 rounded-[16px] bg-[#FAFAFB] border border-[#E7E8EC] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-bold text-[#111318] truncate">{disc.title}</p>
                    <p className="text-[11px] text-[#7C7F8A]">
                      {disc.vendor} • <span className="text-[#111318] font-medium">{disc.amount}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDiscrepancy(disc)}
                    className="shrink-0 px-3 py-1.5 rounded-full bg-[#12151C] hover:bg-black text-white font-semibold text-[11px] transition cursor-pointer"
                  >
                    Review
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════
          5. INVOICE & PAYMENT OVERVIEW TABLE
      ═════════════════════════════════════════════════════════════════ */}
      <section className="bg-[#F6F6F8] rounded-[28px] border border-[#E7E8EC] p-6 sm:p-7 shadow-[0_8px_30px_rgba(0,0,0,0.06)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-bold text-[#111318] font-['Manrope',sans-serif]">
              Invoice &amp; Payment Overview
            </h2>
            <p className="text-xs text-[#7C7F8A]">
              Segmented payment statuses, instant UPI collection, WhatsApp dispatch, and 50-day archive tracker
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => nav("/invoices")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-[#FAFAFB] text-[#111318] font-semibold text-xs border border-[#E7E8EC] shadow-xs transition cursor-pointer"
            >
              <span>View All Invoices</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Horizontal Segmented Progress Bar */}
        <div className="space-y-2 p-4 rounded-[20px] bg-white border border-[#E7E8EC]">
          <div className="flex items-center justify-between text-xs text-[#7C7F8A]">
            <span className="font-bold text-[#111318]">Collection Progress Bar</span>
            <span>Total Billed: ₹12,45,850.00</span>
          </div>

          <div className="h-3.5 w-full rounded-full bg-[#E7E8EC] overflow-hidden flex">
            <div
              className="h-full bg-[#5BF07B]"
              style={{ width: "72%" }}
              title="Paid: 72% (₹8,97,000)"
            />
            <div
              className="h-full bg-[#12151C]"
              style={{ width: "15%" }}
              title="Partially Paid: 15% (₹1,86,850)"
            />
            <div
              className="h-full bg-[#C3C5CE]"
              style={{ width: "10%" }}
              title="Pending: 10% (₹1,24,500)"
            />
            <div
              className="h-full bg-[#E5484D]"
              style={{ width: "3%" }}
              title="Returned: 3% (₹37,500)"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] pt-1">
            <span className="flex items-center gap-1.5 font-medium text-[#0E2A16]">
              <span className="w-2 h-2 rounded-full bg-[#5BF07B]" />
              Paid (72% • ₹8.97L)
            </span>
            <span className="flex items-center gap-1.5 font-medium text-[#111318]">
              <span className="w-2 h-2 rounded-full bg-[#12151C]" />
              Partially Paid (15% • ₹1.86L)
            </span>
            <span className="flex items-center gap-1.5 font-medium text-[#7C7F8A]">
              <span className="w-2 h-2 rounded-full bg-[#C3C5CE]" />
              Pending (10% • ₹1.24L)
            </span>
            <span className="flex items-center gap-1.5 font-medium text-[#E5484D]">
              <span className="w-2 h-2 rounded-full bg-[#E5484D]" />
              Returned (3% • ₹37.5k)
            </span>
          </div>
        </div>

        {/* Search & Filter Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1 p-1 rounded-full bg-white border border-[#E7E8EC] text-xs overflow-x-auto">
            {["ALL", "PAID", "PARTIAL", "UNPAID", "RETURNED"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setInvoiceFilter(st)}
                className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer shrink-0 ${
                  invoiceFilter === st ? "bg-[#12151C] text-white shadow-xs" : "text-[#7C7F8A] hover:text-[#111318]"
                }`}
              >
                {st === "ALL" ? "All Bills" : st === "PARTIAL" ? "Partially Paid" : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3.5 top-2.5 text-[#7C7F8A]" />
            <input
              type="text"
              value={invoiceSearch}
              onChange={(e) => setInvoiceSearch(e.target.value)}
              placeholder="Search invoice # or customer..."
              className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-full bg-white border border-[#E7E8EC] focus:outline-none focus:border-[#111318] text-[#111318] shadow-xs"
            />
          </div>
        </div>

        {/* Invoices Table */}
        <div className="overflow-x-auto rounded-[20px] border border-[#E7E8EC]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFAFB] text-[#7C7F8A] font-bold uppercase tracking-wider text-[10px] border-b border-[#E7E8EC]">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">GST Tax</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4">Verification</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E8EC]">
              {filteredInvoices.map((inv) => {
                const status = (inv.paymentStatus || "PAID").toUpperCase();
                return (
                  <tr key={inv.id || inv.invoiceNumber} className="hover:bg-white transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#111318]">
                      {inv.invoiceNumber}
                      <span className="block text-[10px] text-[#7C7F8A] font-sans font-normal">
                        {new Date(inv.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-[#111318]">{inv.customer?.name || "Walk-in Customer"}</p>
                      <p className="text-[10px] text-[#7C7F8A]">{inv.customer?.phone || "No mobile"}</p>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#7C7F8A]">
                      ₹{(Number(inv.cgst || 0) + Number(inv.sgst || 0)).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#111318] text-sm">
                      ₹{Number(inv.grandTotal || inv.totalAmount || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4">
                      {status === "PAID" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DFFFE6] text-[#0E2A16]">
                          <CheckCircle2 size={11} /> Paid
                        </span>
                      )}
                      {status === "PARTIALLY_PAID" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAFAFB] text-[#111318] border border-[#E7E8EC]">
                          <Clock size={11} /> Partially Paid
                        </span>
                      )}
                      {(status === "UNPAID" || status === "PENDING") && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FBD3D3] text-[#E5484D]">
                          <AlertTriangle size={11} /> Unpaid
                        </span>
                      )}
                      {status === "RETURNED" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAFAFB] text-[#7C7F8A] border border-[#E7E8EC]">
                          Returned / Void
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#5BF07B]" />
                        <span className="text-[11px] font-medium text-[#7C7F8A]">
                          {inv.razorpayVerified ? "Razorpay Verified" : "Cashier Settled"}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#A9ABB5] block">
                        Active ({50 - (inv.archivedDays || 0)}d until archive)
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(inv)}
                          className="w-8 h-8 rounded-full bg-white hover:bg-[#FAFAFB] text-[#111318] border border-[#E7E8EC] flex items-center justify-center transition cursor-pointer shadow-xs"
                          title="View Tax Invoice"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setUpiModalInvoice(inv)}
                          className="w-8 h-8 rounded-full bg-white hover:bg-[#FAFAFB] text-[#111318] border border-[#E7E8EC] flex items-center justify-center transition cursor-pointer shadow-xs"
                          title="Generate UPI QR"
                        >
                          <QrCode size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleWhatsAppShare(inv)}
                          className="w-8 h-8 rounded-full bg-white hover:bg-[#FAFAFB] text-[#0E2A16] border border-[#E7E8EC] flex items-center justify-center transition cursor-pointer shadow-xs"
                          title="Share on WhatsApp"
                        >
                          <Share2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════
          6. CA CONNECT: YOUR BUSINESS AND YOUR CA (KEEL DARK HERO CARD)
      ═════════════════════════════════════════════════════════════════ */}
      <section className="bg-[#12151C] text-white rounded-[28px] border border-[#232733] p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.14)] relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/10 text-[#5BF07B] border border-white/10">
              <ShieldCheck size={13} className="text-[#5BF07B]" />
              <span>Real-Time Auditor Synchronization</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white font-['Manrope',sans-serif]">
              Your Business and Your CA. Connected Like Never Before.
            </h2>
            <p className="text-xs sm:text-sm text-[#A9ABB5] leading-relaxed">
              Every sales invoice, purchase bill, debit note, and credit return is synchronized instantly with your Chartered Accountant’s workspace.
            </p>
            <div className="p-3.5 rounded-[20px] bg-white/5 border border-white/10 text-xs text-white space-y-1">
              <p className="font-bold">CA Partner: R. Ramanathan &amp; Associates (FCA)</p>
              <p className="text-[11px] text-[#A9ABB5]">
                Membership #048291 • Two-way communication &amp; return invoice live sync enabled
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <div className="grid grid-cols-3 gap-2 text-center p-3.5 rounded-[20px] bg-white/5 border border-white/10 shadow-xs">
              <div>
                <span className="text-base font-bold text-white block font-['Manrope',sans-serif]">142</span>
                <span className="text-[10px] text-[#A9ABB5]">Invoices Synced</span>
              </div>
              <div className="border-x border-white/10 px-2">
                <span className="text-base font-bold text-white block font-['Manrope',sans-serif]">38</span>
                <span className="text-[10px] text-[#A9ABB5]">Purchase Bills</span>
              </div>
              <div>
                <span className="text-base font-bold text-[#5BF07B] block font-['Manrope',sans-serif]">100%</span>
                <span className="text-[10px] text-[#A9ABB5]">Audit Uptime</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => nav("/ca-connect")}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#5BF07B] hover:brightness-105 text-[#0E2A16] font-bold text-xs shadow-xs transition cursor-pointer"
              >
                <span>Open CA Workspace</span>
                <ArrowRight size={13} />
              </button>
              <button
                type="button"
                onClick={() => nav("/ca-portal")}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/10 transition cursor-pointer"
                title="Auditor Portal View"
              >
                Auditor Portal
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════
          7. CASH FLOW, INVENTORY VALUATION & ACTIVITY TIMELINE
      ═════════════════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cash Flow & Expense Categories (Col 4) */}
        <div className="lg:col-span-4 bg-[#F6F6F8] rounded-[28px] border border-[#E7E8EC] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#111318] font-['Manrope',sans-serif] text-base">
              Cash Flow Breakdown
            </h3>
            <span className="text-[10px] font-bold text-[#0E2A16] bg-[#DFFFE6] px-2.5 py-0.5 rounded-full border border-[#5BF07B]/40">
              Net Positive
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-[20px] bg-white border border-[#E7E8EC]">
            <div>
              <span className="text-[10px] font-bold text-[#7C7F8A] uppercase">Opening Balance</span>
              <p className="text-sm font-bold text-[#111318] font-mono">₹2,45,000</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#7C7F8A] uppercase">Closing Balance</span>
              <p className="text-sm font-bold text-[#0E2A16] font-mono">₹9,05,000</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7C7F8A]">
              Top Expense Allocations
            </p>

            <div className="space-y-2.5">
              {[
                { label: "Vendor Purchases", amount: "₹2,60,000", pct: 62, color: "bg-[#5BF07B]" },
                { label: "Rent & Godown Lease", amount: "₹65,000", pct: 15, color: "bg-[#12151C]" },
                { label: "Staff Salaries & Attendance", amount: "₹55,000", pct: 13, color: "bg-[#7C7F8A]" },
                { label: "Utilities & Logistics", amount: "₹40,000", pct: 10, color: "bg-[#C3C5CE]" },
              ].map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#111318]">{item.label}</span>
                    <span className="font-bold font-mono text-[#111318]">{item.amount}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#E7E8EC] overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => nav("/expenses")}
            className="w-full py-2.5 rounded-full bg-white hover:bg-[#FAFAFB] text-[#111318] text-xs font-semibold border border-[#E7E8EC] shadow-xs transition cursor-pointer"
          >
            Manage All Expenses →
          </button>
        </div>

        {/* Inventory & Warehouse Distribution (Col 4) */}
        <div className="lg:col-span-4 bg-[#F6F6F8] rounded-[28px] border border-[#E7E8EC] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#111318] font-['Manrope',sans-serif] text-base">
              Inventory &amp; Warehouses
            </h3>
            <span className="text-[10px] font-bold text-[#111318] bg-white px-2.5 py-0.5 rounded-full border border-[#E7E8EC]">
              2 Godowns
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3.5 rounded-[20px] bg-white border border-[#E7E8EC]">
              <span className="text-xl font-bold text-[#0E2A16] font-['Manrope',sans-serif] block">148</span>
              <span className="text-[10px] text-[#7C7F8A] font-medium">In Stock SKUs</span>
            </div>
            <div className="p-3.5 rounded-[20px] bg-white border border-[#E7E8EC]">
              <span className="text-xl font-bold text-[#E5484D] font-['Manrope',sans-serif] block">8</span>
              <span className="text-[10px] text-[#7C7F8A] font-medium">Low Stock Alerts</span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7C7F8A]">
              Stock Distribution by Godown
            </p>
            <div className="space-y-2">
              <div className="p-3 rounded-[16px] bg-white border border-[#E7E8EC] flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-[#111318]">Central Godown (Madurai)</p>
                  <p className="text-[10px] text-[#7C7F8A]">65% capacity • Bulk Cereals &amp; Oils</p>
                </div>
                <span className="font-mono font-bold text-[#111318]">₹4.06 L</span>
              </div>
              <div className="p-3 rounded-[16px] bg-white border border-[#E7E8EC] flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-[#111318]">Store Front Display Godown</p>
                  <p className="text-[10px] text-[#7C7F8A]">35% capacity • Packaged Fast Moving</p>
                </div>
                <span className="font-mono font-bold text-[#111318]">₹2.19 L</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => nav("/warehouses")}
            className="w-full py-2.5 rounded-full bg-white hover:bg-[#FAFAFB] text-[#111318] text-xs font-semibold border border-[#E7E8EC] shadow-xs transition cursor-pointer"
          >
            Warehouse Stock Movements →
          </button>
        </div>

        {/* Recent Business Activity Feed (Col 4) */}
        <div className="lg:col-span-4 bg-[#F6F6F8] rounded-[28px] border border-[#E7E8EC] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#111318] font-['Manrope',sans-serif] text-base">
              Recent Business Activity
            </h3>
            <span className="text-[10px] font-mono text-[#7C7F8A]">Live Feed</span>
          </div>

          <div className="space-y-2.5">
            {activityItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="flex items-start gap-3 p-2.5 rounded-[16px] bg-white border border-[#E7E8EC] hover:bg-[#FAFAFB] transition">
                  <div className={`w-8 h-8 rounded-full ${item.color} border flex items-center justify-center shrink-0 mt-0.5 shadow-xs`}>
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-xs font-bold text-[#111318] truncate">{item.title}</p>
                    <p className="text-[11px] text-[#7C7F8A] truncate">{item.desc}</p>
                    <span className="text-[10px] text-[#A9ABB5] block">{item.time}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => nav("/audit-logs")}
            className="w-full py-2.5 rounded-full bg-white hover:bg-[#FAFAFB] text-[#111318] text-xs font-semibold border border-[#E7E8EC] shadow-xs transition cursor-pointer"
          >
            Full Audit Logs Trail →
          </button>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════
          MODAL: QUICK ADD CUSTOMER
      ═════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        title="Add New Customer"
        subtitle="Quickly register customer details for Khata ledger & billing"
        maxWidth="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAddCustomerModal(false)}
              className="px-4 py-2 rounded-full border border-[#E7E8EC] text-xs font-semibold text-[#7C7F8A] hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateCustomer}
              className="px-5 py-2 rounded-full bg-[#12151C] hover:bg-black text-white font-bold text-xs transition shadow-xs cursor-pointer"
            >
              Save Customer
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-[#111318]">Full Customer / Business Name *</label>
            <input
              type="text"
              required
              value={customerForm.name}
              onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
              placeholder="e.g. Anand Textiles"
              className="w-full px-3 py-2 mt-1 rounded-xl border border-[#E7E8EC] bg-white text-[#111318] text-xs focus:outline-none focus:border-[#111318]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-semibold text-[#111318]">Phone Number</label>
              <input
                type="tel"
                value={customerForm.phone}
                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                placeholder="9876543210"
                className="w-full px-3 py-2 mt-1 rounded-xl border border-[#E7E8EC] bg-white text-[#111318] text-xs focus:outline-none focus:border-[#111318]"
              />
            </div>
            <div>
              <label className="font-semibold text-[#111318]">GSTIN (Optional)</label>
              <input
                type="text"
                value={customerForm.gstin}
                onChange={(e) => setCustomerForm({ ...customerForm, gstin: e.target.value.toUpperCase() })}
                placeholder="33ABCDE1234F1Z5"
                className="w-full px-3 py-2 mt-1 rounded-xl border border-[#E7E8EC] bg-white text-[#111318] text-xs font-mono uppercase focus:outline-none focus:border-[#111318]"
              />
            </div>
          </div>
          <div>
            <label className="font-semibold text-[#111318]">Address / City</label>
            <input
              type="text"
              value={customerForm.address}
              onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
              placeholder="e.g. 42 Bazaar St, Madurai"
              className="w-full px-3 py-2 mt-1 rounded-xl border border-[#E7E8EC] bg-white text-[#111318] text-xs focus:outline-none focus:border-[#111318]"
            />
          </div>
        </form>
      </Modal>

      {/* ═════════════════════════════════════════════════════════════════
          MODAL: QUICK ADD PRODUCT
      ═════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        title="Add New Product"
        subtitle="Item catalog with automated GST computation & stock level"
        maxWidth="max-w-lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAddProductModal(false)}
              className="px-4 py-2 rounded-full border border-[#E7E8EC] text-xs font-semibold text-[#7C7F8A] hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateProduct}
              className="px-5 py-2 rounded-full bg-[#12151C] hover:bg-black text-white font-bold text-xs transition shadow-xs cursor-pointer"
            >
              Save Product
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateProduct} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-[#111318]">Product Name *</label>
              <input
                type="text"
                required
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="e.g. Basmati Rice 5kg"
                className="w-full px-3 py-2 mt-1 rounded-xl border border-[#E7E8EC] bg-white text-[#111318] text-xs focus:outline-none focus:border-[#111318]"
              />
            </div>
            <div>
              <label className="font-semibold text-[#111318]">SKU / Barcode</label>
              <input
                type="text"
                value={productForm.code}
                onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
                placeholder="e.g. PRD-042"
                className="w-full px-3 py-2 mt-1 rounded-xl border border-[#E7E8EC] bg-white text-[#111318] text-xs font-mono focus:outline-none focus:border-[#111318]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-[#111318]">Selling Price (₹) *</label>
              <input
                type="number"
                required
                value={productForm.sellingPrice}
                onChange={(e) => setProductForm({ ...productForm, sellingPrice: e.target.value })}
                placeholder="480.00"
                className="w-full px-3 py-2 mt-1 rounded-xl border border-[#E7E8EC] bg-white text-[#111318] text-xs font-mono font-bold focus:outline-none focus:border-[#111318]"
              />
            </div>
            <div>
              <label className="font-semibold text-[#111318]">Purchase Price (₹)</label>
              <input
                type="number"
                value={productForm.purchasePrice}
                onChange={(e) => setProductForm({ ...productForm, purchasePrice: e.target.value })}
                placeholder="380.00"
                className="w-full px-3 py-2 mt-1 rounded-xl border border-[#E7E8EC] bg-white text-[#111318] text-xs font-mono focus:outline-none focus:border-[#111318]"
              />
            </div>
            <div>
              <label className="font-semibold text-[#111318]">GST Rate</label>
              <select
                value={productForm.gstRate}
                onChange={(e) => setProductForm({ ...productForm, gstRate: Number(e.target.value) })}
                className="w-full px-3 py-2 mt-1 rounded-xl border border-[#E7E8EC] bg-white text-[#111318] text-xs font-semibold focus:outline-none focus:border-[#111318]"
              >
                <option value="0">0% (Exempt)</option>
                <option value="5">5% GST</option>
                <option value="12">12% GST</option>
                <option value="18">18% GST</option>
                <option value="28">28% GST</option>
              </select>
            </div>
          </div>

          {/* Pricing Method Pill Selector */}
          <div>
            <label className="font-semibold text-[#111318] block mb-1">Tax Pricing Method</label>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer ${
                  productForm.pricingMethod === "INCLUSIVE"
                    ? "bg-[#DFFFE6] border-[#5BF07B] text-[#0E2A16] font-bold"
                    : "bg-white border-[#E7E8EC] text-[#7C7F8A]"
                }`}
              >
                <input
                  type="radio"
                  name="pricingMethodModal"
                  checked={productForm.pricingMethod === "INCLUSIVE"}
                  onChange={() => setProductForm({ ...productForm, pricingMethod: "INCLUSIVE", isTaxInclusive: true })}
                />
                <span>Tax Inclusive (MRP)</span>
              </label>

              <label
                className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer ${
                  productForm.pricingMethod === "EXCLUSIVE"
                    ? "bg-[#DFFFE6] border-[#5BF07B] text-[#0E2A16] font-bold"
                    : "bg-white border-[#E7E8EC] text-[#7C7F8A]"
                }`}
              >
                <input
                  type="radio"
                  name="pricingMethodModal"
                  checked={productForm.pricingMethod === "EXCLUSIVE"}
                  onChange={() => setProductForm({ ...productForm, pricingMethod: "EXCLUSIVE", isTaxInclusive: false })}
                />
                <span>Tax Exclusive (+GST)</span>
              </label>
            </div>
          </div>

          {/* Tax Breakdown Preview Chip */}
          <div className="p-3.5 rounded-[20px] bg-white border border-[#E7E8EC] grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <span className="text-[10px] text-[#7C7F8A] block">Taxable Base</span>
              <span className="font-bold font-mono text-[#111318]">
                {formatCurrencyINR(productPriceBreakdown.taxableValue)}
              </span>
            </div>
            <div className="border-x border-[#E7E8EC]">
              <span className="text-[10px] text-[#7C7F8A] block">GST ({productForm.gstRate}%)</span>
              <span className="font-bold font-mono text-[#111318]">
                +{formatCurrencyINR(productPriceBreakdown.gstAmount)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#7C7F8A] block">Final MRP</span>
              <span className="font-bold font-mono text-[#0E2A16]">
                {formatCurrencyINR(productPriceBreakdown.finalSellingPrice)}
              </span>
            </div>
          </div>
        </form>
      </Modal>

      {/* ═════════════════════════════════════════════════════════════════
          MODAL: QUICK ADD EXPENSE
      ═════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showAddExpenseModal}
        onClose={() => setShowAddExpenseModal(false)}
        title="Record Expense"
        subtitle="Log business operating expenses for automated cash flow calculation"
        maxWidth="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAddExpenseModal(false)}
              className="px-4 py-2 rounded-full border border-[#E7E8EC] text-xs font-semibold text-[#7C7F8A] hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateExpense}
              className="px-5 py-2 rounded-full bg-[#12151C] hover:bg-black text-white font-bold text-xs transition shadow-xs cursor-pointer"
            >
              Save Expense
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateExpense} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-[#111318]">Expense Title *</label>
            <input
              type="text"
              required
              value={expenseForm.title}
              onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
              placeholder="e.g. Shop Electricity Bill Nov 2026"
              className="w-full px-3 py-2 mt-1 rounded-xl border border-[#E7E8EC] bg-white text-[#111318] text-xs focus:outline-none focus:border-[#111318]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-[#111318]">Amount (₹) *</label>
              <input
                type="number"
                required
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                placeholder="4500.00"
                className="w-full px-3 py-2 mt-1 rounded-xl border border-[#E7E8EC] bg-white text-[#111318] text-xs font-mono font-bold focus:outline-none focus:border-[#111318]"
              />
            </div>
            <div>
              <label className="font-semibold text-[#111318]">Payment Mode</label>
              <select
                value={expenseForm.paymentMode}
                onChange={(e) => setExpenseForm({ ...expenseForm, paymentMode: e.target.value })}
                className="w-full px-3 py-2 mt-1 rounded-xl border border-[#E7E8EC] bg-white text-[#111318] text-xs font-semibold focus:outline-none focus:border-[#111318]"
              >
                <option value="UPI">UPI / QR</option>
                <option value="Cash">Cash Drawer</option>
                <option value="Bank">Bank Transfer</option>
                <option value="Card">Debit Card</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-[#111318]">Category</label>
            <select
              value={expenseForm.category}
              onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
              className="w-full px-3 py-2 mt-1 rounded-xl border border-[#E7E8EC] bg-white text-[#111318] text-xs font-semibold focus:outline-none focus:border-[#111318]"
            >
              <option value="Vendor Purchases">Vendor Purchases</option>
              <option value="Rent & Godown Lease">Rent &amp; Godown Lease</option>
              <option value="Staff Salaries & Attendance">Staff Salaries &amp; Attendance</option>
              <option value="Utilities & Electricity">Utilities &amp; Electricity</option>
              <option value="Logistics & Delivery">Logistics &amp; Delivery</option>
              <option value="Office & Miscellaneous">Office &amp; Miscellaneous</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-[#111318]">Notes / Reference</label>
            <input
              type="text"
              value={expenseForm.notes}
              onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
              placeholder="e.g. Transaction Ref #99281"
              className="w-full px-3 py-2 mt-1 rounded-xl border border-[#E7E8EC] bg-white text-[#111318] text-xs focus:outline-none focus:border-[#111318]"
            />
          </div>
        </form>
      </Modal>

      {/* ═════════════════════════════════════════════════════════════════
          MODAL: REVIEW DISCREPANCY (CA AUDIT)
      ═════════════════════════════════════════════════════════════════ */}
      {selectedDiscrepancy && (
        <Modal
          isOpen={!!selectedDiscrepancy}
          onClose={() => setSelectedDiscrepancy(null)}
          title="Review Audit Discrepancy"
          subtitle="Exceptions flagged during automated GSTN 2B & CA reconciliation"
          maxWidth="max-w-md"
          footer={
            <>
              <button
                type="button"
                onClick={() => setSelectedDiscrepancy(null)}
                className="px-4 py-2 rounded-full border border-[#E7E8EC] text-xs font-semibold text-[#7C7F8A] hover:bg-slate-50 transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                disabled={resolvingDiscrepancy}
                onClick={() => handleResolveDiscrepancy(selectedDiscrepancy)}
                className="px-5 py-2 rounded-full bg-[#12151C] hover:bg-black text-[#5BF07B] font-bold text-xs transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {resolvingDiscrepancy ? "Resolving..." : "Accept CA Adjustment"}
              </button>
            </>
          }
        >
          <div className="space-y-3.5 text-xs">
            <div className="p-3.5 rounded-[20px] bg-[#FAFAFB] border border-[#E7E8EC] space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#E5484D]">
                Flagged Issue
              </span>
              <p className="font-bold text-[#111318] text-sm">{selectedDiscrepancy.title}</p>
              <p className="text-[#7C7F8A]">{selectedDiscrepancy.note}</p>
            </div>

            <div className="space-y-1.5 p-3.5 rounded-[20px] bg-white border border-[#E7E8EC]">
              <div className="flex justify-between">
                <span className="text-[#7C7F8A]">Supplier / Counterparty:</span>
                <span className="font-bold text-[#111318]">{selectedDiscrepancy.vendor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7C7F8A]">Discrepancy Value:</span>
                <span className="font-mono font-bold text-[#111318]">{selectedDiscrepancy.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7C7F8A]">CA Audit Status:</span>
                <span className="font-semibold text-[#111318]">Pending Business Approval</span>
              </div>
            </div>

            <p className="text-[11px] text-[#7C7F8A] leading-relaxed">
              Accepting will log an audit confirmation in your CA ledger and automatically adjust the GSTR-3B draft calculations.
            </p>
          </div>
        </Modal>
      )}

      {/* ═════════════════════════════════════════════════════════════════
          MODAL: TAX INVOICE PREVIEW MODAL
      ═════════════════════════════════════════════════════════════════ */}
      {selectedInvoice && (
        <TaxInvoice
          invoice={selectedInvoice}
          shopSettings={shopSettings}
          isModal={true}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* ═════════════════════════════════════════════════════════════════
          MODAL: UPI QR PAYMENT MODAL
      ═════════════════════════════════════════════════════════════════ */}
      {upiModalInvoice && (
        <UpiPaymentModal
          amount={Number(upiModalInvoice.grandTotal || upiModalInvoice.totalAmount || 0)}
          invoiceNumber={upiModalInvoice.invoiceNumber || "INV-001"}
          customerName={upiModalInvoice.customer?.name || "Customer"}
          upiId="bilzet@hdfcbank"
          shopName={storeDisplayName}
          onSuccess={() => {
            setUpiModalInvoice(null);
            refreshAllData();
          }}
          onClose={() => setUpiModalInvoice(null)}
        />
      )}
    </div>
  );
}

function BriefcaseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#111318]">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}
