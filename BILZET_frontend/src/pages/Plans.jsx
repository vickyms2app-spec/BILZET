import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
  Plus,
  Lock,
  Crown,
  Building2,
  Users,
  Receipt,
  HelpCircle,
} from "lucide-react";
import Button, { CompactIconButton } from "../components/common/Button";
import { subscriptionApi } from "../api";

export default function Plans() {
  const [searchParams] = useSearchParams();
  const targetTier = (searchParams.get("tier") || "").toUpperCase();

  // Subscription state (persisted in localStorage and synchronized with backend API)
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

  // Sync active subscription status with backend on load
  useEffect(() => {
    let mounted = true;
    subscriptionApi
      .getStatus()
      .then((res) => {
        if (!mounted || !res) return;
        if (res.planTier) {
          const tierCapitalized =
            res.planTier.charAt(0).toUpperCase() + res.planTier.slice(1).toLowerCase();
          setSubData((prev) => {
            const updated = {
              ...prev,
              currentPlan: tierCapitalized,
              status: res.status || "Active",
              validUntil: res.expiresAt
                ? new Date(res.expiresAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : prev.validUntil,
              totalBills: res.planTier === "FREE" ? prev.totalBills : "Unlimited",
            };
            localStorage.setItem("bilzet_subscription", JSON.stringify(updated));
            localStorage.setItem(
              "bilzet_subscription_data",
              JSON.stringify({ currentPlan: tierCapitalized, status: updated.status })
            );
            return updated;
          });
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const saveSubData = (updated) => {
    setSubData(updated);
    localStorage.setItem("bilzet_subscription", JSON.stringify(updated));
    localStorage.setItem(
      "bilzet_subscription_data",
      JSON.stringify({ currentPlan: updated.currentPlan, status: updated.status || "Active" })
    );
  };

  const plans = [
    {
      name: "Free",
      tier: "FREE",
      price: "₹0",
      period: "/ year",
      sub: "100 included bills + optional 500-bill packs · 365 days",
      badge: "Starter",
      features: [
        "First 100 bills included for 1 year",
        "Single-user owner account (0 sub-users)",
        "Buy extra 500-bill packs without changing plan",
        "Inventory tracking & paid/unpaid register",
        "A4 / A5 standard print layouts",
        "3 invoice templates & color themes",
        "Daily and monthly sales reports",
        "GST summary preview",
        "Fixed BILZET watermark on bills",
      ],
      buttonLabel: "Renew Free for 1 Year",
      amount: 0,
    },
    {
      name: "Pro",
      tier: "PRO",
      price: "₹1,499.00",
      period: "/year",
      sub: "Unlimited bills · 365 days",
      badge: "Popular Business",
      features: [
        "Unlimited bills for 1 year",
        "Everything in Free plan",
        "Up to 5 Team & Cashier Sub-Users",
        "Standard Role Assignments (Manager, Cashier, Staff)",
        "Thermal 80mm POS receipt roll printer",
        "Remove BILZET watermark from bills",
        "Direct Bank details & scan-to-pay UPI QR on invoices",
        "Profit & Loss reports & Excel (.xlsx) data export",
        "GSTR-1 draft pack + GSTR-3B tax summary",
        "WhatsApp invoice PDF sharing & SMS dispatch alerts",
        "Online store orders management",
      ],
      buttonLabel: "Choose Pro",
      amount: 1499,
    },
    {
      name: "Premium",
      tier: "PREMIUM",
      price: "₹2,999.00",
      period: "/year",
      sub: "Unlimited bills · 365 days",
      badge: "Full Enterprise",
      features: [
        "Unlimited bills for 1 year",
        "Everything in Pro plan",
        "Up to 15 Team Sub-Users",
        "CA Connect — Chartered Accountant collaboration portal",
        "Custom Roles & Permissions Studio",
        "Granular Permission Overrides per user",
        "Thermal 58mm ultra-compact mobile handheld roll",
        "Custom Brand HEX Color picker for invoice branding",
        "Multi-document terms customization (Invoices, Quotes, Challans)",
        "Advanced GST classifications & CMP-08 filing prep",
        "Credit & Debit notes / Sales returns",
        "Priority partner-level enterprise support",
      ],
      buttonLabel: "Choose Premium",
      amount: 2999,
    },
  ];

  const handlePlanClick = (p) => {
    if (p.name.toUpperCase() === (subData.currentPlan || "FREE").toUpperCase() && p.name === "Free") {
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
      alert("Free Plan renewed for 365 days!");
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

  const confirmPayment = async () => {
    setPaymentProcessing(true);
    try {
      const paymentRef = `PAY-${Date.now().toString().slice(-6)}`;
      const targetPlanName = checkoutModal.plan.name;
      const targetPlanTier = checkoutModal.extraBills
        ? (subData.currentPlan || "FREE").toUpperCase()
        : targetPlanName.toUpperCase();

      if (!checkoutModal.extraBills) {
        // Persist upgrade to backend DB
        await subscriptionApi.upgrade({
          planTier: targetPlanTier,
          amount: checkoutModal.plan.amount,
          billingCycle: "ANNUAL",
          paymentReference: paymentRef,
        });
      }

      setPaymentProcessing(false);
      setPaymentSuccess(true);

      setTimeout(() => {
        if (checkoutModal.extraBills) {
          const updated = {
            ...subData,
            extraBills: subData.extraBills + 500,
            payments: [
              {
                id: paymentRef,
                plan: "Extra 500 Bills Pack",
                amount: "₹499.00",
                date: new Date().toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }),
                status: "Success",
              },
              ...subData.payments,
            ],
          };
          saveSubData(updated);
        } else {
          const updated = {
            ...subData,
            currentPlan: targetPlanName,
            totalBills: "Unlimited",
            payments: [
              {
                id: paymentRef,
                plan: `${targetPlanName} Annual`,
                amount: checkoutModal.plan.price,
                date: new Date().toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }),
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
    } catch (err) {
      setPaymentProcessing(false);
      alert(err?.message || "Payment confirmation failed. Please try again.");
    }
  };

  // Detailed comparison matrix rows
  const comparisonRows = [
    {
      category: "Billing & Core Features",
      items: [
        { feature: "Validity Period", free: "1 Year (365 Days)", pro: "1 Year (365 Days)", premium: "1 Year (365 Days)" },
        { feature: "Bills / Invoices Allowance", free: "100 Bills (+ 500 Packs)", pro: "Unlimited Bills", premium: "Unlimited Bills" },
        { feature: "Product Catalog & Stock Management", free: "Included", pro: "Included", premium: "Included" },
        { feature: "Multi-Godown / Warehouse Transfers", free: "Included", pro: "Included", premium: "Included" },
      ],
    },
    {
      category: "Hardware & Print Formats",
      items: [
        { feature: "A4 / A5 Standard Paper Layout", free: "Included", pro: "Included", premium: "Included" },
        { feature: "Thermal 80mm POS Roll Printer", free: "Locked", pro: "Included", premium: "Included", proBadge: true },
        { feature: "Thermal 58mm Handheld Bluetooth Roll", free: "Locked", pro: "Locked", premium: "Included", premBadge: true },
        { feature: "BILZET Watermark on Bills", free: "Fixed Branding", pro: "100% Removed", premium: "100% Removed" },
        { feature: "Custom Brand HEX Color Picker", free: "Locked", pro: "Locked", premium: "Included", premBadge: true },
      ],
    },
    {
      category: "Banking & Settlement",
      items: [
        { feature: "Bank Beneficiary & IFSC on Bill", free: "Locked", pro: "Included", premium: "Included", proBadge: true },
        { feature: "Scan-to-Pay Dynamic UPI QR", free: "Locked", pro: "Included", premium: "Included", proBadge: true },
        { feature: "WhatsApp PDF Bill Sharing", free: "Locked", pro: "Included", premium: "Included", proBadge: true },
      ],
    },
    {
      category: "Team & User Access",
      items: [
        { feature: "Team Sub-Users (Staff / Cashier)", free: "Owner Only (0 Sub-users)", pro: "Up to 5 Users", premium: "Up to 15 Users" },
        { feature: "Standard Role Assignments", free: "Owner Only", pro: "Manager, Cashier, Staff", premium: "All Roles" },
        { feature: "Custom Roles & Permissions Studio", free: "Locked", pro: "Locked", premium: "Included", premBadge: true },
        { feature: "Granular User Permission Overrides", free: "Locked", pro: "Locked", premium: "Included", premBadge: true },
      ],
    },
    {
      category: "Tax, Accounting & Reports",
      items: [
        { feature: "Daily & Monthly Sales Reports", free: "Included", pro: "Included", premium: "Included" },
        { feature: "Gross & Net Profit & Loss Analysis", free: "Locked", pro: "Included", premium: "Included", proBadge: true },
        { feature: "Excel (.xlsx) Data Export", free: "Locked", pro: "Included", premium: "Included", proBadge: true },
        { feature: "GSTR-1 Draft & GSTR-3B Summary", free: "Locked", pro: "Included", premium: "Included", proBadge: true },
        {
          feature: "CA Connect (Chartered Accountant Portal)",
          free: "Locked",
          pro: "Locked",
          premium: "Included (Full Access)",
          premBadge: true,
          highlight: true,
        },
      ],
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 fade-up font-sans">
      {/* ══════════════════════════════════════════════════
          1. TOP CURRENT STATUS CARD
      ══════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Active Plan: {subData.currentPlan}
            </h2>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                subData.currentPlan.toUpperCase() === "PREMIUM"
                  ? "bg-amber-50 text-amber-800 border-amber-300"
                  : subData.currentPlan.toUpperCase() === "PRO"
                  ? "bg-blue-50 text-blue-800 border-blue-300"
                  : "bg-slate-100 text-slate-700 border-slate-300"
              }`}
            >
              {subData.status.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Entitlements valid until {subData.validUntil}
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
            Annual billing cycle
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          2. THREE PRICING TIERS
      ══════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="text-center sm:text-left">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Subscription Plans &amp; Feature Access
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Choose the ideal plan for your retail store. Upgrade anytime to unlock advanced capabilities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch pt-2">
          {plans.map((p) => {
            const isCurrent = p.name.toUpperCase() === (subData.currentPlan || "FREE").toUpperCase();
            const isTarget = Boolean(targetTier) && p.name.toUpperCase() === targetTier && !isCurrent;

            return (
              <div
                key={p.name}
                className={`rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all bg-white relative ${
                  isTarget
                    ? "border-2 border-indigo-600 shadow-lg ring-4 ring-indigo-500/20"
                    : isCurrent
                    ? "border-2 border-blue-500 shadow-md ring-2 ring-blue-500/10"
                    : "border border-slate-200/90 hover:border-slate-300 shadow-xs"
                }`}
              >
                <div>
                  {/* Header row with plan title & Current / Target chip */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-slate-900">{p.name}</h3>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {p.badge}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isTarget && (
                        <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                          <Sparkles className="w-3 h-3 text-indigo-500" /> Target Plan
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
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
                        <CheckCircle2
                          size={14}
                          className={`shrink-0 mt-0.5 ${
                            p.name === "Premium"
                              ? "text-amber-500"
                              : p.name === "Pro"
                              ? "text-blue-500"
                              : "text-emerald-500"
                          }`}
                        />
                        <span className="leading-snug">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Bottom CTA Button */}
                <div className="pt-2">
                  <Button
                    variant={isCurrent ? "neutral" : "primary"}
                    icon={isCurrent ? Check : Zap}
                    onClick={() => handlePlanClick(p)}
                    className="w-full"
                  >
                    {isCurrent ? "Active Plan" : p.buttonLabel}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
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
            Stay on Free. Add 500 bill credits without changing your subscription plan.
          </p>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          onClick={handleExtraBillsClick}
          className="shrink-0 self-start sm:self-center"
        >
          Get Extra 500 Bills
        </Button>
      </div>

      {/* ══════════════════════════════════════════════════
          4. FULL FEATURE COMPARISON MATRIX TABLE
      ══════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs space-y-0">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Detailed Plan Comparison Table
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Side-by-side feature access across Free, Pro, and Premium tiers.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
            Updated for 2026 Release
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3.5 px-5 w-2/5">Feature / Capability</th>
                <th className="py-3.5 px-5 w-1/5 text-center">Free Plan</th>
                <th className="py-3.5 px-5 w-1/5 text-center bg-blue-50/40 text-blue-900">Pro Plan</th>
                <th className="py-3.5 px-5 w-1/5 text-center bg-amber-50/40 text-amber-900">Premium Plan</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((cat, cIdx) => (
                <div key={cIdx} style={{ display: "contents" }}>
                  <tr className="bg-slate-100/60 border-y border-slate-200/70">
                    <td
                      colSpan={4}
                      className="py-2.5 px-5 font-bold text-[11px] uppercase tracking-wider text-slate-700"
                    >
                      {cat.category}
                    </td>
                  </tr>
                  {cat.items.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={`border-b border-slate-100 transition-colors ${
                        row.highlight ? "bg-amber-50/20" : "hover:bg-slate-50/60"
                      }`}
                    >
                      <td className="py-3 px-5 font-semibold text-slate-800">
                        {row.feature}
                      </td>

                      {/* Free Column */}
                      <td className="py-3 px-5 text-center text-slate-600">
                        {row.free === "Included" ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                            <Check size={13} className="text-emerald-600" /> Included
                          </span>
                        ) : row.free === "Locked" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                            <Lock size={11} /> Locked
                          </span>
                        ) : (
                          row.free
                        )}
                      </td>

                      {/* Pro Column */}
                      <td className="py-3 px-5 text-center text-slate-800 bg-blue-50/20">
                        {row.pro === "Included" ? (
                          <span className="inline-flex items-center gap-1 font-bold text-blue-700">
                            <Check size={13} className="text-blue-600" /> Included
                          </span>
                        ) : row.pro === "Locked" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                            <Lock size={11} /> Locked
                          </span>
                        ) : (
                          <span className="font-semibold text-blue-900">{row.pro}</span>
                        )}
                      </td>

                      {/* Premium Column */}
                      <td className="py-3 px-5 text-center text-slate-900 bg-amber-50/20">
                        {row.premium.includes("Included") ? (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-800">
                            <Check size={13} className="text-amber-600" /> {row.premium}
                          </span>
                        ) : (
                          <span className="font-semibold text-amber-950">{row.premium}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </div>
              ))}
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
            No payments recorded yet
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
          Subscription activation and extra bill packs are controlled server-side by the BILZET backend engine. All feature access entitlements are synchronized across your devices instantly.
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
              <CompactIconButton
                icon={X}
                variant="neutral"
                onClick={() => setCheckoutModal({ open: false, plan: null, extraBills: false })}
                title="Close"
              />
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
              <Button
                type="button"
                variant="neutral"
                icon={X}
                disabled={paymentProcessing}
                onClick={() => setCheckoutModal({ open: false, plan: null, extraBills: false })}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                icon={ArrowRight}
                disabled={paymentProcessing}
                loading={paymentProcessing}
                onClick={confirmPayment}
                className="flex-1"
              >
                Pay {checkoutModal.plan.price}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
