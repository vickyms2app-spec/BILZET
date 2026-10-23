import { useEffect, useState, useMemo, useRef } from "react";
import { productsApi, categoriesApi } from "../api";
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  Package,
  AlertTriangle,
  Layers,
  Tag,
  CheckCircle2,
  X,
  Save,
  Filter,
  FolderPlus,
  RefreshCw,
  AlertCircle,
  Folder,
  ArrowUpDown,
  Building2,
} from "lucide-react";
import { apiError } from "../api/http";
import Modal from "../components/common/Modal";
import SearchBar from "../components/common/SearchBar";
import Button, { CompactIconButton } from "../components/common/Button";
import { useRealtimeSync } from "../hooks/useRealtimeSync";
import { handleSmartFormKeyDown } from "../utils/keyboardNavigation";
import {
  GST_RATES,
  isDecimalUnit,
  formatCurrencyINR,
  calculateProductPriceBreakdown,
} from "../utils/taxCalculation";

export default function Products() {
  // Navigation tabs: 'products' | 'categories'
  const [activeTab, setActiveTab] = useState("products");

  // Product Catalog State
  const [data, setData] = useState(null);
  const [cats, setCats] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [openProductModal, setOpenProductModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [productErr, setProductErr] = useState("");
  const [productSuccess, setProductSuccess] = useState("");
  const [productPriceMode, setProductPriceMode] = useState("INCLUSIVE");
  const [modalSellingPrice, setModalSellingPrice] = useState(0);
  const [modalGstRate, setModalGstRate] = useState(18);
  const [modalUnit, setModalUnit] = useState("piece");
  const [modalStock, setModalStock] = useState(0);
  const [modalCategoryId, setModalCategoryId] = useState("");
  const [hasManualGstOverride, setHasManualGstOverride] = useState(false);

  // Live preview breakdown using shared tax calculation service
  const previewBreakdown = useMemo(() => {
    return calculateProductPriceBreakdown({
      sellingPrice: modalSellingPrice,
      gstRate: modalGstRate,
      pricingMethod: productPriceMode,
    });
  }, [modalSellingPrice, modalGstRate, productPriceMode]);

  // Sync modal state when opening for edit or new product
  useEffect(() => {
    if (openProductModal) {
      if (editProduct) {
        setProductPriceMode(
          editProduct.isTaxInclusive || editProduct.pricingMethod === "INCLUSIVE"
            ? "INCLUSIVE"
            : "EXCLUSIVE"
        );
        setModalSellingPrice(Number(editProduct.sellingPrice || 0));
        setModalGstRate(Number(editProduct.gstRate !== undefined ? editProduct.gstRate : 18));
        setModalUnit(editProduct.unit || "piece");
        setModalStock(Number(editProduct.stock || editProduct.currentStock || 0));
        setModalCategoryId(
          editProduct.categoryId ||
          editProduct.category?._id ||
          editProduct.category?.id ||
          editProduct.category ||
          ""
        );
        setHasManualGstOverride(true); // Preserve product-specific saved tax rate on edit
      } else {
        setProductPriceMode("INCLUSIVE");
        setModalSellingPrice(0);
        setModalUnit("piece");
        setModalStock(0);
        setModalCategoryId("");
        setModalGstRate(18);
        setHasManualGstOverride(false);
      }
    }
  }, [openProductModal, editProduct]);

  // Category Index State
  const [categorySearch, setCategorySearch] = useState("");
  const [categorySortBy, setCategorySortBy] = useState("name"); // 'name' | 'products' | 'newest'
  const [openCategoryModal, setOpenCategoryModal] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [categoryModalGstRate, setCategoryModalGstRate] = useState(18);
  const [categoryErr, setCategoryErr] = useState("");
  const [categorySuccess, setCategorySuccess] = useState("");
  const [categoryLoading, setCategoryLoading] = useState(false);
  const productFormRef = useRef(null);
  const categoryFormRef = useRef(null);

  // Sync category modal state when opening for edit or new category
  useEffect(() => {
    if (openCategoryModal) {
      if (editCategory) {
        setCategoryModalGstRate(
          Number(
            editCategory.defaultGstRate !== undefined && editCategory.defaultGstRate !== null
              ? editCategory.defaultGstRate
              : 18
          )
        );
      } else {
        setCategoryModalGstRate(18);
      }
    }
  }, [openCategoryModal, editCategory]);

  // Active Store Display
  const [activeStoreName, setActiveStoreName] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("bilzet_active_store") || "null");
      return stored?.name || stored?.shopName || "Default Store";
    } catch (_) {
      return "Default Store";
    }
  });

  // Load Products with filters
  const loadProducts = () => {
    const params = { page: 1, limit: 100, search };
    if (selectedCategory) {
      params.categoryId = selectedCategory;
    }
    return productsApi
      .list(params)
      .then((res) => {
        setData(res);
        setProductErr("");
      })
      .catch((e) => setProductErr(apiError(e)));
  };

  // Load Categories with associated product counts
  const loadCategories = () => {
    setCategoryLoading(true);
    return categoriesApi
      .list({ limit: 100 })
      .then((d) => {
        setCats(d.categories || []);
        setCategoryLoading(false);
      })
      .catch((e) => {
        setCategoryLoading(false);
      });
  };

  // Synchronized lifecycle & events
  useEffect(() => {
    loadProducts();
    loadCategories();

    const handleSync = () => {
      loadProducts();
      loadCategories();
      try {
        const stored = JSON.parse(localStorage.getItem("bilzet_active_store") || "null");
        if (stored?.name || stored?.shopName) {
          setActiveStoreName(stored.name || stored.shopName);
        }
      } catch (_) {}
    };

    window.addEventListener("bilzet:inventory-changed", handleSync);
    window.addEventListener("bilzet:products-changed", handleSync);
    window.addEventListener("bilzet:store-changed", handleSync);
    return () => {
      window.removeEventListener("bilzet:inventory-changed", handleSync);
      window.removeEventListener("bilzet:products-changed", handleSync);
      window.removeEventListener("bilzet:store-changed", handleSync);
    };
  }, [search, selectedCategory]);

  // Real-time synchronization
  useRealtimeSync(
    ["PRODUCT_CREATED", "PRODUCT_UPDATED", "STOCK_ADJUSTED", "PURCHASE_CREATED"],
    () => {
      loadProducts();
      loadCategories();
    }
  );

  // Product Save (Create / Edit)
  async function saveProduct(e) {
    e.preventDefault();
    setProductErr("");
    setProductSuccess("");
    const f = new FormData(e.currentTarget);
    const catVal = f.get("category") || f.get("categoryId") || undefined;
    const unitVal = f.get("unit") || modalUnit || "piece";

    const stockRaw = f.get("stock");
    const stockVal = stockRaw !== null && stockRaw !== undefined && stockRaw !== ""
      ? Number(stockRaw)
      : Number(modalStock || 0);

    // Quantity validation (Requirement 1)
    if (stockVal < 0) {
      setProductErr("Quantity (Opening Stock) cannot be negative.");
      return;
    }
    if (!isDecimalUnit(unitVal) && !Number.isInteger(stockVal)) {
      setProductErr(`Unit "${unitVal}" requires a whole number quantity (e.g. 10).`);
      return;
    }

    const sellingPriceVal = Number(f.get("sellingPrice") ?? modalSellingPrice ?? 0);
    if (sellingPriceVal < 0) {
      setProductErr("Selling price cannot be negative.");
      return;
    }

    const purchasePriceVal = Number(f.get("purchasePrice") || 0);
    if (purchasePriceVal < 0) {
      setProductErr("Purchase price cannot be negative.");
      return;
    }

    const gstRateVal = Number(f.get("gstRate") ?? modalGstRate ?? 0);
    if (gstRateVal < 0 || gstRateVal > 100) {
      setProductErr("GST rate must be between 0% and 100%.");
      return;
    }

    const p = {
      name: f.get("name")?.trim(),
      sku: f.get("sku")?.trim().toUpperCase(),
      barcode: f.get("barcode")?.trim() || undefined,
      category: catVal,
      categoryId: catVal,
      brand: f.get("brand")?.trim() || undefined,
      unit: unitVal,
      purchasePrice: purchasePriceVal,
      sellingPrice: sellingPriceVal,
      gstRate: gstRateVal,
      isTaxInclusive: productPriceMode === "INCLUSIVE",
      pricingMethod: productPriceMode,
      stock: stockVal,
      minimumStock: Number(f.get("minimumStock") || 5),
      isActive: true,
    };
    try {
      const editId = editProduct?.id || editProduct?._id;
      if (editId) {
        await productsApi.update(editId, p);
        setProductSuccess(`Product "${p.name}" updated successfully.`);
      } else {
        await productsApi.create(p);
        setProductSuccess(`Product "${p.name}" created and synced to Stock Overview.`);
      }

      // Notify entire app of inventory & product catalog synchronization
      window.dispatchEvent(new CustomEvent("bilzet:inventory-changed"));
      window.dispatchEvent(new CustomEvent("bilzet:products-changed"));
      setOpenProductModal(false);
      setEditProduct(null);
      await Promise.all([loadProducts(), loadCategories()]);
      setTimeout(() => setProductSuccess(""), 4000);
    } catch (x) {
      setProductErr(apiError(x));
    }
  }

  // Product Delete / Deactivate
  async function removeProduct(id, name) {
    if (confirm(`Are you sure you want to delete product "${name || 'selected item'}"?`)) {
      try {
        setProductErr("");
        await productsApi.remove(id);
        setProductSuccess(`Product removed successfully.`);
        window.dispatchEvent(new CustomEvent("bilzet:inventory-changed"));
        window.dispatchEvent(new CustomEvent("bilzet:products-changed"));
        await Promise.all([loadProducts(), loadCategories()]);
        setTimeout(() => setProductSuccess(""), 4000);
      } catch (x) {
        setProductErr(apiError(x));
      }
    }
  }

  // Category Save (Create / Edit)
  async function saveCategory(e) {
    e.preventDefault();
    setCategoryErr("");
    setCategorySuccess("");
    const f = new FormData(e.currentTarget);
    const catName = f.get("name")?.trim();
    const catDesc = f.get("description")?.trim();
    const isActive = f.get("isActive") === "on";
    const rawGstRate = f.get("defaultGstRate") ?? categoryModalGstRate;
    const defaultGstRate = Number(rawGstRate);

    if (!catName) {
      setCategoryErr("Category name is required.");
      return;
    }

    if (!GST_RATES.includes(defaultGstRate)) {
      setCategoryErr(`Default GST rate must be one of: ${GST_RATES.join("%, ")}%.`);
      return;
    }

    try {
      const catId = editCategory?.id || editCategory?._id;
      if (catId) {
        await categoriesApi.update(catId, {
          name: catName,
          description: catDesc,
          defaultGstRate,
          isActive,
        });
        setCategorySuccess(`Category renamed to "${catName}" with ${defaultGstRate}% default GST.`);
      } else {
        await categoriesApi.create({
          name: catName,
          description: catDesc,
          defaultGstRate,
          isActive,
        });
        setCategorySuccess(`Category "${catName}" created with ${defaultGstRate}% default GST.`);
      }

      // Notify app that categories have updated (propagating names to products)
      window.dispatchEvent(new CustomEvent("bilzet:products-changed"));
      setOpenCategoryModal(false);
      setEditCategory(null);
      await Promise.all([loadCategories(), loadProducts()]);
      setTimeout(() => setCategorySuccess(""), 4000);
    } catch (x) {
      setCategoryErr(apiError(x));
    }
  }

  // Category Safe Deletion
  async function removeCategory(id, name, productCount) {
    setCategoryErr("");
    setCategorySuccess("");

    if (productCount > 0) {
      setCategoryErr("This category contains products and cannot be deleted. Reassign the products first.");
      return;
    }

    if (confirm(`Are you sure you want to delete category "${name}"?`)) {
      try {
        await categoriesApi.remove(id);
        setCategorySuccess(`Category "${name}" deleted successfully.`);
        if (selectedCategory === id) {
          setSelectedCategory("");
        }
        window.dispatchEvent(new CustomEvent("bilzet:products-changed"));
        await Promise.all([loadCategories(), loadProducts()]);
        setTimeout(() => setCategorySuccess(""), 4000);
      } catch (x) {
        setCategoryErr(apiError(x));
      }
    }
  }

  // Raw list & Filtered Products
  const rawProducts = data?.data?.products || [];
  const productsList = useMemo(() => {
    let list = rawProducts;
    if (selectedCategory) {
      list = list.filter((p) => {
        const catId = p.categoryId || p.category?.id || p.category?._id;
        return catId === selectedCategory;
      });
    }
    return list;
  }, [rawProducts, selectedCategory]);

  const totalProducts = rawProducts.length;
  const inStockCount = rawProducts.filter(
    (p) => (p.stock || 0) > (p.minimumStock || 5) && p.isActive !== false
  ).length;
  const lowStockCount = rawProducts.filter(
    (p) => (p.stock || 0) > 0 && (p.stock || 0) <= (p.minimumStock || 5) && p.isActive !== false
  ).length;
  const outOfStockCount = rawProducts.filter(
    (p) => (p.stock || 0) <= 0 && p.isActive !== false
  ).length;

  // Filtered & Sorted Categories
  const filteredCategories = useMemo(() => {
    let list = [...cats];
    if (categorySearch.trim()) {
      const q = categorySearch.toLowerCase();
      list = list.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q)
      );
    }

    if (categorySortBy === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (categorySortBy === "products") {
      list.sort((a, b) => (b.productCount || 0) - (a.productCount || 0));
    } else if (categorySortBy === "newest") {
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
    return list;
  }, [cats, categorySearch, categorySortBy]);

  return (
    <div className="space-y-5 pb-12 fade-up">
      {/* ══════════════════════════════════════════════════
          PAGE HEADER WITH TAB SWITCHER
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl border border-blue-100 grid place-items-center text-blue-600 bg-blue-50/70 shadow-2xs shrink-0">
            {activeTab === "products" ? <Package size={22} /> : <Layers size={22} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="page-title">
                {activeTab === "products" ? "Product Catalog" : "Category Index"}
              </h1>
              <span className="badge badge-info uppercase tracking-wider flex items-center gap-1">
                <Building2 size={11} />
                <span>{activeStoreName}</span>
              </span>
            </div>
            <p className="page-desc">
              {activeTab === "products"
                ? "Unified inventory source of truth with real-time stock synchronization and category assignment"
                : "Central category index, product classifications, and safe deletion management"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {activeTab === "products" ? (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => {
                setEditProduct(null);
                setOpenProductModal(true);
              }}
            >
              Add Product
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => {
                setEditCategory(null);
                setOpenCategoryModal(true);
              }}
            >
              Add Category
            </Button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          TABS NAVIGATION BAR
      ══════════════════════════════════════════════════ */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab("products")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition border ${
            activeTab === "products"
              ? "bg-blue-600 text-white border-blue-600 shadow-xs"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <Package size={15} />
          <span>Product Catalog</span>
          <span
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
              activeTab === "products"
                ? "bg-blue-700/60 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {totalProducts}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("categories")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition border ${
            activeTab === "categories"
              ? "bg-blue-600 text-white border-blue-600 shadow-xs"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <Layers size={15} />
          <span>Category Index</span>
          <span
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
              activeTab === "categories"
                ? "bg-blue-700/60 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {cats.length}
          </span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════
          GLOBAL NOTIFICATIONS / ALERTS
      ══════════════════════════════════════════════════ */}
      {productErr && activeTab === "products" && (
        <div className="rounded-xl bg-rose-50 border border-rose-200/80 p-3.5 text-xs text-rose-700 font-medium flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
            <span>{productErr}</span>
          </div>
          <button onClick={() => setProductErr("")} className="text-rose-500 hover:text-rose-700">
            <X size={14} />
          </button>
        </div>
      )}

      {productSuccess && activeTab === "products" && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200/80 p-3.5 text-xs text-emerald-700 font-medium flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            <span>{productSuccess}</span>
          </div>
          <button onClick={() => setProductSuccess("")} className="text-emerald-500 hover:text-emerald-700">
            <X size={14} />
          </button>
        </div>
      )}

      {categoryErr && activeTab === "categories" && (
        <div className="rounded-xl bg-rose-50 border border-rose-200/80 p-3.5 text-xs text-rose-700 font-medium flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
            <span>{categoryErr}</span>
          </div>
          <button onClick={() => setCategoryErr("")} className="text-rose-500 hover:text-rose-700">
            <X size={14} />
          </button>
        </div>
      )}

      {categorySuccess && activeTab === "categories" && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200/80 p-3.5 text-xs text-emerald-700 font-medium flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            <span>{categorySuccess}</span>
          </div>
          <button onClick={() => setCategorySuccess("")} className="text-emerald-500 hover:text-emerald-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          VIEW 1: PRODUCT CATALOG
      ══════════════════════════════════════════════════ */}
      {activeTab === "products" && (
        <div className="space-y-4">
          {/* METRICS CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                <Package size={18} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Products</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">{totalProducts}</p>
              </div>
            </div>

            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">In Stock</p>
                <p className="text-xl font-bold text-emerald-700 mt-0.5">{inStockCount}</p>
              </div>
            </div>

            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Low Stock</p>
                <p className="text-xl font-bold text-amber-700 mt-0.5">{lowStockCount}</p>
              </div>
            </div>

            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                <AlertCircle size={18} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Out of Stock</p>
                <p className="text-xl font-bold text-rose-700 mt-0.5">{outOfStockCount}</p>
              </div>
            </div>
          </div>

          {/* CATEGORY FILTER BAR */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-2">
              <Filter size={14} className="text-blue-600" />
              <span>Category Filter:</span>
            </div>

            <button
              onClick={() => setSelectedCategory("")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                selectedCategory === ""
                  ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              All Categories ({rawProducts.length})
            </button>

            {cats.map((cat) => {
              const catId = cat.id || cat._id;
              const isSelected = selectedCategory === catId;
              const productCount = rawProducts.filter(
                (p) => (p.categoryId || p.category?.id || p.category?._id) === catId
              ).length;

              return (
                <button
                  key={catId}
                  onClick={() => setSelectedCategory(isSelected ? "" : catId)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border inline-flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <span>{cat.name}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] ${
                      isSelected ? "bg-blue-700/60 text-white" : "bg-slate-200/80 text-slate-700"
                    }`}
                  >
                    {productCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* TABLE CARD & SEARCH TOOLBAR */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
              <div className="flex items-center gap-3 w-full sm:max-w-md">
                <SearchBar
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClear={() => setSearch("")}
                  placeholder="Search name, SKU, barcode, brand…"
                  className="w-full"
                />
              </div>

              <div className="flex items-center gap-3">
                {selectedCategory && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                    <span>Filtering: {cats.find((c) => (c.id || c._id) === selectedCategory)?.name}</span>
                    <button onClick={() => setSelectedCategory("")} className="hover:text-blue-900">
                      <X size={12} />
                    </button>
                  </span>
                )}
                <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                  Showing {productsList.length} items
                </span>
              </div>
            </div>

            {!data ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
                <div className="w-7 h-7 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                <p className="text-xs font-medium">Loading product catalog...</p>
              </div>
            ) : productsList.length === 0 ? (
              <div className="empty-state py-16">
                <div className="empty-state-icon">
                  <Package size={22} />
                </div>
                <p className="empty-state-title">No products found</p>
                <p className="empty-state-desc">
                  {selectedCategory
                    ? "No products belong to this category yet. Click Add Product to create one."
                    : search
                    ? `No products match "${search}". Try a different keyword.`
                    : 'Click "Add Product" to catalog your first item.'}
                </p>
                <button
                  onClick={() => {
                    setEditProduct(null);
                    setOpenProductModal(true);
                  }}
                  className="mt-4 btn-primary btn-sm inline-flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Add Product</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Product Name</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3">Stock</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">GST Rate</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {productsList.map((p) => {
                      const stockVal = Number(p.stock ?? 0);
                      const minStockVal = Number(p.minimumStock ?? 5);
                      const isOutOfStock = stockVal <= 0;
                      const isLowStock = !isOutOfStock && stockVal <= minStockVal;

                      return (
                        <tr key={p._id || p.id} className="hover:bg-slate-50/60 transition group">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">{p.name}</div>
                            {p.brand && (
                              <div className="text-[11px] text-slate-400 font-normal">{p.brand}</div>
                            )}
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
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                isOutOfStock
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : isLowStock
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}
                            >
                              {stockVal} {p.unit || "pcs"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {p.isActive === false ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                Inactive
                              </span>
                            ) : isOutOfStock ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                Out of Stock
                              </span>
                            ) : isLowStock ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                Low Stock
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                In Stock
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                            {p.sku || "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-medium">
                            {p.gstRate ?? 0}%
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1.5 opacity-80 group-hover:opacity-100">
                              <CompactIconButton
                                variant="primary"
                                size="sm"
                                icon={Pencil}
                                onClick={() => {
                                  setEditProduct(p);
                                  setOpenProductModal(true);
                                }}
                                title="Edit Product"
                              />
                              <CompactIconButton
                                variant="danger"
                                size="sm"
                                icon={Trash2}
                                onClick={() => removeProduct(p._id || p.id, p.name)}
                                title="Delete Product"
                              />
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
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          VIEW 2: CATEGORY INDEX
      ══════════════════════════════════════════════════ */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
              <div className="flex items-center gap-3 w-full sm:max-w-md">
                <SearchBar
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  onClear={() => setCategorySearch("")}
                  placeholder="Search categories by name or description…"
                  className="w-full"
                />
              </div>

              <div className="flex items-center gap-2.5">
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  <ArrowUpDown size={13} />
                  <span>Sort by:</span>
                </span>
                <select
                  value={categorySortBy}
                  onChange={(e) => setCategorySortBy(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white outline-none focus:border-blue-500"
                >
                  <option value="name">Name (A-Z)</option>
                  <option value="products">Product Count</option>
                  <option value="newest">Newest First</option>
                </select>
                <span className="text-xs text-slate-400 font-medium whitespace-nowrap ml-2">
                  Total {filteredCategories.length} categories
                </span>
              </div>
            </div>

            {categoryLoading ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
                <div className="w-7 h-7 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                <p className="text-xs font-medium">Loading Category Index...</p>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="empty-state py-16">
                <div className="empty-state-icon">
                  <Layers size={22} />
                </div>
                <p className="empty-state-title">No categories found</p>
                <p className="empty-state-desc">
                  {categorySearch
                    ? `No categories match "${categorySearch}".`
                    : 'Click "Add Category" to create your first category classification.'}
                </p>
                <button
                  onClick={() => {
                    setEditCategory(null);
                    setOpenCategoryModal(true);
                  }}
                  className="mt-4 btn-primary btn-sm inline-flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Add Category</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 w-16">#</th>
                      <th className="px-4 py-3">Category Name</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Default GST Rate</th>
                      <th className="px-4 py-3 text-center">Associated Products</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCategories.map((c, index) => {
                      const catId = c.id || c._id;
                      const productCount =
                        c.productCount ??
                        rawProducts.filter(
                          (p) => (p.categoryId || p.category?.id || p.category?._id) === catId
                        ).length;

                      return (
                        <tr key={catId} className="hover:bg-slate-50/60 transition group">
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                                <Folder size={14} />
                              </span>
                              <span>{c.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                            {c.description || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-semibold">
                              {c.defaultGstRate !== undefined && c.defaultGstRate !== null ? c.defaultGstRate : 18}% GST
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                productCount > 0
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                            >
                              <Package size={12} />
                              <span>{productCount} items</span>
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                c.isActive !== false
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-100 text-slate-500 border border-slate-200"
                              }`}
                            >
                              {c.isActive !== false ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1.5 opacity-80 group-hover:opacity-100">
                              <CompactIconButton
                                variant="primary"
                                size="sm"
                                icon={Pencil}
                                onClick={() => {
                                  setEditCategory(c);
                                  setOpenCategoryModal(true);
                                }}
                                title="Edit Category"
                              />
                              <CompactIconButton
                                variant="danger"
                                size="sm"
                                icon={Trash2}
                                onClick={() => removeCategory(catId, c.name, productCount)}
                                title="Delete Category"
                              />
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
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          CREATE / EDIT PRODUCT MODAL
      ══════════════════════════════════════════════════ */}
      <Modal
        isOpen={openProductModal}
        onClose={() => setOpenProductModal(false)}
        title={editProduct ? "Edit Product" : "Add New Product"}
        subtitle={
          editProduct
            ? "Update catalog item details, category assignment and pricing"
            : "Create a new catalog item with automatic Stock Overview synchronization"
        }
        icon={Tag}
        iconColor="text-blue-600 bg-blue-50 border-blue-100"
        maxWidth="max-w-xl"
        footer={
          <>
            <Button
              variant="neutral"
              size="sm"
              icon={X}
              onClick={() => setOpenProductModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="product-form"
              variant="primary"
              size="sm"
              icon={Save}
              onClick={() => {
                productFormRef.current?.requestSubmit?.();
              }}
            >
              {editProduct ? "Save Changes" : "Create Product"}
            </Button>
          </>
        }
      >
        <form
          id="product-form"
          ref={productFormRef}
          onKeyDown={(e) => handleSmartFormKeyDown(e, productFormRef.current)}
          onSubmit={saveProduct}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs max-h-[75vh] overflow-y-auto pr-1"
        >
          {productErr && (
            <div className="sm:col-span-2 p-2.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium">
              {productErr}
            </div>
          )}
          {/* ── ROW 1: Product Name ── */}
          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
            <input
              name="name"
              required
              defaultValue={editProduct?.name}
              placeholder="e.g. Basmati Rice 5kg / Office Chair"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium text-slate-800"
            />
          </div>

          {/* ── ROW 2: SKU Code | Barcode ── */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">SKU Code *</label>
            <input
              name="sku"
              required
              defaultValue={editProduct?.sku}
              placeholder="e.g. OFC-1001"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-mono text-slate-800 uppercase"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Barcode</label>
            <input
              name="barcode"
              defaultValue={editProduct?.barcode}
              placeholder="e.g. 8901030383822 (auto-generated if empty)"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-mono text-slate-800"
            />
          </div>

          {/* ── ROW 3: Category | Brand ── */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-700">Category *</label>
              {modalCategoryId && (
                <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                  {cats.find((c) => (c.id || c._id) === modalCategoryId)?.defaultGstRate ?? 18}% default
                </span>
              )}
            </div>
            <select
              name="category"
              required
              value={modalCategoryId}
              onChange={(e) => {
                const newCatId = e.target.value;
                setModalCategoryId(newCatId);
                const cat = cats.find((c) => (c.id || c._id) === newCatId);
                if (cat) {
                  const catRate = Number(
                    cat.defaultGstRate !== undefined && cat.defaultGstRate !== null
                      ? cat.defaultGstRate
                      : 18
                  );
                  // Auto-populate GST rate for new product if user hasn't manually entered a specific override
                  if (!editProduct && !hasManualGstOverride) {
                    setModalGstRate(catRate);
                  }
                }
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-white text-slate-800 font-medium"
            >
              <option value="">Select Category</option>
              {cats.map((c) => (
                <option key={c.id || c._id} value={c.id || c._id}>
                  {c.name} ({c.defaultGstRate !== undefined && c.defaultGstRate !== null ? c.defaultGstRate : 18}% GST)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Brand</label>
            <input
              name="brand"
              defaultValue={editProduct?.brand}
              placeholder="e.g. ComfortPlus"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium text-slate-800"
            />
          </div>

          {/* ── ROW 4: Unit | Purchase Price ── */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Unit *</label>
            <select
              name="unit"
              value={modalUnit}
              onChange={(e) => setModalUnit(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-white text-slate-800 font-medium"
            >
              <option value="piece">Piece (Pcs)</option>
              <option value="nos">Nos (Numbers)</option>
              <option value="kg">Kg (Kilograms)</option>
              <option value="gram">Gram (G)</option>
              <option value="litre">Litre (Ltr)</option>
              <option value="ml">Millilitre (ml)</option>
              <option value="metre">Metre (M)</option>
              <option value="box">Box (Boxes)</option>
              <option value="pack">Pack (Pkt)</option>
              <option value="dozen">Dozen (Dzn)</option>
              <option value="roll">Roll (Rll)</option>
              <option value="set">Set (Sets)</option>
              <option value="bundle">Bundle (Bndl)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Purchase Price (₹) *</label>
            <input
              name="purchasePrice"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={editProduct?.purchasePrice || 0}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-semibold font-mono text-slate-800"
            />
          </div>

          {/* ── ROW 5: Quantity or Opening Stock | Minimum Alert Stock (Requirement 1) ── */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-700">
                {editProduct ? "Quantity (Current Stock)" : "Quantity (Opening Stock) *"}
              </label>
              <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-50 border border-blue-100">
                {modalUnit}
              </span>
            </div>
            <input
              name="stock"
              type="number"
              step={isDecimalUnit(modalUnit) ? "any" : "1"}
              min="0"
              required
              value={modalStock}
              onChange={(e) => setModalStock(e.target.value)}
              disabled={!!editProduct}
              placeholder={isDecimalUnit(modalUnit) ? "e.g. 10.5" : "e.g. 20"}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium font-mono text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              {editProduct
                ? "Initial stock recorded at creation. Adjust via Stock Overview."
                : isDecimalUnit(modalUnit)
                ? "Decimal quantities supported for this unit (e.g. 2.500)"
                : "Whole numbers only for this unit (e.g. 10)"}
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Minimum Alert Stock</label>
            <input
              name="minimumStock"
              type="number"
              step={isDecimalUnit(modalUnit) ? "any" : "1"}
              min="0"
              defaultValue={editProduct?.minimumStock !== undefined ? editProduct.minimumStock : 5}
              placeholder="5"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium font-mono text-slate-800"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Threshold for low-stock notification alerts
            </p>
          </div>

          {/* ── ROW 6: Selling Price | GST Rate (Requirements 2, 3 & 4) ── */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-700">Selling Price (₹) *</label>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  productPriceMode === "INCLUSIVE"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-blue-50 text-blue-700 border border-blue-200"
                }`}
              >
                {productPriceMode === "INCLUSIVE" ? "GST Inclusive (MRP)" : "GST Exclusive (+Tax)"}
              </span>
            </div>
            <input
              name="sellingPrice"
              type="number"
              step="0.01"
              min="0"
              required
              value={modalSellingPrice}
              onChange={(e) => setModalSellingPrice(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-bold font-mono text-blue-600"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              {productPriceMode === "INCLUSIVE"
                ? "Final price customer pays (tax included)"
                : "Taxable base price before GST is added"}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700">GST Rate (%) *</label>
              <div className="flex items-center gap-1.5">
                {modalCategoryId && (
                  (() => {
                    const selectedCat = cats.find((c) => (c.id || c._id) === modalCategoryId);
                    const catRate = Number(
                      selectedCat?.defaultGstRate !== undefined && selectedCat?.defaultGstRate !== null
                        ? selectedCat.defaultGstRate
                        : 18
                    );
                    if (Number(modalGstRate) !== catRate) {
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            setModalGstRate(catRate);
                            setHasManualGstOverride(false);
                          }}
                          className="text-[10px] text-purple-700 bg-purple-50 hover:bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200 font-medium transition cursor-pointer"
                          title="Click to reset to category default rate"
                        >
                          Use Cat ({catRate}%)
                        </button>
                      );
                    }
                    return (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-medium">
                        Category Default ({catRate}%)
                      </span>
                    );
                  })()
                )}
                <span className="text-[10px] text-blue-600 font-bold">Standard Brackets</span>
              </div>
            </div>
            <input
              id="product-gst-input"
              name="gstRate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={modalGstRate}
              onChange={(e) => {
                setModalGstRate(e.target.value);
                setHasManualGstOverride(true);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-bold font-mono text-slate-800"
              placeholder="e.g. 18, 12, 5"
            />
            {/* Quick-select GST rates: 0%, 3%, 5%, 12%, 18%, 28% */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {GST_RATES.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => {
                    setModalGstRate(rate);
                    setHasManualGstOverride(true);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition border cursor-pointer ${
                    Number(modalGstRate) === rate
                      ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                      : "bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 border-slate-200"
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>
          </div>

          {/* ── ROW 7: Selling Price Includes GST? — GST Inclusive / GST Exclusive (Requirement 2) ── */}
          <div className="sm:col-span-2 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900 block">
                Selling Price Includes GST? *
              </span>
              <span className="text-[11px] text-slate-500">
                Determines how tax is calculated in POS &amp; Invoices
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option A: GST Inclusive */}
              <label
                onClick={() => setProductPriceMode("INCLUSIVE")}
                className={`p-3 rounded-xl border transition cursor-pointer flex flex-col gap-1 ${
                  productPriceMode === "INCLUSIVE"
                    ? "bg-white border-blue-500 ring-2 ring-blue-500/10 shadow-xs"
                    : "bg-white/80 border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="pricingMethod"
                    value="INCLUSIVE"
                    checked={productPriceMode === "INCLUSIVE"}
                    onChange={() => setProductPriceMode("INCLUSIVE")}
                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="font-bold text-xs text-slate-900">
                    GST Inclusive
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 pl-6 leading-tight">
                  The entered selling price already includes GST. Tax is extracted backwards for billing.
                </span>
              </label>

              {/* Option B: GST Exclusive */}
              <label
                onClick={() => setProductPriceMode("EXCLUSIVE")}
                className={`p-3 rounded-xl border transition cursor-pointer flex flex-col gap-1 ${
                  productPriceMode === "EXCLUSIVE"
                    ? "bg-white border-blue-500 ring-2 ring-blue-500/10 shadow-xs"
                    : "bg-white/80 border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="pricingMethod"
                    value="EXCLUSIVE"
                    checked={productPriceMode === "EXCLUSIVE"}
                    onChange={() => setProductPriceMode("EXCLUSIVE")}
                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="font-bold text-xs text-slate-900">
                    GST Exclusive
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 pl-6 leading-tight">
                  GST will be calculated and added to the entered selling price during billing.
                </span>
              </label>
            </div>
          </div>

          {/* ── ROW 8: Taxable Value | GST Amount | Final Selling Price preview (Requirement 3) ── */}
          <div className="sm:col-span-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-700">
                Tax Breakdown &amp; Final Price Preview
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Mode: {productPriceMode === "INCLUSIVE" ? "Inclusive (MRP)" : "Exclusive (+Tax)"}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-slate-200/90 text-[11px] grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Taxable Value</span>
                <span className="font-bold text-slate-800 font-mono">
                  {formatCurrencyINR(previewBreakdown.taxableValue)}
                </span>
              </div>
              <div className="border-x border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">
                  GST Amount ({modalGstRate}%)
                </span>
                <span className="font-bold text-blue-600 font-mono">
                  +{formatCurrencyINR(previewBreakdown.gstAmount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Final Selling Price</span>
                <span className="font-bold text-emerald-700 font-mono">
                  {formatCurrencyINR(previewBreakdown.finalSellingPrice)}
                </span>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* ══════════════════════════════════════════════════
          CREATE / EDIT CATEGORY MODAL
      ══════════════════════════════════════════════════ */}
      <Modal
        isOpen={openCategoryModal}
        onClose={() => setOpenCategoryModal(false)}
        title={editCategory ? "Edit Category" : "Add New Category"}
        subtitle={
          editCategory
            ? "Update category name and classification details. Changes will propagate across all products."
            : "Create a new product category for classification and filtering"
        }
        icon={FolderPlus}
        iconColor="text-purple-600 bg-purple-50 border-purple-100"
        maxWidth="max-w-md"
        footer={
          <>
            <Button
              variant="neutral"
              size="sm"
              icon={X}
              onClick={() => setOpenCategoryModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="category-form"
              variant="primary"
              size="sm"
              icon={Save}
              onClick={() => {
                categoryFormRef.current?.requestSubmit?.();
              }}
            >
              {editCategory ? "Save Changes" : "Create Category"}
            </Button>
          </>
        }
      >
        <form
          id="category-form"
          ref={categoryFormRef}
          onKeyDown={(e) => handleSmartFormKeyDown(e, categoryFormRef.current)}
          onSubmit={saveCategory}
          className="space-y-4 text-xs"
        >
          {categoryErr && (
            <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium">
              {categoryErr}
            </div>
          )}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Category Name *</label>
            <input
              name="name"
              required
              defaultValue={editCategory?.name}
              placeholder="e.g. Office Furniture"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-semibold text-slate-800"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              name="description"
              rows={3}
              defaultValue={editCategory?.description || ""}
              placeholder="e.g. Desks, chairs, cabinets, and ergonomic furniture items"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-slate-800"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="cat-default-gst" className="block font-semibold text-slate-700">
                Default GST Tax Rate (%) *
              </label>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                Category Default
              </span>
            </div>
            <select
              id="cat-default-gst"
              name="defaultGstRate"
              value={categoryModalGstRate}
              onChange={(e) => setCategoryModalGstRate(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-white font-semibold text-slate-800"
            >
              <option value={0}>0% (Nil / Exempted Goods)</option>
              <option value={3}>3% (Precious Metals / Jewelry)</option>
              <option value={5}>5% (Essential Goods & Groceries)</option>
              <option value={12}>12% (Processed Goods & Standard Items)</option>
              <option value={18}>18% (Standard Rate - Most Products)</option>
              <option value={28}>28% (Luxury & Demerit Goods)</option>
            </select>
            {/* Quick selectable rate chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {GST_RATES.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setCategoryModalGstRate(rate)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition border cursor-pointer ${
                    Number(categoryModalGstRate) === rate
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
              Applied by default when creating products in this category. You can override it for individual products.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="cat-active"
              name="isActive"
              defaultChecked={editCategory ? editCategory.isActive !== false : true}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <label htmlFor="cat-active" className="font-semibold text-slate-700 cursor-pointer">
              Active Category
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
}
