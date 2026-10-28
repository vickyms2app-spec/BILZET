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
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#2563EB] bg-[#EEF7FF] px-2 py-0.5 rounded border border-[#D8EBFF]">
              Master Control Center
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#526B87] tracking-tight">
            Platform Overview
          </h1>
          <p className="text-xs text-[#94A8BE] mt-1">
            Full authority view of tenant shops, subscriptions, and system health.
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-[#F4F9FF] text-xs font-bold text-[#526B87] transition w-fit border border-[#E3EDF8] shadow-2xs"
        >
          <RefreshCw size={14} className="text-[#8AAED8]" />
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
              className="p-5 rounded-2xl bg-white border border-[#E3EDF8] hover:border-[#D8EBFF] transition-all duration-200 group flex flex-col justify-between shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[#94A8BE] uppercase tracking-wider">
                    {kpi.label}
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-[#EEF7FF] border border-[#D8EBFF] grid place-items-center text-[#2563EB] shadow-2xs">
                    <Icon size={17} />
                  </div>
                </div>
                <div className="text-2xl font-black text-[#526B87] tracking-tight group-hover:text-[#2563EB] transition">
                  {kpi.value}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-[#EDF3FA] flex items-center justify-between text-[11px] text-[#94A8BE]">
                <span>{kpi.sub}</span>
                <ArrowRight size={13} className="text-[#8AAED8] group-hover:translate-x-1 group-hover:text-[#2563EB] transition" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Subscriptions & Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tier Distribution Card */}
        <div className="lg:col-span-1 p-6 rounded-2xl bg-white border border-[#E3EDF8] space-y-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#526B87] flex items-center gap-2">
              <CreditCard size={17} className="text-[#8AAED8]" />
              Subscription Tiers
            </h2>
            <Link to="/app-admin/subscriptions" className="text-xs font-bold text-[#2563EB] hover:underline">
              Manage →
            </Link>
          </div>

          <div className="space-y-3">
            {[
              { tier: "FREE", name: "Free Starter", count: data?.tierCounts?.FREE || 0, price: "₹0 / mo", color: "bg-slate-400" },
              { tier: "PRO", name: "Pro Suite", count: data?.tierCounts?.PRO || 0, price: "₹999 / mo", color: "bg-[#2563EB]" },
              { tier: "ENTERPRISE", name: "Enterprise Business", count: data?.tierCounts?.ENTERPRISE || 0, price: "₹2,499 / mo", color: "bg-indigo-500" },
            ].map((p) => (
              <div key={p.tier} className="p-3.5 rounded-xl bg-[#F4F9FF] border border-[#E3EDF8] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${p.color}`} />
                  <div>
                    <p className="text-xs font-bold text-[#526B87]">{p.name}</p>
                    <p className="text-[10px] text-[#94A8BE]">{p.price}</p>
                  </div>
                </div>
                <span className="text-sm font-black text-[#2563EB] font-mono">
                  {p.count} <span className="text-[10px] font-normal text-[#94A8BE]">shops</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Registrations Table */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-[#E3EDF8] space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#526B87] flex items-center gap-2">
              <Users size={17} className="text-[#8AAED8]" />
              Recent Registered Shops
            </h2>
            <Link to="/app-admin/users" className="text-xs font-bold text-[#2563EB] hover:underline">
              View All ({data?.totalUsers || 0}) →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-[#526B87] border-b border-[#E3EDF8] bg-[#EAF4FF]">
                <tr>
                  <th className="py-2.5 px-3">User / Shop</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF3FA]">
                {data?.recentUsers?.map((u) => (
                  <tr key={u.id} className="hover:bg-[#F4F9FF] transition">
                    <td className="py-3 px-3">
                      <p className="font-bold text-[#526B87]">{u.name}</p>
                      <p className="text-[11px] text-[#94A8BE]">{u.email}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EEF7FF] text-[#1E40AF] border border-[#D8EBFF]">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.isActive ? "bg-[#ECF9F1] text-[#166534] border border-[#C8E6C9]" : "bg-[#FFF0F2] text-[#991B1B] border border-[#FECDD3]"
                      }`}>
                        {u.isActive ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#94A8BE] text-[11px]">
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
      <div className="p-6 rounded-2xl bg-[#F0F7FF] border border-[#D8EBFF] flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white border border-[#D8EBFF] grid place-items-center text-[#2563EB] shadow-2xs">
            <Server size={24} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#526B87] flex items-center gap-2">
              PostgreSQL NeonDB Infrastructure
              <span className="px-2 py-0.5 rounded-full bg-[#ECF9F1] text-[#166534] border border-[#C8E6C9] text-[10px] font-bold">
                Online &amp; Healthy
              </span>
            </h3>
            <p className="text-xs text-[#94A8BE] mt-0.5">
              Host: ep-orange-silence-b5w238xv-pooler · AWS US-East-2 Serverless Cluster
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/app-admin/settings"
            className="px-4 py-2 rounded-xl bg-[#D8EBFF] hover:bg-[#C7E1FF] text-[#1E40AF] font-bold text-xs border border-[#C7E1FF] shadow-2xs transition"
          >
            Manage System Broadcasts
          </Link>
        </div>
      </div>
    </div>
  );
}
