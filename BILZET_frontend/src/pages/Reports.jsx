import { useEffect, useState, useMemo } from "react";
import { reportsApi, settingsApi } from "../api";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Calendar,
  FileText,
  ArrowUpRight,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  CreditCard,
  Wallet,
  ShoppingBag,
  Percent,
  CheckCircle2,
  Clock,
  Filter,
  Download,
  AlertCircle,
  Building2,
  Phone,
  Mail,
  MapPin,
  Search,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import Button from "../components/common/Button";
import { generateReportsPdf } from "../utils/reportPdfGenerator";

// Date presets definitions
const DATE_PRESETS = [
  { key: "TODAY", label: "Today" },
  { key: "YESTERDAY", label: "Yesterday" },
  { key: "THIS_WEEK", label: "This Week" },
  { key: "THIS_MONTH", label: "This Month" },
  { key: "THIS_YEAR", label: "This Year" },
  { key: "CUSTOM", label: "Custom Range" },
];

const PAYMENT_METHOD_COLORS = {
  Cash: "#10B981",
  "UPI / QR": "#6366F1",
  Card: "#3B82F6",
  "Credit / Due": "#F59E0B",
  "Bank Transfer": "#8B5CF6",
  Other: "#64748B",
};

export default function Reports() {
  const [selectedPreset, setSelectedPreset] = useState("THIS_MONTH");
  const [customStartDate, setCustomStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 29)).toISOString().split("T")[0]
  );
  const [customEndDate, setCustomEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [salesReport, setSalesReport] = useState(null);
  const [profitReport, setProfitReport] = useState(null);
  const [shopSettings, setShopSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchInvoiceQuery, setSearchInvoiceQuery] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfFeedback, setPdfFeedback] = useState(null);

  // Calculate start and end date objects based on selected preset
  const dateRange = useMemo(() => {
    const now = new Date();

    if (selectedPreset === "TODAY") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return {
        start,
        end,
        label: "Today",
        displayPeriod: start.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      };
    }

    if (selectedPreset === "YESTERDAY") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
      const end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
      return {
        start,
        end,
        label: "Yesterday",
        displayPeriod: start.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      };
    }

    if (selectedPreset === "THIS_WEEK") {
      const day = now.getDay();
      const diff = (day === 0 ? -6 : 1) - day; // Monday
      const start = new Date(now);
      start.setDate(now.getDate() + diff);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return {
        start,
        end,
        label: "This Week",
        displayPeriod: `${start.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        })} – ${end.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`,
      };
    }

    if (selectedPreset === "THIS_MONTH") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return {
        start,
        end,
        label: "This Month",
        displayPeriod: now.toLocaleDateString("en-IN", {
          month: "long",
          year: "numeric",
        }),
      };
    }

    if (selectedPreset === "THIS_YEAR") {
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return {
        start,
        end,
        label: "This Year",
        displayPeriod: `Year ${now.getFullYear()}`,
      };
    }

    // CUSTOM
    const s = customStartDate ? new Date(customStartDate) : new Date();
    s.setHours(0, 0, 0, 0);
    const e = customEndDate ? new Date(customEndDate) : new Date();
    e.setHours(23, 59, 59, 999);
    return {
      start: s,
      end: e,
      label: "Custom Date Range",
      displayPeriod: `${s.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })} – ${e.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}`,
    };
  }, [selectedPreset, customStartDate, customEndDate]);

  // Load backend analytics
  const fetchAnalytics = async () => {
    setLoading(true);
    const queryParams = {
      from: dateRange.start.toISOString(),
      to: dateRange.end.toISOString(),
    };

    try {
      const [salesRes, profitRes, shopRes] = await Promise.all([
        reportsApi.sales(queryParams).catch((err) => {
          console.warn("Sales report fetch failed:", err);
          return {};
        }),
        reportsApi.profit(queryParams).catch((err) => {
          console.warn("Profit report fetch failed:", err);
          return {};
        }),
        settingsApi.get().catch(() => ({})),
      ]);

      setSalesReport(salesRes);
      setProfitReport(profitRes);
      if (shopRes) setShopSettings(shopRes);
    } catch (err) {
      console.error("Failed to load business analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  // Extract core metrics
  const rawSales = salesReport?.sales || salesReport?.data?.sales || [];
  const totalRevenue = Number(salesReport?.totalRevenue ?? salesReport?.totalSales ?? 0);
  const netSales = Number(salesReport?.netSales ?? totalRevenue);
  const totalInvoices = Number(
    salesReport?.totalInvoices ?? (Array.isArray(rawSales) ? rawSales.length : 0)
  );
  const totalDiscounts = Number(salesReport?.totalDiscounts ?? 0);
  const totalTaxes = Number(salesReport?.totalGST ?? 0);
  const totalCollected = Number(salesReport?.totalCollected ?? 0);
  const totalPending = Number(salesReport?.totalPending ?? Math.max(0, totalRevenue - totalCollected));

  const totalCost = Number(profitReport?.totalCost ?? 0);
  const calculatedNetProfit = profitReport?.netProfit !== undefined
    ? Number(profitReport.netProfit)
    : Math.max(0, totalRevenue - totalCost);
  const grossMargin = totalRevenue > 0
    ? Math.round((calculatedNetProfit / totalRevenue) * 100)
    : (profitReport?.profitMargin ?? 0);

  const averageOrderValue = totalInvoices > 0 ? Math.round(totalRevenue / totalInvoices) : 0;

  // Process Sales Trend Data for Recharts
  const trendData = useMemo(() => {
    if (!rawSales || rawSales.length === 0) return [];

    const isHourly = selectedPreset === "TODAY" || selectedPreset === "YESTERDAY";
    const isYearly = selectedPreset === "THIS_YEAR";

    if (isHourly) {
      // Group by hour 00 to 23
      const hourMap = {};
      for (let h = 8; h <= 21; h++) {
        const hourLabel = `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;
        hourMap[h] = { time: hourLabel, sales: 0, orders: 0 };
      }

      rawSales.forEach((s) => {
        const d = new Date(s.createdAt);
        const h = d.getHours();
        if (!hourMap[h]) {
          const hourLabel = `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;
          hourMap[h] = { time: hourLabel, sales: 0, orders: 0 };
        }
        hourMap[h].sales += Number(s.grandTotal || 0);
        hourMap[h].orders += 1;
      });

      return Object.keys(hourMap)
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => hourMap[k]);
    }

    if (isYearly) {
      // Group by Month (Jan to Dec)
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthMap = {};
      months.forEach((m, idx) => {
        monthMap[idx] = { time: m, sales: 0, orders: 0 };
      });

      rawSales.forEach((s) => {
        const d = new Date(s.createdAt);
        const mIdx = d.getMonth();
        if (monthMap[mIdx]) {
          monthMap[mIdx].sales += Number(s.grandTotal || 0);
          monthMap[mIdx].orders += 1;
        }
      });

      return Object.values(monthMap);
    }

    // Default: Group by Day (DD MMM)
    const dayMap = {};
    rawSales.forEach((s) => {
      const d = new Date(s.createdAt);
      const dayKey = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      if (!dayMap[dayKey]) {
        dayMap[dayKey] = { time: dayKey, dateObj: d, sales: 0, orders: 0 };
      }
      dayMap[dayKey].sales += Number(s.grandTotal || 0);
      dayMap[dayKey].orders += 1;
    });

    return Object.values(dayMap).sort((a, b) => a.dateObj - b.dateObj);
  }, [rawSales, selectedPreset]);

  // Payment Method Breakdown
  const paymentMethodData = useMemo(() => {
    if (!rawSales || rawSales.length === 0) return [];

    const map = {
      Cash: { name: "Cash", value: 0, count: 0 },
      "UPI / QR": { name: "UPI / QR", value: 0, count: 0 },
      Card: { name: "Card", value: 0, count: 0 },
      "Credit / Due": { name: "Credit / Due", value: 0, count: 0 },
      Other: { name: "Other", value: 0, count: 0 },
    };

    rawSales.forEach((s) => {
      const amt = Number(s.grandTotal || 0);
      const m = (s.paymentMethod || "").toUpperCase();
      if (m.includes("CASH")) {
        map["Cash"].value += amt;
        map["Cash"].count += 1;
      } else if (m.includes("UPI") || m.includes("ONLINE") || m.includes("QR")) {
        map["UPI / QR"].value += amt;
        map["UPI / QR"].count += 1;
      } else if (m.includes("CARD")) {
        map["Card"].value += amt;
        map["Card"].count += 1;
      } else if (m.includes("CREDIT") || s.paymentStatus === "UNPAID") {
        map["Credit / Due"].value += amt;
        map["Credit / Due"].count += 1;
      } else {
        map["Other"].value += amt;
        map["Other"].count += 1;
      }
    });

    return Object.values(map)
      .filter((item) => item.value > 0 || item.count > 0)
      .map((item) => ({
        ...item,
        percentage: totalRevenue > 0 ? Math.round((item.value / totalRevenue) * 100) : 0,
      }));
  }, [rawSales, totalRevenue]);

  // Top Selling Products Leaderboard
  const topProducts = useMemo(() => {
    if (!rawSales || rawSales.length === 0) return [];

    const productMap = {};
    rawSales.forEach((s) => {
      if (Array.isArray(s.items)) {
        s.items.forEach((item) => {
          const name = item.name || item.productName || "Product";
          const qty = Number(item.quantity || 1);
          const revenue = Number(item.total || item.rate * qty || 0);

          if (!productMap[name]) {
            productMap[name] = { name, quantity: 0, revenue: 0 };
          }
          productMap[name].quantity += qty;
          productMap[name].revenue += revenue;
        });
      }
    });

    return Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 7);
  }, [rawSales]);

  // Filtered transactions for the audit table
  const filteredSales = useMemo(() => {
    if (!rawSales) return [];
    if (!searchInvoiceQuery.trim()) return rawSales;
    const q = searchInvoiceQuery.toLowerCase().trim();
    return rawSales.filter((s) => {
      const inv = (s.invoiceNumber || "").toLowerCase();
      const cust = (s.customer?.name || "Walk-in").toLowerCase();
      const method = (s.paymentMethod || "").toLowerCase();
      return inv.includes(q) || cust.includes(q) || method.includes(q);
    });
  }, [rawSales, searchInvoiceQuery]);

  // Action: Export to Excel (Structured CSV)
  const handleExportExcel = () => {
    if (!rawSales || rawSales.length === 0) {
      alert("No analytics data available to export for this period.");
      return;
    }

    const shopName = shopSettings?.shopName || "BILZET Retail Business";
    const shopGstin = shopSettings?.gstin || "N/A";
    const currentDateStr = new Date().toLocaleString("en-IN");

    const rows = [
      ["BILZET BUSINESS ANALYTICS & SALES REPORT"],
      [`Store Name: ${shopName}`, `GSTIN: ${shopGstin}`],
      [`Period: ${dateRange.label} (${dateRange.displayPeriod})`, `Export Date: ${currentDateStr}`],
      [],
      ["--- EXECUTIVE METRICS SUMMARY ---"],
      ["Metric", "Value"],
      ["Total Gross Revenue", `₹${totalRevenue.toLocaleString("en-IN")}`],
      ["Net Sales", `₹${netSales.toLocaleString("en-IN")}`],
      ["Total Invoices Generated", totalInvoices],
      ["Average Order Value (AOV)", `₹${averageOrderValue.toLocaleString("en-IN")}`],
      ["Estimated Net Profit", `₹${calculatedNetProfit.toLocaleString("en-IN")}`],
      ["Estimated Profit Margin", `${grossMargin}%`],
      ["Total Taxes / GST Collected", `₹${totalTaxes.toLocaleString("en-IN")}`],
      ["Total Discounts Given", `₹${totalDiscounts.toLocaleString("en-IN")}`],
      ["Total Collected", `₹${totalCollected.toLocaleString("en-IN")}`],
      ["Total Pending / Due", `₹${totalPending.toLocaleString("en-IN")}`],
      [],
      ["--- PAYMENT METHOD DISTRIBUTION ---"],
      ["Payment Method", "Bills Count", "Collected Amount (₹)", "Share %"],
    ];

    paymentMethodData.forEach((pm) => {
      rows.push([pm.name, pm.count, pm.value, `${pm.percentage}%`]);
    });

    rows.push([]);
    rows.push(["--- TOP SELLING PRODUCTS ---"]);
    rows.push(["Rank", "Product Name", "Units Sold", "Total Revenue (₹)"]);

    topProducts.forEach((tp, idx) => {
      rows.push([idx + 1, `"${tp.name}"`, tp.quantity, tp.revenue]);
    });

    rows.push([]);
    rows.push(["--- DETAILED TRANSACTIONS AUDIT ---"]);
    rows.push([
      "Invoice Number",
      "Date & Time",
      "Customer Name",
      "Payment Method",
      "Payment Status",
      "Items Count",
      "Tax Total (₹)",
      "Grand Total (₹)",
    ]);

    rawSales.forEach((s) => {
      const invDate = new Date(s.createdAt).toLocaleString("en-IN");
      const custName = s.customer?.name || "Walk-in Customer";
      const itemsCount = Array.isArray(s.items) ? s.items.length : 0;
      rows.push([
        `"${s.invoiceNumber}"`,
        `"${invDate}"`,
        `"${custName}"`,
        s.paymentMethod || "CASH",
        s.paymentStatus || "PAID",
        itemsCount,
        Number(s.taxTotal || 0),
        Number(s.grandTotal || 0),
      ]);
    });

    const csvContent = "\uFEFF" + rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safePeriod = dateRange.label.toLowerCase().replace(/[^a-z0-9]/g, "_");
    link.href = url;
    link.download = `BILZET_Analytics_${safePeriod}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Action: Export Real PDF File Directly (Phase 1)
  const handleExportPdf = async () => {
    if (exportingPdf) return;
    setExportingPdf(true);
    setPdfFeedback(null);

    try {
      const metrics = {
        totalRevenue,
        netSales,
        totalInvoices,
        totalDiscounts,
        totalTaxes,
        totalCollected,
        totalPending,
        calculatedNetProfit,
        grossMargin,
        averageOrderValue,
      };

      const downloadedFilename = generateReportsPdf({
        shopSettings,
        dateRange,
        selectedPreset,
        searchInvoiceQuery,
        metrics,
        paymentMethodData,
        topProducts,
        transactions: filteredSales,
      });

      setPdfFeedback({
        type: "success",
        message: `PDF exported successfully (${downloadedFilename}).`,
      });
      setTimeout(() => setPdfFeedback(null), 5000);
    } catch (err) {
      console.error("PDF generation failed:", err);
      setPdfFeedback({
        type: "error",
        message: "Unable to generate PDF. Please try again.",
      });
      setTimeout(() => setPdfFeedback(null), 5000);
    } finally {
      setExportingPdf(false);
    }
  };

  // Action: Physical / Browser Print Dialog
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 fade-up">
      {/* ══════════════════════════════════════════════════
          SCREEN ONLY: MAIN HEADER & CONTROLS
      ══════════════════════════════════════════════════ */}
      <div className="screen-only flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl border border-indigo-100 grid place-items-center text-indigo-600 bg-indigo-50/70 shadow-2xs shrink-0">
            <BarChart3 size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Reports &amp; Analytics
              </h1>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Live Analytics
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Business intelligence, revenue trend, margins &amp; sales overview for{" "}
              <strong className="text-slate-800 font-semibold">{dateRange.displayPeriod}</strong>
            </p>
          </div>
        </div>

        {/* Export and Action buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="neutral"
            size="sm"
            icon={RefreshCw}
            loading={loading}
            onClick={fetchAnalytics}
            title="Refresh analytics data"
          >
            Refresh
          </Button>

          <Button
            variant="success"
            size="sm"
            icon={FileSpreadsheet}
            onClick={handleExportExcel}
            title="Export Excel report (.csv)"
          >
            Export Excel
          </Button>

          <Button
            variant="danger"
            size="sm"
            icon={Download}
            loading={exportingPdf}
            disabled={exportingPdf}
            onClick={handleExportPdf}
            title="Generate and download PDF analytics report"
          >
            {exportingPdf ? "Generating PDF..." : "Export PDF"}
          </Button>

          <Button
            variant="neutral"
            size="sm"
            icon={Printer}
            onClick={handlePrint}
            title="Print formal report"
          >
            Print
          </Button>
        </div>
      </div>

      {/* PDF Export Feedback Alert */}
      {pdfFeedback && (
        <div
          className={`screen-only alert-box ${
            pdfFeedback.type === "success" ? "alert-success" : "alert-danger"
          } transition-all duration-200`}
        >
          {pdfFeedback.type === "success" ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
          )}
          <span className="font-medium text-xs">{pdfFeedback.message}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          SCREEN ONLY: DATE FILTER PRESETS BAR (REQ 6)
      ══════════════════════════════════════════════════ */}
      <div className="screen-only bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Filter size={15} className="text-slate-400" />
            <span>Select Period:</span>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {DATE_PRESETS.map((preset) => {
              const isActive = selectedPreset === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => setSelectedPreset(preset.key)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Range Picker row when Custom Range is active */}
        {selectedPreset === "CUSTOM" && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium text-slate-700"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium text-slate-700"
              />
            </div>
            <span className="text-xs text-slate-400 italic">
              Showing records between selected dates.
            </span>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          SCREEN ONLY: KEY PERFORMANCE INDICATORS (KPI CARDS)
      ══════════════════════════════════════════════════ */}
      <div className="screen-only grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Revenue */}
        <div className="card p-4 sm:p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            <DollarSign size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500">Gross Sales Revenue</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 truncate">
              ₹{totalRevenue.toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {totalInvoices} {totalInvoices === 1 ? "invoice" : "invoices"} generated
            </p>
          </div>
        </div>

        {/* Estimated Profit */}
        <div className="card p-4 sm:p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <TrendingUp size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500">Net Estimated Profit</p>
            <p className="text-lg sm:text-xl font-bold text-emerald-700 truncate">
              ₹{calculatedNetProfit.toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
              {grossMargin}% gross margin
            </p>
          </div>
        </div>

        {/* Average Order Value & Volume */}
        <div className="card p-4 sm:p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
            <ShoppingBag size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500">Average Bill Value</p>
            <p className="text-lg sm:text-xl font-bold text-purple-700 truncate">
              ₹{averageOrderValue.toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Avg spending per transaction</p>
          </div>
        </div>

        {/* Taxes & GST Collected */}
        <div className="card p-4 sm:p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <Percent size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500">Taxes / GST Collected</p>
            <p className="text-lg sm:text-xl font-bold text-amber-700 truncate">
              ₹{totalTaxes.toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              ₹{totalDiscounts.toLocaleString("en-IN")} total discounts
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          SCREEN ONLY: VISUAL ANALYTICS CHARTS (REQ 5)
      ══════════════════════════════════════════════════ */}
      <div className="screen-only grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* CHART 1: Sales & Revenue Trend (2 Columns wide) */}
        <div className="card p-5 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Sales &amp; Revenue Velocity</h2>
                  <p className="text-[11px] text-slate-400">
                    {selectedPreset === "TODAY" || selectedPreset === "YESTERDAY"
                      ? "Hourly revenue trajectory"
                      : "Daily sales movement across the selected period"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                  Revenue (₹)
                </span>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full pt-4">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                  <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                  <p className="text-xs">Plotting analytics trend...</p>
                </div>
              ) : trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="time"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#64748B", fontSize: 11 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#64748B", fontSize: 11 }}
                      tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                    />
                    <Tooltip
                      formatter={(val) => [`₹${Number(val).toLocaleString("en-IN")}`, "Sales Revenue"]}
                      labelFormatter={(label) => `Time: ${label}`}
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        borderColor: "#E2E8F0",
                        borderRadius: "0.75rem",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        fontSize: "12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="#2563EB"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <AlertCircle size={24} className="text-slate-300 mb-1" />
                  <p className="text-xs">No transactions recorded for this specific period.</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Highest single point:{" "}
              <strong className="text-slate-800">
                ₹{Math.max(0, ...trendData.map((t) => t.sales)).toLocaleString("en-IN")}
              </strong>
            </span>
            <span>
              Total period turnover:{" "}
              <strong className="text-blue-600 font-bold">₹{totalRevenue.toLocaleString("en-IN")}</strong>
            </span>
          </div>
        </div>

        {/* CHART 2: Payment Method Breakdown (1 Column wide) */}
        <div className="card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                  <Wallet size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Payment Modes</h2>
                  <p className="text-[11px] text-slate-400">Tender distribution</p>
                </div>
              </div>
            </div>

            <div className="h-48 sm:h-52 w-full pt-2 flex items-center justify-center">
              {loading ? (
                <div className="w-6 h-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              ) : paymentMethodData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={72}
                      paddingAngle={3}
                    >
                      {paymentMethodData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={PAYMENT_METHOD_COLORS[entry.name] || "#64748B"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name) => [
                        `₹${Number(val).toLocaleString("en-IN")}`,
                        name,
                      ]}
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        borderColor: "#E2E8F0",
                        borderRadius: "0.75rem",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-slate-400 text-center">No payment data recorded</p>
              )}
            </div>

            {/* Payment Method Legends & Percentages */}
            <div className="space-y-1.5 pt-2">
              {paymentMethodData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          PAYMENT_METHOD_COLORS[item.name] || "#64748B",
                      }}
                    />
                    <span className="font-medium text-slate-700">{item.name}</span>
                    <span className="text-[10px] text-slate-400">({item.count} bills)</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">
                      ₹{item.value.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1.5">
                      ({item.percentage}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-500">
            <span>Collected: ₹{totalCollected.toLocaleString("en-IN")}</span>
            <span className="text-amber-600 font-medium">Due: ₹{totalPending.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          SCREEN ONLY: ROW 2 - TRANSACTION VELOCITY & TOP PRODUCTS
      ══════════════════════════════════════════════════ */}
      <div className="screen-only grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* CHART 3: Invoices & Order Velocity */}
        <div className="card p-5">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                <BarChart3 size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Transaction Volume</h2>
                <p className="text-[11px] text-slate-400">Count of bills generated over time</p>
              </div>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
              {totalInvoices} Bills Total
            </span>
          </div>

          <div className="h-60 w-full pt-4">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              </div>
            ) : trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#64748B", fontSize: 11 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#64748B", fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(val) => [`${val} Bills`, "Invoices Created"]}
                    labelFormatter={(label) => `Interval: ${label}`}
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderColor: "#E2E8F0",
                      borderRadius: "0.75rem",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="orders" fill="#6366F1" radius={[6, 6, 0, 0]} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="h-full flex items-center justify-center text-xs text-slate-400">
                No invoices recorded in this period.
              </p>
            )}
          </div>
        </div>

        {/* TOP SELLING PRODUCTS LEADERBOARD */}
        <div className="card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                  <ShoppingBag size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Top-Selling Products</h2>
                  <p className="text-[11px] text-slate-400">Ranked by turnover and volume</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">By Turnover</span>
            </div>

            <div className="pt-3 space-y-2.5">
              {loading ? (
                <div className="py-12 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                </div>
              ) : topProducts.length > 0 ? (
                topProducts.map((p, idx) => {
                  const maxRevenue = topProducts[0]?.revenue || 1;
                  const pct = Math.min(100, Math.round((p.revenue / maxRevenue) * 100));

                  return (
                    <div key={p.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              idx === 0
                                ? "bg-amber-100 text-amber-800"
                                : idx === 1
                                ? "bg-slate-200 text-slate-700"
                                : idx === 2
                                ? "bg-amber-50 text-amber-900"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-slate-800 truncate" title={p.name}>
                            {p.name}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            ({p.quantity} units)
                          </span>
                        </div>
                        <span className="font-bold text-slate-900 shrink-0">
                          ₹{p.revenue.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="py-10 text-center text-xs text-slate-400">
                  No product sale records available for this date period.
                </p>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex justify-between">
            <span>Showing top {topProducts.length} bestsellers</span>
            <span>Real-time POS item data</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          SCREEN ONLY: AUDIT TABLE OF TRANSACTIONS IN PERIOD
      ══════════════════════════════════════════════════ */}
      <div className="screen-only card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
              <FileText size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Period Transactions Audit</h2>
              <p className="text-[11px] text-slate-400">
                Detailed billing records during: {dateRange.displayPeriod}
              </p>
            </div>
          </div>

          {/* Quick Filter Search */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search invoice or customer..."
              value={searchInvoiceQuery}
              onChange={(e) => setSearchInvoiceQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200/90 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Invoices Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">Invoice No.</th>
                <th className="py-2.5 px-3">Date &amp; Time</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Items</th>
                <th className="py-2.5 px-3">Payment Mode</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Grand Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                      <span>Loading period invoices...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSales.length > 0 ? (
                filteredSales.map((sale) => (
                  <tr key={sale.id || sale.invoiceNumber} className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {sale.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(sale.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">
                      {sale.customer?.name || "Walk-in Customer"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {Array.isArray(sale.items) ? sale.items.length : 1} items
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {sale.paymentMethod || "CASH"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sale.paymentStatus === "PAID"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : sale.paymentStatus === "PARTIAL"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {sale.paymentStatus || "PAID"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                      ₹{Number(sale.grandTotal || 0).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No transactions match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          PRINT-ONLY: PROFESSIONAL BUSINESS REPORT (REQ 1 & 2)
          Clean formal document without navigation, buttons or debug payload.
      ══════════════════════════════════════════════════ */}
      <div id="printable-analytics-report" className="print-only font-sans text-slate-900 bg-white">
        {/* Document Header with Shop Details & Period */}
        <div className="border-b-2 border-slate-900 pb-4 mb-5">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                {shopSettings?.shopName || "BILZET RETAIL STORE"}
              </h1>
              <p className="text-xs text-slate-600 mt-1 max-w-md">
                {shopSettings?.address || "Primary Business Premises"}
              </p>
              <div className="flex flex-wrap gap-4 text-xs text-slate-600 mt-1.5 font-medium">
                {shopSettings?.phone && <span>Phone: {shopSettings.phone}</span>}
                {shopSettings?.email && <span>Email: {shopSettings.email}</span>}
                {shopSettings?.gstin && <span>GSTIN: {shopSettings.gstin}</span>}
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded">
                EXECUTIVE ANALYTICS REPORT
              </span>
              <p className="text-xs font-bold text-slate-800 mt-2">
                Reporting Period: <span className="font-black text-blue-700">{dateRange.label}</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{dateRange.displayPeriod}</p>
              <p className="text-[10px] text-slate-400 mt-1">
                Generated: {new Date().toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>

        {/* Executive KPI Summary Grid */}
        <div className="mb-6">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
            1. Executive Financial Summary
          </h2>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="p-3 border border-slate-300 rounded bg-slate-50/50">
              <p className="text-[10px] uppercase font-bold text-slate-500">Gross Sales Revenue</p>
              <p className="text-base font-black text-slate-900 mt-1">
                ₹{totalRevenue.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="p-3 border border-slate-300 rounded bg-slate-50/50">
              <p className="text-[10px] uppercase font-bold text-slate-500">Invoices Generated</p>
              <p className="text-base font-black text-slate-900 mt-1">{totalInvoices} Bills</p>
            </div>
            <div className="p-3 border border-slate-300 rounded bg-slate-50/50">
              <p className="text-[10px] uppercase font-bold text-slate-500">Estimated Net Profit</p>
              <p className="text-base font-black text-emerald-700 mt-1">
                ₹{calculatedNetProfit.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="p-3 border border-slate-300 rounded bg-slate-50/50">
              <p className="text-[10px] uppercase font-bold text-slate-500">Gross Profit Margin</p>
              <p className="text-base font-black text-blue-700 mt-1">{grossMargin}%</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 text-center mt-2.5">
            <div className="p-2 border border-slate-200 rounded text-xs">
              <span className="text-slate-500">Avg Order Value:</span>{" "}
              <strong className="text-slate-900">₹{averageOrderValue.toLocaleString("en-IN")}</strong>
            </div>
            <div className="p-2 border border-slate-200 rounded text-xs">
              <span className="text-slate-500">Taxes / GST:</span>{" "}
              <strong className="text-slate-900">₹{totalTaxes.toLocaleString("en-IN")}</strong>
            </div>
            <div className="p-2 border border-slate-200 rounded text-xs">
              <span className="text-slate-500">Total Collected:</span>{" "}
              <strong className="text-emerald-700">₹{totalCollected.toLocaleString("en-IN")}</strong>
            </div>
            <div className="p-2 border border-slate-200 rounded text-xs">
              <span className="text-slate-500">Total Pending:</span>{" "}
              <strong className="text-amber-700">₹{totalPending.toLocaleString("en-IN")}</strong>
            </div>
          </div>
        </div>

        {/* Section 2: Payment Method Breakdown */}
        <div className="mb-6 print-avoid-break">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            2. Payment Collections Distribution
          </h2>
          <table className="w-full text-left text-xs border border-slate-300">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                <th className="py-2 px-3">Payment Mode</th>
                <th className="py-2 px-3 text-center">Transactions Count</th>
                <th className="py-2 px-3 text-right">Amount (₹)</th>
                <th className="py-2 px-3 text-right">Share of Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paymentMethodData.map((pm) => (
                <tr key={pm.name}>
                  <td className="py-1.5 px-3 font-semibold">{pm.name}</td>
                  <td className="py-1.5 px-3 text-center">{pm.count} bills</td>
                  <td className="py-1.5 px-3 text-right font-mono font-bold">
                    ₹{pm.value.toLocaleString("en-IN")}
                  </td>
                  <td className="py-1.5 px-3 text-right font-semibold">{pm.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 3: Top Selling Products */}
        {topProducts.length > 0 && (
          <div className="mb-6 print-avoid-break">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              3. Top Performing Products
            </h2>
            <table className="w-full text-left text-xs border border-slate-300">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                  <th className="py-2 px-3 text-center w-12">Rank</th>
                  <th className="py-2 px-3">Product Name</th>
                  <th className="py-2 px-3 text-center">Units Sold</th>
                  <th className="py-2 px-3 text-right">Total Turnover (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {topProducts.map((p, idx) => (
                  <tr key={p.name}>
                    <td className="py-1.5 px-3 text-center font-bold">{idx + 1}</td>
                    <td className="py-1.5 px-3 font-medium">{p.name}</td>
                    <td className="py-1.5 px-3 text-center">{p.quantity}</td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold">
                      ₹{p.revenue.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Section 4: Recent Invoices in Period (Up to 25 rows) */}
        {rawSales.length > 0 && (
          <div className="mb-6 print-avoid-break">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              4. Period Transaction Audit Log (Latest {Math.min(rawSales.length, 25)})
            </h2>
            <table className="w-full text-left text-xs border border-slate-300">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                  <th className="py-2 px-3">Invoice No.</th>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Customer</th>
                  <th className="py-2 px-3">Method</th>
                  <th className="py-2 px-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rawSales.slice(0, 25).map((sale) => (
                  <tr key={sale.id || sale.invoiceNumber}>
                    <td className="py-1.5 px-3 font-semibold">{sale.invoiceNumber}</td>
                    <td className="py-1.5 px-3 text-slate-600">
                      {new Date(sale.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-1.5 px-3">{sale.customer?.name || "Walk-in"}</td>
                    <td className="py-1.5 px-3">{sale.paymentMethod || "CASH"}</td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold">
                      ₹{Number(sale.grandTotal || 0).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Signatures & Certification Footer */}
        <div className="pt-8 mt-8 border-t border-slate-300 flex justify-between items-end print-avoid-break">
          <div>
            <p className="text-[11px] text-slate-500">
              This analytics report is computer-generated by the BILZET Retail Business Management System.
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Verification Code: BLZ-RPT-{Date.now().toString(36).toUpperCase()}
            </p>
          </div>
          <div className="text-center">
            <div className="w-44 border-b border-slate-400 mb-1" />
            <p className="text-xs font-bold text-slate-700">Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
}
