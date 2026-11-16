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
      <div className="flex items-center justify-center py-20 text-[#111318]">
        <RefreshCw className="animate-spin mr-2 text-[#5BF07B]" size={20} />
        <span className="text-sm font-semibold tracking-wider font-heading">Loading Platform Telemetry…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-[28px] bg-[#FBD3D3] border border-[#E5484D]/30 text-[#E5484D]">
        <p className="font-bold text-sm mb-2 font-heading">Error</p>
        <p className="text-xs">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 rounded-full bg-[#12151C] text-white text-xs font-bold hover:bg-[#202530]"
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
      link: "/app-admin/users",
    },
    {
      label: "Platform MRR",
      value: `₹${(data?.mrr || 0).toLocaleString("en-IN")}`,
      sub: `Across ${data?.tierCounts?.PRO || 0} Pro & ${data?.tierCounts?.ENTERPRISE || 0} Enterprise`,
      icon: TrendingUp,
      link: "/app-admin/subscriptions",
    },
    {
      label: "Total Invoices Created",
      value: data?.totalSales || 0,
      sub: `Gross Value: ₹${(data?.totalRevenue || 0).toLocaleString("en-IN")}`,
      icon: Receipt,
      link: "/app-admin/users",
    },
    {
      label: "Global Customers Directory",
      value: data?.totalCustomers || 0,
      sub: "Saved across all tenant shops",
      icon: Contact,
      link: "/app-admin/customers",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0E2A16] bg-[#DFFFE6] px-2.5 py-0.5 rounded-full border border-[#5BF07B]/40">
              Master Control Center
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#111318] tracking-tight font-heading">
            Platform Overview
          </h1>
          <p className="text-xs text-[#7C7F8A] mt-1 font-medium">
            Full authority view of tenant shops, subscriptions, and system health.
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-[#EDEDEF] text-xs font-bold text-[#111318] transition w-fit border border-[#E7E8EC] shadow-2xs cursor-pointer"
        >
          <RefreshCw size={14} className="text-[#111318]" />
          <span>Refresh Stats</span>
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
              className="p-6 rounded-[28px] bg-[#F6F6F8] border border-[#E7E8EC] hover:border-[#C3C5CE] transition-all duration-200 group flex flex-col justify-between shadow-fintech"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <span className="text-[11px] font-bold text-[#7C7F8A] uppercase tracking-wider">
                    {kpi.label}
                  </span>
                  <div className="w-10 h-10 rounded-full bg-[#12151C] text-[#5BF07B] grid place-items-center shadow-xs">
                    <Icon size={18} />
                  </div>
                </div>
                <div className="text-3xl font-black text-[#111318] tracking-tight font-mono">
                  {kpi.value}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-[#E7E8EC] flex items-center justify-between text-[11px] text-[#7C7F8A] font-medium">
                <span>{kpi.sub}</span>
                <ArrowRight size={13} className="text-[#111318] group-hover:translate-x-1 transition" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Subscriptions & Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tier Distribution Card */}
        <div className="lg:col-span-1 p-6 rounded-[28px] bg-[#F6F6F8] border border-[#E7E8EC] space-y-5 shadow-fintech">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#111318] flex items-center gap-2 font-heading">
              <CreditCard size={17} className="text-[#111318]" />
              Subscription Tiers
            </h2>
            <Link to="/app-admin/subscriptions" className="text-xs font-bold text-[#111318] hover:underline">
              Manage →
            </Link>
          </div>

          <div className="space-y-3">
            {[
              { tier: "FREE", name: "Free Starter", count: data?.tierCounts?.FREE || 0, price: "₹0 / mo", color: "bg-[#7C7F8A]" },
              { tier: "PRO", name: "Pro Suite", count: data?.tierCounts?.PRO || 0, price: "₹999 / mo", color: "bg-[#12151C]" },
              { tier: "ENTERPRISE", name: "Enterprise Business", count: data?.tierCounts?.ENTERPRISE || 0, price: "₹2,499 / mo", color: "bg-[#5BF07B]" },
            ].map((p) => (
              <div key={p.tier} className="p-4 rounded-[20px] bg-[#FAFAFB] border border-[#E7E8EC] flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${p.color}`} />
                  <div>
                    <p className="text-xs font-bold text-[#111318]">{p.name}</p>
                    <p className="text-[10px] text-[#7C7F8A]">{p.price}</p>
                  </div>
                </div>
                <span className="text-sm font-black text-[#111318] font-mono">
                  {p.count} <span className="text-[10px] font-normal text-[#7C7F8A]">shops</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Registrations Table */}
        <div className="lg:col-span-2 p-6 rounded-[28px] bg-[#F6F6F8] border border-[#E7E8EC] space-y-4 shadow-fintech">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#111318] flex items-center gap-2 font-heading">
              <Users size={17} className="text-[#111318]" />
              Recent Registered Shops
            </h2>
            <Link to="/app-admin/users" className="text-xs font-bold text-[#111318] hover:underline">
              View All ({data?.totalUsers || 0}) →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-[#7C7F8A] border-b border-[#E7E8EC] bg-[#FAFAFB]">
                <tr>
                  <th className="py-2.5 px-3">User / Shop</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E8EC]">
                {data?.recentUsers?.map((u) => (
                  <tr key={u.id} className="hover:bg-[#FAFAFB] transition">
                    <td className="py-3 px-3">
                      <p className="font-bold text-[#111318]">{u.name}</p>
                      <p className="text-[11px] text-[#7C7F8A]">{u.email}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAFAFB] text-[#111318] border border-[#E7E8EC]">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        u.isActive ? "bg-[#DFFFE6] text-[#0E2A16] border border-[#5BF07B]/40" : "bg-[#FBD3D3] text-[#E5484D] border border-[#E5484D]/40"
                      }`}>
                        {u.isActive ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#7C7F8A] text-[11px]">
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
      <div className="p-6 rounded-[28px] bg-[#12151C] text-white border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-fintech">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white/10 text-[#5BF07B] grid place-items-center shadow-xs">
            <Server size={22} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2.5 font-heading">
              PostgreSQL NeonDB Infrastructure
              <span className="px-2.5 py-0.5 rounded-full bg-[#DFFFE6] text-[#0E2A16] border border-[#5BF07B]/40 text-[10px] font-bold">
                Online &amp; Healthy
              </span>
            </h3>
            <p className="text-xs text-white/70 mt-0.5 font-medium">
              Host: ep-orange-silence-b5w238xv-pooler · AWS US-East-2 Serverless Cluster
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/app-admin/settings"
            className="px-5 py-2.5 rounded-full bg-[#5BF07B] hover:bg-[#4de66e] text-[#0E2A16] font-bold text-xs shadow-fintech transition"
          >
            Manage System Broadcasts
          </Link>
        </div>
      </div>
    </div>
  );
}
