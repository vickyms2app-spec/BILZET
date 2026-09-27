import { useEffect, useState } from "react";
import { productsApi, categoriesApi } from "../api";
import {
  Card,
  Button,
  Input,
  Select,
  Modal,
  Loading,
  Empty,
} from "../components/ui";
import { Plus, Search, Trash2, Pencil } from "lucide-react";
import { apiError } from "../api/http";
export default function Products() {
  const [data, setData] = useState(),
    [cats, setCats] = useState([]),
    [search, setSearch] = useState(""),
    [open, setOpen] = useState(false),
    [edit, setEdit] = useState(null),
    [err, setErr] = useState("");
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
    const f = new FormData(e.currentTarget),
      p = {
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
      edit
        ? await productsApi.update(edit._id, p)
        : await productsApi.create(p);
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
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">
            Catalog
          </p>
          <h1 className="text-2xl font-bold">Products</h1>
        </div>
        <Button
          onClick={() => {
            setEdit(null);
            setOpen(true);
          }}
        >
          <Plus size={17} />
          Add product
        </Button>
      </header>
      {err && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      )}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <div className="relative max-w-sm">
            <Search
              className="absolute left-3 top-2.5 text-slate-400"
              size={17}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, SKU, barcode…"
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand"
            />
          </div>
        </div>
        {!data ? (
          <Loading />
        ) : !data.data?.products?.length ? (
          <Empty title="No products" />
        ) : (
          <div className="overflow-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  {[
                    "Product",
                    "SKU",
                    "Category",
                    "Price",
                    "Stock",
                    "GST",
                    "Status",
                    "",
                  ].map((h) => (
                    <th className="px-4 py-3" key={h}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.data.products.map((p) => (
                  <tr className="border-t border-slate-100" key={p._id}>
                    <td className="px-4 py-3 font-semibold">
                      {p.name}
                      <small className="block text-xs text-slate-400">
                        {p.brand || ""}
                      </small>
                    </td>
                    <td className="px-4 py-3">{p.sku}</td>
                    <td className="px-4 py-3">{p.category?.name || "—"}</td>
                    <td className="px-4 py-3">{`₹${p.sellingPrice}`}</td>
                    <td className="px-4 py-3">{p.stock}</td>
                    <td className="px-4 py-3">{p.gstRate}%</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${p.isActive ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}
                      >
                        {p.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setEdit(p);
                          setOpen(true);
                        }}
                        className="mr-2 text-slate-500"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => remove(p._id)}
                        className="text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={edit ? "Edit product" : "New product"}
      >
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Input label="Name" name="name" required defaultValue={edit?.name} />
          <Input label="SKU" name="sku" required defaultValue={edit?.sku} />
          <Input label="Barcode" name="barcode" defaultValue={edit?.barcode} />
          <Select
            label="Category"
            name="category"
            required
            defaultValue={edit?.category?._id || edit?.category}
          >
            {cats.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input label="Brand" name="brand" defaultValue={edit?.brand} />
          <Select label="Unit" name="unit" defaultValue={edit?.unit || "piece"}>
            <option>piece</option>
            <option>kg</option>
            <option>litre</option>
            <option>box</option>
            <option>pack</option>
          </Select>
          <Input
            label="Purchase price"
            name="purchasePrice"
            type="number"
            step="0.01"
            required
            defaultValue={edit?.purchasePrice || 0}
          />
          <Input
            label="Selling price"
            name="sellingPrice"
            type="number"
            step="0.01"
            required
            defaultValue={edit?.sellingPrice || 0}
          />
          <Input
            label="GST %"
            name="gstRate"
            type="number"
            step="0.01"
            defaultValue={edit?.gstRate || 0}
          />
          <Input
            label="Stock"
            name="stock"
            type="number"
            defaultValue={edit?.stock || 0}
            disabled={!!edit}
          />
          <Input
            label="Minimum stock"
            name="minimumStock"
            type="number"
            defaultValue={edit?.minimumStock || 5}
          />
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button>{edit ? "Save changes" : "Create product"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
