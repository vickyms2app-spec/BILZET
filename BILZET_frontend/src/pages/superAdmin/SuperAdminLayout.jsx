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
  Gift,
} from "lucide-react";

const adminNav = [
  { label: "Platform Overview", path: "/app-admin", icon: LayoutDashboard, exact: true },
  { label: "Users & Shops", path: "/app-admin/users", icon: Users },
  { label: "Subscriptions & Plans", path: "/app-admin/subscriptions", icon: CreditCard },
  { label: "Global Customers", path: "/app-admin/customers", icon: Contact },
  { label: "CA Referrals & Payouts", path: "/app-admin/referrals", icon: Gift },
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
    <div className="min-h-screen bg-[#F7FBFF] text-[#7188A3] flex flex-col font-['Plus_Jakarta_Sans']">
      {/* Top Super Admin Banner */}
      <header className="h-16 bg-white border-b border-[#E3EDF8] px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[#8AAED8] hover:text-[#526B87] hover:bg-[#F4F9FF]"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Logo */}
          <div className="flex items-center gap-3">
            <Logo variant="full" theme="light" size="sm" />
            <span className="text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded bg-[#EEF7FF] text-[#2563EB] border border-[#D8EBFF]">
              SUPER ADMIN
            </span>
          </div>
        </div>

        {/* Status Indicator & Profile */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ECF9F1] border border-[#C8E6C9] text-[#166534] text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
            Master Mode: Vickyms2app@gmail.com
          </div>

          <a
            href="/dashboard"
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F0F7FF] hover:bg-[#D8EBFF] text-xs font-bold text-[#526B87] border border-[#E3EDF8] transition"
          >
            <ExternalLink size={13} />
            Regular Shop POS
          </a>

          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-2 rounded-xl text-[#8AAED8] hover:text-rose-500 hover:bg-[#FFF0F2] transition"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside
          className={`fixed md:sticky top-16 h-[calc(100vh-4rem)] w-64 border-r border-[#DCEBFA] flex flex-col justify-between p-4 z-30 transition-transform duration-300 ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
          style={{
            background: "linear-gradient(180deg, #F5FAFF 0%, #E8F4FF 50%, #D9ECFF 100%)",
          }}
        >
          {/* Navigation Links */}
          <div className="space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-[0.25px] text-[#374151] px-2.5 py-1.5">
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
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-[7px] text-[13px] font-normal sm:font-medium transition-[background-color,color] duration-180 ${
                    isActive
                      ? "bg-[#D4E9FF] text-[#111827] font-medium"
                      : "text-[#111827] hover:bg-[#E3F1FF]"
                  }`}
                >
                  <Icon size={15} className={isActive ? "text-[#3978B8]" : "text-[#648CB8]"} />
                  {item.label}
                </NavLink>
              );
            })}
          </div>

          {/* User info in sidebar bottom */}
          <div className="pt-4 border-t border-[#DCEBFA] space-y-3">
            <div className="p-3 rounded-xl bg-white/60 border border-[#DCEBFA]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#D4E9FF] grid place-items-center text-[#111827] border border-[#DCEBFA]">
                  <Shield size={14} className="text-[#3978B8]" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-[#111827] truncate">admin</p>
                  <p className="text-[10px] text-[#4B5563] truncate">Vickyms2app@gmail.com</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-rose-600 hover:bg-[#FFF0F2] border border-transparent transition"
            >
              <LogOut size={14} />
              Sign Out Master
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#F7FBFF]">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
