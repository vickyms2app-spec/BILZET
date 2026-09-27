import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { superAdminApi } from "../../api";
import {
  Users,
  CreditCard,
  Contact,
  TrendingUp,
  Receipt,
  Server,
  Activity,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

export default function SuperAdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await superAdminApi.getOverview();
      setData(res);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch super admin platform metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-cyan-400">
        <RefreshCw className="animate-spin mr-2" size={20} />
        <span className="text-sm font-semibold tracking-wider">Loading Platform Telemetry…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
        <p className="font-bold text-sm mb-2">Error</p>
        <p className="text-xs">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 rounded-xl bg-rose-500/20 text-rose-300 text-xs font-bold hover:bg-rose-500/30"
        >
          Try Again
        </button>
      </div>
    );
  }

  const kpis = [
    {
      label: "Total Registered Users",
      value: data?.totalUsers || 0,
      sub: `${data?.activeUsers || 0} Active · ${data?.suspendedUsers || 0} Suspended`,
      icon: Users,
      color: "from-blue-500 to-indigo-600",
      link: "/app-admin/users",
    },
    {
      label: "Platform MRR",
      value: `₹${(data?.mrr || 0).toLocaleString("en-IN")}`,
      sub: `Across ${data?.tierCounts?.PRO || 0} Pro & ${data?.tierCounts?.ENTERPRISE || 0} Enterprise`,
      icon: TrendingUp,
      color: "from-emerald-500 to-teal-600",
      link: "/app-admin/subscriptions",
    },
    {
      label: "Total Invoices Created",
      value: data?.totalSales || 0,
      sub: `Gross Value: ₹${(data?.totalRevenue || 0).toLocaleString("en-IN")}`,
      icon: Receipt,
      color: "from-cyan-500 to-blue-600",
      link: "/app-admin/users",
    },
    {
      label: "Global Customers Directory",
      value: data?.totalCustomers || 0,
      sub: "Saved across all tenant shops",
      icon: Contact,
      color: "from-purple-500 to-pink-600",
      link: "/app-admin/customers",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              Master Control Center
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Platform Overview
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Full authority view of tenant shops, subscriptions, and system health.
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-bold text-slate-300 transition w-fit border border-white/10"
        >
          <RefreshCw size={14} />
          Refresh Stats
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={idx}
              to={kpi.link}
              className="p-5 rounded-2xl bg-[#0b1329] border border-white/[0.08] hover:border-cyan-500/40 transition-all duration-200 group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {kpi.label}
                  </span>
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${kpi.color} grid place-items-center text-white shadow-md`}>
                    <Icon size={17} />
                  </div>
                </div>
                <div className="text-2xl font-black text-white tracking-tight group-hover:text-cyan-300 transition">
                  {kpi.value}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
                <span>{kpi.sub}</span>
                <ArrowRight size={13} className="text-slate-500 group-hover:translate-x-1 group-hover:text-cyan-400 transition" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Subscriptions & Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tier Distribution Card */}
        <div className="lg:col-span-1 p-6 rounded-2xl bg-[#0b1329] border border-white/[0.08] space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard size={17} className="text-cyan-400" />
              Subscription Tiers
            </h2>
            <Link to="/app-admin/subscriptions" className="text-xs font-bold text-cyan-400 hover:underline">
              Manage →
            </Link>
          </div>

          <div className="space-y-3">
            {[
              { tier: "FREE", name: "Free Starter", count: data?.tierCounts?.FREE || 0, price: "₹0 / mo", color: "bg-slate-500" },
              { tier: "PRO", name: "Pro Suite", count: data?.tierCounts?.PRO || 0, price: "₹999 / mo", color: "bg-cyan-500" },
              { tier: "ENTERPRISE", name: "Enterprise Business", count: data?.tierCounts?.ENTERPRISE || 0, price: "₹2,499 / mo", color: "bg-indigo-500" },
            ].map((p) => (
              <div key={p.tier} className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${p.color}`} />
                  <div>
                    <p className="text-xs font-bold text-white">{p.name}</p>
                    <p className="text-[10px] text-slate-400">{p.price}</p>
                  </div>
                </div>
                <span className="text-sm font-black text-cyan-300 font-mono">
                  {p.count} <span className="text-[10px] font-normal text-slate-400">shops</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Registrations Table */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0b1329] border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users size={17} className="text-cyan-400" />
              Recent Registered Shops
            </h2>
            <Link to="/app-admin/users" className="text-xs font-bold text-cyan-400 hover:underline">
              View All ({data?.totalUsers || 0}) →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/[0.06]">
                <tr>
                  <th className="pb-3">User / Shop</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {data?.recentUsers?.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02]">
                    <td className="py-3">
                      <p className="font-bold text-white">{u.name}</p>
                      <p className="text-[11px] text-slate-400">{u.email}</p>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/[0.06] text-slate-300">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                      }`}>
                        {u.isActive ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400 text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* System Infrastructure Telemetry */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0c1836] to-[#0a1226] border border-cyan-500/20 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 grid place-items-center text-cyan-400">
            <Server size={24} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              PostgreSQL NeonDB Infrastructure
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                Online &amp; Healthy
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Host: ep-orange-silence-b5w238xv-pooler · AWS US-East-2 Serverless Cluster
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/app-admin/settings"
            className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition"
          >
            Manage System Broadcasts
          </Link>
        </div>
      </div>
    </div>
  );
}
