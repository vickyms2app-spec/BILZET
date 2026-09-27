import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  FilePlus,
  FileText,
  Boxes,
  Users,
  Percent,
  Briefcase,
  Star,
  CreditCard,
  LifeBuoy,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
} from "lucide-react";
import { useAuth } from "../../store/auth";

const navItems = [
  { label: "Dashboard",        path: "/dashboard",   icon: LayoutGrid },
  { label: "Billing",          path: "/billing",     icon: FilePlus },
  { label: "Invoices",         path: "/invoices",    icon: FileText },
  { label: "Inventory",        path: "/inventory",   icon: Boxes },
  { label: "Customers",        path: "/customers",   icon: Users },
  { label: "GST",              path: "/gst",         icon: Percent },
  { label: "CA Connect",       path: "/ca-connect",  icon: Briefcase },
  { label: "Referral",         path: "/referral",    icon: Star },
  { label: "Plans & Payments", path: "/plans",       icon: CreditCard },
  { label: "Support",          path: "/support",     icon: LifeBuoy },
  { label: "Invoice Settings", path: "/settings",    icon: Settings },
];

import Logo from "../common/Logo";

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawer, setMobileDrawer] = useState(false);
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  const displayName = user?.name || "demo";
  const displayRole = user?.role === "ADMIN" || !user?.role || user?.role === "GUEST" 
    ? "Business Owner" 
    : user.role;

  const handleLogout = () => {
    logout();
    nav("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f7fb] text-slate-800">
      {/* ══════════════════════════════════════════════════
          DESKTOP SIDEBAR
      ══════════════════════════════════════════════════ */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden lg:flex flex-col transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-[76px]"
        }`}
        style={{
          background: "#080c16",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Header / Brand Logo */}
        <div className={`flex items-center h-20 px-5 ${sidebarOpen ? "justify-between" : "justify-center"}`}>
          <Logo collapsed={!sidebarOpen} theme="dark" size="md" />
          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition"
              title="Collapse"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition mt-2"
              title="Expand"
            >
              <ChevronRight size={18} />
            </button>
          )}
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-2 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={!sidebarOpen ? item.label : undefined}
                className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-[#18233f] text-white shadow-sm ring-1 ring-blue-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                } ${!sidebarOpen ? "justify-center px-0" : ""}`}
              >
                <Icon
                  size={19}
                  className={`shrink-0 ${
                    isActive ? "text-blue-400" : "text-slate-400"
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom User Card */}
        <div className="p-4 border-t border-white/[0.08]">
          {sidebarOpen ? (
            <div className="bg-[#121929] border border-white/[0.08] rounded-2xl p-3.5 shadow-md">
              <div className="mb-3">
                <p className="text-white font-bold text-base leading-tight truncate">
                  {displayName}
                </p>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  {displayRole}
                </p>
              </div>
              {user?.email?.toLowerCase() === "vickyms2app@gmail.com" && (
                <NavLink
                  to="/app-admin"
                  className="w-full mb-2 py-2 px-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20"
                >
                  <Shield size={13} />
                  <span>Master Admin</span>
                </NavLink>
              )}
              <button
                onClick={handleLogout}
                className="w-full py-2 px-3 bg-[#1d273d] hover:bg-[#283654] border border-white/[0.1] text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2"
              >
                <LogOut size={13} className="text-slate-300" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full p-2.5 bg-[#1d273d] hover:bg-[#283654] text-white rounded-xl transition flex justify-center"
              title="Logout"
            >
              <LogOut size={17} />
            </button>
          )}
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════
          MOBILE DRAWER
      ══════════════════════════════════════════════════ */}
      {mobileDrawer && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileDrawer(false)}
          />
          <div
            className="relative w-72 max-w-[80vw] h-full flex flex-col z-10 p-4"
            style={{ background: "#080c16" }}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <Logo variant="full" theme="dark" size="md" />
              <button
                onClick={() => setMobileDrawer(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-3 space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileDrawer(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                      isActive
                        ? "bg-[#18233f] text-white ring-1 ring-blue-500/30"
                        : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    <Icon size={19} className={isActive ? "text-blue-400" : "text-slate-400"} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-white/[0.08]">
              <div className="bg-[#121929] border border-white/[0.08] rounded-xl p-3 mb-2">
                <p className="text-white font-bold text-sm truncate">{displayName}</p>
                <p className="text-xs text-slate-400">{displayRole}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full py-2 bg-[#1d273d] text-white text-xs font-semibold rounded-xl"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          MAIN CONTENT AREA
      ══════════════════════════════════════════════════ */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarOpen ? "lg:pl-64" : "lg:pl-[76px]"
        }`}
      >
        {/* Mobile top trigger */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileDrawer(true)}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
            >
              <Menu size={20} />
            </button>
            <Logo variant="full" theme="light" size="sm" />
          </div>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
            PRO
          </span>
        </div>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Standardized Bottom Footer matching Screenshot 3 & 4 */}
        <footer className="mt-auto border-t border-slate-200 bg-white/70 backdrop-blur-sm py-4 px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 <strong className="font-semibold text-slate-700">Garden Greens Private Limited</strong>. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="text-slate-500">BILZET · A product of Garden Greens</span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-[#8a1818] text-white shadow-sm">
              OFFLINE · 0 PENDING
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
