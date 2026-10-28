import { useState, useEffect } from "react";
import {
  Gift,
  Coins,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Sliders,
  AlertCircle,
  Eye,
  Check,
  X,
  Send,
  Building,
  QrCode,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { caReferralApi } from "../../api";
import { useAuth } from "../../store/auth";

export default function SuperAdminReferrals() {
  const { user } = useAuth();

  // Active view: 'redemptions' | 'referrals' | 'config'
  const [activeTab, setActiveTab] = useState("redemptions");

  // Redemptions Queue State
  const [redemptions, setRedemptions] = useState([]);
  const [redemptionStatusFilter, setRedemptionStatusFilter] = useState("ALL");
  const [loadingRedemptions, setLoadingRedemptions] = useState(false);
  const [redemptionPagination, setRedemptionPagination] = useState(null);
  const [redemptionPage, setRedemptionPage] = useState(1);

  // Referrals Directory State
  const [referrals, setReferrals] = useState([]);
  const [referralSearch, setReferralSearch] = useState("");
  const [referralStatusFilter, setReferralStatusFilter] = useState("ALL");
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [referralPagination, setReferralPagination] = useState(null);
  const [referralPage, setReferralPage] = useState(1);

  // Program Configuration State
  const [config, setConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(null);
  const [configError, setConfigError] = useState(null);

  // Modal / Action States
  const [selectedRedemption, setSelectedRedemption] = useState(null);
  const [actionType, setActionType] = useState(null); // 'APPROVE' | 'REJECT' | 'PAYOUT'
  const [actionNotes, setActionNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Fetch Program Config
  const fetchConfig = async () => {
    try {
      setLoadingConfig(true);
      const res = await caReferralApi.getConfig();
      setConfig(res.data || res);
    } catch (err) {
      console.error("Failed to fetch program config:", err);
    } finally {
      setLoadingConfig(false);
    }
  };

  // Fetch Redemptions
  const fetchRedemptions = async (page = 1) => {
    try {
      setLoadingRedemptions(true);
      const res = await caReferralApi.getAdminRedemptions({
        page,
        limit: 20,
        status: redemptionStatusFilter !== "ALL" ? redemptionStatusFilter : undefined,
      });
      const data = res.data || res;
      setRedemptions(data.redemptions || []);
      setRedemptionPagination(data.pagination);
      setRedemptionPage(page);
    } catch (err) {
      console.error("Failed to load redemptions:", err);
    } finally {
      setLoadingRedemptions(false);
    }
  };

  // Fetch Referrals
  const fetchReferrals = async (page = 1) => {
    try {
      setLoadingReferrals(true);
      const res = await caReferralApi.getAdminReferrals({
        page,
        limit: 20,
        status: referralStatusFilter !== "ALL" ? referralStatusFilter : undefined,
        search: referralSearch.trim() || undefined,
      });
      const data = res.data || res;
      setReferrals(data.referrals || []);
      setReferralPagination(data.pagination);
      setReferralPage(page);
    } catch (err) {
      console.error("Failed to load referrals:", err);
    } finally {
      setLoadingReferrals(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchRedemptions(1);
    fetchReferrals(1);
  }, []);

  const handleUpdateConfig = async (e) => {
    e.preventDefault();
    setConfigSuccess(null);
    setConfigError(null);
    try {
      setSavingConfig(true);
      const res = await caReferralApi.updateConfig({
        coinsPerReferral: Number(config.coinsPerReferral),
        rupeesPerCoin: Number(config.rupeesPerCoin),
        minRedemptionCoins: Number(config.minRedemptionCoins),
        isEnabled: Boolean(config.isEnabled),
      });
      setConfig(res.data || res);
      setConfigSuccess("Program configuration successfully updated and audit event recorded.");
      setTimeout(() => setConfigSuccess(null), 3000);
    } catch (err) {
      setConfigError(err?.response?.data?.message || err?.message || "Failed to update configuration");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleExecuteAction = async (e) => {
    e.preventDefault();
    if (!selectedRedemption || !actionType) return;
    setActionError(null);
    setActionSuccess(null);

    try {
      setActionSubmitting(true);
      if (actionType === "APPROVE") {
        await caReferralApi.approveRedemption(selectedRedemption.id, actionNotes);
        setActionSuccess("Redemption request approved for payout processing.");
      } else if (actionType === "REJECT") {
        if (!rejectionReason.trim()) {
          setActionError("Rejection reason is mandatory.");
          setActionSubmitting(false);
          return;
        }
        await caReferralApi.rejectRedemption(selectedRedemption.id, rejectionReason.trim());
        setActionSuccess("Redemption request rejected and reserved coins refunded.");
      } else if (actionType === "PAYOUT") {
        if (!paymentReference.trim()) {
          setActionError("Bank transaction reference (UTR / IMPS) is required.");
          setActionSubmitting(false);
          return;
        }
        await caReferralApi.recordPayout(selectedRedemption.id, {
          transactionReference: paymentReference.trim(),
          paymentDate,
          notes: actionNotes.trim(),
        });
        setActionSuccess("Payout payment verified and redemption finalized.");
      }

      fetchRedemptions(redemptionPage);
      setTimeout(() => {
        setSelectedRedemption(null);
        setActionType(null);
        setActionNotes("");
        setRejectionReason("");
        setPaymentReference("");
        setActionSuccess(null);
      }, 1500);
    } catch (err) {
      setActionError(err?.response?.data?.message || err?.message || "Action failed");
    } finally {
      setActionSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E3EDF8]">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#EEF7FF] border border-[#D8EBFF] text-[#2563EB] text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck size={14} /> Platform Administration
          </div>
          <h1 className="text-2xl font-black text-[#526B87] tracking-tight">CA Refer &amp; Earn Control Panel</h1>
          <p className="text-xs text-[#7188A3] mt-1">
            Authoritative management of Chartered Accountant referral attribution, reward eligibility, redemptions, and payouts.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-[#E3EDF8] rounded-xl shadow-2xs">
          <button
            onClick={() => setActiveTab("redemptions")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === "redemptions"
                ? "bg-[#D8EBFF] text-[#2563EB] shadow-2xs"
                : "text-[#7188A3] hover:text-[#526B87] hover:bg-[#F4F9FF]"
            }`}
          >
            Redemptions &amp; Payouts
          </button>
          <button
            onClick={() => setActiveTab("referrals")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === "referrals"
                ? "bg-[#D8EBFF] text-[#2563EB] shadow-2xs"
                : "text-[#7188A3] hover:text-[#526B87] hover:bg-[#F4F9FF]"
            }`}
          >
            Referral Attribution Directory
          </button>
          <button
            onClick={() => setActiveTab("config")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === "config"
                ? "bg-[#D8EBFF] text-[#2563EB] shadow-2xs"
                : "text-[#7188A3] hover:text-[#526B87] hover:bg-[#F4F9FF]"
            }`}
          >
            Program Economics Config
          </button>
        </div>
      </div>

      {/* VIEW 1: REDEMPTIONS QUEUE */}
      {activeTab === "redemptions" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-4 flex-wrap bg-white border border-[#E3EDF8] shadow-2xs p-3 rounded-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#7188A3] flex items-center gap-1">
                <Filter size={14} /> Status:
              </span>
              {["ALL", "PENDING_REVIEW", "APPROVED", "PAID", "REJECTED"].map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setRedemptionStatusFilter(st);
                    fetchRedemptions(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    redemptionStatusFilter === st
                      ? "bg-[#D8EBFF] text-[#2563EB]"
                      : "bg-[#F4F9FF] text-[#7188A3] hover:text-[#526B87] border border-[#E3EDF8]"
                  }`}
                >
                  {st.replace("_", " ")}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchRedemptions(redemptionPage)}
              className="p-2 text-[#8AAED8] hover:text-[#526B87] bg-[#F4F9FF] rounded-xl border border-[#E3EDF8] transition cursor-pointer"
              title="Refresh Queue"
            >
              <RefreshCw size={14} className={loadingRedemptions ? "animate-spin text-[#2563EB]" : ""} />
            </button>
          </div>

          {/* Redemptions Table */}
          <div className="bg-white border border-[#E3EDF8] shadow-2xs rounded-2xl overflow-hidden">
            {loadingRedemptions ? (
              <div className="py-16 text-center text-xs text-[#7188A3]">Loading redemption records…</div>
            ) : redemptions.length === 0 ? (
              <div className="py-16 text-center text-[#94A8BE] text-xs">
                No redemption requests found for the selected status.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#EAF4FF] border-b border-[#E3EDF8] text-[#526B87] uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="px-5 py-3">CA Account</th>
                      <th className="px-5 py-3">Requested</th>
                      <th className="px-5 py-3">Method &amp; Details</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Payment Ref</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDF3FA] text-[#7188A3]">
                    {redemptions.map((r) => {
                      const isPending = r.status === "PENDING_REVIEW";
                      const isApproved = r.status === "APPROVED";
                      const isPaid = r.status === "PAID";
                      const isRejected = r.status === "REJECTED";

                      return (
                        <tr key={r.id} className="hover:bg-[#F4F9FF] transition">
                          <td className="px-5 py-3.5">
                            <span className="font-bold text-[#526B87] block">{r.caUser?.name || "CA User"}</span>
                            <span className="text-[11px] text-[#7188A3]">{r.caUser?.email}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="font-extrabold text-[#B45309] block">{r.coinsRequested} coins</span>
                            <span className="text-[11px] text-[#166534] font-bold">₹{r.rupeeAmount}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="font-bold text-[#526B87] block">{r.payoutMethod}</span>
                            <span className="text-[11px] text-[#7188A3] font-mono">
                              {r.payoutDetails?.upiId || r.payoutDetails?.accountNumber || "—"}
                            </span>
                            {r.payoutDetails?.bankIfsc && (
                              <span className="text-[10px] text-[#94A8BE] font-mono block">
                                IFSC: {r.payoutDetails?.bankIfsc}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ECF9F1] text-[#166534] border border-[#C8E6C9]">
                                <CheckCircle2 size={11} /> PAID
                              </span>
                            ) : isApproved ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EEF7FF] text-[#2563EB] border border-[#D8EBFF]">
                                <Clock size={11} /> APPROVED (READY FOR PAYOUT)
                              </span>
                            ) : isPending ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF6E9] text-[#B45309] border border-[#FDE68A]">
                                <Clock size={11} /> PENDING REVIEW
                              </span>
                            ) : isRejected ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF0F2] text-[#991B1B] border border-[#FECDD3]">
                                <XCircle size={11} /> REJECTED
                              </span>
                            ) : (
                              <span>{r.status}</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-[11px]">
                            {r.paymentReference ? (
                              <span className="text-[#166534] bg-[#ECF9F1] px-2 py-0.5 rounded border border-[#C8E6C9]">
                                {r.paymentReference}
                              </span>
                            ) : (
                              <span className="text-[#94A8BE]">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-[#7188A3] text-[11px]">
                            {new Date(r.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                            {isPending && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedRedemption(r);
                                    setActionType("APPROVE");
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-[#ECF9F1] hover:bg-[#DCFCE7] text-[#166534] border border-[#C8E6C9] text-[11px] font-bold transition cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedRedemption(r);
                                    setActionType("REJECT");
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-[#FFF0F2] hover:bg-[#FFE4E6] text-[#991B1B] border border-[#FECDD3] text-[11px] font-bold transition cursor-pointer"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {isApproved && (
                              <button
                                onClick={() => {
                                  setSelectedRedemption(r);
                                  setActionType("PAYOUT");
                                }}
                                className="px-3 py-1 rounded-lg bg-[#D8EBFF] hover:bg-[#C7E1FF] text-[#2563EB] font-bold text-[11px] transition shadow-2xs cursor-pointer"
                              >
                                Record Payment (₹{r.rupeeAmount})
                              </button>
                            )}
                            {(isPaid || isRejected) && (
                              <button
                                onClick={() => {
                                  setSelectedRedemption(r);
                                  setActionType("VIEW");
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#F0F7FF] hover:bg-[#E3EDF8] text-[#526B87] text-[11px] font-semibold transition cursor-pointer"
                              >
                                Details
                              </button>
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
            {redemptionPagination && redemptionPagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-[#E3EDF8] text-xs text-[#7188A3]">
                <span>Page {redemptionPagination.page} of {redemptionPagination.totalPages}</span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={redemptionPage <= 1}
                    onClick={() => fetchRedemptions(redemptionPage - 1)}
                    className="px-2.5 py-1 rounded bg-[#F0F7FF] border border-[#E3EDF8] disabled:opacity-40 hover:text-[#526B87] transition"
                  >
                    Prev
                  </button>
                  <button
                    disabled={redemptionPage >= redemptionPagination.totalPages}
                    onClick={() => fetchRedemptions(redemptionPage + 1)}
                    className="px-2.5 py-1 rounded bg-[#F0F7FF] border border-[#E3EDF8] disabled:opacity-40 hover:text-[#526B87] transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: REFERRAL DIRECTORY */}
      {activeTab === "referrals" && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-[#E3EDF8] shadow-2xs p-3 rounded-2xl">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-3 text-[#8AAED8]" />
              <input
                type="text"
                placeholder="Search by CA, store, or referral code…"
                value={referralSearch}
                onChange={(e) => setReferralSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") fetchReferrals(1);
                }}
                className="w-full pl-9 pr-3.5 py-2 bg-[#F4F9FF] border border-[#E3EDF8] rounded-xl text-xs text-[#526B87] placeholder-[#94A8BE] focus:outline-none focus:border-[#8AAED8]"
              />
            </div>

            <div className="flex items-center gap-2">
              {["ALL", "REGISTERED", "ELIGIBLE", "INELIGIBLE"].map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setReferralStatusFilter(st);
                    fetchReferrals(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    referralStatusFilter === st
                      ? "bg-[#D8EBFF] text-[#2563EB]"
                      : "bg-[#F4F9FF] text-[#7188A3] hover:text-[#526B87] border border-[#E3EDF8]"
                  }`}
                >
                  {st}
                </button>
              ))}

              <button
                onClick={() => fetchReferrals(1)}
                className="p-2 text-[#8AAED8] hover:text-[#526B87] bg-[#F4F9FF] rounded-xl border border-[#E3EDF8] transition cursor-pointer"
                title="Search"
              >
                <RefreshCw size={14} className={loadingReferrals ? "animate-spin text-[#2563EB]" : ""} />
              </button>
            </div>
          </div>

          {/* Referrals Table */}
          <div className="bg-white border border-[#E3EDF8] shadow-2xs rounded-2xl overflow-hidden">
            {loadingReferrals ? (
              <div className="py-16 text-center text-xs text-[#7188A3]">Loading referral directory…</div>
            ) : referrals.length === 0 ? (
              <div className="py-16 text-center text-[#94A8BE] text-xs">No referral attributions found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#EAF4FF] border-b border-[#E3EDF8] text-[#526B87] uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="px-5 py-3">Referring CA</th>
                      <th className="px-5 py-3">Referral Code</th>
                      <th className="px-5 py-3">Referred Business</th>
                      <th className="px-5 py-3">Qualification Status</th>
                      <th className="px-5 py-3">Qualifying Payment Ref</th>
                      <th className="px-5 py-3">Attributed Date</th>
                      <th className="px-5 py-3 text-right">Coins</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDF3FA] text-[#7188A3]">
                    {referrals.map((rf) => {
                      const isEligible = rf.status === "ELIGIBLE";
                      const isPending = rf.status === "REGISTERED";

                      return (
                        <tr key={rf.id} className="hover:bg-[#F4F9FF] transition">
                          <td className="px-5 py-3.5">
                            <span className="font-bold text-[#526B87] block">{rf.caUser?.name || "CA Account"}</span>
                            <span className="text-[11px] text-[#7188A3]">{rf.caUser?.email}</span>
                          </td>
                          <td className="px-5 py-3.5 font-mono font-bold text-[#2563EB]">
                            {rf.referralCode}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="font-bold text-[#526B87] block">
                              {rf.referredBusiness?.name || rf.referredBusinessName || "Referred Store"}
                            </span>
                            <span className="text-[10px] text-[#94A8BE] font-mono">
                              ID: {rf.referredBusinessId || "—"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            {isEligible ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ECF9F1] text-[#166534] border border-[#C8E6C9]">
                                <CheckCircle2 size={11} /> ELIGIBLE / CREDITED
                              </span>
                            ) : isPending ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF6E9] text-[#B45309] border border-[#FDE68A]">
                                <Clock size={11} /> REGISTERED (AWAITING 1ST PAYMENT)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-[#F4F9FF] text-[#94A8BE] border border-[#E3EDF8]">
                                {rf.status}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-[11px]">
                            {rf.qualifyingPaymentRef ? (
                              <span className="text-[#166534] bg-[#ECF9F1] px-2 py-0.5 rounded border border-[#C8E6C9]">
                                {rf.qualifyingPaymentRef}
                              </span>
                            ) : (
                              <span className="text-[#94A8BE] italic">None (Unpaid)</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-[#7188A3] text-[11px]">
                            {new Date(rf.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-5 py-3.5 text-right font-black">
                            {isEligible ? (
                              <span className="text-[#166534]">+{rf.rewardCoins || 100}</span>
                            ) : (
                              <span className="text-[#94A8BE] font-normal">0</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: PROGRAM ECONOMICS CONFIGURATION */}
      {activeTab === "config" && (
        <div className="max-w-2xl bg-white border border-[#E3EDF8] shadow-2xs rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-[#526B87] flex items-center gap-2">
              <Sliders size={18} className="text-[#2563EB]" />
              Centralized Program Parameters
            </h3>
            <p className="text-xs text-[#7188A3] mt-1">
              Changes apply strictly to future qualifying events and redemptions. Historical ledger entries and recorded payouts retain their original immutable conversion snapshots.
            </p>
          </div>

          {configSuccess && (
            <div className="p-3 bg-[#ECF9F1] border border-[#C8E6C9] rounded-xl text-xs text-[#166534] flex items-center gap-2">
              <CheckCircle2 size={16} /> {configSuccess}
            </div>
          )}

          {configError && (
            <div className="p-3 bg-[#FFF0F2] border border-[#FECDD3] rounded-xl text-xs text-[#991B1B] flex items-center gap-2">
              <AlertCircle size={16} /> {configError}
            </div>
          )}

          {config && (
            <form onSubmit={handleUpdateConfig} className="space-y-4 text-xs">
              {/* Program Enable Switch */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F4F9FF] border border-[#E3EDF8]">
                <div>
                  <span className="font-bold text-[#526B87] block">Program Active Status</span>
                  <span className="text-[11px] text-[#7188A3]">
                    If paused, new referral rewards and redemption requests cannot be initiated.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={config.isEnabled}
                  onChange={(e) => setConfig({ ...config, isEnabled: e.target.checked })}
                  className="w-5 h-5 accent-[#2563EB] cursor-pointer"
                />
              </div>

              {/* Coins Per Referral */}
              <div>
                <label className="block text-[#526B87] font-bold mb-1">
                  Coins Awarded Per Qualifying Referral
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={config.coinsPerReferral}
                  onChange={(e) => setConfig({ ...config, coinsPerReferral: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F4F9FF] border border-[#E3EDF8] rounded-xl text-[#526B87] font-bold focus:outline-none focus:border-[#8AAED8]"
                  required
                />
                <span className="text-[11px] text-[#94A8BE] mt-0.5 block">Standard rule: 100 coins per eligible first paid subscription</span>
              </div>

              {/* Conversion Rate (Rupees Per Coin) */}
              <div>
                <label className="block text-[#526B87] font-bold mb-1">
                  Rupees (₹) Per Coin
                </label>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={config.rupeesPerCoin}
                  onChange={(e) => setConfig({ ...config, rupeesPerCoin: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F4F9FF] border border-[#E3EDF8] rounded-xl text-[#526B87] font-bold focus:outline-none focus:border-[#8AAED8]"
                  required
                />
                <span className="text-[11px] text-[#94A8BE] mt-0.5 block">Standard rule: 1.0 (100 coins = ₹100)</span>
              </div>

              {/* Minimum Redemption Coins */}
              <div>
                <label className="block text-[#526B87] font-bold mb-1">
                  Minimum Redemption Threshold (Coins)
                </label>
                <input
                  type="number"
                  min={100}
                  step={50}
                  value={config.minRedemptionCoins}
                  onChange={(e) => setConfig({ ...config, minRedemptionCoins: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F4F9FF] border border-[#E3EDF8] rounded-xl text-[#526B87] font-bold focus:outline-none focus:border-[#8AAED8]"
                  required
                />
                <span className="text-[11px] text-[#94A8BE] mt-0.5 block">Standard rule: 500 coins = ₹500</span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-5 py-2.5 bg-[#D8EBFF] hover:bg-[#C7E1FF] text-[#2563EB] font-black rounded-xl transition shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {savingConfig ? "Saving Changes…" : "Save Program Settings"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ACTION MODAL: APPROVE / REJECT / RECORD PAYOUT */}
      {selectedRedemption && actionType && (
        <div className="fixed inset-0 z-50 bg-[#0F2747]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E3EDF8] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#EDF3FA]">
              <h3 className="text-base font-bold text-[#526B87] flex items-center gap-2">
                {actionType === "APPROVE" && <CheckCircle2 className="text-[#166534]" size={18} />}
                {actionType === "REJECT" && <XCircle className="text-[#991B1B]" size={18} />}
                {actionType === "PAYOUT" && <Coins className="text-[#2563EB]" size={18} />}
                {actionType === "VIEW" && <Eye className="text-[#8AAED8]" size={18} />}
                {actionType === "APPROVE" && "Approve Redemption Request"}
                {actionType === "REJECT" && "Reject Redemption Request"}
                {actionType === "PAYOUT" && "Record Completed Payout"}
                {actionType === "VIEW" && "Redemption Request Details"}
              </h3>
              <button
                onClick={() => {
                  setSelectedRedemption(null);
                  setActionType(null);
                }}
                className="text-[#94A8BE] hover:text-[#526B87]"
              >
                ✕
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-[#FFF0F2] border border-[#FECDD3] rounded-xl text-[#991B1B] flex items-center gap-2">
                <AlertCircle size={16} /> {actionError}
              </div>
            )}

            {actionSuccess && (
              <div className="p-3 bg-[#ECF9F1] border border-[#C8E6C9] rounded-xl text-[#166534] flex items-center gap-2">
                <CheckCircle2 size={16} /> {actionSuccess}
              </div>
            )}

            {/* Request Summary Card */}
            <div className="p-3.5 bg-[#F4F9FF] border border-[#E3EDF8] rounded-xl space-y-2 text-[#7188A3]">
              <div className="flex justify-between">
                <span className="text-[#7188A3]">Chartered Accountant:</span>
                <span className="font-bold text-[#526B87]">{selectedRedemption.caUser?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7188A3]">Email:</span>
                <span className="font-mono text-[#526B87]">{selectedRedemption.caUser?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7188A3]">Coins Requested:</span>
                <span className="font-black text-[#B45309]">{selectedRedemption.coinsRequested} coins</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7188A3]">Rupee Payout Amount:</span>
                <span className="font-black text-[#166534]">₹{selectedRedemption.rupeeAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7188A3]">Payout Method:</span>
                <span className="font-bold text-[#526B87]">{selectedRedemption.payoutMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7188A3]">Account / VPA:</span>
                <span className="font-mono text-[#2563EB]">
                  {selectedRedemption.payoutDetails?.upiId ||
                    selectedRedemption.payoutDetails?.accountNumber ||
                    "—"}
                </span>
              </div>
              {selectedRedemption.payoutDetails?.bankIfsc && (
                <div className="flex justify-between">
                  <span className="text-[#7188A3]">IFSC Code:</span>
                  <span className="font-mono text-[#526B87]">{selectedRedemption.payoutDetails?.bankIfsc}</span>
                </div>
              )}
            </div>

            {/* Action Form */}
            {actionType !== "VIEW" ? (
              <form onSubmit={handleExecuteAction} className="space-y-4">
                {actionType === "REJECT" && (
                  <div>
                    <label className="block text-[#526B87] font-bold mb-1">
                      Mandatory Reason for Rejection *
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="e.g. Invalid bank details or suspected account discrepancy"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full p-2.5 bg-[#F4F9FF] border border-[#E3EDF8] rounded-xl text-[#526B87] focus:outline-none focus:border-[#EF4444]"
                    />
                    <span className="text-[11px] text-[#94A8BE] mt-1 block">
                      Reserved coins will be immediately unlocked and restored to the CA&apos;s available balance.
                    </span>
                  </div>
                )}

                {actionType === "PAYOUT" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[#526B87] font-bold mb-1">
                        Bank Transaction Reference / UTR Number *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. UTR123984729184 or UPI Reference"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        className="w-full p-2.5 bg-[#F4F9FF] border border-[#E3EDF8] rounded-xl text-[#526B87] font-mono focus:outline-none focus:border-[#8AAED8]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#526B87] font-bold mb-1">
                        Payment Date
                      </label>
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full p-2.5 bg-[#F4F9FF] border border-[#E3EDF8] rounded-xl text-[#526B87] focus:outline-none focus:border-[#8AAED8]"
                      />
                    </div>
                  </div>
                )}

                {actionType === "APPROVE" && (
                  <div>
                    <label className="block text-[#526B87] font-bold mb-1">
                      Approval Notes (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Verified CA credentials and bank details"
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      className="w-full p-2.5 bg-[#F4F9FF] border border-[#E3EDF8] rounded-xl text-[#526B87] focus:outline-none focus:border-[#8AAED8]"
                    />
                    <span className="text-[11px] text-[#94A8BE] mt-1 block">
                      Approval authorizes manual payment dispatch. It does not finalize coins until payment is recorded.
                    </span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRedemption(null);
                      setActionType(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-[#E3EDF8] text-[#7188A3] hover:text-[#526B87] hover:bg-[#F4F9FF] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionSubmitting}
                    className={`px-5 py-2 rounded-xl font-bold transition cursor-pointer ${
                      actionType === "REJECT"
                        ? "bg-[#FFF0F2] text-[#991B1B] border border-[#FECDD3] hover:bg-[#FFE4E6]"
                        : actionType === "APPROVE"
                        ? "bg-[#ECF9F1] text-[#166534] border border-[#C8E6C9] hover:bg-[#DCFCE7]"
                        : "bg-[#D8EBFF] hover:bg-[#C7E1FF] text-[#2563EB] font-black"
                    }`}
                  >
                    {actionSubmitting
                      ? "Processing…"
                      : actionType === "APPROVE"
                      ? "Confirm Approval"
                      : actionType === "REJECT"
                      ? "Confirm Rejection"
                      : "Confirm & Finalize Payout"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRedemption(null);
                    setActionType(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#F0F7FF] text-[#526B87] hover:bg-[#E3EDF8] transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
