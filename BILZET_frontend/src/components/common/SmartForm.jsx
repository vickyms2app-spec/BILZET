import { forwardRef } from "react";
import useSmartForm from "../../hooks/useSmartForm";

/**
 * SmartForm Component
 * 
 * Reusable wrapper that automatically handles:
 * - Enter key to advance to next field
 * - Shift + Enter to retreat to previous field
 * - Tab / Shift + Tab standard traversal
 * - Ctrl + S to save draft / complete
 * - Escape to dismiss
 * - Auto-skipping disabled and hidden fields
 * - Validating fields before advancing
 */
const SmartForm = forwardRef(function SmartForm(
  {
    children,
    onSave,
    onComplete,
    onCancel,
    onAddRow,
    tableMode = false,
    autoFocusFirst = false,
    validate = true,
    className = "",
    as = "form",
    onSubmit,
    ...props
  },
  forwardedRef
) {
  const { containerRef, handleKeyDown } = useSmartForm({
    onSave,
    onComplete,
    onCancel,
    onAddRow,
    tableMode,
    autoFocusFirst,
    validate,
  });

  const Component = as;

  return (
    <Component
      ref={(node) => {
        containerRef.current = node;
        if (typeof forwardedRef === "function") {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      }}
      onKeyDown={handleKeyDown}
      onSubmit={(e) => {
        // Prevent default accidental enter submit if not handled
        if (onSubmit) {
          onSubmit(e);
        } else {
          e.preventDefault();
        }
      }}
      className={className}
      {...props}
    >
      {children}
    </Component>
  );
});

export default SmartForm;
