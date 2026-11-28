import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Logo from "./Logo";

const POLICY_TABS = [
  { label: "About Us", path: "/about-us" },
  { label: "Contact Us", path: "/contact-us" },
  { label: "Privacy Policy", path: "/privacy-policy" },
  { label: "Terms & Conditions", path: "/terms-and-conditions" },
  { label: "Refund & Cancellation Policy", path: "/refund-policy" },
];

export default function LegalPageLayout({ title, lastUpdated = "November 2026", children }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-[#E3E3E5] text-[#111318] antialiased font-sans">
      {/* Top Bar */}
      <header className="h-16 bg-[#EDEDEF] border-b border-[#D8D9DE] px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#F6F6F8] border border-[#E7E8EC] text-xs font-semibold text-[#111318] transition cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
          <Link to="/" className="flex items-center">
            <Logo theme="light" size="sm" />
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-2">
          {POLICY_TABS.map((tab) => {
            const active = location.pathname === tab.path;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                  active
                    ? "bg-[#111318] text-white"
                    : "bg-white text-[#636674] hover:text-[#111318] border border-[#E7E8EC]"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="bg-white rounded-[28px] border border-[#E7E8EC] p-6 sm:p-10 shadow-sm space-y-6">
          <div className="border-b border-[#E7E8EC] pb-5 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DFFFE6] text-[#0E2A16] text-[11px] font-bold">
              <ShieldCheck size={13} />
              <span>BILZET Legal &amp; Compliance</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111318] tracking-tight">
              {title}
            </h1>
            <p className="text-xs text-[#7C7F8A]">
              Last updated: {lastUpdated} &middot; Operated by Garden Greens Private Limited (BILZET ERP)
            </p>
          </div>

          <div className="space-y-5 text-sm text-[#3A3D47] leading-relaxed">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#EDEDEF] border-t border-[#D8D9DE] px-4 sm:px-8 py-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#7C7F8A]">
          <span>&copy; {new Date().getFullYear()} Garden Greens Private Limited (BILZET). All rights reserved.</span>
          <div className="flex flex-wrap items-center gap-4 font-medium">
            <Link to="/about-us" className="hover:text-[#111318] transition">
              About Us
            </Link>
            <Link to="/contact-us" className="hover:text-[#111318] transition">
              Contact Us
            </Link>
            <Link to="/privacy-policy" className="hover:text-[#111318] transition">
              Privacy Policy
            </Link>
            <Link to="/terms-and-conditions" className="hover:text-[#111318] transition">
              Terms &amp; Conditions
            </Link>
            <Link to="/refund-policy" className="hover:text-[#111318] transition">
              Refund &amp; Cancellation Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
