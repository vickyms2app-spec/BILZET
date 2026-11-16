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
    <div className="space-y-5 max-w-7xl mx-auto px-4 sm:px-6 pb-12 fade-up text-[#111318]">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#F6F6F8] p-6 rounded-[28px] border border-[#E7E8EC] shadow-fintech">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-[#111318] tracking-tight font-heading">
              Business Expenses
            </h1>
            {shopSettings?.name || shopSettings?.shopName ? (
              <span className="text-[10px] font-bold text-[#111318] bg-[#FAFAFB] border border-[#E7E8EC] px-3 py-0.5 rounded-full flex items-center gap-1.5 uppercase tracking-wider shadow-2xs">
                <Building2 size={11} className="text-[#5BF07B]" />
                <span>{shopSettings?.name || shopSettings?.shopName}</span>
              </span>
            ) : null}
          </div>
          <p className="text-xs text-[#7C7F8A] font-medium mt-1">
            Track and manage business expenses, categorize payouts, and analyze cash outflow.
          </p>
        </div>

        {/* Action Buttons: Sync | Export PDF | + Add Expense */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
          {/* Sync Button */}
          <button
            type="button"
            onClick={() => loadExpenses(true)}
            disabled={refreshing}
            className="p-2.5 rounded-full border border-[#E7E8EC] bg-white text-[#111318] hover:bg-[#EDEDEF] transition flex items-center justify-center shrink-0 cursor-pointer shadow-2xs disabled:opacity-60"
            title="Sync latest records"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin text-[#111318]" : "text-[#7C7F8A]"} />
          </button>

          {/* Export PDF Button */}
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exportingPdf || loading || filteredExpenses.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold border border-[#E7E8EC] bg-white hover:bg-[#EDEDEF] text-[#111318] transition cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download PDF report of current expenses"
          >
            {exportingPdf ? (
              <Loader2 size={13} className="animate-spin text-[#111318]" />
            ) : (
              <Download size={13} className="text-[#7C7F8A]" />
            )}
            <span>Export PDF</span>
          </button>

          {/* Print Button (Optional Print Support) */}
          <button
            type="button"
            onClick={handlePrintExpenses}
            disabled={loading || filteredExpenses.length === 0}
            className="p-2.5 rounded-full border border-[#E7E8EC] bg-white text-[#7C7F8A] hover:text-[#111318] hover:bg-[#EDEDEF] transition flex items-center justify-center shrink-0 cursor-pointer shadow-2xs disabled:opacity-50"
            title="Print expenses ledger"
          >
            <Printer size={14} />
          </button>

          {/* + Add Expense Button */}
          {canManage && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#12151C] hover:bg-[#202530] text-white font-bold text-xs transition cursor-pointer shadow-fintech"
            >
              <Plus size={14} strokeWidth={2.5} className="text-[#5BF07B]" />
              <span>Add Expense</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Status Messages ── */}
      {error && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-full bg-[#FBD3D3] border border-[#E5484D]/30 text-[#E5484D] text-xs animate-in fade-in">
          <AlertCircle size={15} className="shrink-0 text-[#E5484D]" />
          <span className="font-semibold flex-1">{error}</span>
          <button onClick={() => setError("")} className="text-[#E5484D] hover:opacity-80 cursor-pointer mr-2">
            <X size={14} />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-full bg-[#DFFFE6] border border-[#5BF07B]/40 text-[#0E2A16] text-xs animate-in fade-in">
          <CheckCircle2 size={15} className="shrink-0 text-[#0E2A16]" />
          <span className="font-semibold flex-1">{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="text-[#0E2A16] hover:opacity-80 cursor-pointer mr-2">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Summary Metrics (4 Compact Cards) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Expenses */}
        <div className="bg-[#12151C] text-white p-5 rounded-[24px] border border-white/10 shadow-fintech flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/70 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Outflows</span>
            <div className="w-8 h-8 rounded-full bg-white/10 text-[#5BF07B] flex items-center justify-center">
              <Receipt size={14} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#5BF07B] font-mono tracking-tight">
            {formatINR(stats.total)}
          </div>
          <div className="text-[11px] text-white/60 mt-1">All recorded vouchers</div>
        </div>

        {/* 2. This Month */}
        <div className="bg-[#F6F6F8] p-5 rounded-[24px] border border-[#E7E8EC] shadow-fintech flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7C7F8A] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">This Month</span>
            <div className="w-8 h-8 rounded-full bg-[#EDEDEF] text-[#111318] flex items-center justify-center">
              <Calendar size={14} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#111318] font-mono tracking-tight">
            {formatINR(stats.thisMonthTotal)}
          </div>
          <div className="text-[11px] text-[#7C7F8A] mt-1 font-medium">Current calendar month</div>
        </div>

        {/* 3. Today's Payouts */}
        <div className="bg-[#F6F6F8] p-5 rounded-[24px] border border-[#E7E8EC] shadow-fintech flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7C7F8A] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Today's Payouts</span>
            <div className="w-8 h-8 rounded-full bg-[#EDEDEF] text-[#111318] flex items-center justify-center">
              <CreditCard size={14} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#111318] font-mono tracking-tight">
            {formatINR(stats.todayTotal)}
          </div>
          <div className="text-[11px] text-[#7C7F8A] mt-1 font-medium">Disbursed today</div>
        </div>

        {/* 4. Total Entries */}
        <div className="bg-[#F6F6F8] p-5 rounded-[24px] border border-[#E7E8EC] shadow-fintech flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7C7F8A] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Entries</span>
            <div className="w-8 h-8 rounded-full bg-[#EDEDEF] text-[#111318] flex items-center justify-center">
              <FileText size={14} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#111318] font-mono tracking-tight">
            {stats.count}
          </div>
          <div className="text-[11px] text-[#7C7F8A] mt-1 font-medium">Recorded vouchers</div>
        </div>
      </div>

      {/* ── Table Card & Toolbar ── */}
      <div className="bg-[#F6F6F8] rounded-[28px] border border-[#E7E8EC] shadow-fintech overflow-hidden">
        {/* Compact Search & Category Filter Toolbar */}
        <div className="p-4 border-b border-[#E7E8EC] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAFAFB]">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search Input */}
            <div className="relative min-w-48 max-w-sm flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C7F8A]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, payee, or amount…"
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-full border border-[#E7E8EC] bg-white text-[#111318] outline-none focus:border-[#12151C] transition shadow-2xs"
              />
            </div>

            {/* Category Dropdown */}
            <div className="flex items-center gap-1.5">
              <Filter size={13} className="text-[#7C7F8A] shrink-0" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3.5 py-2 rounded-full border border-[#E7E8EC] bg-white text-xs font-semibold text-[#111318] cursor-pointer outline-none focus:border-[#12151C] transition shadow-2xs"
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
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#111318] hover:bg-[#EDEDEF] rounded-full transition cursor-pointer"
              >
                <X size={12} />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Compact Result Count */}
          <div className="text-xs text-[#7C7F8A] self-end sm:self-center font-medium">
            Showing <strong className="text-[#111318] font-bold">{filteredExpenses.length}</strong> of {expenses.length} expenses
          </div>
        </div>

        {/* Expenses Table */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-[#86868B] gap-2.5">
            <Loader2 size={24} className="animate-spin text-[#12151C]" />
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
                className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#12151C] hover:bg-black text-white text-xs font-semibold transition cursor-pointer shadow-fintech"
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
                className="inline-flex items-center gap-1 text-[#111318] hover:underline font-semibold cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#12151C]/75 backdrop-blur-xs animate-in fade-in">
          <div
            className="fixed inset-0"
            onClick={() => !submitting && setIsModalOpen(false)}
          />
          <div className="relative bg-[#F6F6F8] rounded-[28px] border border-[#E7E8EC] shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-6 sm:p-7 space-y-4 z-10 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E7E8EC]">
              <div>
                <h2 className="text-base font-bold text-[#111318] leading-tight font-heading">
                  {editingExpense ? "Edit Expense" : "Record Expense"}
                </h2>
                <p className="text-xs text-[#7C7F8A] mt-0.5 font-medium">
                  {editingExpense
                    ? "Update expense details and ledger notes."
                    : "Record operational outflow with instant ledger persistence."}
                </p>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#7C7F8A] hover:text-[#111318] hover:bg-[#EDEDEF] transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Error display inside modal */}
            {error && (
              <div className="p-3 rounded-full bg-[#FBD3D3] border border-[#E5484D]/30 text-[#E5484D] text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSaveExpense} className="space-y-4 text-xs">
              {/* Title / Payee */}
              <div>
                <label className="block text-xs font-semibold text-[#111318] mb-1.5">
                  Expense Title / Payee *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Shop Rent October, Electricity Bill, Staff Salary"
                  className={`w-full px-4 py-2.5 bg-white border rounded-full text-[#111318] placeholder:text-[#A9ABB5] outline-none focus:border-[#12151C] transition shadow-2xs ${
                    formErrors.title ? "border-[#E5484D] bg-[#FBD3D3]/20" : "border-[#E7E8EC]"
                  }`}
                />
                {formErrors.title && (
                  <p className="text-[11px] text-[#E5484D] font-medium mt-1">{formErrors.title}</p>
                )}
              </div>

              {/* Category & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#111318] mb-1.5">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-[#E7E8EC] rounded-full text-[#111318] outline-none focus:border-[#12151C] transition cursor-pointer shadow-2xs font-medium"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111318] mb-1.5">
                    Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7C7F8A] font-medium">
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
                      className={`w-full pl-8 pr-4 py-2.5 bg-white border rounded-full text-[#111318] font-semibold outline-none focus:border-[#12151C] transition shadow-2xs ${
                        formErrors.amount ? "border-[#E5484D] bg-[#FBD3D3]/20" : "border-[#E7E8EC]"
                      }`}
                    />
                  </div>
                  {formErrors.amount && (
                    <p className="text-[11px] text-[#E5484D] font-medium mt-1">{formErrors.amount}</p>
                  )}
                </div>
              </div>

              {/* Payment Method & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#111318] mb-1.5">
                    Payment Method
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-[#E7E8EC] rounded-full text-[#111318] outline-none focus:border-[#12151C] transition cursor-pointer shadow-2xs font-medium"
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111318] mb-1.5">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-[#E7E8EC] rounded-full text-[#111318] outline-none focus:border-[#12151C] transition cursor-pointer shadow-2xs font-medium"
                  />
                </div>
              </div>

              {/* Remarks / Description */}
              <div>
                <label className="block text-xs font-semibold text-[#111318] mb-1.5">
                  Notes / Bill Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional remarks, invoice number, or voucher reference…"
                  className="w-full px-4 py-2.5 bg-white border border-[#E7E8EC] rounded-[18px] text-[#111318] placeholder:text-[#A9ABB5] outline-none focus:border-[#12151C] transition shadow-2xs font-medium"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#E7E8EC] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-full border border-[#E7E8EC] text-[#111318] hover:bg-[#EDEDEF] font-semibold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-full bg-[#12151C] hover:bg-[#202530] text-white font-bold text-xs shadow-fintech transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin text-[#5BF07B]" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#12151C]/75 backdrop-blur-xs animate-in fade-in">
          <div
            className="fixed inset-0"
            onClick={() => !deleting && setDeleteTarget(null)}
          />
          <div className="relative bg-[#F6F6F8] rounded-[28px] border border-[#E7E8EC] shadow-2xl max-w-sm w-full p-6 space-y-4 z-10 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FBD3D3] text-[#E5484D] border border-[#E5484D]/30 flex items-center justify-center shrink-0">
                <Trash2 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#111318] font-heading">Delete Expense</h3>
                <p className="text-xs text-[#7C7F8A] mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-3.5 bg-[#FAFAFB] rounded-[18px] border border-[#E7E8EC] text-xs space-y-1.5">
              <div className="font-semibold text-[#111318]">{deleteTarget.title}</div>
              <div className="text-[#7C7F8A] flex items-center justify-between">
                <span>Amount: <strong className="text-[#111318] font-mono">{formatINR(deleteTarget.amount)}</strong></span>
                <span>Date: {deleteTarget.date ? new Date(deleteTarget.date).toLocaleDateString("en-IN") : "—"}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-full border border-[#E7E8EC] text-[#111318] hover:bg-[#EDEDEF] text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#E5484D] hover:bg-[#d43f44] text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
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
