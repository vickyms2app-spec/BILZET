import React from "react";

/**
 * Standardized Official BILZET Logo Component
 * Uses the official brand emblem and wordmark consistently across the application.
 *
 * @param {'full'|'icon'} variant - 'full' includes emblem + wordmark, 'icon' is emblem only
 * @param {'light'|'dark'|'auto'} theme - 'dark' for dark backgrounds (white wordmark), 'light' for white backgrounds (navy wordmark)
 * @param {'xs'|'sm'|'md'|'lg'|'xl'|'2xl'} size - Presets for height
 * @param {string} className - Additional CSS classes
 * @param {boolean} collapsed - If true, automatically collapses to 'icon' variant (useful for sidebars)
 */
export default function Logo({
  variant = "full",
  theme = "dark",
  size = "md",
  collapsed = false,
  className = "",
  onClick,
  ...props
}) {
  const isIconOnly = collapsed || variant === "icon";

  // Pick the official asset based on variant and background theme
  const src = isIconOnly
    ? theme === "light"
      ? "/assets/bilzet-icon-dark.png"
      : "/assets/bilzet-icon-white.png"
    : theme === "light"
      ? "/assets/bilzet-logo-dark.png"
      : "/assets/bilzet-logo-white.png";

  // Fallback to high-res tight logos if needed
  const fallbackSrc = isIconOnly
    ? "/assets/bilzet-icon-tight.png"
    : "/assets/bilzet-logo-tight.png";

  const sizeClasses = {
    xs: isIconOnly ? "h-6 w-auto" : "h-6 w-auto",
    sm: isIconOnly ? "h-8 w-auto" : "h-7 w-auto",
    md: isIconOnly ? "h-10 w-auto" : "h-9 w-auto",
    lg: isIconOnly ? "h-12 w-auto" : "h-11 w-auto",
    xl: isIconOnly ? "h-16 w-auto" : "h-14 w-auto",
    "2xl": isIconOnly ? "h-20 w-auto" : "h-18 w-auto",
  };

  return (
    <div
      className={`inline-flex items-center select-none transition-transform duration-200 ${
        onClick ? "cursor-pointer hover:opacity-95" : ""
      } ${className}`}
      onClick={onClick}
      {...props}
    >
      <img
        src={src}
        alt="BILZET — Shop Billing / POS"
        className={`${sizeClasses[size] || "h-9 w-auto"} object-contain shrink-0`}
        onError={(e) => {
          if (e.target.src !== fallbackSrc) {
            e.target.src = fallbackSrc;
          }
        }}
        loading="eager"
      />
    </div>
  );
}
