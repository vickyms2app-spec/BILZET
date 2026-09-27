import { useState, useEffect } from "react";
import { Menu, Plus, ChevronDown, ChevronRight, Trash2, Printer, Share2, Download, Check, Eye } from "lucide-react";
import { mockProducts } from "../api/mockData";
import { settingsApi } from "../api";
import TaxInvoice from "../components/invoice/TaxInvoice";
import Logo from "../components/common/Logo";

export default function Billing() {
  const [customerName, setCustomerName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [saleType, setSaleType] = useState("B2C — Customer");
  const [showGstOptions, setShowGstOptions] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [items, setItems] = useState([]);
  
  // Payment states
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [paymentStatus, setPaymentStatus] = useState("Unpaid");
  const [amountReceived, setAmountReceived] = useState(0);
  const [quickOption, setQuickOption] = useState("Unpaid");

  // Modal & Settings
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState(null);
  const [shopSettings, setShopSettings] = useState(null);

  useEffect(() => {
    const local = localStorage.getItem("bilzet_invoice_settings");
    if (local) {
      try {
        setShopSettings(JSON.parse(local));
      } catch (e) {}
    } else {
      settingsApi.get().then((res) => {
        if (res) setShopSettings(res);
      }).catch(() => {});
    }
  }, []);

  // Calculations
  const subtotal = items.reduce((acc, i) => acc + (i.rate * i.qty), 0);
  const taxAmount = items.reduce((acc, i) => acc + (i.rate * i.qty * (i.gst / 100)), 0);
  const grandTotal = subtotal + taxAmount;
  const balanceDue = Math.max(0, grandTotal - Number(amountReceived || 0));

  const handleAddItem = () => {
    const prod = mockProducts.find((p) => p._id === selectedProductId) || mockProducts[0];
    if (!prod) return;

    const existingIndex = items.findIndex((i) => i.id === prod._id);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].qty += 1;
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          id: prod._id,
          name: prod.name,
          hsn: "1904",
          qty: 1,
          rate: prod.sellingPrice,
          gst: prod.gstRate || 5,
        },
      ]);
    }
  };

  const handleAddCustomLine = () => {
    setItems([
      ...items,
      {
        id: "custom-" + Date.now(),
        name: "General Item",
        hsn: "9983",
        qty: 1,
        rate: 100,
        gst: 18,
      },
    ]);
  };

  const handleRemoveItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleQuickPayment = (mode, status) => {
    setPaymentMode(mode);
    setPaymentStatus(status);
    setQuickOption(status === "Paid" ? mode : "Later");
    if (status === "Paid") {
      setAmountReceived(grandTotal);
    } else {
      setAmountReceived(0);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6 pb-12">
      {/* ══════════════════════════════════════════════════
          TOP HEADER
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl border border-slate-200 grid place-items-center text-slate-700 bg-slate-50">
            <Menu size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Create Invoice
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Fast 3-step billing — customer, items, payment & share
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full uppercase tracking-wider">
            PRO
          </span>
          <button
            onClick={() => {
              setItems([]);
              setCustomerName("");
              setMobileNumber("");
              setAmountReceived(0);
            }}
            className="flex items-center gap-2 bg-[#4361ee] hover:bg-[#3751d8] text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-blue-500/25 transition active:scale-95"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>New Bill</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          TWO-COLUMN LAYOUT
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: 3-STEP BILLING FORM */}
        <div className="lg:col-span-7 space-y-5">
          {/* STEP 1: CUSTOMER */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-black text-xs flex items-center justify-center border border-blue-200">
                  1
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">Customer</h2>
                  <p className="text-xs text-slate-400">
                    Type name or mobile — existing customer details auto-fill.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                Tamil Nadu default
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kumar Stores"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  placeholder="10-digit mobile"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Sale Type
                </label>
                <select
                  value={saleType}
                  onChange={(e) => setSaleType(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
                >
                  <option value="B2C — Customer">B2C — Customer</option>
                  <option value="B2B — Registered Business">B2B — Registered Business</option>
                  <option value="SEZ — Zero Rated">SEZ — Zero Rated</option>
                </select>
              </div>
            </div>

            {/* Accordion: GST options */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowGstOptions(!showGstOptions)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-blue-600 transition"
              >
                {showGstOptions ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span>GST, address & document options</span>
              </button>

              {showGstOptions && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">GSTIN Number</label>
                    <input
                      placeholder="e.g. 33AAAAA0000A1Z5"
                      className="w-full p-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Billing Address</label>
                    <input
                      placeholder="Full street address, city, pin"
                      className="w-full p-2 border rounded-lg bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* STEP 2: ITEMS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-black text-xs flex items-center justify-center border border-blue-200">
                  2
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">Items</h2>
                  <p className="text-xs text-slate-400">
                    Select inventory item or add a custom line.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                {items.length} Inventory Items
              </span>
            </div>

            {/* Product selection bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 mt-4">
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full md:flex-1 min-w-0 px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white"
              >
                <option value="">Select product to add</option>
                {mockProducts.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} — ₹{p.sellingPrice} ({p.stock} in stock)
                  </option>
                ))}
              </select>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="bg-[#1a5cff] hover:bg-[#1248cc] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 whitespace-nowrap"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>Add Item</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddCustomLine}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-200 active:scale-95 whitespace-nowrap"
                >
                  <Plus size={13} strokeWidth={2.5} />
                  <span>Custom Line</span>
                </button>
              </div>
            </div>

            {/* Item list */}
            {items.length === 0 ? (
              <div className="mt-8 py-8 text-center text-xs text-slate-400 font-medium border border-dashed border-slate-200 rounded-xl">
                Add an item to continue.
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-semibold">
                      <th className="py-2 px-1">Item</th>
                      <th className="py-2 px-1 w-16">Qty</th>
                      <th className="py-2 px-1 w-20">Rate ₹</th>
                      <th className="py-2 px-1 w-16">GST %</th>
                      <th className="py-2 px-1 w-20 text-right">Total ₹</th>
                      <th className="py-2 px-1 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => (
                      <tr key={item.id} className="text-slate-700 font-medium">
                        <td className="py-2 px-1">{item.name}</td>
                        <td className="py-2 px-1">
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].qty = Math.max(1, Number(e.target.value));
                              setItems(updated);
                            }}
                            className="w-14 p-1 border rounded text-center"
                          />
                        </td>
                        <td className="py-2 px-1">₹{item.rate}</td>
                        <td className="py-2 px-1">{item.gst}%</td>
                        <td className="py-2 px-1 text-right font-bold">
                          ₹{(item.rate * item.qty * (1 + item.gst / 100)).toFixed(2)}
                        </td>
                        <td className="py-2 px-1 text-right">
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="text-red-400 hover:text-red-600"
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

          {/* STEP 3: PAYMENT & SAVE */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-black text-xs flex items-center justify-center border border-blue-200">
                3
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">Payment & Save</h2>
                <p className="text-xs text-slate-400">
                  Choose a common payment option, then save or share the PDF.
                </p>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                onClick={() => handleQuickPayment("Cash", "Paid")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                  paymentMode === "Cash" && paymentStatus === "Paid"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                ✓ Cash Paid
              </button>
              <button
                type="button"
                onClick={() => handleQuickPayment("UPI", "Paid")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                  paymentMode === "UPI" && paymentStatus === "Paid"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                ✓ UPI Paid
              </button>
              <button
                type="button"
                onClick={() => handleQuickPayment("UPI", "Unpaid")}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 transition"
              >
                ↗ Request UPI
              </button>
              <button
                type="button"
                onClick={() => handleQuickPayment("Credit", "Unpaid")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                  paymentStatus === "Unpaid"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                🕒 Pay Later
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Payment Status
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                >
                  <option value="Unpaid">Unpaid</option>
                  <option value="Paid">Paid</option>
                  <option value="Partially Paid">Partially Paid</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Amount Received ₹
                </label>
                <input
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE INVOICE PREVIEW */}
        <div className="lg:col-span-5 sticky top-20">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md p-6 font-sans">
            {/* Invoice Top header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <Logo variant="full" theme="light" size="sm" />
              <div className="text-right">
                <h3 className="text-xl font-black text-slate-900 tracking-wider">
                  TAX INVOICE
                </h3>
                <p className="text-xs font-bold text-slate-700 mt-0.5">demo</p>
              </div>
            </div>

            {/* Bill To & Doc details */}
            <div className="grid grid-cols-2 gap-3 my-4 text-xs">
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                <p className="font-bold text-slate-700">Bill To</p>
                <p className="text-slate-900 font-semibold mt-1">
                  {customerName || "Customer"}
                </p>
                {mobileNumber && <p className="text-slate-500">{mobileNumber}</p>}
                <p className="text-slate-400 text-[11px] mt-1">State: Tamil Nadu</p>
              </div>

              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 text-right">
                <p className="font-semibold text-slate-700">Document No: INV-2026-0001</p>
                <p className="text-slate-500 mt-0.5">Date: {todayStr}</p>
                <p className="text-slate-500">Sale: {saleType.split(" ")[0]}</p>
                <p className="text-slate-400 text-[11px] mt-0.5">Place of Supply: 33-Tamil Nadu</p>
              </div>
            </div>

            {/* Items Table in Preview */}
            <div className="overflow-hidden border border-slate-200 rounded-xl mb-4">
              <table className="w-full text-[11px]">
                <thead className="bg-[#eff6ff] text-slate-700 font-bold border-b border-blue-100">
                  <tr>
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">Item</th>
                    <th className="p-2 text-center">HSN/SAC</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2 text-right">GST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                        No items added
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2 text-slate-400">{idx + 1}</td>
                        <td className="p-2 font-medium text-slate-900">{item.name}</td>
                        <td className="p-2 text-center text-slate-400">{item.hsn}</td>
                        <td className="p-2 text-center font-bold">{item.qty}</td>
                        <td className="p-2 text-right">₹{item.rate}</td>
                        <td className="p-2 text-right">{item.gst}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="space-y-1.5 text-xs border-t border-slate-100 pt-3">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>IGST</span>
                <span>₹{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Grand Total</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 text-xs">
                <span>Received</span>
                <span>₹{Number(amountReceived || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-red-600">
                <span>Balance Due</span>
                <span>₹{balanceDue.toFixed(2)}</span>
              </div>
            </div>

            {/* Footer / Terms */}
            <div className="mt-5 pt-3 border-t border-slate-100 text-[10px] text-slate-400 leading-tight">
              <p className="font-semibold text-slate-600 mb-0.5">Footer / Terms</p>
              <p>Thank you for your business.</p>
              <p>Goods/services once accepted are subject to applicable business terms.</p>
              <p className="text-right mt-3 text-slate-300">Generated by BILZET</p>
            </div>

            {/* Actions: Save / Print */}
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  const billInv = {
                    invoiceNumber: "INV-2026-" + Math.floor(1000 + Math.random() * 9000),
                    createdAt: new Date().toISOString(),
                    customer: {
                      name: customerName || "Walk-in Retail Customer",
                      phone: mobileNumber || "+91 98000 00000",
                      address: "Counter Sale / Walk-in Customer",
                      state: "Tamil Nadu",
                      stateCode: "33",
                    },
                    items:
                      items.length > 0
                        ? items.map((i) => ({
                            name: i.name,
                            sku: "SKU-" + (i.hsn || "1001"),
                            hsn: i.hsn || "1001",
                            qty: i.qty,
                            rate: i.rate,
                            taxPercent: i.gst,
                            total: i.rate * i.qty * (1 + (i.gst || 0) / 100),
                          }))
                        : [
                            {
                              name: "Basmati Rice Royal Premium 5kg",
                              sku: "RICE-5KG",
                              hsn: "1006",
                              qty: 2,
                              rate: 450,
                              taxPercent: 5,
                              total: 945,
                            },
                          ],
                    subtotal: subtotal || 900,
                    taxTotal: taxAmount || 45,
                    grandTotal: grandTotal || 945,
                    paymentMethod: paymentMode,
                    paymentStatus: paymentStatus === "Paid" ? "PAID" : "UNPAID",
                  };
                  setCompletedInvoice(billInv);
                  setShowInvoiceModal(true);
                }}
                className="flex-1 bg-[#1a5cff] hover:bg-[#1248cc] text-white py-2.5 rounded-xl font-bold text-xs shadow-md shadow-blue-500/25 transition text-center"
              >
                Save & Issue Invoice
              </button>
              <button
                onClick={() => {
                  const billInv = {
                    invoiceNumber: "INV-2026-" + Math.floor(1000 + Math.random() * 9000),
                    createdAt: new Date().toISOString(),
                    customer: {
                      name: customerName || "Walk-in Retail Customer",
                      phone: mobileNumber || "+91 98000 00000",
                      address: "Counter Sale / Walk-in Customer",
                      state: "Tamil Nadu",
                      stateCode: "33",
                    },
                    items:
                      items.length > 0
                        ? items.map((i) => ({
                            name: i.name,
                            sku: "SKU-" + (i.hsn || "1001"),
                            hsn: i.hsn || "1001",
                            qty: i.qty,
                            rate: i.rate,
                            taxPercent: i.gst,
                            total: i.rate * i.qty * (1 + (i.gst || 0) / 100),
                          }))
                        : [
                            {
                              name: "Basmati Rice Royal Premium 5kg",
                              sku: "RICE-5KG",
                              hsn: "1006",
                              qty: 2,
                              rate: 450,
                              taxPercent: 5,
                              total: 945,
                            },
                          ],
                    subtotal: subtotal || 900,
                    taxTotal: taxAmount || 45,
                    grandTotal: grandTotal || 945,
                    paymentMethod: paymentMode,
                    paymentStatus: paymentStatus === "Paid" ? "PAID" : "UNPAID",
                  };
                  setCompletedInvoice(billInv);
                  setShowInvoiceModal(true);
                }}
                className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition"
                title="Print Tax Invoice"
              >
                <Printer size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tax Invoice Modal for Print / Preview */}
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
