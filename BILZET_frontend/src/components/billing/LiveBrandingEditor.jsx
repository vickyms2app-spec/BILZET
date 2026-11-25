import React, { useRef } from "react";
import { Upload, Trash2, RotateCcw, Check, X, Image as ImageIcon, FileSignature, Loader2 } from "lucide-react";

/**
 * Inline branding customization panel rendered inside New Bill -> Live Bill Preview.
 * Keeps all edits in draft state until the user clicks Save, preserving existing
 * server-side assets if the user cancels.
 */
export default function LiveBrandingEditor({
  activeSection,
  onSelectSection,
  settings = {},
  hasUnsavedChanges = false,
  saving = false,
  errorMessage = "",
  onUpdateDraft,
  onSelectFile,
  onRemoveAsset,
  onResetDefaults,
  onCancel,
  onSave,
}) {
  const logoInputRef = useRef(null);
  const signatureInputRef = useRef(null);

  if (!activeSection) return null;

  const isLogo = activeSection === "logo";
  const logoWidth = Math.min(240, Math.max(36, Number(settings.logoWidth) || 120));
  const logoHeight = Math.min(120, Math.max(24, Number(settings.logoHeight) || 52));
  const signatureWidth = Math.min(240, Math.max(48, Number(settings.signatureWidth) || 140));
  const signatureHeight = Math.min(120, Math.max(24, Number(settings.signatureHeight) || 48));

  const hasLogo = Boolean(settings.logoUrl) && settings.showLogoOnInvoices !== false;
  const hasSignature = Boolean(settings.signatureUrl) && settings.showSignatureOnInvoices !== false;

  return (
    <div className="bg-[#FAFAFC] border-b border-[#E7E8EC] p-3.5 space-y-3">
      {/* Header Tabs & Close */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-[#E7E8EC]">
          <button
            type="button"
            onClick={() => onSelectSection("logo")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              isLogo ? "bg-[#111318] text-white" : "text-[#636674] hover:text-[#111318]"
            }`}
          >
            <ImageIcon size={12} />
            <span>Business Logo (Left)</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectSection("signature")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              !isLogo ? "bg-[#111318] text-white" : "text-[#636674] hover:text-[#111318]"
            }`}
          >
            <FileSignature size={12} />
            <span>Signature (Bottom-Right)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
              Unsaved Draft
            </span>
          )}
          <span className="text-[10px] text-[#7C7F8A] hidden sm:inline">
            BILZET Logo fixed Top-Right
          </span>
        </div>
      </div>

      {/* Inline Error Banner */}
      {errorMessage && (
        <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-medium">
          {errorMessage}
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={logoInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelectFile("logo", file);
          e.target.value = "";
        }}
      />
      <input
        ref={signatureInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelectFile("signature", file);
          e.target.value = "";
        }}
      />

      {isLogo ? (
        <div className="space-y-3 bg-white p-3 rounded-xl border border-[#E7E8EC]">
          {/* Upload / Replace / Remove */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer flex items-center gap-1.5"
              >
                <Upload size={12} />
                <span>{hasLogo ? "Replace Logo" : "Upload Logo"}</span>
              </button>
              {hasLogo && (
                <button
                  type="button"
                  onClick={() => onRemoveAsset("logo")}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  <span>Remove</span>
                </button>
              )}
            </div>
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-[#111318] cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showLogoOnInvoices !== false && Boolean(settings.logoUrl)}
                disabled={!settings.logoUrl}
                onChange={(e) => onUpdateDraft({ showLogoOnInvoices: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600"
              />
              <span>Show on Bill</span>
            </label>
          </div>

          {/* Width & Height */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between text-[11px] text-[#636674] mb-1">
                <span>Width</span>
                <span className="font-mono font-semibold text-[#111318]">{logoWidth}px</span>
              </div>
              <input
                type="range"
                min={36}
                max={240}
                step={4}
                value={logoWidth}
                onChange={(e) => onUpdateDraft({ logoWidth: Number(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-[#636674] mb-1">
                <span>Height</span>
                <span className="font-mono font-semibold text-[#111318]">{logoHeight}px</span>
              </div>
              <input
                type="range"
                min={24}
                max={120}
                step={2}
                value={logoHeight}
                onChange={(e) => onUpdateDraft({ logoHeight: Number(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Alignment & Layout */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="block text-[10px] font-semibold text-[#636674] uppercase mb-1">
                Left-Area Position
              </span>
              <div className="grid grid-cols-3 gap-1 bg-[#F6F6F8] p-0.5 rounded-lg">
                {[
                  { value: "left", label: "Left" },
                  { value: "center", label: "Center" },
                  { value: "right", label: "Right" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onUpdateDraft({ logoAlign: opt.value })}
                    className={`py-1 text-[11px] font-medium rounded-md transition cursor-pointer ${
                      (settings.logoAlign || "left") === opt.value
                        ? "bg-white text-indigo-600 shadow-2xs"
                        : "text-[#636674] hover:text-[#111318]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="block text-[10px] font-semibold text-[#636674] uppercase mb-1">
                Header Layout
              </span>
              <div className="grid grid-cols-2 gap-1 bg-[#F6F6F8] p-0.5 rounded-lg">
                {[
                  { value: "side", label: "Side-by-Side" },
                  { value: "top", label: "Stacked" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onUpdateDraft({ logoLayout: opt.value })}
                    className={`py-1 text-[11px] font-medium rounded-md transition cursor-pointer ${
                      (settings.logoLayout || "side") === opt.value
                        ? "bg-white text-indigo-600 shadow-2xs"
                        : "text-[#636674] hover:text-[#111318]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3 bg-white p-3 rounded-xl border border-[#E7E8EC]">
          {/* Upload / Replace / Remove */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => signatureInputRef.current?.click()}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer flex items-center gap-1.5"
              >
                <Upload size={12} />
                <span>{hasSignature ? "Replace Signature" : "Upload Signature"}</span>
              </button>
              {hasSignature && (
                <button
                  type="button"
                  onClick={() => onRemoveAsset("signature")}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  <span>Remove</span>
                </button>
              )}
            </div>
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-[#111318] cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showSignatureOnInvoices !== false && Boolean(settings.signatureUrl)}
                disabled={!settings.signatureUrl}
                onChange={(e) => onUpdateDraft({ showSignatureOnInvoices: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600"
              />
              <span>Show on Bill</span>
            </label>
          </div>

          {/* Width & Height */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between text-[11px] text-[#636674] mb-1">
                <span>Width</span>
                <span className="font-mono font-semibold text-[#111318]">{signatureWidth}px</span>
              </div>
              <input
                type="range"
                min={48}
                max={240}
                step={4}
                value={signatureWidth}
                onChange={(e) => onUpdateDraft({ signatureWidth: Number(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-[#636674] mb-1">
                <span>Height</span>
                <span className="font-mono font-semibold text-[#111318]">{signatureHeight}px</span>
              </div>
              <input
                type="range"
                min={24}
                max={120}
                step={2}
                value={signatureHeight}
                onChange={(e) => onUpdateDraft({ signatureHeight: Number(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Alignment + Signatory Name/Designation */}
          <div>
            <span className="block text-[10px] font-semibold text-[#636674] uppercase mb-1">
              Bottom-Right Box Position
            </span>
            <div className="grid grid-cols-3 gap-1 bg-[#F6F6F8] p-0.5 rounded-lg">
              {[
                { value: "left", label: "Left" },
                { value: "center", label: "Center" },
                { value: "right", label: "Right" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onUpdateDraft({ signatureAlign: opt.value })}
                  className={`py-1 text-[11px] font-medium rounded-md transition cursor-pointer ${
                    (settings.signatureAlign || "right") === opt.value
                      ? "bg-white text-indigo-600 shadow-2xs"
                      : "text-[#636674] hover:text-[#111318]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-semibold text-[#636674] uppercase mb-1">
                Signatory Name
              </label>
              <input
                type="text"
                value={settings.authorizedPerson || ""}
                onChange={(e) => onUpdateDraft({ authorizedPerson: e.target.value })}
                placeholder="e.g. Rajesh Kumar"
                className="w-full px-2.5 py-1.5 text-xs border border-[#E7E8EC] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#636674] uppercase mb-1">
                Designation
              </label>
              <input
                type="text"
                value={settings.signatoryLabel ?? "Authorized Signatory"}
                onChange={(e) => onUpdateDraft({ signatoryLabel: e.target.value })}
                placeholder="Authorized Signatory"
                className="w-full px-2.5 py-1.5 text-xs border border-[#E7E8EC] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Action Bar: Reset, Cancel, Save */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={onResetDefaults}
          disabled={saving}
          className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-[#636674] hover:text-[#111318] hover:bg-white border border-[#E7E8EC] transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
        >
          <RotateCcw size={12} />
          <span>Reset</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-[#636674] hover:text-[#111318] bg-white border border-[#E7E8EC] transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
          >
            <X size={12} />
            <span>Cancel</span>
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="px-3.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#111318] hover:bg-black text-white transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            <span>{saving ? "Saving..." : "Save Customization"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
