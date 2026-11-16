import React from "react";
import { useNavigate } from "react-router-dom";
import { FilePlus } from "lucide-react";

/**
 * Reusable New Bill button with signature BILZET soft sky-blue gradient,
 * professional invoice-plus icon, elevation animations, and keyboard focus styling.
 */
export default function NewBillButton({
  to = "/billing",
  onClick,
  label = "New Bill",
  size = "md",
  showShortcut = false,
  shortcutText = "F2",
  className = "",
  fullWidth = false,
  ...props
}) {
  const navigate = useNavigate();

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
      if (e.defaultPrevented) return;
    }
    if (to) {
      navigate(to);
    }
  };

  const sizeClasses = {
    sm: "px-3.5 py-1.5 text-xs gap-1.5 rounded-full",
    md: "px-4 py-2 text-xs font-bold gap-2 rounded-full",
    lg: "px-6 py-2.5 text-sm font-bold gap-2.5 rounded-full",
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 18,
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className={`group relative inline-flex items-center justify-center font-bold tracking-tight text-white bg-[#12151C] hover:bg-black transition-all duration-200 ease-out cursor-pointer select-none border border-black/10 shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.25)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5BF07B] focus-visible:ring-offset-2 ${
        sizeClasses[size] || sizeClasses.md
      } ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {/* Icon with gentle movement/scale effect on hover */}
      <FilePlus
        size={iconSizes[size] || 16}
        strokeWidth={2.4}
        className="shrink-0 text-[#5BF07B] transition-transform duration-200 ease-out group-hover:scale-110 group-hover:rotate-3"
      />

      <span className="truncate">{label}</span>

      {showShortcut && (
        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/15 text-[10px] font-mono font-bold tracking-wider text-[#5BF07B] shadow-2xs group-hover:bg-white/20 transition-colors">
          {shortcutText}
        </span>
      )}
    </button>
  );
}

