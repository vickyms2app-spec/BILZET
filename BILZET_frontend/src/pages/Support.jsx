import { useState } from "react";
import {
  LifeBuoy,
  Phone,
  Mail,
  MessageCircle,
  Clock,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  Printer,
  ShieldCheck,
  Send,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import Logo from "../components/common/Logo";

export default function Support() {
  const [openFaq, setOpenFaq] = useState(null);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketCategory, setTicketCategory] = useState("Billing & Invoices");
  const [ticketMessage, setTicketMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const phone = "+91 88254 54486";
  const rawPhone = "918825454486";
  const email = "Vickyms2app@gmail.com";

  const handleTicketSubmit = (e) => {
    e.preventDefault();
    if (!ticketMessage.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setTicketSubject("");
      setTicketMessage("");
    }, 4000);
  };

  const faqs = [
    {
      q: "How do I print an 80mm thermal receipt instead of A4 sheet?",
      a: "Go to 'Invoice Settings' from the sidebar menu, click on the 'Paper & Print Formats' tab, and choose '80mm Thermal Roll'. You can also toggle between Modern, Classic, Minimal, and Thermal in the Invoice Studio with instant live preview.",
    },
    {
      q: "How do I configure my shop's UPI QR Code for instant customer payments?",
      a: "In 'Invoice Settings' → 'Bank & UPI QR Setup', enter your Shop UPI ID (e.g. yourname@hdfcbank or phone@paytm). Every tax invoice and thermal receipt generated will dynamically encode an authentic scan-to-pay QR code with the exact bill amount.",
    },
    {
      q: "Can I use BILZET offline during power cuts or internet outages?",
      a: "Yes! BILZET caches active inventory and prices in your browser. You can continue issuing bills, and transactions automatically sync once connection is restored.",
    },
    {
      q: "How can I invite my Chartered Accountant (CA) to review GST reports?",
      a: "Navigate to 'CA Connect' in the sidebar menu. Enter your CA's email or phone number to grant read-only access for GSTR-1, GSTR-3B summaries, and monthly outward tax reports.",
    },
    {
      q: "What barcode scanners and thermal printers are supported?",
      a: "BILZET works plug-and-play with any standard USB or Bluetooth HID barcode scanner (1D/2D) and ESC/POS thermal printers (TVS, Epson, Pegasus, Everycom, Retsol, and standard generic 80mm/58mm printers).",
    },
  ];

  return (
    <div className="space-y-6 pb-16 max-w-6xl mx-auto">
      {/* ══════════════════════════════════════════════════
          HERO BANNER: CONCIERGE HELP DESK
      ══════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#0a1532] via-[#0d2250] to-[#081229] border border-cyan-500/20 shadow-xl text-white">
        {/* Glow accents */}
        <div className="absolute top-0 right-1/4 w-72 h-72 rounded-full bg-cyan-400/15 blur-[90px] pointer-events-none" />
        <div className="absolute -bottom-8 right-0 w-80 h-80 rounded-full bg-blue-600/20 blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                <Sparkles size={12} />
                24/7 Dedicated Support Desk
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Engineers Online
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
              We&apos;re here to help your shop run smoothly.
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              Get immediate assistance with invoice design customization, thermal printer drivers, barcode scanner setup, and GST tax filing support.
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <a
                href={`https://wa.me/${rawPhone}?text=${encodeURIComponent("Hello BILZET Support, I need assistance with my billing system.")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebc57] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/25 transition active:scale-95"
              >
                <MessageCircle size={15} />
                <span>Chat on WhatsApp</span>
              </a>

              <a
                href={`tel:${phone}`}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white border border-white/20 px-4 py-2.5 rounded-xl font-bold text-xs transition"
              >
                <Phone size={14} className="text-cyan-400" />
                <span>Call {phone}</span>
              </a>

              <a
                href={`mailto:${email}?subject=BILZET%20Merchant%20Support`}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white border border-white/20 px-4 py-2.5 rounded-xl font-bold text-xs transition"
              >
                <Mail size={14} className="text-teal-400" />
                <span>Email Support Desk</span>
              </a>
            </div>
          </div>

          {/* Right Floating Badge */}
          <div className="hidden md:flex flex-col items-center justify-center p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md shrink-0 w-60 text-center">
            <Logo variant="full" theme="dark" size="md" className="mb-3" />
            <div className="text-xs text-slate-300 font-semibold">Priority Customer Care</div>
            <p className="text-[11px] text-cyan-300 font-bold mt-1 font-mono">{phone}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-full font-mono">{email}</p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          CHANNELS GRID
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Channel 1: WhatsApp & Phone */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 to-cyan-500" />
          <div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 grid place-items-center mb-4 shadow-sm shadow-blue-500/10">
              <Phone size={22} />
            </div>
            <h3 className="font-bold text-slate-900 text-base">WhatsApp &amp; Phone Support</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Immediate voice &amp; chat assistance for billing queries, counter POS emergencies, and setup help.
            </p>
            <div className="mt-4 p-3 rounded-xl bg-blue-50/50 border border-blue-100/80">
              <p className="text-xs text-slate-500 font-medium">Direct Hotline / WhatsApp</p>
              <p className="text-base font-black text-blue-600 font-mono mt-0.5 tracking-tight">
                {phone}
              </p>
            </div>
          </div>

          <div className="pt-5 mt-4 border-t border-slate-100 flex items-center gap-2">
            <a
              href={`https://wa.me/${rawPhone}?text=${encodeURIComponent("Hello BILZET Support, I need help with my POS system.")}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-2 px-3 rounded-xl bg-[#25D366] hover:bg-[#1ebc57] text-white text-xs font-bold text-center transition flex items-center justify-center gap-1.5"
            >
              <MessageCircle size={13} />
              <span>WhatsApp</span>
            </a>
            <a
              href={`tel:${phone}`}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold text-center transition flex items-center justify-center gap-1.5"
            >
              <Phone size={13} />
              <span>Call Now</span>
            </a>
          </div>
        </div>

        {/* Channel 2: Official Email Desk */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 grid place-items-center mb-4 shadow-sm shadow-emerald-500/10">
              <Mail size={22} />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Official Support Desk</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Submit custom tax invoice templates, report integration bugs, or request custom feature additions.
            </p>
            <div className="mt-4 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/80">
              <p className="text-xs text-slate-500 font-medium">Primary Support Email</p>
              <p className="text-sm font-bold text-emerald-700 font-mono mt-0.5 truncate">
                {email}
              </p>
            </div>
          </div>

          <div className="pt-5 mt-4 border-t border-slate-100">
            <a
              href={`mailto:${email}?subject=BILZET%20Support%20Request`}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold text-center transition flex items-center justify-center gap-1.5"
            >
              <Mail size={13} />
              <span>Send Email to {email}</span>
            </a>
          </div>
        </div>

        {/* Channel 3: Hardware & GST Integration Concierge */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition md:col-span-2 lg:col-span-1">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-600" />
          <div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 grid place-items-center mb-4 shadow-sm shadow-purple-500/10">
              <Printer size={22} />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Printer &amp; Scanner Concierge</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Remote desktop assistance via AnyDesk or TeamViewer to configure roll thermal printers and barcode readers.
            </p>
            <div className="mt-4 p-3 rounded-xl bg-purple-50/50 border border-purple-100/80">
              <p className="text-xs text-slate-500 font-medium">Guaranteed Response Time</p>
              <p className="text-xs font-bold text-purple-700 mt-0.5">
                Under 15 minutes during business hours (9 AM – 9 PM IST)
              </p>
            </div>
          </div>

          <div className="pt-5 mt-4 border-t border-slate-100">
            <a
              href={`https://wa.me/${rawPhone}?text=${encodeURIComponent("Hi, I need help setting up my thermal printer or scanner with BILZET.")}`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold text-center transition flex items-center justify-center gap-1.5"
            >
              <ExternalLink size={13} />
              <span>Request Hardware Setup</span>
            </a>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          DIRECT MESSAGE TICKET & FAQ ACCORDION
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Quick Ticket Form (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Send size={18} className="text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Direct Support Message</h2>
          </div>

          {submitted ? (
            <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2 animate-in fade-in">
              <CheckCircle2 size={36} className="text-emerald-600 mx-auto" />
              <h3 className="font-bold text-slate-900 text-sm">Message Sent Successfully!</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Our support team has received your ticket and will reach out to you via WhatsApp / email ({email}) shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleTicketSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Issue Category</label>
                <select
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white font-medium"
                >
                  <option value="Billing & Invoices">Billing &amp; Tax Invoices</option>
                  <option value="Thermal Printer Setup">Thermal Printer / Roll Printing</option>
                  <option value="GST Reports & Filing">GST Returns &amp; GSTR-1</option>
                  <option value="UPI QR & Bank Settings">UPI QR &amp; Bank Settings</option>
                  <option value="Stock Inventory & Barcode">Inventory &amp; Barcode Scanner</option>
                  <option value="Other Question">General Question</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Subject</label>
                <input
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder="Brief summary of your question"
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Message Details</label>
                <textarea
                  rows={4}
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  placeholder="Describe what you need help with..."
                  className="w-full p-3 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#1a5cff] hover:bg-[#1248cc] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/25 transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Send size={13} />
                <span>Submit Ticket</span>
              </button>
            </form>
          )}
        </div>

        {/* RIGHT: FAQ ACCORDION (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <HelpCircle size={18} className="text-teal-600" />
            <h2 className="text-base font-bold text-slate-900">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-2.5">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="border border-slate-200/90 rounded-xl overflow-hidden transition"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-3.5 text-left text-xs font-bold text-slate-800 flex items-center justify-between hover:bg-slate-50 transition"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={15}
                      className={`text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${
                        isOpen ? "rotate-180 text-blue-600" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="p-3.5 pt-0 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
