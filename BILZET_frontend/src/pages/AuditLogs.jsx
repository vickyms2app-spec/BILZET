import { useState, useEffect } from "react";
import {
  History,
  Filter,
  RefreshCw,
  Shield,
  User,
  Clock,
  ArrowUpRight,
  Database,
  Lock,
} from "lucide-react";
import { auditLogsApi } from "../api";
import SearchBar from "../components/common/SearchBar";
import Button from "../components/common/Button";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState("ALL");
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await auditLogsApi.list();
      setLogs(res?.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesModule = filterModule === "ALL" || log.module === filterModule;
    const matchesSearch =
      log.action?.toLowerCase().includes(search.toLowerCase()) ||
      log.userName?.toLowerCase().includes(search.toLowerCase()) ||
      log.details?.toLowerCase().includes(search.toLowerCase());
    return matchesModule && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto fade-up">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 shadow-2xs">
            <History size={22} />
          </div>
          <div>
            <h1 className="page-title">
              Audit Trail &amp; Security Log
            </h1>
            <p className="page-desc">
              Immutable activity records tracking financial actions, stock updates and user sessions.
            </p>
          </div>
        </div>

        <Button
          variant="neutral"
          size="sm"
          icon={RefreshCw}
          loading={loading}
          onClick={loadData}
        >
          Refresh Feed
        </Button>
      </div>

      {/* ── Filter & Search Bar ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
          {[
            { id: "ALL", label: "All Modules" },
            { id: "SALES", label: "Billing & Sales" },
            { id: "INVENTORY", label: "Inventory & Warehouses" },
            { id: "PURCHASES", label: "Purchases" },
            { id: "STAFF", label: "Staff & Payroll" },
            { id: "AUTH", label: "Auth & Security" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setFilterModule(m.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                filterModule === m.id
                  ? "bg-white text-slate-800 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-72">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search action, user, details..."
          />
        </div>
      </div>

      {/* ── Audit Logs Feed ── */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <RefreshCw size={24} className="animate-spin text-purple-600" />
          <p className="text-xs text-slate-500">Querying security audit logs…</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Operator / User</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">Action Recorded</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Client IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No security events recorded under this criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                            {(log.userName || "U").charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-800">
                            {log.userName || log.user?.name || "System"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {log.module || "SYSTEM"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{log.action}</td>
                      <td className="py-3 px-4 text-slate-500 max-w-sm truncate">
                        {log.details || "—"}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {log.ipAddress || "127.0.0.1"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
