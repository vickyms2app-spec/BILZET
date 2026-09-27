import { useState } from "react";
import { Check, ShieldCheck } from "lucide-react";

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
      buttonVariant: "solid",
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Plans & Payments
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Choose the billing plan that powers your shop with compliance, speed and branding.
        </p>
      </div>

      {/* 3 Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {plans.map((p) => {
          const isFree = p.name === "Free";

          return (
            <div
              key={p.name}
              className={`bg-white rounded-2xl p-7 flex flex-col justify-between shadow-sm transition-all duration-200 border-2 ${
                isFree
                  ? "border-blue-600 shadow-blue-500/5 ring-4 ring-blue-50"
                  : "border-slate-200/90 hover:border-slate-300"
              }`}
            >
              <div>
                {/* Plan Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-900">{p.name}</h3>
                  {p.isCurrent && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                      Current
                    </span>
                  )}
                </div>

                {/* Price Display */}
                <div className="mb-2 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-950 tracking-tight">
                    {p.price}
                  </span>
                  <span className="text-sm font-bold text-slate-700">
                    {p.period}
                  </span>
                </div>

                <p className="text-xs text-slate-400 font-medium mb-6 leading-relaxed">
                  {p.sub}
                </p>

                {/* Feature Bullet List */}
                <ul className="space-y-3 mb-8 text-xs text-slate-700">
                  {p.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-800 shrink-0 mt-1.5" />
                      <span className="leading-snug">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bottom Action Button */}
              <div>
                {p.buttonVariant === "outline" ? (
                  <button
                    onClick={() => alert("Free plan active for 365 days!")}
                    className="w-full py-3 px-4 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm active:scale-95"
                  >
                    {p.buttonLabel}
                  </button>
                ) : (
                  <button
                    onClick={() => alert(`Upgrading to ${p.name}!`)}
                    className="w-full py-3 px-4 bg-[#1a5cff] hover:bg-[#1248cc] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-95"
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
