import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X, AlertCircle, Inbox } from "lucide-react";

/* ── Button ─────────────────────────────────────────────── */
export const Button = ({ variant = "primary", className = "", children, ...p }) => {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200 px-4 py-2.5 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "text-white shadow-md hover:shadow-lg hover:-translate-y-0.5"
        .concat(" "),
    danger:
      "bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow-md",
    ghost:
      "bg-transparent text-slate-600 hover:bg-slate-100",
    outline:
      "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm",
  };

  if (variant === "primary") {
    return (
      <motion.button
        whileTap={{ scale: 0.97 }}
        className={`${base} ${className}`}
        style={{
          background: "linear-gradient(135deg, #1a5cff 0%, #1247d4 100%)",
          boxShadow: "0 4px 16px rgba(26,92,255,0.25)",
        }}
        {...p}
      >
        {children}
      </motion.button>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`${base} ${variants[variant] || variants.outline} ${className}`}
      {...p}
    >
      {children}
    </motion.button>
  );
};

/* ── Input ──────────────────────────────────────────────── */
export const Input = ({ label, error, icon: Icon, ...p }) => (
  <label className="block space-y-1.5">
    {label && (
      <span className="text-xs font-semibold" style={{ color: "#334155" }}>
        {label}
      </span>
    )}
    <div className="relative">
      {Icon && (
        <Icon
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2"
          style={{ color: "#94a3b8" }}
        />
      )}
      <input
        className="input-premium"
        style={Icon ? { paddingLeft: "2.5rem" } : {}}
        {...p}
      />
    </div>
    {error && <span className="text-xs font-medium text-red-600">{error}</span>}
  </label>
);

/* ── Select ─────────────────────────────────────────────── */
export const Select = ({ label, children, ...p }) => (
  <label className="block space-y-1.5">
    {label && (
      <span className="text-xs font-semibold" style={{ color: "#334155" }}>
        {label}
      </span>
    )}
    <select
      className="input-premium"
      {...p}
    >
      {children}
    </select>
  </label>
);

/* ── Card ───────────────────────────────────────────────── */
export const Card = ({ children, className = "", hover = false }) => (
  <div className={`card-premium ${hover ? "hover:-translate-y-1" : ""} ${className}`}>
    {children}
  </div>
);

/* ── Loading ─────────────────────────────────────────────── */
export const Loading = () => (
  <div className="flex min-h-56 flex-col items-center justify-center gap-3">
    <div
      className="w-10 h-10 rounded-full border-3 border-blue-100 border-t-blue-600 animate-spin"
      style={{ borderWidth: "3px" }}
    />
    <p className="text-sm font-medium" style={{ color: "#64748b" }}>
      Loading…
    </p>
  </div>
);

/* ── Empty ───────────────────────────────────────────────── */
export const Empty = ({
  title = "No records found",
  text = "There is nothing to display yet.",
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div
      className="w-16 h-16 rounded-2xl grid place-items-center mb-4"
      style={{ background: "#f0f4ff" }}
    >
      <Inbox size={28} style={{ color: "#94a3b8" }} />
    </div>
    <h3 className="font-semibold text-slate-700">{title}</h3>
    <p className="mt-1 text-sm text-slate-400 max-w-xs">{text}</p>
  </div>
);

/* ── ErrorState ─────────────────────────────────────────── */
export const ErrorState = ({ message = "Unable to load data.", retry }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div
      className="w-16 h-16 rounded-2xl grid place-items-center mb-4"
      style={{ background: "#fff1f2" }}
    >
      <AlertCircle size={28} className="text-red-400" />
    </div>
    <p className="text-sm font-semibold text-slate-700 mb-1">Something went wrong</p>
    <p className="text-sm text-slate-500 max-w-xs">{message}</p>
    {retry && (
      <Button variant="outline" className="mt-5" onClick={retry}>
        Try Again
      </Button>
    )}
  </div>
);

/* ── Modal ───────────────────────────────────────────────── */
export const Modal = ({ open, onClose, title, children }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        key="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 grid place-items-center p-4"
        style={{ background: "rgba(13,27,62,0.5)", backdropFilter: "blur(6px)" }}
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          key="modal-content"
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ type: "spring", damping: 28, stiffness: 380 }}
          className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white shadow-2xl"
          style={{ boxShadow: "0 24px 80px rgba(13,27,62,0.2)" }}
        >
          <div
            className="flex items-center justify-between border-b px-6 py-4"
            style={{ borderColor: "#f1f5f9" }}
          >
            <h2 className="font-bold text-slate-900">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 transition hover:bg-slate-100"
            >
              <X size={18} className="text-slate-500" />
            </button>
          </div>
          <div className="p-6">{children}</div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
