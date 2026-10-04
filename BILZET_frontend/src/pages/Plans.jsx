import { useState, useEffect } from "react";
import {
  Check,
  ShieldCheck,
  CreditCard,
  Sparkles,
  Zap,
  Clock,
  ArrowRight,
  CheckCircle2,
  X,
  QrCode,
  AlertCircle,
  FileText,
} from "lucide-react";

export default function Plans() {
  // Subscription state (persisted in localStorage)
  const [subData, setSubData] = useState(() => {
    const saved = localStorage.getItem("bilzet_subscription");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {}
    }
    return {
      currentPlan: "Free",
      validUntil: "14 Sept 2027",
      usedBills: 1,
      totalBills: 100,
      extraBills: 0,
      status: "Active",
      validity: "1 year validity",
      payments: [],
    };
  });

  const [checkoutModal, setCheckoutModal] = useState({
    open: false,
    plan: null,
    extraBills: false,
  });
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const saveSubData = (updated) => {
    setSubData(updated);
    localStorage.setItem("bilzet_subscription", JSON.stringify(updated));
  };

  const plans = [
    {
      name: "Free",
      price: "₹0",
      period: "/ year",
      sub: "100 included bills + optional 500-bill packs · 365 days",
      features: [
        "First 100 bills included for 1 year",
        "Buy extra 500-bill packs without changing plan",
        "Inventory & paid/unpaid tracking",
        "A4 / A5 print",
        "3 invoice templates",
        "3 color themes",
        "GST summary preview",
        "Fixed BILZET watermark",
      ],
      buttonLabel: "Renew Free for 1 Year",
      amount: 0,
    },
    {
      name: "Pro",
      price: "₹1,499.00",
      period: "/year",
      sub: "Unlimited bills · 365 days",
      features: [
        "Unlimited bills for 1 year",
        "Everything in Free",
        "8 invoice templates",
        "10 color themes",
        "Thermal 80mm",
        "BILZET watermark removed",
        "UPI payment QR + bank details",
        "WhatsApp PDF share flow",
        "GSTR-1 draft pack + GSTR-3B summary",
        "CA Connect",
      ],
      buttonLabel: "Choose Pro",
      amount: 1499,
    },
    {
      name: "Premium",
      price: "₹2,999.00",
      period: "/year",
      sub: "Unlimited bills · 365 days",
      features: [
        "Unlimited bills for 1 year",
        "Everything in Pro",
        "All premium templates & themes",
        "Thermal 58mm",
        "Credit / Debit Notes & Returns",
        "Advanced GST classifications",
        "Composition CMP-08 / GSTR-4 prep",
        "Premium design styles",
        "Priority / partner-ready controls",
      ],
      buttonLabel: "Choose Premium",
      amount: 2999,
    },
  ];

  const handlePlanClick = (p) => {
    if (p.name === subData.currentPlan && p.name === "Free") {
      // Renew Free for 1 Year
      const updated = {
        ...subData,
        validUntil: "14 Sept 2028",
        payments: [
          {
            id: `PAY-${Date.now().toString().slice(-6)}`,
            plan: "Free Renewal",
            amount: "₹0.00",
            date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
            status: "Completed",
          },
          ...subData.payments,
        ],
      };
      saveSubData(updated);
      alert("Free Plan renewed for 365 days until 14 Sept 2028!");
      return;
    }

    setCheckoutModal({
      open: true,
      plan: p,
      extraBills: false,
    });
  };

  const handleExtraBillsClick = () => {
    setCheckoutModal({
      open: true,
      plan: { name: "Extra 500 Bills Pack", price: "₹499.00", amount: 499 },
      extraBills: true,
    });
  };

  const confirmPayment = () => {
    setPaymentProcessing(true);
    setTimeout(() => {
      setPaymentProcessing(false);
      setPaymentSuccess(true);

      setTimeout(() => {
        if (checkoutModal.extraBills) {
          const updated = {
            ...subData,
            extraBills: subData.extraBills + 500,
            payments: [
              {
                id: `PAY-${Date.now().toString().slice(-6)}`,
                plan: "Extra 500 Bills Pack",
                amount: "₹499.00",
                date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
                status: "Success",
              },
              ...subData.payments,
            ],
          };
          saveSubData(updated);
        } else {
          const updated = {
            ...subData,
            currentPlan: checkoutModal.plan.name,
            totalBills: "Unlimited",
            payments: [
              {
                id: `PAY-${Date.now().toString().slice(-6)}`,
                plan: `${checkoutModal.plan.name} Annual`,
                amount: checkoutModal.plan.price,
                date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
                status: "Success",
              },
              ...subData.payments,
            ],
          };
          saveSubData(updated);
        }

        setPaymentSuccess(false);
        setCheckoutModal({ open: false, plan: null, extraBills: false });
      }, 1000);
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 fade-up font-sans">
      {/* ══════════════════════════════════════════════════
          1. TOP CURRENT STATUS CARD
      ══════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Current: {subData.currentPlan}
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Valid until {subData.validUntil}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-50 border border-slate-200/80 text-slate-700">
            {subData.usedBills} / {subData.totalBills} included bills used
          </span>
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-50 border border-slate-200/80 text-slate-700">
            {subData.extraBills} extra bills available
          </span>
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-50 border border-slate-200/80 text-slate-700">
            {subData.status} · {subData.validity}
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          2. THREE PRICING TIERS
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
        {plans.map((p) => {
          const isCurrent = p.name === subData.currentPlan;

          return (
            <div
              key={p.name}
              className={`rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all bg-white relative ${
                isCurrent
                  ? "border-2 border-blue-500 shadow-md ring-2 ring-blue-500/10"
                  : "border border-slate-200/90 hover:border-slate-300 shadow-xs"
              }`}
            >
              <div>
                {/* Header row with plan title & Current chip */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold text-slate-900">{p.name}</h3>
                  {isCurrent && (
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                </div>

                {/* Price Display */}
                <div className="mb-2 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                    {p.price}
                  </span>
                  <span className="text-sm font-semibold text-slate-600">{p.period}</span>
                </div>

                <p className="text-xs text-slate-500 font-medium mb-6 leading-relaxed">
                  {p.sub}
                </p>

                {/* Bullet Points */}
                <ul className="space-y-3 mb-8 text-xs text-slate-700">
                  {p.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                      <span className="leading-snug">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bottom CTA Button */}
              <div className="pt-2">
                {isCurrent ? (
                  <button
                    type="button"
                    onClick={() => handlePlanClick(p)}
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold border border-slate-300 hover:bg-slate-50 text-slate-800 transition active:scale-[0.99] shadow-2xs"
                  >
                    {p.buttonLabel}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handlePlanClick(p)}
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition active:scale-[0.99] shadow-xs"
                  >
                    {p.buttonLabel}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════
          3. "NEED ONLY MORE BILLS?" CARD
      ══════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Need only more bills?
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Stay on Free. Add 500 bill credits without changing to Pro.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExtraBillsClick}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition active:scale-[0.99] shadow-xs shrink-0 self-start sm:self-center"
        >
          Get Extra 500 Bills
        </button>
      </div>

      {/* ══════════════════════════════════════════════════
          4. PLAN RULES COMPARISON TABLE
      ══════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Plan Rules
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5 w-1/4">FEATURE</th>
                <th className="py-3 px-5 w-1/4">FREE</th>
                <th className="py-3 px-5 w-1/4">PRO</th>
                <th className="py-3 px-5 w-1/4">PREMIUM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-3.5 px-5 font-medium text-slate-800">Validity</td>
                <td className="py-3.5 px-5 text-slate-600">1 year</td>
                <td className="py-3.5 px-5 text-slate-600">1 year</td>
                <td className="py-3.5 px-5 text-slate-600">1 year</td>
              </tr>
              <tr>
                <td className="py-3.5 px-5 font-medium text-slate-800">Bills</td>
                <td className="py-3.5 px-5 text-slate-600">100 + 500 packs</td>
                <td className="py-3.5 px-5 text-slate-600">Unlimited</td>
                <td className="py-3.5 px-5 text-slate-600">Unlimited</td>
              </tr>
              <tr>
                <td className="py-3.5 px-5 font-medium text-slate-800">Templates</td>
                <td className="py-3.5 px-5 text-slate-600">3</td>
                <td className="py-3.5 px-5 text-slate-600">8</td>
                <td className="py-3.5 px-5 text-slate-600">All 11</td>
              </tr>
              <tr>
                <td className="py-3.5 px-5 font-medium text-slate-800">Watermark</td>
                <td className="py-3.5 px-5 text-slate-600">Fixed BILZET</td>
                <td className="py-3.5 px-5 text-slate-600">Removed</td>
                <td className="py-3.5 px-5 text-slate-600">Removed</td>
              </tr>
              <tr>
                <td className="py-3.5 px-5 font-medium text-slate-800">GST export</td>
                <td className="py-3.5 px-5 text-slate-600">Preview</td>
                <td className="py-3.5 px-5 text-slate-600">GSTR-1 / 3B draft</td>
                <td className="py-3.5 px-5 text-slate-600">Advanced</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          5. PAYMENT HISTORY
      ══════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
          Payment History
        </h3>

        {subData.payments.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 font-medium">
            No payments yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Invoice / ID</th>
                  <th className="py-2.5 px-4">Plan Item</th>
                  <th className="py-2.5 px-4 text-right">Amount Paid</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subData.payments.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-800">{p.id}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{p.plan}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900">{p.amount}</td>
                    <td className="py-2.5 px-4 text-slate-500">{p.date}</td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          6. PRODUCTION BILLING NOTE
      ══════════════════════════════════════════════════ */}
      <div className="bg-[#fff9f2] border-l-4 border-amber-500 rounded-r-2xl border-y border-r border-amber-200/70 p-4 sm:p-5">
        <h4 className="text-xs font-bold text-slate-900 mb-1">
          Production billing note
        </h4>
        <p className="text-xs text-slate-600 leading-relaxed font-normal">
          When Supabase backend mode is enabled, subscription activation and extra bill packs are controlled server-side by the BILZET admin portal. Add a verified payment gateway before collecting money.
        </p>
      </div>

      {/* ══════════════════════════════════════════════════
          7. FOOTER
      ══════════════════════════════════════════════════ */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 border-t border-slate-200/60">
        <div>
          &copy; 2026 <strong>Garden Greens Private Limited</strong>. All rights reserved.
        </div>
        <div>
          BILZET &middot; A product of Garden Greens
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          INTERACTIVE CHECKOUT MODAL
      ══════════════════════════════════════════════════ */}
      {checkoutModal.open && checkoutModal.plan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {checkoutModal.extraBills ? "Add Bill Credits" : `Upgrade to ${checkoutModal.plan.name}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutModal({ open: false, plan: null, extraBills: false })}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">{checkoutModal.plan.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {checkoutModal.extraBills ? "500 extra bill credits" : "365 days full access"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base font-black text-slate-900">{checkoutModal.plan.price}</p>
                  <span className="text-[10px] text-emerald-600 font-bold">18% GST Included</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-dashed border-slate-300 flex items-center gap-3">
                <QrCode size={36} className="text-blue-600 shrink-0" />
                <div className="text-[11px] text-slate-600 leading-snug">
                  <p className="font-bold text-slate-800">Direct UPI &amp; Cards Enabled</p>
                  <p>Instant automated ledger recording and subscription certificate issuance.</p>
                </div>
              </div>

              {paymentSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center font-bold flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>Payment Successful! Activating plan...</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                disabled={paymentProcessing}
                onClick={() => setCheckoutModal({ open: false, plan: null, extraBills: false })}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={paymentProcessing}
                onClick={confirmPayment}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs flex items-center justify-center gap-1.5"
              >
                {paymentProcessing ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Pay {checkoutModal.plan.price}</span>
                    <ArrowRight size={13} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
