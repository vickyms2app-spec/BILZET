import { useState, useMemo, useEffect, useRef } from "react";
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
  Search,
  Store,
  ChevronUp,
  Sun,
  Moon,
  Sparkles,
  Bell,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Lock,
  CalendarCheck2,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../store/auth";
import { useConnectionStatus } from "../../hooks/useConnectionStatus";
import Logo from "../common/Logo";
import { hasClerk } from "../../config/clerk";
import { customersApi, productsApi, salesApi, settingsApi, staffApi } from "../../api";
import { isAdminEmail, isAdminUser } from "../../utils/security";
import { useSecurityStore } from "../../store/securityStore";
import { usePermissions } from "../../hooks/usePermissions";
import StoreSwitcher from "../common/StoreSwitcher";

const navSections = [
  {
    title: "Dashboard",
    key: "dash",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutGrid },
      { label: "Staff Workspace", path: "/staff-dashboard", icon: UserCheck },
      { label: "Reports & Analytics", path: "/reports", icon: BarChart3 },
    ],
  },
  {
    title: "Sales & Billing",
    key: "sales",
    items: [
      { label: "New Bill / POS", path: "/billing", icon: FilePlus, highlight: true },
      { label: "Sales Invoices", path: "/invoices", icon: FileText },
      { label: "Delivery Challans", path: "/sales/challans", icon: FileCheck },
      { label: "Sales Returns", path: "/sales/returns", icon: RotateCcw },
      { label: "Payments-In", path: "/sales/payments-in", icon: DollarSign },
      { label: "Customer Details", path: "/customers", icon: Users },
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
      { label: "Product Catalog", path: "/products", icon: Package },
      { label: "Warehouses & Godowns", path: "/warehouses", icon: Warehouse },
      { label: "Stock Transfers", path: "/stock-transfers", icon: ArrowRightLeft },
    ],
  },
  {
    title: "Staff & Payroll",
    key: "staff_payroll",
    items: [
      { label: "Staff", path: "/staff", icon: UserCheck },
      { label: "Attendance", path: "/staff/attendance", icon: CalendarCheck2 },
      { label: "Payroll", path: "/staff/payroll", icon: DollarSign },
    ],
  },
  {
    title: "Operations & HR",
    key: "tools",
    items: [
      { label: "Team & Sub-Users", path: "/team", icon: Users },
      { label: "Online Store Orders", path: "/online-orders", icon: OnlineIcon },
      { label: "Expenses", path: "/expenses", icon: Wallet },
      { label: "SMS Campaigns", path: "/sms-marketing", icon: MessageSquare },
    ],
  },
  {
    title: "System & Settings",
    key: "system",
    items: [
      { label: "Business Settings", path: "/settings", icon: Settings },
      { label: "Subscription Plan", path: "/subscription", icon: CreditCard },
      { label: "GST & Tax Filing", path: "/gst", icon: Percent },
      { label: "CA Connect", path: "/ca-connect", icon: Briefcase },
      { label: "Refer & Earn", path: "/referral", icon: Star },
      { label: "Security Audit Trail", path: "/audit-logs", icon: History },
      { label: "Support & Help", path: "/support", icon: LifeBuoy },
    ],
  },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawer, setMobileDrawer] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [userDropdown, setUserDropdown] = useState(false);
  const { user, logout } = useAuth();
  const { adminRevealed, toggleAdminReveal } = useSecurityStore();
  const { hasPermission, isOwner, isSuperAdmin } = usePermissions();
  const isAuthorizedAdmin = isAdminUser(user) || isAdminEmail(user?.email);
  const { status: connStatus, checkConnection } = useConnectionStatus();
  const nav = useNavigate();
  const location = useLocation();

  const toggleSection = (key) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const displayName = user?.name || "Admin User";
  const displayRole =
    user?.role === "ADMIN" || !user?.role || user?.role === "GUEST"
      ? "Business Owner"
      : user.role;

  const userInitials = useMemo(() => {
    if (!displayName) return "B";
    const parts = displayName.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  }, [displayName]);

  // Theme Toggle State
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("bilzet_theme") === "dark";
  });

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("bilzet_theme", next ? "dark" : "light");
    if (next) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  // Notifications State & Popover
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [shopInfo, setShopInfo] = useState({
    shopName: "BILZET Store",
    address: "Main Branch",
  });

  // Header quick punch attendance state
  const [headerAttendance, setHeaderAttendance] = useState(null);
  const [headerPunching, setHeaderPunching] = useState(false);
  const [headerPunchToast, setHeaderPunchToast] = useState("");

  const refreshHeaderAttendance = async () => {
    try {
      const res = await staffApi.getMyAttendanceToday();
      setHeaderAttendance(res?.attendance || res || null);
    } catch {}
  };

  const handleHeaderQuickPunch = async () => {
    if (headerPunching) return;
    setHeaderPunching(true);
    try {
      if (headerAttendance?.checkIn && !headerAttendance?.checkOut) {
        const res = await staffApi.checkOutSelf();
        setHeaderAttendance(res?.attendance || res);
        setHeaderPunchToast("Checked out! Shift ended.");
      } else if (!headerAttendance?.checkIn) {
        const res = await staffApi.checkInSelf();
        setHeaderAttendance(res?.attendance || res);
        setHeaderPunchToast("Checked in! Shift started.");
      }
      setTimeout(() => setHeaderPunchToast(""), 3500);
    } catch (err) {
      setHeaderPunchToast(err?.response?.data?.message || "Action failed");
      setTimeout(() => setHeaderPunchToast(""), 3500);
    } finally {
      setHeaderPunching(false);
    }
  };

  const [storeRevision, setStoreRevision] = useState(0);

  const loadLayoutData = async () => {
    refreshHeaderAttendance();
    try {
      const settings = await settingsApi.get();
      if (settings?.shopName) {
        setShopInfo({
          shopName: settings.shopName || "BILZET Store",
          address: settings.address || settings.state || "Main Branch",
        });
      }
    } catch {}

    try {
      const [lowStockRes, salesRes] = await Promise.allSettled([
        productsApi.low ? productsApi.low() : Promise.resolve(null),
        salesApi.list({ page: 1, limit: 1 }),
      ]);

      const realNotes = [];
      const lowProducts =
        lowStockRes.status === "fulfilled" && (lowStockRes.value?.products || lowStockRes.value?.data?.products || []);
      if (lowProducts && lowProducts.length > 0) {
        realNotes.push({
          id: "low-stock-alert",
          title: "Low Stock Alert",
          desc: `${lowProducts.length} product(s) reached minimum reorder threshold`,
          time: "Real-time",
          type: "warning",
          link: "/inventory",
        });
      }

      const recentSale =
        salesRes.status === "fulfilled" &&
        (salesRes.value?.sales?.[0] || salesRes.value?.data?.sales?.[0] || salesRes.value?.[0]);
      if (recentSale) {
        realNotes.push({
          id: `sale-${recentSale.id || recentSale.invoiceNumber}`,
          title: "Recent Sale",
          desc: `₹${Number(recentSale.grandTotal || 0).toLocaleString("en-IN")} via ${recentSale.invoiceNumber || "Invoice"}`,
          time: "Latest",
          type: "success",
          link: "/invoices",
        });
      }

      setNotifications(realNotes);
      setUnreadCount(realNotes.length);
    } catch {}
  };

  useEffect(() => {
    loadLayoutData();
    const handleStoreChange = () => {
      setStoreRevision((prev) => prev + 1);
      loadLayoutData();
    };
    window.addEventListener("bilzet:store-changed", handleStoreChange);
    return () => window.removeEventListener("bilzet:store-changed", handleStoreChange);
  }, []);

  // Global Search State & Autocomplete
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState({ customers: [], products: [], invoices: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ customers: [], products: [], invoices: [] });
      setSearchOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const [cRes, pRes, iRes] = await Promise.all([
          customersApi.list({ search: searchQuery }).catch(() => ({})),
          productsApi.list({ search: searchQuery }).catch(() => ({})),
          salesApi.list({ search: searchQuery }).catch(() => ({})),
        ]);
        const custs = cRes?.customers || cRes?.data?.customers || [];
        const prods = pRes?.products || pRes?.data?.products || [];
        const invs = iRes?.sales || iRes?.data?.sales || [];
        setSearchResults({
          customers: custs.slice(0, 4),
          products: prods.slice(0, 4),
          invoices: invs.slice(0, 4),
        });
        setSearchOpen(true);
      } catch (_) {} finally {
        setSearchLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const displayedNavSections = useMemo(() => {
    const permMap = {
      "/reports": ["reports.view", "reports.sales"],
      "/billing": ["billing.create", "billing.view"],
      "/invoices": ["billing.view"],
      "/sales/challans": ["sales_ops.challan"],
      "/sales/returns": ["sales_ops.return"],
      "/sales/payments-in": ["sales_ops.payment"],
      "/customers": ["customers.view"],
      "/purchases": ["purchases.view"],
      "/purchases/orders": ["purchases.view"],
      "/purchases/debit-notes": ["purchases.debit", "purchases.view"],
      "/suppliers": ["purchases.view"],
      "/inventory": ["inventory.view"],
      "/products": ["inventory.view"],
      "/warehouses": ["inventory.view"],
      "/stock-transfers": ["inventory.transfer", "inventory.adjust", "inventory.view"],
      "/staff-dashboard": ["attendance.view_self", "attendance.check_in", "attendance.check_out"],
      "/staff": ["staff.view"],
      "/staff/attendance": ["attendance.view_all", "attendance.manage", "staff.attendance", "staff.view"],
      "/staff/payroll": ["staff.payroll", "staff.view"],
      "/team": ["users.view", "users.create", "settings.view", "settings.manage"],
      "/online-orders": ["online_orders.view"],
      "/expenses": ["expenses.view", "reports.profit_loss"],
      "/sms-marketing": ["sms.view"],
      "/settings": ["settings.view"],
      "/subscription": ["subscription.manage"],
      "/gst": ["gst.view"],
      "/ca-connect": ["gst.view"],
      "/audit-logs": ["audit_logs.view"],
    };

    const isCA = user?.role === "CA";
    if (isCA) {
      return [
        {
          title: "Chartered Accountant Portal",
          key: "ca_portal",
          items: [
            { label: "CA Portal", path: "/ca-portal", icon: ShieldCheck, highlight: true },
            { label: "GST & Tax Filing", path: "/gst", icon: Percent },
            { label: "Financial Reports", path: "/reports", icon: BarChart3 },
            { label: "Support & Help", path: "/support", icon: LifeBuoy },
          ],
        },
      ];
    }

    return navSections
      .map((sec) => {
        let items = sec.items.filter((item) => {
          if (isSuperAdmin || isOwner) return true;
          const requiredPerms = permMap[item.path];
          if (!requiredPerms) return true;
          return requiredPerms.some((p) => hasPermission(p));
        });

        if (sec.key === "system" && isSuperAdmin) {
          if (!items.some((i) => i.path === "/ca-portal")) {
            items = [
              ...items,
              { label: "CA Portal (Auditor View)", path: "/ca-portal", icon: ShieldCheck },
            ];
          }
          if (!items.some((i) => i.path === "/admin")) {
            items = [
              ...items,
              { label: "Admin Console & Vault", path: "/admin", icon: Shield, highlight: true },
            ];
          }
        }

        return { ...sec, items };
      })
      .filter((sec) => sec.items.length > 0);
  }, [user, isAuthorizedAdmin, isOwner, isSuperAdmin, hasPermission]);

  // Dynamic breadcrumb matching
  const currentBreadcrumb = useMemo(() => {
    const path = location.pathname;
    if (path === "/ca-portal") return { category: "CA Audit & Taxation", page: "Chartered Accountant Portal", icon: ShieldCheck };
    for (const sec of displayedNavSections) {
      const match = sec.items.find((i) => i.path === path);
      if (match) {
        return { category: sec.title, page: match.label, icon: match.icon };
      }
    }
    if (path.startsWith("/invoices/")) return { category: "Sales & Billing", page: "Invoice Details", icon: FileText };
    if (path === "/admin" || path === "/app-admin") return { category: "Administration", page: "Admin Console & Vault", icon: Shield };
    return { category: "Overview", page: "BILZET Business ERP", icon: LayoutGrid };
  }, [location.pathname, displayedNavSections]);

  const handleLogout = async () => {
    try {
      if (typeof window !== "undefined" && window.Clerk?.signOut) {
        await window.Clerk.signOut();
      }
    } catch (e) {
      console.warn("Clerk sign-out warning:", e);
    }
    await logout();
    nav("/sign-in");
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#f8fafc] text-slate-800 antialiased font-sans selection:bg-blue-600 selection:text-white">
      {/* ══════════════════════════════════════════════════
          DESKTOP & TABLET SIDEBAR
      ══════════════════════════════════════════════════ */}
      <aside
        className={`h-full shrink-0 hidden md:flex flex-col transition-all duration-300 ease-in-out z-30 select-none ${
          sidebarOpen ? "w-[264px]" : "w-[76px]"
        }`}
        style={{
          background: "linear-gradient(180deg, #0F2747 0%, #0B1D36 50%, #081628 100%)",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "4px 0 24px -2px rgba(15,39,71,0.25)",
        }}
      >
        {/* Brand Header */}
        <div
          className={`flex items-center h-16 px-4 border-b border-white/[0.06] shrink-0 ${
            sidebarOpen ? "justify-between" : "justify-center"
          }`}
        >
          <Logo collapsed={!sidebarOpen} theme="dark" size="md" />
          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/[0.08] transition duration-150"
              title="Collapse sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/[0.08] transition duration-150"
              title="Expand sidebar"
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>

        {/* Quick Action Button: POS Billing */}
        {sidebarOpen ? (
          <div className="px-3.5 pt-3.5 pb-1 shrink-0">
            <NavLink
              to="/billing"
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-md shadow-blue-500/25 transition-all duration-200 group"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles size={16} className="text-cyan-200 animate-pulse" />
                <span>POS / New Bill</span>
              </div>
              <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-mono tracking-tight text-white/90">
                F2
              </span>
            </NavLink>
          </div>
        ) : (
          <div className="px-2 pt-3 pb-1 shrink-0 flex justify-center">
            <NavLink
              to="/billing"
              title="New Bill / POS (F2)"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-tr from-blue-600 to-cyan-500 shadow-md shadow-blue-500/30 hover:scale-105 transition"
            >
              <Sparkles size={17} />
            </NavLink>
          </div>
        )}

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
          {displayedNavSections.map((section, sIdx) => {
            const isSectionCollapsed = !!collapsedSections[section.key];

            return (
              <div key={section.key || section.title || sIdx} className="space-y-1">
                {sidebarOpen ? (
                  <button
                    onClick={() => toggleSection(section.key)}
                    className="w-full flex items-center justify-between px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400/80 hover:text-slate-200 transition"
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
                      const isActive =
                        location.pathname === item.path ||
                        (item.path === "/staff/attendance" && location.pathname === "/attendance") ||
                        (item.path !== "/" &&
                          !["/staff", "/staff/attendance", "/staff/payroll"].includes(item.path) &&
                          location.pathname.startsWith(`${item.path}/`));

                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          title={!sidebarOpen ? item.label : undefined}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[12px] font-medium transition-all duration-150 relative group ${
                            isActive
                              ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold shadow-md shadow-blue-600/30"
                              : "text-slate-300/80 hover:text-white hover:bg-white/[0.07]"
                          } ${!sidebarOpen ? "justify-center px-0 py-2.5" : ""}`}
                        >
                          <Icon
                            size={16}
                            className={`shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                              isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                            }`}
                            strokeWidth={isActive ? 2.2 : 1.8}
                          />
                          {sidebarOpen && <span className="truncate">{item.label}</span>}
                          {isActive && sidebarOpen && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-xs shadow-blue-400 shrink-0" />
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom Store Card & User */}
        <div className="p-3 border-t border-white/[0.08] bg-black/25 shrink-0 space-y-2">
          {sidebarOpen ? (
            <>
              {/* Store Switcher Component */}
              <StoreSwitcher variant="sidebar" />

              <div className="bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.12] rounded-xl p-2.5 transition duration-150">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0">
                    {userInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-bold text-xs leading-tight truncate">
                      {displayName}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                      {displayRole}
                    </p>
                  </div>
                </div>

                {isAuthorizedAdmin && (
                  <NavLink
                    to="/admin"
                    className="w-full mb-1.5 py-1 px-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white text-[10px] font-bold rounded-lg transition flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Shield size={11} />
                    <span>Admin Console & Vault</span>
                  </NavLink>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full py-1.5 px-2.5 bg-white/[0.06] hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/30 border border-white/[0.08] text-slate-300 text-[10px] font-semibold rounded-lg transition flex items-center justify-center gap-1.5"
                >
                  <LogOut size={11} className="text-slate-400 group-hover:text-rose-300" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-xs"
                title={`${displayName} (${displayRole})`}
              >
                {userInitials}
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════
          MOBILE DRAWER (FOR SCREENS < 768px)
      ══════════════════════════════════════════════════ */}
      {mobileDrawer && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileDrawer(false)}
          />
          <div
            className="relative w-72 max-w-[85vw] h-full flex flex-col z-10 p-4 overflow-y-auto animate-in slide-in-from-left duration-250 shadow-2xl"
            style={{ background: "linear-gradient(180deg, #0F2747 0%, #0B1D36 100%)" }}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <Logo variant="full" theme="dark" size="md" />
              <button
                onClick={() => setMobileDrawer(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="pt-3 pb-2">
              <NavLink
                to="/billing"
                onClick={() => setMobileDrawer(false)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-blue-600 to-blue-500 shadow-md shadow-blue-500/20"
              >
                <Sparkles size={14} />
                <span>POS / Quick Bill</span>
              </NavLink>
            </div>

            <nav className="flex-1 overflow-y-auto py-2 space-y-3">
              {displayedNavSections.map((section) => (
                <div key={section.title} className="space-y-1">
                  <div className="px-3 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {section.title}
                  </div>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      location.pathname === item.path ||
                      (item.path === "/staff/attendance" && location.pathname === "/attendance");

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileDrawer(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                          isActive
                            ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold shadow-md shadow-blue-600/30"
                            : "text-slate-300/80 hover:text-white hover:bg-white/[0.07]"
                        }`}
                      >
                        <Icon
                          size={16}
                          className={isActive ? "text-white" : "text-slate-400"}
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
            </nav>

            <div className="pt-3 border-t border-white/[0.08]">
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 mb-2 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {userInitials}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-bold text-xs truncate">{displayName}</p>
                  <p className="text-[10px] text-slate-400">{displayRole}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full py-2 bg-white/[0.06] hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition"
              >
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          MAIN VIEWPORT (FLEX COLUMN WITH INDEPENDENT SCROLL)
      ══════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* ── Top Header Bar ── */}
        <header className="h-16 shrink-0 bg-white border-b border-slate-200/90 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 z-20 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          {/* Left: Mobile trigger & Global Search with Ctrl+K */}
          <div className="flex items-center gap-3 min-w-0 flex-1 max-w-xl">
            <button
              onClick={() => setMobileDrawer(true)}
              className="md:hidden p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
              aria-label="Open Navigation"
            >
              <Menu size={18} />
            </button>

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden md:flex p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition shrink-0"
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <Menu size={17} />
            </button>

            {/* Global Search Bar with Ctrl+K badge & Live Autocomplete Dropdown */}
            <div className="relative w-full max-w-md">
              <div className="flex items-center gap-2.5 px-3.5 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs text-slate-400 w-full focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/10 transition shadow-2xs">
                <Search size={15} className="text-slate-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchQuery.trim()) setSearchOpen(true);
                  }}
                  placeholder="Search customers, products, invoices..."
                  className="bg-transparent outline-none w-full text-slate-800 text-xs placeholder:text-slate-400 font-normal"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchOpen(false);
                    }}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X size={13} />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-white border border-slate-200 rounded shadow-2xs shrink-0">
                    Ctrl K
                  </kbd>
                )}
              </div>

              {/* Instant Search Results Dropdown */}
              {searchOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setSearchOpen(false)}
                  />
                  <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl p-3 shadow-2xl border border-slate-200 z-40 max-h-[80vh] overflow-y-auto animate-in fade-in zoom-in-95">
                    {searchLoading ? (
                      <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                        <RefreshCw size={14} className="animate-spin text-blue-600" />
                        <span>Searching records…</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* CUSTOMERS */}
                        {searchResults.customers.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
                              Customers ({searchResults.customers.length})
                            </p>
                            <div className="space-y-1">
                              {searchResults.customers.map((c) => (
                                <div
                                  key={c.id || c._id}
                                  onClick={() => {
                                    setSearchOpen(false);
                                    nav(`/customers`);
                                  }}
                                  className="flex items-center justify-between p-2 rounded-xl hover:bg-blue-50/70 cursor-pointer transition text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-blue-100/60 text-blue-700 flex items-center justify-center font-bold text-[11px]">
                                      {c.name?.[0] || "C"}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-slate-800">{c.name}</p>
                                      <p className="text-[10px] text-slate-400">{c.phone || "No phone"}</p>
                                    </div>
                                  </div>
                                  <span className="text-[11px] font-mono font-bold text-slate-600">
                                    ₹{Number(c.balance || 0).toLocaleString("en-IN")}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* PRODUCTS */}
                        {searchResults.products.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
                              Products ({searchResults.products.length})
                            </p>
                            <div className="space-y-1">
                              {searchResults.products.map((p) => (
                                <div
                                  key={p.id || p._id}
                                  onClick={() => {
                                    setSearchOpen(false);
                                    nav(`/products`);
                                  }}
                                  className="flex items-center justify-between p-2 rounded-xl hover:bg-emerald-50/70 cursor-pointer transition text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-emerald-100/60 text-emerald-700 flex items-center justify-center">
                                      <Package size={14} />
                                    </div>
                                    <div>
                                      <p className="font-semibold text-slate-800">{p.name}</p>
                                      <p className="text-[10px] text-slate-400">Stock: {p.stock ?? 0} {p.unit || ""}</p>
                                    </div>
                                  </div>
                                  <span className="text-[11px] font-mono font-bold text-emerald-700">
                                    ₹{p.sellingPrice}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* INVOICES */}
                        {searchResults.invoices.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
                              Invoices ({searchResults.invoices.length})
                            </p>
                            <div className="space-y-1">
                              {searchResults.invoices.map((inv) => (
                                <div
                                  key={inv.id || inv._id}
                                  onClick={() => {
                                    setSearchOpen(false);
                                    nav(`/invoices`);
                                  }}
                                  className="flex items-center justify-between p-2 rounded-xl hover:bg-purple-50/70 cursor-pointer transition text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-purple-100/60 text-purple-700 flex items-center justify-center font-mono text-[10px] font-bold">
                                      INV
                                    </div>
                                    <div>
                                      <p className="font-semibold text-slate-800">{inv.invoiceNumber}</p>
                                      <p className="text-[10px] text-slate-400">{inv.customer?.name || "Walk-in"}</p>
                                    </div>
                                  </div>
                                  <span className="text-[11px] font-mono font-bold text-slate-700">
                                    ₹{Number(inv.grandTotal || 0).toLocaleString("en-IN")}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {searchResults.customers.length === 0 &&
                          searchResults.products.length === 0 &&
                          searchResults.invoices.length === 0 && (
                            <div className="py-6 text-center text-xs text-slate-400 italic">
                              No matching records found for &quot;{searchQuery}&quot;
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: Quick Punch, Theme Toggle, Notifications, Store, Connection, User Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Header Attendance Quick Punch Clock Button */}
            {user && (
              <div className="relative">
                <button
                  type="button"
                  onClick={handleHeaderQuickPunch}
                  disabled={headerPunching || Boolean(headerAttendance?.checkIn && headerAttendance?.checkOut)}
                  className={`h-[36px] px-3 rounded-full border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    headerAttendance?.checkIn && !headerAttendance?.checkOut
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                      : headerAttendance?.checkIn && headerAttendance?.checkOut
                      ? "bg-slate-100 text-slate-600 border-slate-200 cursor-default"
                      : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                  }`}
                  title={
                    headerAttendance?.checkIn && !headerAttendance?.checkOut
                      ? "Click to Punch Out (End Shift)"
                      : headerAttendance?.checkIn && headerAttendance?.checkOut
                      ? "Today's shift completed"
                      : "Click to Punch In (Start Shift)"
                  }
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      headerAttendance?.checkIn && !headerAttendance?.checkOut
                        ? "bg-emerald-500 animate-pulse"
                        : headerAttendance?.checkIn && headerAttendance?.checkOut
                        ? "bg-slate-400"
                        : "bg-blue-500"
                    }`}
                  />
                  <span className="hidden sm:inline">
                    {headerPunching
                      ? "Updating…"
                      : headerAttendance?.checkIn && !headerAttendance?.checkOut
                      ? "On Duty"
                      : headerAttendance?.checkIn && headerAttendance?.checkOut
                      ? "Shift Done"
                      : "Punch In"}
                  </span>
                </button>

                {headerPunchToast && (
                  <div className="absolute right-0 top-11 bg-slate-900 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap z-50 animate-in fade-in">
                    {headerPunchToast}
                  </div>
                )}
              </div>
            )}

            {/* Real Interactive Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-[38px] h-[38px] rounded-full border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition flex items-center justify-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] active:scale-95 group"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              <span className="w-[28px] h-[28px] rounded-full bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors">
                {isDark ? <Sun size={14} className="text-amber-500" /> : <Moon size={14} className="text-slate-600" />}
              </span>
            </button>

            {/* Real Interactive Notification Bell with Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative w-[38px] h-[38px] rounded-full border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition flex items-center justify-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] active:scale-95 group"
                title="Notifications & System Activity"
              >
                <span className="w-[28px] h-[28px] rounded-full bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors">
                  <Bell size={14} />
                </span>
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
                )}
              </button>

              {showNotifications && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotifications(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl p-4 shadow-2xl border border-slate-200 z-50 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Bell size={15} className="text-blue-600" />
                        <h4 className="text-xs font-bold text-slate-800">Live Activity Feed</h4>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-600 rounded-full border border-rose-200">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setUnreadCount(0)}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto my-2">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-1.5 opacity-80" />
                          <p className="font-semibold text-slate-700">All systems normal</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">No pending stock alerts or warnings</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              setShowNotifications(false);
                              if (n.link) nav(n.link);
                            }}
                            className="py-2.5 px-2 rounded-xl hover:bg-slate-50 cursor-pointer transition flex items-start gap-2.5"
                          >
                            <div className="mt-0.5">
                              {n.type === "warning" ? (
                                <AlertTriangle size={15} className="text-amber-500" />
                              ) : n.type === "success" ? (
                                <CheckCircle2 size={15} className="text-emerald-500" />
                              ) : (
                                <Sparkles size={15} className="text-blue-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                              <p className="text-[11px] text-slate-500 leading-snug">{n.desc}</p>
                              <span className="text-[10px] text-slate-400 mt-1 block">{n.time}</span>
                            </div>
                            <ArrowUpRight size={13} className="text-slate-400 shrink-0 mt-1" />
                          </div>
                        ))
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Sync Engine: Active</span>
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        All systems operational
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Store Switcher Header */}
            <StoreSwitcher variant="header" />

            {/* Connection Badge */}
            {connStatus === "online" ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 pl-2 pr-3 h-[38px] rounded-full text-xs font-semibold text-[#111827] bg-white border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <span className="w-[24px] h-[24px] rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </span>
                <span>Online</span>
              </span>
            ) : (
              <button
                onClick={checkConnection}
                className="hidden sm:inline-flex items-center gap-1.5 pl-2 pr-3 h-[38px] rounded-full text-xs font-semibold text-[#111827] bg-white border border-rose-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)] animate-bounce"
              >
                <span className="w-[24px] h-[24px] rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                </span>
                <span>Offline · Retry</span>
              </button>
            )}

            {/* Quick POS Button */}
            <NavLink
              to="/billing"
              className="inline-flex items-center gap-2 pl-2 pr-4 h-[38px] rounded-full text-xs font-semibold text-[#111827] bg-white hover:bg-blue-50/20 border border-slate-200/90 hover:border-blue-300 transition shadow-[0_1px_2px_rgba(15,23,42,0.04)] group"
            >
              <span className="w-[26px] h-[26px] rounded-full bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-blue-600 group-hover:text-white transition-all">
                <FilePlus size={13} />
              </span>
              <span>New Bill</span>
            </NavLink>

            {/* Admin Sensitive Details Master Switch */}
            {isAuthorizedAdmin && (
              <button
                type="button"
                onClick={toggleAdminReveal}
                className="hidden lg:inline-flex items-center gap-2 pl-2 pr-3.5 h-[38px] rounded-full text-xs font-semibold text-[#111827] bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-slate-300 transition shadow-[0_1px_2px_rgba(15,23,42,0.04)] group"
                title="Admin Master Toggle: Reveal or mask sensitive credentials across entire website"
              >
                <span className={`w-[26px] h-[26px] rounded-full border flex items-center justify-center shrink-0 shadow-2xs transition-all ${
                  adminRevealed
                    ? "bg-amber-50 text-amber-600 border-amber-200 group-hover:bg-amber-600 group-hover:text-white"
                    : "bg-purple-50 text-purple-600 border-purple-200 group-hover:bg-purple-600 group-hover:text-white"
                }`}>
                  {adminRevealed ? <Unlock size={12} /> : <Lock size={12} />}
                </span>
                <span>{adminRevealed ? "Vault Unmasked" : "Secure Masked"}</span>
              </button>
            )}

            {/* User Dropdown Chip */}
            <div className="relative">
              <button
                onClick={() => setUserDropdown(!userDropdown)}
                className="flex items-center gap-2 p-1 pl-1.5 pr-3 h-[38px] rounded-full border border-slate-200/90 hover:border-slate-300 bg-white hover:bg-slate-50 transition shadow-[0_1px_2px_rgba(15,23,42,0.04)] group"
              >
                <div className="w-[28px] h-[28px] rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] shadow-2xs">
                  {userInitials}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-semibold text-[#111827] leading-none truncate max-w-[120px]">
                    {displayName}
                  </p>
                </div>
                <ChevronDown size={13} className="text-slate-400 group-hover:text-slate-600" />
              </button>


              {userDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl p-2 shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user?.email || "owner@bilzet.com"}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        {displayRole}
                      </span>
                    </div>

                    <NavLink
                      to="/settings"
                      onClick={() => setUserDropdown(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-700 hover:bg-slate-50 font-medium transition"
                    >
                      <Settings size={14} className="text-slate-500" />
                      <span>Business Settings</span>
                    </NavLink>

                    <NavLink
                      to="/subscription"
                      onClick={() => setUserDropdown(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-700 hover:bg-slate-50 font-medium transition"
                    >
                      <CreditCard size={14} className="text-slate-500" />
                      <span>Subscription &amp; Plans</span>
                    </NavLink>

                    <NavLink
                      to="/audit-logs"
                      onClick={() => setUserDropdown(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-700 hover:bg-slate-50 font-medium transition"
                    >
                      <History size={14} className="text-slate-500" />
                      <span>Security Logs</span>
                    </NavLink>

                    {/* Admin section only accessible if user is authorized admin */}
                    {isAuthorizedAdmin && (
                      <NavLink
                        to="/admin"
                        onClick={() => setUserDropdown(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-purple-700 bg-purple-50/70 hover:bg-purple-100/70 font-semibold transition mt-1"
                      >
                        <Shield size={14} className="text-purple-600" />
                        <span>Admin Console &amp; Vault</span>
                      </NavLink>
                    )}

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      onClick={() => {
                        setUserDropdown(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-600 hover:bg-rose-50 font-semibold transition"
                    >
                      <LogOut size={14} />
                      <span>Log Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* ── Main Content Canvas with Independent Vertical Scroll ── */}
        <main key={storeRevision} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 bg-[#F7FAFF]">
          <div className="max-w-[1600px] w-full mx-auto pb-8">
            {children}
          </div>
        </main>

        {/* ── Fixed Clean Footer ── */}
        <footer className="h-11 shrink-0 border-t border-slate-200/80 bg-white/90 backdrop-blur-xs px-6 text-xs text-slate-500 flex items-center justify-between gap-3 z-10">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">BILZET Retail &amp; POS Systems</span>
            <span className="text-slate-300 hidden sm:inline">·</span>
            <span className="hidden sm:inline">© {new Date().getFullYear()} All rights reserved.</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-slate-400 hidden md:inline">
              Cloud Sync: <strong className="text-slate-600 font-semibold">Active &amp; Secure</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Encrypted SSL</span>
            </span>
            <span className="text-slate-400 font-mono">v2.4.0</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
