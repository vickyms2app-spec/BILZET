import { useNavigate } from "react-router-dom";
import { LayoutGrid, FilePlus, LifeBuoy, ArrowLeft, AlertCircle } from "lucide-react";

export default function NotFound() {
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 antialiased">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/90 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto shadow-xs">
          <AlertCircle size={32} />
        </div>

        <div>
          <span className="text-xs font-mono font-bold tracking-widest text-blue-600 uppercase bg-blue-50 px-3 py-1 rounded-full border border-blue-200/60">
            Error 404
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-3">
            Page Not Found
          </h1>
          <p className="text-xs text-slate-500 font-normal mt-2 leading-relaxed">
            The requested screen or module does not exist, has been moved, or you might not have permission to view it.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <button
            onClick={() => nav("/dashboard")}
            className="btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-2"
          >
            <LayoutGrid size={15} />
            <span>Return to Dashboard</span>
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => nav("/billing")}
              className="btn-secondary w-full py-2 text-xs flex items-center justify-center gap-1.5"
            >
              <FilePlus size={14} />
              <span>New Bill (POS)</span>
            </button>
            <button
              onClick={() => nav("/support")}
              className="btn-secondary w-full py-2 text-xs flex items-center justify-center gap-1.5"
            >
              <LifeBuoy size={14} />
              <span>Help &amp; Support</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
