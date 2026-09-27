import { useEffect, useState } from "react";
import { superAdminApi } from "../../api";
import {
  Contact,
  Search,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Building,
} from "lucide-react";

export default function SuperAdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await superAdminApi.getCustomers({
        search,
        page,
        limit: 50,
      });
      setCustomers(res.customers || []);
      setTotal(res.pagination?.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [search, page]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Contact className="text-cyan-400" />
            Global Customers Directory
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Platform-wide directory of client records created across all tenant shops.
          </p>
        </div>

        <button
          onClick={loadCustomers}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-bold text-slate-300 transition w-fit border border-white/10"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-[#0b1329] border border-white/[0.08] flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search customer by name, phone, email, or GSTIN…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <span className="text-xs text-slate-400 font-semibold hidden sm:inline">
          Total Records: <strong className="text-white font-mono">{total}</strong>
        </span>
      </div>

      {/* Customers Table */}
      <div className="rounded-2xl bg-[#0b1329] border border-white/[0.08] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.02] text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/[0.06]">
              <tr>
                <th className="py-3.5 px-4">Customer Name</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">GSTIN</th>
                <th className="py-3.5 px-4">Address / Location</th>
                <th className="py-3.5 px-4">Balance Due</th>
                <th className="py-3.5 px-4">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="animate-spin inline-block mr-2" size={16} />
                    Loading customer records…
                  </td>
                </tr>
              ) : !customers.length ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No customer records found.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3.5 px-4 font-bold text-white">
                      {c.name}
                    </td>

                    <td className="py-3.5 px-4 space-y-0.5">
                      {c.phone && (
                        <p className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
                          <Phone size={11} className="text-slate-500" />
                          {c.phone}
                        </p>
                      )}
                      {c.email && (
                        <p className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                          <Mail size={11} className="text-slate-500" />
                          {c.email}
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {c.gstin ? (
                        <span className="font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 text-[10px] font-bold">
                          {c.gstin}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 text-[11px] max-w-xs truncate">
                      {c.address ? (
                        <span className="flex items-center gap-1">
                          <MapPin size={11} className="text-slate-500 shrink-0" />
                          {c.address}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold">
                      <span className={Number(c.balanceDue || 0) > 0 ? "text-amber-400" : "text-emerald-400"}>
                        ₹{Number(c.balanceDue || 0).toLocaleString("en-IN")}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
