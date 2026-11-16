import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Universal Portal-based Modal Component
 * Renders directly at document.body with z-[9999] to guarantee:
 * 1. 100% viewport coverage (no parent container or transform trapping)
 * 2. Perfect centering on all screen sizes & laptop DPI scalings
 * 3. Pinned header with close button & subtitle
 * 4. Scrollable form body that never overflows the viewport
 * 5. Pinned action footer that is always visible
 * 6. Escape key and backdrop click dismissal
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconColor = "text-[#0E2A16] bg-[#DFFFE6] border-[#5BF07B]/40",
  children,
  footer,
  maxWidth = "max-w-lg", // max-w-md | max-w-lg | max-w-xl | max-w-2xl | max-w-3xl
}) {
  // Lock body scroll and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-[#12151C]/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative w-full ${maxWidth} bg-[#F6F6F8] rounded-[28px] shadow-[0_14px_38px_rgba(0,0,0,0.18)] border border-[#E7E8EC] flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pinned Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E8EC] bg-[#FAFAFB] flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className={`p-2.5 rounded-full border flex items-center justify-center shrink-0 shadow-2xs ${iconColor}`}>
                <Icon size={18} />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-bold text-[#111318] text-sm sm:text-base leading-snug truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-[#7C7F8A] truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[#E7E8EC] bg-white hover:bg-[#F6F6F8] text-[#7C7F8A] hover:text-[#111318] flex items-center justify-center transition duration-150 shrink-0 ml-2 shadow-2xs cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable Form / Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 text-xs text-[#111318]">
          {children}
        </div>

        {/* Pinned Action Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E7E8EC] bg-[#FAFAFB] flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
