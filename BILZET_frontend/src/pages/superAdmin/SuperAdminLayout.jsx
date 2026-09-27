import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../store/auth";
import Logo from "../../components/common/Logo";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Contact,
  Sliders,
  LogOut,
  ExternalLink,
  Shield,
  Sparkles,
  Menu,
  X,
  Server,
} from "lucide-react";

const adminNav = [
  { label: "Platform Overview", path: "/app-admin", icon: LayoutDashboard, exact: true },
  { label: "Users & Shops", path: "/app-admin/users", icon: Users },
  { label: "Subscriptions & Plans", path: "/app-admin/subscriptions", icon: CreditCard },
  { label: "Global Customers", path: "/app-admin/customers", icon: Contact },
  { label: "Platform Settings", path: "/app-admin/settings", icon: Sliders },
];

export default function SuperAdminLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    nav("/app-admin/login");
  };

  return (
    <div className="min-h-screen bg-[#060b18] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans']">
      {/* Top Super Admin Banner */}
      <header className="h-16 bg-[#0a1226]/90 border-b border-white/[0.08] backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Logo */}
          <div className="flex items-center gap-3">
            <Logo variant="full" theme="dark" size="sm" />
            <span className="text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              SUPER ADMIN
            </span>
          </div>
        </div>

        {/* Status Indicator & Profile */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Master Mode: Vickyms2app@gmail.com
          </div>

          <a
            href="/dashboard"
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/10 text-xs font-bold text-slate-300 transition"
          >
            <ExternalLink size={13} />
            Regular Shop POS
          </a>

          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside
          className={`fixed md:sticky top-16 h-[calc(100vh-4rem)] w-64 bg-[#080f22] border-r border-white/[0.08] flex flex-col justify-between p-4 z-30 transition-transform duration-300 ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          {/* Navigation Links */}
          <div className="space-y-1">
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 px-3 py-2">
              Platform Controls
            </div>
            {adminNav.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.exact}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-cyan-500/20 to-blue-600/10 text-cyan-300 border border-cyan-500/30 shadow-md shadow-cyan-500/10"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon size={16} className={isActive ? "text-cyan-400" : "text-slate-400"} />
                  {item.label}
                </NavLink>
              );
            })}
          </div>

          {/* User info in sidebar bottom */}
          <div className="pt-4 border-t border-white/[0.08] space-y-3">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 grid place-items-center text-cyan-300">
                  <Shield size={14} />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-white truncate">admin</p>
                  <p className="text-[10px] text-slate-400 truncate">Vickyms2app@gmail.com</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition"
            >
              <LogOut size={14} />
              Sign Out Master
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#060b18]">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
