import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  Plus,
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
  Crown,
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
  Building2,
  Scale,
  CheckSquare,
  Flag,
  Paperclip,
  FileSpreadsheet,
  SlidersHorizontal,
  Activity,
  Gift,
  FolderCheck,
  Keyboard,
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
import NotificationBell from "../common/NotificationBell";
import KeyboardShortcutsModal from "../common/KeyboardShortcutsModal";

export const caMainNavItems = [
  { label: "CA Dashboard", path: "/ca-portal/dashboard", icon: LayoutGrid },
  { label: "Clients", path: "/ca-portal/clients", icon: Building2 },
  { label: "GST & Tax", path: "/ca-portal/gst", icon: Percent },
  { label: "Audit & Workpapers", path: "/ca-portal/pipeline", icon: Activity },
  { label: "Documents", path: "/ca-portal/documents", icon: FolderCheck },
];

export const caBottomNavItems = [
  { label: "Refer & Earn", path: "/ca-portal/referral", icon: Gift },
  { label: "Settings", path: "/ca-portal/settings", icon: Settings },
];

export const caNavSections = [
  {
    title: "",
    key: "ca_main",
    items: caMainNavItems,
  },
  {
    title: "",
    key: "ca_bottom",
    items: caBottomNavItems,
  },
];

const navSections = [
  {
    title: "Overview",
    key: "overview",
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
      { label: "Quotations", path: "/quotations", icon: FileSpreadsheet },
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
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
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

  // Subscription plan check: user effective plan tier
  const userPlan = useMemo(() => {
    if (user?.role === "SUPER_ADMIN" || user?.isSuperAdmin) return "PREMIUM";
    const subTier = user?.subscription?.planTier || user?.currentPlan;
    if (subTier) return String(subTier).toUpperCase();
    try {
      const sub = JSON.parse(localStorage.getItem("bilzet_subscription_data") || "{}");
      if (sub.planTier || sub.currentPlan) return String(sub.planTier || sub.currentPlan).toUpperCase();
    } catch (_) {}
    return "FREE";
  }, [user]);

  const isPremium = userPlan === "PREMIUM";
  const isProOrHigher = userPlan === "PRO" || userPlan === "PREMIUM";

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

  useEffect(() => {
    setMobileDrawer(false);
  }, [location.pathname]);

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
      } else if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
      } else if (
        e.key === "?" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)
      ) {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
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

  const isCA = user?.role === "CA" || location.pathname.startsWith("/ca-portal");

  const isCaItemActive = useCallback((path) => {
    const p = location.pathname;

    if (path === "/ca-portal/dashboard") {
      return p === "/ca-portal" || p === "/ca-portal/dashboard" || p === "/ca-portal/deadlines";
    }
    if (path === "/ca-portal/clients") {
      return p === "/ca-portal/clients" || p === "/ca-portal/queries";
    }
    if (path === "/ca-portal/gst") {
      return (
        p === "/ca-portal/gst" ||
        p === "/ca-portal/sales" ||
        p === "/ca-portal/invoices" ||
        p === "/ca-portal/purchases" ||
        p === "/ca-portal/reconciliation" ||
        p === "/ca-portal/inventory" ||
        p === "/ca-portal/payments" ||
        p === "/ca-portal/expenses" ||
        p === "/ca-portal/returns"
      );
    }
    if (path === "/ca-portal/pipeline") {
      return (
        p === "/ca-portal/pipeline" ||
        p === "/ca-portal/audit" ||
        p === "/ca-portal/tasks" ||
        p === "/ca-portal/discrepancies" ||
        p === "/ca-portal/exceptions" ||
        p === "/ca-portal/workpapers" ||
        p === "/ca-portal/reports" ||
        p === "/ca-portal/closing" ||
        p === "/ca-portal/activity" ||
        p === "/ca-portal/audit-trail"
      );
    }
    if (path === "/ca-portal/documents") {
      return p === "/ca-portal/documents";
    }
    if (path === "/ca-portal/referral") {
      return (
        p === "/ca-portal/referral" ||
        p === "/ca-portal/referrals" ||
        p === "/ca-portal/refer-earn" ||
        p === "/referral"
      );
    }
    if (path === "/ca-portal/settings") {
      return (
        p === "/ca-portal/settings" ||
        p === "/ca-portal/team" ||
        p === "/ca-portal/automation"
      );
    }
    return p === path;
  }, [location.pathname]);

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
      "/ca-portal": ["gst.view"],
      "/audit-logs": ["audit_logs.view"],
    };

    if (isCA) {
      return caNavSections;
    }

    const planRequiredMap = {
      "/ca-connect": "PREMIUM",
      "/online-orders": "PRO",
      "/sms-marketing": "PRO",
      "/gst": "PRO",
    };

    return navSections
      .map((sec) => {
        let items = sec.items.filter((item) => {
          // Check plan entitlements first
          const requiredPlan = planRequiredMap[item.path];
          if (requiredPlan && !isSuperAdmin) {
            if (requiredPlan === "PREMIUM" && !isPremium) return false;
            if (requiredPlan === "PRO" && !isProOrHigher) return false;
          }

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
  }, [user, isAuthorizedAdmin, isOwner, isSuperAdmin, hasPermission, isPremium, isProOrHigher]);

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
          sidebarOpen ? "w-[264px]" : "w-[72px]"
        }`}
        style={{
          backgroundColor: "#0A1628",
          borderRight: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Brand Header */}
        <div
          className={`flex items-center h-16 px-4 border-b border-white/[0.08] shrink-0 ${
            sidebarOpen ? "justify-between" : "justify-center"
          }`}
        >
          <Logo collapsed={!sidebarOpen} theme="dark" size="md" />
          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.08] transition duration-150 cursor-pointer"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.08] transition duration-150 cursor-pointer"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>

        {/* Quick Action Button: POS Billing / CA Audit Suite */}
        {sidebarOpen ? (
          <div className="px-3.5 pt-3 pb-2 shrink-0">
            {user?.role === "CA" || location.pathname.startsWith("/ca-portal") ? (
              <div className="space-y-1.5">
                <NavLink
                  to="/ca-portal/dashboard"
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg font-semibold text-xs text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs group"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-white shrink-0" />
                    <span>CA Audit Suite</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono tracking-tight text-white/90">
                    AUDIT
                  </span>
                </NavLink>
                <NavLink
                  to="/dashboard"
                  className="w-full flex items-center justify-center gap-1.5 py-1 px-2 text-[11px] font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition"
                >
                  <ArrowRightLeft size={12} className="text-cyan-300" />
                  <span>Exit to Shop Dashboard</span>
                </NavLink>
              </div>
            ) : (
              <NavLink
                to="/billing"
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg font-semibold text-xs text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs group"
              >
                <div className="flex items-center gap-2">
                  <Plus size={16} className="text-white shrink-0" />
                  <span>New Bill</span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono tracking-wide text-white/90">
                  F2
                </span>
              </NavLink>
            )}
          </div>
        ) : (
          <div className="px-2 pt-3 pb-2 shrink-0 flex flex-col items-center gap-1.5">
            {isCA ? (
              <>
                <NavLink
                  to="/ca-portal/dashboard"
                  title="CA Audit Suite"
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
                >
                  <ShieldCheck size={18} />
                </NavLink>
                <NavLink
                  to="/dashboard"
                  title="Exit to Shop Dashboard"
                  className="w-10 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <ArrowRightLeft size={14} className="text-cyan-300" />
                </NavLink>
              </>
            ) : (
              <NavLink
                to="/billing"
                title="New Bill (F2)"
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
              >
                <Plus size={18} />
              </NavLink>
            )}
          </div>
        )}

        {/* Navigation list */}
        {isCA ? (
          <div className="flex-1 flex flex-col justify-between overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
            {/* Main navigation (1. CA Dashboard, 2. Clients, 3. GST & Tax, 4. Audit & Workpapers, 5. Documents) */}
            <nav className="space-y-1">
              {caMainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = isCaItemActive(item.path);

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={!sidebarOpen ? item.label : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors relative group ${
                      isActive
                        ? "bg-blue-600 text-white font-semibold shadow-xs"
                        : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
                    } ${!sidebarOpen ? "justify-center px-0 py-2.5" : ""}`}
                  >
                    <Icon
                      size={16}
                      className={`shrink-0 transition-transform duration-150 group-hover:scale-105 ${
                        isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                      }`}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                    {sidebarOpen && <span className="truncate">{item.label}</span>}
                  </NavLink>
                );
              })}
            </nav>

            {/* Bottom navigation (6. Refer & Earn, 7. Settings) */}
            <div className="pt-3 border-t border-white/[0.08] mt-auto space-y-1 shrink-0">
              {caBottomNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = isCaItemActive(item.path);

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={!sidebarOpen ? item.label : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors relative group ${
                      isActive
                        ? "bg-blue-600 text-white font-semibold shadow-xs"
                        : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
                    } ${!sidebarOpen ? "justify-center px-0 py-2.5" : ""}`}
                  >
                    <Icon
                      size={16}
                      className={`shrink-0 transition-transform duration-150 group-hover:scale-105 ${
                        isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                      }`}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                    {sidebarOpen && <span className="truncate">{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ) : (
          <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
            {displayedNavSections.map((section, sIdx) => {
              const isSectionCollapsed = !!collapsedSections[section.key];

              return (
                <div key={section.key || section.title || sIdx} className="space-y-0.5">
                  {sidebarOpen ? (
                    <button
                      onClick={() => toggleSection(section.key)}
                      className="w-full flex items-center justify-between px-2.5 pt-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400/80 hover:text-slate-200 transition cursor-pointer"
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
                    sIdx > 0 && <div className="mx-2 my-2 border-t border-white/[0.08]" />
                  )}

                  {(!isSectionCollapsed || !sidebarOpen) && (
                    <div className="space-y-0.5">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isActive =
                          location.pathname === item.path ||
                          (item.path === "/ca-portal/dashboard" && location.pathname === "/ca-portal") ||
                          (item.path === "/ca-portal/sales" && (location.pathname === "/ca-portal/invoices" || location.pathname === "/ca-portal/sales")) ||
                          (item.path === "/ca-portal/reports" && (location.pathname === "/ca-portal/workpapers" || location.pathname === "/ca-portal/reports")) ||
                          (item.path === "/staff/attendance" && location.pathname === "/attendance") ||
                          (item.path !== "/" &&
                            !["/staff", "/staff/attendance", "/staff/payroll", "/ca-portal"].includes(item.path) &&
                            location.pathname.startsWith(`${item.path}/`));

                        return (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            title={!sidebarOpen ? item.label : undefined}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors relative group ${
                              isActive
                                ? "bg-blue-600 text-white font-semibold shadow-xs"
                                : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
                            } ${!sidebarOpen ? "justify-center px-0 py-2.5" : ""}`}
                          >
                            <Icon
                              size={16}
                              className={`shrink-0 transition-transform duration-150 group-hover:scale-105 ${
                                isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                              }`}
                              strokeWidth={isActive ? 2.2 : 1.8}
                            />
                            {sidebarOpen && <span className="truncate">{item.label}</span>}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        )}

        {/* Admin Console & Vault — Only Bottom Item for non-CA */}
        {isAuthorizedAdmin && !isCA && (
          <div className="p-3 border-t border-white/[0.08] bg-[#0A1628] shrink-0">
            {sidebarOpen ? (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive || location.pathname === "/app-admin"
                      ? "bg-blue-600 text-white font-semibold shadow-xs"
                      : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
                  }`
                }
              >
                <Shield size={16} className="shrink-0" />
                <span className="truncate">Admin Console & Vault</span>
              </NavLink>
            ) : (
              <div className="flex justify-center">
                <NavLink
                  to="/admin"
                  title="Admin Console & Vault"
                  className={({ isActive }) =>
                    `w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                      isActive || location.pathname === "/app-admin"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
                    }`
                  }
                >
                  <Shield size={18} />
                </NavLink>
              </div>
            )}
          </div>
        )}
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
            style={{ backgroundColor: "#0A1628" }}
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
              <Logo variant="full" theme="dark" size="md" />
              <button
                onClick={() => setMobileDrawer(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
                aria-label="Close Navigation"
              >
                <X size={18} />
              </button>
            </div>

            <div className="pt-3 pb-2 shrink-0">
              {isCA ? (
                <div className="space-y-1.5">
                  <div className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-semibold text-xs text-white bg-blue-600 shadow-xs">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-white shrink-0" />
                      <span>CA Audit Suite</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono tracking-tight text-white/90">
                      AUDIT
                    </span>
                  </div>
                  <NavLink
                    to="/dashboard"
                    onClick={() => setMobileDrawer(false)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 text-[11px] font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition"
                  >
                    <ArrowRightLeft size={12} className="text-cyan-300" />
                    <span>Exit to Shop Dashboard</span>
                  </NavLink>
                </div>
              ) : (
                <NavLink
                  to="/billing"
                  onClick={() => setMobileDrawer(false)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-semibold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition"
                >
                  <div className="flex items-center gap-2">
                    <Plus size={16} />
                    <span>New Bill</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono tracking-wide text-white/90">
                    F2
                  </span>
                </NavLink>
              )}
            </div>

            {/* Mobile Navigation List */}
            {isCA ? (
              <div className="flex-1 flex flex-col justify-between py-2">
                <nav className="space-y-1">
                  {caMainNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = isCaItemActive(item.path);

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileDrawer(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                          isActive
                            ? "bg-blue-600 text-white font-semibold shadow-xs"
                            : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
                        }`}
                      >
                        <Icon
                          size={16}
                          className={isActive ? "text-white" : "text-slate-400"}
                          strokeWidth={isActive ? 2.2 : 1.8}
                        />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </nav>

                <div className="pt-3 border-t border-white/[0.08] mt-auto space-y-1">
                  {caBottomNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = isCaItemActive(item.path);

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileDrawer(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                          isActive
                            ? "bg-blue-600 text-white font-semibold shadow-xs"
                            : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
                        }`}
                      >
                        <Icon
                          size={16}
                          className={isActive ? "text-white" : "text-slate-400"}
                          strokeWidth={isActive ? 2.2 : 1.8}
                        />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ) : (
              <nav className="flex-1 overflow-y-auto py-2 space-y-2.5">
                {displayedNavSections.map((section) => (
                  <div key={section.title} className="space-y-0.5">
                    <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400/80">
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
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
                            isActive
                              ? "bg-blue-600 text-white font-semibold shadow-xs"
                              : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
                          }`}
                        >
                          <Icon
                            size={16}
                            className={isActive ? "text-white" : "text-slate-400"}
                            strokeWidth={isActive ? 2.2 : 1.8}
                          />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                ))}
              </nav>
            )}

            {/* User Profile Summary & Actions at bottom of Mobile Drawer */}
            <div className="pt-3 border-t border-white/[0.08] shrink-0 space-y-2">
              <div className="flex items-center gap-3 px-2 py-1.5 rounded-xl bg-white/[0.04]">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {userInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{displayName}</p>
                  <p className="text-[10px] text-slate-400 truncate">{displayRole}</p>
                </div>
              </div>

              {isAuthorizedAdmin && !isCA && (
                <NavLink
                  to="/admin"
                  onClick={() => setMobileDrawer(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                      isActive || location.pathname === "/app-admin"
                        ? "bg-blue-600 text-white font-semibold shadow-xs"
                        : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
                    }`
                  }
                >
                  <Shield size={16} />
                  <span>Admin Console &amp; Vault</span>
                </NavLink>
              )}

              <button
                type="button"
                onClick={() => {
                  setMobileDrawer(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer min-h-[44px]"
              >
                <LogOut size={16} />
                <span>Log Out</span>
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
        <header className="h-16 shrink-0 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 z-20">
          {/* Left: Mobile trigger & Global Search with Ctrl+K */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1 max-w-md">
            {/* Simple Hamburger Menu on the left */}
            <button
              type="button"
              onClick={() => setMobileDrawer(true)}
              className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition shrink-0 cursor-pointer"
              aria-label="Open Navigation"
            >
              <Menu size={18} />
            </button>

            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden md:flex p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition shrink-0 cursor-pointer"
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              aria-label="Toggle Sidebar"
            >
              <Menu size={18} />
            </button>

            {/* Compact Customer Search Bar with Ctrl+K */}
            <div className="relative w-full">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-400 w-full focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/10 transition">
                <Search size={14} className="text-slate-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchQuery.trim()) setSearchOpen(true);
                  }}
                  placeholder="Search customers, products, bills..."
                  className="bg-transparent outline-none w-full text-slate-800 text-xs placeholder:text-slate-400 font-normal"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchOpen(false);
                    }}
                    className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-white border border-slate-200 rounded shrink-0 select-none">
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

          {/* Right: Store, Online Status, Notifications, Primary New Bill, User Profile */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Store Switcher: Current store name with small store icon & dropdown */}
            <StoreSwitcher variant="header" />

            {/* Subtle Divider */}
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            {/* Online Status: Small green dot with subtle text, no large bordered badge */}
            {connStatus === "online" ? (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 select-none px-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[11px] font-medium text-slate-600">Online</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={checkConnection}
                className="hidden sm:flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 px-1 cursor-pointer"
                title="Click to retry server connection"
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                <span className="text-[11px] font-medium">Offline (Retry)</span>
              </button>
            )}

            {/* Notifications & Persistent Invitations Center */}
            <NotificationBell />

            {/* Keyboard Shortcuts Guide Trigger */}
            <button
              type="button"
              onClick={() => setShowShortcutsModal(true)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer relative"
              title="Keyboard Shortcuts (Ctrl + / or ?)"
              aria-label="Keyboard Shortcuts"
            >
              <Keyboard size={18} />
            </button>


            {/* Subscription Plan Badge and Action in Header */}
            {isPremium ? (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                <Crown size={12} className="text-amber-600" />
                <span>Premium</span>
              </span>
            ) : isProOrHigher ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  <Sparkles size={11} className="text-blue-600" />
                  <span>Pro</span>
                </span>
                <NavLink
                  to="/plans?tier=PREMIUM&redirect=/dashboard"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-[11px] font-bold transition shadow-xs hover:shadow active:scale-98 shrink-0"
                  title="Upgrade to Premium"
                >
                  <Crown size={12} className="text-amber-100" />
                  <span className="hidden sm:inline">Upgrade</span>
                </NavLink>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  <span>Free</span>
                </span>
                <NavLink
                  to="/plans?tier=PRO&redirect=/dashboard"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-bold transition shadow-xs hover:shadow active:scale-98 shrink-0"
                  title="Upgrade to Pro"
                >
                  <Sparkles size={13} className="text-blue-100" />
                  <span className="hidden sm:inline">Upgrade to Pro</span>
                  <span className="sm:hidden">Upgrade</span>
                </NavLink>
              </div>
            )}

            {/* Primary Action: Solid blue "New Bill" button with plus icon */}
            <NavLink
              to="/billing"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition shadow-xs hover:shadow active:scale-98 shrink-0"
            >
              <Plus size={15} className="shrink-0" />
              <span>New Bill</span>
            </NavLink>

            {/* Subtle Divider */}
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            {/* Profile Section: Avatar, name, and dropdown together in one compact profile section */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdown(!userDropdown)}
                className="flex items-center gap-2 p-1 sm:px-2 py-1 rounded-lg hover:bg-slate-100 transition cursor-pointer text-left group"
                title="Account & Profile"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  {userInitials}
                </div>
                <div className="hidden lg:flex flex-col text-left leading-tight">
                  <span className="text-xs font-semibold text-slate-800 truncate max-w-[120px]">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-slate-400 capitalize">
                    {displayRole}
                  </span>
                </div>
                <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600 transition shrink-0" />
              </button>

              {userDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl p-2 shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user?.email || "owner@bilzet.com"}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        {displayRole}
                      </span>
                    </div>

                    {isCA && !user?.isOwner ? (
                      <NavLink
                        to="/ca-portal"
                        onClick={() => setUserDropdown(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-700 hover:bg-slate-50 font-medium transition"
                      >
                        <Shield size={14} className="text-blue-600" />
                        <span>CA Audit Portal</span>
                      </NavLink>
                    ) : (
                      <>
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
                      </>
                    )}

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

                    {/* Preserved Sensitive Data Mask Toggle */}
                    {isAuthorizedAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          toggleAdminReveal();
                          setUserDropdown(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-700 hover:bg-slate-50 font-medium transition"
                      >
                        <span className="flex items-center gap-2.5">
                          {adminRevealed ? (
                            <Unlock size={14} className="text-amber-600" />
                          ) : (
                            <Lock size={14} className="text-purple-600" />
                          )}
                          <span>{adminRevealed ? "Vault Unmasked" : "Secure Masked"}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Toggle</span>
                      </button>
                    )}

                    {/* Preserved Theme Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        toggleTheme();
                        setUserDropdown(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-700 hover:bg-slate-50 font-medium transition"
                    >
                      <span className="flex items-center gap-2.5">
                        {isDark ? <Sun size={14} className="text-amber-500" /> : <Moon size={14} className="text-slate-500" />}
                        <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
                      </span>
                      <span className="text-[10px] text-slate-400">Theme</span>
                    </button>

                    {/* Preserved Quick Punch */}
                    {user && (
                      <button
                        type="button"
                        onClick={() => {
                          handleHeaderQuickPunch();
                          setUserDropdown(false);
                        }}
                        disabled={headerPunching || Boolean(headerAttendance?.checkIn && headerAttendance?.checkOut)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-700 hover:bg-slate-50 font-medium transition"
                      >
                        <span className="flex items-center gap-2.5">
                          <span className={`w-2 h-2 rounded-full ${
                            headerAttendance?.checkIn && !headerAttendance?.checkOut
                              ? "bg-emerald-500 animate-pulse"
                              : headerAttendance?.checkIn && headerAttendance?.checkOut
                              ? "bg-slate-400"
                              : "bg-blue-500"
                          }`} />
                          <span>
                            {headerPunching
                              ? "Updating Shift..."
                              : headerAttendance?.checkIn && !headerAttendance?.checkOut
                              ? "End Shift (Punch Out)"
                              : headerAttendance?.checkIn && headerAttendance?.checkOut
                              ? "Shift Completed"
                              : "Start Shift (Punch In)"}
                          </span>
                        </span>
                      </button>
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
        <main key={storeRevision} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 bg-[#F8FAFC]">
          <div className="max-w-[1600px] w-full mx-auto pb-8">
            {children}
          </div>
        </main>

        {/* ── Fixed Clean Footer ── */}
        <footer className="h-10 shrink-0 bg-white border-t border-slate-200 border-l-4 border-l-emerald-600 px-4 sm:px-6 flex items-center z-10">
          <div className="flex items-center gap-2.5 sm:gap-3 text-xs">
            <span className="font-bold text-emerald-800 tracking-tight">Garden Greens</span>
            <span className="h-3.5 w-px bg-slate-300" aria-hidden="true" />
            <span className="text-slate-500 font-normal">© 2026 All rights reserved.</span>
          </div>
        </footer>
      </div>

      {/* Global Keyboard Navigation & Shortcuts Cheatsheet */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </div>
  );
}
