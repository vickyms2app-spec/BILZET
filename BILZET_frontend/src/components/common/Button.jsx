import { forwardRef, useState, useRef, useEffect } from "react";
import {
  Loader2,
  Plus,
  Check,
  X,
  Trash2,
  Edit2,
  Clock,
  Info,
  Calendar,
  Save,
  Download,
  Printer,
  ChevronDown,
  Filter,
  FileSpreadsheet,
  FileText,
  Search,
  Building,
  User,
  Upload,
} from "lucide-react";

/**
 * GLOBAL ICON-CIRCLE BUTTON UI SYSTEM (ERP / SaaS Grade)
 *
 * Visual Hierarchy:
 * [ Colored Circular Icon Container ] + [ Black/Dark Charcoal Text Label ]
 *
 * Specifications:
 * - Border radius: 18–24px (Soft-rounded shape)
 * - Height: 42–50px (md), 34–38px (sm), 26–30px (xs), 50–54px (lg)
 * - Background: Light/clean white background (#ffffff)
 * - Border: Soft border (#e2e8f0 / slate-200)
 * - Shadow: Very subtle elevation (0 1px 2px rgba(15,23,42,0.04))
 * - Text color: Strictly Primary #111827 / Secondary #374151 (Dark charcoal / black)
 *   * Never white text on normal buttons
 *   * Never colored text matching the icon color
 * - Circular icon: 32–38px diameter with soft tinted fill & outline
 *   * Primary (Blue): Add, Save, Create, Generate, View, Submit
 *   * Success (Green): Present, Approve, Complete, Confirm, Paid, Verify
 *   * Danger (Red): Delete, Remove, Reject, Absent
 *   * Warning (Orange): Late, Pending, Half Day, Warning
 *   * Info (Cyan/Sky): Leave, Details, Information
 *   * Neutral/Secondary (Gray/Slate): Edit, Cancel, Settings, More, Back
 */

// Color palettes for the icon circle
export const CIRCLE_VARIANTS = {
  primary: {
    circle:
      "bg-blue-50 text-blue-600 border border-blue-200 shadow-2xs group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-700",
    activeCircle: "bg-blue-600 text-white border-blue-700",
    border: "border-slate-200/90 hover:border-blue-300",
    bg: "bg-white hover:bg-blue-50/20 active:bg-blue-50/40",
  },
  success: {
    circle:
      "bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-2xs group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-700",
    activeCircle: "bg-emerald-600 text-white border-emerald-700",
    border: "border-slate-200/90 hover:border-emerald-300",
    bg: "bg-white hover:bg-emerald-50/20 active:bg-emerald-50/40",
  },
  danger: {
    circle:
      "bg-rose-50 text-rose-600 border border-rose-200 shadow-2xs group-hover:bg-rose-600 group-hover:text-white group-hover:border-rose-700",
    activeCircle: "bg-rose-600 text-white border-rose-700",
    border: "border-slate-200/90 hover:border-rose-300",
    bg: "bg-white hover:bg-rose-50/20 active:bg-rose-50/40",
  },
  warning: {
    circle:
      "bg-amber-50 text-amber-600 border border-amber-200 shadow-2xs group-hover:bg-amber-600 group-hover:text-white group-hover:border-amber-700",
    activeCircle: "bg-amber-600 text-white border-amber-700",
    border: "border-slate-200/90 hover:border-amber-300",
    bg: "bg-white hover:bg-amber-50/20 active:bg-amber-50/40",
  },
  info: {
    circle:
      "bg-sky-50 text-sky-600 border border-sky-200 shadow-2xs group-hover:bg-sky-600 group-hover:text-white group-hover:border-sky-700",
    activeCircle: "bg-sky-600 text-white border-sky-700",
    border: "border-slate-200/90 hover:border-sky-300",
    bg: "bg-white hover:bg-sky-50/20 active:bg-sky-50/40",
  },
  neutral: {
    circle:
      "bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs group-hover:bg-slate-700 group-hover:text-white group-hover:border-slate-800",
    activeCircle: "bg-slate-700 text-white border-slate-800",
    border: "border-slate-200/90 hover:border-slate-300",
    bg: "bg-white hover:bg-slate-50 active:bg-slate-100/60",
  },
  secondary: {
    circle:
      "bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs group-hover:bg-slate-700 group-hover:text-white group-hover:border-slate-800",
    activeCircle: "bg-slate-700 text-white border-slate-800",
    border: "border-slate-200/90 hover:border-slate-300",
    bg: "bg-white hover:bg-slate-50 active:bg-slate-100/60",
  },
  outline: {
    circle:
      "bg-blue-50 text-blue-600 border border-blue-200 shadow-2xs group-hover:bg-blue-600 group-hover:text-white",
    activeCircle: "bg-blue-600 text-white border-blue-700",
    border: "border-blue-200 hover:border-blue-300",
    bg: "bg-white hover:bg-blue-50/20 active:bg-blue-50/40",
  },
};

/**
 * Main Icon-Circle Button Component
 */
const Button = forwardRef(function Button(
  {
    children,
    variant = "primary",
    size = "md",
    icon: Icon,
    loading = false,
    disabled = false,
    className = "",
    type = "button",
    title,
    description,
    dropdown = false,
    active = false,
    ...props
  },
  ref
) {
  // Normalize alias variants
  const normVariant = CIRCLE_VARIANTS[variant] ? variant : "primary";
  const styles = CIRCLE_VARIANTS[normVariant];

  // Size hierarchy
  const sizeClasses = {
    xs: {
      btn: "h-[28px] min-h-[28px] pl-1 pr-2.5 rounded-[14px] text-[11px] gap-1.5",
      circle: "w-[20px] h-[20px] text-[10px]",
      iconSize: 11,
    },
    sm: {
      btn: "h-[36px] min-h-[36px] pl-1.5 pr-3 rounded-[18px] text-xs gap-2",
      circle: "w-[26px] h-[26px] text-xs",
      iconSize: 13,
    },
    md: {
      btn: "h-[44px] min-h-[44px] pl-2 pr-4 rounded-[22px] text-xs sm:text-sm gap-2.5",
      circle: "w-[32px] h-[32px] text-sm",
      iconSize: 15,
    },
    lg: {
      btn: "h-[50px] min-h-[50px] pl-2.5 pr-5 rounded-[25px] text-sm gap-3",
      circle: "w-[36px] h-[36px] text-base",
      iconSize: 17,
    },
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;

  // Icon auto-fallback if none passed based on variant intent
  const FallbackIcon =
    normVariant === "success"
      ? Check
      : normVariant === "danger"
      ? X
      : normVariant === "warning"
      ? Clock
      : normVariant === "info"
      ? Info
      : normVariant === "primary"
      ? Plus
      : null;

  const RenderIcon = Icon || FallbackIcon;

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      title={title}
      className={`group relative inline-flex items-center justify-center font-semibold select-none cursor-pointer transition-all duration-150 border ${
        styles.border
      } ${styles.bg} ${
        currentSize.btn
      } shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_2px_6px_rgba(15,23,42,0.08)] active:translate-y-[0.5px] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 ${className}`}
      {...props}
    >
      {/* ── Circular Colored Icon Container ── */}
      <span
        className={`shrink-0 rounded-full flex items-center justify-center transition-all duration-150 ${
          currentSize.circle
        } ${active ? styles.activeCircle : styles.circle}`}
      >
        {loading ? (
          <Loader2 size={currentSize.iconSize} className="animate-spin" />
        ) : RenderIcon ? (
          <RenderIcon
            size={currentSize.iconSize}
            className="transition-transform duration-150 group-hover:scale-110"
          />
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
        )}
      </span>

      {/* ── Dark Charcoal Button Text Label ── */}
      {children && (
        <span className="flex flex-col text-left leading-tight truncate">
          <span className="text-[#111827] font-semibold tracking-[-0.01em] group-hover:text-black">
            {children}
          </span>
          {description && (
            <span className="text-[10px] text-[#4b5563] font-normal leading-none mt-0.5">
              {description}
            </span>
          )}
        </span>
      )}

      {/* ── Dropdown Caret ── */}
      {dropdown && (
        <ChevronDown
          size={13}
          className="text-slate-400 group-hover:text-slate-600 shrink-0 ml-0.5"
        />
      )}
    </button>
  );
});

export default Button;

// Specialized Named Exports
export const IconCircleButton = Button;

export function PrimaryIconButton(props) {
  return <Button variant="primary" {...props} />;
}

export function SuccessIconButton(props) {
  return <Button variant="success" {...props} />;
}

export function DangerIconButton(props) {
  return <Button variant="danger" {...props} />;
}

export function WarningIconButton(props) {
  return <Button variant="warning" {...props} />;
}

export function InfoIconButton(props) {
  return <Button variant="info" {...props} />;
}

export function NeutralIconButton(props) {
  return <Button variant="neutral" {...props} />;
}

/**
 * Compact circular icon button for table rows & toolbars
 * (30–34px circle diameter, icon-only with tooltip)
 */
export function CompactIconButton({
  icon: Icon,
  variant = "neutral",
  size = "md",
  title,
  loading = false,
  className = "",
  active = false,
  ...props
}) {
  const normVariant = CIRCLE_VARIANTS[variant] ? variant : "neutral";
  const styles = CIRCLE_VARIANTS[normVariant];

  const sizeCls =
    size === "xs"
      ? "w-[24px] h-[24px] text-[10px]"
      : size === "sm"
      ? "w-[28px] h-[28px] text-[12px]"
      : size === "lg"
      ? "w-[38px] h-[38px] text-[16px]"
      : "w-[32px] h-[32px] text-[14px]";

  const iconSize =
    size === "xs" ? 11 : size === "sm" ? 13 : size === "lg" ? 17 : 14;

  return (
    <button
      type="button"
      title={title}
      className={`group shrink-0 rounded-full flex items-center justify-center cursor-pointer transition-all duration-150 border ${
        styles.circle
      } ${sizeCls} ${
        active ? styles.activeCircle : ""
      } shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_5px_rgba(0,0,0,0.08)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 size={iconSize} className="animate-spin" />
      ) : Icon ? (
        <Icon
          size={iconSize}
          className="transition-transform duration-150 group-hover:scale-110"
        />
      ) : null}
    </button>
  );
}

/**
 * Dashboard Action Card Component (Large Version)
 * [ Circular Icon ] Title
 * Secondary description underneath
 * Both title and description dark/neutral
 */
export function IconCircleAction({
  icon: Icon,
  variant = "primary",
  title,
  description,
  onClick,
  className = "",
  badge,
  ...props
}) {
  const normVariant = CIRCLE_VARIANTS[variant] ? variant : "primary";
  const styles = CIRCLE_VARIANTS[normVariant];

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`group relative rounded-2xl p-4 bg-white border border-slate-200/90 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.07)] hover:border-slate-300 transition-all duration-150 cursor-pointer select-none text-left flex items-start gap-3.5 ${className}`}
      {...props}
    >
      {/* ── Large Circular Colored Icon Container ── */}
      <div
        className={`w-11 h-11 rounded-full shrink-0 flex items-center justify-center transition-all duration-150 ${styles.circle}`}
      >
        {Icon ? (
          <Icon
            size={20}
            className="transition-transform duration-150 group-hover:scale-110"
          />
        ) : (
          <Plus size={20} />
        )}
      </div>

      {/* ── Title & Description (Dark / Neutral) ── */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-[#111827] tracking-tight group-hover:text-black">
            {title}
          </h4>
          {badge && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-[#4b5563] font-normal mt-0.5 leading-snug">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Dropdown Button Component
 * [ Circular Icon ] Action Name ▾
 * Contains dropdown menu items with circular icons
 */
export function IconCircleDropdown({
  icon: Icon,
  variant = "primary",
  size = "md",
  label,
  items = [],
  className = "",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      <Button
        variant={variant}
        size={size}
        icon={Icon}
        dropdown={true}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={className}
      >
        {label}
      </Button>

      {open && items.length > 0 && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl border border-slate-200 z-50 p-1.5 animate-in fade-in zoom-in-95 duration-100">
          {items.map((item, idx) => {
            const ItemIcon = item.icon || User;
            const itemVariant = item.variant || "neutral";
            const itemStyles =
              CIRCLE_VARIANTS[itemVariant] || CIRCLE_VARIANTS.neutral;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setOpen(false);
                  item.onClick?.();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-[#111827] hover:bg-slate-50 transition cursor-pointer"
              >
                <span
                  className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center ${itemStyles.circle}`}
                >
                  <ItemIcon size={12} />
                </span>
                <span className="flex-1 truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
