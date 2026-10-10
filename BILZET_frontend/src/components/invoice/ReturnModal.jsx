import React, { useState, useEffect, useMemo } from "react";
import {
  RotateCcw,
  X,
  AlertCircle,
  CheckCircle2,
  Receipt,
  ArrowRight,
  ShieldCheck,
  Percent,
} from "lucide-react";
import Button from "../common/Button";
import { salesApi } from "../../api";

export default function ReturnModal({ invoice, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fullInvoice, setFullInvoice] = useState(invoice);
  const [returnQuantities, setReturnQuantities] = useState({});
  const [reason, setReason] = useState("Customer Changed Mind");
  const [customReason, setCustomReason] = useState("");
  const [refundMethod, setRefundMethod] = useState("CASH");

  // Load complete invoice details to ensure line items & previous returns are accurate
  useEffect(() => {
    if (!invoice?.id && !invoice?._id) return;
    const invId = invoice.id || invoice._id;
    setLoading(true);
    salesApi
      .get(invId)
      .then((res) => {
        const sale = res?.sale || res || invoice;
        setFullInvoice(sale);
        // Initialize return quantities to 0
        const initial = {};
        (sale.items || []).forEach((item) => {
          initial[item.id] = 0;
        });
        setReturnQuantities(initial);
      })
      .catch((err) => {
        console.error("Failed to fetch full invoice for return:", err);
        setFullInvoice(invoice);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [invoice]);

  const items = fullInvoice?.items || [];
  const isInterState = Boolean(fullInvoice?.isInterState);

  // Calculate remaining quantities available for return per line item
  const itemsWithRemaining = useMemo(() => {
    return items.map((item) => {
      const origQty = Number(item.quantity !== undefined ? item.quantity : item.qty || 1);
      const returnedQty = Number(item.returnedQuantity || 0);
      const remainingQty = item.remainingQuantity !== undefined ? Number(item.remainingQuantity) : Math.max(0, origQty - returnedQty);
      const rate = Number(item.rate !== undefined ? item.rate : item.unitPrice || 0);
      const gstRate = Number(item.gstRate !== undefined ? item.gstRate : item.taxPercent || 0);
      const lineTax = Number(item.originalTaxAmount !== undefined ? item.originalTaxAmount : item.taxAmount || 0);
      const lineTotal = Number(item.originalTotal !== undefined ? item.originalTotal : item.total || 0);

      return {
        ...item,
        origQty,
        returnedQty,
        remainingQty,
        rate,
        gstRate,
        lineTax,
        lineTotal,
      };
    });
  }, [items]);

  // Handle quantity changes with validation
  const handleQtyChange = (itemId, val, maxAvailable) => {
    const parsed = parseInt(val, 10);
    const validQty = isNaN(parsed) || parsed < 0 ? 0 : Math.min(parsed, maxAvailable);
    setReturnQuantities((prev) => ({
      ...prev,
      [itemId]: validQty,
    }));
  };

  const handleReturnAllItem = (itemId, maxAvailable) => {
    setReturnQuantities((prev) => ({
      ...prev,
      [itemId]: maxAvailable,
    }));
  };

  const handleReturnAllItems = () => {
    const all = {};
    itemsWithRemaining.forEach((it) => {
      all[it.id] = it.remainingQty;
    });
    setReturnQuantities(all);
  };

  const handleReset = () => {
    const reset = {};
    itemsWithRemaining.forEach((it) => {
      reset[it.id] = 0;
    });
    setReturnQuantities(reset);
  };

  // Live calculations of return totals
  const returnCalculations = useMemo(() => {
    let totalQty = 0;
    let totalTaxableReversal = 0;
    let totalGstReversal = 0;
    let totalRefundAmount = 0;

    const itemsToReturn = [];

    itemsWithRemaining.forEach((it) => {
      const returnQty = returnQuantities[it.id] || 0;
      if (returnQty > 0) {
        totalQty += returnQty;
        const ratio = returnQty / it.origQty;
        const lineRefund = Number((it.lineTotal * ratio).toFixed(2));
        const lineTaxRefund = Number((it.lineTax * ratio).toFixed(2));
        const lineTaxableRefund = Number((lineRefund - lineTaxRefund).toFixed(2));

        totalRefundAmount += lineRefund;
        totalGstReversal += lineTaxRefund;
        totalTaxableReversal += lineTaxableRefund;

        itemsToReturn.push({
          saleItemId: it.id,
          productId: it.productId,
          name: it.name,
          quantity: returnQty,
          rate: it.rate,
          total: lineRefund,
          taxAmount: lineTaxRefund,
        });
      }
    });

    const cgstReversal = isInterState ? 0 : Number((totalGstReversal / 2).toFixed(2));
    const sgstReversal = isInterState ? 0 : Number((totalGstReversal / 2).toFixed(2));
    const igstReversal = isInterState ? totalGstReversal : 0;

    const currentGrandTotal = Number(fullInvoice?.grandTotal || fullInvoice?.originalGrandTotal || 0);
    const previousReturnedAmount = Number(fullInvoice?.totalReturnedAmount || fullInvoice?.returnedAmount || 0);
    const newNetInvoiceTotal = Math.max(0, Number((currentGrandTotal - previousReturnedAmount - totalRefundAmount).toFixed(2)));

    return {
      totalQty,
      totalTaxableReversal: Number(totalTaxableReversal.toFixed(2)),
      totalGstReversal: Number(totalGstReversal.toFixed(2)),
      cgstReversal,
      sgstReversal,
      igstReversal,
      totalRefundAmount: Number(totalRefundAmount.toFixed(2)),
      newNetInvoiceTotal,
      itemsToReturn,
    };
  }, [itemsWithRemaining, returnQuantities, isInterState, fullInvoice]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (returnCalculations.totalQty <= 0) {
      setError("Please specify at least 1 product quantity to return.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        items: returnCalculations.itemsToReturn,
        reason: reason === "Other" ? customReason || "Customer Return" : reason,
        refundMethod,
      };

      const invId = fullInvoice.id || fullInvoice._id;
      const res = await salesApi.return(invId, payload);
      const updatedSale = res?.sale || res;
      if (onSuccess) {
        onSuccess(updatedSale);
      }
      onClose();
    } catch (err) {
      console.error("Failed to process sale return:", err);
      const msg = err.response?.data?.message || err.message || "Failed to process return.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const invNumber = fullInvoice?.invoiceNumber || fullInvoice?.billNumber || "—";
  const customerName = fullInvoice?.customer?.name || fullInvoice?.customerName || "Walk-in Retail Customer";
  const invDate = new Date(fullInvoice?.createdAt || Date.now()).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* ── Modal Header ── */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 grid place-items-center shadow-2xs">
              <RotateCcw size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Product Return &amp; Credit Note
                </h2>
                <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {invNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Customer: <span className="font-semibold text-slate-700">{customerName}</span> &middot; Date: {invDate}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 grid place-items-center transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Modal Body ── */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Return Processing Error</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Quick Actions Bar */}
          <div className="flex items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/70 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span className="text-slate-600">
                GST Reversal will be calculated automatically based on product rates &amp; supply type ({isInterState ? "Inter-State / IGST" : "Intra-State / CGST + SGST"}).
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleReturnAllItems}
                className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition"
              >
                Return All
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-200/50 rounded-lg transition"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-3.5">Product Description</th>
                    <th className="py-3 px-2.5 text-center">HSN/SAC</th>
                    <th className="py-3 px-2.5 text-center">Unit Price</th>
                    <th className="py-3 px-2 text-center">GST %</th>
                    <th className="py-3 px-2 text-center">Sold</th>
                    <th className="py-3 px-2 text-center">Prev Ret.</th>
                    <th className="py-3 px-2 text-center font-bold text-slate-900">Available</th>
                    <th className="py-3 px-3 text-center w-36">Return Qty</th>
                    <th className="py-3 px-3.5 text-right">Taxable Adj.</th>
                    <th className="py-3 px-3.5 text-right font-bold text-slate-900">Line Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itemsWithRemaining.map((it) => {
                    const retQty = returnQuantities[it.id] || 0;
                    const ratio = it.origQty > 0 ? retQty / it.origQty : 0;
                    const lineRefund = Number((it.lineTotal * ratio).toFixed(2));
                    const lineTaxRefund = Number((it.lineTax * ratio).toFixed(2));
                    const lineTaxableRefund = Number((lineRefund - lineTaxRefund).toFixed(2));

                    return (
                      <tr key={it.id} className={retQty > 0 ? "bg-rose-50/30" : "hover:bg-slate-50/60"}>
                        <td className="py-3 px-3.5">
                          <p className="font-semibold text-slate-900 leading-tight">{it.name}</p>
                          {it.sku && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{it.sku}</p>}
                        </td>
                        <td className="py-3 px-2.5 text-center font-mono text-slate-600 text-[11px]">
                          {it.hsnCode || it.hsn || "1904"}
                        </td>
                        <td className="py-3 px-2.5 text-center font-mono text-slate-700">
                          ₹{it.rate.toFixed(2)}
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-slate-600">
                          {it.gstRate}%
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-slate-700 font-mono">
                          {it.origQty}
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-slate-500">
                          {it.returnedQty > 0 ? `-${it.returnedQty}` : "0"}
                        </td>
                        <td className="py-3 px-2 text-center font-mono font-bold text-emerald-600">
                          {it.remainingQty}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {it.remainingQty > 0 ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleQtyChange(it.id, retQty - 1, it.remainingQty)}
                                disabled={retQty <= 0}
                                className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold grid place-items-center text-xs"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                max={it.remainingQty}
                                value={retQty}
                                onChange={(e) => handleQtyChange(it.id, e.target.value, it.remainingQty)}
                                className="w-12 h-7 text-center font-mono font-bold text-xs rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-rose-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleQtyChange(it.id, retQty + 1, it.remainingQty)}
                                disabled={retQty >= it.remainingQty}
                                className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold grid place-items-center text-xs"
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReturnAllItem(it.id, it.remainingQty)}
                                title="Return Max"
                                className="text-[10px] text-blue-600 font-bold ml-1 hover:underline"
                              >
                                Max
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">
                              Fully Returned
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono text-slate-700">
                          {retQty > 0 ? `₹${lineTaxableRefund.toFixed(2)}` : "—"}
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-rose-600">
                          {retQty > 0 ? `₹${lineRefund.toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reason & Settlement Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Reason for Return</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="Customer Changed Mind">Customer Changed Mind</option>
                <option value="Defective / Damaged Item">Defective / Damaged Item</option>
                <option value="Wrong Item Delivered">Wrong Item Delivered</option>
                <option value="Excess Quantity Ordered">Excess Quantity Ordered</option>
                <option value="Quality Not Satisfactory">Quality Not Satisfactory</option>
                <option value="Other">Other (Specify below)</option>
              </select>
              {reason === "Other" && (
                <input
                  type="text"
                  placeholder="Enter specific reason..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Refund / Settlement Workflow</label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="CASH">Cash Refund to Customer</option>
                <option value="CREDIT">Store Credit / Adjust Customer Account Balance</option>
                <option value="ORIGINAL_PAYMENT">Original Payment Method (Reversal)</option>
              </select>
              <p className="text-[10px] text-slate-400">
                {refundMethod === "CREDIT"
                  ? "Decrements customer balance owed or creates a credit balance for future billing."
                  : "Records a cash/payment refund transaction and creates an audit entry."}
              </p>
            </div>
          </div>

          {/* ── Live Credit Note Summary Card ── */}
          <div className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-4 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs">
              <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Receipt size={15} className="text-rose-600" />
                Live Credit Note &amp; GST Adjustment Calculation
              </span>
              <span className="font-mono text-[11px] font-bold text-slate-600">
                {returnCalculations.totalQty} {returnCalculations.totalQty === 1 ? "Item" : "Items"} Selected
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <p className="text-[10px] text-slate-500 font-medium uppercase">Taxable Value Reversal</p>
                <p className="font-mono font-bold text-slate-800 text-sm mt-0.5">
                  ₹{returnCalculations.totalTaxableReversal.toFixed(2)}
                </p>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <p className="text-[10px] text-slate-500 font-medium uppercase">
                  {!isInterState ? "CGST & SGST Reversal" : "IGST Reversal"}
                </p>
                <p className="font-mono font-bold text-amber-600 text-sm mt-0.5">
                  ₹{returnCalculations.totalGstReversal.toFixed(2)}
                </p>
                <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                  {!isInterState
                    ? `CGST ₹${returnCalculations.cgstReversal} + SGST ₹${returnCalculations.sgstReversal}`
                    : `IGST ₹${returnCalculations.igstReversal}`}
                </p>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <p className="text-[10px] text-slate-500 font-medium uppercase">Total Refund / Credit</p>
                <p className="font-mono font-bold text-rose-600 text-sm mt-0.5">
                  ₹{returnCalculations.totalRefundAmount.toFixed(2)}
                </p>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <p className="text-[10px] text-slate-500 font-medium uppercase">New Net Invoice Total</p>
                <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                  ₹{returnCalculations.newNetInvoiceTotal.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Modal Footer ── */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>

          <Button
            variant="danger"
            size="sm"
            icon={RotateCcw}
            onClick={handleSubmit}
            disabled={submitting || returnCalculations.totalQty <= 0}
            loading={submitting}
          >
            Submit Return &amp; Issue Credit Note (₹{returnCalculations.totalRefundAmount.toFixed(2)})
          </Button>
        </div>
      </div>
    </div>
  );
}
