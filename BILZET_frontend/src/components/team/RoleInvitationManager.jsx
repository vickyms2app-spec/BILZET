import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Mail,
  Plus,
  RefreshCw,
  Trash2,
  Edit2,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Copy,
  Send,
  Check,
  Building2,
  Shield,
  Briefcase,
  Users,
  Search,
  Filter,
  Eye,
} from "lucide-react";
import { roleInvitationApi, memberApi } from "../../api";
import { useAuth } from "../../store/auth";

export default function RoleInvitationManager() {
  const { user } = useAuth();

  const [invitations, setInvitations] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState("invitations"); // 'invitations' | 'members'
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("STAFF");
  const [inviteDept, setInviteDept] = useState("");
  const [inviteDesignation, setInviteDesignation] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit Member Modal State
  const [editingMember, setEditingMember] = useState(null);
  const [newRole, setNewRole] = useState("");
  const [newDept, setNewDept] = useState("");

  // Toast / feedback message
  const [feedback, setFeedback] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [invRes, memRes] = await Promise.allSettled([
        roleInvitationApi.list(),
        memberApi.list(),
      ]);

      if (invRes.status === "fulfilled") {
        const list = invRes.value?.data?.invitations || invRes.value?.invitations || [];
        setInvitations(list);
      }
      if (memRes.status === "fulfilled") {
        const memList = memRes.value?.data?.members || memRes.value?.members || [];
        setMembers(memList);
      }
    } catch (err) {
      console.warn("Failed to load invitation and member data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setFeedback({ type: "error", message: "Please enter a valid email address." });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);
      const targetStoreId =
        user?.businessId ||
        user?.business?.id ||
        (typeof localStorage !== "undefined" ? localStorage.getItem("bilzet_active_store_id") : null);

      const res = await roleInvitationApi.invite({
        email: inviteEmail.trim(),
        name: inviteName.trim() || undefined,
        role: inviteRole,
        department: inviteDept.trim() || undefined,
        designation: inviteDesignation.trim() || undefined,
        message: inviteMessage.trim() || undefined,
        storeId: targetStoreId || undefined,
        businessId: targetStoreId || undefined,
      });

      const invData = res?.data?.invitation || res?.invitation;
      const isEmailSent = invData?.deliveryStatus === "SENT";

      setFeedback({
        type: "success",
        message: isEmailSent
          ? `Invitation sent successfully to ${inviteEmail}.`
          : `Invitation created! In-app notification delivered to ${inviteEmail}. (Email SMTP not configured).`,
      });

      setShowInviteModal(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("STAFF");
      setInviteDept("");
      setInviteDesignation("");
      setInviteMessage("");

      await loadData();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.response?.data?.message || err?.message || "Failed to create invitation.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async (id) => {
    setActionLoadingId(id);
    try {
      await roleInvitationApi.resend(id);
      setFeedback({ type: "success", message: "Invitation resent with a refreshed security token." });
      await loadData();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.response?.data?.message || err?.message || "Failed to resend invitation.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm("Are you sure you want to revoke this invitation? The recipient will no longer be able to accept it.")) {
      return;
    }
    setActionLoadingId(id);
    try {
      await roleInvitationApi.revoke(id);
      setFeedback({ type: "info", message: "Invitation revoked successfully." });
      await loadData();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.response?.data?.message || err?.message || "Failed to revoke invitation.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCopyLink = (inv) => {
    const origin = window.location.origin;
    const token = inv.token || inv.id;
    const link = `${origin}/accept-invitation?token=${token}&role=${inv.role.toLowerCase()}`;
    navigator.clipboard.writeText(link);
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleUpdateMemberRole = async (e) => {
    e.preventDefault();
    if (!editingMember) return;
    try {
      setSubmitting(true);
      await memberApi.updateRole(editingMember.id, {
        role: newRole,
        department: newDept,
      });
      setFeedback({ type: "success", message: "Member role updated successfully." });
      setEditingMember(null);
      await loadData();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.response?.data?.message || err?.message || "Failed to update member role.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (member) => {
    if (
      !window.confirm(
        `Remove ${member.user?.name || member.user?.email} from this store? Their historical sales, invoices, and activity will be permanently preserved.`
      )
    ) {
      return;
    }
    setActionLoadingId(member.id);
    try {
      await memberApi.remove(member.id);
      setFeedback({ type: "info", message: "Member removed from store access." });
      await loadData();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.response?.data?.message || err?.message || "Failed to remove member.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredInvitations = useMemo(() => {
    return invitations.filter((inv) => {
      const matchStatus = statusFilter === "ALL" || inv.status === statusFilter;
      const matchSearch =
        search === "" ||
        inv.recipientEmail.toLowerCase().includes(search.toLowerCase()) ||
        inv.role.toLowerCase().includes(search.toLowerCase()) ||
        (inv.department && inv.department.toLowerCase().includes(search.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [invitations, statusFilter, search]);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const name = m.user?.name || "";
      const email = m.user?.email || "";
      const role = m.role || "";
      const dept = m.department || "";
      return (
        search === "" ||
        name.toLowerCase().includes(search.toLowerCase()) ||
        email.toLowerCase().includes(search.toLowerCase()) ||
        role.toLowerCase().includes(search.toLowerCase()) ||
        dept.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [members, search]);

  return (
    <div className="space-y-6">
      {/* Action Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setSubTab("invitations")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                subTab === "invitations"
                  ? "bg-white text-blue-600 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Mail size={14} />
              <span>Role Invitations ({invitations.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab("members")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                subTab === "members"
                  ? "bg-white text-blue-600 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users size={14} />
              <span>Active Members ({members.length})</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus size={15} />
            <span>Invite Team Member</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2.5 ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : feedback.type === "error"
              ? "bg-rose-50 text-rose-800 border border-rose-200"
              : "bg-blue-50 text-blue-800 border border-blue-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : feedback.type === "error" ? (
              <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            ) : (
              <ShieldCheck size={16} className="text-blue-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {subTab === "invitations" && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {["ALL", "PENDING", "ACCEPTED", "REJECTED", "REVOKED"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  statusFilter === status
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        )}

        <div className="w-full sm:w-64 relative">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={subTab === "invitations" ? "Search email, role..." : "Search members..."}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Main Content: Invitations Table or Members Table */}
      {subTab === "invitations" ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Role & Dept</th>
                  <th className="py-3 px-4">Delivery</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Expiry</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && invitations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      <RefreshCw size={20} className="mx-auto mb-2 animate-spin text-blue-500" />
                      Loading invitations…
                    </td>
                  </tr>
                ) : filteredInvitations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      <Mail size={24} className="mx-auto mb-2 text-slate-300" />
                      No role invitations found matching filter.
                    </td>
                  </tr>
                ) : (
                  filteredInvitations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{inv.name || inv.recipientEmail}</div>
                        <div className="text-[11px] font-mono text-slate-400">{inv.recipientEmail}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                            inv.role === "MANAGER"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : inv.role === "CA"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {inv.role}
                        </span>
                        {inv.department && (
                          <span className="block text-[11px] text-slate-500 mt-0.5">
                            {inv.department}
                            {inv.designation && ` • ${inv.designation}`}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            inv.deliveryStatus === "SENT"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {inv.deliveryStatus === "SENT" ? "Email Delivered" : "In-App Only"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.status === "PENDING"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : inv.status === "ACCEPTED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : inv.status === "REJECTED"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {inv.status === "PENDING" && <Clock size={10} />}
                          {inv.status === "ACCEPTED" && <CheckCircle2 size={10} />}
                          {inv.status === "REJECTED" && <XCircle size={10} />}
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {inv.status === "PENDING" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleCopyLink(inv)}
                                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                                title="Copy invitation link"
                              >
                                {copiedId === inv.id ? (
                                  <Check size={14} className="text-emerald-600" />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleResend(inv.id)}
                                disabled={actionLoadingId === inv.id}
                                className="p-1.5 rounded-md hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition cursor-pointer disabled:opacity-50"
                                title="Resend invitation & notification"
                              >
                                <Send size={14} className={actionLoadingId === inv.id ? "animate-spin" : ""} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRevoke(inv.id)}
                                disabled={actionLoadingId === inv.id}
                                className="p-1.5 rounded-md hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition cursor-pointer disabled:opacity-50"
                                title="Revoke invitation"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                          {inv.status !== "PENDING" && (
                            <span className="text-[11px] text-slate-400 italic">No actions</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Members Table */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Team Member</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Department & Designation</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Joined At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && members.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      <RefreshCw size={20} className="mx-auto mb-2 animate-spin text-blue-500" />
                      Loading active store members…
                    </td>
                  </tr>
                ) : filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      <Users size={24} className="mx-auto mb-2 text-slate-300" />
                      No members found in this store workspace.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">
                          {m.user?.name || m.user?.email || "Store Member"}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">{m.user?.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                            m.role === "MANAGER"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : m.role === "CA"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {m.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {m.department || "General"}
                        {m.designation && <span className="text-slate-400"> • {m.designation}</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={10} />
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {m.acceptedAt
                          ? new Date(m.acceptedAt).toLocaleDateString()
                          : new Date(m.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMember(m);
                              setNewRole(m.role);
                              setNewDept(m.department || "");
                            }}
                            className="p-1.5 rounded-md hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition cursor-pointer"
                            title="Edit role & permissions"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m)}
                            disabled={actionLoadingId === m.id}
                            className="p-1.5 rounded-md hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition cursor-pointer disabled:opacity-50"
                            title="Deactivate / Remove Member"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <Mail size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Invite Team Member</h3>
                  <p className="text-[11px] text-slate-400">
                    Send a role invitation to join this business store
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Recipient Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  If they already have an account or register later, the invitation will be linked
                  securely to this email.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name (Optional)</label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assigned Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold"
                  >
                    <option value="STAFF">Staff (POS & Inventory)</option>
                    <option value="MANAGER">Manager (Operations & Analytics)</option>
                    <option value="CA">Chartered Accountant (CA Connect)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={inviteDept}
                    onChange={(e) => setInviteDept(e.target.value)}
                    placeholder="e.g. Billing Counter"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={inviteDesignation}
                    onChange={(e) => setInviteDesignation(e.target.value)}
                    placeholder="e.g. Senior Cashier"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Personal Message</label>
                <textarea
                  rows={2}
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="Welcome to our Bilzet store team! Please accept your role."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>Dispatch Invitation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Edit Member Role</h3>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdateMemberRole} className="mt-4 space-y-4 text-xs">
              <div>
                <span className="block text-slate-500 mb-0.5">Member</span>
                <span className="font-bold text-slate-800">
                  {editingMember.user?.name || editingMember.user?.email}
                </span>
                <span className="block font-mono text-[11px] text-slate-400">
                  {editingMember.user?.email}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Store Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="STAFF">Staff (Cashier / POS / Stock)</option>
                  <option value="MANAGER">Manager (Operations & Store Management)</option>
                  <option value="CA">Chartered Accountant (CA Connect)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  placeholder="e.g. Inventory Management"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {submitting && <RefreshCw size={14} className="animate-spin" />}
                  <span>Save Role</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
