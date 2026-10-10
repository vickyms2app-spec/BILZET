import React from "react";
import {
  Clock,
  X,
  Play,
  Trash2,
  User,
  Phone,
  ShoppingBag,
  Receipt,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

export default function HeldBillsModal({
  isOpen,
  onClose,
  heldBills = [],
  onResumeBill,
  onDeleteHeldBill,
  onClearAllHeld,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-100">
                  Held Bills Manager
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {heldBills.length} {heldBills.length === 1 ? "Bill" : "Bills"} on Hold
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Parked counter transactions ready to resume, edit, or settle
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {heldBills.length === 0 ? (
            <div className="py-14 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
                <Clock size={28} />
              </div>
              <div className="max-w-sm mx-auto">
                <p className="font-bold text-slate-800 text-sm">No Bills Currently on Hold</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  When a customer steps away or needs more items, click{" "}
                  <strong className="text-slate-600">"Hold Bill"</strong> in POS to park their
                  cart without losing any entered details.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              {heldBills.map((bill) => {
                const heldTime = new Date(bill.heldAt).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const heldDate = new Date(bill.heldAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                });

                return (
                  <div
                    key={bill.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-md transition-all duration-200 space-y-3"
                  >
                    {/* Top Row: Bill No & Timestamp */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-lg">
                          #{bill.billNumber}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Held on {heldDate} at {heldTime}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 font-mono">
                          Total: ₹{Number(bill.grandTotal || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Customer & Items summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <User size={13} className="text-slate-400" />
                          <span>{bill.customerName || "Walk-in Retail Customer"}</span>
                        </div>
                        {bill.mobileNumber && (
                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                            <Phone size={12} className="text-slate-400" />
                            <span>{bill.mobileNumber}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 sm:text-right">
                        <div className="flex items-center sm:justify-end gap-1.5 text-slate-600 font-medium">
                          <ShoppingBag size={13} className="text-slate-400" />
                          <span>
                            {bill.items?.length || 0} line {bill.items?.length === 1 ? "item" : "items"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {bill.items?.map((i) => `${i.name} (x${i.qty})`).join(", ")}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="pt-2 flex items-center justify-between border-t border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => onDeleteHeldBill(bill.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition"
                      >
                        <Trash2 size={13} />
                        <span>Discard Bill</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onResumeBill(bill)}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition active:scale-95"
                      >
                        <Play size={13} fill="currentColor" />
                        <span>Resume &amp; Settle</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 sm:px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500 text-[11px]">
            Held bills are stored securely in browser cache until resumed or discarded.
          </span>
          <div className="flex items-center gap-2">
            {heldBills.length > 1 && (
              <button
                type="button"
                onClick={onClearAllHeld}
                className="text-slate-500 hover:text-rose-600 font-semibold text-xs px-2 py-1"
              >
                Clear All
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-white transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
