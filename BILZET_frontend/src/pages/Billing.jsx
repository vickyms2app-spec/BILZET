import { useState, useEffect } from "react";
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
  Receipt,
  User,
  Phone,
} from "lucide-react";
import { settingsApi, productsApi, customersApi, salesApi } from "../api";
import TaxInvoice from "../components/invoice/TaxInvoice";
import UpiPaymentModal from "../components/payment/UpiPaymentModal";
import Logo from "../components/common/Logo";

export default function Billing() {
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
  const [completedInvoice, setCompletedInvoice] = useState(null);
  const [shopSettings, setShopSettings] = useState(null);
  const [savingBill, setSavingBill] = useState(false);
  const [notification, setNotification] = useState({ type: "", text: "" });

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

  // Calculations
  const subtotal = items.reduce((acc, i) => {
    const lineGross = Number(i.rate || 0) * Number(i.qty || 1);
    const lineDiscount = Number(i.discount || 0);
    return acc + Math.max(0, lineGross - lineDiscount);
  }, 0);

  const taxAmount = items.reduce((acc, i) => {
    const lineNet = Math.max(0, Number(i.rate || 0) * Number(i.qty || 1) - Number(i.discount || 0));
    return acc + lineNet * (Number(i.gst || 0) / 100);
  }, 0);

  const grandTotal = subtotal + taxAmount;
  const balanceDue = Math.max(0, grandTotal - Number(amountReceived || 0));

  // Sync amount received with grandTotal when Paid
  useEffect(() => {
    if (paymentStatus === "Paid") {
      setAmountReceived(grandTotal);
    }
  }, [grandTotal, paymentStatus]);

  // ── "New Bill" Button Handler ──
  const handleStartNewBill = () => {
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
    notify("success", "Fresh new tax bill started! Ready for items.");
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

  // ── Add Item to Bill ──
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

  // ── Save Bill / Issue Tax Invoice ──
  const handleSaveBill = async () => {
    if (items.length === 0) {
      notify("error", "Please add at least one item to the bill before issuing.");
      return;
    }

    setSavingBill(true);
    try {
      const billPayload = {
        invoiceNumber: billNumber,
        invoiceDate: billDate,
        customerName: customerName.trim() || "Walk-in Retail Customer",
        customerPhone: mobileNumber.trim() || undefined,
        customerAddress: customerAddress || undefined,
        customerGstin: customerGstin || undefined,
        saleType,
        items: items.map((i) => ({
          productId: i.productId,
          name: i.name,
          quantity: i.qty,
          unitPrice: i.rate,
          discount: i.discount,
          taxRate: i.gst,
          lineTotal: (i.rate * i.qty - i.discount) * (1 + i.gst / 100),
        })),
        subtotal,
        taxAmount,
        grandTotal,
        amountReceived: Number(amountReceived || 0),
        balanceDue,
        paymentMode,
        paymentStatus: paymentStatus.toUpperCase(),
      };

      // Call backend to persist invoice & deduct stock
      await salesApi.create(billPayload);

      // Prepare TaxInvoice format
      const invoiceData = {
        invoiceNumber: billNumber,
        createdAt: new Date().toISOString(),
        customer: {
          name: customerName || "Walk-in Retail Customer",
          phone: mobileNumber || "+91 98000 00000",
          address: customerAddress || "Counter Sale / Walk-in Customer",
          state: "Tamil Nadu",
          stateCode: "33",
        },
        items: items.map((i) => ({
          name: i.name,
          sku: "SKU-" + (i.hsn || "1001"),
          hsn: i.hsn || "1001",
          qty: i.qty,
          rate: i.rate,
          taxPercent: i.gst,
          total: (i.rate * i.qty - (i.discount || 0)) * (1 + (i.gst || 0) / 100),
        })),
        subtotal,
        taxTotal: taxAmount,
        grandTotal,
        paymentMethod: paymentMode,
        paymentStatus: paymentStatus.toUpperCase(),
      };

      setCompletedInvoice(invoiceData);
      setShowInvoiceModal(true);
      notify("success", `Invoice ${billNumber} saved & stock deducted successfully!`);
    } catch (err) {
      notify("error", err?.response?.data?.message || err?.message || "Failed to save invoice");
    } finally {
      setSavingBill(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 fade-up">
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

        <div className="flex items-center gap-2.5 self-end sm:self-center">
          <button
            type="button"
            onClick={handleStartNewBill}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs"
            title="Start a fresh blank invoice"
          >
            <FilePlus size={15} className="text-blue-600" />
            <span>New Bill</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddItem}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition shadow-2xs"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification.text && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
            notification.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
          )}
          <span>{notification.text}</span>
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
                <input
                  type="text"
                  list="client-suggestions"
                  placeholder="e.g. Kumar Stores or Retail"
                  value={customerName}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 bg-slate-50/30 transition placeholder:text-slate-400"
                />
                <datalist id="client-suggestions">
                  {availableCustomers.map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  placeholder="10-digit mobile"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 bg-slate-50/30 transition placeholder:text-slate-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Sale Classification
                </label>
                <select
                  value={saleType}
                  onChange={(e) => setSaleType(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 bg-white transition cursor-pointer"
                >
                  <option value="B2C — Customer">B2C — Retail Customer</option>
                  <option value="B2B — Registered Business">B2B — GST Business</option>
                  <option value="SEZ — Zero Rated">SEZ Export — Zero Rated</option>
                </select>
              </div>
            </div>

            {/* Accordion: GST options */}
            <div className="mt-4 pt-3.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowGstOptions(!showGstOptions)}
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-blue-600 transition px-2.5 py-1.5 rounded-lg hover:bg-slate-50"
              >
                {showGstOptions ? (
                  <ChevronDown size={15} className="text-blue-600" />
                ) : (
                  <ChevronRight size={15} />
                )}
                <span>GSTIN, Billing Address &amp; Invoice Date</span>
              </button>

              {showGstOptions && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-3 p-4 bg-slate-50/70 rounded-xl border border-slate-200/70 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Client GSTIN
                    </label>
                    <input
                      placeholder="e.g. 33AAAAA0000A1Z5"
                      value={customerGstin}
                      onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                      className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none focus:border-blue-500 uppercase font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Billing Address
                    </label>
                    <input
                      placeholder="Street, City, Pincode"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Invoice Date
                    </label>
                    <input
                      type="date"
                      value={billDate}
                      onChange={(e) => setBillDate(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* STEP 2: ITEMS */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  2
                </span>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                    Bill Items &amp; Products
                  </h2>
                  <p className="text-xs text-slate-400 font-normal">
                    Add catalog or custom items with quantity, rate and discount
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenAddItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>Add Item</span>
              </button>
            </div>

            {/* Items Table */}
            {items.length === 0 ? (
              <div className="py-8 px-4 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
                <p className="font-bold text-slate-700 text-xs">No items added to bill yet</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Click the blue "Add Item" button above to add products from your catalog or enter custom line items.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddItem}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition"
                >
                  <Plus size={13} />
                  <span>Add First Item</span>
                </button>
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
                          ₹{((item.rate * item.qty - item.discount) * (1 + item.gst / 100)).toFixed(2)}
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
                  Record payment status, instant UPI QR or mark credit
                </p>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                onClick={() => handleQuickPayment("Cash", "Paid")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
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
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
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
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition shadow-2xs"
              >
                <QrCode size={14} className="text-blue-600" />
                <span>Request UPI (QR)</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickPayment("Credit", "Unpaid")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  paymentStatus === "Unpaid"
                    ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                🕒 Pay Later (Credit)
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

        {/* RIGHT COLUMN: LIVE INVOICE PREVIEW */}
        <div className="lg:col-span-5 sticky top-20">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 font-sans">
            {/* Invoice Top header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <Logo variant="full" theme="light" size="sm" />
              <div className="text-right">
                <h3 className="text-base font-bold text-slate-900 tracking-wider">
                  TAX INVOICE
                </h3>
                <p className="text-xs font-medium text-slate-600 mt-0.5">
                  {shopSettings?.shopName || "Garden Greens Mart"}
                </p>
              </div>
            </div>

            {/* Bill To & Doc details */}
            <div className="grid grid-cols-2 gap-3 my-4 text-xs">
              <div className="border border-slate-200/80 rounded-xl p-3 bg-slate-50/60">
                <p className="font-semibold text-slate-700">Bill To</p>
                <p className="text-slate-900 font-bold mt-1 truncate">
                  {customerName || "Walk-in Retail Customer"}
                </p>
                {mobileNumber && (
                  <p className="text-slate-500 font-mono text-[11px] mt-0.5">{mobileNumber}</p>
                )}
                <p className="text-slate-400 text-[11px] mt-1">State: Tamil Nadu (33)</p>
              </div>

              <div className="border border-slate-200/80 rounded-xl p-3 bg-slate-50/60 text-right">
                <p className="font-semibold text-blue-700 font-mono text-[11px]">{billNumber}</p>
                <p className="text-slate-500 mt-0.5 text-[11px]">Date: {billDate}</p>
                <p className="text-slate-500 text-[11px]">Sale: {saleType.split(" ")[0]}</p>
                <p className="text-slate-400 text-[11px] mt-0.5">Place: 33-Tamil Nadu</p>
              </div>
            </div>

            {/* Items Table in Preview */}
            <div className="overflow-hidden border border-slate-200/80 rounded-xl mb-4">
              <table className="w-full text-[11px]">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">Item</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                        No items added yet
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2 text-slate-400">{idx + 1}</td>
                        <td className="p-2 font-medium text-slate-900 truncate max-w-[120px]">
                          {item.name}
                        </td>
                        <td className="p-2 text-center font-bold">{item.qty}</td>
                        <td className="p-2 text-right font-mono">₹{item.rate}</td>
                        <td className="p-2 text-right font-mono font-bold text-slate-800">
                          ₹{((item.rate * item.qty - item.discount) * (1 + item.gst / 100)).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="space-y-1.5 text-xs border-t border-slate-100 pt-3">
              <div className="flex justify-between text-slate-500">
                <span>Taxable Amount</span>
                <span className="font-mono">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>IGST / Tax Total</span>
                <span className="font-mono">₹{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Grand Total</span>
                <span className="font-mono text-blue-600">₹{grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 text-xs">
                <span>Amount Paid</span>
                <span className="font-mono text-emerald-600 font-bold">
                  ₹{Number(amountReceived || 0).toFixed(2)}
                </span>
              </div>
              {balanceDue > 0 && (
                <div className="flex justify-between text-xs font-semibold text-rose-600">
                  <span>Balance Due</span>
                  <span className="font-mono">₹{balanceDue.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Actions: Save / Print */}
            <div className="mt-5 flex items-center gap-2.5">
              <button
                type="button"
                disabled={savingBill || items.length === 0}
                onClick={handleSaveBill}
                className="btn-primary flex-1 text-xs font-semibold py-2.5 flex items-center justify-center gap-2"
              >
                {savingBill && <RefreshCw size={14} className="animate-spin" />}
                <span>Save &amp; Issue Invoice</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (items.length === 0) {
                    notify("error", "Add items to view printable invoice");
                    return;
                  }
                  handleSaveBill();
                }}
                className="btn-secondary py-2.5 px-3"
                title="Print Tax Invoice"
              >
                <Printer size={16} className="text-slate-600" />
              </button>
            </div>
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
                  <label className="block font-semibold text-slate-700 mb-1">GST Rate</label>
                  <select
                    value={itemForm.taxRate}
                    onChange={(e) => setItemForm({ ...itemForm, taxRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="0">0% Excluded</option>
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST</option>
                    <option value="28">28% GST</option>
                  </select>
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

      {/* ── Tax Invoice Modal for Print / Preview ── */}
      {showInvoiceModal && completedInvoice && (
        <TaxInvoice
          invoice={completedInvoice}
          shopSettings={shopSettings}
          isModal={true}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}
    </div>
  );
}
