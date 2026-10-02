import { useEffect, useState } from "react";
import { reportsApi } from "../api";
import { BarChart3, TrendingUp, DollarSign, Calendar, FileText, ArrowUpRight, Code, RefreshCw } from "lucide-react";
import DateNavigator from "../components/common/DateNavigator";

export default function Reports() {
  const [sales, setSales] = useState(null);
  const [profit, setProfit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
    endDate: new Date(),
    label: "Last 30 Days",
  });
  const [showRawJson, setShowRawJson] = useState(false);

  const loadReports = async (start = dateFilter.startDate, end = dateFilter.endDate) => {
    setLoading(true);
    const p = {
      from: (start || new Date()).toISOString(),
      to: (end || new Date()).toISOString(),
    };

    try {
      const [salesData, profitData] = await Promise.all([
        reportsApi.sales(p).catch(() => ({})),
        reportsApi.profit(p).catch(() => ({})),
      ]);

      setSales(salesData);
      setProfit(profitData);
    } catch (e) {
      console.error("Failed to load reports:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (selected) => {
    setDateFilter(selected);
    loadReports(selected.startDate, selected.endDate);
  };

  useEffect(() => {
    loadReports();
  }, []);

  // Extract metrics safely from diverse backend structures
  const salesSummary = sales?.data || sales || {};
  const profitSummary = profit?.data || profit || {};

  const totalRevenue = salesSummary.totalRevenue ?? salesSummary.totalSales ?? salesSummary.revenue ?? 0;
  const totalOrders = salesSummary.totalInvoices ?? salesSummary.invoiceCount ?? salesSummary.count ?? (Array.isArray(salesSummary) ? salesSummary.length : 0);
  const netProfit = profitSummary.netProfit ?? profitSummary.profit ?? profitSummary.totalProfit ?? 0;
  const grossMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;
  const days = dateFilter?.startDate && dateFilter?.endDate
    ? Math.max(1, Math.round((new Date(dateFilter.endDate) - new Date(dateFilter.startDate)) / (1000 * 60 * 60 * 24)))
    : 30;

  return (
    <div className="space-y-5 pb-12 fade-up">
      {/* ══════════════════════════════════════════════════
          PAGE HEADER
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl border border-indigo-100 grid place-items-center text-indigo-600 bg-indigo-50/70 shadow-2xs shrink-0">
            <BarChart3 size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Analytics &amp; Financial Reports
              </h1>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Reports
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Comprehensive revenue, sales turnover, and profit margins for: <strong>{dateFilter.label}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button
            onClick={() => loadReports(dateFilter.startDate, dateFilter.endDate)}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition"
            title="Refresh analytics"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : ""} />
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          DATE NAVIGATOR (DAY / MONTH / YEAR / RANGE)
      ══════════════════════════════════════════════════ */}
      <DateNavigator
        initialView="month"
        onChange={handleDateChange}
      />

      {/* ══════════════════════════════════════════════════
          METRICS CARDS
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            <DollarSign size={18} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Period Revenue</p>
            <p className="text-lg font-bold text-slate-900">
              ₹{Number(totalRevenue || 0).toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <TrendingUp size={18} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Estimated Profit</p>
            <p className="text-lg font-bold text-emerald-700">
              ₹{Number(netProfit || 0).toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
            <FileText size={18} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Total Transactions</p>
            <p className="text-lg font-bold text-purple-700">{totalOrders}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <ArrowUpRight size={18} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Gross Margin</p>
            <p className="text-lg font-bold text-amber-700">{grossMargin}%</p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          REPORT PANELS
      ══════════════════════════════════════════════════ */}
      <div className="grid gap-5 md:grid-cols-2 items-start">
        {/* Sales Report Card */}
        <div className="card p-5">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                <BarChart3 size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Sales Report Summary</h2>
                <p className="text-[11px] text-slate-400 font-normal">Past {days} days billing activity</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-full">
              Automated
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              <p className="text-xs font-medium">Aggregating sales data...</p>
            </div>
          ) : sales ? (
            <div className="space-y-3">
              <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Gross Sales Volume:</span>
                  <span className="font-bold text-slate-900">₹{Number(totalRevenue || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Total Invoices Generated:</span>
                  <span className="font-bold text-slate-900">{totalOrders} bills</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Reporting Period:</span>
                  <span className="font-medium text-slate-700">Last {days} days</span>
                </div>
              </div>

              {/* Collapsible raw data */}
              <div className="pt-2">
                <button
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                >
                  <Code size={13} />
                  <span>{showRawJson ? "Hide Raw JSON Output" : "View Full Backend Payload"}</span>
                </button>
                {showRawJson && (
                  <pre className="mt-2.5 max-h-60 overflow-auto rounded-xl bg-slate-900 p-3.5 text-[11px] text-slate-200 font-mono">
                    {JSON.stringify(sales, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-xs text-slate-400">No sales data available for this range.</p>
          )}
        </div>

        {/* Profit Report Card */}
        <div className="card p-5">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Profit &amp; Margin Report</h2>
                <p className="text-[11px] text-slate-400 font-normal">Calculated from purchase vs selling prices</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
              P&amp;L Analysis
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <div className="w-6 h-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              <p className="text-xs font-medium">Computing profit margins...</p>
            </div>
          ) : profit ? (
            <div className="space-y-3">
              <div className="p-3.5 bg-emerald-50/50 border border-emerald-200/70 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-700">
                  <span>Net Estimated Profit:</span>
                  <span className="font-bold text-emerald-800">₹{Number(netProfit || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span>Estimated Profit Margin:</span>
                  <span className="font-bold text-emerald-800">{grossMargin}%</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span>Accounting Basis:</span>
                  <span className="font-medium text-slate-600">Accrual sales vs item cost</span>
                </div>
              </div>

              {/* Collapsible raw data */}
              <div className="pt-2">
                <button
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
                >
                  <Code size={13} />
                  <span>{showRawJson ? "Hide Raw JSON Output" : "View Full Backend Payload"}</span>
                </button>
                {showRawJson && (
                  <pre className="mt-2.5 max-h-60 overflow-auto rounded-xl bg-slate-900 p-3.5 text-[11px] text-slate-200 font-mono">
                    {JSON.stringify(profit, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-xs text-slate-400">No profit records calculated yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
