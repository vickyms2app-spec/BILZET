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
    <div className="space-y-5 pb-12 max-w-3xl fade-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 grid place-items-center shrink-0">
          <Star size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Refer &amp; Earn</h1>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            Share BILZET with other store owners and get rewards on every subscription
          </p>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0">
            <Gift size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Your Referral Code</h2>
            <p className="text-xs text-slate-400 font-normal mt-0.5">
              Your friend gets 10% off and you get 1 extra month of BILZET Pro.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl max-w-sm">
          <span className="font-mono text-lg font-bold text-slate-900 tracking-[0.15em] flex-1 px-1">
            {referralCode}
          </span>
          <button
            onClick={handleCopy}
            className="btn-primary text-xs py-2 px-3.5 inline-flex items-center gap-1.5 shrink-0"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
