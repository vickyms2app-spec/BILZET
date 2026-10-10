import { useState, useEffect } from "react";
import {
  Warehouse,
  Plus,
  Building2,
  MapPin,
  Phone,
  User,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
} from "lucide-react";
import { warehousesApi } from "../api";
import { apiError } from "../api/http";
import SearchBar from "../components/common/SearchBar";
import Button from "../components/common/Button";

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Active Store Display
  const [activeStoreName, setActiveStoreName] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("bilzet_active_store") || "null");
      return stored?.name || stored?.shopName || "Default Store";
    } catch (_) {
      return "Default Store";
    }
  });

  // Add Godown Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWarehouse, setNewWarehouse] = useState({
    name: "",
    code: "",
    address: "",
    capacity: "",
    manager: "",
    phone: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const whRes = await warehousesApi.list();
      setWarehouses(whRes?.warehouses || []);
    } catch (err) {
      console.error("Failed to load warehouses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleStoreChange = () => {
      fetchData();
      try {
        const stored = JSON.parse(localStorage.getItem("bilzet_active_store") || "null");
        if (stored?.name || stored?.shopName) {
          setActiveStoreName(stored.name || stored.shopName);
        }
      } catch (_) {}
    };

    window.addEventListener("bilzet:store-changed", handleStoreChange);
    return () => {
      window.removeEventListener("bilzet:store-changed", handleStoreChange);
    };
  }, []);

  const handleCreateWarehouse = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);
    try {
      await warehousesApi.create(newWarehouse);
      setSuccessMsg("Godown / Warehouse created successfully!");
      setShowAddModal(false);
      setNewWarehouse({ name: "", code: "", address: "", capacity: "", manager: "", phone: "" });
      fetchData();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setErrorMsg(apiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredWarehouses = warehouses.filter((w) => {
    const q = (search || "").toLowerCase();
    return (
      w.name?.toLowerCase().includes(q) ||
      (w.code && w.code.toLowerCase().includes(q)) ||
      (w.manager && w.manager.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto fade-up">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 shadow-2xs">
            <Warehouse size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="page-title">
                Godown &amp; Warehouse Management
              </h1>
              <span className="badge badge-info uppercase tracking-wider flex items-center gap-1">
                <Building2 size={11} />
                <span>{activeStoreName}</span>
              </span>
            </div>
            <p className="page-desc">
              Manage your business storage locations, capacity and godown stock.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={() => {
            setErrorMsg("");
            setShowAddModal(true);
          }}
        >
          Add Godown
        </Button>
      </div>

      {/* ── Notifications ── */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertTriangle size={16} className="text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Filter / Search Bar ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="w-full sm:w-80">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search godown or code..."
          />
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <span className="text-xs text-slate-500 font-medium">
            Total Godowns: <strong className="text-slate-800 font-bold">{filteredWarehouses.length}</strong>
          </span>
          <Button
            variant="neutral"
            size="sm"
            icon={RefreshCw}
            loading={loading}
            onClick={fetchData}
            title="Refresh godown list"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Content View ── */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <RefreshCw size={24} className="animate-spin text-blue-600" />
          <p className="text-xs text-slate-500">Loading godown network &amp; stock…</p>
        </div>
      ) : filteredWarehouses.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <Building2 size={22} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No godowns created yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Organize inventory across central warehouses, regional storage hubs, and retail storerooms.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            <Plus size={14} />
            <span> Add Godown</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredWarehouses.map((wh) => (
            <div
              key={wh.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{wh.name}</h3>
                    <p className="text-[11px] font-mono text-blue-600 font-semibold mt-0.5">
                      {wh.code || "WH-MAIN"}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    Active Hub
                  </span>
                </div>

                <div className="space-y-2 py-3 border-y border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate">{wh.address || "Main Commercial Area"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User size={13} className="text-slate-400 shrink-0" />
                    <span>In-charge: {wh.manager || "Store Manager"}</span>
                  </div>
                  {wh.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-slate-400 shrink-0" />
                      <span>{wh.phone}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Boxes size={14} className="text-blue-600" />
                    <span>Managed Items:</span>
                  </div>
                  <span className="font-bold font-mono text-slate-900">
                    {wh.stocks?.length || 0} Products
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Capacity: {wh.capacity ? `${wh.capacity} Units` : "Flexible"}</span>
                <span className="font-mono text-slate-500">ID: {wh.id.substring(0, 8)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Godown Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md my-auto bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Add New Godown / Warehouse</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateWarehouse} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="form-label">Godown Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Central Distribution Hub"
                  value={newWarehouse.name}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Code / Identifier</label>
                  <input
                    type="text"
                    placeholder="e.g. WH-NORTH-01"
                    value={newWarehouse.code}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, code: e.target.value })}
                    className="form-input font-mono"
                  />
                </div>
                <div>
                  <label className="form-label">Capacity (Units)</label>
                  <input
                    type="number"
                    placeholder="e.g. 50000"
                    value={newWarehouse.capacity}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, capacity: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Physical Address</label>
                <input
                  type="text"
                  placeholder="Plot #, Industrial Estate, City"
                  value={newWarehouse.address}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, address: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">In-Charge Manager</label>
                  <input
                    type="text"
                    placeholder="Manager Name"
                    value={newWarehouse.manager}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, manager: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={newWarehouse.phone}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, phone: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <Button
                  variant="neutral"
                  size="sm"
                  icon={X}
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  icon={CheckCircle2}
                  loading={submitting}
                >
                  Save Godown
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
