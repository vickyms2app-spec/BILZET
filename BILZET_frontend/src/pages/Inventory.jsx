import { useState, useEffect } from "react";
import {
  Boxes,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  TrendingDown,
  PackageCheck,
  IndianRupee,
  RefreshCw,
  ArrowUpDown,
} from "lucide-react";
import { inventoryApi } from "../api";
import { mockInventory } from "../api/mockData";

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("All");
  const [openModal, setOpenModal] = useState(false);
  const [modalItem, setModalItem] = useState(null);
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustType, setAdjustType] = useState("ADD");

  useEffect(() => {
    inventoryApi.list().then((res) => {
      const list = res?.data?.inventory || res?.inventory || [];
      setInventory(list);
    }).catch(() => setInventory([]));
  }, []);

  const totalItems = inventory.reduce((acc, i) => acc + (i.stock || 0), 0);
  const lowStockCount = inventory.filter((i) => (i.stock || 0) <= (i.minimumStock || 5)).length;
  const totalValuation = inventory.reduce(
    (acc, i) => acc + (i.stock || 0) * (i.value ? i.value / (i.stock || 1) : 150),
    0
  );

  const getCategoryName = (cat) => {
    if (!cat) return "General";
    if (typeof cat === "string") return cat;
    if (typeof cat === "object" && cat.name) return cat.name;
    return "General";
  };

  const categories = ["All", ...new Set(inventory.map((i) => getCategoryName(i.category)))];

  const filtered = inventory.filter((item) => {
    const matchSearch =
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.sku?.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCat === "All" || getCategoryName(item.category) === selectedCat;
    return matchSearch && matchCat;
  });

  const handleSaveAdjust = (e) => {
    e.preventDefault();
    if (!modalItem) return;

    setInventory(
      inventory.map((item) => {
        if (item._id === modalItem._id) {
          const delta = adjustType === "ADD" ? Number(adjustQty) : -Number(adjustQty);
          return { ...item, stock: Math.max(0, (item.stock || 0) + delta) };
        }
        return item;
      })
    );
    setOpenModal(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ══════════════════════════════════════════════════
          TOP HEADER
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white grid place-items-center shadow-md shadow-cyan-500/20">
            <Boxes size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Stock & Inventory Control
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Real-time multi-location warehouse, batch and minimum stock monitoring
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setModalItem(inventory[0]);
            setOpenModal(true);
          }}
          className="flex items-center gap-2 bg-[#4361ee] hover:bg-[#3751d8] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-blue-500/25 transition active:scale-95"
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>Adjust Stock</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════
          ILLUSTRATIVE KPI SUMMARY CARDS
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Card 1 */}
        <div className="relative overflow-hidden bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Products
              </p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">
                {inventory.length}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {totalItems} total units on shelves
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 grid place-items-center">
              <PackageCheck size={24} />
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="relative overflow-hidden bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Low Stock Alerts
              </p>
              <h3 className="text-3xl font-black text-rose-600 mt-1">
                {lowStockCount}
              </h3>
              <p className="text-xs text-rose-500 font-medium mt-1">
                {lowStockCount > 0 ? "Requires restock replenishment" : "All items healthy"}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 grid place-items-center">
              <AlertTriangle size={24} />
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="relative overflow-hidden bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Estimated Inventory Value
              </p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">
                ₹{totalValuation.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </h3>
              <p className="text-xs text-emerald-600 font-medium mt-1">
                Based on active wholesale cost
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 grid place-items-center">
              <IndianRupee size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          SEARCH & FILTER TABS
      ══════════════════════════════════════════════════ */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs flex-1 max-w-md">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            placeholder="Search by product title or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none w-full text-slate-700 placeholder-slate-400"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                selectedCat === cat
                  ? "bg-[#4361ee] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          CREATIVE INVENTORY TABLE
      ══════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-5">Product Name & Category</th>
                <th className="py-3.5 px-4">SKU</th>
                <th className="py-3.5 px-4">Stock Level</th>
                <th className="py-3.5 px-4">Threshold</th>
                <th className="py-3.5 px-4">Estimated Value</th>
                <th className="py-3.5 px-4 text-center">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => {
                const isLow = (item.stock || 0) <= (item.minimumStock || 5);
                const percentage = Math.min(100, Math.round(((item.stock || 0) / 50) * 100));

                return (
                  <tr key={item.id || item._id || item.sku} className="hover:bg-slate-50/60 transition group">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl grid place-items-center font-bold text-xs shrink-0 ${
                            isLow
                              ? "bg-rose-50 text-rose-600 border border-rose-200"
                              : "bg-blue-50 text-blue-600 border border-blue-200"
                          }`}
                        >
                          {item.name?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm leading-tight">
                            {item.name}
                          </p>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {getCategoryName(item.category)}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono text-slate-500">
                      {item.sku}
                    </td>

                    <td className="py-4 px-4">
                      <div className="space-y-1.5 w-36">
                        <div className="flex items-center justify-between text-xs">
                          <span
                            className={`font-black ${
                              isLow ? "text-rose-600" : "text-slate-900"
                            }`}
                          >
                            {item.stock} {item.unit || "pcs"}
                          </span>
                          {isLow && (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                              LOW
                            </span>
                          )}
                        </div>
                        {/* Visual progress bar */}
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isLow ? "bg-rose-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-slate-500 font-medium">
                      Min {item.minimumStock || 5} {item.unit || "pcs"}
                    </td>

                    <td className="py-4 px-4 font-bold text-slate-900">
                      ₹{((item.stock || 0) * (item.value ? item.value / (item.stock || 1) : 150)).toLocaleString("en-IN")}
                    </td>

                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => {
                          setModalItem(item);
                          setOpenModal(true);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-[#4361ee] hover:text-white hover:border-[#4361ee] text-slate-600 font-bold text-xs transition"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          ADJUST STOCK MODAL
      ══════════════════════════════════════════════════ */}
      {openModal && modalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-black text-slate-900 mb-1">
              Adjust Stock: {modalItem.name}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Current recorded stock: <strong className="text-slate-800">{modalItem.stock} {modalItem.unit}</strong>
            </p>

            <form onSubmit={handleSaveAdjust} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Action Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType("ADD")}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      adjustType === "ADD"
                        ? "bg-emerald-500 text-white border-emerald-500"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    + Add New Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType("REMOVE")}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      adjustType === "REMOVE"
                        ? "bg-rose-500 text-white border-rose-500"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    - Deduct / Damage
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Quantity ({modalItem.unit || "pcs"})
                </label>
                <input
                  type="number"
                  min="1"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setOpenModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#4361ee] hover:bg-[#3751d8] text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
