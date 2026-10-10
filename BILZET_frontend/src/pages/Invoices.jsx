import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  Printer,
  Download,
  Eye,
  Sliders,
  FileText,
  Calendar,
  IndianRupee,
  CheckCircle2,
  Clock,
  RotateCcw,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { salesApi, settingsApi } from "../api";
import TaxInvoice from "../components/invoice/TaxInvoice";
import ReturnModal from "../components/invoice/ReturnModal";
import DateNavigator from "../components/common/DateNavigator";
import SearchBar from "../components/common/SearchBar";
import Button, { CompactIconButton } from "../components/common/Button";

export default function Invoices() {
  const nav = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [returnFilter, setReturnFilter] = useState("ALL");
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [returnModalInvoice, setReturnModalInvoice] = useState(null);
  const [shopSettings, setShopSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [dateFilter, setDateFilter] = useState(null);

  useEffect(() => {
    // Load shop settings for invoice formatting
    const local = localStorage.getItem("bilzet_invoice_settings");
    if (local) {
      try {
        setShopSettings(JSON.parse(local));
      } catch (e) {}
    } else {
      settingsApi
        .get()
        .then((res) => {
          if (res) setShopSettings(res);
        })
        .catch(() => {});
    }

    // Load sales invoices
    loadInvoices();
  }, []);

  const loadInvoices = () => {
    setLoading(true);
    setLoadError(null);
    salesApi
      .list({ limit: 200 })
      .then((res) => {
        let salesList = [];
        if (Array.isArray(res)) salesList = res;
        else if (Array.isArray(res?.sales)) salesList = res.sales;
        else if (Array.isArray(res?.data?.sales)) salesList = res.data.sales;
        else if (Array.isArray(res?.data)) salesList = res.data;
        setInvoices(salesList);
      })
      .catch((err) => {
        console.error("Failed to load invoices:", err);
        setLoadError(err?.response?.data?.message || err?.message || "Failed to fetch invoices");
        setInvoices([]);
      })
      .finally(() => setLoading(false));
  };

  const safeInvoices = Array.isArray(invoices) ? invoices : [];

  const filteredInvoices = safeInvoices.filter((inv) => {
    const s = search.toLowerCase();
    const matchesSearch =
      !s ||
      inv.invoiceNumber?.toLowerCase().includes(s) ||
      inv.customer?.name?.toLowerCase().includes(s) ||
      inv.customer?.phone?.includes(s) ||
      inv.customer?.gstin?.toLowerCase().includes(s);

    // Normalize payment status strictly: NEVER treat PENDING and UNPAID as identical!
    const rawPS = (inv.paymentStatus || (inv.paidAmount >= inv.grandTotal ? "PAID" : "UNPAID")).toUpperCase();
    let normPS = "UNPAID";
    if (rawPS === "PENDING") normPS = "PENDING";
    else if (rawPS === "PAID" || rawPS === "COMPLETED") normPS = "PAID";
    else if (rawPS === "PARTIALLY_PAID" || rawPS === "PARTIALLY PAID" || rawPS === "PARTIAL") normPS = "PARTIALLY_PAID";
    else normPS = "UNPAID";

    let matchesStatus = true;
    if (statusFilter !== "ALL") {
      matchesStatus = normPS === statusFilter;
    }

    // Return status filtering
    const rawRS = (inv.returnStatus || (inv.returns && inv.returns.length > 0 ? "PARTIALLY_RETURNED" : "NONE")).toUpperCase();
    let matchesReturn = true;
    if (returnFilter !== "ALL") {
      if (returnFilter === "NONE") {
        matchesReturn = !rawRS || rawRS === "NONE";
      } else {
        matchesReturn = rawRS === returnFilter;
      }
    }

    let matchesDate = true;
    if (dateFilter?.startDate && dateFilter?.endDate) {
      const invDate = new Date(inv.createdAt || inv.date || inv.invoiceDate || Date.now());
      matchesDate = invDate >= dateFilter.startDate && invDate <= dateFilter.endDate;
    }

    return matchesSearch && matchesStatus && matchesReturn && matchesDate;
  });

  const handleOpenInvoice = (inv) => {
    // Fetch full single invoice to ensure all items, returns, payments & audit logs are populated
    salesApi
      .get(inv.id || inv._id)
      .then((res) => {
        const fullInv = res?.sale || res || inv;
        setSelectedInvoice(fullInv);
      })
      .catch(() => {
        setSelectedInvoice(inv);
      });
  };

  return (
    <div className="space-y-5 pb-12 fade-up">
      {/* ══════════════════════════════════════════════════
          TOP HEADER
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 grid place-items-center shrink-0 shadow-2xs">
            <FileText size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="page-title">Invoices &amp; Sales History</h1>
              <span className="badge badge-info font-mono">
                {filteredInvoices.length} {filteredInvoices.length === 1 ? "Bill" : "Bills"}
              </span>
            </div>
            <p className="page-desc">
              Complete invoice lifecycle tracking, GST adjustments, partial payments &amp; returns
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button
            variant="neutral"
            size="sm"
            icon={RefreshCw}
            loading={loading}
            onClick={loadInvoices}
            title="Refresh Invoices List"
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => nav("/billing")}
          >
            Create Bill
          </Button>
        </div>
      </div>

      {/* Error state if load failed */}
      {loadError && (
        <div className="p-3.5 rounded-xl text-xs font-medium flex items-center justify-between gap-3 bg-rose-50 border border-rose-200 text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("bilzet_active_store_id");
              localStorage.removeItem("bilzet_active_store");
              loadInvoices();
            }}
            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          DATE NAVIGATOR (DAY / MONTH / YEAR / RANGE)
      ══════════════════════════════════════════════════ */}
      <DateNavigator
        initialView="month"
        onChange={setDateFilter}
      />

      {/* ══════════════════════════════════════════════════
          FILTER & SEARCH TOOLBAR
      ══════════════════════════════════════════════════ */}
      <div className="card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white">
        <SearchBar
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch("")}
          placeholder="Search by invoice #, customer name, mobile, or GSTIN..."
          className="max-w-md w-full"
        />

        <div className="flex flex-wrap items-center gap-3">
          {/* Payment Status Tabs */}
          <div className="seg-tabs flex-wrap">
            {[
              { id: "ALL", label: "All Bills" },
              { id: "PAID", label: "Paid" },
              { id: "PARTIALLY_PAID", label: "Partially Paid" },
              { id: "PENDING", label: "Pending" },
              { id: "UNPAID", label: "Unpaid" },
            ].map((pill) => (
              <button
                key={pill.id}
                onClick={() => setStatusFilter(pill.id)}
                className={`seg-tab ${statusFilter === pill.id ? "active" : ""}`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Return Status Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-600">
            <RotateCcw size={13} className="text-slate-400" />
            <select
              value={returnFilter}
              onChange={(e) => setReturnFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-800 outline-hidden cursor-pointer"
            >
              <option value="ALL">All Returns</option>
              <option value="NONE">No Returns</option>
              <option value="PARTIALLY_RETURNED">Partially Returned</option>
              <option value="RETURNED">Fully Returned</option>
            </select>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          INVOICES TABLE
      ══════════════════════════════════════════════════ */}
      <div className="card p-0 overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Invoice #</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Payment Status</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Return Status</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">GST Output</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Net Payable</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Balance Due</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading invoice history records...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 px-4 text-center">
                    <div className="empty-state-icon mx-auto">
                      <FileText size={20} />
                    </div>
                    <p className="font-semibold text-sm text-slate-800">No invoices match your search</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Try clearing search filters or create a new invoice to get started.
                    </p>
                    <button
                      onClick={() => nav("/billing")}
                      className="btn-primary mt-4 text-xs inline-flex items-center gap-1.5"
                    >
                      <Plus size={13} strokeWidth={2.5} />
                      <span>Create New Bill</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const rawPS = (inv.paymentStatus || (inv.paidAmount >= inv.grandTotal ? "PAID" : "UNPAID")).toUpperCase();
                  const isPaid = rawPS === "PAID" || rawPS === "COMPLETED";
                  const isPartial = rawPS === "PARTIALLY_PAID" || rawPS === "PARTIALLY PAID" || rawPS === "PARTIAL";
                  const isPending = rawPS === "PENDING";

                  const retStatus = (inv.returnStatus || (inv.returns?.length > 0 ? "PARTIALLY_RETURNED" : "NONE")).toUpperCase();

                  const netPayable = inv.netPayable !== undefined ? Number(inv.netPayable) : Number(inv.grandTotal || 0);
                  const balanceDue = inv.balanceDue !== undefined ? Number(inv.balanceDue) : Math.max(0, netPayable - Number(inv.paidAmount || 0));
                  const gstTotal = inv.taxTotal !== undefined ? Number(inv.taxTotal) : 0;

                  return (
                    <tr
                      key={inv._id || inv.id || inv.invoiceNumber}
                      className="hover:bg-slate-50/70 transition cursor-pointer"
                      onClick={() => handleOpenInvoice(inv)}
                    >
                      <td className="py-3.5 px-4 font-mono font-semibold text-blue-600">
                        {inv.invoiceNumber}
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">{inv.customer?.name || "Cash Customer"}</p>
                        {inv.customer?.phone && (
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{inv.customer.phone}</p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        {new Date(inv.createdAt || Date.now()).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      {/* Payment Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isPaid
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : isPartial
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : isPending
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isPaid
                                ? "bg-emerald-500"
                                : isPartial
                                ? "bg-blue-500"
                                : isPending
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                          />
                          {isPaid ? "PAID" : isPartial ? "PARTIAL" : isPending ? "PENDING" : "UNPAID"}
                        </span>
                      </td>

                      {/* Return Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {retStatus === "RETURNED" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                            Returned
                          </span>
                        ) : retStatus === "PARTIALLY_RETURNED" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                            Partial Ret.
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                        ₹{gstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                        ₹{netPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono">
                        <span className={balanceDue > 0 ? "font-bold text-rose-600" : "text-slate-400"}>
                          ₹{balanceDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {retStatus !== "RETURNED" && (
                            <CompactIconButton
                              variant="danger"
                              size="sm"
                              icon={RotateCcw}
                              onClick={() => setReturnModalInvoice(inv)}
                              title="Initiate Return & Issue Credit Note"
                            />
                          )}
                          <CompactIconButton
                            variant="primary"
                            size="sm"
                            icon={Eye}
                            onClick={() => handleOpenInvoice(inv)}
                            title="View Product Breakdown & Audit Trail"
                          />
                          <CompactIconButton
                            variant="success"
                            size="sm"
                            icon={Printer}
                            onClick={() => handleOpenInvoice(inv)}
                            title="Print Tax Invoice"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          TAX INVOICE MODAL (VIEW, BREAKDOWN & AUDIT TRAIL)
      ══════════════════════════════════════════════════ */}
      {selectedInvoice && (
        <TaxInvoice
          invoice={selectedInvoice}
          shopSettings={shopSettings}
          isModal={true}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* ══════════════════════════════════════════════════
          PRODUCT RETURN & CREDIT NOTE MODAL
      ══════════════════════════════════════════════════ */}
      {returnModalInvoice && (
        <ReturnModal
          invoice={returnModalInvoice}
          onClose={() => setReturnModalInvoice(null)}
          onSuccess={(updatedSale) => {
            loadInvoices();
            setSelectedInvoice(updatedSale);
          }}
        />
      )}
    </div>
  );
}
