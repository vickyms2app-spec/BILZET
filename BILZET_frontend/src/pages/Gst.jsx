import { useState } from "react";
import { Download, CheckCircle, AlertCircle, FileText, ArrowRight } from "lucide-react";

export default function Gst() {
  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            GST & Tax Center
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            GSTR-1, GSTR-3B, HSN Summary and Audit readiness
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Data Readiness: 100/100
          </span>
        </div>
      </div>

      {/* 3 GST Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 grid place-items-center mb-4">
              <FileText size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-base">GSTR-1 Draft Pack</h3>
            <p className="text-xs text-slate-500 mt-1">
              Sales, B2B invoices, B2C small and credit notes formatted for portal upload.
            </p>
          </div>
          <button className="mt-6 flex items-center justify-between w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition">
            <span>Download JSON / Excel</span>
            <Download size={14} />
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center mb-4">
              <CheckCircle size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-base">GSTR-3B Summary</h3>
            <p className="text-xs text-slate-500 mt-1">
              Net outward tax payable, input tax credits (ITC), and monthly turnover summary.
            </p>
          </div>
          <button className="mt-6 flex items-center justify-between w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition">
            <span>View Summary Table</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 grid place-items-center mb-4">
              <FileText size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-base">HSN / SAC Summary</h3>
            <p className="text-xs text-slate-500 mt-1">
              HSN-wise invoice details, quantity totals, rate brackets and tax breakdown.
            </p>
          </div>
          <button className="mt-6 flex items-center justify-between w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition">
            <span>Export HSN Report</span>
            <Download size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
