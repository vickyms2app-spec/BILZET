import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  ShieldCheck,
  UserCheck,
  Sparkles,
  Check,
  X,
  AlertTriangle,
  ArrowUpRight,
  Inbox,
  RefreshCw,
  Mail,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../store/auth";
import { notificationApi, roleInvitationApi } from "../../api";
import { getWorkspaceRedirectPath } from "../../utils/workspaceRouter";

export default function NotificationBell({ theme = "light" }) {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("bilzet:open-notifications", handleOpen);
    return () => window.removeEventListener("bilzet:open-notifications", handleOpen);
  }, []);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'invitations'
  const [notifications, setNotifications] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const panelRef = useRef(null);

  const fetchNotificationData = useCallback(async () => {
    if (!user) return;
    try {
      const [notesRes, unreadRes, invitesRes] = await Promise.allSettled([
        notificationApi.list({ limit: 20 }),
        notificationApi.getUnreadCount(),
        roleInvitationApi.getMyInvitations(),
      ]);

      const notesData = notesRes.status === "fulfilled" ? notesRes.value : null;
      const fetchedNotes =
        notesData?.notifications ||
        notesData?.data?.notifications ||
        (Array.isArray(notesData) ? notesData : []);
      setNotifications(fetchedNotes);

      const invitesData = invitesRes.status === "fulfilled" ? invitesRes.value : null;
      const fetchedInvites =
        invitesData?.invitations ||
        invitesData?.data?.invitations ||
        (Array.isArray(invitesData) ? invitesData : []);
      setInvitations(fetchedInvites);

      const unreadData = unreadRes.status === "fulfilled" ? unreadRes.value : null;
      const rawUnread =
        typeof unreadData?.unreadCount === "number"
          ? unreadData.unreadCount
          : typeof unreadData?.data?.unreadCount === "number"
          ? unreadData.data.unreadCount
          : fetchedNotes.filter((n) => !n.isRead).length;

      // Pending invitations should also alert the user!
      const totalBadge = rawUnread + fetchedInvites.length;
      setUnreadCount(totalBadge);
    } catch (err) {
      console.warn("[NotificationBell] Failed to fetch notifications:", err);
    }
  }, [user]);

  // Initial load + periodic polling (every 12s) + refetch on window focus & realtime events
  useEffect(() => {
    fetchNotificationData();

    const interval = setInterval(fetchNotificationData, 12000);
    const onFocus = () => fetchNotificationData();
    const onCustomRefresh = () => fetchNotificationData();
    const onRealtime = (e) => {
      const type = e?.detail?.type;
      if (
        type === "INVITATION_CREATED" ||
        type === "CA_INVITATION_CREATED" ||
        type === "NOTIFICATION_RECEIVED" ||
        type === "ROLE_ASSIGNED" ||
        type === "CA_INVITATION_ACCEPTED"
      ) {
        fetchNotificationData();
      }
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("bilzet:refresh-notifications", onCustomRefresh);
    window.addEventListener("bilzet:realtime", onRealtime);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("bilzet:refresh-notifications", onCustomRefresh);
      window.removeEventListener("bilzet:realtime", onRealtime);
    };
  }, [fetchNotificationData]);

  // Refetch when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotificationData();
    }
  }, [isOpen, fetchNotificationData]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(invitations.length);
    } catch (err) {
      console.warn("Failed to mark all as read:", err);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await notificationApi.markRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (_) {}
    }

    if (notif.type === "ROLE_INVITATION" || notif.invitationId) {
      setActiveTab("invitations");
      return;
    }

    if (notif.data?.link) {
      setIsOpen(false);
      navigate(notif.data.link);
    }
  };

  const handleAcceptInvite = async (invite) => {
    setActionLoadingId(invite.id);
    setStatusMessage(null);
    try {
      const res = await roleInvitationApi.accept({
        token: invite.token || invite.id,
      });

      setStatusMessage({
        type: "success",
        text: `Invitation accepted! Welcome to ${invite.business?.name || "the business"}.`,
      });

      // Refresh authentication/session context
      if (refreshUser) {
        await refreshUser();
      }

      // Re-fetch notification data
      await fetchNotificationData();

      // Dispatch global store change event
      window.dispatchEvent(new CustomEvent("bilzet:store-changed", { detail: { businessId: invite.businessId } }));

      setTimeout(() => {
        setIsOpen(false);
        const nextPath = getWorkspaceRedirectPath({ role: invite.role, businessId: invite.businessId });
        navigate(nextPath);
      }, 1200);
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err?.response?.data?.message || err?.message || "Failed to accept invitation.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineInvite = async (invite) => {
    if (!window.confirm(`Decline the invitation to join ${invite.business?.name || "this business"}?`)) {
      return;
    }
    setActionLoadingId(invite.id);
    setStatusMessage(null);
    try {
      await roleInvitationApi.decline({
        token: invite.token || invite.id,
      });

      setStatusMessage({
        type: "info",
        text: "Invitation declined.",
      });

      await fetchNotificationData();
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err?.response?.data?.message || err?.message || "Failed to decline invitation.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingInvitesCount = invitations.length;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl transition cursor-pointer border ${
          theme === "dark"
            ? "text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border-white/10"
            : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 border-transparent"
        }`}
        title="Notifications & Invitations"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full ring-2 ring-slate-900 shadow-sm animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 overflow-hidden">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <Bell size={15} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Notification Center</h4>
                  <p className="text-[10px] text-slate-400">Activity and role invitations</p>
                </div>
              </div>

              {notifications.some((n) => !n.isRead) && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Status Message (Toast inside panel) */}
            {statusMessage && (
              <div
                className={`mt-2.5 p-2 rounded-lg text-[11px] font-medium flex items-center gap-1.5 ${
                  statusMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : statusMessage.type === "error"
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-slate-100 text-slate-700 border border-slate-200"
                }`}
              >
                {statusMessage.type === "success" ? (
                  <CheckCircle2 size={13} className="shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle size={13} className="shrink-0 text-rose-600" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-200/60">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition ${
                  activeTab === "all"
                    ? "bg-white text-blue-600 shadow-xs border border-slate-200/80"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
                }`}
              >
                All Activity
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("invitations")}
                className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition flex items-center justify-center gap-1.5 ${
                  activeTab === "invitations"
                    ? "bg-white text-blue-600 shadow-xs border border-slate-200/80"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
                }`}
              >
                <span>Invitations</span>
                {pendingInvitesCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                    {pendingInvitesCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-2">
            {activeTab === "invitations" ? (
              // Invitations Tab
              invitations.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <Inbox size={26} className="mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-700">No pending invitations</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    When an admin invites you to a store, it will appear here.
                  </p>
                </div>
              ) : (
                invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3 my-1 rounded-xl bg-slate-50/90 border border-slate-200/90 hover:border-blue-200 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0">
                          <Building2 size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            {inv.business?.name || "Business Workspace"}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              {inv.role}
                            </span>
                            {inv.department && (
                              <span className="text-[10px] text-slate-500 font-medium">
                                • {inv.department}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {inv.message && (
                      <p className="mt-2 text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100 italic">
                        &quot;{inv.message}&quot;
                      </p>
                    )}

                    <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Invited by: {inv.inviter?.name || inv.inviter?.email || "Store Admin"}</span>
                      {inv.expiresAt && (
                        <span>Expires: {new Date(inv.expiresAt).toLocaleDateString()}</span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => handleAcceptInvite(inv)}
                        disabled={actionLoadingId === inv.id}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                      >
                        {actionLoadingId === inv.id ? (
                          <RefreshCw size={13} className="animate-spin" />
                        ) : (
                          <Check size={13} />
                        )}
                        <span>Accept Invitation</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeclineInvite(inv)}
                        disabled={actionLoadingId === inv.id}
                        className="py-1.5 px-3 rounded-lg bg-slate-200/70 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : (
              // All Activity Tab
              notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-1.5 opacity-80" />
                  <p className="font-semibold text-slate-700">All caught up</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">No unread notifications</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`py-2.5 px-2.5 rounded-xl cursor-pointer transition flex items-start gap-2.5 my-0.5 ${
                      !n.isRead ? "bg-blue-50/50 hover:bg-blue-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="mt-0.5">
                      {n.type === "ROLE_INVITATION" ? (
                        <UserCheck size={16} className="text-amber-500" />
                      ) : n.type === "INVITATION_ACCEPTED" ? (
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      ) : n.type === "INVITATION_REJECTED" ? (
                        <XCircle size={16} className="text-rose-500" />
                      ) : (
                        <Sparkles size={16} className="text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-xs ${!n.isRead ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                          {n.title}
                        </p>
                        {!n.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{n.message}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <ArrowUpRight size={13} className="text-slate-400 shrink-0 mt-1" />
                  </div>
                ))
              )
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>BILZET Realtime In-App Notification Engine</span>
            <button
              type="button"
              onClick={fetchNotificationData}
              className="hover:text-slate-700 transition flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
