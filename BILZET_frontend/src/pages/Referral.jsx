import { useState, useMemo, useEffect } from "react";
import { Star, Copy, Check, Gift, Share2, Award, Users, Percent, MessageCircle } from "lucide-react";
import { useAuth } from "../store/auth";
import { referralApi } from "../api";

export default function Referral() {
  const { user } = useAuth();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [serverInfo, setServerInfo] = useState(null);

  useEffect(() => {
    let mounted = true;
    referralApi
      .getInfo()
      .then((data) => {
        if (mounted && data) setServerInfo(data);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Generate deterministic referral code from user ID/email or backend sync
  const referralCode = useMemo(() => {
    if (serverInfo?.referralCode) return serverInfo.referralCode;
    if (user?.referralCode) return user.referralCode;
    if (user?.id) {
      const clean = user.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
      return `BZ${clean}`;
    }
    if (user?.email) {
      const prefix = user.email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase();
      return `BZ${prefix}7`;
    }
    return "BZPROMO8";
  }, [user, serverInfo]);

  const referralLink = `${typeof window !== "undefined" ? window.location.origin : "https://bilzet.app"}/sign-up?ref=${referralCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Hey! Check out BILZET for super-fast shop billing, GST invoicing, and inventory management. Use my referral code ${referralCode} to get 10% off: ${referralLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 grid place-items-center shrink-0">
            <Star size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Refer &amp; Earn</h1>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Share BILZET with fellow merchants and earn free months of BILZET Pro
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          {serverInfo?.stats?.bonusMonthsEarned > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Gift size={14} className="text-emerald-600" />
              <span>{serverInfo.stats.bonusMonthsEarned} Mo Free Earned</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Award size={14} />
            <span>BILZET Partner Rewards</span>
          </span>
        </div>
      </div>

      {/* Main Referral Box */}
      <div className="card p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0">
            <Gift size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Your Merchant Referral Link</h2>
            <p className="text-xs text-slate-400 font-normal mt-0.5">
              When your referral subscribes to BILZET, they receive 10% off and you receive 1 bonus month of Pro ERP.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Referral Code
            </label>
            <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="font-mono text-base font-bold text-slate-900 tracking-wider flex-1 px-2">
                {referralCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 shrink-0"
              >
                {copiedCode ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedCode ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Referral Link
            </label>
            <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs text-slate-600 truncate flex-1 px-1 font-mono">
                {referralLink}
              </span>
              <button
                onClick={handleCopyLink}
                className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 shrink-0"
              >
                {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedLink ? "Copied" : "Copy Link"}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleShareWhatsApp}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs"
          >
            <MessageCircle size={15} />
            <span>Share via WhatsApp</span>
          </button>
          <div className="flex items-center gap-4 text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <Percent size={13} className="text-amber-500" /> 10% Discount for referee
            </span>
            <span className="flex items-center gap-1">
              <Gift size={13} className="text-amber-500" /> 1 Month Free for you
            </span>
          </div>
        </div>
      </div>

      {/* Rewards Milestones */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 border border-slate-200/80">
          <div className="flex items-center gap-2.5 text-slate-700 font-bold text-xs mb-1">
            <Users size={16} className="text-blue-600" />
            <span>Step 1: Invite</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Send your unique referral code or link to shop owners, retail stores, or wholesalers.
          </p>
        </div>
        <div className="card p-4 border border-slate-200/80">
          <div className="flex items-center gap-2.5 text-slate-700 font-bold text-xs mb-1">
            <Award size={16} className="text-amber-600" />
            <span>Step 2: Sign Up</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            They register with your code and activate their store account on BILZET.
          </p>
        </div>
        <div className="card p-4 border border-slate-200/80">
          <div className="flex items-center gap-2.5 text-slate-700 font-bold text-xs mb-1">
            <Gift size={16} className="text-emerald-600" />
            <span>Step 3: Earn</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            You get 30 days added to your subscription plan instantly upon their first upgrade.
          </p>
        </div>
      </div>
    </div>
  );
}
