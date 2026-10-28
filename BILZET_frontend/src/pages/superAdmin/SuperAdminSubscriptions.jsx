import { useEffect, useState } from "react";
import { superAdminApi } from "../../api";
import {
  CreditCard,
  Search,
  CheckCircle,
  Calendar,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
  X,
  Edit2,
} from "lucide-react";

export default function SuperAdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("");

  // Edit Modal State
  const [editSub, setEditSub] = useState(null);
  const [formTier, setFormTier] = useState("PRO");
  const [formStatus, setFormStatus] = useState("ACTIVE");
  const [formExpiry, setFormExpiry] = useState("");
  const [modalBusy, setModalBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await superAdminApi.getSubscriptions();
      setSubscriptions(res.subscriptions || []);
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: "Failed to load subscriptions." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const openEdit = (sub) => {
    setEditSub(sub);
    setFormTier(sub.planTier || "PRO");
    setFormStatus(sub.status || "ACTIVE");
    setFormExpiry(
      sub.expiresAt ? new Date(sub.expiresAt).toISOString().split("T")[0] : ""
    );
  };

  const handleSaveSub = async (e) => {
    e.preventDefault();
    setModalBusy(true);

    const planName =
      formTier === "ENTERPRISE"
        ? "Enterprise Business"
        : formTier === "PRO"
        ? "Pro Suite"
        : "Free Starter";

    const amount = formTier === "ENTERPRISE" ? 2499 : formTier === "PRO" ? 999 : 0;

    try {
      await superAdminApi.updateSubscription(editSub.id || editSub._id, {
        planTier: formTier,
        planName,
        status: formStatus,
        amount,
        expiresAt: formExpiry ? new Date(formExpiry).toISOString() : null,
      });

      setMsg({
        type: "success",
        text: `Updated subscription for ${editSub.user?.email || "user"}.`,
      });
      setEditSub(null);
      loadSubscriptions();
    } catch (err) {
      alert(err?.message || "Failed to update subscription.");
    } finally {
      setModalBusy(false);
    }
  };

  const filtered = subscriptions.filter((s) => {
    const userMatch =
      (s.user?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.user?.email || "").toLowerCase().includes(search.toLowerCase());
    const tierMatch = !tierFilter || s.planTier === tierFilter;
    return userMatch && tierMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#526B87] tracking-tight flex items-center gap-2">
            <CreditCard className="text-[#2563EB]" />
            Subscriptions &amp; Billing Management
          </h1>
          <p className="text-xs text-[#7188A3] mt-1">
            Super admin controls to grant plans, extend renewal dates, and adjust entitlements.
          </p>
        </div>

        <button
          onClick={loadSubscriptions}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F0F7FF] hover:bg-[#D8EBFF] text-xs font-bold text-[#526B87] transition w-fit border border-[#E3EDF8]"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Notification Banner */}
      {msg.text && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
            msg.type === "success"
              ? "bg-[#ECF9F1] border border-[#C8E6C9] text-[#166534]"
              : "bg-[#FFF0F2] border border-[#FECDD3] text-[#991B1B]"
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg({ type: "", text: "" })}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-[#E3EDF8] shadow-2xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8AAED8]" />
          <input
            type="text"
            placeholder="Search by subscriber name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F4F9FF] border border-[#E3EDF8] text-xs text-[#526B87] placeholder-[#94A8BE] focus:outline-none focus:border-[#8AAED8]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-[#7188A3]">Filter Tier:</span>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#F4F9FF] border border-[#E3EDF8] text-xs text-[#526B87] focus:outline-none focus:border-[#8AAED8]"
          >
            <option value="">All Tiers</option>
            <option value="FREE">Free Starter</option>
            <option value="PRO">Pro Suite</option>
            <option value="ENTERPRISE">Enterprise Business</option>
          </select>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="rounded-2xl bg-white border border-[#E3EDF8] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EAF4FF] text-[11px] uppercase tracking-wider text-[#526B87] font-bold border-b border-[#E3EDF8]">
              <tr>
                <th className="py-3.5 px-4">Subscriber</th>
                <th className="py-3.5 px-4">Current Plan</th>
                <th className="py-3.5 px-4">Rate (MRR)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Valid Until</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF3FA]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#7188A3]">
                    <RefreshCw className="animate-spin inline-block mr-2" size={16} />
                    Loading subscriptions…
                  </td>
                </tr>
              ) : !filtered.length ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#94A8BE]">
                    No subscriptions found.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const tier = s.planTier || "FREE";
                  const isMaster = (s.user?.email || "").toLowerCase() === "vickyms2app@gmail.com";

                  return (
                    <tr key={s.id} className="hover:bg-[#F4F9FF] transition">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-[#526B87] flex items-center gap-1.5">
                          {s.user?.name || "Unknown"}
                          {isMaster && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-[#D8EBFF] text-[#2563EB] border border-[#C7E1FF]">
                              SUPER ADMIN
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-[#7188A3] font-mono">{s.user?.email || "N/A"}</p>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide ${
                            tier === "ENTERPRISE"
                              ? "bg-[#D4C2FF]/20 text-[#6D28D9] border border-[#D4C2FF]"
                              : tier === "PRO"
                              ? "bg-[#D8EBFF] text-[#2563EB] border border-[#C7E1FF]"
                              : "bg-[#F0F7FF] text-[#7188A3] border border-[#E3EDF8]"
                          }`}
                        >
                          <Sparkles size={11} />
                          {s.planName}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-[#526B87]">
                        ₹{Number(s.amount || 0).toLocaleString("en-IN")} / mo
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.status === "ACTIVE"
                              ? "bg-[#ECF9F1] text-[#166534] border border-[#C8E6C9]"
                              : "bg-[#FFF6E9] text-[#B45309] border border-[#FDE68A]"
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[#7188A3] text-[11px]">
                        {s.expiresAt ? new Date(s.expiresAt).toLocaleDateString() : "Lifetime / Never"}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openEdit(s)}
                          className="px-3 py-1.5 rounded-lg bg-[#D8EBFF] hover:bg-[#C7E1FF] text-[#2563EB] border border-[#C7E1FF] text-xs font-bold transition flex items-center gap-1.5 ml-auto"
                        >
                          <Edit2 size={12} />
                          Modify Plan
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editSub && (
        <div className="fixed inset-0 bg-[#0F2747]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-white border border-[#E3EDF8] p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#526B87] flex items-center gap-2">
                <CreditCard size={16} className="text-[#2563EB]" />
                Modify Subscription
              </h3>
              <button onClick={() => setEditSub(null)} className="text-[#94A8BE] hover:text-[#526B87]">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[#7188A3] mb-5">
              Subscriber: <strong className="text-[#526B87]">{editSub.user?.name}</strong> ({editSub.user?.email})
            </p>

            <form onSubmit={handleSaveSub} className="space-y-4">
              {/* Plan Tier Dropdown */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#526B87]">Plan Tier</label>
                <select
                  value={formTier}
                  onChange={(e) => setFormTier(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F4F9FF] border border-[#E3EDF8] text-xs text-[#526B87] focus:outline-none focus:border-[#8AAED8]"
                >
                  <option value="FREE">Free Starter (₹0/mo)</option>
                  <option value="PRO">Pro Suite (₹999/mo)</option>
                  <option value="ENTERPRISE">Enterprise Business (₹2,499/mo)</option>
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#526B87]">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F4F9FF] border border-[#E3EDF8] text-xs text-[#526B87] focus:outline-none focus:border-[#8AAED8]"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="EXPIRED">EXPIRED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              {/* Expiry Date */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#526B87]">Validity Expiry Date</label>
                <input
                  type="date"
                  value={formExpiry}
                  onChange={(e) => setFormExpiry(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F4F9FF] border border-[#E3EDF8] text-xs text-[#526B87] focus:outline-none focus:border-[#8AAED8]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditSub(null)}
                  className="px-4 py-2 rounded-xl bg-[#F0F7FF] text-xs font-semibold text-[#526B87] hover:bg-[#E3EDF8] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalBusy}
                  className="px-4 py-2 rounded-xl bg-[#D8EBFF] hover:bg-[#C7E1FF] text-[#2563EB] text-xs font-bold transition disabled:opacity-50"
                >
                  {modalBusy ? "Saving…" : "Update Subscription"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
