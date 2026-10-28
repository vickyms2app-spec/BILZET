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
          <h1 className="text-2xl font-black text-[#526B87] tracking-tight flex items-center gap-2">
            <Users className="text-[#8AAED8]" />
            Users &amp; Tenant Shops Manager
          </h1>
          <p className="text-xs text-[#94A8BE] mt-1">
            Manage all registered shop owners, active accounts, roles, and credential resets.
          </p>
        </div>

        <button
          onClick={loadUsers}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-[#F4F9FF] text-xs font-bold text-[#526B87] transition w-fit border border-[#E3EDF8] shadow-2xs"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-[#2563EB]" : "text-[#8AAED8]"} />
          Refresh
        </button>
      </div>

      {/* Notification Banner */}
      {actionMsg.text && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
            actionMsg.type === "success"
              ? "bg-[#ECF9F1] border border-[#C8E6C9] text-[#166534]"
              : "bg-[#FFF0F2] border border-[#FECDD3] text-[#991B1B]"
          }`}
        >
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg({ type: "", text: "" })}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-[#E3EDF8] flex flex-col md:flex-row gap-4 items-center justify-between shadow-2xs">
        <div className="relative w-full md:w-96">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8AAED8]" />
          <input
            type="text"
            placeholder="Search by name, email, or phone…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F4F9FF] border border-[#E3EDF8] text-xs text-[#526B87] placeholder-[#94A8BE] focus:outline-none focus:border-[#8AAED8]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-[#94A8BE] flex items-center gap-1.5">
            <Filter size={13} /> Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-[#F4F9FF] border border-[#E3EDF8] text-xs text-[#526B87] focus:outline-none focus:border-[#8AAED8]"
          >
            <option value="">All Accounts</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-white border border-[#E3EDF8] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EAF4FF] text-[11px] uppercase tracking-wider text-[#526B87] font-bold border-b border-[#E3EDF8]">
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
            <tbody className="divide-y divide-[#EDF3FA]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#7188A3]">
                    <RefreshCw className="animate-spin inline-block mr-2" size={16} />
                    Loading user records…
                  </td>
                </tr>
              ) : !users.length ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#94A8BE]">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isMaster = u.email.toLowerCase() === "vickyms2app@gmail.com";
                  const subTier = u.activeSubscription?.planTier || "FREE";

                  return (
                    <tr key={u.id} className="hover:bg-[#F4F9FF] transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[#EEF7FF] text-[#2563EB] border border-[#D8EBFF] grid place-items-center font-bold">
                            {u.name?.charAt(0)?.toUpperCase() || "U"}
                          </div>
                          <div>
                            <p className="font-bold text-[#526B87] flex items-center gap-1.5">
                              {u.name}
                              {isMaster && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-[#D8EBFF] text-[#2563EB] border border-[#C7E1FF]">
                                  MASTER
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-[#7188A3] font-mono">{u.email}</p>
                            {u.phone && <p className="text-[10px] text-[#94A8BE]">{u.phone}</p>}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F4F9FF] text-[#526B87] border border-[#E3EDF8]">
                          {u.role}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            subTier === "ENTERPRISE"
                              ? "bg-[#D4C2FF]/20 text-[#6D28D9] border border-[#D4C2FF]"
                              : subTier === "PRO"
                              ? "bg-[#D8EBFF] text-[#2563EB] border border-[#C7E1FF]"
                              : "bg-[#F0F7FF] text-[#7188A3] border border-[#E3EDF8]"
                          }`}
                        >
                          {u.activeSubscription?.planName || "Free Starter"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[#526B87] font-semibold flex items-center gap-1">
                          <ShoppingBag size={12} className="text-[#8AAED8]" />
                          {u.salesCount || 0} bills
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            u.isActive
                              ? "bg-[#ECF9F1] text-[#166534] border border-[#C8E6C9]"
                              : "bg-[#FFF0F2] text-[#991B1B] border border-[#FECDD3]"
                          }`}
                        >
                          {u.isActive ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
                              Active
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-[#991B1B]" />
                              Suspended
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[#7188A3] text-[11px]">
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
                            className="p-1.5 rounded-lg bg-[#F0F7FF] hover:bg-[#D8EBFF] text-[#526B87] hover:text-[#2563EB] border border-[#E3EDF8] transition"
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
                                  ? "bg-[#FFF0F2] text-[#991B1B] border border-[#FECDD3] hover:bg-[#FFE4E6]"
                                  : "bg-[#ECF9F1] text-[#166534] border border-[#C8E6C9] hover:bg-[#DCFCE7]"
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
        <div className="p-4 bg-[#F4F9FF] border-t border-[#E3EDF8] flex items-center justify-between text-xs text-[#7188A3]">
          <span>Showing {users.length} of {total} registered accounts</span>
        </div>
      </div>

      {/* Reset Password Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 bg-[#0F2747]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-white border border-[#E3EDF8] p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#526B87] flex items-center gap-2">
                <KeyRound size={16} className="text-[#2563EB]" />
                Reset Password
              </h3>
              <button onClick={() => setResetModalUser(null)} className="text-[#94A8BE] hover:text-[#526B87]">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[#7188A3] mb-4">
              Set a new secure password for <strong className="text-[#526B87]">{resetModalUser.email}</strong>.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <input
                type="text"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                className="w-full px-4 py-3 rounded-xl bg-[#F4F9FF] border border-[#E3EDF8] text-xs text-[#526B87] placeholder-[#94A8BE] focus:outline-none focus:border-[#8AAED8] font-mono"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-4 py-2 rounded-xl bg-[#F0F7FF] text-xs font-semibold text-[#526B87] hover:bg-[#E3EDF8] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalBusy}
                  className="px-4 py-2 rounded-xl bg-[#D8EBFF] hover:bg-[#C7E1FF] text-[#2563EB] text-xs font-bold transition disabled:opacity-50"
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
