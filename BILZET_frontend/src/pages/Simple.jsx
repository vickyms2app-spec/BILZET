import { useEffect, useState } from "react";
import { Plus, X, ShoppingBag, Truck, Receipt, FolderPlus, CheckCircle2, Search } from "lucide-react";
import { apiError } from "../api/http";
import SearchBar from "../components/common/SearchBar";

export default function Simple({ title, api, fields, readOnly = false, note }) {
  const [d, setD] = useState(null);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      setErr(null);
      const data = await api.list({ page: 1, limit: 100 });
      setD(data);
    } catch (e) {
      setErr(apiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  async function save(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const p = {};
    fields.forEach(([k]) => {
      const v = f.get(k);
      p[k] = ["amount", "openingBalance"].includes(k) ? Number(v) : v;
    });
    try {
      await api.create(p);
      setOpen(false);
      load();
    } catch (e) {
      setErr(apiError(e));
    }
  }

  const rows =
    d?.data?.suppliers ||
    d?.data?.expenses ||
    d?.data?.purchases ||
    d?.suppliers ||
    d?.expenses ||
    d?.purchases ||
    (Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []);

  // Filter rows based on search
  const filteredRows = rows.filter((r) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return Object.values(r).some((val) =>
      String(val).toLowerCase().includes(term)
    );
  });

  // Calculate sum if amount exists
  const hasAmountField = fields.some(([k]) => k === "amount" || k === "openingBalance");
  const totalSum = rows.reduce((acc, r) => {
    const val = Number(r.amount ?? r.openingBalance ?? 0);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  // Icon selector
  const getIcon = () => {
    const t = title.toLowerCase();
    if (t.includes("purchase")) return ShoppingBag;
    if (t.includes("supplier")) return Truck;
    if (t.includes("expense")) return Receipt;
    return FolderPlus;
  };
  const TitleIcon = getIcon();

  return (
    <div className="space-y-6 pb-12 fade-up">
      {/* ══════════════════════════════════════════════════
          PAGE HEADER
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl border border-blue-100 grid place-items-center text-blue-600 bg-blue-50/70 shadow-2xs shrink-0">
            <TitleIcon size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="page-title">
                {title}
              </h1>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Operations
              </span>
            </div>
            <p className="page-desc">
              Track, manage, and record {title.toLowerCase()} for your business.
            </p>
          </div>
        </div>

        {!readOnly && (
          <button
            onClick={() => setOpen(true)}
            className="btn-primary self-start sm:self-center"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Add {title.replace(/s$/, "")}</span>
          </button>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          METRICS CARDS
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            <TitleIcon size={18} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Total {title}</p>
            <p className="text-lg font-bold text-slate-900">{rows.length}</p>
          </div>
        </div>

        {hasAmountField && (
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Aggregated Total</p>
              <p className="text-lg font-bold text-emerald-700">₹{totalSum.toLocaleString("en-IN")}</p>
            </div>
          </div>
        )}

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
            <Search size={18} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Active Records</p>
            <p className="text-lg font-bold text-indigo-700">{filteredRows.length}</p>
          </div>
        </div>
      </div>

      {note && (
        <div className="rounded-xl bg-blue-50/80 border border-blue-200/80 p-3.5 text-xs text-blue-800 font-medium leading-relaxed">
          {note}
        </div>
      )}

      {err && (
        <div className="rounded-xl bg-rose-50 border border-rose-200/80 p-3.5 text-xs text-rose-700 font-medium">
          {err}
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TABLE CARD & SEARCH
      ══════════════════════════════════════════════════ */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div className="max-w-sm w-full">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={`Search ${title.toLowerCase()}…`}
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-800 font-bold">{filteredRows.length}</strong> of {rows.length} records
          </span>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
            <div className="w-7 h-7 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <p className="text-xs font-medium">Loading {title.toLowerCase()}...</p>
          </div>
        ) : !rows.length ? (
          <div className="py-16 text-center text-slate-400">
            <TitleIcon size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No {title.toLowerCase()} yet</p>
            <p className="text-xs text-slate-400 mt-0.5">Records will be listed here once recorded in the system</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  {fields.length ? (
                    fields.map(([k, l]) => (
                      <th key={k} className="px-4 py-3">
                        {l}
                      </th>
                    ))
                  ) : (
                    <th className="px-4 py-3">Record Identifier</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((r, i) => (
                  <tr key={r._id || i} className="hover:bg-slate-50/60 transition">
                    {fields.length ? (
                      fields.map(([k]) => {
                        const isCurrency = ["amount", "openingBalance"].includes(k);
                        const val = r[k];
                        return (
                          <td key={k} className="px-4 py-3 text-slate-700 font-medium">
                            {isCurrency && val != null ? (
                              <span className="font-semibold text-slate-900">
                                ₹{Number(val).toLocaleString("en-IN")}
                              </span>
                            ) : (
                              String(val ?? "—")
                            )}
                          </td>
                        );
                      })
                    ) : (
                      <td className="px-4 py-3 font-mono text-slate-800 font-semibold">
                        {r.invoiceNumber || r._id}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          CREATE RECORD MODAL
      ══════════════════════════════════════════════════ */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                  <TitleIcon size={16} />
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  New {title.replace(/s$/, "")}
                </h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={save} className="space-y-3.5 text-xs">
              {fields.map(([k, l]) => (
                <div key={k}>
                  <label className="form-label">
                    {l} {["name", "title", "phone", "amount"].includes(k) && "*"}
                  </label>
                  <input
                    name={k}
                    type={["amount", "openingBalance"].includes(k) ? "number" : "text"}
                    step={["amount", "openingBalance"].includes(k) ? "0.01" : undefined}
                    required={["name", "title", "phone", "amount"].includes(k)}
                    placeholder={`Enter ${l.toLowerCase()}`}
                    className="form-input"
                  />
                </div>
              ))}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Create {title.replace(/s$/, "")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
