import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  UserPlus,
  Shield,
  Key,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Trash2,
  Power,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Lock,
  Unlock,
  Crown,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff,
  Copy,
  Check,
  UserCheck,
  Printer,
  FileSpreadsheet,
} from "lucide-react";
import { teamApi, rolesApi, subscriptionUsageApi } from "../../api";
import { usePermissions } from "../../hooks/usePermissions";
import { useAuth } from "../../store/auth";
import Button from "../common/Button";

const ROLE_PREVIEWS = {
  MANAGER: {
    title: "Manager",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    description: "Operational supervisor with authority over Billing, Inventory, Purchases, Customers, Staff Attendance, and Business Reports.",
    badges: ["Full POS Billing", "Inventory & Stock", "Purchases & PO", "Customer Details", "Staff Attendance", "Sales Reports"],
    matrix: [
      { module: "Billing & POS", view: true, create: true, edit: true, delete: false, print: true, export: true },
      { module: "Inventory & Stock", view: true, create: true, edit: true, delete: false, print: true, export: true },
      { module: "Purchases & PO", view: true, create: true, edit: true, delete: false, print: true, export: true },
      { module: "Customer Details", view: true, create: true, edit: true, delete: false, print: true, export: true },
      { module: "Staff Attendance", view: true, create: true, edit: false, delete: false, print: true, export: true },
      { module: "Reports & Analytics", view: true, create: false, edit: false, delete: false, print: true, export: true },
      { module: "Business Settings", view: true, create: false, edit: false, delete: false, print: false, export: false },
    ],
  },
  STAFF: {
    title: "Staff",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    description: "General store staff handling POS checkout, inventory catalog lookup, delivery challans, customer registration, and shift punches.",
    badges: ["POS Billing", "Inventory Lookup", "Delivery Challans", "Customer Details", "Shift Punch Clock"],
    matrix: [
      { module: "Billing & POS", view: true, create: true, edit: false, delete: false, print: true, export: false },
      { module: "Inventory & Stock", view: true, create: false, edit: false, delete: false, print: false, export: false },
      { module: "Purchases & PO", view: false, create: false, edit: false, delete: false, print: false, export: false },
      { module: "Customer Details", view: true, create: true, edit: false, delete: false, print: false, export: false },
      { module: "Staff Attendance", view: true, create: true, edit: false, delete: false, print: false, export: false },
      { module: "Reports & Analytics", view: false, create: false, edit: false, delete: false, print: false, export: false },
      { module: "Business Settings", view: false, create: false, edit: false, delete: false, print: false, export: false },
    ],
  },
  CASHIER: {
    title: "Cashier",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    description: "Counter billing specialist. Can process sales transactions, print customer receipts, register walk-in clients, and punch shift hours.",
    badges: ["Fast POS Checkout", "Receipt Printing", "Customer Lookup", "Shift Punch Clock"],
    matrix: [
      { module: "Billing & POS", view: true, create: true, edit: false, delete: false, print: true, export: false },
      { module: "Inventory & Stock", view: true, create: false, edit: false, delete: false, print: false, export: false },
      { module: "Purchases & PO", view: false, create: false, edit: false, delete: false, print: false, export: false },
      { module: "Customer Details", view: true, create: true, edit: false, delete: false, print: false, export: false },
      { module: "Staff Attendance", view: true, create: true, edit: false, delete: false, print: false, export: false },
      { module: "Reports & Analytics", view: false, create: false, edit: false, delete: false, print: false, export: false },
      { module: "Business Settings", view: false, create: false, edit: false, delete: false, print: false, export: false },
    ],
  },
  ADMIN: {
    title: "Administrator",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    description: "Complete unrestricted business administrative authority across all modules, sensitive financial settings, and user management.",
    badges: ["Full Unrestricted Access", "Store Settings", "Sub-User Control", "Audit Trail"],
    matrix: [
      { module: "Billing & POS", view: true, create: true, edit: true, delete: true, print: true, export: true },
      { module: "Inventory & Stock", view: true, create: true, edit: true, delete: true, print: true, export: true },
      { module: "Purchases & PO", view: true, create: true, edit: true, delete: true, print: true, export: true },
      { module: "Customer Details", view: true, create: true, edit: true, delete: true, print: true, export: true },
      { module: "Staff Attendance", view: true, create: true, edit: true, delete: true, print: true, export: true },
      { module: "Reports & Analytics", view: true, create: true, edit: true, delete: true, print: true, export: true },
      { module: "Business Settings", view: true, create: true, edit: true, delete: true, print: true, export: true },
    ],
  },
};

export default function TeamManagement() {
  const navigate = useNavigate();
  const { isOwner, isSuperAdmin } = usePermissions();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [usage, setUsage] = useState({
    usedSeats: 0,
    maxSeats: 0,
    remainingSeats: 0,
    canAddUser: false,
    planTier: "FREE",
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals & Locked Feature Prompt
  const [lockedModal, setLockedModal] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [permissionModalUser, setPermissionModalUser] = useState(null);
  const [permissionBreakdown, setPermissionBreakdown] = useState(null);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [permSearch, setPermSearch] = useState("");
  const [expandedModules, setExpandedModules] = useState({});

  // Effective Subscription Tier Evaluation
  const effectiveTier = (() => {
    if (usage?.isExpired || usage?.status === "EXPIRED" || usage?.status === "CANCELLED") {
      return "FREE";
    }
    if (usage?.planTier && usage.planTier !== "FREE") {
      return usage.planTier.toUpperCase();
    }
    try {
      const saved = localStorage.getItem("bilzet_subscription");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.status === "Expired" || parsed.status === "Cancelled") return "FREE";
        if (parsed.currentPlan) return parsed.currentPlan.toUpperCase();
      }
    } catch (_) {}
    return (usage?.planTier || "FREE").toUpperCase();
  })();

  const isFree = effectiveTier === "FREE";
  const isPro = effectiveTier === "PRO";
  const isPremium = effectiveTier === "PREMIUM" || effectiveTier === "ENTERPRISE";
  const isExpired = Boolean(usage?.isExpired || usage?.status === "EXPIRED" || usage?.status === "CANCELLED");

  // Created credentials modal (for secure handoff)
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Password visibility & generator
  const [showPassword, setShowPassword] = useState(false);

  // Feedback states
  const [feedback, setFeedback] = useState({ message: "", type: "success" });
  const [submitting, setSubmitting] = useState(false);

  // Form states for Add/Edit
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "STAFF",
    customRoleId: "",
    password: "",
    isActive: true,
  });

  const generateSecurePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pwd = "Bilzet@";
    for (let i = 0; i < 4; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password: pwd }));
    setShowPassword(true);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes, usageRes] = await Promise.all([
        teamApi.list(),
        rolesApi.list(),
        subscriptionUsageApi.get(),
      ]);

      setUsers(usersRes.users || []);
      setRoles(rolesRes.roles || []);
      if (usageRes) setUsage(usageRes);
    } catch (err) {
      console.warn("Failed to load team data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (message, type = "success") => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: "", type: "success" }), 4000);
  };

  const handleOpenAdd = () => {
    if (isFree) {
      setLockedModal({
        title: "Team Management — Pro Feature",
        requiredPlan: "PRO",
        description: "Upgrade to Pro to unlock this feature and invite up to 5 team members.",
      });
      return;
    }
    if (!usage.canAddUser) {
      setLockedModal({
        title: "Team Seat Quota Reached",
        requiredPlan: "PREMIUM",
        description: `You have utilized ${usage.usedSeats} of ${usage.maxSeats} allocated team seats on your current plan. Upgrade to Premium to unlock up to 15 team members.`,
      });
      return;
    }
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: "STAFF",
      customRoleId: "",
      password: "",
      isActive: true,
    });
    setEditingUser(null);
    setShowPassword(false);
    setShowAddModal(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role || "STAFF",
      customRoleId: user.appRole?.id || "",
      password: "",
      isActive: user.isActive !== undefined ? user.isActive : true,
    });
    setShowPassword(false);
    setShowAddModal(true);
  };

  const handleSaveMember = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    setSubmitting(true);
    try {
      if (editingUser) {
        await teamApi.update(editingUser.id || editingUser._id, {
          name: formData.name,
          phone: formData.phone,
          role: formData.role,
          customRoleId: formData.customRoleId || null,
          password: formData.password || undefined,
          isActive: formData.isActive,
        });
        showNotification("Sub-user updated successfully.");
      } else {
        const res = await teamApi.create({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          customRoleId: formData.customRoleId || null,
          password: formData.password || undefined,
          isActive: formData.isActive,
        });
        showNotification("Sub-user created successfully.");

        const issuedPassword = formData.password || res?.temporaryPassword;
        if (issuedPassword) {
          setCreatedCredentials({
            name: formData.name,
            email: formData.email,
            role: formData.role,
            password: issuedPassword,
          });
        }
      }
      setShowAddModal(false);
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to save sub-user.";
      showNotification(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickRoleChange = async (user, newRole) => {
    if (user.isOwner) {
      showNotification("The primary store owner role cannot be altered.", "error");
      return;
    }
    if (user.id === currentUser?.id || user.id === currentUser?._id) {
      showNotification("Anti-Privilege Escalation: You cannot change your own role.", "error");
      return;
    }
    try {
      await teamApi.update(user.id || user._id, { role: newRole });
      showNotification(`Role updated to ${newRole} for ${user.name}.`);
      loadData();
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to update role.", "error");
    }
  };

  const handleToggleStatus = async (user) => {
    if (user.isOwner) {
      showNotification("The primary store owner cannot be deactivated.", "error");
      return;
    }
    if (user.id === currentUser?.id || user.id === currentUser?._id) {
      showNotification("You cannot deactivate your own account.", "error");
      return;
    }

    try {
      await teamApi.toggleStatus(user.id || user._id, !user.isActive);
      showNotification(
        `User ${!user.isActive ? "activated" : "deactivated"} successfully.`
      );
      loadData();
    } catch (err) {
      showNotification(err.response?.data?.message || "Action failed.", "error");
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.isOwner) {
      showNotification("The primary store owner cannot be removed.", "error");
      return;
    }
    if (user.id === currentUser?.id || user.id === currentUser?._id) {
      showNotification("You cannot delete your own account.", "error");
      return;
    }

    if (!window.confirm(`Are you sure you want to remove ${user.name} from your team?`)) {
      return;
    }

    try {
      await teamApi.remove(user.id || user._id);
      showNotification("Team member removed successfully.");
      loadData();
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to delete user.", "error");
    }
  };

  const handleOpenPermissions = async (user) => {
    if (user.isOwner) {
      showNotification("The primary store owner always retains full permissions across all modules.", "info");
      return;
    }
    if (user.id === currentUser?.id || user.id === currentUser?._id) {
      showNotification("You cannot modify your own permission overrides (Anti-Privilege Escalation).", "error");
      return;
    }
    if (!isPremium) {
      setLockedModal({
        title: "Granular Permission Overrides",
        requiredPlan: "PREMIUM",
        description: "Upgrade to Premium to unlock advanced team management and configure individual permission overrides per user.",
      });
      return;
    }

    setPermissionModalUser(user);
    setLoadingPerms(true);
    try {
      const res = await teamApi.getPermissions(user.id || user._id);
      setPermissionBreakdown(res);
      // Auto expand all modules initially
      const initialExpanded = {};
      if (res?.permissions) {
        res.permissions.forEach((p) => {
          initialExpanded[p.module] = true;
        });
      }
      setExpandedModules(initialExpanded);
    } catch (err) {
      showNotification("Failed to load permissions.", "error");
    } finally {
      setLoadingPerms(false);
    }
  };

  const handleResetAllOverrides = () => {
    if (!permissionBreakdown?.permissions) return;
    setPermissionBreakdown((prev) => {
      const reset = prev.permissions.map((p) => ({
        ...p,
        effective: p.roleDefault,
        hasOverride: false,
        overrideAllowed: null,
        source: "ROLE",
      }));
      return { ...prev, permissions: reset };
    });
    showNotification("All overrides reset to role defaults. Click Save to persist.", "info");
  };

  const handleSetModuleOverrides = (modName, allow) => {
    if (!permissionBreakdown?.permissions) return;
    setPermissionBreakdown((prev) => {
      const updated = prev.permissions.map((p) => {
        if (p.module !== modName) return p;
        return {
          ...p,
          effective: allow,
          hasOverride: allow !== p.roleDefault,
          overrideAllowed: allow !== p.roleDefault ? allow : null,
          source: allow !== p.roleDefault ? (allow ? "USER_OVERRIDE_ALLOW" : "USER_OVERRIDE_DENY") : "ROLE",
        };
      });
      return { ...prev, permissions: updated };
    });
  };

  const handleToggleOverride = (permKey, currentOverride) => {
    if (!permissionBreakdown?.permissions) return;

    setPermissionBreakdown((prev) => {
      const updated = prev.permissions.map((p) => {
        if (p.key !== permKey) return p;

        let nextOverride = null;
        if (currentOverride === null) {
          // If no override, toggle opposite of roleDefault
          nextOverride = !p.roleDefault;
        } else if (currentOverride === true) {
          nextOverride = false;
        } else {
          // Revert back to role default
          nextOverride = null;
        }

        const effective = nextOverride !== null ? nextOverride : p.roleDefault;
        const source =
          nextOverride === true
            ? "USER_OVERRIDE_ALLOW"
            : nextOverride === false
            ? "USER_OVERRIDE_DENY"
            : "ROLE";

        return {
          ...p,
          effective,
          hasOverride: nextOverride !== null,
          overrideAllowed: nextOverride,
          source,
        };
      });

      return { ...prev, permissions: updated };
    });
  };

  const handleSavePermissions = async () => {
    if (!permissionModalUser || !permissionBreakdown?.permissions) return;

    setSubmitting(true);
    try {
      const overrides = permissionBreakdown.permissions
        .filter((p) => p.hasOverride)
        .map((p) => ({
          permissionId: p.id,
          key: p.key,
          allowed: p.overrideAllowed,
        }));

      await teamApi.updatePermissions(permissionModalUser.id || permissionModalUser._id, overrides);
      showNotification("Permissions updated successfully.");
      setPermissionModalUser(null);
      loadData();
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to update permissions.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch =
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.includes(q);

    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && u.isActive) ||
      (statusFilter === "INACTIVE" && !u.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Feedback Toast */}
      {feedback.message && (
        <div
          className={`flex items-center gap-3 p-3.5 rounded-xl border text-sm font-medium ${
            feedback.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {feedback.type === "error" ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Subscription Expiration Warning Banner */}
      {isExpired && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Subscription Expired:</strong> Your subscription has expired. Existing team data and roles remain preserved, but adding new members and permission overrides require an active subscription.
            </span>
          </div>
          <button
            onClick={() => navigate("/plans")}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shrink-0 transition cursor-pointer"
          >
            Renew Subscription
          </button>
        </div>
      )}

      {/* Top Banner: Seat Usage & Overview */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-400">
                <Users className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold tracking-tight">Team &amp; Sub-Users</h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  isPremium
                    ? "bg-purple-500/20 border-purple-400/30 text-purple-300"
                    : isPro
                    ? "bg-indigo-500/20 border-indigo-400/30 text-indigo-300"
                    : "bg-amber-500/20 border-amber-400/30 text-amber-300"
                }`}
              >
                {effectiveTier} Plan
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-xl">
              Add cashiers, warehouse managers, and sales personnel under your store account. Configure granular action privileges per role or individual user.
            </p>
          </div>

          {/* Seat Quota Meter Card / Free Upgrade Card */}
          {isFree ? (
            <div className="bg-slate-800/80 backdrop-blur-md border border-amber-500/40 rounded-xl p-4 min-w-[280px] space-y-2.5 shadow-inner">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-bold text-amber-400">
                  <Lock className="w-3.5 h-3.5" /> Team Management — Pro Feature
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-snug">
                Upgrade to Pro to unlock this feature and invite up to 5 team members.
              </p>
              <button
                type="button"
                onClick={() => navigate("/plans?tier=PRO")}
                className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5" /> Upgrade to Pro
              </button>
            </div>
          ) : (
            <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-xl p-4 min-w-[260px] space-y-2.5 shadow-inner">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-300">Team Seat Utilization</span>
                <span className="font-bold text-white">
                  {usage.usedSeats} / {usage.maxSeats} Seats
                </span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    usage.usedSeats >= usage.maxSeats
                      ? "bg-rose-500"
                      : usage.usedSeats / usage.maxSeats > 0.8
                      ? "bg-amber-400"
                      : "bg-blue-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      usage.maxSeats > 0 ? (usage.usedSeats / usage.maxSeats) * 100 : 0
                    )}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{usage.remainingSeats} seats available</span>
                {usage.usedSeats >= usage.maxSeats && isPro && (
                  <button
                    type="button"
                    onClick={() => navigate("/plans?tier=PREMIUM")}
                    className="text-blue-400 hover:text-blue-300 font-semibold underline flex items-center gap-1 cursor-pointer"
                  >
                    Upgrade to Premium <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative min-w-[220px] flex-1 sm:flex-none">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search team members…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Admin / Owner</option>
            <option value="MANAGER">Manager</option>
            <option value="CASHIER">Cashier</option>
            <option value="INVENTORY_STAFF">Inventory Staff</option>
            <option value="SALES_STAFF">Sales Staff</option>
            <option value="HR_MANAGER">HR Manager</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Deactivated</option>
          </select>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={loadData}
            title="Refresh list"
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          {isFree ? (
            <button
              type="button"
              onClick={() => {
                setLockedModal({
                  title: "Team Management — Pro Feature",
                  requiredPlan: "PRO",
                  description: "Upgrade to Pro to unlock this feature and add team members.",
                });
              }}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              Upgrade to Pro
            </button>
          ) : usage.canAddUser ? (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Add Team Member
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/plans?tier=PREMIUM")}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Crown className="w-4 h-4" />
              Upgrade to Premium
            </button>
          )}
        </div>
      </div>

      {/* Team Members Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Permissions</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-slate-600">No team members found</p>
                    <p className="text-xs text-slate-400">
                      {search ? "Try adjusting your search query." : "Click '+ Add Team Member' to invite staff."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id || u._id} className="hover:bg-slate-50/60 transition group">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase shadow-xs ${
                            u.isOwner
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : "bg-blue-100 text-blue-800 border border-blue-200"
                          }`}
                        >
                          {u.name?.slice(0, 2) || "U"}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            {u.name}
                            {u.isOwner && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Primary Owner
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-xs text-slate-600">
                      {u.phone || <span className="text-slate-300 italic">No phone</span>}
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        <Shield className="w-3 h-3 text-slate-500" />
                        {u.roleName || u.role}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {u.isOwner ? (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Full Owner Access
                        </span>
                      ) : (
                        <button
                          onClick={() => handleOpenPermissions(u)}
                          className={`text-xs font-medium flex items-center gap-1.5 border px-2.5 py-1 rounded-lg transition cursor-pointer ${
                            isPremium
                              ? "text-blue-600 hover:text-blue-800 bg-blue-50/60 hover:bg-blue-100/70 border-blue-200/60"
                              : "text-slate-600 hover:text-indigo-700 bg-slate-50 hover:bg-indigo-50 border-slate-200"
                          }`}
                          title={!isPremium ? "Granular Permission Overrides — Premium Feature" : "Configure permission overrides"}
                        >
                          {isPremium ? (
                            <Key className="w-3 h-3 text-blue-500" />
                          ) : (
                            <Lock className="w-3 h-3 text-amber-500" />
                          )}
                          <span>
                            {u.overridesCount > 0 ? `${u.overridesCount} Overrides` : "Role Defaults"}
                          </span>
                          {!isPremium && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                              PREMIUM
                            </span>
                          )}
                        </button>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          u.isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.isActive ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        {u.isActive ? "Active" : "Deactivated"}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-90 group-hover:opacity-100 transition">
                        {!u.isOwner && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(u)}
                              title="Edit user"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleToggleStatus(u)}
                              title={u.isActive ? "Deactivate user" : "Activate user"}
                              className={`p-1.5 rounded-lg transition ${
                                u.isActive
                                  ? "text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                                  : "text-emerald-600 hover:bg-emerald-50"
                              }`}
                            >
                              <Power className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteUser(u)}
                              title="Delete user"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
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

      {/* ── MODAL 1: ADD / EDIT TEAM MEMBER ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {editingUser ? "Edit Team Member" : "Add Team Member"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingUser ? "Update profile and role settings" : "Assign access within your business store"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suresh Kumar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    disabled={Boolean(editingUser)}
                    placeholder="user@bilzet.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.role}
                  disabled={Boolean(editingUser && (editingUser.id === currentUser?.id || editingUser.id === currentUser?._id))}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 disabled:bg-slate-100 font-medium"
                >
                  <option value="MANAGER">Manager (Operational Store Supervisor: Billing, Stock, Purchases, Reports)</option>
                  <option value="STAFF">Staff (Retail Sales: POS Billing, Delivery Challans, Customers)</option>
                  <option value="CASHIER">Cashier (Point-of-Sale Counter Billing &amp; Receipts)</option>
                  <option value="ADMIN">Administrator (Full Store Ownership &amp; System Settings)</option>
                  {roles
                    .filter((r) => !["ADMIN", "MANAGER", "STAFF", "CASHIER"].includes(r.code))
                    .map((r) => (
                      <option
                        key={r.id || r._id}
                        value={r.code}
                        disabled={!isPremium}
                      >
                        {r.name} {!isPremium ? "— (Premium Feature Locked)" : "(Custom Role)"}
                      </option>
                    ))}
                </select>
                {!isPremium && roles.some((r) => !["ADMIN", "MANAGER", "STAFF", "CASHIER"].includes(r.code)) && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-50/80 border border-indigo-200 mt-1.5 text-[11px] text-indigo-900">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Custom role assignment requires Premium plan.</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        navigate("/plans?tier=PREMIUM");
                      }}
                      className="font-bold text-indigo-700 hover:text-indigo-900 underline ml-2 shrink-0 cursor-pointer"
                    >
                      Upgrade to Premium
                    </button>
                  </div>
                )}
                {Boolean(editingUser && (editingUser.id === currentUser?.id || editingUser.id === currentUser?._id)) && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1.5 font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Anti-Privilege Escalation: You cannot modify your own assigned role.</span>
                  </p>
                )}
              </div>

              {/* Live Role Capability Preview */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-600" />
                    {ROLE_PREVIEWS[formData.role]?.title || formData.role} Role Permissions
                  </span>
                  <span className="text-[10px] font-bold text-indigo-700 uppercase bg-indigo-100/80 px-2 py-0.5 rounded-full">
                    Default Profile
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {ROLE_PREVIEWS[formData.role]?.description || "Assigned permissions per organizational hierarchy."}
                </p>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {(ROLE_PREVIEWS[formData.role]?.badges || ["View", "Create", "Print"]).map((b, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white text-slate-700 border border-indigo-200/80 font-medium shadow-2xs">
                      ✓ {b}
                    </span>
                  ))}
                </div>
              </div>

              {/* Status Toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Status
                </label>
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        formData.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                      }`}
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      {formData.isActive ? "Active (Member can login & work)" : "Inactive / Suspended"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, isActive: !prev.isActive }))}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.isActive ? "bg-emerald-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        formData.isActive ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {editingUser ? "Reset Password (Optional)" : "Login Password"}
                  </label>
                  {!editingUser && (
                    <button
                      type="button"
                      onClick={generateSecurePassword}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-blue-500" />
                      Generate Secure Password
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={
                      editingUser
                        ? "Leave blank to keep unchanged"
                        : "Enter password (or click generate above)"
                    }
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-3.5 pr-10 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Encrypted using industry standard bcrypt. Never exposed in plain text.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {submitting ? "Saving…" : editingUser ? "Update Member" : "Create Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: GRANULAR PERMISSION INSPECTION & OVERRIDES ── */}
      {permissionModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-600">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    Permissions: {permissionModalUser.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Role: <strong className="text-slate-700">{permissionModalUser.role}</strong></span>
                    <span>•</span>
                    <span className="text-slate-400">Role-Based Access Control</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPermissionModalUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            {/* View Mode Selector Tabs */}
            <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-200/80 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setPermSearch("") || setExpandedModules({}) || setFormData((p) => ({ ...p, _permTab: "matrix" }))}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition cursor-pointer ${
                  (formData._permTab || "matrix") === "matrix"
                    ? "border-blue-600 text-blue-600 bg-white rounded-t-lg"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Assigned Permissions Matrix (View / Create / Edit / Delete / Print / Export)
              </button>
              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, _permTab: "overrides" }))}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition cursor-pointer ${
                  formData._permTab === "overrides"
                    ? "border-blue-600 text-blue-600 bg-white rounded-t-lg"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Manage Access &amp; Overrides
              </button>
            </div>

            {(formData._permTab === "overrides") && (
              /* Legend & Search Bar for Overrides Mode */
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Role Default
                  </span>
                  <span className="flex items-center gap-1 text-blue-700 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Override: Granted
                  </span>
                  <span className="flex items-center gap-1 text-rose-700 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600" /> Override: Revoked
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetAllOverrides}
                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-blue-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition cursor-pointer"
                  >
                    Reset All to Defaults
                  </button>
                  <input
                    type="text"
                    placeholder="Filter permissions…"
                    value={permSearch}
                    onChange={(e) => setPermSearch(e.target.value)}
                    className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg w-40 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Matrix View Content */}
            {(!formData._permTab || formData._permTab === "matrix") && (
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl flex items-center justify-between text-xs text-blue-900">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      Permissions assigned to <strong>{permissionModalUser.name}</strong> according to role <strong>{permissionModalUser.role}</strong> and active overrides.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, _permTab: "overrides" }))}
                    className="px-2.5 py-1 bg-white hover:bg-blue-100 border border-blue-300 rounded-lg font-bold text-blue-700 transition shrink-0 cursor-pointer"
                  >
                    Customize Overrides →
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        <th className="py-2.5 px-3.5">Module Name</th>
                        <th className="py-2.5 px-2 text-center">View</th>
                        <th className="py-2.5 px-2 text-center">Create</th>
                        <th className="py-2.5 px-2 text-center">Edit</th>
                        <th className="py-2.5 px-2 text-center">Delete</th>
                        <th className="py-2.5 px-2 text-center">Print</th>
                        <th className="py-2.5 px-2 text-center">Export</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { name: "Billing & Sales POS", prefix: "billing." },
                        { name: "Inventory & Stock", prefix: "inventory." },
                        { name: "Sales Operations (Challans & Returns)", prefix: "sales_ops." },
                        { name: "Purchases & Suppliers", prefix: "purchases." },
                        { name: "Customer Details", prefix: "customers." },
                        { name: "Staff & Attendance", prefix: "staff." },
                        { name: "Reports & Analytics", prefix: "reports." },
                        { name: "Business Settings & Team", prefix: "settings." },
                      ].map((mod) => {
                        const checkAction = (act) => {
                          if (!permissionBreakdown?.permissions) {
                            const preset = ROLE_PREVIEWS[permissionModalUser.role]?.matrix?.find(m => m.module.toLowerCase().includes(mod.name.toLowerCase().split(" ")[0]));
                            return preset ? Boolean(preset[act]) : false;
                          }
                          const found = permissionBreakdown.permissions.find(p => p.key.startsWith(mod.prefix) && (p.action === act || p.key.endsWith(`.${act}`)));
                          return found ? Boolean(found.effective) : false;
                        };

                        return (
                          <tr key={mod.name} className="hover:bg-slate-50/60 transition">
                            <td className="py-3 px-3.5 font-bold text-slate-800">
                              {mod.name}
                            </td>
                            {["view", "create", "edit", "delete", "print", "export"].map((act) => {
                              const allowed = checkAction(act);
                              return (
                                <td key={act} className="py-3 px-2 text-center">
                                  {allowed ? (
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs" title={`${act}: Allowed`}>
                                      ✓
                                    </span>
                                  ) : (
                                    <span className="inline-block text-slate-300 font-mono text-sm" title={`${act}: Denied`}>
                                      —
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Overrides List Content */}
            {formData._permTab === "overrides" && (
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {loadingPerms ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                  <p className="text-xs">Loading effective permissions…</p>
                </div>
              ) : !permissionBreakdown?.permissions ? (
                <p className="text-center text-slate-400 text-xs py-8">No permissions catalog loaded.</p>
              ) : (
                (() => {
                  // Group permissions by module
                  const grouped = {};
                  permissionBreakdown.permissions.forEach((p) => {
                    if (
                      permSearch &&
                      !p.key.toLowerCase().includes(permSearch.toLowerCase()) &&
                      !p.description?.toLowerCase().includes(permSearch.toLowerCase())
                    ) {
                      return;
                    }
                    if (!grouped[p.module]) grouped[p.module] = [];
                    grouped[p.module].push(p);
                  });

                  return Object.keys(grouped).map((mod) => (
                    <div key={mod} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <div
                        className="flex items-center justify-between px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 select-none"
                      >
                        <div
                          onClick={() =>
                            setExpandedModules((prev) => ({ ...prev, [mod]: !prev[mod] }))
                          }
                          className="flex items-center gap-2 cursor-pointer flex-1"
                        >
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                            {mod} Module ({grouped[mod].length})
                          </span>
                          {expandedModules[mod] ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px]">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetModuleOverrides(mod, true);
                            }}
                            className="px-2 py-0.5 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded font-semibold transition"
                          >
                            Grant All
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetModuleOverrides(mod, false);
                            }}
                            className="px-2 py-0.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded font-semibold transition"
                          >
                            Deny All
                          </button>
                        </div>
                      </div>

                      {expandedModules[mod] && (
                        <div className="divide-y divide-slate-100">
                          {grouped[mod].map((perm) => (
                            <div
                              key={perm.key}
                              className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50/50 transition"
                            >
                              <div className="pr-3">
                                <div className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                                  <span>{perm.key}</span>
                                  {perm.hasOverride && (
                                    <span
                                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                        perm.overrideAllowed
                                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                                          : "bg-rose-100 text-rose-800 border border-rose-200"
                                      }`}
                                    >
                                      {perm.overrideAllowed ? "Force Grant" : "Force Deny"}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {perm.description || perm.action}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleToggleOverride(perm.key, perm.overrideAllowed)}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition border flex items-center gap-1.5 ${
                                  perm.effective
                                    ? perm.hasOverride
                                      ? "bg-blue-600 text-white border-blue-700 shadow-xs"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                                    : perm.hasOverride
                                    ? "bg-rose-600 text-white border-rose-700 shadow-xs"
                                    : "bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200"
                                }`}
                              >
                                {perm.effective ? (
                                  <>
                                    <Unlock className="w-3 h-3" />
                                    <span>Allowed</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3 h-3" />
                                    <span>Denied</span>
                                  </>
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ));
                })()
              )}
            </div>
            )}

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <p className="text-[11px] text-slate-400">
                Overrides take immediate precedence over role inheritance.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPermissionModalUser(null)}
                  className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSavePermissions}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Saving…" : "Save Permissions"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: CREATED CREDENTIALS HANDOFF DIALOG ── */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Sub-User Account Created!</h3>
                <p className="text-xs text-slate-500">Provide these credentials securely to your employee.</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Name:</span>
                <span className="font-bold text-slate-800">{createdCredentials.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Username / Email:</span>
                <span className="font-mono font-semibold text-slate-800">{createdCredentials.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Assigned Role:</span>
                <span className="font-bold text-indigo-700">{createdCredentials.role}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500 font-medium">Login Password:</span>
                <span className="font-mono font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-300">
                  {createdCredentials.password}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const text = `BILZET Login Credentials:\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}\nRole: ${createdCredentials.role}`;
                  navigator.clipboard.writeText(text);
                  setCopiedKey(true);
                  setTimeout(() => setCopiedKey(false), 2500);
                }}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedKey ? "Copied to Clipboard!" : "Copy Login Credentials"}</span>
              </button>
              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LOCKED FEATURE MODAL ── */}
      {lockedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden p-6 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600 shadow-xs">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase mb-2">
                {lockedModal.requiredPlan} Feature
              </div>
              <h3 className="text-lg font-bold text-slate-900">{lockedModal.title}</h3>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                {lockedModal.description}
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setLockedModal(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = lockedModal.requiredPlan;
                  setLockedModal(null);
                  navigate(`/plans?tier=${target}`);
                }}
                className={`px-5 py-2 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition cursor-pointer ${
                  lockedModal.requiredPlan === "PREMIUM"
                    ? "bg-indigo-600 hover:bg-indigo-700"
                    : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                }`}
              >
                <Crown className="w-4 h-4" />
                Upgrade to {lockedModal.requiredPlan === "PREMIUM" ? "Premium" : "Pro"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
