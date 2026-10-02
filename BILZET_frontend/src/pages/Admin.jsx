import { useEffect, useState } from "react";
import { usersApi } from "../api";
import { Shield, Users, Search, CheckCircle2, XCircle, Mail, UserCheck, RefreshCw } from "lucide-react";

export default function Admin() {
  const [d, setD] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await usersApi.list();
      setD(data);
    } catch (e) {
      console.error("Failed to load users:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const usersList = d?.users || [];
  const filteredUsers = usersList.filter((u) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.role && u.role.toLowerCase().includes(term))
    );
  });

  const totalUsers = usersList.length;
  const activeUsers = usersList.filter((u) => u.isActive).length;
  const adminUsers = usersList.filter((u) => u.role === "ADMIN").length;

  return (
    <div className="space-y-5 pb-12 fade-up">
      {/* ══════════════════════════════════════════════════
          PAGE HEADER
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl border border-blue-100 grid place-items-center text-blue-600 bg-blue-50/70 shadow-2xs shrink-0">
            <Shield size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                User Management
              </h1>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Admin
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Manage organization staff, role permissions, and access status
            </p>
          </div>
        </div>

        <button
          onClick={loadUsers}
          className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition self-start sm:self-center"
          title="Refresh user list"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : ""} />
        </button>
      </div>

      {/* ══════════════════════════════════════════════════
          METRICS CARDS
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            <Users size={18} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Total Registered Users</p>
            <p className="text-lg font-bold text-slate-900">{totalUsers}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <UserCheck size={18} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Active Accounts</p>
            <p className="text-lg font-bold text-emerald-700">{activeUsers}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
            <Shield size={18} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Administrators</p>
            <p className="text-lg font-bold text-purple-700">{adminUsers}</p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          TABLE CARD & SEARCH
      ══════════════════════════════════════════════════ */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div className="relative max-w-sm w-full">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              size={15}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or role…"
              className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium bg-slate-50/40"
            />
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Showing {filteredUsers.length} of {usersList.length} users
          </span>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
            <div className="w-7 h-7 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <p className="text-xs font-medium">Loading user accounts...</p>
          </div>
        ) : !usersList.length ? (
          <div className="py-16 text-center text-slate-400">
            <Users size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No users found</p>
            <p className="text-xs text-slate-400 mt-0.5">Staff accounts registered in your database will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Account Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-100 uppercase">
                          {u.name ? u.name.charAt(0) : "U"}
                        </div>
                        <span className="font-semibold text-slate-900">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">
                      {u.email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          u.role === "ADMIN"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {u.role || "USER"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          u.isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        {u.isActive ? (
                          <>
                            <CheckCircle2 size={11} className="text-emerald-600" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={11} className="text-slate-400" />
                            <span>Inactive</span>
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
