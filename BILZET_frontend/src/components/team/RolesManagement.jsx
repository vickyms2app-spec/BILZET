import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Crown,
  CheckSquare,
  Square,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { rolesApi, subscriptionUsageApi } from "../../api";
import { usePermissions } from "../../hooks/usePermissions";

export default function RolesManagement() {
  const navigate = useNavigate();
  const { isOwner, isSuperAdmin } = usePermissions();

  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState({ permissions: [], grouped: {}, modules: [] });
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal & Locked Feature state
  const [lockedModal, setLockedModal] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState({
    name: "",
    description: "",
    permissionKeys: [],
  });

  const [expandedModules, setExpandedModules] = useState({});
  const [feedback, setFeedback] = useState({ message: "", type: "success" });
  const [submitting, setSubmitting] = useState(false);

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

  const isPremium = effectiveTier === "PREMIUM" || effectiveTier === "ENTERPRISE";

  const loadData = async () => {
    setLoading(true);
    try {
      const [rolesRes, catalogRes, usageRes] = await Promise.all([
        rolesApi.list(),
        rolesApi.permissionsCatalog(),
        subscriptionUsageApi.get().catch(() => null),
      ]);

      setRoles(rolesRes.roles || []);
      if (usageRes) setUsage(usageRes);
      if (catalogRes) {
        setCatalog(catalogRes);
        // Expand all modules by default
        const exp = {};
        (catalogRes.modules || []).forEach((m) => {
          exp[m] = true;
        });
        setExpandedModules(exp);
      }
    } catch (err) {
      console.warn("Failed to load roles:", err);
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

  const handleOpenCreate = () => {
    if (!isPremium) {
      setLockedModal({
        title: "Custom Roles Studio — Premium Feature",
        requiredPlan: "PREMIUM",
        description: "Upgrade to Premium to unlock advanced team management and create tailored roles for your staff.",
      });
      return;
    }
    setEditingRole(null);
    setRoleForm({
      name: "",
      description: "",
      permissionKeys: [],
    });
    setShowModal(true);
  };

  const handleOpenEdit = (role) => {
    if (role.isSystem) {
      showNotification("System roles are standard presets and cannot be modified.", "error");
      return;
    }
    if (!isPremium) {
      setLockedModal({
        title: "Custom Roles Studio — Premium Feature",
        requiredPlan: "PREMIUM",
        description: "Upgrade to Premium to unlock advanced team management and modify custom roles.",
      });
      return;
    }
    setEditingRole(role);
    setRoleForm({
      name: role.name || "",
      description: role.description || "",
      permissionKeys: role.permissions?.map((p) => p.key) || [],
    });
    setShowModal(true);
  };

  const handleTogglePermission = (permKey) => {
    setRoleForm((prev) => {
      const exists = prev.permissionKeys.includes(permKey);
      return {
        ...prev,
        permissionKeys: exists
          ? prev.permissionKeys.filter((k) => k !== permKey)
          : [...prev.permissionKeys, permKey],
      };
    });
  };

  const handleToggleModuleAll = (moduleName) => {
    const modulePerms = catalog.grouped[moduleName] || [];
    const moduleKeys = modulePerms.map((p) => p.key);
    const allSelected = moduleKeys.every((k) => roleForm.permissionKeys.includes(k));

    setRoleForm((prev) => {
      let updated;
      if (allSelected) {
        // Deselect all in module
        updated = prev.permissionKeys.filter((k) => !moduleKeys.includes(k));
      } else {
        // Select all in module
        const set = new Set([...prev.permissionKeys, ...moduleKeys]);
        updated = Array.from(set);
      }
      return { ...prev, permissionKeys: updated };
    });
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleForm.name.trim()) return;

    setSubmitting(true);
    try {
      if (editingRole) {
        await rolesApi.update(editingRole.id || editingRole._id, {
          name: roleForm.name,
          description: roleForm.description,
          permissionKeys: roleForm.permissionKeys,
        });
        showNotification("Custom role updated successfully.");
      } else {
        await rolesApi.create({
          name: roleForm.name,
          description: roleForm.description,
          permissionKeys: roleForm.permissionKeys,
        });
        showNotification("Custom role created successfully.");
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      showNotification(err.response?.data?.message || err.message || "Failed to save role.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (role) => {
    if (role.isSystem) {
      showNotification("System roles cannot be deleted.", "error");
      return;
    }

    if (!isPremium) {
      setLockedModal({
        title: "Custom Roles Studio — Premium Feature",
        requiredPlan: "PREMIUM",
        description: "Upgrade to Premium to manage and delete custom roles.",
      });
      return;
    }

    if (!window.confirm(`Are you sure you want to delete role "${role.name}"?`)) {
      return;
    }

    try {
      await rolesApi.remove(role.id || role._id);
      showNotification("Role deleted successfully.");
      loadData();
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to delete role.", "error");
    }
  };

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

      {/* Premium Lock Banner for Free & Pro tiers */}
      {!isPremium && (
        <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border border-indigo-200/90 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-slate-900">Custom Roles &amp; Permissions Studio</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase tracking-wide">
                  Premium Feature
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-xl">
                Upgrade to Premium to unlock advanced team management, build tailored custom roles, and configure granular action privileges.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/plans?tier=PREMIUM")}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition shrink-0 cursor-pointer"
          >
            <Crown className="w-4 h-4" />
            Upgrade to Premium
          </button>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-base">Roles &amp; Permissions Studio</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            System preset roles are locked for security. You can define custom roles with tailored privileges for specialized staff positions.
          </p>
        </div>

        {isPremium ? (
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Custom Role
          </button>
        ) : (
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition cursor-pointer"
          >
            <Lock className="w-4 h-4 text-indigo-600" />
            <span>Create Custom Role</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800">
              PREMIUM
            </span>
          </button>
        )}
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => (
          <div
            key={role.id || role._id}
            className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-sm transition flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    {role.name}
                    {role.isSystem ? (
                      <span className="p-0.5 text-slate-400" title="System Locked Preset">
                        <Lock className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Custom
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {role.description || "Standard role preset"}
                  </p>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                  {role.permissionsCount || role.permissions?.length || 0} Actions
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>{role.userCount || 0} member(s) assigned</span>

              {!role.isSystem && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(role)}
                    className="p-1 hover:text-indigo-600 rounded transition"
                    title="Edit role"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteRole(role)}
                    className="p-1 hover:text-rose-600 rounded transition"
                    title="Delete role"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── MODAL: CREATE / EDIT CUSTOM ROLE ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-base">
                  {editingRole ? "Edit Custom Role" : "Create Custom Role"}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-5 space-y-4 border-b border-slate-100 bg-slate-50/50">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Role Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Cashier &amp; Inventory Lead"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="Short summary of this role's duties"
                    value={roleForm.description}
                    onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Permission Checkboxes */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Mapped Actions ({roleForm.permissionKeys.length} selected)
                  </h4>
                </div>

                {catalog.modules?.map((mod) => {
                  const perms = catalog.grouped[mod] || [];
                  const allInModSelected = perms.every((p) => roleForm.permissionKeys.includes(p.key));

                  return (
                    <div key={mod} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 select-none border-b border-slate-100">
                        <div
                          onClick={() => handleToggleModuleAll(mod)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          {allInModSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                          <span className="text-xs font-bold text-slate-800 uppercase">
                            {mod}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedModules((prev) => ({ ...prev, [mod]: !prev[mod] }))
                          }
                          className="p-1 text-slate-400 hover:text-slate-600"
                        >
                          {expandedModules[mod] ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {expandedModules[mod] && (
                        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white">
                          {perms.map((p) => {
                            const checked = roleForm.permissionKeys.includes(p.key);
                            return (
                              <label
                                key={p.key}
                                className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition ${
                                  checked
                                    ? "bg-indigo-50/50 border-indigo-200 text-slate-800"
                                    : "border-slate-100 text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => handleTogglePermission(p.key)}
                                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <div>
                                  <div className="font-semibold">{p.key}</div>
                                  <div className="text-[11px] text-slate-400 line-clamp-1">
                                    {p.description || p.action}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {submitting ? "Saving…" : editingRole ? "Update Role" : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── LOCKED FEATURE MODAL ── */}
      {lockedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden p-6 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center mx-auto text-indigo-600 shadow-xs">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase mb-2">
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
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition cursor-pointer"
              >
                <Crown className="w-4 h-4" />
                Upgrade to Premium
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
