import { useState } from "react";
import { Star, Copy, Check, Gift } from "lucide-react";

export default function Referral() {
  const [copied, setCopied] = useState(false);
  const referralCode = "BZW9O7GO";

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Refer & Earn
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Share BILZET with other store owners and get rewards on every subscription.
        </p>
      </div>

      <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 grid place-items-center">
            <Gift size={24} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Your Referral Code</h2>
            <p className="text-xs text-slate-400">
              Your friend gets 10% off and you get 1 extra month of BILZET Pro.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl max-w-sm">
          <span className="font-mono text-lg font-black text-slate-900 tracking-wider flex-1">
            {referralCode}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4361ee] hover:bg-[#3751d8] text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
