import { useState, useEffect, useMemo } from "react";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Calendar,
  CreditCard,
  DollarSign,
  TrendingDown,
  Trash2,
  Edit2,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  Building2,
  ArrowUpDown,
  RefreshCw
} from "lucide-react";
import { expensesApi } from "../api";
import { useAuth } from "../store/auth";
import { apiError } from "../api/http";

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

export default function Expenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

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

      const res = await expensesApi.list({ limit: 200 });
      const list = res?.data?.expenses || res?.expenses || (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
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

  const handleCreateExpense = async (e) => {
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

      await expensesApi.create(payload);

      setSuccessMsg(`Expense "${formData.title}" of ₹${Number(formData.amount).toLocaleString("en-IN")} recorded successfully!`);
      setIsModalOpen(false);
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
      console.error("Error creating expense:", err);
      setError(apiError(err) || "Failed to create expense. Please verify all details.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete expense "${title}"?`)) return;
    try {
      await expensesApi.remove(id);
      setExpenses((prev) => prev.filter((item) => (item.id || item._id) !== id));
      setSuccessMsg(`Expense "${title}" deleted successfully.`);
      window.dispatchEvent(new CustomEvent("bilzet:expense_updated"));
    } catch (err) {
      setError(apiError(err) || "Failed to delete expense.");
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

  return (
    <div className="space-y-6 pb-12 fade-up max-w-7xl mx-auto px-4 sm:px-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl border border-rose-100 grid place-items-center text-rose-600 bg-rose-50/80 shadow-2xs shrink-0">
            <Receipt size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Business Expenses
              </h1>
              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Financials
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Track operational costs, rent, payroll, and outgoing store payments.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button
            type="button"
            onClick={() => loadExpenses(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition flex items-center justify-center shrink-0"
            title="Refresh records"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin text-blue-600" : ""} />
          </button>

          {canManage && (
            <button
              type="button"
              onClick={() => {
                setError("");
                setSuccessMsg("");
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-semibold text-xs sm:text-sm shadow-sm transition"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Add Expense</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Status Messages ── */}
      {error && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm animate-in fade-in">
          <AlertCircle size={18} className="shrink-0 text-rose-600" />
          <span className="font-medium flex-1">{error}</span>
          <button onClick={() => setError("")} className="text-rose-500 hover:text-rose-700">
            <X size={16} />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm animate-in fade-in">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          <span className="font-medium flex-1">{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-500 hover:text-emerald-700">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Metrics Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
            <TrendingDown size={20} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Expenses</p>
            <p className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
              ₹{stats.total.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">This Month</p>
            <p className="text-base sm:text-lg font-bold text-amber-700 mt-0.5">
              ₹{stats.thisMonthTotal.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Today's Payouts</p>
            <p className="text-base sm:text-lg font-bold text-blue-700 mt-0.5">
              ₹{stats.todayTotal.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
            <Building2 size={20} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Entries</p>
            <p className="text-base sm:text-lg font-bold text-purple-700 mt-0.5">
              {stats.count} Records
            </p>
          </div>
        </div>
      </div>

      {/* ── Table Card & Controls ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Search & Category Filter Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-2xl">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, payee, or amount..."
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
              />
            </div>

            {/* Category Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <Filter size={15} className="text-slate-400 shrink-0" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium self-end md:self-center">
            Showing <strong className="text-slate-800 font-bold">{filteredExpenses.length}</strong> of {expenses.length} expenses
          </div>
        </div>

        {/* Expenses Table */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2.5">
            <Loader2 size={26} className="animate-spin text-rose-600" />
            <p className="text-xs sm:text-sm font-medium text-slate-600">Loading business expenses...</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="py-20 text-center text-slate-400 px-4">
            <Receipt size={40} className="mx-auto text-slate-300 mb-2.5" />
            <p className="text-sm sm:text-base font-semibold text-slate-700">No expenses found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {search || selectedCategory !== "ALL"
                ? "No expense records match your active search or category filter."
                : "Record operational costs, utility bills, or rent to track store expenditure."}
            </p>
            {canManage && !search && selectedCategory === "ALL" && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold hover:bg-rose-100 transition"
              >
                <Plus size={14} />
                <span>Record First Expense</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Expense / Title</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Payment Method</th>
                  <th className="px-4 py-3.5 text-right">Amount</th>
                  {canManage && <th className="px-4 py-3.5 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map((exp) => {
                  const id = exp.id || exp._id;
                  const dateStr = exp.date ? new Date(exp.date).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                  }) : "—";

                  const catObj = EXPENSE_CATEGORIES.find((c) => c.id.toLowerCase() === exp.category?.toLowerCase());
                  const catLabel = catObj?.label || exp.category || "General";

                  return (
                    <tr key={id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 text-slate-500 font-mono whitespace-nowrap text-xs">
                        {dateStr}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{exp.title}</p>
                        {(exp.description || exp.note) && (
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {exp.description || exp.note}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                          {catLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 capitalize">
                        <span className="flex items-center gap-1.5 text-xs">
                          <CreditCard size={13} className="text-slate-400" />
                          {String(exp.paymentMethod || "CASH").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono font-bold text-rose-700 text-sm">
                          ₹{Number(exp.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(id, exp.title)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete record"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── CREATE EXPENSE MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div
            className="fixed inset-0"
            onClick={() => !submitting && setIsModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-6 space-y-4 z-10 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
                  <Receipt size={18} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    New Expense
                  </h2>
                  <p className="text-xs text-slate-400">
                    Record a company payout with instant ledger persistence.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error display inside modal */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateExpense} className="space-y-4 text-xs sm:text-sm">
              {/* Title / Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expense Title / Payee *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Shop Rent October, Staff Salary, Electricity Bill"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition ${
                    formErrors.title ? "border-rose-500 bg-rose-50/30" : "border-slate-200"
                  }`}
                />
                {formErrors.title && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">{formErrors.title}</p>
                )}
              </div>

              {/* Category & Amount Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition cursor-pointer"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">
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
                      className={`w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border rounded-xl text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition ${
                        formErrors.amount ? "border-rose-500 bg-rose-50/30" : "border-slate-200"
                      }`}
                    />
                  </div>
                  {formErrors.amount && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1">{formErrors.amount}</p>
                  )}
                </div>
              </div>

              {/* Payment Method & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition cursor-pointer"
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                  />
                </div>
              </div>

              {/* Notes / Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes / Bill Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional remarks, invoice number, or voucher reference..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs sm:text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-semibold text-xs sm:text-sm shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Saving Expense…</span>
                    </>
                  ) : (
                    <span>Create Expense</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
