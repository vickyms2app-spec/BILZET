import { useState } from "react";
import { Download, CheckCircle, AlertCircle, FileText, ArrowRight, Percent, ShieldCheck, TrendingUp } from "lucide-react";

export default function Gst() {
  return (
    <div className="space-y-5 pb-12 fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 grid place-items-center shrink-0">
            <Percent size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">GST &amp; Tax Center</h1>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              GSTR-1, GSTR-3B, HSN Summary and Audit readiness
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-center">
          <ShieldCheck size={13} />
          <span>Data Readiness: 100/100</span>
        </span>
      </div>

      {/* 3 GST Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
        <div className="card p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl" />
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mb-4">
              <FileText size={18} />
            </div>
            <h3 className="font-bold text-slate-900">GSTR-1 Draft Pack</h3>
            <p className="text-xs text-slate-500 font-normal mt-1.5 leading-relaxed">
              Sales, B2B invoices, B2C small and credit notes formatted for portal upload.
            </p>
          </div>
          <button className="mt-5 btn-secondary text-xs font-semibold w-full justify-between">
            <span>Download JSON / Excel</span>
            <Download size={13} />
          </button>
        </div>

        <div className="card p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-t-2xl" />
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle size={18} />
            </div>
            <h3 className="font-bold text-slate-900">GSTR-3B Summary</h3>
            <p className="text-xs text-slate-500 font-normal mt-1.5 leading-relaxed">
              Net outward tax payable, input tax credits (ITC), and monthly turnover summary.
            </p>
          </div>
          <button className="mt-5 btn-secondary text-xs font-semibold w-full justify-between">
            <span>View Summary Table</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="card p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-t-2xl" />
          <div>
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 border border-violet-100 flex items-center justify-center mb-4">
              <FileText size={18} />
            </div>
            <h3 className="font-bold text-slate-900">HSN / SAC Summary</h3>
            <p className="text-xs text-slate-500 font-normal mt-1.5 leading-relaxed">
              HSN-wise invoice details, quantity totals, rate brackets and tax breakdown.
            </p>
          </div>
          <button className="mt-5 btn-secondary text-xs font-semibold w-full justify-between">
            <span>Export HSN Report</span>
            <Download size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
