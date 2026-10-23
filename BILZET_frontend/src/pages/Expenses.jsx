import { useState, useEffect, useMemo, useRef } from "react";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Calendar,
  CreditCard,
  Trash2,
  Edit2,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  Printer,
  RefreshCw,
  FileText,
  Building2,
  ChevronDown,
} from "lucide-react";
import { expensesApi, settingsApi } from "../api";
import { useAuth } from "../store/auth";
import { apiError } from "../api/http";
import { generateExpensePdf } from "../utils/expensePdfGenerator";

const EXPENSE_CATEGORIES = [
  { id: "rent", label: "Rent & Lease" },
  { id: "electricity", label: "Electricity & Utilities" },
  { id: "salary", label: "Staff Salary & Wages" },
  { id: "transport", label: "Transport & Logistics" },
  { id: "maintenance", label: "Maintenance & Repairs" },
  { id: "marketing", label: "Marketing & Advertising" },
  { id: "inventory", label: "Stock & Inventory Supplies" },
  { id: "taxes", label: "Govt Taxes & Licenses" },
  { id: "other", label: "Other Operating Expenses" },
];

const PAYMENT_METHODS = [
  { id: "cash", label: "Cash" },
  { id: "upi", label: "UPI / QR Code" },
  { id: "card", label: "Debit / Credit Card" },
  { id: "bank_transfer", label: "Bank Transfer / NEFT" },
  { id: "credit", label: "Store Credit / Pay Later" },
];

function formatINR(amount) {
  const val = Number(amount || 0);
  return "₹" + val.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function Expenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Store Configuration for branding
  const [shopSettings, setShopSettings] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("bilzet_active_store") || "null");
      return stored || { shopName: "BILZET Retail Store" };
    } catch (_) {
      return { shopName: "BILZET Retail Store" };
    }
  });

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    category: "rent",
    amount: "",
    paymentMethod: "cash",
    date: new Date().toISOString().split("T")[0],
    description: "",
  });

  const [formErrors, setFormErrors] = useState({});

  const canManage = useMemo(() => {
    const role = (user?.role || "").toUpperCase();
    return ["ADMIN", "MANAGER", "SUPER_ADMIN", "OWNER"].includes(role) || user?.isOwner;
  }, [user]);

  const loadExpenses = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      else setRefreshing(true);
      setError("");

      const res = await expensesApi.list({ limit: 500 });
      const list =
        res?.data?.expenses ||
        res?.expenses ||
        (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
      setExpenses(list);
    } catch (err) {
      console.error("Failed to load expenses:", err);
      setError(apiError(err) || "Failed to load expenses. Please check your connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadExpenses();

    // Fetch shop settings as metadata fallback
    settingsApi.get()
      .then((data) => {
        if (data) {
          setShopSettings((prev) => ({ ...prev, ...data }));
        }
      })
      .catch(() => {});

    // Listen for store switch
    const handleStoreChange = () => {
      try {
        const stored = JSON.parse(localStorage.getItem("bilzet_active_store") || "null");
        if (stored) setShopSettings(stored);
        loadExpenses(true);
      } catch (_) {}
    };

    window.addEventListener("bilzet:store-changed", handleStoreChange);
    return () => window.removeEventListener("bilzet:store-changed", handleStoreChange);
  }, []);

  const validateForm = () => {
    const errs = {};
    if (!formData.title.trim()) {
      errs.title = "Expense title or payee name is required.";
    }
    const amt = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amt) || amt <= 0) {
      errs.amount = "Enter a valid expense amount greater than 0.";
    }
    if (!formData.category) {
      errs.category = "Please select an expense category.";
    }
    if (!formData.date) {
      errs.date = "Expense date is required.";
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleOpenAddModal = () => {
    setEditingExpense(null);
    setFormData({
      title: "",
      category: "rent",
      amount: "",
      paymentMethod: "cash",
      date: new Date().toISOString().split("T")[0],
      description: "",
    });
    setFormErrors({});
    setError("");
    setSuccessMsg("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (exp) => {
    setEditingExpense(exp);
    setFormData({
      title: exp.title || "",
      category: exp.category || "rent",
      amount: String(exp.amount || ""),
      paymentMethod: exp.paymentMethod ? exp.paymentMethod.toLowerCase() : "cash",
      date: exp.date ? new Date(exp.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      description: exp.description || exp.note || "",
    });
    setFormErrors({});
    setError("");
    setSuccessMsg("");
    setIsModalOpen(true);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!validateForm()) return;

    setSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      const payload = {
        title: formData.title.trim(),
        category: formData.category,
        amount: parseFloat(formData.amount),
        paymentMethod: formData.paymentMethod,
        date: new Date(formData.date).toISOString(),
        description: formData.description.trim(),
        note: formData.description.trim(),
      };

      if (editingExpense) {
        const id = editingExpense.id || editingExpense._id;
        await expensesApi.update(id, payload);
        setSuccessMsg(`Expense "${formData.title}" updated successfully!`);
      } else {
        await expensesApi.create(payload);
        setSuccessMsg(`Expense "${formData.title}" of ${formatINR(formData.amount)} recorded successfully!`);
      }

      setIsModalOpen(false);
      setEditingExpense(null);
      setFormData({
        title: "",
        category: "rent",
        amount: "",
        paymentMethod: "cash",
        date: new Date().toISOString().split("T")[0],
        description: "",
      });
      setFormErrors({});

      // Reload list and notify dashboard
      await loadExpenses(true);
      window.dispatchEvent(new CustomEvent("bilzet:expense_updated"));
    } catch (err) {
      console.error("Error saving expense:", err);
      setError(apiError(err) || "Failed to save expense. Please verify all details.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const id = deleteTarget.id || deleteTarget._id;
    const title = deleteTarget.title;

    try {
      await expensesApi.remove(id);
      setExpenses((prev) => prev.filter((item) => (item.id || item._id) !== id));
      setSuccessMsg(`Expense "${title}" deleted successfully.`);
      setDeleteTarget(null);
      window.dispatchEvent(new CustomEvent("bilzet:expense_updated"));
    } catch (err) {
      setError(apiError(err) || "Failed to delete expense.");
    } finally {
      setDeleting(false);
    }
  };

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      const matchesCategory =
        selectedCategory === "ALL" ||
        item.category?.toLowerCase() === selectedCategory.toLowerCase();

      const term = search.toLowerCase().trim();
      const matchesSearch =
        !term ||
        item.title?.toLowerCase().includes(term) ||
        item.category?.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term) ||
        item.note?.toLowerCase().includes(term) ||
        String(item.amount).includes(term);

      return matchesCategory && matchesSearch;
    });
  }, [expenses, selectedCategory, search]);

  // Statistics
  const stats = useMemo(() => {
    const total = expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const count = expenses.length;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthTotal = expenses.reduce((acc, curr) => {
      const d = new Date(curr.date || curr.createdAt);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        return acc + (Number(curr.amount) || 0);
      }
      return acc;
    }, 0);

    const todayStr = now.toISOString().split("T")[0];
    const todayTotal = expenses.reduce((acc, curr) => {
      const d = (curr.date || curr.createdAt || "").split("T")[0];
      if (d === todayStr) {
        return acc + (Number(curr.amount) || 0);
      }
      return acc;
    }, 0);

    return { total, count, thisMonthTotal, todayTotal };
  }, [expenses]);

  // PDF Export Action
  const handleExportPdf = () => {
    if (filteredExpenses.length === 0) {
      setError("No matching expenses available to export.");
      return;
    }

    setExportingPdf(true);
    setError("");

    try {
      const catObj = EXPENSE_CATEGORIES.find(
        (c) => c.id.toLowerCase() === selectedCategory.toLowerCase()
      );
      const categoryLabel = catObj ? catObj.label : "All Categories";

      const { fileName } = generateExpensePdf({
        expenses: filteredExpenses,
        shopSettings,
        selectedCategory,
        categoryLabel,
        searchQuery: search.trim(),
        autoDownload: true,
      });

      setSuccessMsg(`Expense report "${fileName}" downloaded successfully!`);
    } catch (err) {
      console.error("PDF Export error:", err);
      setError("Failed to generate PDF. Please try again.");
    } finally {
      setExportingPdf(false);
    }
  };

  // Browser Print Action
  const handlePrintExpenses = () => {
    if (filteredExpenses.length === 0) {
      setError("No matching expenses available to print.");
      return;
    }
    window.print();
  };

  const hasActiveFilters = search.trim() !== "" || selectedCategory !== "ALL";

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory("ALL");
  };

  return (
    <div
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif' }}
      className="space-y-4 max-w-7xl mx-auto px-4 sm:px-6 pb-12 fade-up text-[#1D1D1F]"
    >
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-[#E5E5EA] shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-semibold text-[#1D1D1F] tracking-tight">
              Business Expenses
            </h1>
            {shopSettings?.name || shopSettings?.shopName ? (
              <span className="text-[11px] font-semibold text-[#007AFF] bg-[#EBF5FF] border border-[#D0E2FF] px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
                <Building2 size={11} />
                <span>{shopSettings?.name || shopSettings?.shopName}</span>
              </span>
            ) : null}
          </div>
          <p className="text-xs text-[#6E6E73] font-normal mt-0.5">
            Track and manage business expenses.
          </p>
        </div>

        {/* Action Buttons: Sync | Export PDF | + Add Expense */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {/* Sync Button */}
          <button
            type="button"
            onClick={() => loadExpenses(true)}
            disabled={refreshing}
            className="p-2 rounded-xl border border-[#E5E5EA] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7] transition flex items-center justify-center shrink-0 cursor-pointer shadow-2xs disabled:opacity-60"
            title="Sync latest records"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin text-[#007AFF]" : "text-[#6E6E73]"} />
          </button>

          {/* Export PDF Button */}
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exportingPdf || loading || filteredExpenses.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-[#E5E5EA] bg-white hover:bg-[#F5F5F7] text-[#1D1D1F] transition cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download PDF report of current expenses"
          >
            {exportingPdf ? (
              <Loader2 size={13} className="animate-spin text-[#007AFF]" />
            ) : (
              <Download size={13} className="text-[#6E6E73]" />
            )}
            <span>Export PDF</span>
          </button>

          {/* Print Button (Optional Print Support) */}
          <button
            type="button"
            onClick={handlePrintExpenses}
            disabled={loading || filteredExpenses.length === 0}
            className="p-2 rounded-xl border border-[#E5E5EA] bg-white text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition flex items-center justify-center shrink-0 cursor-pointer shadow-2xs disabled:opacity-50"
            title="Print expenses ledger"
          >
            <Printer size={14} />
          </button>

          {/* + Add Expense Button */}
          {canManage && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] active:scale-98 text-white font-semibold text-xs transition cursor-pointer shadow-2xs"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Add Expense</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Status Messages ── */}
      {error && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs animate-in fade-in">
          <AlertCircle size={15} className="shrink-0 text-rose-600" />
          <span className="font-medium flex-1">{error}</span>
          <button onClick={() => setError("")} className="text-rose-500 hover:text-rose-700 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs animate-in fade-in">
          <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
          <span className="font-medium flex-1">{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-500 hover:text-emerald-700 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Summary Metrics (4 Compact Cards) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Total Expenses */}
        <div className="bg-white p-3.5 rounded-xl border border-[#E5E5EA] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#86868B] mb-1">
            <span className="text-[12px] font-medium">Total Expenses</span>
            <Receipt size={14} className="text-[#007AFF]" />
          </div>
          <div className="text-xl sm:text-2xl font-semibold text-[#1D1D1F] font-mono tracking-tight">
            {formatINR(stats.total)}
          </div>
          <div className="text-[11px] text-[#86868B] mt-0.5">All recorded outflows</div>
        </div>

        {/* 2. This Month */}
        <div className="bg-white p-3.5 rounded-xl border border-[#E5E5EA] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#86868B] mb-1">
            <span className="text-[12px] font-medium">This Month</span>
            <Calendar size={14} className="text-[#34C759]" />
          </div>
          <div className="text-xl sm:text-2xl font-semibold text-[#1D1D1F] font-mono tracking-tight">
            {formatINR(stats.thisMonthTotal)}
          </div>
          <div className="text-[11px] text-[#86868B] mt-0.5">Current month spending</div>
        </div>

        {/* 3. Today's Payouts */}
        <div className="bg-white p-3.5 rounded-xl border border-[#E5E5EA] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#86868B] mb-1">
            <span className="text-[12px] font-medium">Today's Payouts</span>
            <CreditCard size={14} className="text-[#FF9500]" />
          </div>
          <div className="text-xl sm:text-2xl font-semibold text-[#1D1D1F] font-mono tracking-tight">
            {formatINR(stats.todayTotal)}
          </div>
          <div className="text-[11px] text-[#86868B] mt-0.5">Disbursed today</div>
        </div>

        {/* 4. Total Entries */}
        <div className="bg-white p-3.5 rounded-xl border border-[#E5E5EA] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#86868B] mb-1">
            <span className="text-[12px] font-medium">Total Entries</span>
            <FileText size={14} className="text-[#5856D6]" />
          </div>
          <div className="text-xl sm:text-2xl font-semibold text-[#1D1D1F] font-mono tracking-tight">
            {stats.count}
          </div>
          <div className="text-[11px] text-[#86868B] mt-0.5">Recorded vouchers</div>
        </div>
      </div>

      {/* ── Table Card & Toolbar ── */}
      <div className="bg-white rounded-xl border border-[#E5E5EA] shadow-2xs overflow-hidden">
        {/* Compact Search & Category Filter Toolbar */}
        <div className="p-3 border-b border-[#E5E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#FAFAFC]">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Search Input */}
            <div className="relative min-w-44 max-w-xs flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#86868B]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, payee, or amount…"
                className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-[#E5E5EA] bg-white text-[#1D1D1F] outline-none focus:border-[#007AFF] transition"
              />
            </div>

            {/* Category Dropdown */}
            <div className="flex items-center gap-1.5">
              <Filter size={13} className="text-[#86868B] shrink-0" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-[#E5E5EA] bg-white text-xs font-medium text-[#1D1D1F] cursor-pointer outline-none focus:border-[#007AFF] transition"
              >
                <option value="ALL">All Categories</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filter Action */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#007AFF] hover:bg-[#F2F2F7] rounded-lg transition cursor-pointer"
              >
                <X size={12} />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Compact Result Count */}
          <div className="text-xs text-[#86868B] self-end sm:self-center font-medium">
            Showing <strong className="text-[#1D1D1F] font-semibold">{filteredExpenses.length}</strong> of {expenses.length} expenses
          </div>
        </div>

        {/* Expenses Table */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-[#86868B] gap-2.5">
            <Loader2 size={24} className="animate-spin text-[#007AFF]" />
            <p className="text-xs font-medium text-[#6E6E73]">Loading business expenses…</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="py-16 text-center text-[#86868B] px-4">
            <Receipt size={36} className="mx-auto text-[#C7C7CC] mb-2" />
            <p className="text-sm font-semibold text-[#1D1D1F]">No expenses found</p>
            <p className="text-xs text-[#86868B] mt-0.5 max-w-sm mx-auto">
              {hasActiveFilters
                ? "No expense records match your active search or category filter."
                : "Record operational costs, utility bills, or rent to track store expenditure."}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E5EA] bg-white hover:bg-[#F5F5F7] text-xs font-medium text-[#1D1D1F] transition cursor-pointer"
              >
                <span>Clear active filters</span>
              </button>
            ) : canManage ? (
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-medium transition cursor-pointer shadow-2xs"
              >
                <Plus size={13} />
                <span>Record First Expense</span>
              </button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFAFC] border-b border-[#E5E5EA] text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
                  <th className="py-2.5 px-3.5">Date</th>
                  <th className="py-2.5 px-3.5">Expense / Title</th>
                  <th className="py-2.5 px-3.5">Category</th>
                  <th className="py-2.5 px-3.5">Payment Method</th>
                  <th className="py-2.5 px-3.5 text-right">Amount</th>
                  {canManage && <th className="py-2.5 px-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA]">
                {filteredExpenses.map((exp) => {
                  const id = exp.id || exp._id;
                  const dateStr = exp.date
                    ? new Date(exp.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "—";

                  const catObj = EXPENSE_CATEGORIES.find(
                    (c) => c.id.toLowerCase() === exp.category?.toLowerCase()
                  );
                  const catLabel = catObj?.label || exp.category || "General";

                  return (
                    <tr key={id} className="hover:bg-[#F9F9FB] transition">
                      {/* Date */}
                      <td className="py-2.5 px-3.5 font-mono text-[11px] text-[#6E6E73] whitespace-nowrap">
                        {dateStr}
                      </td>

                      {/* Title / Description */}
                      <td className="py-2.5 px-3.5">
                        <div className="font-medium text-[#1D1D1F] leading-snug">{exp.title}</div>
                        {(exp.description || exp.note) && (
                          <div className="text-[11px] text-[#86868B] truncate max-w-xs mt-0.5">
                            {exp.description || exp.note}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3.5">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#F2F2F7] text-[#1D1D1F] border border-[#E5E5EA]">
                          {catLabel}
                        </span>
                      </td>

                      {/* Payment Method */}
                      <td className="py-2.5 px-3.5">
                        <span className="inline-flex items-center gap-1.5 text-xs text-[#6E6E73] capitalize">
                          <CreditCard size={12} className="text-[#86868B]" />
                          <span>{String(exp.paymentMethod || "CASH").replace(/_/g, " ")}</span>
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-2.5 px-3.5 text-right">
                        <span className="font-mono font-semibold text-[#1D1D1F] text-xs sm:text-sm">
                          {formatINR(exp.amount)}
                        </span>
                      </td>

                      {/* Actions */}
                      {canManage && (
                        <td className="py-2 px-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(exp)}
                              className="p-1.5 rounded-md hover:bg-[#F2F2F7] text-[#6E6E73] hover:text-[#1D1D1F] transition cursor-pointer"
                              title="Edit expense details"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(exp)}
                              className="p-1.5 rounded-md hover:bg-rose-50 text-[#6E6E73] hover:text-[#FF3B30] transition cursor-pointer"
                              title="Delete record"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer Summary */}
        {filteredExpenses.length > 0 && (
          <div className="p-3 bg-[#FAFAFC] border-t border-[#E5E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#86868B]">
            <div>
              Total filtered expenditure:{" "}
              <strong className="text-[#1D1D1F] font-mono font-semibold">
                {formatINR(
                  filteredExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
                )}
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={exportingPdf}
                className="inline-flex items-center gap-1 text-[#007AFF] hover:underline font-medium cursor-pointer"
              >
                <Download size={12} />
                <span>Export current view as PDF</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── CREATE / EDIT EXPENSE MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div
            className="fixed inset-0"
            onClick={() => !submitting && setIsModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl border border-[#E5E5EA] shadow-xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-4 z-10 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA]">
              <div>
                <h2 className="text-base font-semibold text-[#1D1D1F] leading-tight">
                  {editingExpense ? "Edit Expense" : "Record Expense"}
                </h2>
                <p className="text-xs text-[#86868B] mt-0.5">
                  {editingExpense
                    ? "Update expense details and ledger notes."
                    : "Record operational outflow with instant ledger persistence."}
                </p>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Error display inside modal */}
            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSaveExpense} className="space-y-3.5 text-xs">
              {/* Title / Payee */}
              <div>
                <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
                  Expense Title / Payee *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Shop Rent October, Electricity Bill, Staff Salary"
                  className={`w-full px-3 py-2 bg-white border rounded-xl text-[#1D1D1F] placeholder:text-[#86868B] outline-none focus:border-[#007AFF] transition ${
                    formErrors.title ? "border-rose-500 bg-rose-50/20" : "border-[#E5E5EA]"
                  }`}
                />
                {formErrors.title && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">{formErrors.title}</p>
                )}
              </div>

              {/* Category & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E5E5EA] rounded-xl text-[#1D1D1F] outline-none focus:border-[#007AFF] transition cursor-pointer"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
                    Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868B] font-medium">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      className={`w-full pl-7 pr-3 py-2 bg-white border rounded-xl text-[#1D1D1F] font-semibold outline-none focus:border-[#007AFF] transition ${
                        formErrors.amount ? "border-rose-500 bg-rose-50/20" : "border-[#E5E5EA]"
                      }`}
                    />
                  </div>
                  {formErrors.amount && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1">{formErrors.amount}</p>
                  )}
                </div>
              </div>

              {/* Payment Method & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
                    Payment Method
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E5E5EA] rounded-xl text-[#1D1D1F] outline-none focus:border-[#007AFF] transition cursor-pointer"
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E5E5EA] rounded-xl text-[#1D1D1F] outline-none focus:border-[#007AFF] transition cursor-pointer"
                  />
                </div>
              </div>

              {/* Remarks / Description */}
              <div>
                <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
                  Notes / Bill Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional remarks, invoice number, or voucher reference…"
                  className="w-full px-3 py-2 bg-white border border-[#E5E5EA] rounded-xl text-[#1D1D1F] placeholder:text-[#86868B] outline-none focus:border-[#007AFF] transition"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#E5E5EA] flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-[#E5E5EA] text-[#1D1D1F] hover:bg-[#F5F5F7] font-medium text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] active:scale-98 text-white font-semibold text-xs shadow-2xs transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <span>{editingExpense ? "Update Expense" : "Create Expense"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div
            className="fixed inset-0"
            onClick={() => !deleting && setDeleteTarget(null)}
          />
          <div className="relative bg-white rounded-2xl border border-[#E5E5EA] shadow-xl max-w-sm w-full p-5 space-y-4 z-10 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                <Trash2 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#1D1D1F]">Delete Expense</h3>
                <p className="text-xs text-[#86868B] mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-3 bg-[#F9F9FB] rounded-xl border border-[#E5E5EA] text-xs space-y-1">
              <div className="font-semibold text-[#1D1D1F]">{deleteTarget.title}</div>
              <div className="text-[#86868B] flex items-center justify-between">
                <span>Amount: <strong className="text-[#1D1D1F] font-mono">{formatINR(deleteTarget.amount)}</strong></span>
                <span>Date: {deleteTarget.date ? new Date(deleteTarget.date).toLocaleDateString("en-IN") : "—"}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-1.5 rounded-xl border border-[#E5E5EA] text-[#1D1D1F] hover:bg-[#F5F5F7] text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Deleting…</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
