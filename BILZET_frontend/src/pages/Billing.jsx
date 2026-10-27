import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  FileSpreadsheet,
  Share2,
  ArrowRight,
  Send,
} from "lucide-react";
import { settingsApi, productsApi, customersApi, salesApi, subscriptionApi, quotationsApi } from "../api";
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
  const location = useLocation();

  // Document Type Selector: 'invoice' | 'quotation'
  const [documentType, setDocumentType] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get("type") === "quotation" || location.state?.type === "quotation"
      ? "quotation"
      : "invoice";
  });

  // Invoice identifiers
  const [billNumber, setBillNumber] = useState(
    `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);

  // Quotation specific identifiers & properties
  const [quotationNumber, setQuotationNumber] = useState(
    `QUO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [quotationValidityDate, setQuotationValidityDate] = useState(() => {
    const d = new Date(Date.now() + 15 * 86400000);
    return d.toISOString().split("T")[0];
  });
  const [quotationStatus, setQuotationStatus] = useState("DRAFT");
  const [quotationNotes, setQuotationNotes] = useState(
    "Quotation valid for 15 days from date of issue."
  );
  const [quotationTerms, setQuotationTerms] = useState(
    "1. Prices are valid until quotation expiry date.\n2. Payment terms as agreed upon invoice creation.\n3. Taxes as applicable at time of invoicing."
  );

  // Conversion & Editing references
  const [sourceQuotationId, setSourceQuotationId] = useState(null);
  const [referenceQuotationNumber, setReferenceQuotationNumber] = useState(null);
  const [editingQuotationId, setEditingQuotationId] = useState(null);
  const [savedQuotationRecord, setSavedQuotationRecord] = useState(null);
  const [showQuotationActionsModal, setShowQuotationActionsModal] = useState(false);

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
  const [billCredits, setBillCredits] = useState(null);

  useEffect(() => {
    subscriptionApi.getBillCredits().then(setBillCredits).catch(() => {});
  }, []);

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

  // Fetch sequential quotation number from backend
  const fetchNextQuotationNumber = useCallback(async () => {
    try {
      const activeStoreId = localStorage.getItem("bilzet_active_store_id") || undefined;
      const res = await quotationsApi.getNextNumber({ businessId: activeStoreId });
      if (res?.quotationNumber) {
        setQuotationNumber(res.quotationNumber);
        return res.quotationNumber;
      }
    } catch (_) {}
    const fallback = `QUO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    setQuotationNumber(fallback);
    return fallback;
  }, []);

  useEffect(() => {
    fetchNextQuotationNumber();
  }, [fetchNextQuotationNumber]);

  // Helper: Populate quotation details into billing flow for conversion to tax invoice
  const applyQuotationForConversion = useCallback((quote) => {
    if (!quote) return;
    setDocumentType("invoice");
    setBillNumber(`INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setBillDate(new Date().toISOString().split("T")[0]);
    setSourceQuotationId(quote.id || quote._id);
    setReferenceQuotationNumber(quote.quotationNumber);

    if (quote.customerName) setCustomerName(quote.customerName);
    if (quote.customerPhone) setMobileNumber(quote.customerPhone);
    if (quote.customerGstin) {
      setCustomerGstin(quote.customerGstin);
      setShowGstOptions(true);
      setSaleType("B2B — Registered Business");
    }
    if (quote.customerAddress) {
      setCustomerAddress(quote.customerAddress);
      setShowGstOptions(true);
    }
    if (quote.placeOfSupply) {
      const matchState = INDIAN_STATES.find((s) =>
        s.toLowerCase().includes(String(quote.placeOfSupply).toLowerCase())
      );
      if (matchState) setPlaceOfSupply(matchState);
    }

    if (Array.isArray(quote.items) && quote.items.length > 0) {
      setItems(
        quote.items.map((i, idx) => ({
          id: i.productId || i.id || `converted-item-${idx + 1}`,
          productId: i.productId || undefined,
          name: i.name || "Quoted Product",
          sku: i.sku || "",
          hsn: i.hsnCode || i.hsn || "1904",
          unit: i.unit || "piece",
          qty: Number(i.quantity !== undefined ? i.quantity : (i.qty || 1)),
          rate: Number(i.rate !== undefined ? i.rate : (i.price || i.unitPrice || 0)),
          discount: Number(i.discount || 0),
          gstRate: Number(i.gstRate !== undefined ? i.gstRate : 18),
          isTaxInclusive: Boolean(i.isTaxInclusive || i.pricingMethod === "INCLUSIVE"),
        }))
      );
    }

    notify(
      "success",
      `Quotation #${quote.quotationNumber} loaded for conversion into Invoice. Review details before issuing.`
    );
  }, []);

  // Helper: Populate quotation details into billing flow for editing
  const applyQuotationForEditing = useCallback((quote) => {
    if (!quote) return;
    setDocumentType("quotation");
    setEditingQuotationId(quote.id || quote._id);
    setQuotationNumber(quote.quotationNumber);
    if (quote.quotationDate) setBillDate(quote.quotationDate.split("T")[0]);
    if (quote.expiryDate) setQuotationValidityDate(quote.expiryDate.split("T")[0]);
    if (quote.status) setQuotationStatus(quote.status);
    if (quote.notes) setQuotationNotes(quote.notes);
    if (quote.terms) setQuotationTerms(quote.terms);

    if (quote.customerName) setCustomerName(quote.customerName);
    if (quote.customerPhone) setMobileNumber(quote.customerPhone);
    if (quote.customerGstin) {
      setCustomerGstin(quote.customerGstin);
      setShowGstOptions(true);
    }
    if (quote.customerAddress) {
      setCustomerAddress(quote.customerAddress);
      setShowGstOptions(true);
    }

    if (Array.isArray(quote.items) && quote.items.length > 0) {
      setItems(
        quote.items.map((i, idx) => ({
          id: i.productId || i.id || `edit-quote-item-${idx + 1}`,
          productId: i.productId || undefined,
          name: i.name || "Quoted Product",
          sku: i.sku || "",
          hsn: i.hsnCode || i.hsn || "1904",
          unit: i.unit || "piece",
          qty: Number(i.quantity !== undefined ? i.quantity : (i.qty || 1)),
          rate: Number(i.rate !== undefined ? i.rate : (i.price || i.unitPrice || 0)),
          discount: Number(i.discount || 0),
          gstRate: Number(i.gstRate !== undefined ? i.gstRate : 18),
          isTaxInclusive: Boolean(i.isTaxInclusive || i.pricingMethod === "INCLUSIVE"),
        }))
      );
    }

    notify("success", `Quotation #${quote.quotationNumber} loaded for editing.`);
  }, []);

  // Handle Quotation Conversion or Editing from Navigation State / Query Params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const convertQuotationId = params.get("convertQuotation");
    const editQuotationId = params.get("editQuotation") || params.get("quotationId");
    const quoteToConvert = location.state?.quotationToConvert;
    const quoteToEdit = location.state?.editQuotation;

    if (quoteToConvert) {
      applyQuotationForConversion(quoteToConvert);
    } else if (convertQuotationId) {
      quotationsApi
        .get(convertQuotationId)
        .then((res) => {
          const q = res?.quotation || res?.data?.quotation || res;
          if (q) applyQuotationForConversion(q);
        })
        .catch(() => {});
    } else if (quoteToEdit) {
      applyQuotationForEditing(quoteToEdit);
    } else if (editQuotationId) {
      quotationsApi
        .get(editQuotationId)
        .then((res) => {
          const q = res?.quotation || res?.data?.quotation || res;
          if (q) applyQuotationForEditing(q);
        })
        .catch(() => {});
    } else if (params.get("type") === "quotation") {
      setDocumentType("quotation");
    }
  }, [location.search, location.state, applyQuotationForConversion, applyQuotationForEditing]);

  // Document Type Switching handler
  const handleSwitchDocumentType = async (type) => {
    if (type === documentType) return;
    if (type === "quotation") {
      if (!quotationNumber) {
        await fetchNextQuotationNumber();
      }
      setDocumentType("quotation");
      notify("success", "Switched to Quotation mode.");
    } else {
      setDocumentType("invoice");
      notify("success", "Switched to Invoice mode.");
    }
  };

  // Product-wise GST and Taxable value calculations using shared taxCalculation service
  const calculatedItems = useMemo(() => {
    return items.map((i) => {
      const rate = Number(i.rate || 0);
      const qty = Number(i.qty || 1);
      // Support both item.discountPercent and item.discount
      const discount =
        i.discountPercent !== undefined
          ? Number(((rate * qty * Number(i.discountPercent)) / 100).toFixed(2))
          : Number(i.discount || 0);
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
        discount,
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
    () => Number(calculatedItems.reduce((acc, i) => acc + Number(i.discount || 0), 0).toFixed(2)),
    [calculatedItems]
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
    const parsedQty = parseFloat(itemForm.quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
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
      qty: parsedQty,
      rate: Math.max(0, parseFloat(itemForm.rate) || 0),
      discount: Math.max(0, parseFloat(itemForm.discount) || 0),
      gst: Math.max(0, parseFloat(itemForm.taxRate) || 0),
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

  // Helper to build complete invoice/quotation snapshot for live preview and printing
  const generateCurrentInvoiceSnapshot = () => ({
    documentType,
    type: documentType,
    isQuotation: documentType === "quotation",
    invoiceNumber: documentType === "quotation" ? quotationNumber : billNumber,
    billNumber: documentType === "quotation" ? quotationNumber : billNumber,
    quotationNumber: documentType === "quotation" ? quotationNumber : (referenceQuotationNumber || null),
    createdAt: billDate,
    date: billDate,
    quotationDate: billDate,
    expiryDate: quotationValidityDate,
    validUntil: quotationValidityDate,
    status: documentType === "quotation" ? quotationStatus : "COMPLETED",
    notes: documentType === "quotation" ? quotationNotes : (shopSettings?.notes || undefined),
    terms: documentType === "quotation" ? quotationTerms : (shopSettings?.terms || undefined),
    saleType,
    placeOfSupply,
    paymentStatus: documentType === "quotation" ? quotationStatus : paymentStatus,
    paymentMethod: paymentMode,
    customer: {
      name: customerName || (documentType === "quotation" ? "Prospective Customer" : "Walk-in Retail Customer"),
      phone: mobileNumber || "+91 98000 00000",
      address: customerAddress || (documentType === "quotation" ? "" : "Counter Sale / Walk-in Customer"),
      gstin: customerGstin || "",
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
      unit: i.unit || "piece",
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
    roundOff: documentType === "quotation" ? 0 : roundOff,
    grandTotal: documentType === "quotation" ? Number(grandTotal.toFixed(2)) : grandTotal,
    cgst,
    sgst,
    igst,
    paidAmount: documentType === "quotation" ? 0 : (paymentStatus === "Paid" ? grandTotal : amountReceived),
    received: documentType === "quotation" ? 0 : (paymentStatus === "Paid" ? grandTotal : amountReceived),
    balanceDue: documentType === "quotation" ? 0 : balanceDue,
    changeDue: documentType === "quotation" ? 0 : changeDue,
    taxInclusive,
    pricingMethod: taxInclusive ? "INCLUSIVE" : "EXCLUSIVE",
  });

  // Save Bill & Complete Sale (Invoice Workflow)
  const handleSaveBill = async (openPrintModal = false) => {
    if (billCredits && !billCredits.isUnlimited && billCredits.totalRemaining <= 0) {
      notify(
        "error",
        "You have reached the Free plan limit of 100 bills. Upgrade to Pro for unlimited bills or purchase a 500-bill pack."
      );
      return;
    }

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
        quotationId: sourceQuotationId || undefined,
        referenceQuotationNumber: referenceQuotationNumber || undefined,
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

      const msg = sourceQuotationId
        ? `Quotation #${referenceQuotationNumber} converted to Official Invoice #${finalInvoiceNumber}!`
        : `Invoice ${finalInvoiceNumber} permanently saved in database!`;

      notify("success", msg);
      subscriptionApi.getBillCredits().then(setBillCredits).catch(() => {});

      setSourceQuotationId(null);
      setReferenceQuotationNumber(null);

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

  // Save Quotation (Quotation Workflow — Never deducts stock or creates final invoice)
  const handleSaveQuotation = async (action = "modal") => {
    if (!customerName.trim()) {
      notify("error", "Please enter customer name for the quotation.");
      if (customerSectionRef.current) {
        customerSectionRef.current.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    if (items.length === 0) {
      notify("error", "Please add at least one item to the quotation before saving.");
      return;
    }

    if (savingBill) return;
    setSavingBill(true);

    try {
      const activeStoreId = localStorage.getItem("bilzet_active_store_id") || undefined;
      const quotationPayload = {
        quotationNumber,
        quotationDate: billDate,
        expiryDate: quotationValidityDate,
        businessId: activeStoreId,
        status: quotationStatus,
        customerName: customerName.trim(),
        customerPhone: mobileNumber.trim() || undefined,
        customerAddress: customerAddress || undefined,
        customerGstin: customerGstin || undefined,
        notes: quotationNotes,
        terms: quotationTerms,
        taxInclusive,
        items: calculatedItems.map((i) => ({
          productId: i.productId || undefined,
          name: i.name,
          sku: i.sku || i.code || undefined,
          hsn: i.hsn || "1904",
          hsnCode: i.hsn || "1904",
          unit: i.unit || "piece",
          quantity: i.qty,
          rate: i.rate,
          discount: i.discount || 0,
          gstRate: i.gst !== undefined ? i.gst : (i.gstRate || 18),
          isTaxInclusive: i.isTaxInclusive,
          pricingMethod: i.isTaxInclusive ? "INCLUSIVE" : "EXCLUSIVE",
        })),
        subtotal,
        discountTotal,
        taxTotal: taxAmount,
        grandTotal,
      };

      let savedQuote;
      if (editingQuotationId) {
        const res = await quotationsApi.update(editingQuotationId, quotationPayload);
        savedQuote = res?.quotation || res?.data?.quotation || res;
        notify("success", `Quotation #${quotationNumber} updated successfully!`);
      } else {
        const res = await quotationsApi.create(quotationPayload);
        savedQuote = res?.quotation || res?.data?.quotation || res;
        notify("success", `Quotation #${quotationNumber} saved successfully!`);
      }

      setSavedQuotationRecord(savedQuote);
      const snapshot = {
        ...generateCurrentInvoiceSnapshot(),
        id: savedQuote?.id || savedQuote?._id,
        _id: savedQuote?.id || savedQuote?._id,
      };
      setCompletedInvoice(snapshot);

      if (action === "print") {
        setShowInvoiceModal(true);
      } else {
        setShowQuotationActionsModal(true);
      }
    } catch (err) {
      notify("error", err?.response?.data?.message || err?.message || "Failed to save quotation");
    } finally {
      setSavingBill(false);
    }
  };

  // Convert loaded quotation into an official invoice with review
  const handleConvertLoadedQuotationToInvoice = (quote) => {
    const q = quote || savedQuotationRecord;
    if (!q) return;

    setDocumentType("invoice");
    setBillNumber(`INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setBillDate(new Date().toISOString().split("T")[0]);
    setSourceQuotationId(q.id || q._id);
    setReferenceQuotationNumber(q.quotationNumber);
    setEditingQuotationId(null);

    notify(
      "success",
      `Quotation #${q.quotationNumber} converted to Invoice mode! Review details below and click 'Save & Print Invoice' to finalize.`
    );
  };

  // Share Quotation via WhatsApp, Native Share, or Clipboard
  const handleShareQuotation = (quote) => {
    const q = quote || savedQuotationRecord;
    const qNum = q?.quotationNumber || quotationNumber;
    const shareText = `Quotation #${qNum} from ${shopSettings?.shopName || "BILZET"}\nCustomer: ${customerName || "Valued Customer"}\nTotal Quoted Amount: ₹${grandTotal.toFixed(2)}\nValidity: Valid until ${quotationValidityDate}\nStatus: ${quotationStatus}`;

    if (navigator.share) {
      navigator
        .share({
          title: `Quotation #${qNum}`,
          text: shareText,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      notify("success", "Quotation summary copied to clipboard! You can share via WhatsApp or Email.");
    }
  };

  // Global Billing Shortcuts: Ctrl+S to save draft/bill, F2 for new bill, F4 for hold bill
  useEffect(() => {
    const handleBillingShortcuts = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        if (documentType === "quotation") {
          handleSaveQuotation("modal");
        } else {
          handleSaveBill(false);
        }
      } else if (e.key === "F2") {
        e.preventDefault();
        handleStartNewBill(true);
      } else if (e.key === "F4") {
        e.preventDefault();
        if (documentType === "invoice") {
          handleHoldBill();
        }
      }
    };
    window.addEventListener("keydown", handleBillingShortcuts);
    return () => window.removeEventListener("keydown", handleBillingShortcuts);
  }, [items, savingBill, documentType, quotationNumber, billNumber, billDate, customerName, mobileNumber, customerAddress, customerGstin, saleType, taxInclusive, roundOff, calculatedItems, subtotal, taxAmount, grandTotal, amountReceived, paymentMode, paymentStatus]);

  return (
    <>
      {/* ══════════════════════════════════════════════════
          POS SCREEN — macOS-INSPIRED PREMIUM UI
      ══════════════════════════════════════════════════ */}
      <div className="pos-screen min-h-screen bg-[#F5F5F7] text-[#1D1D1F] p-3 sm:p-5 lg:p-7 space-y-5 fade-up font-sans">
        {/* ── 1. POS Page Header ── */}
        <header className="bg-white rounded-2xl border border-[#E5E5EA] px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition ${
                documentType === "quotation"
                  ? "bg-purple-50 border-purple-200 text-purple-600"
                  : "bg-[#F5F5F7] border-[#E5E5EA] text-[#007AFF]"
              }`}
            >
              {documentType === "quotation" ? (
                <FileSpreadsheet size={20} strokeWidth={2} />
              ) : (
                <Receipt size={20} strokeWidth={2} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-semibold text-[#1D1D1F] tracking-tight">
                  {documentType === "quotation" ? "Create Quotation" : "Point of Sale & New Bill"}
                </h1>
                {documentType === "quotation" ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[11px] font-semibold border border-purple-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
                    <span>Quotation Mode</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EDF8F0] text-[#248A3D] text-[11px] font-medium border border-[#CCE8D4]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#248A3D] animate-pulse" />
                    <span>Active POS</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-[#6E6E73] mt-0.5 font-normal">
                <span>
                  {documentType === "quotation"
                    ? `Quotation #${quotationNumber}`
                    : `Invoice #${billNumber}`}
                </span>
                <span>&bull;</span>
                <span>Date: {billDate}</span>
                {documentType === "quotation" && (
                  <>
                    <span>&bull;</span>
                    <span>Valid Until: {quotationValidityDate}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons & Document Type Selector */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
            {/* Document Type Segmented Control */}
            <div className="inline-flex p-1 bg-[#F5F5F7] rounded-xl border border-[#E5E5EA] shadow-2xs">
              <button
                type="button"
                id="doc-type-invoice-btn"
                onClick={() => handleSwitchDocumentType("invoice")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  documentType === "invoice"
                    ? "bg-white text-[#007AFF] shadow-xs"
                    : "text-[#6E6E73] hover:text-[#1D1D1F]"
                }`}
              >
                <Receipt size={13} />
                <span>Invoice</span>
              </button>
              <button
                type="button"
                id="doc-type-quotation-btn"
                onClick={() => handleSwitchDocumentType("quotation")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  documentType === "quotation"
                    ? "bg-white text-purple-700 shadow-xs"
                    : "text-[#6E6E73] hover:text-[#1D1D1F]"
                }`}
              >
                <FileSpreadsheet size={13} />
                <span>Quotation</span>
              </button>
            </div>

            {/* Held Bills button (Invoices only) */}
            {documentType === "invoice" && (
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
            )}

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

            {/* New Bill / Fresh Document button */}
            <button
              type="button"
              onClick={() => handleStartNewBill(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-[#E5E5EA] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
              title={documentType === "quotation" ? "Start a fresh blank quotation" : "Start a fresh blank invoice"}
            >
              <FilePlus size={14} className="text-[#6E6E73]" />
              <span>{documentType === "quotation" ? "New Quotation" : "New Bill"}</span>
            </button>

            {/* Add Item button (Primary Action in Header) */}
            <button
              type="button"
              onClick={handleOpenAddItem}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.15)] ${
                documentType === "quotation"
                  ? "bg-purple-600 hover:bg-purple-700"
                  : "bg-[#007AFF] hover:bg-[#0062CC]"
              }`}
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>Add Item</span>
            </button>
          </div>
        </header>

        {/* Quotation Conversion Banner */}
        {sourceQuotationId && documentType === "invoice" && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-blue-200 bg-blue-50 text-blue-900 shadow-xs text-xs animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span>
                <strong>Converting Quotation #{referenceQuotationNumber} into Tax Invoice.</strong> Customer details and items are pre-filled below. Review and edit any items or prices, then click <em>Save &amp; Print Invoice</em> to issue the invoice.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSourceQuotationId(null);
                setReferenceQuotationNumber(null);
                notify("info", "Disconnected quotation conversion reference.");
              }}
              className="text-blue-700 hover:text-blue-900 font-semibold underline text-[11px] cursor-pointer"
            >
              Cancel Conversion Link
            </button>
          </div>
        )}

        {/* Free Plan Bill Credits Quota Banner */}
        {billCredits && !billCredits.isUnlimited && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-slate-200 bg-white shadow-xs text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">Free Bill Allowance:</span>
              <span className={`font-medium ${billCredits.totalRemaining <= 10 ? 'text-amber-600 font-bold' : 'text-slate-600'}`}>
                {billCredits.totalRemaining} bills remaining ({billCredits.includedRemaining}/100 included{billCredits.purchasedRemaining > 0 ? ` + ${billCredits.purchasedRemaining} extra pack` : ''})
              </span>
              {billCredits.totalRemaining <= 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 ml-1">
                  Allowance Exhausted
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => nav("/plans?buyPack=true")}
                className="font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                + Buy 500-Bill Pack (₹299)
              </button>
              <button
                type="button"
                onClick={() => nav("/plans?tier=PRO")}
                className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold border border-blue-200 transition cursor-pointer"
              >
                Upgrade to Pro (Unlimited) &rarr;
              </button>
            </div>
          </div>
        )}

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

        {/* ── 50:50 Responsive POS Layout ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
          {/* LEFT 50%: Customer Info, Items & Products, Payment & Settlement */}
          <div className="space-y-5 min-w-0">
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
              <div className="mb-4 pb-3 border-b border-[#E5E5EA]">
                <h2 className="text-sm sm:text-base font-semibold text-[#1D1D1F] tracking-tight">
                  Items &amp; Products
                </h2>
                <p className="text-xs text-[#6E6E73] font-normal mt-0.5">
                  Scan barcodes, search inventory or add custom line items
                </p>
              </div>

              {/* 1. Single Row Product Search & Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mb-4">
                {/* Search Input consuming flexible width */}
                <div className="relative flex-1 min-w-0">
                  <div className="relative flex items-center">
                    <Search
                      size={15}
                      className="absolute left-3.5 text-[#6E6E73] pointer-events-none"
                    />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search products by name, code or scan barcode..."
                      value={productSearchQuery}
                      onChange={(e) => {
                        setProductSearchQuery(e.target.value);
                        setShowProductSearchResults(true);
                      }}
                      onFocus={() => {
                        if (productSearchQuery.trim()) setShowProductSearchResults(true);
                      }}
                      className="w-full h-10 pl-9 pr-16 text-xs sm:text-[13px] border border-[#E5E5EA] rounded-xl outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition bg-white text-[#1D1D1F] placeholder-[#6E6E73]/60 shadow-2xs"
                    />
                    <div className="absolute right-2 flex items-center gap-1">
                      {productSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setProductSearchQuery("");
                            setShowProductSearchResults(false);
                          }}
                          className="p-1 text-[#6E6E73] hover:text-[#1D1D1F] rounded transition cursor-pointer"
                          title="Clear search"
                        >
                          <X size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowBarcodeScanner(true)}
                        className="p-1 text-[#007AFF] hover:bg-blue-50 rounded transition cursor-pointer"
                        title="Scan barcode with camera"
                      >
                        <Scan size={15} />
                      </button>
                    </div>
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

                {/* Pricing Mode Selector (Inclusive MRP vs Exclusive Std) */}
                <div className="h-10 inline-flex items-center p-1 bg-[#F5F5F7] rounded-xl border border-[#E5E5EA] text-xs shrink-0 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setTaxInclusive(true)}
                    className={`h-8 px-3 rounded-lg font-medium transition cursor-pointer text-xs ${
                      taxInclusive
                        ? "bg-white text-[#007AFF] shadow-xs font-semibold"
                        : "text-[#6E6E73] hover:text-[#1D1D1F]"
                    }`}
                    title="Unit rate already includes GST (MRP)"
                  >
                    Inclusive (MRP)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxInclusive(false)}
                    className={`h-8 px-3 rounded-lg font-medium transition cursor-pointer text-xs ${
                      !taxInclusive
                        ? "bg-white text-[#007AFF] shadow-xs font-semibold"
                        : "text-[#6E6E73] hover:text-[#1D1D1F]"
                    }`}
                    title="Tax calculated on top of unit rate"
                  >
                    Exclusive (Std)
                  </button>
                </div>

                {/* Primary Blue "Add Item" Button */}
                <button
                  type="button"
                  id="primary-add-item-btn"
                  onClick={handleOpenAddItem}
                  className="h-10 px-4 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-semibold shrink-0 inline-flex items-center justify-center gap-1.5 shadow-[0_1px_2px_rgba(0,122,255,0.25)] transition cursor-pointer"
                  title="Add custom line item or select from inventory"
                >
                  <Plus size={15} strokeWidth={2.5} />
                  <span>Add Item</span>
                </button>
              </div>

              {/* 2. Product Table or Empty State */}
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
                  className="overflow-x-auto rounded-xl border border-[#E5E5EA] bg-white"
                >
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-[#F8F9FA] border-b border-[#E5E5EA] text-[#6E6E73] font-semibold text-[11px]">
                      <tr>
                        <th className="py-2.5 px-2 text-center w-8">#</th>
                        <th className="py-2.5 px-3 min-w-[170px]">Product / Description</th>
                        <th className="py-2.5 px-2 text-center w-20">HSN/SAC</th>
                        <th className="py-2.5 px-2 text-center w-24">Qty</th>
                        <th className="py-2.5 px-2 text-center w-16">Unit</th>
                        <th className="py-2.5 px-2 text-right w-22">Rate (₹)</th>
                        <th className="py-2.5 px-2 text-center w-18">Disc. (%)</th>
                        <th className="py-2.5 px-2 text-center w-20">GST (%)</th>
                        <th className="py-2.5 px-3 text-right w-24">Amount (₹)</th>
                        <th className="py-2.5 px-2 text-center w-10">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5EA] bg-white">
                      {items.map((item, idx) => {
                        const calculated = calculatedItems[idx];
                        const isLowStock =
                          item.stock !== undefined && item.stock > 0 && item.qty > item.stock;

                        const discountPctValue =
                          item.discountPercent !== undefined
                            ? item.discountPercent
                            : item.rate && item.qty
                            ? Number(((Number(item.discount || 0) / (item.rate * item.qty)) * 100).toFixed(1))
                            : 0;

                        return (
                          <tr
                            key={item.id || idx}
                            className="text-[#1D1D1F] hover:bg-[#F8F9FA]/60 transition"
                          >
                            {/* 1. # */}
                            <td className="py-2.5 px-2 text-center text-[#8E8E93] font-mono text-[11px]">
                              {idx + 1}
                            </td>

                            {/* 2. Product / Description */}
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-7 h-7 rounded-md object-cover border border-[#E5E5EA] shrink-0"
                                  />
                                ) : null}
                                <div className="min-w-0 flex-1">
                                  <p
                                    className="font-medium text-[#1D1D1F] truncate text-xs"
                                    title={item.name}
                                  >
                                    {item.name}
                                  </p>
                                  <div className="flex items-center gap-1.5 text-[10px] text-[#8E8E93] font-mono">
                                    <span>{item.sku || item.code || `PRD-${idx + 1}`}</span>
                                    {isLowStock && (
                                      <span className="text-[#9A6700] font-medium bg-[#FFF8EB] px-1 rounded text-[9px]">
                                        Stock: {item.stock}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* 3. HSN/SAC */}
                            <td className="py-2.5 px-2 text-center">
                              <input
                                type="text"
                                value={item.hsn || ""}
                                placeholder="1904"
                                onChange={(e) => {
                                  const updated = [...items];
                                  updated[idx].hsn = e.target.value;
                                  setItems(updated);
                                }}
                                className="w-16 h-7 text-center font-mono text-[11px] border border-[#E5E5EA] rounded-lg outline-none focus:border-[#007AFF] bg-white text-[#1D1D1F] placeholder-[#8E8E93]"
                              />
                            </td>

                            {/* 4. Qty */}
                            <td className="py-2.5 px-2 text-center">
                              <div className="inline-flex items-center border border-[#E5E5EA] rounded-lg bg-white overflow-hidden h-7 shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...items];
                                    const current = parseFloat(updated[idx].qty) || 1;
                                    const step = isDecimalUnit(item.unit) ? 0.5 : 1;
                                    const minVal = isDecimalUnit(item.unit) ? 0.001 : 1;
                                    const newQty = Math.max(minVal, Number((current - step).toFixed(3)));
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
                                  step="any"
                                  min="0.0001"
                                  data-table-row={idx}
                                  data-table-col={0}
                                  value={item.qty}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const updated = [...items];
                                    if (val === "") {
                                      updated[idx].qty = "";
                                    } else {
                                      const num = Number(val);
                                      if (item.stock && num > item.stock) {
                                        notify("warning", `Sale quantity (${num}) exceeds available stock (${item.stock})`);
                                      }
                                      updated[idx].qty = val;
                                    }
                                    setItems(updated);
                                  }}
                                  onBlur={() => {
                                    const updated = [...items];
                                    const num = parseFloat(item.qty);
                                    if (isNaN(num) || num <= 0) {
                                      updated[idx].qty = isDecimalUnit(item.unit) ? 0.5 : 1;
                                    } else {
                                      updated[idx].qty = num;
                                    }
                                    setItems(updated);
                                  }}
                                  className="w-10 h-7 text-center font-bold text-[#1D1D1F] outline-none border-x border-[#E5E5EA] bg-transparent text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...items];
                                    const current = parseFloat(updated[idx].qty) || 1;
                                    const step = isDecimalUnit(item.unit) ? 0.5 : 1;
                                    const newQty = Number((current + step).toFixed(3));
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

                            {/* 5. Unit */}
                            <td className="py-2.5 px-2 text-center">
                              <select
                                value={item.unit || "piece"}
                                onChange={(e) => {
                                  const updated = [...items];
                                  updated[idx].unit = e.target.value;
                                  setItems(updated);
                                }}
                                className="h-7 px-1.5 text-[11px] font-medium border border-[#E5E5EA] rounded-lg bg-white outline-none focus:border-[#007AFF] text-[#1D1D1F] text-center capitalize cursor-pointer"
                              >
                                <option value="piece">Pcs</option>
                                <option value="kg">kg</option>
                                <option value="gram">g</option>
                                <option value="litre">L</option>
                                <option value="ml">ml</option>
                                <option value="meter">m</option>
                                <option value="box">Box</option>
                                <option value="pack">Pack</option>
                                <option value="set">Set</option>
                              </select>
                            </td>

                            {/* 6. Rate (₹) */}
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
                                className="w-20 h-7 px-2 border border-[#E5E5EA] rounded-lg text-right font-mono font-medium text-[#1D1D1F] outline-none focus:border-[#007AFF] bg-white text-xs"
                              />
                            </td>

                            {/* 7. Disc. (%) */}
                            <td className="py-2.5 px-2 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                placeholder="0"
                                data-table-row={idx}
                                data-table-col={2}
                                value={discountPctValue}
                                onChange={(e) => {
                                  const pct = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                  const updated = [...items];
                                  updated[idx].discountPercent = pct;
                                  const gross = Number(updated[idx].rate || 0) * Number(updated[idx].qty || 1);
                                  updated[idx].discount = Number(((gross * pct) / 100).toFixed(2));
                                  setItems(updated);
                                }}
                                className="w-14 h-7 px-1 border border-[#E5E5EA] rounded-lg text-center font-mono text-[#1D1D1F] outline-none focus:border-[#007AFF] bg-white text-xs"
                              />
                            </td>

                            {/* 8. GST (%) */}
                            <td className="py-2.5 px-2 text-center">
                              <select
                                value={item.gst !== undefined ? item.gst : (item.gstRate !== undefined ? item.gstRate : 18)}
                                data-table-row={idx}
                                data-table-col={3}
                                onChange={(e) => {
                                  const updated = [...items];
                                  const r = Number(e.target.value);
                                  updated[idx].gst = r;
                                  updated[idx].gstRate = r;
                                  setItems(updated);
                                }}
                                className="h-7 px-1.5 border border-[#E5E5EA] rounded-lg text-center font-mono font-medium text-[#1D1D1F] outline-none focus:border-[#007AFF] bg-white text-xs cursor-pointer"
                              >
                                <option value="0">0%</option>
                                <option value="3">3%</option>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option>
                                <option value="28">28%</option>
                              </select>
                            </td>

                            {/* 9. Amount (₹) */}
                            <td className="py-2.5 px-3 text-right font-bold text-[#1D1D1F] font-mono text-xs tabular-nums">
                              ₹{calculated ? calculated.total.toFixed(2) : "0.00"}
                            </td>

                            {/* 10. Actions */}
                            <td className="py-2.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="w-7 h-7 flex items-center justify-center text-[#8E8E93] hover:text-[#D70015] hover:bg-[#FFF2F2] rounded-lg transition cursor-pointer mx-auto"
                                title="Remove item"
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

              {/* 3 & 4. Bottom Row: Left = Add another item, Right = Compact Billing Summary */}
              {items.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-4 mt-3 border-t border-[#E5E5EA]/70">
                  {/* Bottom Left: Add Another Item Button (Requirement 3) */}
                  <div>
                    <button
                      type="button"
                      id="add-another-item-btn"
                      onClick={handleOpenAddItem}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 text-[#007AFF] text-xs font-semibold transition cursor-pointer shadow-2xs"
                      title="Add another line item to bill"
                    >
                      <Plus size={14} strokeWidth={2.5} />
                      <span>Add another item</span>
                    </button>
                  </div>

                  {/* Bottom Right: Compact Billing Summary Card (Requirement 4) */}
                  <div className="w-full sm:w-72 sm:ml-auto bg-white rounded-xl border border-[#E5E5EA] p-3.5 shadow-2xs space-y-2 text-xs">
                    {/* Subtotal */}
                    <div className="flex items-center justify-between text-[#6E6E73]">
                      <span>Subtotal</span>
                      <span className="font-mono text-[#1D1D1F] tabular-nums">
                        ₹{subtotal.toFixed(2)}
                      </span>
                    </div>

                    {/* Discount */}
                    {totalDiscount > 0 && (
                      <div className="flex items-center justify-between text-[#248A3D]">
                        <span>Discount</span>
                        <span className="font-mono tabular-nums">
                          -₹{totalDiscount.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {/* Taxable Amount */}
                    <div className="flex items-center justify-between text-[#6E6E73]">
                      <span>Taxable Amount</span>
                      <span className="font-mono text-[#1D1D1F] tabular-nums">
                        ₹{subtotal.toFixed(2)}
                      </span>
                    </div>

                    {/* GST Breakdown: CGST + SGST (Intra-state) or IGST (Inter-state) */}
                    {isInterState ? (
                      <div className="flex items-center justify-between text-[#6E6E73]">
                        <span>IGST</span>
                        <span className="font-mono text-[#1D1D1F] tabular-nums">
                          ₹{igst.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-[#6E6E73]">
                          <span>CGST</span>
                          <span className="font-mono text-[#1D1D1F] tabular-nums">
                            ₹{cgst.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[#6E6E73]">
                          <span>SGST</span>
                          <span className="font-mono text-[#1D1D1F] tabular-nums">
                            ₹{sgst.toFixed(2)}
                          </span>
                        </div>
                      </>
                    )}

                    {/* Highlighted Grand Total Row with light-blue background and bold text */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/90 border border-blue-200/70 text-blue-950 font-bold mt-1 shadow-2xs">
                      <span className="text-xs uppercase tracking-wide">
                        Grand Total
                      </span>
                      <span className="text-sm sm:text-base font-mono tabular-nums text-blue-700">
                        ₹{grandTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* ── 4. Payment & Settlement Section (Invoice) OR Quotation Details & Validity (Quotation) ── */}
            {documentType === "quotation" ? (
              <section className="bg-white rounded-2xl border border-purple-200/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                      <h2 className="text-sm sm:text-base font-semibold text-[#1D1D1F] tracking-tight">
                        Quotation Validity, Notes &amp; Terms
                      </h2>
                    </div>
                    <p className="text-xs text-[#6E6E73] font-normal mt-0.5">
                      Configure proposal validity period, customer notes, and commercial terms
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg">
                    Status: {quotationStatus}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Validity Date */}
                  <div>
                    <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">
                      Valid Until Date
                    </label>
                    <input
                      type="date"
                      value={quotationValidityDate}
                      onChange={(e) => setQuotationValidityDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-[13px] border border-[#E5E5EA] rounded-xl outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/15 transition bg-white text-[#1D1D1F]"
                    />
                  </div>

                  {/* Quotation Status */}
                  <div>
                    <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">
                      Quotation Status
                    </label>
                    <select
                      value={quotationStatus}
                      onChange={(e) => setQuotationStatus(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-[13px] border border-[#E5E5EA] rounded-xl outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/15 transition bg-white text-[#1D1D1F]"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="SENT">Sent to Customer</option>
                      <option value="ACCEPTED">Accepted by Customer</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="EXPIRED">Expired</option>
                    </select>
                  </div>

                  {/* Customer Notes */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">
                      Customer Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Quotation valid for 15 days from date of issue."
                      value={quotationNotes}
                      onChange={(e) => setQuotationNotes(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-[13px] border border-[#E5E5EA] rounded-xl outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/15 transition bg-white text-[#1D1D1F]"
                    />
                  </div>

                  {/* Terms & Conditions */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">
                      Terms &amp; Conditions
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Commercial terms, payment requirements, delivery timeline..."
                      value={quotationTerms}
                      onChange={(e) => setQuotationTerms(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-[13px] border border-[#E5E5EA] rounded-xl outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/15 transition bg-white text-[#1D1D1F] resize-none"
                    />
                  </div>
                </div>

                {/* Educational Notice */}
                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start gap-2.5">
                  <div className="p-1 rounded-lg bg-purple-200/60 text-purple-800 shrink-0 mt-0.5">
                    <FileSpreadsheet size={14} />
                  </div>
                  <div>
                    <strong className="font-semibold block">Quotation Notice — Not a Tax Invoice</strong>
                    <span className="text-[11px] text-purple-800">
                      Saving this quotation does not record payments, generate tax liabilities, or reduce inventory stock. Once accepted by the customer, you can convert it to an official Tax Invoice with a single click.
                    </span>
                  </div>
                </div>
              </section>
            ) : (
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
            )}
          </div>

          {/* RIGHT 50%: Document Summary, Checkout Actions, Live Document Preview */}
          <div className="sticky top-6 space-y-4 min-w-0">
            {/* ── 5. Document Summary Card ── */}
            <section className="bg-white rounded-2xl border border-[#E5E5EA] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-3.5">
              <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E5EA]">
                <h2 className="text-sm font-semibold text-[#1D1D1F] tracking-tight">
                  {documentType === "quotation" ? "Quotation Summary" : "Bill Summary"}
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

                {documentType === "invoice" && roundOff !== 0 && (
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
                    {documentType === "quotation" ? "Quotation Total" : "Grand Total"}
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

            {/* ── 6. Primary Checkout / Quotation Actions Bar ── */}
            <div className="bg-white rounded-2xl border border-[#E5E5EA] p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-2">
              {documentType === "quotation" ? (
                <>
                  {/* Quotation Primary Action: Save & Print */}
                  <button
                    type="button"
                    id="save-print-quotation-btn"
                    onClick={() => handleSaveQuotation("print")}
                    disabled={savingBill || items.length === 0}
                    className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs sm:text-[13px] font-semibold transition cursor-pointer shadow-[0_1px_2px_rgba(147,51,234,0.25)] flex items-center justify-center gap-2"
                    title="Save quotation and open printable document"
                  >
                    <Printer size={15} />
                    <span>{savingBill ? "Saving Quotation..." : "Save & Print Quotation"}</span>
                  </button>

                  {/* Quotation Secondary Action: Save Quotation */}
                  <button
                    type="button"
                    id="save-quotation-btn"
                    onClick={() => handleSaveQuotation("modal")}
                    disabled={savingBill || items.length === 0}
                    className="w-full py-2 px-3 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 disabled:opacity-40 text-purple-800 text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
                    title="Save quotation draft/proposal without immediate print"
                  >
                    <Check size={14} className="text-purple-600" />
                    <span>Save Quotation (View Options)</span>
                  </button>

                  {/* Convert to Invoice Button if quotation was saved or editing */}
                  {(editingQuotationId || savedQuotationRecord) && (
                    <button
                      type="button"
                      id="convert-quote-to-invoice-btn"
                      onClick={() => handleConvertLoadedQuotationToInvoice(savedQuotationRecord)}
                      className="w-full py-2 px-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                      title="Convert this quotation into an active Tax Invoice"
                    >
                      <ArrowRight size={14} className="text-blue-600" />
                      <span>Convert to Tax Invoice &rarr;</span>
                    </button>
                  )}

                  {/* Quotation Utility Row: Preview, Share, Clear */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const snapshot = generateCurrentInvoiceSnapshot();
                        setCompletedInvoice(snapshot);
                        setShowInvoiceModal(true);
                      }}
                      disabled={items.length === 0}
                      className="py-1.5 px-2 rounded-lg border border-[#E5E5EA] bg-white hover:bg-[#F5F5F7] disabled:opacity-40 text-purple-700 text-[11px] font-medium transition cursor-pointer flex items-center justify-center gap-1"
                      title="Preview quotation document"
                    >
                      <Eye size={13} />
                      <span>Preview</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShareQuotation()}
                      disabled={items.length === 0}
                      className="py-1.5 px-2 rounded-lg border border-[#E5E5EA] bg-white hover:bg-[#F5F5F7] disabled:opacity-40 text-[#007AFF] text-[11px] font-medium transition cursor-pointer flex items-center justify-center gap-1"
                      title="Share quotation via WhatsApp or copy details"
                    >
                      <Share2 size={13} />
                      <span>Share</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartNewBill(true)}
                      className="py-1.5 px-2 rounded-lg border border-[#E5E5EA] bg-white hover:bg-[#FFF2F2] text-[#D70015] text-[11px] font-medium transition cursor-pointer flex items-center justify-center gap-1"
                      title="Clear current quotation form"
                    >
                      <RotateCcw size={13} />
                      <span>Clear</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>

            {/* ── 7. Live Document Preview Card ── */}
            <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="px-4 py-3 bg-[#F5F5F7] border-b border-[#E5E5EA] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full animate-pulse ${
                      documentType === "quotation" ? "bg-purple-600" : "bg-[#248A3D]"
                    }`}
                  />
                  <span className="text-xs font-semibold text-[#1D1D1F]">
                    {documentType === "quotation" ? "Live Quotation Preview" : "Live Bill Preview"}
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
                      min="0.0001"
                      step="any"
                      required
                      value={itemForm.quantity}
                      onChange={(e) =>
                        setItemForm({
                          ...itemForm,
                          quantity: e.target.value,
                        })
                      }
                      onBlur={() => {
                        const parsed = parseFloat(itemForm.quantity);
                        if (isNaN(parsed) || parsed <= 0) {
                          setItemForm({ ...itemForm, quantity: 1 });
                        }
                      }}
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
                      step="any"
                      required
                      value={itemForm.rate}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, rate: e.target.value })
                      }
                      onBlur={() => {
                        const parsed = parseFloat(itemForm.rate);
                        if (isNaN(parsed) || parsed < 0) {
                          setItemForm({ ...itemForm, rate: 0 });
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-[#E5E5EA] font-mono bg-white text-[#1D1D1F] outline-none focus:border-[#007AFF]"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-[#1D1D1F] mb-1">Discount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={itemForm.discount}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, discount: e.target.value })
                      }
                      onBlur={() => {
                        const parsed = parseFloat(itemForm.discount);
                        if (isNaN(parsed) || parsed < 0) {
                          setItemForm({ ...itemForm, discount: 0 });
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-[#E5E5EA] font-mono bg-white text-[#1D1D1F] outline-none focus:border-[#007AFF]"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-[#1D1D1F] mb-1">GST Rate (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      value={itemForm.taxRate}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, taxRate: e.target.value })
                      }
                      onBlur={() => {
                        const parsed = parseFloat(itemForm.taxRate);
                        if (isNaN(parsed) || parsed < 0) {
                          setItemForm({ ...itemForm, taxRate: 0 });
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-[#E5E5EA] font-mono font-semibold bg-white text-[#1D1D1F] outline-none focus:border-[#007AFF]"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {[0, 5, 12, 18, 28].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setItemForm({ ...itemForm, taxRate: rate })}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${
                            Number(itemForm.taxRate) === rate
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
                      (Math.max(0, parseFloat(itemForm.rate) || 0) * (parseFloat(itemForm.quantity) || 0) - Math.max(0, parseFloat(itemForm.discount) || 0)) *
                      (1 + Math.max(0, parseFloat(itemForm.taxRate) || 0) / 100)
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
        {/* ── Quotation Actions Modal ── */}
        {showQuotationActionsModal && savedQuotationRecord && (
          <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-center justify-center bg-black/45 backdrop-blur-xs animate-in fade-in">
            <div className="relative w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-[#E5E5EA] space-y-5 animate-in zoom-in-95">
              <div className="flex items-start justify-between pb-3.5 border-b border-[#E5E5EA]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1D1D1F] text-base">
                      Quotation Saved Successfully!
                    </h3>
                    <p className="text-xs text-[#6E6E73] mt-0.5">
                      Proposal #{savedQuotationRecord.quotationNumber} is securely saved in the system.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuotationActionsModal(false)}
                  className="p-1 rounded-lg text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Quotation Quick Details Card */}
              <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-100 text-xs space-y-1.5">
                <div className="flex justify-between text-purple-950">
                  <span className="font-medium">Quotation Number:</span>
                  <strong className="font-mono">{savedQuotationRecord.quotationNumber}</strong>
                </div>
                <div className="flex justify-between text-purple-950">
                  <span className="font-medium">Customer:</span>
                  <span>{savedQuotationRecord.customerName || customerName}</span>
                </div>
                <div className="flex justify-between text-purple-950">
                  <span className="font-medium">Quoted Total:</span>
                  <strong className="font-mono text-sm">₹{grandTotal.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between text-purple-950">
                  <span className="font-medium">Valid Until:</span>
                  <span>{quotationValidityDate}</span>
                </div>
                <div className="flex justify-between text-purple-950">
                  <span className="font-medium">Current Status:</span>
                  <span className="font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px]">
                    {quotationStatus}
                  </span>
                </div>
              </div>

              {/* Actions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Preview & Download PDF */}
                <button
                  type="button"
                  onClick={() => {
                    setShowQuotationActionsModal(false);
                    setShowInvoiceModal(true);
                  }}
                  className="p-3 rounded-xl border border-[#E5E5EA] hover:border-[#007AFF] bg-white hover:bg-[#F5F5F7] transition cursor-pointer text-left flex items-center gap-3 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#007AFF] group-hover:bg-[#007AFF] group-hover:text-white transition flex items-center justify-center shrink-0">
                    <Eye size={16} />
                  </div>
                  <div>
                    <strong className="text-xs font-semibold text-[#1D1D1F] block">Preview &amp; PDF</strong>
                    <span className="text-[10px] text-[#6E6E73]">Inspect document or download PDF</span>
                  </div>
                </button>

                {/* 2. Print Quotation */}
                <button
                  type="button"
                  onClick={() => {
                    setShowQuotationActionsModal(false);
                    setShowInvoiceModal(true);
                  }}
                  className="p-3 rounded-xl border border-[#E5E5EA] hover:border-purple-600 bg-white hover:bg-[#F5F5F7] transition cursor-pointer text-left flex items-center gap-3 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition flex items-center justify-center shrink-0">
                    <Printer size={16} />
                  </div>
                  <div>
                    <strong className="text-xs font-semibold text-[#1D1D1F] block">Print Quotation</strong>
                    <span className="text-[10px] text-[#6E6E73]">Send to printer or save to PDF</span>
                  </div>
                </button>

                {/* 3. Share Quotation */}
                <button
                  type="button"
                  onClick={() => handleShareQuotation(savedQuotationRecord)}
                  className="p-3 rounded-xl border border-[#E5E5EA] hover:border-emerald-600 bg-white hover:bg-[#F5F5F7] transition cursor-pointer text-left flex items-center gap-3 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition flex items-center justify-center shrink-0">
                    <Share2 size={16} />
                  </div>
                  <div>
                    <strong className="text-xs font-semibold text-[#1D1D1F] block">Share Proposal</strong>
                    <span className="text-[10px] text-[#6E6E73]">WhatsApp, email, or copy link</span>
                  </div>
                </button>

                {/* 4. Convert to Tax Invoice */}
                <button
                  type="button"
                  id="modal-convert-invoice-btn"
                  onClick={() => {
                    setShowQuotationActionsModal(false);
                    handleConvertLoadedQuotationToInvoice(savedQuotationRecord);
                  }}
                  className="p-3 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100 transition cursor-pointer text-left flex items-center gap-3 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <ArrowRight size={16} />
                  </div>
                  <div>
                    <strong className="text-xs font-semibold text-blue-900 block">Convert to Invoice</strong>
                    <span className="text-[10px] text-blue-700">Pre-fill details into POS for sale</span>
                  </div>
                </button>
              </div>

              {/* Footer buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-[#E5E5EA]">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuotationActionsModal(false);
                    handleStartNewBill(true);
                  }}
                  className="text-xs font-medium text-purple-700 hover:text-purple-900 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>Create Another Quotation</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuotationActionsModal(false)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
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
