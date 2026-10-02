import { useState } from "react";
import { Check, ShieldCheck, Sparkles, CreditCard, Zap } from "lucide-react";

export default function Plans() {
  const [selectedPlan, setSelectedPlan] = useState("Pro");

  const plans = [
    {
      name: "Free",
      isCurrent: true,
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
      buttonVariant: "outline",
      accentColor: "from-slate-400 to-slate-500",
    },
    {
      name: "Pro",
      isPopular: true,
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
      buttonVariant: "solid",
      accentColor: "from-blue-500 to-indigo-600",
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
      buttonVariant: "dark",
      accentColor: "from-violet-500 to-purple-700",
    },
  ];

  return (
    <div className="space-y-5 pb-12 fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 grid place-items-center shrink-0">
            <CreditCard size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Plans &amp; Payments</h1>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Choose the billing plan that powers your shop with compliance, speed and branding
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-center">
          <ShieldCheck size={13} />
          <span>365-Day Validity Included</span>
        </span>
      </div>

      {/* 3 Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
        {plans.map((p) => {
          const isPro = p.isPopular;
          const isFree = p.name === "Free";
          const isDark = p.buttonVariant === "dark";

          return (
            <div
              key={p.name}
              className={`pricing-card ${isPro ? "featured" : ""}`}
              style={{ paddingTop: isPro ? "2.25rem" : "1.75rem" }}
            >
              {/* Most Popular Badge */}
              {isPro && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest px-3.5 py-1 rounded-full shadow flex items-center gap-1 whitespace-nowrap">
                  <Sparkles size={11} />
                  <span>Most Popular</span>
                </div>
              )}

              {/* Accent Bar */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${p.accentColor} rounded-t-[1.25rem]`} />

              <div className="flex-1">
                {/* Plan Header */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
                  {p.isCurrent && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                      Active Plan
                    </span>
                  )}
                </div>

                {/* Price Display */}
                <div className="mb-2 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-950 tracking-tight tabular-nums">
                    {p.price}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{p.period}</span>
                </div>

                <p className="text-xs text-slate-500 font-normal mb-5 leading-relaxed min-h-[34px]">{p.sub}</p>

                <div className="h-px bg-slate-100 mb-5" />

                {/* Feature List */}
                <ul className="space-y-2.5 mb-6 text-xs text-slate-700">
                  {p.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={10} strokeWidth={3} />
                      </div>
                      <span className="leading-snug">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bottom Action Button */}
              <div className="pt-1">
                {isFree ? (
                  <button
                    onClick={() => alert("Free plan active for 365 days!")}
                    className="w-full py-2.5 px-4 btn-secondary text-xs font-semibold"
                  >
                    {p.buttonLabel}
                  </button>
                ) : isPro ? (
                  <button
                    onClick={() => alert(`Upgrading to ${p.name}!`)}
                    className="w-full py-2.5 px-4 btn-primary text-xs font-semibold"
                  >
                    {p.buttonLabel}
                  </button>
                ) : (
                  <button
                    onClick={() => alert(`Upgrading to ${p.name}!`)}
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition active:scale-95"
                  >
                    {p.buttonLabel}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
