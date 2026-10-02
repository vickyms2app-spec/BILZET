import { useState } from "react";
import { Briefcase, Send, UserPlus, Shield, Check, ShieldCheck } from "lucide-react";

export default function CaConnect() {
  const [caEmail, setCaEmail] = useState("");
  const [invited, setInvited] = useState(false);

  const handleInvite = (e) => {
    e.preventDefault();
    if (!caEmail) return;
    setInvited(true);
  };

  return (
    <div className="space-y-5 pb-12 max-w-3xl fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 grid place-items-center shrink-0">
            <Briefcase size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">CA Connect</h1>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Give read-only or accountant access to your Chartered Accountant or Tax Consultant
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 self-start sm:self-center">
          <ShieldCheck size={13} />
          <span>Read-Only Portal Security</span>
        </span>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            <Briefcase size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Invite Your Accountant</h2>
            <p className="text-xs text-slate-400 font-normal mt-0.5">
              They will receive direct access to export GSTR reports and verify sales reconciliations.
            </p>
          </div>
        </div>

        {invited ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center gap-3 text-emerald-800 text-xs font-semibold">
            <Check size={16} className="text-emerald-600 shrink-0" />
            <span>Invitation sent to {caEmail}! Your CA can now view your tax reports.</span>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              placeholder="accountant@ca-firm.com"
              value={caEmail}
              onChange={(e) => setCaEmail(e.target.value)}
              className="flex-1 px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium"
            />
            <button
              type="submit"
              className="btn-primary text-xs py-2.5 px-5 flex items-center justify-center gap-2 shrink-0"
            >
              <Send size={13} />
              <span>Send Invite</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
