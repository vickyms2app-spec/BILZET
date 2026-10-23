/**
 * BILZET Smart Keyboard Navigation Engine
 * 
 * Implements standard, accessible, and spreadsheet-like keyboard navigation:
 * - Enter: moves focus to next logical editable field / cell
 * - Shift + Enter: moves focus to previous logical editable field / cell
 * - Tab / Shift + Tab: standard focus advancement
 * - Arrow keys: cell-to-cell navigation in spreadsheet/table mode
 * - Escape: closes dropdowns / cancels cell edits
 * - Automatically skips disabled, hidden, and read-only fields
 * - Preserves multiline textarea behavior unless specifically configured
 * - Preserves native text selection and caret navigation
 */

const FOCUSABLE_SELECTOR = [
  'input:not([type="hidden"]):not([disabled]):not([readonly])',
  'select:not([disabled]):not([readonly])',
  'textarea:not([disabled]):not([readonly])',
  '[contenteditable="true"]',
  '[data-nav-item="true"]:not([disabled])',
].join(', ');

/**
 * Returns all currently visible, focusable input elements in container in DOM order.
 */
export function getFocusableFields(container) {
  if (!container) return [];
  const all = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
  return all.filter((el) => {
    // Skip hidden elements (display: none or hidden attribute or zero size)
    if (el.offsetParent === null && el.offsetWidth === 0 && el.offsetHeight === 0) {
      return false;
    }
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }
    // Skip disabled or readonly elements
    if (el.disabled || el.readOnly) {
      return false;
    }
    // Skip elements marked explicitly to be skipped
    if (el.getAttribute('data-nav-skip') === 'true') {
      return false;
    }
    return true;
  });
}

/**
 * Focuses an element cleanly, selecting text inside text/number inputs if applicable.
 */
export function focusField(element, selectContent = false) {
  if (!element || typeof element.focus !== 'function') return false;
  element.focus();
  if (
    selectContent &&
    typeof element.select === 'function' &&
    ['text', 'number', 'search', 'tel', 'email'].includes(element.type || '')
  ) {
    try {
      element.select();
    } catch (_) {}
  }
  return true;
}

/**
 * Validates a field before advancing focus.
 * If invalid, triggers standard HTML5 reportValidity or custom validation.
 */
export function validateField(element) {
  if (!element) return true;
  if (typeof element.checkValidity === 'function') {
    if (!element.checkValidity()) {
      if (typeof element.reportValidity === 'function') {
        element.reportValidity();
      }
      return false;
    }
  }
  return true;
}

/**
 * Moves focus to the next field in sequence.
 * @param {HTMLElement} container - The form or container element
 * @param {HTMLElement} currentElement - The currently focused input
 * @param {boolean} reverse - If true, moves to previous field (Shift + Enter)
 * @param {Object} options - Options including onComplete, validate, loop
 */
export function advanceField(container, currentElement, reverse = false, options = {}) {
  const { onComplete = null, validate = true, onAddRow = null } = options;

  if (!container || !currentElement) return false;

  // Validate current field if moving forward
  if (!reverse && validate) {
    if (!validateField(currentElement)) {
      return false;
    }
  }

  const fields = getFocusableFields(container);
  if (fields.length === 0) return false;

  const currentIndex = fields.indexOf(currentElement);
  if (currentIndex === -1) return false;

  if (reverse) {
    // Shift + Enter: move to previous field
    if (currentIndex > 0) {
      focusField(fields[currentIndex - 1], true);
      return true;
    }
    return false;
  }

  // Enter: move to next field
  if (currentIndex < fields.length - 1) {
    focusField(fields[currentIndex + 1], true);
    return true;
  }

  // We are at the last field
  if (typeof onAddRow === 'function') {
    const rowAdded = onAddRow();
    if (rowAdded) return true;
  }

  if (typeof onComplete === 'function') {
    onComplete();
    return true;
  }

  return false;
}

/**
 * Form keydown event handler for data-entry forms.
 * Call this inside `onKeyDown` of your `<form>` or container.
 */
export function handleSmartFormKeyDown(e, container, options = {}) {
  const target = e.target;
  if (!target || !container) return;

  const isEnter = e.key === 'Enter';
  const isShift = e.shiftKey;
  const isCtrlOrCmd = e.ctrlKey || e.metaKey;

  // 1. Save shortcut: Ctrl+S / Cmd+S
  if (isCtrlOrCmd && (e.key === 's' || e.key === 'S')) {
    if (typeof options.onSave === 'function') {
      e.preventDefault();
      options.onSave();
      return;
    }
  }

  // 2. Escape to cancel/close
  if (e.key === 'Escape') {
    if (typeof options.onCancel === 'function') {
      e.preventDefault();
      options.onCancel();
      return;
    }
  }

  // 3. Enter key handling for inputs
  if (isEnter) {
    // Preserve default Enter on standard buttons and submit controls
    if (target.tagName === 'BUTTON' || (target.tagName === 'INPUT' && target.type === 'submit')) {
      return;
    }

    // Preserve normal newline in textareas unless Shift is pressed or explicit data-enter-advance attribute
    if (target.tagName === 'TEXTAREA') {
      if (!target.hasAttribute('data-enter-advance') && !isShift) {
        return; // Allow natural newline
      }
    }

    // Prevent default form submission on enter
    e.preventDefault();
    e.stopPropagation();

    advanceField(container, target, isShift, options);
  }
}

/**
 * Spreadsheet Table Navigation Handler
 * Supports Enter, Shift+Enter, Tab, Shift+Tab, and Arrow keys between cells.
 * 
 * Cell elements should specify:
 * data-table-row="0" data-table-col="0" or data-table-cell="true"
 */
export function handleTableKeyDown(e, tableContainer, options = {}) {
  const target = e.target;
  if (!target || !tableContainer) return;

  const rowAttr = target.getAttribute('data-table-row');
  const colAttr = target.getAttribute('data-table-col');

  // If cells use row/col matrix
  if (rowAttr !== null && colAttr !== null) {
    const row = parseInt(rowAttr, 10);
    const col = parseInt(colAttr, 10);
    const isShift = e.shiftKey;

    const findCell = (r, c) =>
      tableContainer.querySelector(`[data-table-row="${r}"][data-table-col="${c}"]`);

    // Enter or Tab
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();

      if (isShift) {
        // Move backward
        let prev = findCell(row, col - 1);
        if (!prev && row > 0) {
          // Wrap to end of previous row
          const prevRowCells = tableContainer.querySelectorAll(`[data-table-row="${row - 1}"]`);
          if (prevRowCells.length > 0) {
            prev = prevRowCells[prevRowCells.length - 1];
          }
        }
        if (prev) focusField(prev, true);
      } else {
        // Move forward
        let next = findCell(row, col + 1);
        if (!next) {
          // Check next row first cell
          next = findCell(row + 1, 0);
        }

        if (next) {
          focusField(next, true);
        } else if (typeof options.onAddRow === 'function') {
          // Last cell of last row: add new row!
          options.onAddRow();
        } else if (typeof options.onComplete === 'function') {
          options.onComplete();
        }
      }
      return;
    }

    // Arrow navigation
    if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
      // Up / Down arrows navigate vertically
      if (e.key === 'ArrowUp') {
        const up = findCell(row - 1, col);
        if (up) {
          e.preventDefault();
          focusField(up, true);
        }
      } else if (e.key === 'ArrowDown') {
        const down = findCell(row + 1, col);
        if (down) {
          e.preventDefault();
          focusField(down, true);
        }
      }
      return;
    }
  }

  // Fallback to sequential field navigation if data-table-row/col not present
  if (e.key === 'Enter') {
    e.preventDefault();
    advanceField(tableContainer, target, e.shiftKey, options);
  }
}
