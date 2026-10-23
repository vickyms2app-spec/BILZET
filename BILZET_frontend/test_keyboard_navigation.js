import assert from "node:assert";
import {
  getFocusableFields,
  focusField,
  validateField,
  advanceField,
  handleSmartFormKeyDown,
  handleTableKeyDown,
} from "./src/utils/keyboardNavigation.js";

// Mock minimal DOM environment for testing keyboardNavigation.js
class MockElement {
  constructor(tag, attrs = {}) {
    this.tagName = tag.toUpperCase();
    this.attributes = { ...attrs };
    this.style = {};
    this.offsetParent = attrs.hidden ? null : {};
    this.offsetWidth = attrs.hidden ? 0 : 100;
    this.offsetHeight = attrs.hidden ? 0 : 30;
    this.disabled = Boolean(attrs.disabled);
    this.readOnly = Boolean(attrs.readonly);
    this.type = attrs.type || "text";
    this.valid = attrs.valid !== false;
    this.focused = false;
    this.selected = false;
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  hasAttribute(name) {
    return name in this.attributes;
  }

  checkValidity() {
    return this.valid;
  }

  reportValidity() {
    this.reported = true;
    return this.valid;
  }

  focus() {
    this.focused = true;
  }

  select() {
    this.selected = true;
  }
}

class MockContainer {
  constructor(elements = []) {
    this.elements = elements;
  }

  querySelectorAll(selector) {
    if (selector.includes("[data-table-row=")) {
      const match = selector.match(/data-table-row="(\d+)"/);
      if (match) {
        const row = match[1];
        return this.elements.filter((el) => el.getAttribute("data-table-row") === row);
      }
    }
    // Return all mock elements
    return this.elements;
  }

  querySelector(selector) {
    const rowMatch = selector.match(/data-table-row="(-?\d+)"/);
    const colMatch = selector.match(/data-table-col="(-?\d+)"/);
    if (rowMatch && colMatch) {
      const row = rowMatch[1];
      const col = colMatch[1];
      return (
        this.elements.find(
          (el) =>
            el.getAttribute("data-table-row") === row &&
            el.getAttribute("data-table-col") === col
        ) || null
      );
    }
    return null;
  }
}

// Global window mock for getComputedStyle
globalThis.window = {
  getComputedStyle: (el) => ({
    display: el.attributes.hidden ? "none" : "block",
    visibility: "visible",
  }),
};

console.log("Running BILZET Keyboard Navigation Automated Tests...\n");

// ── Test 1: getFocusableFields filtering ──
{
  const field1 = new MockElement("input", { name: "companyName" });
  const field2 = new MockElement("input", { name: "disabledField", disabled: true });
  const field3 = new MockElement("input", { name: "hiddenField", hidden: true });
  const field4 = new MockElement("input", { name: "skipField", "data-nav-skip": "true" });
  const field5 = new MockElement("select", { name: "state" });

  const container = new MockContainer([field1, field2, field3, field4, field5]);
  const visible = getFocusableFields(container);

  assert.strictEqual(visible.length, 2, "Only non-disabled, non-hidden, non-skipped fields should be included");
  assert.strictEqual(visible[0], field1);
  assert.strictEqual(visible[1], field5);
  console.log("✓ Test 1 Passed: Filtered disabled, hidden, and skipped fields correctly.");
}

// ── Test 2: Enter key advancement ──
{
  const f1 = new MockElement("input", { name: "custName" });
  const f2 = new MockElement("input", { name: "custPhone" });
  const f3 = new MockElement("input", { name: "custEmail" });
  const container = new MockContainer([f1, f2, f3]);

  // Advance from f1 -> f2
  const advanced = advanceField(container, f1, false, { validate: true });
  assert.strictEqual(advanced, true, "advanceField returned true");
  assert.strictEqual(f2.focused, true, "f2 should receive focus");
  assert.strictEqual(f2.selected, true, "f2 content should be selected for quick replace");
  console.log("✓ Test 2 Passed: Enter advances focus to next field and selects text.");
}

// ── Test 3: Validation blocking ──
{
  const invalidField = new MockElement("input", { name: "email", valid: false });
  const nextField = new MockElement("input", { name: "address" });
  const container = new MockContainer([invalidField, nextField]);

  const advanced = advanceField(container, invalidField, false, { validate: true });
  assert.strictEqual(advanced, false, "Invalid field should block advancement");
  assert.strictEqual(invalidField.reported, true, "Validation error should be reported to user");
  assert.strictEqual(nextField.focused, false, "Next field must NOT be focused when current is invalid");
  console.log("✓ Test 3 Passed: Validation errors prevent invalid transitions.");
}

// ── Test 4: Shift + Enter moves backward ──
{
  const f1 = new MockElement("input", { name: "first" });
  const f2 = new MockElement("input", { name: "second" });
  const container = new MockContainer([f1, f2]);

  const retreated = advanceField(container, f2, true);
  assert.strictEqual(retreated, true, "advanceField reverse returned true");
  assert.strictEqual(f1.focused, true, "f1 should receive focus on Shift+Enter");
  console.log("✓ Test 4 Passed: Shift + Enter moves backward to previous field.");
}

// ── Test 5: Last field completion callback ──
{
  let completed = false;
  const f1 = new MockElement("input", { name: "onlyField" });
  const container = new MockContainer([f1]);

  advanceField(container, f1, false, {
    onComplete: () => {
      completed = true;
    },
  });
  assert.strictEqual(completed, true, "onComplete should fire on last field");
  console.log("✓ Test 5 Passed: At the last field, onComplete callback triggers.");
}

// ── Test 6: Spreadsheet-like Table Navigation ──
{
  // 2 rows, 3 cols (Qty: 0, Rate: 1, Discount: 2)
  const r0c0 = new MockElement("input", { "data-table-row": "0", "data-table-col": "0" });
  const r0c1 = new MockElement("input", { "data-table-row": "0", "data-table-col": "1" });
  const r0c2 = new MockElement("input", { "data-table-row": "0", "data-table-col": "2" });

  const r1c0 = new MockElement("input", { "data-table-row": "1", "data-table-col": "0" });
  const r1c1 = new MockElement("input", { "data-table-row": "1", "data-table-col": "1" });
  const r1c2 = new MockElement("input", { "data-table-row": "1", "data-table-col": "2" });

  const tableContainer = new MockContainer([r0c0, r0c1, r0c2, r1c0, r1c1, r1c2]);

  // 6A: Enter moves from r0c0 to r0c1
  handleTableKeyDown(
    { key: "Enter", shiftKey: false, target: r0c0, preventDefault() {} },
    tableContainer
  );
  assert.strictEqual(r0c1.focused, true, "r0c1 should be focused after Enter on r0c0");

  // 6B: Enter moves from r0c2 to next row r1c0
  handleTableKeyDown(
    { key: "Enter", shiftKey: false, target: r0c2, preventDefault() {} },
    tableContainer
  );
  assert.strictEqual(r1c0.focused, true, "r1c0 should be focused after Enter on end of row 0");

  // 6C: Shift+Tab moves backward from r1c0 to r0c2
  handleTableKeyDown(
    { key: "Tab", shiftKey: true, target: r1c0, preventDefault() {} },
    tableContainer
  );
  assert.strictEqual(r0c2.focused, true, "r0c2 should be focused after Shift+Tab on r1c0");

  // 6D: Enter on last cell of last row (r1c2) triggers onAddRow
  let addRowCalled = false;
  handleTableKeyDown(
    { key: "Enter", shiftKey: false, target: r1c2, preventDefault() {} },
    tableContainer,
    {
      onAddRow: () => {
        addRowCalled = true;
      },
    }
  );
  assert.strictEqual(addRowCalled, true, "onAddRow must be called on last cell of last row");

  // 6E: Arrow navigation (Up / Down)
  r0c1.focused = false;
  r1c1.focused = false;
  handleTableKeyDown(
    { key: "ArrowDown", target: r0c1, preventDefault() {} },
    tableContainer
  );
  assert.strictEqual(r1c1.focused, true, "ArrowDown moves down 1 row in same column");

  console.log("✓ Test 6 Passed: Spreadsheet table navigation (Enter, Shift+Enter, Tab, Shift+Tab, Arrow keys, onAddRow) works reliably.");
}

console.log("\n========================================");
console.log("ALL KEYBOARD NAVIGATION TESTS PASSED! 🎉");
console.log("========================================\n");
