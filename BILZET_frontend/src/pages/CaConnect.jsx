import { useState } from "react";
import { Briefcase, Send, UserPlus, Shield, Check } from "lucide-react";

export default function CaConnect() {
  const [caEmail, setCaEmail] = useState("");
  const [invited, setInvited] = useState(false);

  const handleInvite = (e) => {
    e.preventDefault();
    if (!caEmail) return;
    setInvited(true);
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          CA Connect
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Give read-only or accountant access to your Chartered Accountant or Tax Consultant.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 grid place-items-center">
            <Briefcase size={24} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Invite Your Accountant</h2>
            <p className="text-xs text-slate-400">
              They will receive direct access to export GSTR reports and verify sales reconciliations.
            </p>
          </div>
        </div>

        {invited ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-xs font-semibold">
            <Check size={18} className="text-emerald-600 shrink-0" />
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
              className="flex-1 px-4 py-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="submit"
              className="bg-[#1a5cff] hover:bg-[#1248cc] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 transition active:scale-95 flex items-center justify-center gap-2"
            >
              <Send size={14} />
              <span>Send Invite</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
