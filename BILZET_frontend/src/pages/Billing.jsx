import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  Plus,
  ChevronDown,
  ChevronRight,
  Trash2,
  Printer,
  Share2,
  Download,
  Check,
  Eye,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Percent,
  X,
  FilePlus,
  User,
  Phone,
  Clock,
  Receipt,
  Scan,
  FileText,
} from "lucide-react";
import { settingsApi, productsApi, customersApi, salesApi } from "../api";
import TaxInvoice from "../components/invoice/TaxInvoice";
import UpiPaymentModal from "../components/payment/UpiPaymentModal";
import BarcodeScannerModal from "../components/pos/BarcodeScannerModal";
import HeldBillsModal from "../components/pos/HeldBillsModal";
import Logo from "../components/common/Logo";
import Button from "../components/common/Button";

export default function Billing() {
  const nav = useNavigate();
  const [billNumber, setBillNumber] = useState(
    `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);

  // Customer details
  const [customerName, setCustomerName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [saleType, setSaleType] = useState("B2C — Customer");
  const [showGstOptions, setShowGstOptions] = useState(false);
  const [showCustDropdown, setShowCustDropdown] = useState(false);

  // Available data
  const [availableProducts, setAvailableProducts] = useState([]);
  const [availableCustomers, setAvailableCustomers] = useState([]);
  const [items, setItems] = useState([]);

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

  // Sync held bills to localStorage whenever modified
  useEffect(() => {
    try {
      localStorage.setItem("bilzet_held_bills", JSON.stringify(heldBills));
    } catch (e) {
      console.warn("Failed to persist held bills to localStorage:", e);
    }
  }, [heldBills]);

  // Add Item form state
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

  useEffect(() => {
    // Load shop settings
    const local = localStorage.getItem("bilzet_invoice_settings");
    if (local) {
      try {
        setShopSettings(JSON.parse(local));
      } catch (e) {}
    } else {
      settingsApi
        .get()
        .then((res) => {
          if (res) setShopSettings(res);
        })
        .catch(() => {});
    }

    // Load active products from database
    productsApi
      .list({ limit: 100 })
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

  const [taxInclusive, setTaxInclusive] = useState(false);
  const [enableRoundOff, setEnableRoundOff] = useState(true);

  // Sync taxInclusive with shopSettings if configured
  useEffect(() => {
    if (shopSettings?.taxInclusive !== undefined) {
      setTaxInclusive(Boolean(shopSettings.taxInclusive));
    }
  }, [shopSettings]);

  // Product-wise GST and Taxable value calculations (Req 2, 3, 5, 9)
  const calculatedItems = items.map((i) => {
    const rate = Number(i.rate || 0);
    const qty = Number(i.qty || 1);
    const discount = Number(i.discount || 0);
    const gstRate = Number(i.gst !== undefined ? i.gst : (i.gstRate || 0));
    const isItemInclusive = i.isTaxInclusive !== undefined ? Boolean(i.isTaxInclusive) : taxInclusive;

    let taxable = 0;
    let tax = 0;
    let total = 0;

    if (isItemInclusive) {
      const gross = Math.max(0, rate * qty - discount);
      taxable = Number(((gross * 100) / (100 + gstRate)).toFixed(2));
      tax = Number((gross - taxable).toFixed(2));
      total = Number(gross.toFixed(2));
    } else {
      taxable = Math.max(0, rate * qty - discount);
      tax = Number(((taxable * gstRate) / 100).toFixed(2));
      total = Number((taxable + tax).toFixed(2));
    }

    return {
      ...i,
      taxable,
      tax,
      total,
      isTaxInclusive: isItemInclusive,
    };
  });

  const subtotal = Number(calculatedItems.reduce((acc, i) => acc + i.taxable, 0).toFixed(2));
  const taxAmount = Number(calculatedItems.reduce((acc, i) => acc + i.tax, 0).toFixed(2));
  const totalDiscount = Number(items.reduce((acc, i) => acc + Number(i.discount || 0), 0).toFixed(2));

  const rawGrandTotal = Number((subtotal + taxAmount).toFixed(2));
  const roundOff = enableRoundOff ? Number((Math.round(rawGrandTotal) - rawGrandTotal).toFixed(2)) : 0;
  const grandTotal = enableRoundOff ? Math.round(rawGrandTotal) : rawGrandTotal;
  const balanceDue = Math.max(0, grandTotal - Number(amountReceived || 0));

  // Sync amount received with grandTotal when Paid
  useEffect(() => {
    if (paymentStatus === "Paid") {
      setAmountReceived(grandTotal);
    }
  }, [grandTotal, paymentStatus]);

  // ── "New Bill" Button Handler ──
  const handleStartNewBill = (showNotify = true) => {
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
    if (showNotify) {
      notify("success", "Fresh new tax bill started! Ready for items.");
    }
  };

  // ── Customer Autofill ──
  const handleCustomerSelect = (name) => {
    setCustomerName(name);
    const match = availableCustomers.find(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
    if (match) {
      if (match.phone) setMobileNumber(match.phone);
      if (match.gstin) setCustomerGstin(match.gstin);
      if (match.address) setCustomerAddress(match.address);
    }
  };

  // ── Add Item to Bill (Manual or Catalog) ──
  const handleOpenAddItem = () => {
    if (availableProducts.length > 0) {
      const first = availableProducts[0];
      setItemForm({
        productId: first.id || first._id,
        name: first.name,
        hsn: first.hsn || "1904",
        quantity: 1,
        rate: Number(first.sellingPrice || 0),
        discount: 0,
        taxRate: Number(first.gstRate || 18),
      });
    } else {
      setItemForm({
        productId: "",
        name: "",
        hsn: "1904",
        quantity: 1,
        rate: 100,
        discount: 0,
        taxRate: 18,
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
        hsn: prod.hsn || "1904",
        rate: Number(prod.sellingPrice || 0),
        taxRate: Number(prod.gstRate || 18),
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
      notify("error", "Quantity must be at least 1.");
      return;
    }

    const newItem = {
      id: itemForm.productId || `custom-${Date.now()}`,
      productId: itemForm.productId || undefined,
      name: itemForm.name.trim(),
      hsn: itemForm.hsn || "1904",
      qty: Number(itemForm.quantity),
      rate: Number(itemForm.rate || 0),
      discount: Number(itemForm.discount || 0),
      gst: Number(itemForm.taxRate || 0),
    };

    setItems((prev) => [...prev, newItem]);
    setShowAddItemModal(false);
    notify("success", `Added "${newItem.name}" to bill!`);
  };

  // ── Barcode Scanner Integration (Req 2 & 3) ──
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
        // Increment quantity of existing line item
        const updated = [...prevItems];
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: updated[existingIndex].qty + 1,
        };
        notify(
          "success",
          `Increased "${product.name}" quantity to ${updated[existingIndex].qty}!`
        );
        return updated;
      } else {
        // Add new line item from product database
        const newItem = {
          id: prodId || `scan-${Date.now()}`,
          productId: prodId,
          name: product.name,
          barcode: product.barcode,
          sku: product.sku || product.code,
          hsn: product.hsn || "1904",
          qty: 1,
          rate: Number(product.sellingPrice || product.price || 0),
          discount: 0,
          gst: Number(product.gstRate || 18),
        };
        notify("success", `Scanned & added "${product.name}" (₹${newItem.rate}) to bill!`);
        return [...prevItems, newItem];
      }
    });
  };

  // ── Hold Bill Handler (Req 4 & 5) ──
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

    // Clear active bill for the next customer
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

    notify(
      "success",
      `Bill #${newHeldBill.billNumber} for "${newHeldBill.customerName || "Walk-in"}" put on hold! Ready for next customer.`
    );
  };

  // ── Resume Held Bill (Req 5) ──
  const handleResumeHeldBill = (heldBill) => {
    if (!heldBill) return;

    if (items.length > 0) {
      const confirmOverwrite = window.confirm(
        "Current bill has active items. Would you like to overwrite current bill with the resumed bill?"
      );
      if (!confirmOverwrite) return;
    }

    setBillNumber(heldBill.billNumber || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setBillDate(heldBill.billDate || new Date().toISOString().split("T")[0]);
    setCustomerName(heldBill.customerName || "");
    setMobileNumber(heldBill.mobileNumber || "");
    setCustomerGstin(heldBill.customerGstin || "");
    setCustomerAddress(heldBill.customerAddress || "");
    setSaleType(heldBill.saleType || "B2C — Customer");
    setItems(heldBill.items || []);
    setPaymentMode(heldBill.paymentMode || "Cash");
    setPaymentStatus(heldBill.paymentStatus || "Paid");
    setAmountReceived(heldBill.amountReceived || 0);

    // Remove resumed bill from held bills
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

  // ── Quick Payment Toggles ──
  const handleQuickPayment = (mode, status) => {
    setPaymentMode(mode);
    setPaymentStatus(status);
    if (status === "Paid") {
      setAmountReceived(grandTotal);
    } else {
      setAmountReceived(0);
    }
  };

  // ── Helper to build complete invoice snapshot (Req 1, 6, 7) ──
  const generateCurrentInvoiceSnapshot = () => ({
    invoiceNumber: billNumber,
    createdAt: billDate,
    date: billDate,
    saleType,
    placeOfSupply: "33-Tamil Nadu",
    paymentStatus,
    paymentMethod: paymentMode,
    customer: {
      name: customerName || "Walk-in Retail Customer",
      phone: mobileNumber || "+91 98000 00000",
      address: customerAddress || "Counter Sale / Walk-in Customer",
      gstin: customerGstin || "N/A",
      state: "Tamil Nadu",
      stateCode: "33",
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
    cgst: taxAmount / 2,
    sgst: taxAmount / 2,
    igst: 0,
    paidAmount: paymentStatus === "Paid" ? grandTotal : amountReceived,
    received: paymentStatus === "Paid" ? grandTotal : amountReceived,
    balanceDue,
    taxInclusive,
    pricingMethod: taxInclusive ? "INCLUSIVE" : "EXCLUSIVE",
  });

  // ── Save Bill / Issue Tax Invoice (Direct Persistence & Print Flow) ──
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
        enableRoundOff,
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

      // Call backend to persist invoice & deduct stock
      const createdRes = await salesApi.create(billPayload);
      const createdSale = createdRes?.sale || createdRes?.data?.sale || createdRes;
      const finalInvoiceNumber = createdSale?.invoiceNumber || billNumber;

      // Prepare TaxInvoice format
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
        // Direct save: reset form silently with fresh invoice number for next customer
        handleStartNewBill(false);
      }
    } catch (err) {
      notify("error", err?.response?.data?.message || err?.message || "Failed to save invoice");
    } finally {
      setSavingBill(false);
    }
  };

  return (
    <>
      {/* ══════════════════════════════════════════════════
          POS SCREEN (HIDDEN AUTOMATICALLY WHEN PRINTING)
      ══════════════════════════════════════════════════ */}
      <div className="pos-screen space-y-6 pb-12 fade-up">
        {/* ── Top Bar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl border border-blue-100 grid place-items-center text-blue-600 bg-blue-50/70 shadow-2xs">
              <Receipt size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Point of Sale &amp; New Bill
                </h1>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full uppercase">
                  Active POS
                </span>
              </div>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Invoice #{billNumber} · Date: {billDate}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            {/* Held Bills Manager Button */}
            <button
              type="button"
              onClick={() => setShowHeldBillsModal(true)}
              className={`relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition shadow-2xs cursor-pointer ${
                heldBills.length > 0
                  ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
              title="View & Resume Parked Bills"
            >
              <Clock size={14} className={heldBills.length > 0 ? "text-amber-600" : "text-slate-400"} />
              <span>Held Bills</span>
              {heldBills.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
                  {heldBills.length}
                </span>
              )}
            </button>

            {/* Quick Barcode Scanner button */}
            <button
              type="button"
              onClick={() => setShowBarcodeScanner(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-2xs transition cursor-pointer"
              title="Scan product barcode with device camera"
            >
              <Scan size={14} className="text-indigo-600" />
              <span>Scan Barcode</span>
            </button>

            <Button
              variant="primary"
              size="sm"
              icon={FilePlus}
              onClick={handleStartNewBill}
              title="Start a fresh blank invoice"
            >
              New Bill
            </Button>

            <Button
              variant="success"
              size="sm"
              icon={Plus}
              onClick={handleOpenAddItem}
            >
              Add Item
            </Button>
          </div>
        </div>

        {/* Notifications */}
        {notification.text && (
          <div
            className={`p-3.5 rounded-xl text-xs font-medium flex items-center justify-between gap-3 ${
              notification.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-rose-50 border border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === "success" ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle size={16} className="text-rose-600 shrink-0" />
              )}
              <span>{notification.text}</span>
            </div>
            {notification.type === "success" && (
              <button
                type="button"
                onClick={() => nav("/invoices")}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shrink-0 cursor-pointer text-[11px]"
              >
                View in Invoice History &rarr;
              </button>
            )}
          </div>
        )}

        {/* ── Two-Column Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: 3-STEP BILLING FORM */}
          <div className="lg:col-span-7 space-y-5">
            {/* STEP 1: CUSTOMER */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    1
                  </span>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                      Customer Information
                    </h2>
                    <p className="text-xs text-slate-400 font-normal">
                      Select existing client or type walk-in details
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/70 px-2.5 py-0.5 rounded-full">
                  Place of Supply: 33-TN
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Customer Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search or type customer name..."
                      value={customerName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomerName(val);
                        setShowCustDropdown(true);
                        const match = availableCustomers.find(
                          (c) => c.name.toLowerCase() === val.toLowerCase()
                        );
                        if (match) {
                          if (match.phone) setMobileNumber(match.phone);
                          if (match.gstin) setCustomerGstin(match.gstin);
                          if (match.address) setCustomerAddress(match.address);
                        }
                      }}
                      onFocus={() => {
                        if (customerName.trim()) setShowCustDropdown(true);
                      }}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 bg-slate-50/30 transition placeholder:text-slate-400 font-medium"
                    />

                    {/* Rich Autocomplete Dropdown */}
                    {showCustDropdown && customerName.trim() && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setShowCustDropdown(false)}
                        />
                        <div className="absolute left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-30 max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in">
                          {availableCustomers
                            .filter((c) =>
                              c.name.toLowerCase().includes(customerName.toLowerCase())
                            )
                            .map((c) => (
                              <button
                                key={c.id || c._id}
                                type="button"
                                onClick={() => {
                                  handleCustomerSelect(c.name);
                                  setShowCustDropdown(false);
                                }}
                                className="w-full p-2.5 text-left text-xs hover:bg-blue-50 transition flex items-center justify-between"
                              >
                                <div>
                                  <p className="font-semibold text-slate-800">{c.name}</p>
                                  <p className="text-[10px] text-slate-400">
                                    {c.phone || "No phone"} · {c.city || "Tamil Nadu"}
                                  </p>
                                </div>
                                <span className="text-[10px] text-blue-600 font-bold">Select</span>
                              </button>
                            ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Phone / Mobile Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-slate-50/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Sale Type
                  </label>
                  <select
                    value={saleType}
                    onChange={(e) => setSaleType(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl bg-white outline-none focus:border-blue-500"
                  >
                    <option value="B2C — Customer">B2C Retail Customer</option>
                    <option value="B2B — Registered">B2B Registered Business</option>
                    <option value="SEZ — Zero Rated">SEZ Export — Zero Rated</option>
                  </select>
                </div>
              </div>

              {/* Optional GSTIN & Address expander */}
              <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setShowGstOptions(!showGstOptions)}
                  className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1"
                >
                  <span>{showGstOptions ? "Hide" : "+ Add"} GSTIN &amp; Billing Address</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${showGstOptions ? "rotate-180" : ""}`}
                  />
                </button>
                <span className="text-slate-400 text-[11px]">Optional fields for B2B tax credits</span>
              </div>

              {showGstOptions && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3 pt-3 border-t border-slate-100 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Customer GSTIN
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 33AAAAA0000A1Z5"
                      value={customerGstin}
                      onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono uppercase bg-slate-50/30 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Billing Address
                    </label>
                    <input
                      type="text"
                      placeholder="Street, City, State, Pincode"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/30 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* STEP 2: ITEMS & PRODUCTS */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    2
                  </span>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                      Items &amp; Products
                    </h2>
                    <p className="text-xs text-slate-400 font-normal">
                      Scan barcodes, search inventory or add custom line items
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Tax Inclusive / Exclusive Toggle (Req 3) */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setTaxInclusive(false)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                        !taxInclusive
                          ? "bg-white text-blue-600 shadow-2xs"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                      title="Tax is calculated on top of rates"
                    >
                      Exclusive (Std)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaxInclusive(true)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                        taxInclusive
                          ? "bg-white text-blue-600 shadow-2xs"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                      title="Rates already include GST"
                    >
                      Inclusive (MRP)
                    </button>
                  </div>

                  {/* Round Off Toggle (Req 5 & 9) */}
                  <button
                    type="button"
                    onClick={() => setEnableRoundOff(!enableRoundOff)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      enableRoundOff
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-50 text-slate-500 border-slate-200"
                    }`}
                    title="Round final invoice amount to nearest Rupee"
                  >
                    <span>Round:</span>
                    <span className="uppercase text-[10px]">{enableRoundOff ? "ON" : "OFF"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowBarcodeScanner(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold shadow-2xs transition cursor-pointer"
                    title="Scan barcode with camera"
                  >
                    <Scan size={14} className="text-indigo-600" />
                    <span>Scan Barcode</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenAddItem}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                    <span>Add Item</span>
                  </button>
                </div>
              </div>

              {/* Items Table */}
              {items.length === 0 ? (
                <div className="py-8 px-4 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
                  <p className="font-bold text-slate-700 text-xs">No items added to bill yet</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Use the <strong>"Scan Barcode"</strong> or <strong>"Add Item"</strong> buttons above to add products from your catalog.
                  </p>
                  <div className="flex justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowBarcodeScanner(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold transition"
                    >
                      <Scan size={13} />
                      <span>Scan Barcode</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenAddItem}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition"
                    >
                      <Plus size={13} />
                      <span>Add First Item</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Item Name</th>
                        <th className="py-2.5 px-2 w-20 text-center">Qty</th>
                        <th className="py-2.5 px-3 w-24 text-right">Rate ₹</th>
                        <th className="py-2.5 px-2 w-20 text-center">Disc ₹</th>
                        <th className="py-2.5 px-2 w-20 text-center">GST %</th>
                        <th className="py-2.5 px-3 w-24 text-right">Total ₹</th>
                        <th className="py-2.5 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {items.map((item, idx) => (
                        <tr key={idx} className="text-slate-800 hover:bg-slate-50/60 transition">
                          <td className="py-2.5 px-3 font-medium">
                            <p className="truncate max-w-[140px] font-bold text-slate-800">{item.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">HSN: {item.hsn}</p>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].qty = Math.max(1, Number(e.target.value));
                                setItems(updated);
                              }}
                              className="w-14 py-1 px-1.5 border border-slate-200 rounded-lg text-center font-bold outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.rate}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].rate = Math.max(0, Number(e.target.value));
                                setItems(updated);
                              }}
                              className="w-20 py-1 px-1.5 border border-slate-200 rounded-lg text-right font-mono font-medium outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <input
                              type="number"
                              min="0"
                              value={item.discount}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].discount = Math.max(0, Number(e.target.value));
                                setItems(updated);
                              }}
                              className="w-14 py-1 px-1.5 border border-slate-200 rounded-lg text-center font-mono outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="py-2.5 px-2 text-center text-slate-500 font-semibold">
                            {item.gst}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                            ₹{calculatedItems[idx] ? calculatedItems[idx].total.toFixed(2) : ((item.rate * item.qty - item.discount) * (1 + item.gst / 100)).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Remove line item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* STEP 3: PAYMENT & SETTLEMENT */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  3
                </span>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                    Payment &amp; Settlement
                  </h2>
                  <p className="text-xs text-slate-400 font-normal">
                    Record tender mode, generate UPI QR or scan product barcodes
                  </p>
                </div>
              </div>

              {/* Quick action buttons (Req 2: Pay Later / Credit REPLACED with Barcode Scanner) */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => handleQuickPayment("Cash", "Paid")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    paymentMode === "Cash" && paymentStatus === "Paid"
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  ✓ Cash Paid
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickPayment("UPI", "Paid")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    paymentMode === "UPI" && paymentStatus === "Paid"
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  ✓ UPI Paid
                </button>

                <button
                  type="button"
                  onClick={() => setShowUpiModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition shadow-2xs cursor-pointer"
                >
                  <QrCode size={14} className="text-blue-600" />
                  <span>Request UPI (QR)</span>
                </button>

                {/* REPLACED BUTTON: BARCODE SCANNER (Req 2 & 3) */}
                <button
                  type="button"
                  onClick={() => setShowBarcodeScanner(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition shadow-2xs cursor-pointer"
                  title="Scan product barcode with device camera"
                >
                  <Scan size={14} className="text-indigo-600" />
                  <span>Barcode Scanner</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Payment Status
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl bg-white outline-none focus:border-blue-500"
                  >
                    <option value="Paid">Fully Paid</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Unpaid">Unpaid / Credit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl bg-white outline-none focus:border-blue-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="Card">Debit / Credit Card</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Amount Received ₹
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl font-bold font-mono outline-none focus:border-blue-500 bg-slate-50/30"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: LIVE INVOICE PREVIEW & ACTIONS */}
          <div className="lg:col-span-5 sticky top-20 space-y-3">
            <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-white">
              <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Live Bill Preview &middot; Master Template
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveBill(true)}
                  disabled={savingBill || items.length === 0}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Save bill permanently to database and open printable Tax Invoice"
                >
                  <FileText size={12} />
                  <span>{savingBill ? "Saving..." : "Invoice PDF / Print"}</span>
                </button>
              </div>
              <div className="p-2 sm:p-3 overflow-y-auto max-h-[calc(100vh-220px)]">
                <TaxInvoice
                  invoice={generateCurrentInvoiceSnapshot()}
                  shopSettings={shopSettings}
                  isModal={false}
                  showActions={false}
                />
              </div>
            </div>

            {/* Action Buttons for Billing (Req 1, 4 & 5) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={() => handleStartNewBill(true)}
                title="Clear current invoice"
              >
                Clear
              </Button>

              <Button
                variant="warning"
                size="sm"
                icon={Clock}
                disabled={items.length === 0}
                onClick={handleHoldBill}
                title="Hold bill to serve next customer without losing cart"
              >
                Hold Bill
              </Button>

              <Button
                variant="neutral"
                size="sm"
                icon={Download}
                disabled={items.length === 0}
                onClick={() => {
                  const snapshot = generateCurrentInvoiceSnapshot();
                  setCompletedInvoice(snapshot);
                  setShowInvoiceModal(true);
                }}
                title="View & Download Invoice PDF Preview"
              >
                PDF View
              </Button>

              <Button
                variant="success"
                size="sm"
                icon={Check}
                loading={savingBill}
                disabled={savingBill || items.length === 0}
                onClick={() => handleSaveBill(false)}
                title="Save bill permanently to database and start fresh bill"
              >
                Save Bill
              </Button>

              <Button
                variant="primary"
                size="sm"
                icon={Printer}
                loading={savingBill}
                disabled={savingBill || items.length === 0}
                onClick={() => handleSaveBill(true)}
                title="Save sale and print official tax invoice"
              >
                Save &amp; Print
              </Button>
            </div>
          </div>
        </div>

        {/* ── Add Item Modal ── */}
        {showAddItemModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-xs">
            <div className="relative w-full max-w-lg my-auto bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Add Item to Invoice</h3>
                  <p className="text-[11px] text-slate-400">Pick catalog product or enter custom details</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmitAddItem} className="space-y-4 pt-4 text-xs">
                {availableProducts.length > 0 && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Choose from Catalog (Optional)
                    </label>
                    <select
                      value={itemForm.productId}
                      onChange={(e) => handleProductSelectChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
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
                  <label className="block font-semibold text-slate-700 mb-1">Item Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Basmati Rice 5kg or Service Charge"
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">HSN / SAC Code</label>
                    <input
                      type="text"
                      placeholder="e.g. 1006"
                      value={itemForm.hsn}
                      onChange={(e) => setItemForm({ ...itemForm, hsn: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={itemForm.quantity}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, quantity: Math.max(1, Number(e.target.value)) })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Rate / Unit (₹) *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={itemForm.rate}
                      onChange={(e) => setItemForm({ ...itemForm, rate: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Discount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={itemForm.discount}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, discount: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700">GST Rate (%)</label>
                      <span className="text-[10px] text-blue-600 font-bold">Manual Editable</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={itemForm.taxRate}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, taxRate: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                      placeholder="e.g. 18 or 3"
                    />
                    {/* Preset quick buttons */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {[0, 5, 12, 18, 28].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setItemForm({ ...itemForm, taxRate: rate })}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                            itemForm.taxRate === rate
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {rate}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Calculated line total preview */}
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Calculated Line Total:</span>
                  <span className="font-bold text-blue-700 font-mono text-sm">
                    ₹
                    {(
                      (itemForm.rate * itemForm.quantity - itemForm.discount) *
                      (1 + itemForm.taxRate / 100)
                    ).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddItemModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
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
            shopName={shopSettings?.shopName || "Garden Greens Mart"}
            onClose={() => setShowUpiModal(false)}
            onSuccess={(res) => {
              setPaymentMode("UPI");
              setPaymentStatus("Paid");
              setAmountReceived(grandTotal);
              notify("success", `Payment of ₹${grandTotal} confirmed via UPI! Ref: ${res.utr}`);
            }}
          />
        )}

        {/* ── Barcode Scanner Modal (Req 2 & 3) ── */}
        <BarcodeScannerModal
          isOpen={showBarcodeScanner}
          onClose={() => setShowBarcodeScanner(false)}
          onProductScanned={handleProductScanned}
          availableProducts={availableProducts}
        />

        {/* ── Held Bills Modal (Req 4 & 5) ── */}
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
          INVOICE MODAL & PRINT CONTAINER (REQ 1)
          When printing, .pos-screen is completely hidden,
          and ONLY this TaxInvoice prints cleanly!
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
