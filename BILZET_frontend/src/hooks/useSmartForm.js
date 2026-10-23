import { useRef, useCallback, useEffect } from "react";
import {
  handleSmartFormKeyDown,
  handleTableKeyDown,
  getFocusableFields,
  focusField,
} from "../utils/keyboardNavigation";

/**
 * useSmartForm Hook
 * 
 * Provides automated, accessible keyboard navigation for forms and tables.
 * 
 * @param {Object} options
 * @param {Function} options.onSave - Callback for Ctrl+S / Cmd+S
 * @param {Function} options.onComplete - Callback when pressing Enter on the final field
 * @param {Function} options.onCancel - Callback for Escape
 * @param {Function} options.onAddRow - Callback to append row when at the end of editable table
 * @param {boolean} options.tableMode - If true, treats the container as an editable spreadsheet
 * @param {boolean} options.autoFocusFirst - Automatically focuses the first valid input on mount
 */
export function useSmartForm({
  onSave,
  onComplete,
  onCancel,
  onAddRow,
  tableMode = false,
  autoFocusFirst = false,
  validate = true,
} = {}) {
  const containerRef = useRef(null);

  // Keydown listener to attach to container or form
  const handleKeyDown = useCallback(
    (e) => {
      const container = containerRef.current;
      if (!container) return;

      if (tableMode) {
        handleTableKeyDown(e, container, {
          onSave,
          onComplete,
          onCancel,
          onAddRow,
          validate,
        });
      } else {
        handleSmartFormKeyDown(e, container, {
          onSave,
          onComplete,
          onCancel,
          onAddRow,
          validate,
        });
      }
    },
    [onSave, onComplete, onCancel, onAddRow, tableMode, validate]
  );

  // Focus the first valid element
  const focusFirst = useCallback(() => {
    if (!containerRef.current) return;
    const fields = getFocusableFields(containerRef.current);
    if (fields.length > 0) {
      focusField(fields[0], true);
    }
  }, []);

  // Focus by selector or index
  const focusIndex = useCallback((index = 0) => {
    if (!containerRef.current) return;
    const fields = getFocusableFields(containerRef.current);
    if (fields[index]) {
      focusField(fields[index], true);
    }
  }, []);

  useEffect(() => {
    if (autoFocusFirst) {
      const timer = setTimeout(() => {
        focusFirst();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [autoFocusFirst, focusFirst]);

  return {
    formRef: containerRef,
    containerRef,
    handleKeyDown,
    focusFirst,
    focusIndex,
  };
}

export default useSmartForm;
