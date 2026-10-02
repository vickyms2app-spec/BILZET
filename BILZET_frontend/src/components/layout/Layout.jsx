import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  FilePlus,
  FileText,
  Boxes,
  Package,
  Users,
  Percent,
  Briefcase,
  Star,
  CreditCard,
  LifeBuoy,
  Settings,
  ShoppingBag,
  Truck,
  Receipt,
  DollarSign,
  BarChart3,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Shield,
  Warehouse,
  ArrowRightLeft,
  UserCheck,
  ShoppingBag as OnlineIcon,
  MessageSquare,
  History,
  FileCheck,
  RotateCcw,
  ClipboardList,
  Wallet,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../../store/auth";
import { useConnectionStatus } from "../../hooks/useConnectionStatus";
import Logo from "../common/Logo";
import { useClerk } from "@clerk/clerk-react";

const hasClerk = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

const navSections = [
  {
    title: "Dashboard",
    key: "dash",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutGrid },
      { label: "Reports & Analytics", path: "/reports", icon: BarChart3 },
    ],
  },
  {
    title: "Sales & Billing",
    key: "sales",
    items: [
      { label: "New Bill / POS", path: "/billing", icon: FilePlus },
      { label: "Sales Invoices", path: "/invoices", icon: FileText },
      { label: "Delivery Challans", path: "/sales/challans", icon: FileCheck },
      { label: "Sales Returns", path: "/sales/returns", icon: RotateCcw },
      { label: "Payment-In", path: "/sales/payments-in", icon: DollarSign },
      { label: "Customers (CRM)", path: "/customers", icon: Users },
    ],
  },
  {
    title: "Purchases",
    key: "purchases",
    items: [
      { label: "Purchase Invoices", path: "/purchases", icon: ShoppingBag },
      { label: "Purchase Orders", path: "/purchases/orders", icon: ClipboardList },
      { label: "Debit Notes / Returns", path: "/purchases/debit-notes", icon: Receipt },
      { label: "Suppliers Directory", path: "/suppliers", icon: Truck },
    ],
  },
  {
    title: "Inventory & Stock",
    key: "inventory",
    items: [
      { label: "Stock Overview", path: "/inventory", icon: Boxes },
      { label: "Products", path: "/products", icon: Package },
      { label: "Godowns / Warehouses", path: "/warehouses", icon: Warehouse },
      { label: "Stock Transfers", path: "/warehouses/transfer", icon: ArrowRightLeft },
    ],
  },
  {
    title: "Business Tools",
    key: "tools",
    items: [
      { label: "Staff & Payroll", path: "/staff", icon: UserCheck },
      { label: "Online Store Orders", path: "/online-orders", icon: OnlineIcon },
      { label: "SMS & Marketing", path: "/sms-marketing", icon: MessageSquare },
      { label: "Expenses Ledger", path: "/expenses", icon: Wallet },
    ],
  },
  {
    title: "Compliance & GST",
    key: "compliance",
    items: [
      { label: "GST Center", path: "/gst", icon: Percent },
      { label: "CA Connect", path: "/ca-connect", icon: Briefcase },
    ],
  },
  {
    title: "Settings & System",
    key: "system",
    items: [
      { label: "Refer & Earn", path: "/referral", icon: Star },
      { label: "Plans & Upgrades", path: "/plans", icon: CreditCard },
      { label: "Support Desk", path: "/support", icon: LifeBuoy },
      { label: "Business Settings", path: "/settings", icon: Settings },
      { label: "Audit Trail", path: "/audit-logs", icon: History },
    ],
  },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawer, setMobileDrawer] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});
  const { user, logout } = useAuth();
  const { status: connStatus, checkConnection } = useConnectionStatus();
  const nav = useNavigate();
  const location = useLocation();

  const toggleSection = (key) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const displayName = user?.name || "demo";
  const displayRole =
    user?.role === "ADMIN" || !user?.role || user?.role === "GUEST"
      ? "Business Owner"
      : user.role;

  const clerk = hasClerk ? useClerk() : null;

  const handleLogout = async () => {
    try {
      if (clerk) {
        await clerk.signOut();
      }
    } catch (e) {
      console.warn("Clerk sign-out warning:", e);
    }
    await logout();
    nav("/sign-in");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f1f5f9] text-slate-800">
      {/* ══════════════════════════════════════════════════
          DESKTOP SIDEBAR
      ══════════════════════════════════════════════════ */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden lg:flex flex-col transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-[72px]"
        }`}
        style={{
          background: "#080c16",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "2px 0 20px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header / Brand Logo */}
        <div
          className={`flex items-center h-16 px-4 border-b border-white/[0.05] ${
            sidebarOpen ? "justify-between" : "justify-center"
          }`}
        >
          <Logo collapsed={!sidebarOpen} theme="dark" size="md" />
          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-slate-500 hover:text-slate-200 p-1.5 rounded-lg hover:bg-white/5 transition"
              title="Collapse sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-slate-500 hover:text-slate-200 p-1.5 rounded-lg hover:bg-white/5 transition mt-2"
              title="Expand sidebar"
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
          {navSections.map((section, sIdx) => {
            const isSectionCollapsed = !!collapsedSections[section.key];

            return (
              <div key={section.key || section.title || sIdx} className="space-y-1">
                {sidebarOpen ? (
                  <button
                    onClick={() => toggleSection(section.key)}
                    className="w-full flex items-center justify-between px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition"
                  >
                    <span className="truncate">{section.title}</span>
                    <ChevronDown
                      size={12}
                      className={`text-slate-500 transition-transform duration-200 ${
                        isSectionCollapsed ? "-rotate-90" : ""
                      }`}
                    />
                  </button>
                ) : (
                  sIdx > 0 && <div className="mx-2 my-2 border-t border-white/[0.06]" />
                )}

                {(!isSectionCollapsed || !sidebarOpen) && (
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;

                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          title={!sidebarOpen ? item.label : undefined}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[12px] font-medium transition-all duration-150 ${
                            isActive
                              ? "bg-white/10 text-white font-semibold shadow-xs"
                              : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                          } ${!sidebarOpen ? "justify-center px-0 py-2.5" : ""}`}
                        >
                          <Icon
                            size={16}
                            className={`shrink-0 ${
                              isActive ? "text-blue-400" : "text-slate-500"
                            }`}
                            strokeWidth={isActive ? 2.2 : 1.8}
                          />
                          {sidebarOpen && <span className="truncate">{item.label}</span>}
                          {isActive && sidebarOpen && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Admin link for Admin users */}
          {user?.role === "ADMIN" && (
            <div className="space-y-1 pt-1 border-t border-white/[0.06]">
              {sidebarOpen && (
                <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-purple-400">
                  Administration
                </div>
              )}
              <NavLink
                to="/admin"
                title={!sidebarOpen ? "User Management" : undefined}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[12px] font-medium transition-all duration-150 ${
                  location.pathname === "/admin"
                    ? "bg-white/10 text-white font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                } ${!sidebarOpen ? "justify-center px-0 py-2.5" : ""}`}
              >
                <Shield
                  size={16}
                  className={`shrink-0 ${
                    location.pathname === "/admin" ? "text-purple-400" : "text-slate-500"
                  }`}
                  strokeWidth={location.pathname === "/admin" ? 2.2 : 1.8}
                />
                {sidebarOpen && <span className="truncate">User Admin</span>}
              </NavLink>
            </div>
          )}
        </nav>

        {/* Bottom User Card */}
        <div className="p-3 border-t border-white/[0.06]">
          {sidebarOpen ? (
            <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-3">
              <div className="mb-2.5">
                <p className="text-white font-bold text-sm leading-tight truncate">
                  {displayName}
                </p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {displayRole}
                </p>
              </div>
              {user?.email?.toLowerCase() === "vickyms2app@gmail.com" && (
                <NavLink
                  to="/app-admin"
                  className="w-full mb-2 py-1.5 px-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white text-[11px] font-bold rounded-lg transition flex items-center justify-center gap-1.5"
                >
                  <Shield size={12} />
                  <span>Master Admin</span>
                </NavLink>
              )}
              <button
                onClick={handleLogout}
                className="w-full py-1.5 px-3 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] text-slate-300 text-[11px] font-semibold rounded-lg transition flex items-center justify-center gap-2"
              >
                <LogOut size={12} className="text-slate-400" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full p-2.5 bg-white/[0.06] hover:bg-white/[0.10] text-slate-400 rounded-xl transition flex justify-center"
              title="Logout"
            >
              <LogOut size={16} />
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileDrawer(false)}
          />
          <div
            className="relative w-72 max-w-[85vw] h-full flex flex-col z-10 p-4 overflow-y-auto"
            style={{ background: "#080c16" }}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.07]">
              <Logo variant="full" theme="dark" size="md" />
              <button
                onClick={() => setMobileDrawer(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-3 space-y-3">
              {navSections.map((section) => (
                <div key={section.title} className="space-y-1">
                  <div className="px-3 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {section.title}
                  </div>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileDrawer(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                          isActive
                            ? "bg-white/10 text-white font-semibold"
                            : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                        }`}
                      >
                        <Icon
                          size={16}
                          className={isActive ? "text-blue-400" : "text-slate-500"}
                          strokeWidth={isActive ? 2.2 : 1.8}
                        />
                        <span>{item.label}</span>
                        {isActive && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              ))}

              {user?.role === "ADMIN" && (
                <div className="space-y-1 pt-1">
                  <div className="px-3 pt-1 text-[10px] font-bold uppercase tracking-wider text-purple-400">
                    Administration
                  </div>
                  <NavLink
                    to="/admin"
                    onClick={() => setMobileDrawer(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                      location.pathname === "/admin"
                        ? "bg-white/10 text-white font-semibold"
                        : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    <Shield
                      size={16}
                      className={location.pathname === "/admin" ? "text-purple-400" : "text-slate-500"}
                      strokeWidth={location.pathname === "/admin" ? 2.2 : 1.8}
                    />
                    <span>User Admin</span>
                  </NavLink>
                </div>
              )}
            </nav>

            <div className="pt-3 border-t border-white/[0.07]">
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-3 mb-2">
                <p className="text-white font-bold text-sm truncate">{displayName}</p>
                <p className="text-xs text-slate-500">{displayRole}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full py-2 bg-white/[0.06] text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                <LogOut size={13} />
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
          sidebarOpen ? "lg:pl-64" : "lg:pl-[72px]"
        }`}
      >
        {/* Mobile top trigger */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileDrawer(true)}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
            >
              <Menu size={18} />
            </button>
            <Logo variant="full" theme="light" size="sm" />
          </div>
          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full tracking-wider uppercase">
            PRO ERP
          </span>
        </div>

        {/* Content */}
        <main className="flex-1 p-4 md:p-5 lg:p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Dynamic Status Footer */}
        <footer className="mt-auto border-t border-slate-200/80 bg-white/90 backdrop-blur-xs py-3.5 px-5 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 <strong className="font-semibold text-slate-700">Garden Greens Private Limited</strong>. All rights reserved.</p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-slate-400 hidden md:inline">BILZET Business ERP</span>
            
            {/* Dynamic Connection Indicator */}
            {connStatus === "online" ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                ONLINE · CONNECTED
              </span>
            ) : connStatus === "connecting" ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                <RefreshCw size={10} className="animate-spin text-amber-600" />
                CONNECTING...
              </span>
            ) : (
              <button
                onClick={checkConnection}
                title="Click to re-check connection"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition shadow-2xs"
              >
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                OFFLINE · SERVER UNREACHABLE
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
