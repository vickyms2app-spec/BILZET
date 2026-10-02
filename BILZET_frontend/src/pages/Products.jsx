import { useEffect, useState } from "react";
import { productsApi, categoriesApi } from "../api";
import { Plus, Search, Trash2, Pencil, Package, AlertTriangle, Layers, Tag, CheckCircle2, X } from "lucide-react";
import { apiError } from "../api/http";

export default function Products() {
  const [data, setData] = useState(null);
  const [cats, setCats] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState("");

  const load = () =>
    productsApi
      .list({ page: 1, limit: 50, search })
      .then(setData)
      .catch((e) => setErr(apiError(e)));

  useEffect(() => {
    load();
    categoriesApi
      .list()
      .then((d) => setCats(d.categories || []))
      .catch(() => {});
  }, [search]);

  async function save(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const p = {
      name: f.get("name"),
      sku: f.get("sku"),
      barcode: f.get("barcode") || undefined,
      category: f.get("category"),
      brand: f.get("brand") || undefined,
      unit: f.get("unit") || "piece",
      purchasePrice: +f.get("purchasePrice"),
      sellingPrice: +f.get("sellingPrice"),
      gstRate: +f.get("gstRate") || 0,
      stock: +f.get("stock") || 0,
      minimumStock: +f.get("minimumStock") || 5,
      isActive: true,
    };
    try {
      if (edit) {
        await productsApi.update(edit._id, p);
      } else {
        await productsApi.create(p);
      }
      setOpen(false);
      setEdit(null);
      load();
    } catch (x) {
      setErr(apiError(x));
    }
  }

  async function remove(id) {
    if (confirm("Delete this product?")) {
      try {
        await productsApi.remove(id);
        load();
      } catch (x) {
        setErr(apiError(x));
      }
    }
  }

  const productsList = data?.data?.products || [];
  const totalProducts = productsList.length;
  const lowStockCount = productsList.filter((p) => (p.stock || 0) <= (p.minimumStock || 5)).length;
  const inStockCount = productsList.filter((p) => (p.stock || 0) > (p.minimumStock || 5)).length;

  return (
    <div className="space-y-5 pb-12 fade-up">
      {/* ══════════════════════════════════════════════════
          PAGE HEADER
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl border border-blue-100 grid place-items-center text-blue-600 bg-blue-50/70 shadow-2xs shrink-0">
            <Package size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Product Catalog
              </h1>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Catalog
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Manage items, barcodes, pricing, tax brackets and inventory thresholds
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setEdit(null);
            setOpen(true);
          }}
          className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5 self-start sm:self-center shadow-xs"
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>Add Product</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════
          METRICS CARDS
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            <Package size={18} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Total Products</p>
            <p className="text-lg font-bold text-slate-900">{totalProducts}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">In Stock</p>
            <p className="text-lg font-bold text-emerald-700">{inStockCount}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Low Stock Alert</p>
            <p className="text-lg font-bold text-amber-700">{lowStockCount}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
            <Layers size={18} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Categories</p>
            <p className="text-lg font-bold text-purple-700">{cats.length}</p>
          </div>
        </div>
      </div>

      {err && (
        <div className="rounded-xl bg-rose-50 border border-rose-200/80 p-3.5 text-xs text-rose-700 font-medium">
          {err}
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TABLE CARD & SEARCH
      ══════════════════════════════════════════════════ */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div className="relative max-w-sm w-full">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              size={15}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, SKU, barcode, brand…"
              className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium bg-slate-50/40"
            />
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Showing {productsList.length} items
          </span>
        </div>

        {!data ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
            <div className="w-7 h-7 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <p className="text-xs font-medium">Loading products...</p>
          </div>
        ) : productsList.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Package size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No products found</p>
            <p className="text-xs text-slate-400 mt-0.5">Click &quot;Add Product&quot; to create your first catalog item</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Selling Price</th>
                  <th className="px-4 py-3">Stock Level</th>
                  <th className="px-4 py-3">GST Rate</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productsList.map((p) => {
                  const isLow = (p.stock || 0) <= (p.minimumStock || 5);
                  return (
                    <tr key={p._id} className="hover:bg-slate-50/60 transition group">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        {p.brand && (
                          <div className="text-[11px] text-slate-400 font-normal">{p.brand}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                        {p.sku || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                          {p.category?.name || "General"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        ₹{Number(p.sellingPrice || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            isLow
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {p.stock ?? 0} {p.unit || "pcs"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium">
                        {p.gstRate ?? 0}%
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            p.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {p.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5 opacity-80 group-hover:opacity-100">
                          <button
                            onClick={() => {
                              setEdit(p);
                              setOpen(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition"
                            title="Edit Product"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => remove(p._id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition"
                            title="Delete Product"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          CREATE / EDIT MODAL
      ══════════════════════════════════════════════════ */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                  <Tag size={16} />
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  {edit ? "Edit Product" : "Add New Product"}
                </h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
                <input
                  name="name"
                  required
                  defaultValue={edit?.name}
                  placeholder="e.g. Basmati Rice 1kg"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">SKU Code *</label>
                <input
                  name="sku"
                  required
                  defaultValue={edit?.sku}
                  placeholder="e.g. BR-1001"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Barcode</label>
                <input
                  name="barcode"
                  defaultValue={edit?.barcode}
                  placeholder="e.g. 8901030383822"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                <select
                  name="category"
                  required
                  defaultValue={edit?.category?._id || edit?.category}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-white"
                >
                  <option value="">Select Category</option>
                  {cats.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Brand</label>
                <input
                  name="brand"
                  defaultValue={edit?.brand}
                  placeholder="e.g. India Gate"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Unit</label>
                <select
                  name="unit"
                  defaultValue={edit?.unit || "piece"}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-white"
                >
                  <option value="piece">piece</option>
                  <option value="kg">kg</option>
                  <option value="litre">litre</option>
                  <option value="box">box</option>
                  <option value="pack">pack</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Purchase Price (₹) *</label>
                <input
                  name="purchasePrice"
                  type="number"
                  step="0.01"
                  required
                  defaultValue={edit?.purchasePrice || 0}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Selling Price (₹) *</label>
                <input
                  name="sellingPrice"
                  type="number"
                  step="0.01"
                  required
                  defaultValue={edit?.sellingPrice || 0}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-semibold text-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">GST Rate (%)</label>
                <input
                  name="gstRate"
                  type="number"
                  step="0.01"
                  defaultValue={edit?.gstRate || 0}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Initial Stock</label>
                <input
                  name="stock"
                  type="number"
                  defaultValue={edit?.stock || 0}
                  disabled={!!edit}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Minimum Alert Stock</label>
                <input
                  name="minimumStock"
                  type="number"
                  defaultValue={edit?.minimumStock || 5}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium"
                />
              </div>

              <div className="sm:col-span-2 pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-secondary text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs py-2 px-5 font-semibold"
                >
                  {edit ? "Save Changes" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
