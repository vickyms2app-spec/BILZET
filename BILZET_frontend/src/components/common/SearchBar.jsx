import React from "react";
import { Search, X } from "lucide-react";

/**
 * Standardized BILZET SearchBar Component
 * Consistent 40px height, Inter typography, 10px rounded borders, subtle focus ring,
 * positioned search icon and one-click clear button.
 */
export default function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
  onClear,
  autoFocus = false,
  disabled = false,
  id,
}) {
  const handleChange = (e) => {
    if (!onChange) return;
    const str = typeof e === "string" ? e : (e?.target?.value ?? "");
    const hybrid = new String(str);
    hybrid.target = { value: str };
    hybrid.currentTarget = { value: str };
    onChange(hybrid);
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    }
    if (onChange) {
      const hybrid = new String("");
      hybrid.target = { value: "" };
      hybrid.currentTarget = { value: "" };
      onChange(hybrid);
    }
  };

  const displayVal =
    typeof value === "string"
      ? value
      : value?.target?.value ?? (value != null ? String(value) : "");

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <Search
        size={16}
        className="absolute left-3.5 text-slate-400 pointer-events-none shrink-0"
      />
      <input
        id={id}
        type="text"
        value={displayVal}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        className="w-full h-10 pl-10 pr-9 text-xs sm:text-sm text-[#111318] placeholder-[#A9ABB5] bg-white border border-[#E7E8EC] rounded-full outline-none focus:border-[#111318] focus:ring-2 focus:ring-[#111318]/10 transition-all font-medium disabled:bg-[#FAFAFB] disabled:cursor-not-allowed shadow-xs"
      />
      {Boolean(displayVal) && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 p-0.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
          title="Clear search"
          aria-label="Clear search"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
