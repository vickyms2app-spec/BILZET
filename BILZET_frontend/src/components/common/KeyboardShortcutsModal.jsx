import { X, Keyboard, Command, ArrowRight, CornerDownLeft, Sparkles } from "lucide-react";
import Modal from "./Modal";

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcutSections = [
    {
      title: "Global Application Shortcuts",
      shortcuts: [
        { keys: ["Ctrl", "K"], mac: ["⌘", "K"], description: "Global Search bar" },
        { keys: ["Ctrl", "S"], mac: ["⌘", "S"], description: "Save Bill / Save Draft" },
        { keys: ["?"], mac: ["?"], description: "Open Keyboard Shortcuts Guide" },
        { keys: ["Esc"], mac: ["Esc"], description: "Close active modal / cancel dropdown" },
      ],
    },
    {
      title: "Smart Form & Table Navigation",
      shortcuts: [
        { keys: ["Enter"], mac: ["Enter"], description: "Move focus to next logical field / cell" },
        { keys: ["Shift", "Enter"], mac: ["⇧", "Enter"], description: "Move focus to previous field / cell" },
        { keys: ["Tab"], mac: ["Tab"], description: "Standard next focusable control" },
        { keys: ["Shift", "Tab"], mac: ["⇧", "Tab"], description: "Standard previous focusable control" },
        { keys: ["↑", "↓", "←", "→"], mac: ["↑", "↓", "←", "→"], description: "Navigate between editable table cells" },
      ],
    },
    {
      title: "Point of Sale (POS) Fast Keys",
      shortcuts: [
        { keys: ["F1"], mac: ["F1"], description: "Jump to Product / Barcode Search" },
        { keys: ["F2"], mac: ["F2"], description: "Add New Custom Item line" },
        { keys: ["F4"], mac: ["F4"], description: "Quick Payment (Cash / UPI / Card)" },
        { keys: ["F8"], mac: ["F8"], description: "Park / Hold current bill" },
        { keys: ["F9"], mac: ["F9"], description: "Complete & Print Tax Invoice" },
      ],
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts & Smart Navigation"
      subtitle="Complete guide to high-speed keyboard operations in BILZET"
      icon={Keyboard}
      maxWidth="max-w-xl"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 bg-[#12151C] hover:bg-black text-white text-xs font-bold rounded-full transition shadow-xs cursor-pointer"
        >
          Got it (Esc)
        </button>
      }
    >
      <div className="space-y-5 text-xs text-[#111318]">
        <div className="p-3.5 bg-[#DFFFE6] border border-[#5BF07B]/40 rounded-[20px] flex items-start gap-2.5 text-[#0E2A16]">
          <Sparkles size={16} className="text-[#0E2A16] mt-0.5 shrink-0" />
          <p className="text-[11px] leading-relaxed">
            <strong>Smart Navigation Active:</strong> Pressing <strong>Enter</strong> automatically validates your input and moves to the next field without submitting the form prematurely. In spreadsheet tables, pressing <strong>Enter</strong> on the last cell adds a new row!
          </p>
        </div>

        {shortcutSections.map((sec, idx) => (
          <div key={idx} className="space-y-2">
            <h4 className="font-bold text-[#111318] uppercase text-[10px] tracking-wider border-b border-[#E7E8EC] pb-1">
              {sec.title}
            </h4>
            <div className="divide-y divide-[#E7E8EC]">
              {sec.shortcuts.map((sc, sIdx) => (
                <div key={sIdx} className="py-2 flex items-center justify-between gap-3">
                  <span className="font-medium text-[#111318] text-xs">
                    {sc.description}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {sc.keys.map((k, kIdx) => (
                      <kbd
                        key={kIdx}
                        className="px-2.5 py-0.5 text-[11px] font-mono font-semibold bg-white border border-[#E7E8EC] rounded-full text-[#111318] shadow-xs"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
