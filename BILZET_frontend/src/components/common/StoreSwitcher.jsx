import { useState, useRef, useEffect } from "react";
import {
  Store,
  ChevronDown,
  Check,
  RefreshCw,
  Plus,
  MapPin,
  Building2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { useStore } from "../../store/storeContext";
import { useAuth } from "../../store/auth";

export default function StoreSwitcher({ variant = "header" }) {
  const { user } = useAuth();
  const {
    stores,
    currentStore,
    loading,
    switching,
    toast,
    fetchStores,
    switchStore,
    createStore,
    clearToast,
  } = useStore();

  const [open, setOpen] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreAddress, setNewStoreAddress] = useState("");
  const dropdownRef = useRef(null);

  const isAdmin =
    user?.role === "ADMIN" ||
    user?.role === "SUPER_ADMIN" ||
    user?.isOwner ||
    !user?.role;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initial fetch of stores on mount
  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const handleSelect = async (storeId) => {
    if (storeId === currentStore?.id) {
      setOpen(false);
      return;
    }
    try {
      await switchStore(storeId);
      setOpen(false);
    } catch {
      // Toast handles error display
    }
  };

  const handleCreateStore = async (e) => {
    e.preventDefault();
    if (!newStoreName.trim()) return;
    try {
      await createStore({
        name: newStoreName.trim(),
        address: newStoreAddress.trim() || "Branch Store",
      });
      setCreateModal(false);
      setNewStoreName("");
      setNewStoreAddress("");
    } catch {}
  };

  const hasMultipleStores = stores.length > 1;
  const storeDisplayName = currentStore?.name || "BILZET Store";
  const storeDisplayAddress = currentStore?.address || "Main Branch";

  // ═════════════════════════════════════════════════════════════════════
  // VARIANT: SIDEBAR (Bottom sidebar card)
  // ═════════════════════════════════════════════════════════════════════
  if (variant === "sidebar") {
    if (!isAdmin || !hasMultipleStores) {
      // Single store display (no switcher clutter)
      return (
        <div className="bg-white/[0.06] border border-white/[0.08] rounded-xl p-2.5 flex items-center gap-2 text-left">
          <div className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Store size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-white truncate leading-tight">
              {storeDisplayName}
            </p>
            <p className="text-[9px] text-slate-400 truncate">{storeDisplayAddress}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          disabled={switching}
          className="w-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-xl p-2.5 flex items-center justify-between gap-2 text-left transition duration-150 cursor-pointer"
          title="Switch Store"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              {switching ? (
                <RefreshCw size={14} className="animate-spin text-blue-300" />
              ) : (
                <Store size={14} />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-white truncate leading-tight">
                {storeDisplayName}
              </p>
              <p className="text-[9px] text-slate-400 truncate">{storeDisplayAddress}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-blue-400 font-semibold shrink-0">
            <ChevronDown
              size={12}
              className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          </div>
        </button>

        {open && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#122849] border border-white/[0.12] rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 backdrop-blur-md">
            <div className="px-2 py-1.5 border-b border-white/[0.08] mb-1">
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                Authorized Stores ({stores.length})
              </p>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1">
              {stores.map((s) => {
                const isSelected = s.id === currentStore?.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelect(s.id)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? "bg-blue-600 text-white font-bold"
                        : "text-slate-200 hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{s.name}</p>
                      <p
                        className={`truncate text-[10px] ${
                          isSelected ? "text-blue-100" : "text-slate-400"
                        }`}
                      >
                        {s.address || "Main Branch"}
                      </p>
                    </div>
                    {isSelected && <Check size={14} className="shrink-0 text-white" />}
                  </button>
                );
              })}
            </div>

            {isAdmin && (
              <div className="pt-1 mt-1 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setCreateModal(true);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-blue-300 hover:text-white hover:bg-white/[0.08] flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Add Branch Store</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // VARIANT: HEADER (Top Header Bar)
  // ═════════════════════════════════════════════════════════════════════
  if (!isAdmin || !hasMultipleStores) {
    // Single store Admin or staff: clean badge display
    return (
      <div className="hidden lg:flex items-center gap-2 pl-2 pr-3.5 h-[38px] rounded-full border border-slate-200/90 bg-white text-xs font-semibold text-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <span className="w-[26px] h-[26px] rounded-full bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
          <Store size={13} />
        </span>
        <span className="truncate max-w-[150px]">{storeDisplayName}</span>
      </div>
    );
  }

  // Multiple-store Admin: Interactive dropdown with checkmarks and confirmation
  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          disabled={switching}
          className="flex items-center gap-2 pl-2 pr-3 h-[38px] rounded-full border border-slate-200/90 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition active:scale-98 cursor-pointer"
          title="Switch Store"
        >
          <span className="w-[26px] h-[26px] rounded-full bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
            {switching ? (
              <RefreshCw size={13} className="animate-spin text-blue-600" />
            ) : (
              <Store size={13} />
            )}
          </span>

          <div className="flex flex-col text-left leading-tight">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Current Store
            </span>
            <span className="font-bold text-slate-900 truncate max-w-[140px] text-xs">
              {storeDisplayName}
            </span>
          </div>

          <ChevronDown
            size={13}
            className={`text-slate-400 transition-transform duration-200 ml-0.5 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {open && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-2 z-50 animate-in fade-in zoom-in-95">
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Authorized Stores
                </p>
                <p className="text-[11px] text-slate-500">
                  Select a store to switch application context
                </p>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto py-1 space-y-1">
              {stores.map((s) => {
                const isSelected = s.id === currentStore?.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelect(s.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition flex items-center justify-between gap-2.5 cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 border border-blue-200/70 text-blue-900 font-bold"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Building2 size={13} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold leading-tight">{s.name}</p>
                        <p className="truncate text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin size={9} />
                          <span>{s.address || "Main Branch"}</span>
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {isAdmin && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setCreateModal(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50 transition flex items-center gap-2 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Branch Store</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Switching / Success Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl border animate-in slide-in-from-bottom-5 duration-200 ${
            toast.type === "error"
              ? "bg-red-50 text-red-700 border-red-200"
              : toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-slate-900 text-white border-slate-800"
          }`}
        >
          {toast.type === "error" ? (
            <AlertCircle size={15} className="text-red-600 shrink-0" />
          ) : toast.type === "success" ? (
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
          ) : (
            <RefreshCw size={14} className="animate-spin text-blue-400 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={clearToast}
            className="ml-2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Add Store Branch Modal */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Store size={18} className="text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Add Store Branch</h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateStore} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Store / Branch Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. XYZ Furniture, South Branch"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Branch Address / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. 88 Gandhi Rd, South Branch"
                  value={newStoreAddress}
                  onChange={(e) => setNewStoreAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModal(false)}
                  className="flex-1 py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={switching || !newStoreName.trim()}
                  className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {switching ? "Creating…" : "Create Store"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
