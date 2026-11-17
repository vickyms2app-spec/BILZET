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
    <div className="space-y-6 max-w-7xl mx-auto fade-up text-[#111318]">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#F6F6F8] p-5 rounded-[24px] border border-[#E7E8EC] shadow-fintech">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#12151C] text-[#5BF07B] flex items-center justify-center shrink-0 shadow-xs">
            <Warehouse size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-[#111318] tracking-tight">
                Godown &amp; Warehouse Management
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#DFFFE6] text-[#0E2A16] border border-[#5BF07B]/40 uppercase tracking-wider flex items-center gap-1">
                <Building2 size={11} />
                <span>{activeStoreName}</span>
              </span>
            </div>
            <p className="text-xs text-[#7C7F8A] mt-0.5">
              Manage your business storage locations, capacity and godown stock.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setErrorMsg("");
            setShowAddModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#12151C] hover:bg-black text-white transition cursor-pointer shadow-fintech self-start sm:self-auto"
        >
          <Plus size={14} className="text-[#5BF07B]" />
          <span>Add Godown</span>
        </button>
      </div>

      {/* ── Notifications ── */}
      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-[#DFFFE6] border border-[#5BF07B]/40 text-[#0E2A16] text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} className="text-[#0E2A16] shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-[#FBD3D3] border border-[#E5484D]/30 text-[#E5484D] text-xs font-semibold flex items-center gap-2">
          <AlertTriangle size={16} className="text-[#E5484D] shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Filter / Search Bar ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F6F6F8] p-4 rounded-[24px] border border-[#E7E8EC] shadow-fintech">
        <div className="w-full sm:w-80">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search godown or code..."
          />
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <span className="text-xs text-[#7C7F8A] font-medium">
            Total Godowns: <strong className="text-[#111318] font-bold">{filteredWarehouses.length}</strong>
          </span>
          <button
            type="button"
            disabled={loading}
            onClick={fetchData}
            title="Refresh godown list"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E7E8EC] bg-white text-[#111318] hover:bg-[#EDEDEF] text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-[#111318]" : "text-[#7C7F8A]"} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Content View ── */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-[#7C7F8A]">
          <RefreshCw size={24} className="animate-spin text-[#12151C]" />
          <p className="text-xs font-medium">Loading godown network &amp; stock…</p>
        </div>
      ) : filteredWarehouses.length === 0 ? (
        <div className="p-12 text-center bg-[#F6F6F8] rounded-[24px] border border-dashed border-[#E7E8EC]">
          <div className="w-12 h-12 rounded-2xl bg-[#12151C] text-[#5BF07B] flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Building2 size={22} />
          </div>
          <h3 className="text-sm font-bold text-[#111318]">No godowns created yet</h3>
          <p className="text-xs text-[#7C7F8A] mt-1 max-w-sm mx-auto">
            Organize inventory across central warehouses, regional storage hubs, and retail storerooms.
          </p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#12151C] text-white hover:bg-black transition cursor-pointer shadow-fintech"
          >
            <Plus size={14} className="text-[#5BF07B]" />
            <span>Add Godown</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredWarehouses.map((wh) => (
            <div
              key={wh.id}
              className="bg-white rounded-[24px] border border-[#E7E8EC] p-5 shadow-fintech hover:border-[#12151C] transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-bold text-[#111318] text-sm">{wh.name}</h3>
                    <p className="text-[11px] font-mono text-[#7C7F8A] font-semibold mt-0.5">
                      {wh.code || "WH-MAIN"}
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DFFFE6] text-[#0E2A16] border border-[#5BF07B]/40">
                    Active Hub
                  </span>
                </div>

                <div className="space-y-2 py-3 border-y border-[#E7E8EC] text-xs text-[#7C7F8A]">
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-[#7C7F8A] shrink-0" />
                    <span className="truncate text-[#111318]">{wh.address || "Main Commercial Area"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User size={13} className="text-[#7C7F8A] shrink-0" />
                    <span>In-charge: <strong className="text-[#111318]">{wh.manager || "Store Manager"}</strong></span>
                  </div>
                  {wh.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-[#7C7F8A] shrink-0" />
                      <span className="font-mono text-[#111318]">{wh.phone}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-[#7C7F8A]">
                    <Boxes size={14} className="text-[#12151C]" />
                    <span>Managed Items:</span>
                  </div>
                  <span className="font-bold font-mono text-[#111318]">
                    {wh.stocks?.length || 0} Products
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E7E8EC] flex items-center justify-between text-[11px] text-[#7C7F8A]">
                <span>Capacity: {wh.capacity ? `${wh.capacity} Units` : "Flexible"}</span>
                <span className="font-mono text-[#7C7F8A]">ID: {wh.id.substring(0, 8)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Godown Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md my-auto bg-[#F6F6F8] rounded-[24px] p-6 shadow-fintech border border-[#E7E8EC] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E7E8EC]">
              <div>
                <h3 className="font-bold text-[#111318] text-sm sm:text-base">Add New Godown</h3>
                <p className="text-xs text-[#7C7F8A] mt-0.5">Register storage location or warehouse</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#7C7F8A] hover:text-[#111318] p-1.5 rounded-xl hover:bg-[#EDEDEF] transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateWarehouse} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold text-[#111318] mb-1">Godown Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Central Distribution Hub"
                  value={newWarehouse.name}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E7E8EC] bg-white rounded-xl outline-none focus:border-[#5BF07B] focus:ring-2 focus:ring-[#5BF07B]/15 text-[#111318]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#111318] mb-1">Code / Identifier</label>
                  <input
                    type="text"
                    placeholder="e.g. WH-NORTH-01"
                    value={newWarehouse.code}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, code: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E7E8EC] bg-white rounded-xl outline-none focus:border-[#5BF07B] focus:ring-2 focus:ring-[#5BF07B]/15 text-[#111318] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#111318] mb-1">Capacity (Units)</label>
                  <input
                    type="number"
                    placeholder="e.g. 50000"
                    value={newWarehouse.capacity}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, capacity: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E7E8EC] bg-white rounded-xl outline-none focus:border-[#5BF07B] focus:ring-2 focus:ring-[#5BF07B]/15 text-[#111318]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#111318] mb-1">Physical Address</label>
                <input
                  type="text"
                  placeholder="Plot #, Industrial Estate, City"
                  value={newWarehouse.address}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, address: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E7E8EC] bg-white rounded-xl outline-none focus:border-[#5BF07B] focus:ring-2 focus:ring-[#5BF07B]/15 text-[#111318]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#111318] mb-1">In-Charge Manager</label>
                  <input
                    type="text"
                    placeholder="Manager Name"
                    value={newWarehouse.manager}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, manager: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E7E8EC] bg-white rounded-xl outline-none focus:border-[#5BF07B] focus:ring-2 focus:ring-[#5BF07B]/15 text-[#111318]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#111318] mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={newWarehouse.phone}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E7E8EC] bg-white rounded-xl outline-none focus:border-[#5BF07B] focus:ring-2 focus:ring-[#5BF07B]/15 text-[#111318]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-[#E7E8EC]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-[#E7E8EC] bg-white text-[#111318] hover:bg-[#EDEDEF] text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#12151C] hover:bg-black text-white text-xs font-semibold shadow-fintech transition cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 size={13} className="text-[#5BF07B]" />
                  <span>{submitting ? "Saving..." : "Save Godown"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
