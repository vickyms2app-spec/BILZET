import { useState, useEffect } from "react";
import {
  Coins,
  Share2,
  Copy,
  Check,
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldCheck,
  Banknote,
  QrCode,
  Building,
  ExternalLink,
  Info,
  RefreshCw,
  Gift,
  HelpCircle,
} from "lucide-react";
import { caReferralApi } from "../api";
import { useAuth } from "../store/auth";

export default function CaReferral() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  // Referral History
  const [referrals, setReferrals] = useState([]);
  const [referralPage, setReferralPage] = useState(1);
  const [referralPagination, setReferralPagination] = useState(null);
  const [referralLoading, setReferralLoading] = useState(false);

  // Payout History
  const [payouts, setPayouts] = useState([]);
  const [payoutPage, setPayoutPage] = useState(1);
  const [payoutPagination, setPayoutPagination] = useState(null);
  const [payoutLoading, setPayoutLoading] = useState(false);

  // Active History Tab
  const [activeTab, setActiveTab] = useState("referrals"); // 'referrals' | 'payouts'

  // Copy Feedback State
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Redemption Modal State
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [redeemCoins, setRedeemCoins] = useState(500);
  const [payoutMethod, setPayoutMethod] = useState("UPI"); // 'UPI' | 'BANK_TRANSFER'
  const [upiId, setUpiId] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [redeemSubmitting, setRedeemSubmitting] = useState(false);
  const [redeemError, setRedeemError] = useState(null);
  const [redeemSuccess, setRedeemSuccess] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await caReferralApi.getDashboard();
      if (res.data || res.profile) {
        setDashboardData(res.data || res);
        // Default redeem coins to minRedemption or current available
        const minReq = res.data?.config?.minRedemptionCoins || res.config?.minRedemptionCoins || 500;
        setRedeemCoins(minReq);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load CA Referral Dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchReferrals = async (page = 1) => {
    try {
      setReferralLoading(true);
      const res = await caReferralApi.getReferrals({ page, limit: 10 });
      if (res.data || res.referrals) {
        const payload = res.data || res;
        setReferrals(payload.referrals || []);
        setReferralPagination(payload.pagination);
        setReferralPage(page);
      }
    } catch (err) {
      console.error("Failed to load referral history:", err);
    } finally {
      setReferralLoading(false);
    }
  };

  const fetchPayouts = async (page = 1) => {
    try {
      setPayoutLoading(true);
      const res = await caReferralApi.getPayouts({ page, limit: 10 });
      if (res.data || res.payouts) {
        const payload = res.data || res;
        setPayouts(payload.payouts || []);
        setPayoutPagination(payload.pagination);
        setPayoutPage(page);
      }
    } catch (err) {
      console.error("Failed to load payout history:", err);
    } finally {
      setPayoutLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchReferrals(1);
    fetchPayouts(1);
  }, []);

  const handleCopyCode = async () => {
    if (!dashboardData?.profile?.referralCode) return;
    try {
      await navigator.clipboard.writeText(dashboardData.profile.referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  const handleCopyLink = async () => {
    if (!dashboardData?.profile?.referralLink) return;
    try {
      await navigator.clipboard.writeText(dashboardData.profile.referralLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  const handleNativeShare = async () => {
    if (!dashboardData?.profile?.referralLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join BILZET — Smart GST Billing & POS",
          text: `Use my Chartered Accountant referral code ${dashboardData.profile.referralCode} to sign up on BILZET for your store billing and compliance.`,
          url: dashboardData.profile.referralLink,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  const handleRedeemSubmit = async (e) => {
    e.preventDefault();
    setRedeemError(null);
    setRedeemSuccess(null);

    const minAllowed = dashboardData?.config?.minRedemptionCoins || 500;
    const requested = Number(redeemCoins);

    if (isNaN(requested) || requested < minAllowed) {
      setRedeemError(`Minimum redemption request is ${minAllowed} coins (₹${minAllowed}).`);
      return;
    }

    if (requested > (dashboardData?.profile?.availableCoins || 0)) {
      setRedeemError("Requested coins exceed your current available coin balance.");
      return;
    }

    if (payoutMethod === "UPI") {
      if (!upiId.trim() || !upiId.includes("@")) {
        setRedeemError("Please enter a valid UPI ID (e.g. yourname@oksbi).");
        return;
      }
    } else {
      if (!bankAccountNumber.trim() || bankAccountNumber.length < 8) {
        setRedeemError("Please provide a valid bank account number.");
        return;
      }
      if (!bankIfsc.trim() || bankIfsc.length < 5) {
        setRedeemError("Please provide a valid bank IFSC code.");
        return;
      }
      if (!bankAccountName.trim()) {
        setRedeemError("Please provide the beneficiary account holder name.");
        return;
      }
    }

    try {
      setRedeemSubmitting(true);
      await caReferralApi.submitRedemption({
        coinsRequested: requested,
        payoutMethod,
        upiId: payoutMethod === "UPI" ? upiId.trim() : undefined,
        bankAccountNumber: payoutMethod === "BANK_TRANSFER" ? bankAccountNumber.trim() : undefined,
        bankIfsc: payoutMethod === "BANK_TRANSFER" ? bankIfsc.trim().toUpperCase() : undefined,
        bankAccountName: payoutMethod === "BANK_TRANSFER" ? bankAccountName.trim() : undefined,
      });

      setRedeemSuccess("Redemption request submitted successfully! Our administrative team will verify and process the payout.");
      // Refresh dashboard and payouts
      fetchDashboard();
      fetchPayouts(1);
      setTimeout(() => {
        setIsRedeemModalOpen(false);
        setRedeemSuccess(null);
        setUpiId("");
        setBankAccountNumber("");
        setBankIfsc("");
        setBankAccountName("");
      }, 2500);
    } catch (err) {
      setRedeemError(err?.response?.data?.message || err?.message || "Failed to submit redemption request");
    } finally {
      setRedeemSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-700">Loading Refer & Earn Workspace…</p>
        <p className="text-xs text-slate-400 mt-1">Verifying Chartered Accountant credentials</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-white border border-rose-200 rounded-2xl shadow-sm text-center">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mx-auto mb-3">
          <AlertCircle size={26} />
        </div>
        <h3 className="text-base font-bold text-slate-900">CA Refer & Earn Access</h3>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">{error}</p>
        <button
          onClick={fetchDashboard}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  const profile = dashboardData?.profile || {};
  const stats = dashboardData?.stats || {};
  const config = dashboardData?.config || {};
  const canRedeem = dashboardData?.canRedeem;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold tracking-wide uppercase">
              <ShieldCheck size={14} /> CA Partner Exclusivity
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Refer &amp; Earn for Chartered Accountants
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Earn <span className="font-bold text-amber-300">100 coins (₹100)</span> for every merchant business that signs up with your referral code and activates their first paid subscription.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => setIsRedeemModalOpen(true)}
              disabled={!canRedeem}
              className={`px-5 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-md ${
                canRedeem
                  ? "bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer shadow-amber-400/20"
                  : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
              }`}
            >
              <Coins size={18} />
              Redeem Coins
              {!canRedeem && (
                <span className="text-[11px] font-normal opacity-75">
                  (Min {config.minRedemptionCoins || 500})
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Available Balance */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">Available Balance</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{profile.availableCoins || 0}</span>
            <span className="text-xs font-bold text-amber-600">coins</span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-600 block mt-1">
            = ₹{profile.rupeeEquivalent || 0}
          </span>
        </div>

        {/* Total Earned */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">Lifetime Earned</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{profile.totalCoinsEarned || 0}</span>
            <span className="text-xs font-bold text-slate-400">coins</span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            ₹{profile.totalCoinsEarned || 0} generated
          </span>
        </div>

        {/* Reserved in Review */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">Pending Review</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-indigo-600">{profile.reservedCoins || 0}</span>
            <span className="text-xs font-bold text-indigo-400">coins</span>
          </div>
          <span className="text-[11px] text-indigo-500 block mt-1">Reserved for payout</span>
        </div>

        {/* Total Redeemed */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">Total Redeemed</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{profile.redeemedCoins || 0}</span>
            <span className="text-xs font-bold text-slate-400">coins</span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">Paid to account</span>
        </div>

        {/* Total Payouts ₹ */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">Payout Completed</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-emerald-600">₹{profile.totalPayoutRupees || 0}</span>
          </div>
          <span className="text-[11px] text-emerald-600 block mt-1">Direct Bank / UPI</span>
        </div>

        {/* Eligible Referrals */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">Subscribed Stores</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-blue-600">{stats.eligibleReferrals || 0}</span>
            <span className="text-xs text-slate-400">/ {stats.totalReferrals || 0} total</span>
          </div>
          <span className="text-[11px] text-blue-600 block mt-1">
            {stats.pendingReferrals || 0} awaiting payment
          </span>
        </div>
      </div>

      {/* Shareable Referral Code & Link Box */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Share2 size={18} />
              </span>
              <h2 className="text-base font-bold text-slate-900">Your Unique Referral Link &amp; Code</h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Share your link with client businesses or retail store owners. Attribution is immutably linked to your CA profile upon shop registration.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Referral Code Box */}
            <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">CA Referral Code</span>
                <span className="font-mono text-sm font-black text-slate-900 tracking-wider">
                  {profile.referralCode || "CA-..."}
                </span>
              </div>
              <button
                onClick={handleCopyCode}
                className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 border border-transparent hover:border-slate-200 transition"
                title="Copy Code"
              >
                {copiedCode ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
              </button>
            </div>

            {/* Share Link Action */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                {copiedLink ? "Link Copied!" : "Copy Link"}
              </button>
              <button
                onClick={handleNativeShare}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                title="Share via Apps"
              >
                <Share2 size={14} />
                Share
              </button>
            </div>
          </div>
        </div>

        {/* Clear Business Rule Explainer Callout */}
        <div className="mt-5 p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-3">
          <Info size={18} className="text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <span className="font-bold">Authoritative Qualification Rule:</span> Referral coins are credited only after the referred store completes its <span className="font-semibold underline">first verified successful paid subscription payment</span> (Pro or Premium). Simple store registration, free trials, or failed payments do not generate coins.
          </div>
        </div>
      </div>

      {/* Tabs & History Section */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 pt-4">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab("referrals")}
              className={`pb-3 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
                activeTab === "referrals"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Referred Businesses
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === "referrals" ? "bg-blue-50 text-blue-700 font-extrabold" : "bg-slate-100 text-slate-600"
              }`}>
                {referralPagination?.total || referrals.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("payouts")}
              className={`pb-3 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
                activeTab === "payouts"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Payouts &amp; Redemptions
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === "payouts" ? "bg-blue-50 text-blue-700 font-extrabold" : "bg-slate-100 text-slate-600"
              }`}>
                {payoutPagination?.total || payouts.length}
              </span>
            </button>
          </div>

          <button
            onClick={() => {
              if (activeTab === "referrals") fetchReferrals(referralPage);
              else fetchPayouts(payoutPage);
            }}
            className="text-xs text-slate-500 hover:text-slate-900 pb-3 flex items-center gap-1 transition cursor-pointer"
          >
            <RefreshCw size={12} className={referralLoading || payoutLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Tab 1: Referral History */}
        {activeTab === "referrals" && (
          <div className="p-0">
            {referralLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">Loading referral records…</div>
            ) : referrals.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                  <Gift size={24} />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No Referrals Recorded Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Share your unique referral link with merchants. Once they register their shop, you will see their attribution status here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Referred Business</th>
                      <th className="px-6 py-3">Registration Date</th>
                      <th className="px-6 py-3">Qualification Status</th>
                      <th className="px-6 py-3">Qualifying Date</th>
                      <th className="px-6 py-3 text-right">Reward Coins</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {referrals.map((r) => {
                      const isEligible = r.status === "ELIGIBLE";
                      const isPending = r.status === "REGISTERED";
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-6 py-4 font-semibold text-slate-900">
                            {r.businessName || "Store Business"}
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            {new Date(r.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-6 py-4">
                            {isEligible ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 size={12} /> Eligible / Reward Credited
                              </span>
                            ) : isPending ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock size={12} /> Registered — Awaiting Qualifying Payment
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {r.status}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            {r.qualifyingPaymentDate
                              ? new Date(r.qualifyingPaymentDate).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "—"}
                          </td>
                          <td className="px-6 py-4 text-right font-black text-slate-900">
                            {isEligible ? (
                              <span className="text-emerald-600 font-extrabold">+{r.rewardCoins || 100} coins</span>
                            ) : (
                              <span className="text-slate-400 font-normal">Pending</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {referralPagination && referralPagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 text-xs text-slate-500">
                <span>
                  Showing page {referralPagination.page} of {referralPagination.totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={referralPage <= 1}
                    onClick={() => fetchReferrals(referralPage - 1)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
                  >
                    Previous
                  </button>
                  <button
                    disabled={referralPage >= referralPagination.totalPages}
                    onClick={() => fetchReferrals(referralPage + 1)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Payouts & Redemptions */}
        {activeTab === "payouts" && (
          <div className="p-0">
            {payoutLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">Loading payout records…</div>
            ) : payouts.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                  <Banknote size={24} />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No Redemption Requests Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Once you reach {config.minRedemptionCoins || 500} coins, click &ldquo;Redeem Coins&rdquo; to submit a payout request.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Request ID</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Coins &amp; Amount</th>
                      <th className="px-6 py-3">Method</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Payment Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {payouts.map((p) => {
                      const isPaid = p.status === "PAID";
                      const isPending = p.status === "PENDING_REVIEW";
                      const isApproved = p.status === "APPROVED";
                      const isRejected = p.status === "REJECTED";

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-6 py-4 font-mono font-bold text-slate-900">
                            {p.id.slice(0, 10)}…
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            {new Date(p.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-extrabold text-slate-900 block">{p.coinsRequested} coins</span>
                            <span className="text-[11px] text-emerald-600 font-semibold">₹{p.rupeeAmount}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-800 block">{p.payoutMethod}</span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {p.payoutDetails?.upiId || p.payoutDetails?.accountNumber || "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 size={12} /> Paid
                              </span>
                            ) : isApproved ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                <Clock size={12} /> Approved (Payment Processing)
                              </span>
                            ) : isPending ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock size={12} /> Pending Admin Review
                              </span>
                            ) : isRejected ? (
                              <div>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <XCircle size={12} /> Rejected
                                </span>
                                {p.rejectionReason && (
                                  <span className="block text-[10px] text-rose-600 mt-1 max-w-xs">
                                    {p.rejectionReason}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                                {p.status}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-600">
                            {p.paymentReference ? (
                              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {p.paymentReference}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Pending Transfer</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {payoutPagination && payoutPagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 text-xs text-slate-500">
                <span>
                  Showing page {payoutPagination.page} of {payoutPagination.totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={payoutPage <= 1}
                    onClick={() => fetchPayouts(payoutPage - 1)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
                  >
                    Previous
                  </button>
                  <button
                    disabled={payoutPage >= payoutPagination.totalPages}
                    onClick={() => fetchPayouts(payoutPage + 1)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Redemption Request Modal */}
      {isRedeemModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                  <Coins size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Redeem Referral Coins</h3>
                  <p className="text-xs text-slate-500">Minimum threshold: 500 coins = ₹500</p>
                </div>
              </div>
              <button
                onClick={() => setIsRedeemModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {redeemError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{redeemError}</span>
              </div>
            )}

            {redeemSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-start gap-2">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <span>{redeemSuccess}</span>
              </div>
            )}

            <form onSubmit={handleRedeemSubmit} className="space-y-4">
              {/* Coins Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Coins to Redeem
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={config.minRedemptionCoins || 500}
                    max={profile.availableCoins || 0}
                    step={1}
                    value={redeemCoins}
                    onChange={(e) => setRedeemCoins(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-500">
                    = ₹{redeemCoins || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
                  <span>Available: {profile.availableCoins || 0} coins</span>
                  <button
                    type="button"
                    onClick={() => setRedeemCoins(profile.availableCoins || 500)}
                    className="text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Max ({profile.availableCoins || 0})
                  </button>
                </div>
              </div>

              {/* Payout Method */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payout Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayoutMethod("UPI")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      payoutMethod === "UPI"
                        ? "bg-blue-50 border-blue-600 text-blue-700"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <QrCode size={14} /> UPI Transfer
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutMethod("BANK_TRANSFER")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      payoutMethod === "BANK_TRANSFER"
                        ? "bg-blue-50 border-blue-600 text-blue-700"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Building size={14} /> Direct Bank Transfer
                  </button>
                </div>
              </div>

              {/* Method-specific inputs */}
              {payoutMethod === "UPI" ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    UPI ID (VPA)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. yourname@okhdfcbank"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      placeholder="Full Name as in Bank Record"
                      value={bankAccountName}
                      onChange={(e) => setBankAccountName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Account Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 501002345678"
                        value={bankAccountNumber}
                        onChange={(e) => setBankAccountNumber(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. HDFC0001234"
                        value={bankIfsc}
                        onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs uppercase text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                🔒 Payouts are manually audited and authorized by platform administration. Coins are atomically reserved and deducted upon payment transfer confirmation.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRedeemModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={redeemSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {redeemSubmitting ? "Submitting…" : `Submit (₹${redeemCoins})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
