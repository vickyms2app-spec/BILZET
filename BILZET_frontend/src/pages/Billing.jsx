import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  ChevronDown,
  Trash2,
  Printer,
  Download,
  Check,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Search,
  X,
  FilePlus,
  Clock,
  Receipt,
  Scan,
  FileText,
  CreditCard,
  Banknote,
  Eye,
  EyeOff,
  ShoppingBag,
  RotateCcw,
} from "lucide-react";
import { settingsApi, productsApi, customersApi, salesApi } from "../api";
import TaxInvoice from "../components/invoice/TaxInvoice";
import UpiPaymentModal from "../components/payment/UpiPaymentModal";
import BarcodeScannerModal from "../components/pos/BarcodeScannerModal";
import HeldBillsModal from "../components/pos/HeldBillsModal";
import { useRealtimeSync } from "../hooks/useRealtimeSync";
import { handleSmartFormKeyDown, handleTableKeyDown } from "../utils/keyboardNavigation";
import { isDecimalUnit, calculateLineItemTax } from "../utils/taxCalculation";

const INDIAN_STATES = [
  "33 - Tamil Nadu",
  "29 - Karnataka",
  "27 - Maharashtra",
  "07 - Delhi",
  "32 - Kerala",
  "36 - Telangana",
  "37 - Andhra Pradesh",
  "24 - Gujarat",
  "19 - West Bengal",
  "09 - Uttar Pradesh",
  "08 - Rajasthan",
  "06 - Haryana",
  "03 - Punjab",
  "21 - Odisha",
  "10 - Bihar",
  "23 - Madhya Pradesh",
  "99 - Other / Centre Territory",
];

export default function Billing() {
  const nav = useNavigate();

  // Invoice identifiers
  const [billNumber, setBillNumber] = useState(
    `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);

  // Customer Information
  const [customerName, setCustomerName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [saleType, setSaleType] = useState("B2C — Retail Customer");
  const [placeOfSupply, setPlaceOfSupply] = useState("33 - Tamil Nadu");
  const [showGstOptions, setShowGstOptions] = useState(false);
  const [showCustDropdown, setShowCustDropdown] = useState(false);

  // Catalog and line items
  const [availableProducts, setAvailableProducts] = useState([]);
  const [availableCustomers, setAvailableCustomers] = useState([]);
  const [items, setItems] = useState([]);

  // Toolbar search
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [showProductSearchResults, setShowProductSearchResults] = useState(false);
  const searchInputRef = useRef(null);
  const customerSectionRef = useRef(null);
  const itemsTableRef = useRef(null);
  const addItemModalRef = useRef(null);

  // Pricing configuration
  const [taxInclusive, setTaxInclusive] = useState(false);

  // Payment states
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [paymentStatus, setPaymentStatus] = useState("Paid");
  const [amountReceived, setAmountReceived] = useState(0);

  // Modals & Feedback
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showHeldBillsModal, setShowHeldBillsModal] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [completedInvoice, setCompletedInvoice] = useState(null);
  const [shopSettings, setShopSettings] = useState(null);
  const [savingBill, setSavingBill] = useState(false);
  const [notification, setNotification] = useState({ type: "", text: "" });

  // Held Bills state persisted in localStorage
  const [heldBills, setHeldBills] = useState(() => {
    try {
      const saved = localStorage.getItem("bilzet_held_bills");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Sync held bills to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("bilzet_held_bills", JSON.stringify(heldBills));
    } catch (e) {
      console.warn("Failed to persist held bills to localStorage:", e);
    }
  }, [heldBills]);

  // Add Item modal form state
  const [itemForm, setItemForm] = useState({
    productId: "",
    name: "",
    hsn: "1904",
    quantity: 1,
    rate: 100,
    discount: 0,
    taxRate: 18,
  });

  const notify = (type, text) => {
    setNotification({ type, text });
    setTimeout(() => setNotification({ type: "", text: "" }), 4000);
  };

  const refreshCatalogAndCustomers = useCallback(() => {
    // Load active products from database
    productsApi
      .list({ limit: 150 })
      .then((res) => {
        const prods = res?.products || res?.data?.products || [];
        setAvailableProducts(prods);
      })
      .catch(() => setAvailableProducts([]));

    // Load customers for quick auto-fill
    customersApi
      .list({ limit: 100 })
      .then((res) => {
        const custs = res?.data?.customers || res?.customers || [];
        setAvailableCustomers(custs);
      })
      .catch(() => setAvailableCustomers([]));
  }, []);

  // Real-time synchronization for products, stock adjustments, and customers
  useRealtimeSync(
    [
      "PRODUCT_CREATED",
      "PRODUCT_UPDATED",
      "STOCK_ADJUSTED",
      "CUSTOMER_CREATED",
      "CUSTOMER_UPDATED",
      "PURCHASE_CREATED",
    ],
    () => {
      refreshCatalogAndCustomers();
    }
  );

  useEffect(() => {
    // Load shop settings
    const local = localStorage.getItem("bilzet_invoice_settings");
    if (local) {
      try {
        const raw = JSON.parse(local);
        const parsed = raw?.settings ? { ...raw, ...raw.settings } : raw;
        if (
          parsed &&
          parsed.invoiceTitle &&
          (parsed.invoiceTitle.includes("TAX INVOICESUPER") ||
            parsed.invoiceTitle.includes("SUPER TAX INVOICE"))
        ) {
          parsed.invoiceTitle = "TAX INVOICE";
          localStorage.setItem("bilzet_invoice_settings", JSON.stringify(parsed));
        }
        setShopSettings(parsed);
      } catch (e) {}
    } else {
      settingsApi
        .get()
        .then((res) => {
          if (res) setShopSettings(res?.settings || res);
        })
        .catch(() => {});
    }

    refreshCatalogAndCustomers();
  }, [refreshCatalogAndCustomers]);

  // Sync taxInclusive with shopSettings if configured
  useEffect(() => {
    if (shopSettings?.taxInclusive !== undefined) {
      setTaxInclusive(Boolean(shopSettings.taxInclusive));
    }
  }, [shopSettings]);

  // Product-wise GST and Taxable value calculations using shared taxCalculation service
  const calculatedItems = useMemo(() => {
    return items.map((i) => {
      const rate = Number(i.rate || 0);
      const qty = Number(i.qty || 1);
      const discount = Number(i.discount || 0);
      const gstRate = Number(i.gst !== undefined ? i.gst : (i.gstRate || 0));
      const isItemInclusive =
        i.isTaxInclusive !== undefined ? Boolean(i.isTaxInclusive) : taxInclusive;

      const taxResult = calculateLineItemTax({
        rate,
        qty,
        discount,
        gstRate,
        isTaxInclusive: isItemInclusive,
        placeOfSupply,
      });

      return {
        ...i,
        taxable: taxResult.taxable,
        tax: taxResult.tax,
        total: taxResult.total,
        cgst: taxResult.cgst,
        sgst: taxResult.sgst,
        igst: taxResult.igst,
        isTaxInclusive: isItemInclusive,
      };
    });
  }, [items, taxInclusive, placeOfSupply]);

  const subtotal = useMemo(
    () => Number(calculatedItems.reduce((acc, i) => acc + i.taxable, 0).toFixed(2)),
    [calculatedItems]
  );
  const taxAmount = useMemo(
    () => Number(calculatedItems.reduce((acc, i) => acc + i.tax, 0).toFixed(2)),
    [calculatedItems]
  );
  const totalDiscount = useMemo(
    () => Number(items.reduce((acc, i) => acc + Number(i.discount || 0), 0).toFixed(2)),
    [items]
  );

  const rawGrandTotal = Number((subtotal + taxAmount).toFixed(2));
  // Financial rounding preserved without exposing the UI toggle
  const roundOff = Number((Math.round(rawGrandTotal) - rawGrandTotal).toFixed(2));
  const grandTotal = Math.round(rawGrandTotal);

  // Inter-state GST calculation (Place of Supply check)
  const isInterState = useMemo(() => {
    const supplyCode = placeOfSupply.split(" - ")[0]?.trim();
    const shopStateCode =
      shopSettings?.stateCode || (shopSettings?.state?.includes("Tamil Nadu") ? "33" : "33");
    return supplyCode !== shopStateCode && supplyCode !== "33";
  }, [placeOfSupply, shopSettings]);

  const cgst = isInterState ? 0 : Number((taxAmount / 2).toFixed(2));
  const sgst = isInterState ? 0 : Number((taxAmount / 2).toFixed(2));
  const igst = isInterState ? taxAmount : 0;

  // Tender balances
  const changeDue = Math.max(0, Number(amountReceived || 0) - grandTotal);
  const balanceDue = Math.max(0, grandTotal - Number(amountReceived || 0));

  // Sync amount received with grandTotal when Paid
  useEffect(() => {
    if (paymentStatus === "Paid") {
      setAmountReceived(grandTotal);
    }
  }, [grandTotal, paymentStatus]);

  // Reset bill state helper
  const resetBillState = () => {
    setBillNumber(`INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setBillDate(new Date().toISOString().split("T")[0]);
    setCustomerName("");
    setMobileNumber("");
    setCustomerGstin("");
    setCustomerAddress("");
    setItems([]);
    setPaymentMode("Cash");
    setPaymentStatus("Paid");
    setAmountReceived(0);
    setProductSearchQuery("");
  };

  // Start New Bill Handler with protection against unsaved work
  const handleStartNewBill = (showNotify = true) => {
    if (items.length > 0) {
      const confirmDiscard = window.confirm(
        "Current bill has active items. Discard current bill and start a fresh new bill?"
      );
      if (!confirmDiscard) return;
    }
    resetBillState();
    if (showNotify) {
      notify("success", "Fresh new tax bill started! Ready for items.");
    }
  };

  // Customer Autofill
  const handleCustomerSelect = (cust) => {
    setCustomerName(cust.name || "");
    if (cust.phone) setMobileNumber(cust.phone);
    if (cust.gstin) {
      setCustomerGstin(cust.gstin);
      setShowGstOptions(true);
      setSaleType("B2B — Registered Business");
    }
    if (cust.address) {
      setCustomerAddress(cust.address);
      setShowGstOptions(true);
    }
    if (cust.state) {
      const matchState = INDIAN_STATES.find((s) =>
        s.toLowerCase().includes(cust.state.toLowerCase())
      );
      if (matchState) setPlaceOfSupply(matchState);
    }
  };

  // Add Item to Bill (Manual or Catalog Modal)
  const handleOpenAddItem = () => {
    if (availableProducts.length > 0) {
      const first = availableProducts[0];
      setItemForm({
        productId: first.id || first._id,
        name: first.name,
        sku: first.sku || "",
        hsn: first.hsn || first.hsnCode || "1904",
        unit: first.unit || "piece",
        quantity: 1,
        rate: Number(first.sellingPrice || 0),
        discount: 0,
        taxRate: Number(first.gstRate || 18),
        isTaxInclusive: Boolean(first.isTaxInclusive || first.pricingMethod === "INCLUSIVE"),
        stock: first.stock,
      });
    } else {
      setItemForm({
        productId: "",
        name: "",
        sku: "",
        hsn: "1904",
        unit: "piece",
        quantity: 1,
        rate: 100,
        discount: 0,
        taxRate: 18,
        isTaxInclusive: false,
        stock: 999,
      });
    }
    setShowAddItemModal(true);
  };

  const handleProductSelectChange = (id) => {
    const prod = availableProducts.find((p) => (p.id || p._id) === id);
    if (prod) {
      setItemForm({
        ...itemForm,
        productId: id,
        name: prod.name,
        sku: prod.sku || "",
        hsn: prod.hsn || prod.hsnCode || "1904",
        unit: prod.unit || "piece",
        rate: Number(prod.sellingPrice || 0),
        taxRate: Number(prod.gstRate || 18),
        isTaxInclusive: Boolean(prod.isTaxInclusive || prod.pricingMethod === "INCLUSIVE"),
        stock: prod.stock,
      });
    }
  };

  const handleSubmitAddItem = (e) => {
    e.preventDefault();
    if (!itemForm.name.trim()) {
      notify("error", "Please provide a valid product or item name.");
      return;
    }
    if (Number(itemForm.quantity) <= 0) {
      notify("error", "Quantity must be greater than 0.");
      return;
    }

    const newItem = {
      id: itemForm.productId || `custom-${Date.now()}`,
      productId: itemForm.productId || undefined,
      name: itemForm.name.trim(),
      sku: itemForm.sku || undefined,
      hsn: itemForm.hsn || "1904",
      unit: itemForm.unit || "piece",
      qty: Number(itemForm.quantity),
      rate: Math.max(0, Number(itemForm.rate || 0)),
      discount: Math.max(0, Number(itemForm.discount || 0)),
      gst: Math.max(0, Number(itemForm.taxRate || 0)),
      isTaxInclusive: Boolean(itemForm.isTaxInclusive),
      stock: itemForm.stock,
    };

    setItems((prev) => [...prev, newItem]);
    setShowAddItemModal(false);
    notify("success", `Added "${newItem.name}" to bill!`);
  };

  // Barcode Scanner & Quick Catalog Add Integration
  const handleProductScanned = (product) => {
    if (!product) return;
    const prodId = product.id || product._id;

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (i) =>
          (i.productId && i.productId === prodId) ||
          (product.barcode && i.barcode === product.barcode) ||
          (product.sku && i.sku === product.sku)
      );

      if (existingIndex >= 0) {
        const updated = [...prevItems];
        const nextQty = updated[existingIndex].qty + 1;
        if (product.stock && nextQty > product.stock) {
          notify("warning", `Sale quantity (${nextQty}) exceeds available inventory (${product.stock})`);
        }
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: nextQty,
        };
        notify(
          "success",
          `Increased "${product.name}" quantity to ${updated[existingIndex].qty}!`
        );
        return updated;
      } else {
        const newItem = {
          id: prodId || `scan-${Date.now()}`,
          productId: prodId,
          name: product.name,
          barcode: product.barcode,
          sku: product.sku || product.code,
          hsn: product.hsn || product.hsnCode || "1904",
          unit: product.unit || "piece",
          qty: 1,
          rate: Number(product.sellingPrice || product.price || 0),
          discount: 0,
          gst: Number(product.gstRate || 18),
          isTaxInclusive: Boolean(product.isTaxInclusive || product.pricingMethod === "INCLUSIVE"),
          stock: product.stock,
        };
        notify("success", `Added "${product.name}" (₹${newItem.rate}) to bill!`);
        return [...prevItems, newItem];
      }
    });
  };

  // Filter products for the inline toolbar search
  const filteredProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return [];
    const query = productSearchQuery.toLowerCase();
    return availableProducts
      .filter((p) => {
        const nameMatch = p.name?.toLowerCase().includes(query);
        const skuMatch = p.sku?.toLowerCase().includes(query);
        const barcodeMatch = p.barcode?.toLowerCase().includes(query);
        const hsnMatch = p.hsn?.toLowerCase().includes(query);
        return nameMatch || skuMatch || barcodeMatch || hsnMatch;
      })
      .slice(0, 8);
  }, [productSearchQuery, availableProducts]);

  // Hold Bill Handler
  const handleHoldBill = () => {
    if (items.length === 0) {
      notify("error", "Cannot hold an empty bill. Please add at least one item first.");
      return;
    }

    const newHeldBill = {
      id: `HOLD-${Date.now()}`,
      heldAt: new Date().toISOString(),
      billNumber,
      billDate,
      customerName: customerName.trim(),
      mobileNumber: mobileNumber.trim(),
      customerGstin: customerGstin.trim(),
      customerAddress: customerAddress.trim(),
      saleType,
      placeOfSupply,
      items: JSON.parse(JSON.stringify(items)),
      subtotal,
      taxAmount,
      totalDiscount,
      grandTotal,
      paymentMode,
      paymentStatus,
      amountReceived,
    };

    setHeldBills((prev) => [newHeldBill, ...prev]);
    resetBillState();

    notify(
      "success",
      `Bill #${newHeldBill.billNumber} for "${newHeldBill.customerName || "Walk-in"}" put on hold! Ready for next customer.`
    );
  };

  // Resume Held Bill
  const handleResumeHeldBill = (heldBill) => {
    if (!heldBill) return;

    if (items.length > 0) {
      const confirmOverwrite = window.confirm(
        "Current bill has active items. Discard current bill and resume this parked bill?"
      );
      if (!confirmOverwrite) return;
    }

    setBillNumber(
      heldBill.billNumber ||
        `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
    );
    setBillDate(heldBill.billDate || new Date().toISOString().split("T")[0]);
    setCustomerName(heldBill.customerName || "");
    setMobileNumber(heldBill.mobileNumber || "");
    setCustomerGstin(heldBill.customerGstin || "");
    setCustomerAddress(heldBill.customerAddress || "");
    setSaleType(heldBill.saleType || "B2C — Retail Customer");
    setPlaceOfSupply(heldBill.placeOfSupply || "33 - Tamil Nadu");
    setItems(heldBill.items || []);
    setPaymentMode(heldBill.paymentMode || "Cash");
    setPaymentStatus(heldBill.paymentStatus || "Paid");
    setAmountReceived(heldBill.amountReceived || 0);

    setHeldBills((prev) => prev.filter((b) => b.id !== heldBill.id));
    setShowHeldBillsModal(false);

    notify(
      "success",
      `Resumed bill #${heldBill.billNumber} for "${heldBill.customerName || "Walk-in"}".`
    );
  };

  const handleDeleteHeldBill = (heldBillId) => {
    setHeldBills((prev) => prev.filter((b) => b.id !== heldBillId));
    notify("success", "Held bill removed from storage.");
  };

  const handleClearAllHeld = () => {
    if (window.confirm("Are you sure you want to discard all held bills?")) {
      setHeldBills([]);
      notify("success", "All held bills cleared.");
    }
  };

  const handleRemoveItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Quick Payment Buttons
  const handleQuickPayment = (mode, status) => {
    setPaymentMode(mode);
    setPaymentStatus(status);
    if (status === "Paid") {
      setAmountReceived(grandTotal);
    } else {
      setAmountReceived(0);
    }
  };

  // Helper to build complete invoice snapshot
  const generateCurrentInvoiceSnapshot = () => ({
    invoiceNumber: billNumber,
    createdAt: billDate,
    date: billDate,
    saleType,
    placeOfSupply,
    paymentStatus,
    paymentMethod: paymentMode,
    customer: {
      name: customerName || "Walk-in Retail Customer",
      phone: mobileNumber || "+91 98000 00000",
      address: customerAddress || "Counter Sale / Walk-in Customer",
      gstin: customerGstin || "N/A",
      state: placeOfSupply.split(" - ")[1] || "Tamil Nadu",
      stateCode: placeOfSupply.split(" - ")[0] || "33",
    },
    items: calculatedItems.map((i, idx) => ({
      name: i.name,
      code: i.code || i.sku || `PRD-${idx + 1}`,
      hsn: i.hsn || "1904",
      hsnCode: i.hsn || "1904",
      qty: i.qty,
      quantity: i.qty,
      unit: i.unit || "pcs",
      rate: i.rate,
      discount: i.discount || 0,
      gst: i.gst !== undefined ? i.gst : (i.gstRate || 0),
      gstRate: i.gst !== undefined ? i.gst : (i.gstRate || 0),
      taxable: i.taxable,
      taxableAmount: i.taxable,
      taxAmt: i.tax,
      taxAmount: i.tax,
      total: i.total,
      isTaxInclusive: i.isTaxInclusive,
      pricingMethod: i.isTaxInclusive ? "INCLUSIVE" : "EXCLUSIVE",
    })),
    subtotal,
    discountTotal: totalDiscount,
    taxTotal: taxAmount,
    roundOff,
    grandTotal,
    cgst,
    sgst,
    igst,
    paidAmount: paymentStatus === "Paid" ? grandTotal : amountReceived,
    received: paymentStatus === "Paid" ? grandTotal : amountReceived,
    balanceDue,
    changeDue,
    taxInclusive,
    pricingMethod: taxInclusive ? "INCLUSIVE" : "EXCLUSIVE",
  });

  // Save Bill & Complete Sale
  const handleSaveBill = async (openPrintModal = false) => {
    if (items.length === 0) {
      notify("error", "Please add at least one item to the bill before saving.");
      return;
    }

    if (savingBill) return;

    setSavingBill(true);
    try {
      const activeStoreId = localStorage.getItem("bilzet_active_store_id") || undefined;
      const billPayload = {
        invoiceNumber: billNumber,
        invoiceDate: billDate,
        businessId: activeStoreId,
        customerName: customerName.trim() || "Walk-in Retail Customer",
        customerPhone: mobileNumber.trim() || undefined,
        customerAddress: customerAddress || undefined,
        customerGstin: customerGstin || undefined,
        saleType,
        taxInclusive,
        pricingMethod: taxInclusive ? "INCLUSIVE" : "EXCLUSIVE",
        enableRoundOff: true,
        roundOff,
        items: calculatedItems.map((i) => ({
          productId: i.productId || undefined,
          name: i.name,
          sku: i.sku || i.code || undefined,
          hsn: i.hsn || "1904",
          hsnCode: i.hsn || "1904",
          quantity: i.qty,
          rate: i.rate,
          discount: i.discount || 0,
          gstRate: i.gst !== undefined ? i.gst : (i.gstRate || 18),
          isTaxInclusive: i.isTaxInclusive,
          pricingMethod: i.isTaxInclusive ? "INCLUSIVE" : "EXCLUSIVE",
        })),
        subtotal,
        taxTotal: taxAmount,
        grandTotal,
        paidAmount: Number(amountReceived || 0),
        paymentMethod: paymentMode.toUpperCase(),
        paymentStatus: paymentStatus.toUpperCase(),
      };

      const createdRes = await salesApi.create(billPayload);
      const createdSale = createdRes?.sale || createdRes?.data?.sale || createdRes;
      const finalInvoiceNumber = createdSale?.invoiceNumber || billNumber;

      const invoiceData = {
        ...generateCurrentInvoiceSnapshot(),
        id: createdSale?.id || createdSale?._id,
        _id: createdSale?.id || createdSale?._id,
        invoiceNumber: finalInvoiceNumber,
        persisted: true,
      };

      notify("success", `Invoice ${finalInvoiceNumber} permanently saved in database!`);

      if (openPrintModal) {
        setCompletedInvoice(invoiceData);
        setShowInvoiceModal(true);
      } else {
        handleStartNewBill(false);
      }
    } catch (err) {
      notify("error", err?.response?.data?.message || err?.message || "Failed to save invoice");
    } finally {
      setSavingBill(false);
    }
  };

  // Global Billing Shortcuts: Ctrl+S to save draft/bill, F2 for new bill, F4 for hold bill
  useEffect(() => {
    const handleBillingShortcuts = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        handleSaveBill(false);
      } else if (e.key === "F2") {
        e.preventDefault();
        handleStartNewBill(true);
      } else if (e.key === "F4") {
        e.preventDefault();
        handleHoldBill();
      }
    };
    window.addEventListener("keydown", handleBillingShortcuts);
    return () => window.removeEventListener("keydown", handleBillingShortcuts);
  }, [items, savingBill, billNumber, billDate, customerName, mobileNumber, customerAddress, customerGstin, saleType, taxInclusive, roundOff, calculatedItems, subtotal, taxAmount, grandTotal, amountReceived, paymentMode, paymentStatus]);

  return (
    <>
      {/* ══════════════════════════════════════════════════
          POS SCREEN — macOS-INSPIRED PREMIUM UI
      ══════════════════════════════════════════════════ */}
      <div className="pos-screen min-h-screen bg-[#F5F5F7] text-[#1D1D1F] p-3 sm:p-5 lg:p-7 space-y-5 fade-up font-sans">
        {/* ── 1. POS Page Header ── */}
        <header className="bg-white rounded-2xl border border-[#E5E5EA] px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] flex items-center justify-center text-[#007AFF]">
              <Receipt size={20} strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-semibold text-[#1D1D1F] tracking-tight">
                  Point of Sale &amp; New Bill
                </h1>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EDF8F0] text-[#248A3D] text-[11px] font-medium border border-[#CCE8D4]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#248A3D] animate-pulse" />
                  <span>Active POS</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#6E6E73] mt-0.5 font-normal">
                <span>Invoice #{billNumber}</span>
                <span>&bull;</span>
                <span>Date: {billDate}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            {/* Held Bills button */}
            <button
              type="button"
              onClick={() => setShowHeldBillsModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-[#E5E5EA] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
              title="View & Resume Parked Bills"
            >
              <Clock
                size={14}
                className={heldBills.length > 0 ? "text-[#9A6700]" : "text-[#6E6E73]"}
              />
              <span>Held Bills</span>
              {heldBills.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#9A6700] text-white text-[10px] font-bold">
                  {heldBills.length}
                </span>
              )}
            </button>

            {/* Scan Barcode button */}
            <button
              type="button"
              onClick={() => setShowBarcodeScanner(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-[#E5E5EA] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
              title="Scan product barcode with device camera"
            >
              <Scan size={14} className="text-[#007AFF]" />
              <span>Scan Barcode</span>
            </button>

            {/* New Bill button */}
            <button
              type="button"
              onClick={() => handleStartNewBill(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-[#E5E5EA] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
              title="Start a fresh blank invoice"
            >
              <FilePlus size={14} className="text-[#6E6E73]" />
              <span>New Bill</span>
            </button>

            {/* Add Item button (Primary Action in Header) */}
            <button
              type="button"
              onClick={handleOpenAddItem}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#007AFF] hover:bg-[#0062CC] text-white transition cursor-pointer shadow-[0_1px_2px_rgba(0,122,255,0.25)]"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>Add Item</span>
            </button>
          </div>
        </header>

        {/* Notifications Banner */}
        {notification.text && (
          <div
            className={`px-4 py-3 rounded-2xl text-xs font-medium flex items-center justify-between gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
              notification.type === "success"
                ? "bg-[#EDF8F0] border border-[#CCE8D4] text-[#248A3D]"
                : "bg-[#FFF2F2] border border-[#FFD0D0] text-[#D70015]"
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === "success" ? (
                <CheckCircle2 size={16} className="text-[#248A3D] shrink-0" />
              ) : (
                <AlertTriangle size={16} className="text-[#D70015] shrink-0" />
              )}
              <span>{notification.text}</span>
            </div>
            {notification.type === "success" && (
              <button
                type="button"
                onClick={() => nav("/invoices")}
                className="text-[11px] font-semibold text-[#248A3D] hover:underline cursor-pointer"
              >
                View in History &rarr;
              </button>
            )}
          </div>
        )}

        {/* ── 2-Column Responsive Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: Customer Info, Items & Products, Payment & Settlement */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-5">
            {/* ── 2. Customer Information Section ── */}
            <section
              ref={customerSectionRef}
              onKeyDown={(e) =>
                handleSmartFormKeyDown(e, customerSectionRef.current, {
                  onComplete: () => searchInputRef.current?.focus(),
                })
              }
              className="bg-white rounded-2xl border border-[#E5E5EA] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E5EA]">
                <div>
                  <h2 className="text-sm sm:text-base font-semibold text-[#1D1D1F] tracking-tight">
                    Customer Information
                  </h2>
                  <p className="text-xs text-[#6E6E73] font-normal mt-0.5">
                    Select an existing client or enter walk-in customer details
                  </p>
                </div>
                <div className="text-[11px] font-medium text-[#6E6E73] bg-[#F5F5F7] border border-[#E5E5EA] px-2.5 py-1 rounded-lg">
                  Place of Supply: {placeOfSupply.split(" - ")[0]}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                {/* Customer Name Autocomplete */}
                <div className="sm:col-span-2 relative">
                  <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">
                    Customer Name <span className="text-[#D70015]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Walk-in Retail Customer or search..."
                      value={customerName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomerName(val);
                        setShowCustDropdown(true);
                      }}
                      onFocus={() => {
                        if (availableCustomers.length > 0) setShowCustDropdown(true);
                      }}
                      className="w-full px-3 py-2 text-xs sm:text-[13px] border border-[#E5E5EA] rounded-xl outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition bg-white text-[#1D1D1F] placeholder-[#6E6E73]/60"
                    />

                    {/* Autocomplete Dropdown */}
                    {showCustDropdown && customerName.trim() && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setShowCustDropdown(false)}
                        />
                        <div className="absolute left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-[#E5E5EA] z-30 max-h-52 overflow-y-auto divide-y divide-[#E5E5EA]">
                          {availableCustomers
                            .filter((c) =>
                              c.name?.toLowerCase().includes(customerName.toLowerCase())
                            )
                            .map((c) => (
                              <button
                                key={c.id || c._id}
                                type="button"
                                onClick={() => {
                                  handleCustomerSelect(c);
                                  setShowCustDropdown(false);
                                }}
                                className="w-full p-2.5 text-left text-xs hover:bg-[#F5F5F7] transition flex items-center justify-between cursor-pointer"
                              >
                                <div>
                                  <p className="font-medium text-[#1D1D1F]">{c.name}</p>
                                  <p className="text-[11px] text-[#6E6E73]">
                                    {c.phone || "No phone"} {c.gstin ? `· GSTIN: ${c.gstin}` : ""}
                                  </p>
                                </div>
                                <span className="text-[11px] text-[#007AFF] font-medium">Select</span>
                              </button>
                            ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">
                    Phone / Mobile
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-[13px] border border-[#E5E5EA] rounded-xl outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition bg-white text-[#1D1D1F] placeholder-[#6E6E73]/60"
                  />
                </div>

                {/* Sale Type */}
                <div>
                  <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">
                    Sale Type
                  </label>
                  <select
                    value={saleType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSaleType(val);
                      if (val.includes("B2B")) setShowGstOptions(true);
                    }}
                    className="w-full px-3 py-2 text-xs sm:text-[13px] border border-[#E5E5EA] rounded-xl outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition bg-white text-[#1D1D1F]"
                  >
                    <option value="B2C — Retail Customer">B2C Retail Customer</option>
                    <option value="B2B — Registered Business">B2B Registered</option>
                    <option value="SEZ — Zero Rated">SEZ Export (Zero Rated)</option>
                  </select>
                </div>
              </div>

              {/* Place of Supply selector & Collapsible GSTIN trigger */}
              <div className="mt-4 pt-3.5 border-t border-[#E5E5EA] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <label className="font-medium text-[#1D1D1F] shrink-0">Place of Supply:</label>
                  <select
                    value={placeOfSupply}
                    onChange={(e) => setPlaceOfSupply(e.target.value)}
                    className="px-2.5 py-1 text-xs border border-[#E5E5EA] rounded-lg bg-white text-[#1D1D1F] outline-none focus:border-[#007AFF]"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                  {isInterState && (
                    <span className="text-[10px] font-semibold text-[#007AFF] bg-[#EBF5FF] border border-[#D0E2FF] px-2 py-0.5 rounded-full">
                      Inter-State (IGST)
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowGstOptions(!showGstOptions)}
                  className="text-[#007AFF] hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>{showGstOptions ? "Hide" : "+ Add"} GSTIN &amp; Billing Address</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${
                      showGstOptions ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>

              {/* Expandable GSTIN & Billing Address Fields */}
              {showGstOptions && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3 pt-3.5 border-t border-[#E5E5EA] animate-in fade-in">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-[#1D1D1F]">Customer GSTIN</label>
                      {saleType.includes("B2B") && !customerGstin && (
                        <span className="text-[10px] text-[#9A6700] font-medium">
                          Required for B2B ITC
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. 33AAAAA0000A1Z5"
                      value={customerGstin}
                      onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 text-xs border border-[#E5E5EA] rounded-xl font-mono uppercase bg-white outline-none focus:border-[#007AFF] text-[#1D1D1F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#1D1D1F] mb-1">
                      Billing Address
                    </label>
                    <input
                      type="text"
                      placeholder="Street, City, State, Pincode"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#E5E5EA] rounded-xl bg-white outline-none focus:border-[#007AFF] text-[#1D1D1F]"
                    />
                  </div>
                </div>
              )}
            </section>

            {/* ── 3. Items & Products Section ── */}
            <section className="bg-white rounded-2xl border border-[#E5E5EA] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#E5E5EA]">
                <div>
                  <h2 className="text-sm sm:text-base font-semibold text-[#1D1D1F] tracking-tight">
                    Items &amp; Products
                  </h2>
                  <p className="text-xs text-[#6E6E73] font-normal mt-0.5">
                    Scan barcodes, search inventory or add custom line items
                  </p>
                </div>

                {/* Exclusive / Inclusive pricing toggle (Round toggle completely removed) */}
                <div className="inline-flex items-center bg-[#F5F5F7] p-1 rounded-xl border border-[#E5E5EA] text-xs self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setTaxInclusive(false)}
                    className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                      !taxInclusive
                        ? "bg-white text-[#007AFF] shadow-[0_1px_2px_rgba(0,0,0,0.06)] font-semibold"
                        : "text-[#6E6E73] hover:text-[#1D1D1F]"
                    }`}
                    title="Tax calculated on top of unit rate"
                  >
                    Exclusive (Std)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxInclusive(true)}
                    className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                      taxInclusive
                        ? "bg-white text-[#007AFF] shadow-[0_1px_2px_rgba(0,0,0,0.06)] font-semibold"
                        : "text-[#6E6E73] hover:text-[#1D1D1F]"
                    }`}
                    title="Unit rate already includes GST (MRP)"
                  >
                    Inclusive (MRP)
                  </button>
                </div>
              </div>

              {/* Clean Horizontal Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mb-4">
                {/* Instant Product Search Field */}
                <div className="relative flex-1">
                  <div className="relative">
                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6E73]"
                    />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search product by name, SKU or barcode..."
                      value={productSearchQuery}
                      onChange={(e) => {
                        setProductSearchQuery(e.target.value);
                        setShowProductSearchResults(true);
                      }}
                      onFocus={() => {
                        if (productSearchQuery.trim()) setShowProductSearchResults(true);
                      }}
                      className="w-full pl-9 pr-8 py-2 text-xs sm:text-[13px] border border-[#E5E5EA] rounded-xl outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition bg-white text-[#1D1D1F] placeholder-[#6E6E73]/60"
                    />
                    {productSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setProductSearchQuery("");
                          setShowProductSearchResults(false);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6E6E73] hover:text-[#1D1D1F] p-0.5"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Search Results Popover */}
                  {showProductSearchResults && productSearchQuery.trim() && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setShowProductSearchResults(false)}
                      />
                      <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-[#E5E5EA] z-30 max-h-64 overflow-y-auto divide-y divide-[#E5E5EA]">
                        {filteredProducts.length === 0 ? (
                          <div className="p-3 text-center text-xs text-[#6E6E73]">
                            No matching catalog products found.
                          </div>
                        ) : (
                          filteredProducts.map((p) => (
                            <button
                              key={p.id || p._id}
                              type="button"
                              onClick={() => {
                                handleProductScanned(p);
                                setProductSearchQuery("");
                                setShowProductSearchResults(false);
                              }}
                              className="w-full p-2.5 text-left text-xs hover:bg-[#F5F5F7] transition flex items-center justify-between cursor-pointer"
                            >
                              <div>
                                <p className="font-semibold text-[#1D1D1F]">{p.name}</p>
                                <p className="text-[11px] text-[#6E6E73]">
                                  SKU: {p.sku || p.barcode || "N/A"} &bull; HSN: {p.hsn || "1904"}{" "}
                                  &bull; Stock: {p.stock ?? 0}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="font-semibold text-[#1D1D1F]">
                                  ₹{p.sellingPrice || p.price || 0}
                                </span>
                                <span className="block text-[10px] text-[#007AFF] font-medium">
                                  + Add to Bill
                                </span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Toolbar Buttons: Scan Barcode & Add Item */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBarcodeScanner(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border border-[#E5E5EA] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                    title="Scan barcode with camera"
                  >
                    <Scan size={14} className="text-[#007AFF]" />
                    <span>Scan Barcode</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenAddItem}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#007AFF] hover:bg-[#0062CC] text-white transition cursor-pointer shadow-[0_1px_2px_rgba(0,122,255,0.25)]"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                    <span>Add Item</span>
                  </button>
                </div>
              </div>

              {/* Product Table or Empty State */}
              {items.length === 0 ? (
                <div className="py-12 px-4 text-center border border-dashed border-[#E5E5EA] rounded-2xl bg-[#F5F5F7]/40 space-y-3">
                  <div className="w-11 h-11 rounded-2xl bg-white border border-[#E5E5EA] text-[#007AFF] flex items-center justify-center mx-auto shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                    <ShoppingBag size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1D1D1F] text-sm">
                      No items added to bill yet
                    </h3>
                    <p className="text-xs text-[#6E6E73] max-w-sm mx-auto mt-1">
                      Search your catalog, scan a barcode, or add an item to get started.
                    </p>
                  </div>
                  <div className="flex justify-center gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowBarcodeScanner(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#E5E5EA] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7] text-xs font-medium transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                    >
                      <Scan size={14} className="text-[#007AFF]" />
                      <span>Scan Barcode</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenAddItem}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-semibold transition cursor-pointer shadow-[0_1px_2px_rgba(0,122,255,0.25)]"
                    >
                      <Plus size={14} />
                      <span>Add First Item</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  ref={itemsTableRef}
                  onKeyDown={(e) =>
                    handleTableKeyDown(e, itemsTableRef.current, {
                      onAddRow: () => searchInputRef.current?.focus(),
                      onComplete: () => searchInputRef.current?.focus(),
                    })
                  }
                  className="overflow-x-auto rounded-xl border border-[#E5E5EA]"
                >
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#F5F5F7] border-b border-[#E5E5EA] text-[#6E6E73] font-semibold text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Product Name</th>
                        <th className="py-2.5 px-2 text-center w-16">SKU / HSN</th>
                        <th className="py-2.5 px-2 text-center w-16">Unit</th>
                        <th className="py-2.5 px-2 text-center w-28">Quantity</th>
                        <th className="py-2.5 px-2 text-right w-20">Price (₹)</th>
                        <th className="py-2.5 px-2 text-center w-20">GST Mode</th>
                        <th className="py-2.5 px-2 text-center w-16">GST (%)</th>
                        <th className="py-2.5 px-2 text-center w-16">Disc (₹)</th>
                        <th className="py-2.5 px-2 text-right w-20">Taxable (₹)</th>
                        <th className="py-2.5 px-2 text-right w-16">GST (₹)</th>
                        <th className="py-2.5 px-3 text-right w-24">Total (₹)</th>
                        <th className="py-2.5 px-1.5 text-center w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5EA] bg-white">
                      {items.map((item, idx) => {
                        const calculated = calculatedItems[idx];
                        const isLowStock =
                          item.stock !== undefined && item.stock > 0 && item.qty > item.stock;

                        return (
                          <tr
                            key={item.id || idx}
                            className="text-[#1D1D1F] hover:bg-[#F5F5F7]/50 transition"
                          >
                            <td className="py-2.5 px-3">
                              <p className="font-semibold text-[#1D1D1F] truncate max-w-[150px]">
                                {item.name}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-[#6E6E73]">
                                {item.sku && <span>SKU: {item.sku}</span>}
                                {isLowStock && (
                                  <span className="text-[#9A6700] font-medium bg-[#FFF8EB] px-1 py-0.2 rounded text-[9px]">
                                    Stock: {item.stock}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-2.5 px-2 text-center font-mono text-[11px] text-[#6E6E73]">
                              {item.hsn || item.sku || "1904"}
                            </td>

                            {/* Unit column */}
                            <td className="py-2.5 px-2 text-center">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 capitalize border border-slate-200/60">
                                {item.unit || "piece"}
                              </span>
                            </td>

                            {/* Quantity column with - / + buttons (Requirements 3 & 6) */}
                            <td className="py-2.5 px-2 text-center">
                              <div className="inline-flex items-center border border-[#E5E5EA] rounded-lg bg-white overflow-hidden shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...items];
                                    const step = isDecimalUnit(item.unit) ? 0.5 : 1;
                                    const minVal = isDecimalUnit(item.unit) ? 0.001 : 1;
                                    const newQty = Math.max(minVal, Number((Number(updated[idx].qty || 1) - step).toFixed(3)));
                                    updated[idx].qty = newQty;
                                    setItems(updated);
                                  }}
                                  className="w-6 h-7 flex items-center justify-center text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer select-none font-bold text-xs"
                                  title="Decrease quantity"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  step={isDecimalUnit(item.unit) ? "any" : "1"}
                                  min="0.001"
                                  data-table-row={idx}
                                  data-table-col={0}
                                  value={item.qty}
                                  onChange={(e) => {
                                    const minVal = isDecimalUnit(item.unit) ? 0.001 : 1;
                                    const val = Math.max(minVal, Number(e.target.value));
                                    const updated = [...items];
                                    if (item.stock && val > item.stock) {
                                      notify("warning", `Sale quantity (${val}) exceeds available stock (${item.stock})`);
                                    }
                                    updated[idx].qty = val;
                                    setItems(updated);
                                  }}
                                  className="w-12 h-7 text-center font-bold text-[#1D1D1F] outline-none border-x border-[#E5E5EA] bg-transparent text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...items];
                                    const step = isDecimalUnit(item.unit) ? 0.5 : 1;
                                    const newQty = Number((Number(updated[idx].qty || 1) + step).toFixed(3));
                                    if (item.stock && newQty > item.stock) {
                                      notify("warning", `Sale quantity (${newQty}) exceeds available inventory (${item.stock})`);
                                    }
                                    updated[idx].qty = newQty;
                                    setItems(updated);
                                  }}
                                  className="w-6 h-7 flex items-center justify-center text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer select-none font-bold text-xs"
                                  title="Increase quantity"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            {/* Price */}
                            <td className="py-2.5 px-2 text-right">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                data-table-row={idx}
                                data-table-col={1}
                                value={item.rate}
                                onChange={(e) => {
                                  const updated = [...items];
                                  updated[idx].rate = Math.max(0, Number(e.target.value));
                                  setItems(updated);
                                }}
                                className="w-16 py-1 px-1 border border-[#E5E5EA] rounded-lg text-right font-mono text-[#1D1D1F] outline-none focus:border-[#007AFF] bg-white text-xs"
                              />
                            </td>

                            {/* GST Mode Badge */}
                            <td className="py-2.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...items];
                                  updated[idx].isTaxInclusive = !calculated?.isTaxInclusive;
                                  setItems(updated);
                                }}
                                className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider cursor-pointer border transition ${
                                  calculated?.isTaxInclusive
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                    : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                }`}
                                title="Click to toggle Inclusive/Exclusive GST calculation"
                              >
                                {calculated?.isTaxInclusive ? "Inc (MRP)" : "Exc (+Tax)"}
                              </button>
                            </td>

                            {/* GST Rate */}
                            <td className="py-2.5 px-2 text-center text-[#6E6E73] font-medium font-mono text-xs">
                              {item.gst}%
                            </td>

                            {/* Discount */}
                            <td className="py-2.5 px-2 text-center">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                data-table-row={idx}
                                data-table-col={2}
                                value={item.discount}
                                onChange={(e) => {
                                  const updated = [...items];
                                  updated[idx].discount = Math.max(0, Number(e.target.value));
                                  setItems(updated);
                                }}
                                className="w-14 py-1 px-1 border border-[#E5E5EA] rounded-lg text-center font-mono text-[#1D1D1F] outline-none focus:border-[#007AFF] bg-white text-xs"
                              />
                            </td>

                            {/* Taxable Amount */}
                            <td className="py-2.5 px-2 text-right font-mono text-[#6E6E73] text-[11px]">
                              ₹{calculated ? calculated.taxable.toFixed(2) : "0.00"}
                            </td>

                            {/* GST Amount */}
                            <td className="py-2.5 px-2 text-right font-mono text-[#6E6E73] text-[11px]">
                              ₹{calculated ? calculated.tax.toFixed(2) : "0.00"}
                            </td>

                            {/* Line Total */}
                            <td className="py-2.5 px-3 text-right font-bold text-[#1D1D1F] font-mono text-xs">
                              ₹{calculated ? calculated.total.toFixed(2) : "0.00"}
                            </td>

                            <td className="py-2.5 px-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1.5 text-[#6E6E73] hover:text-[#D70015] hover:bg-[#FFF2F2] rounded-lg transition cursor-pointer"
                                title="Remove line item"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* ── 4. Payment & Settlement Section ── */}
            <section className="bg-white rounded-2xl border border-[#E5E5EA] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E5EA]">
                <div>
                  <h2 className="text-sm sm:text-base font-semibold text-[#1D1D1F] tracking-tight">
                    Payment &amp; Settlement
                  </h2>
                  <p className="text-xs text-[#6E6E73] font-normal mt-0.5">
                    Select tender method, record amount received, or generate UPI QR
                  </p>
                </div>
              </div>

              {/* Quick tender mode shortcuts */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => handleQuickPayment("Cash", "Paid")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer border ${
                    paymentMode === "Cash" && paymentStatus === "Paid"
                      ? "bg-[#007AFF] text-white border-[#007AFF] shadow-xs"
                      : "bg-white text-[#1D1D1F] border-[#E5E5EA] hover:bg-[#F5F5F7]"
                  }`}
                >
                  ✓ Cash Paid
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickPayment("UPI", "Paid")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer border ${
                    paymentMode === "UPI" && paymentStatus === "Paid"
                      ? "bg-[#007AFF] text-white border-[#007AFF] shadow-xs"
                      : "bg-white text-[#1D1D1F] border-[#E5E5EA] hover:bg-[#F5F5F7]"
                  }`}
                >
                  ✓ UPI Paid
                </button>

                <button
                  type="button"
                  onClick={() => setShowUpiModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-[#E5E5EA] bg-white text-[#007AFF] hover:bg-[#F5F5F7] transition cursor-pointer"
                >
                  <QrCode size={14} className="text-[#007AFF]" />
                  <span>Request UPI (QR)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowBarcodeScanner(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-[#E5E5EA] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer"
                >
                  <Scan size={14} className="text-[#6E6E73]" />
                  <span>Barcode Scanner</span>
                </button>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Payment Status */}
                <div>
                  <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">
                    Payment Status
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPaymentStatus(val);
                      if (val === "Paid") setAmountReceived(grandTotal);
                      else if (val === "Unpaid") setAmountReceived(0);
                    }}
                    className="w-full px-3 py-2 text-xs sm:text-[13px] border border-[#E5E5EA] rounded-xl bg-white outline-none focus:border-[#007AFF] text-[#1D1D1F]"
                  >
                    <option value="Paid">Fully Paid</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Unpaid">Unpaid / Credit</option>
                  </select>
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-[13px] border border-[#E5E5EA] rounded-xl bg-white outline-none focus:border-[#007AFF] text-[#1D1D1F]"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="Card">Debit / Credit Card</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                  </select>
                </div>

                {/* Amount Received */}
                <div>
                  <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">
                    Amount Received (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs sm:text-[13px] border border-[#E5E5EA] rounded-xl font-mono font-medium outline-none focus:border-[#007AFF] bg-white text-[#1D1D1F]"
                  />
                </div>
              </div>

              {/* Tender Balance Indicators */}
              <div className="mt-4 pt-3.5 border-t border-[#E5E5EA] flex flex-wrap items-center justify-between gap-2 text-xs">
                {changeDue > 0 ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#EDF8F0] border border-[#CCE8D4] text-[#248A3D] font-medium">
                    <span>Change Due to Customer:</span>
                    <strong className="font-mono font-bold">₹{changeDue.toFixed(2)}</strong>
                  </div>
                ) : balanceDue > 0 ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FFF8EB] border border-[#FBE3B5] text-[#9A6700] font-medium">
                    <span>Balance Remaining Due:</span>
                    <strong className="font-mono font-bold">₹{balanceDue.toFixed(2)}</strong>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#EDF8F0] border border-[#CCE8D4] text-[#248A3D] font-medium">
                    <span>✓ Bill fully settled</span>
                  </div>
                )}
                <span className="text-[11px] text-[#6E6E73]">
                  Selected tender: <strong>{paymentMode}</strong> ({paymentStatus})
                </span>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: Bill Summary, Primary Checkout Actions, Live Invoice Preview */}
          <div className="lg:col-span-5 xl:col-span-4 sticky top-6 space-y-4">
            {/* ── 5. Bill Summary Card ── */}
            <section className="bg-white rounded-2xl border border-[#E5E5EA] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-3.5">
              <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E5EA]">
                <h2 className="text-sm font-semibold text-[#1D1D1F] tracking-tight">
                  Bill Summary
                </h2>
                <span className="text-[11px] text-[#6E6E73]">
                  {items.length} {items.length === 1 ? "item" : "items"}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-[#6E6E73]">
                  <span>Subtotal</span>
                  <span className="font-mono text-[#1D1D1F]">₹{subtotal.toFixed(2)}</span>
                </div>

                {totalDiscount > 0 && (
                  <div className="flex justify-between text-[#248A3D]">
                    <span>Item Discounts</span>
                    <span className="font-mono">-₹{totalDiscount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-[#6E6E73]">
                  <span>Taxable Amount</span>
                  <span className="font-mono text-[#1D1D1F]">₹{subtotal.toFixed(2)}</span>
                </div>

                {/* GST breakdown */}
                {isInterState ? (
                  <div className="flex justify-between text-[#6E6E73]">
                    <span>IGST</span>
                    <span className="font-mono text-[#1D1D1F]">₹{igst.toFixed(2)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-[#6E6E73]">
                      <span>CGST</span>
                      <span className="font-mono text-[#1D1D1F]">₹{cgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[#6E6E73]">
                      <span>SGST</span>
                      <span className="font-mono text-[#1D1D1F]">₹{sgst.toFixed(2)}</span>
                    </div>
                  </>
                )}

                {roundOff !== 0 && (
                  <div className="flex justify-between text-[#6E6E73]">
                    <span>Round Off</span>
                    <span className="font-mono text-[#1D1D1F]">
                      {roundOff > 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Prominent Grand Total */}
              <div className="pt-3 border-t border-[#E5E5EA] flex items-baseline justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#6E6E73] block">
                    Grand Total
                  </span>
                  <span className="text-[11px] text-[#6E6E73]">
                    {taxInclusive ? "Tax Inclusive (MRP)" : "Tax Exclusive"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-bold text-[#1D1D1F] font-mono tracking-tight">
                    ₹{grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </section>

            {/* ── 6. Primary Checkout Actions Bar ── */}
            <div className="bg-white rounded-2xl border border-[#E5E5EA] p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-2">
              {/* Primary action: Save & Print */}
              <button
                type="button"
                onClick={() => handleSaveBill(true)}
                disabled={savingBill || items.length === 0}
                className="w-full py-2.5 px-4 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] disabled:opacity-40 text-white text-xs sm:text-[13px] font-semibold transition cursor-pointer shadow-[0_1px_2px_rgba(0,122,255,0.25)] flex items-center justify-center gap-2"
                title="Save sale permanently to database and open printable Tax Invoice"
              >
                <Printer size={15} />
                <span>{savingBill ? "Processing Invoice..." : "Save & Print Invoice"}</span>
              </button>

              {/* Secondary action: Complete Sale (Save without print modal) */}
              <button
                type="button"
                onClick={() => handleSaveBill(false)}
                disabled={savingBill || items.length === 0}
                className="w-full py-2 px-3 rounded-xl border border-[#E5E5EA] bg-[#F5F5F7] hover:bg-[#E5E5EA] disabled:opacity-40 text-[#1D1D1F] text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
                title="Save sale and prepare fresh bill"
              >
                <Check size={14} className="text-[#248A3D]" />
                <span>Complete Sale (Quick Save)</span>
              </button>

              {/* Utility Row: Hold Bill, PDF View, Clear */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={handleHoldBill}
                  disabled={items.length === 0}
                  className="py-1.5 px-2 rounded-lg border border-[#E5E5EA] bg-white hover:bg-[#F5F5F7] disabled:opacity-40 text-[#9A6700] text-[11px] font-medium transition cursor-pointer flex items-center justify-center gap-1"
                  title="Hold bill to serve next customer without losing cart"
                >
                  <Clock size={13} />
                  <span>Hold</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const snapshot = generateCurrentInvoiceSnapshot();
                    setCompletedInvoice(snapshot);
                    setShowInvoiceModal(true);
                  }}
                  disabled={items.length === 0}
                  className="py-1.5 px-2 rounded-lg border border-[#E5E5EA] bg-white hover:bg-[#F5F5F7] disabled:opacity-40 text-[#007AFF] text-[11px] font-medium transition cursor-pointer flex items-center justify-center gap-1"
                  title="View PDF preview modal"
                >
                  <Eye size={13} />
                  <span>PDF View</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStartNewBill(true)}
                  className="py-1.5 px-2 rounded-lg border border-[#E5E5EA] bg-white hover:bg-[#FFF2F2] text-[#D70015] text-[11px] font-medium transition cursor-pointer flex items-center justify-center gap-1"
                  title="Clear current invoice"
                >
                  <RotateCcw size={13} />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* ── 7. Live Bill Preview Card ── */}
            <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="px-4 py-3 bg-[#F5F5F7] border-b border-[#E5E5EA] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#248A3D] animate-pulse" />
                  <span className="text-xs font-semibold text-[#1D1D1F]">
                    Live Bill Preview
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLivePreview(!showLivePreview)}
                  className="text-[11px] font-medium text-[#007AFF] hover:underline cursor-pointer flex items-center gap-1"
                >
                  {showLivePreview ? (
                    <>
                      <EyeOff size={13} />
                      <span>Hide</span>
                    </>
                  ) : (
                    <>
                      <Eye size={13} />
                      <span>Show</span>
                    </>
                  )}
                </button>
              </div>

              {showLivePreview && (
                <div className="p-3 overflow-y-auto max-h-[calc(100vh-320px)] bg-white">
                  <TaxInvoice
                    invoice={generateCurrentInvoiceSnapshot()}
                    shopSettings={shopSettings}
                    isModal={false}
                    showActions={false}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Add Item Modal (Clean macOS styling) ── */}
        {showAddItemModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-center justify-center bg-black/40 backdrop-blur-xs">
            <div className="relative w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-[#E5E5EA] animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3.5 border-b border-[#E5E5EA]">
                <div>
                  <h3 className="font-semibold text-[#1D1D1F] text-sm sm:text-base">
                    Add Item to Invoice
                  </h3>
                  <p className="text-xs text-[#6E6E73] mt-0.5">
                    Select from catalog or enter custom line item details
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="text-[#6E6E73] hover:text-[#1D1D1F] p-1 rounded-lg transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form
                ref={addItemModalRef}
                onKeyDown={(e) => handleSmartFormKeyDown(e, addItemModalRef.current)}
                onSubmit={handleSubmitAddItem}
                className="space-y-4 pt-4 text-xs"
              >
                {availableProducts.length > 0 && (
                  <div>
                    <label className="block font-medium text-[#1D1D1F] mb-1">
                      Choose from Catalog (Optional)
                    </label>
                    <select
                      value={itemForm.productId}
                      onChange={(e) => handleProductSelectChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#E5E5EA] bg-white text-[#1D1D1F] outline-none focus:border-[#007AFF]"
                    >
                      <option value="">-- Custom line item --</option>
                      {availableProducts.map((p) => {
                        const id = p.id || p._id;
                        return (
                          <option key={id} value={id}>
                            {p.name} — ₹{p.sellingPrice} (Stock: {p.stock ?? 0})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block font-medium text-[#1D1D1F] mb-1">
                    Item Name <span className="text-[#D70015]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Basmati Rice 5kg or Service Fee"
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E5EA] bg-white text-[#1D1D1F] outline-none focus:border-[#007AFF]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-[#1D1D1F] mb-1">HSN / SAC Code</label>
                    <input
                      type="text"
                      placeholder="e.g. 1904"
                      value={itemForm.hsn}
                      onChange={(e) => setItemForm({ ...itemForm, hsn: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#E5E5EA] font-mono bg-white text-[#1D1D1F] outline-none focus:border-[#007AFF]"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[#1D1D1F] mb-1">
                      Quantity <span className="text-[#D70015]">*</span>
                    </label>
                    <input
                      type="number"
                      min="0.001"
                      step={isDecimalUnit(itemForm.unit) ? "any" : "1"}
                      required
                      value={itemForm.quantity}
                      onChange={(e) =>
                        setItemForm({
                          ...itemForm,
                          quantity: Math.max(0.001, Number(e.target.value)),
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#E5E5EA] font-semibold bg-white text-[#1D1D1F] outline-none focus:border-[#007AFF]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-[#1D1D1F] mb-1">
                      Unit Rate (₹) <span className="text-[#D70015]">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={itemForm.rate}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, rate: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#E5E5EA] font-mono bg-white text-[#1D1D1F] outline-none focus:border-[#007AFF]"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-[#1D1D1F] mb-1">Discount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={itemForm.discount}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, discount: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#E5E5EA] font-mono bg-white text-[#1D1D1F] outline-none focus:border-[#007AFF]"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-[#1D1D1F] mb-1">GST Rate (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={itemForm.taxRate}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, taxRate: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#E5E5EA] font-mono font-semibold bg-white text-[#1D1D1F] outline-none focus:border-[#007AFF]"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {[0, 5, 12, 18, 28].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setItemForm({ ...itemForm, taxRate: rate })}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${
                            itemForm.taxRate === rate
                              ? "bg-[#007AFF] text-white"
                              : "bg-[#F5F5F7] text-[#6E6E73] hover:text-[#1D1D1F]"
                          }`}
                        >
                          {rate}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Line total preview */}
                <div className="p-3 bg-[#F5F5F7] rounded-xl border border-[#E5E5EA] flex items-center justify-between">
                  <span className="font-medium text-[#6E6E73]">Calculated Line Total:</span>
                  <span className="font-semibold text-[#1D1D1F] font-mono text-sm">
                    ₹
                    {(
                      (itemForm.rate * itemForm.quantity - itemForm.discount) *
                      (1 + itemForm.taxRate / 100)
                    ).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-end gap-2.5 pt-3.5 border-t border-[#E5E5EA]">
                  <button
                    type="button"
                    onClick={() => setShowAddItemModal(false)}
                    className="px-4 py-2 rounded-xl border border-[#E5E5EA] font-medium text-[#6E6E73] hover:bg-[#F5F5F7] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white font-semibold transition cursor-pointer shadow-[0_1px_2px_rgba(0,122,255,0.25)]"
                  >
                    Add to Bill
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── UPI Payment Request Modal ── */}
        {showUpiModal && (
          <UpiPaymentModal
            amount={grandTotal}
            invoiceNumber={billNumber}
            customerName={customerName || "Walk-in Retail Customer"}
            upiId={shopSettings?.upiId || "bilzet@hdfcbank"}
            shopName={shopSettings?.shopName || "BILZET Retail POS"}
            onClose={() => setShowUpiModal(false)}
            onSuccess={(res) => {
              setPaymentMode("UPI");
              setPaymentStatus("Paid");
              setAmountReceived(grandTotal);
              notify("success", `Payment of ₹${grandTotal} confirmed via UPI! Ref: ${res.utr}`);
            }}
          />
        )}

        {/* ── Barcode Scanner Modal ── */}
        <BarcodeScannerModal
          isOpen={showBarcodeScanner}
          onClose={() => setShowBarcodeScanner(false)}
          onProductScanned={handleProductScanned}
          availableProducts={availableProducts}
        />

        {/* ── Held Bills Modal ── */}
        <HeldBillsModal
          isOpen={showHeldBillsModal}
          onClose={() => setShowHeldBillsModal(false)}
          heldBills={heldBills}
          onResumeBill={handleResumeHeldBill}
          onDeleteHeldBill={handleDeleteHeldBill}
          onClearAllHeld={handleClearAllHeld}
        />
      </div>

      {/* ══════════════════════════════════════════════════
          INVOICE MODAL & PRINT CONTAINER
      ══════════════════════════════════════════════════ */}
      {showInvoiceModal && completedInvoice && (
        <TaxInvoice
          invoice={completedInvoice}
          shopSettings={shopSettings}
          isModal={true}
          onClose={() => {
            setShowInvoiceModal(false);
            if (completedInvoice?.persisted) {
              handleStartNewBill(false);
            }
          }}
        />
      )}
    </>
  );
}
