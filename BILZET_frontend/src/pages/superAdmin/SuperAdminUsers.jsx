import { useEffect, useState } from "react";
import { superAdminApi } from "../../api";
import {
  Users,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  KeyRound,
  Shield,
  RefreshCw,
  ShoppingBag,
  AlertCircle,
  X,
} from "lucide-react";

export default function SuperAdminUsers() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  // Modal State for Password Reset
  const [resetModalUser, setResetModalUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [modalBusy, setModalBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState({ type: "", text: "" });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await superAdminApi.getUsers({
        search,
        status: statusFilter,
        page,
        limit: 20,
      });
      setUsers(res.users || []);
      setTotal(res.pagination?.total || 0);
    } catch (err) {
      console.error(err);
      setActionMsg({ type: "error", text: "Failed to load users list." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [search, statusFilter, page]);

  const handleToggleStatus = async (user) => {
    if (user.email.toLowerCase() === "vickyms2app@gmail.com") {
      alert("Master Super Admin account cannot be suspended.");
      return;
    }

    const confirmMsg = user.isActive
      ? `Are you sure you want to SUSPEND ${user.name} (${user.email})? They will be locked out.`
      : `Activate account for ${user.name}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await superAdminApi.updateUserStatus(user.id || user._id, !user.isActive);
      setActionMsg({
        type: "success",
        text: `User ${user.email} ${user.isActive ? "suspended" : "activated"} successfully.`,
      });
      loadUsers();
    } catch (err) {
      setActionMsg({ type: "error", text: err?.message || "Failed to update user status." });
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    setModalBusy(true);
    try {
      await superAdminApi.resetPassword(resetModalUser.id || resetModalUser._id, newPassword);
      setActionMsg({
        type: "success",
        text: `Password for ${resetModalUser.email} has been updated.`,
      });
      setResetModalUser(null);
      setNewPassword("");
    } catch (err) {
      alert(err?.message || "Failed to reset password.");
    } finally {
      setModalBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="text-cyan-400" />
            Users &amp; Tenant Shops Manager
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage all registered shop owners, active accounts, roles, and credential resets.
          </p>
        </div>

        <button
          onClick={loadUsers}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-bold text-slate-300 transition w-fit border border-white/10"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Notification Banner */}
      {actionMsg.text && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
            actionMsg.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
              : "bg-rose-500/10 border border-rose-500/30 text-rose-400"
          }`}
        >
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg({ type: "", text: "" })}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-2xl bg-[#0b1329] border border-white/[0.08] flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, email, or phone…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
            <Filter size={13} /> Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Accounts</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-[#0b1329] border border-white/[0.08] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.02] text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/[0.06]">
              <tr>
                <th className="py-3.5 px-4">User / Owner</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Subscription</th>
                <th className="py-3.5 px-4">Sales Vol</th>
                <th className="py-3.5 px-4">Account Status</th>
                <th className="py-3.5 px-4">Registered</th>
                <th className="py-3.5 px-4 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="animate-spin inline-block mr-2" size={16} />
                    Loading user records…
                  </td>
                </tr>
              ) : !users.length ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isMaster = u.email.toLowerCase() === "vickyms2app@gmail.com";
                  const subTier = u.activeSubscription?.planTier || "FREE";

                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 grid place-items-center font-bold text-cyan-300">
                            {u.name?.charAt(0)?.toUpperCase() || "U"}
                          </div>
                          <div>
                            <p className="font-bold text-white flex items-center gap-1.5">
                              {u.name}
                              {isMaster && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                  MASTER
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">{u.email}</p>
                            {u.phone && <p className="text-[10px] text-slate-500">{u.phone}</p>}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/[0.05] text-slate-300 border border-white/10">
                          {u.role}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            subTier === "ENTERPRISE"
                              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                              : subTier === "PRO"
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                              : "bg-slate-500/20 text-slate-400"
                          }`}
                        >
                          {u.activeSubscription?.planName || "Free Starter"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono text-slate-300 font-semibold flex items-center gap-1">
                          <ShoppingBag size={12} className="text-slate-500" />
                          {u.salesCount || 0} bills
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            u.isActive
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {u.isActive ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Active
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                              Suspended
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Reset Password */}
                          <button
                            onClick={() => {
                              setResetModalUser(u);
                              setNewPassword("");
                            }}
                            title="Reset User Password"
                            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-slate-400 hover:text-cyan-400 transition"
                          >
                            <KeyRound size={14} />
                          </button>

                          {/* Toggle Status */}
                          {!isMaster && (
                            <button
                              onClick={() => handleToggleStatus(u)}
                              title={u.isActive ? "Suspend Account" : "Activate Account"}
                              className={`p-1.5 rounded-lg transition ${
                                u.isActive
                                  ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                                  : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                              }`}
                            >
                              {u.isActive ? <XCircle size={14} /> : <CheckCircle size={14} />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer pagination info */}
        <div className="p-4 bg-white/[0.01] border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
          <span>Showing {users.length} of {total} registered accounts</span>
        </div>
      </div>

      {/* Reset Password Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-[#0c1427] border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound size={16} className="text-cyan-400" />
                Reset Password
              </h3>
              <button onClick={() => setResetModalUser(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Set a new secure password for <strong className="text-white">{resetModalUser.email}</strong>.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <input
                type="text"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] text-xs font-semibold text-slate-300 hover:bg-white/[0.1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalBusy}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition disabled:opacity-50"
                >
                  {modalBusy ? "Updating…" : "Set Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
