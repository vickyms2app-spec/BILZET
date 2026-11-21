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
  Unlock,
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
import NewBillButton from "../common/NewBillButton";

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
    title: "OVERVIEW",
    key: "overview",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutGrid },
    ],
  },
  {
    title: "SALES",
    key: "sales",
    items: [
      { label: "Reports & Analytics", path: "/reports", icon: BarChart3 },
      { label: "Customers", path: "/customers", icon: Users },
      { label: "Quotations", path: "/quotations", icon: ClipboardList },
      { label: "Invoices", path: "/invoices", icon: FileText, highlight: true },
      { label: "Payment Collection", path: "/sales/payments-in", icon: DollarSign },
      { label: "Credit Notes & Returns", path: "/sales/returns", icon: RotateCcw },
    ],
  },
  {
    title: "PURCHASE",
    key: "purchases",
    items: [
      { label: "Purchase Invoices", path: "/purchases", icon: ShoppingBag },
      { label: "Purchase Orders", path: "/purchases/orders", icon: ClipboardList },
      { label: "Suppliers", path: "/suppliers", icon: Truck },
      { label: "Debit Notes", path: "/purchases/debit-notes", icon: Receipt },
    ],
  },
  {
    title: "INVENTORY",
    key: "inventory",
    items: [
      { label: "Products & Services", path: "/products", icon: Package },
      { label: "Stock Management", path: "/inventory", icon: Boxes },
      { label: "Warehouse / Godown", path: "/warehouses", icon: Warehouse },
      { label: "Stock Movements", path: "/stock-transfers", icon: ArrowRightLeft },
    ],
  },
  {
    title: "FINANCE",
    key: "finance",
    items: [
      { label: "Expenses", path: "/expenses", icon: Wallet },
    ],
  },
  {
    title: "GST & TAX",
    key: "gst_tax",
    items: [
      { label: "GST Control Room", path: "/gst", icon: Percent },
    ],
  },
  {
    title: "CA CONNECT",
    key: "ca_connect",
    items: [
      { label: "CA Collaboration", path: "/ca-connect", icon: Briefcase },
    ],
  },
  {
    title: "BUSINESS MANAGEMENT",
    key: "management",
    items: [
      { label: "Staff Management", path: "/staff", icon: UserCheck },
      { label: "Attendance", path: "/staff/attendance", icon: CalendarCheck2 },
      { label: "Payroll", path: "/staff/payroll", icon: DollarSign },
      { label: "Online Orders", path: "/online-orders", icon: OnlineIcon },
      { label: "SMS Marketing", path: "/sms-marketing", icon: MessageSquare },
    ],
  },
  {
    title: "SETTINGS",
    key: "settings",
    items: [
      { label: "Business Settings", path: "/settings", icon: Settings },
      { label: "Team & Permissions", path: "/team", icon: Shield },
      { label: "Subscription & Plans", path: "/subscription", icon: CreditCard },
      { label: "Audit & Security Logs", path: "/audit-logs", icon: History },
    ],
  },
];

export default function Layout({ children }) {
  // Sidebar is closed/collapsed by default across all screens, initial loads, and refreshes
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [mobileDrawer, setMobileDrawer] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  // Ensure no stale expanded state from older sessions overrides the closed-by-default requirement
  useEffect(() => {
    try {
      localStorage.removeItem("bilzet_sidebar_state");
    } catch (_) {}
  }, []);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [userDropdown, setUserDropdown] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const quickCreateRef = useRef(null);
  const helpDropdownRef = useRef(null);
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
    user?.role === "ADMIN" || !user?.role
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

  // BILZET uses a consistent light enterprise theme across every workspace.
  // Clear legacy dark-mode state so older sessions cannot reintroduce dark surfaces.
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("bilzet_theme", "light");
  }, []);

  useEffect(() => {
    setMobileDrawer(false);
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open to prevent background scrolling
  useEffect(() => {
    if (mobileDrawer) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileDrawer]);

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
      if (e.key === "Escape") {
        setMobileDrawer(false);
        setSidebarOpen(false);
        setQuickCreateOpen(false);
        setHelpOpen(false);
        setUserDropdown(false);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
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
    const handleOutsideClick = (e) => {
      if (quickCreateRef.current && !quickCreateRef.current.contains(e.target)) {
        setQuickCreateOpen(false);
      }
      if (helpDropdownRef.current && !helpDropdownRef.current.contains(e.target)) {
        setHelpOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
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
      "/dashboard": ["reports.view", "dashboard.view"],
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
          // Strict RBAC: Unmapped or unauthorized items are hidden from non-owners
          if (!requiredPerms) return false;
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
    <div className="h-screen w-screen overflow-hidden flex bg-[#E3E3E5] text-[#111318] antialiased font-sans selection:bg-[#5BF07B]/30 selection:text-[#111318]">
      {/* ══════════════════════════════════════════════════
          DESKTOP & TABLET SIDEBAR
      ══════════════════════════════════════════════════ */}
      <aside
        className={`h-full shrink-0 hidden md:flex flex-col transition-all duration-300 ease-in-out z-30 select-none ${
          sidebarOpen ? "w-[264px]" : "w-[72px]"
        }`}
        style={{
          background: "#EDEDEF",
          borderRight: "1px solid #D8D9DE",
        }}
      >
        {/* Brand Header */}
        <div
          className={`flex items-center h-16 px-4 border-b border-[#D8D9DE] shrink-0 ${
            sidebarOpen ? "justify-between" : "justify-center"
          }`}
        >
          <Logo collapsed={!sidebarOpen} theme="light" size="md" />
          {sidebarOpen ? (
            <button
              type="button"
              onClick={toggleSidebar}
              className="text-[#7C7F8A] hover:text-[#111318] p-1.5 rounded-full hover:bg-white transition duration-150 cursor-pointer"
              title="Close Sidebar"
              aria-label="Close Sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleSidebar}
              className="text-[#7C7F8A] hover:text-[#111318] p-1.5 rounded-full hover:bg-white transition duration-150 cursor-pointer"
              title="Open Sidebar"
              aria-label="Open Sidebar"
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
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-full font-bold text-xs text-white bg-[#12151C] hover:bg-black border border-black/10 transition-all shadow-xs group"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-[#5BF07B] shrink-0" />
                    <span>CA Audit Suite</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-mono tracking-tight text-[#5BF07B]">
                    AUDIT
                  </span>
                </NavLink>
                <NavLink
                  to="/dashboard"
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 text-[11px] font-semibold text-[#7C7F8A] hover:text-[#111318] bg-white/60 hover:bg-white rounded-full transition border border-[#D8D9DE]"
                >
                  <ArrowRightLeft size={12} className="text-[#7C7F8A]" />
                  <span>Exit to Shop Dashboard</span>
                </NavLink>
              </div>
            ) : (
              <NavLink
                to="/billing"
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-full font-bold text-xs text-white bg-[#12151C] hover:bg-black border border-black/10 transition-all shadow-xs group"
              >
                <div className="flex items-center gap-2">
                  <Plus size={16} className="text-[#5BF07B] shrink-0" />
                  <span>New Bill</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-mono tracking-wide text-[#5BF07B]">
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
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white bg-[#12151C] hover:bg-black border border-black/10 transition-colors shadow-xs"
                >
                  <ShieldCheck size={18} className="text-[#5BF07B]" />
                </NavLink>
                <NavLink
                  to="/dashboard"
                  title="Exit to Shop Dashboard"
                  className="w-10 h-8 rounded-full flex items-center justify-center text-[#7C7F8A] hover:text-[#111318] bg-white hover:bg-[#F6F6F8] border border-[#D8D9DE] transition-colors"
                >
                  <ArrowRightLeft size={14} className="text-[#7C7F8A]" />
                </NavLink>
              </>
            ) : (
              <NavLink
                to="/billing"
                title="New Bill (F2)"
                className="w-10 h-10 rounded-full flex items-center justify-center text-white bg-[#12151C] hover:bg-black border border-black/10 transition-colors shadow-xs"
              >
                <Plus size={18} className="text-[#5BF07B]" />
              </NavLink>
            )}
          </div>
        )}

        {/* Navigation list */}
        {isCA ? (
          <div className="flex-1 flex flex-col justify-between overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-thumb-[#C3C5CE] hover:scrollbar-thumb-[#A9ABB5]">
            {/* Main navigation */}
            <nav className="space-y-1">
              {caMainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = isCaItemActive(item.path);

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={!sidebarOpen ? item.label : undefined}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-full text-xs font-semibold transition-all duration-150 relative group ${
                      isActive
                        ? "bg-white text-[#111318] shadow-xs font-bold"
                        : "text-[#7C7F8A] hover:text-[#111318] hover:bg-white/60"
                    } ${!sidebarOpen ? "justify-center px-0 py-2.5" : ""}`}
                  >
                    <Icon
                      size={15}
                      className={`shrink-0 transition-colors duration-150 ${
                        isActive ? "text-[#111318]" : "text-[#7C7F8A] group-hover:text-[#111318]"
                      }`}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                    {sidebarOpen && <span className="truncate">{item.label}</span>}
                    {sidebarOpen && isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5BF07B] ml-auto shrink-0" />
                    )}
                    {!sidebarOpen && (
                      <div className="hidden group-hover:flex absolute left-full ml-2 z-50 px-2.5 py-1 bg-[#111318] text-white text-[11px] font-medium rounded-lg whitespace-nowrap shadow-xl pointer-events-none items-center animate-in fade-in zoom-in-95 duration-150">
                        {item.label}
                      </div>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {/* Bottom navigation */}
            <div className="pt-2.5 border-t border-[#D8D9DE] mt-auto space-y-0.5 shrink-0">
              {caBottomNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = isCaItemActive(item.path);

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={!sidebarOpen ? item.label : undefined}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-full text-xs font-semibold transition-all duration-150 relative group ${
                      isActive
                        ? "bg-white text-[#111318] shadow-xs font-bold"
                        : "text-[#7C7F8A] hover:text-[#111318] hover:bg-white/60"
                    } ${!sidebarOpen ? "justify-center px-0 py-2.5" : ""}`}
                  >
                    <Icon
                      size={15}
                      className={`shrink-0 transition-colors duration-150 ${
                        isActive ? "text-[#111318]" : "text-[#7C7F8A] group-hover:text-[#111318]"
                      }`}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                    {sidebarOpen && <span className="truncate">{item.label}</span>}
                    {sidebarOpen && isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5BF07B] ml-auto shrink-0" />
                    )}
                    {!sidebarOpen && (
                      <div className="hidden group-hover:flex absolute left-full ml-2 z-50 px-2.5 py-1 bg-[#111318] text-white text-[11px] font-medium rounded-lg whitespace-nowrap shadow-xl pointer-events-none items-center animate-in fade-in zoom-in-95 duration-150">
                        {item.label}
                      </div>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ) : (
          <nav className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1.5 scrollbar-thin scrollbar-thumb-[#C3C5CE] hover:scrollbar-thumb-[#A9ABB5]">
            {displayedNavSections.map((section, sIdx) => {
              const isSectionCollapsed = !!collapsedSections[section.key];

              return (
                <div key={section.key || section.title || sIdx} className="space-y-0.5">
                  {sidebarOpen ? (
                    <button
                      onClick={() => toggleSection(section.key)}
                      className="w-full flex items-center justify-between px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#7C7F8A] hover:text-[#111318] transition cursor-pointer"
                    >
                      <span className="truncate">{section.title}</span>
                      <ChevronDown
                        size={12}
                        className={`text-[#7C7F8A] transition-transform duration-200 ${
                          isSectionCollapsed ? "-rotate-90" : ""
                        }`}
                      />
                    </button>
                  ) : (
                    sIdx > 0 && <div className="mx-3 my-1.5 border-t border-[#D8D9DE]" />
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
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-full text-xs font-semibold transition-all duration-150 relative group ${
                              isActive
                                ? "bg-white text-[#111318] shadow-xs font-bold"
                                : "text-[#7C7F8A] hover:text-[#111318] hover:bg-white/60"
                            } ${!sidebarOpen ? "justify-center px-0 py-2.5" : ""}`}
                          >
                            <Icon
                              size={15}
                              className={`shrink-0 transition-colors duration-150 ${
                                isActive ? "text-[#111318]" : "text-[#7C7F8A] group-hover:text-[#111318]"
                              }`}
                              strokeWidth={isActive ? 2.2 : 1.8}
                            />
                            {sidebarOpen && <span className="truncate">{item.label}</span>}
                            {sidebarOpen && isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#5BF07B] ml-auto shrink-0" />
                            )}
                            {!sidebarOpen && (
                              <div className="hidden group-hover:flex absolute left-full ml-2 z-50 px-2.5 py-1 bg-[#111318] text-white text-[11px] font-medium rounded-lg whitespace-nowrap shadow-xl pointer-events-none items-center animate-in fade-in zoom-in-95 duration-150">
                                {item.label}
                              </div>
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
        )}

        {/* Admin Console & Vault — Only Bottom Item for non-CA */}
        {isAuthorizedAdmin && !isCA && (
          <div className="p-2.5 border-t border-[#D8D9DE] shrink-0">
            {sidebarOpen ? (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-full text-xs font-semibold transition-all duration-150 ${
                    isActive || location.pathname === "/app-admin"
                      ? "bg-white text-[#111318] shadow-xs font-bold"
                      : "text-[#7C7F8A] hover:text-[#111318] hover:bg-white/60"
                  }`
                }
              >
                <Shield
                  size={16}
                  className={`shrink-0 transition-colors duration-150 ${
                    location.pathname === "/admin" || location.pathname === "/app-admin"
                      ? "text-[#111318]"
                      : "text-[#7C7F8A]"
                  }`}
                />
                <span className="truncate">Admin Console &amp; Vault</span>
              </NavLink>
            ) : (
              <div className="flex justify-center relative group">
                <NavLink
                  to="/admin"
                  title="Admin Console &amp; Vault"
                  className={({ isActive }) =>
                    `w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150 ${
                      isActive || location.pathname === "/app-admin"
                        ? "bg-white text-[#111318] shadow-xs"
                        : "text-[#7C7F8A] hover:text-[#111318] hover:bg-white/60"
                    }`
                  }
                >
                  <Shield size={18} />
                </NavLink>
                <div className="hidden group-hover:flex absolute left-full ml-2 z-50 px-2.5 py-1 bg-[#12151C] text-white text-[11px] font-medium rounded-full whitespace-nowrap shadow-xl pointer-events-none items-center animate-in fade-in zoom-in-95 duration-150">
                  Admin Console &amp; Vault
                </div>
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
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setMobileDrawer(false)}
          />
          <div
            className="relative w-72 max-w-[85vw] h-full flex flex-col z-10 p-4 overflow-y-auto animate-in slide-in-from-left duration-250 shadow-2xl bg-[#F6F6F8] border-r border-[#E7E8EC]"
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E7E8EC]">
              <Logo variant="full" theme="light" size="md" />
              <button
                onClick={() => setMobileDrawer(false)}
                className="p-1.5 text-[#7C7F8A] hover:text-[#111318] rounded-xl hover:bg-[#EDEDEF] transition cursor-pointer"
                aria-label="Close Navigation"
              >
                <X size={18} />
              </button>
            </div>

            <div className="pt-3 pb-2 shrink-0">
              {isCA ? (
                <div className="space-y-1.5">
                  <div className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl font-bold text-xs text-[#111318] bg-[#FAFAFB] border border-[#E7E8EC] shadow-xs">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-[#5BF07B] shrink-0" />
                      <span>CA Audit Suite</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-full bg-[#12151C] text-[10px] font-mono tracking-tight text-[#5BF07B]">
                      AUDIT
                    </span>
                  </div>
                  <NavLink
                    to="/dashboard"
                    onClick={() => setMobileDrawer(false)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold text-[#7C7F8A] hover:text-[#111318] bg-white hover:bg-[#EDEDEF] rounded-xl transition border border-[#E7E8EC]"
                  >
                    <ArrowRightLeft size={12} className="text-[#7C7F8A]" />
                    <span>Exit to Shop Dashboard</span>
                  </NavLink>
                </div>
              ) : (
                <NewBillButton
                  fullWidth
                  showShortcut
                  shortcutText="F2"
                  onClick={() => setMobileDrawer(false)}
                />
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
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                          isActive
                            ? "bg-[#12151C] text-white shadow-xs font-bold"
                            : "text-[#7C7F8A] hover:text-[#111318] hover:bg-white"
                        }`}
                      >
                        <Icon
                          size={15}
                          className={isActive ? "text-[#5BF07B]" : "text-[#7C7F8A]"}
                          strokeWidth={isActive ? 2.2 : 1.8}
                        />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </nav>

                <div className="pt-2.5 border-t border-[#E7E8EC] mt-auto space-y-0.5">
                  {caBottomNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = isCaItemActive(item.path);

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileDrawer(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                          isActive
                            ? "bg-[#12151C] text-white shadow-xs font-bold"
                            : "text-[#7C7F8A] hover:text-[#111318] hover:bg-white"
                        }`}
                      >
                        <Icon
                          size={15}
                          className={isActive ? "text-[#5BF07B]" : "text-[#7C7F8A]"}
                          strokeWidth={isActive ? 2.2 : 1.8}
                        />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ) : (
              <nav className="flex-1 overflow-y-auto py-2 space-y-1.5 scrollbar-thin">
                {displayedNavSections.map((section) => (
                  <div key={section.title} className="space-y-0.5">
                    <div className="px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#7C7F8A]">
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
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                            isActive
                              ? "bg-[#12151C] text-white shadow-xs font-bold"
                              : "text-[#7C7F8A] hover:text-[#111318] hover:bg-white"
                          }`}
                        >
                          <Icon
                            size={15}
                            className={isActive ? "text-[#5BF07B]" : "text-[#7C7F8A]"}
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
            <div className="pt-2.5 border-t border-[#E7E8EC] shrink-0 space-y-2">
              <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-2xl bg-white border border-[#E7E8EC]">
                <div className="w-8 h-8 rounded-full bg-[#12151C] text-[#5BF07B] font-bold text-xs flex items-center justify-center shrink-0">
                  {userInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#111318] truncate">{displayName}</p>
                  <p className="text-[10px] text-[#7C7F8A] truncate">{displayRole}</p>
                </div>
              </div>

              {isAuthorizedAdmin && !isCA && (
                <NavLink
                  to="/admin"
                  onClick={() => setMobileDrawer(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                      isActive || location.pathname === "/app-admin"
                        ? "bg-[#12151C] text-white shadow-xs font-bold"
                        : "text-[#7C7F8A] hover:text-[#111318] hover:bg-white"
                    }`
                  }
                >
                  <Shield size={15} className={location.pathname === "/admin" || location.pathname === "/app-admin" ? "text-[#5BF07B]" : "text-[#7C7F8A]"} />
                  <span>Admin Console &amp; Vault</span>
                </NavLink>
              )}

              <button
                type="button"
                onClick={() => {
                  setMobileDrawer(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#E5484D] hover:bg-[#FBD3D3]/40 transition cursor-pointer min-h-[40px]"
              >
                <LogOut size={15} />
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
        <header className="h-16 shrink-0 bg-[#E3E3E5] border-b border-[#D8D9DE] px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 z-20 max-w-full">
          {/* Left: Mobile trigger & Global Search with Ctrl+K */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink-0 md:flex-1 md:max-w-md">
            {/* Mobile Navigation Drawer Toggle */}
            <button
              type="button"
              onClick={() => setMobileDrawer(true)}
              className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-full text-[#111318] bg-white hover:bg-[#F6F6F8] border border-[#E7E8EC] transition-all duration-200 cursor-pointer shadow-xs active:scale-95 group shrink-0 min-w-[36px] min-h-[36px]"
              title="Open Navigation"
              aria-label="Open Navigation"
            >
              <Menu size={18} className="transition-transform duration-200 group-hover:scale-110" />
            </button>

            {/* Mobile BILZET Logo Brand Mark */}
            <div className="md:hidden flex items-center shrink-0">
              <Logo variant="compact" theme="light" size="sm" />
            </div>

            {/* Desktop Navigation Toggle Button */}
            <button
              type="button"
              onClick={toggleSidebar}
              className="hidden md:inline-flex items-center justify-center w-9 h-9 rounded-full text-[#111318] bg-white hover:bg-[#F6F6F8] border border-[#E7E8EC] transition-all duration-200 cursor-pointer shadow-xs active:scale-95 group shrink-0"
              title={sidebarOpen ? "Close Sidebar" : "Open Sidebar"}
              aria-label={sidebarOpen ? "Close Sidebar" : "Open Sidebar"}
            >
              <Menu
                size={18}
                className="transition-transform duration-200 group-hover:scale-110"
              />
            </button>

            {/* Compact Customer Search Bar with Ctrl+K (Desktop) */}
            <div className="hidden md:block relative w-full">
              <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white border border-[#E7E8EC] rounded-full text-xs text-[#7C7F8A] w-full focus-within:border-[#111318] focus-within:ring-1 focus-within:ring-[#111318] shadow-xs transition">
                <Search size={14} className="text-[#7C7F8A] shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchQuery.trim()) setSearchOpen(true);
                  }}
                  placeholder="Search customers, products, bills..."
                  className="bg-transparent outline-none w-full text-[#111318] text-xs placeholder:text-[#A9ABB5] font-normal"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchOpen(false);
                    }}
                    className="text-[#7C7F8A] hover:text-[#111318] p-0.5 cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-[#7C7F8A] bg-[#F6F6F8] border border-[#E7E8EC] rounded-full shrink-0 select-none">
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
                  <div className="absolute left-0 right-0 mt-2 bg-[#F6F6F8] rounded-[24px] p-3 shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-[#E7E8EC] z-40 max-h-[80vh] overflow-y-auto animate-in fade-in zoom-in-95">
                    {searchLoading ? (
                      <div className="py-6 text-center text-xs text-[#7C7F8A] flex items-center justify-center gap-2">
                        <RefreshCw size={14} className="animate-spin text-[#111318]" />
                        <span>Searching records…</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* CUSTOMERS */}
                        {searchResults.customers.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-[#7C7F8A] uppercase tracking-wider px-2 mb-1.5">
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
                                  className="flex items-center justify-between p-2 rounded-xl hover:bg-white cursor-pointer transition text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-[#12151C] text-[#5BF07B] flex items-center justify-center font-bold text-[11px]">
                                      {c.name?.[0] || "C"}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-[#111318]">{c.name}</p>
                                      <p className="text-[10px] text-[#7C7F8A]">{c.phone || "No phone"}</p>
                                    </div>
                                  </div>
                                  <span className="text-[11px] font-mono font-bold text-[#111318]">
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
                            <p className="text-[10px] font-bold text-[#7C7F8A] uppercase tracking-wider px-2 mb-1.5">
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
                                  className="flex items-center justify-between p-2 rounded-xl hover:bg-white cursor-pointer transition text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-[#DFFFE6] text-[#0E2A16] flex items-center justify-center">
                                      <Package size={14} />
                                    </div>
                                    <div>
                                      <p className="font-semibold text-[#111318]">{p.name}</p>
                                      <p className="text-[10px] text-[#7C7F8A]">Stock: {p.stock ?? 0} {p.unit || ""}</p>
                                    </div>
                                  </div>
                                  <span className="text-[11px] font-mono font-bold text-[#111318]">
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
                            <p className="text-[10px] font-bold text-[#7C7F8A] uppercase tracking-wider px-2 mb-1.5">
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
                                  className="flex items-center justify-between p-2 rounded-xl hover:bg-white cursor-pointer transition text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-[#12151C] text-white flex items-center justify-center font-mono text-[9px] font-bold">
                                      INV
                                    </div>
                                    <div>
                                      <p className="font-semibold text-[#111318]">{inv.invoiceNumber}</p>
                                      <p className="text-[10px] text-[#7C7F8A]">{inv.customer?.name || "Walk-in"}</p>
                                    </div>
                                  </div>
                                  <span className="text-[11px] font-mono font-bold text-[#111318]">
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
                            <div className="py-6 text-center text-xs text-[#A9ABB5] italic">
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

          {/* Right: Notifications, Profile (Mobile) + Store, Help, Shortcuts, Upgrade (Desktop) */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Store Switcher (Desktop only in header; accessible on mobile inside Mobile Drawer) */}
            <div className="hidden md:block">
              <StoreSwitcher variant="header" />
            </div>

            {/* Subtle Divider */}
            <div className="h-5 w-px bg-[#D8D9DE] hidden md:block" />

            {/* Online Status: Small neon mint dot with subtle text (Desktop only) */}
            {connStatus === "online" ? (
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-[#7C7F8A] select-none px-1">
                <span className="w-2 h-2 rounded-full bg-[#5BF07B] shrink-0" />
                <span className="text-[11px] font-medium text-[#111318]">Online</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={checkConnection}
                className="hidden lg:flex items-center gap-1.5 text-xs text-[#E5484D] hover:underline px-1 cursor-pointer"
                title="Click to retry server connection"
              >
                <span className="w-2 h-2 rounded-full bg-[#E5484D] animate-ping shrink-0" />
                <span className="text-[11px] font-medium">Offline (Retry)</span>
              </button>
            )}

            {/* Notifications & Persistent Invitations Center */}
            <NotificationBell />

            {/* Help & Support Popover (Desktop only; on mobile inside profile menu & drawer) */}
            <div className="relative hidden md:block" ref={helpDropdownRef}>
              <button
                type="button"
                onClick={() => setHelpOpen(!helpOpen)}
                className="w-9 h-9 rounded-full bg-white hover:bg-[#F6F6F8] border border-[#E7E8EC] text-[#111318] flex items-center justify-center transition cursor-pointer shadow-xs active:scale-95"
                title="Help & Support"
                aria-label="Help & Support"
              >
                <LifeBuoy size={16} />
              </button>

              {helpOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-[#F6F6F8] rounded-[24px] p-3 shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-[#E7E8EC] z-50 animate-in fade-in zoom-in-95 text-xs">
                  <div className="px-2 py-1 border-b border-[#E7E8EC] mb-2">
                    <p className="font-bold text-[#111318]">Help & GST Support</p>
                    <p className="text-[10px] text-[#7C7F8A]">BILZET Business Assistance</p>
                  </div>
                  <div className="space-y-1">
                    <a
                      href="https://wa.me/919876543210"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[#111318] hover:bg-white transition font-medium"
                    >
                      <MessageSquare size={14} className="text-[#5BF07B]" />
                      <div>
                        <p className="leading-tight font-semibold">WhatsApp GST Helpline</p>
                        <p className="text-[10px] text-[#7C7F8A]">+91 98765 43210</p>
                      </div>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setHelpOpen(false);
                        setShowShortcutsModal(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[#111318] hover:bg-white transition font-medium text-left cursor-pointer"
                    >
                      <Keyboard size={14} className="text-[#111318]" />
                      <div>
                        <p className="leading-tight font-semibold">Keyboard Shortcuts Guide</p>
                        <p className="text-[10px] text-[#7C7F8A]">Press Ctrl + / or ?</p>
                      </div>
                    </button>
                    <NavLink
                      to="/support"
                      onClick={() => setHelpOpen(false)}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[#111318] hover:bg-white transition font-medium"
                    >
                      <LifeBuoy size={14} className="text-[#7C7F8A]" />
                      <div>
                        <p className="leading-tight font-semibold">Knowledge Base & Guides</p>
                        <p className="text-[10px] text-[#7C7F8A]">GST E-Way & E-Invoicing FAQs</p>
                      </div>
                    </NavLink>
                  </div>
                </div>
              )}
            </div>

            {/* Keyboard Shortcuts Guide Trigger (Desktop only) */}
            <button
              type="button"
              onClick={() => setShowShortcutsModal(true)}
              className="hidden md:inline-flex w-9 h-9 rounded-full bg-white hover:bg-[#F6F6F8] border border-[#E7E8EC] text-[#111318] items-center justify-center transition cursor-pointer shadow-xs active:scale-95"
              title="Keyboard Shortcuts (Ctrl + / or ?)"
              aria-label="Keyboard Shortcuts"
            >
              <Keyboard size={16} />
            </button>

            {/* Subscription Plan Badge (Desktop only; on mobile inside profile menu) */}
            <div className="hidden md:flex items-center">
              {isPremium ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-[#12151C] text-[#5BF07B] border border-[#12151C] shrink-0">
                  <Crown size={12} className="text-[#5BF07B]" />
                  <span>Premium</span>
                </span>
              ) : isProOrHigher ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-[#12151C] text-[#5BF07B] border border-[#12151C]">
                    <Sparkles size={11} className="text-[#5BF07B]" />
                    <span>Pro</span>
                  </span>
                  <NavLink
                    to="/plans?tier=PREMIUM&redirect=/dashboard"
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#5BF07B] hover:brightness-105 text-[#0E2A16] text-[11px] font-bold transition shadow-xs shrink-0"
                    title="Upgrade to Premium"
                  >
                    <Crown size={12} className="text-[#0E2A16]" />
                    <span>Upgrade</span>
                  </NavLink>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white text-[#7C7F8A] border border-[#E7E8EC]">
                    <span>Free</span>
                  </span>
                  <NavLink
                    to="/plans?tier=PRO&redirect=/dashboard"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#12151C] hover:bg-black text-white text-xs font-semibold transition shadow-xs shrink-0"
                    title="Upgrade to Pro"
                  >
                    <Sparkles size={13} className="text-[#5BF07B]" />
                    <span>Upgrade to Pro</span>
                  </NavLink>
                </div>
              )}
            </div>

            {/* Subtle Divider (Desktop) */}
            <div className="h-5 w-px bg-[#D8D9DE] hidden sm:block" />

            {/* Profile Section: Avatar, name, and dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdown(!userDropdown)}
                className="flex items-center gap-1.5 p-1 sm:px-2 py-1 rounded-full hover:bg-white transition cursor-pointer text-left group border border-transparent hover:border-[#E7E8EC] min-h-[36px] min-w-[36px]"
                title="Account & Profile"
                aria-label="Account & Profile"
              >
                <div className="w-8 h-8 rounded-full bg-[#12151C] text-[#5BF07B] flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  {userInitials}
                </div>
                <div className="hidden lg:flex flex-col text-left leading-tight">
                  <span className="text-xs font-semibold text-[#111318] truncate max-w-[120px]">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-[#7C7F8A] capitalize">
                    {displayRole}
                  </span>
                </div>
                <ChevronDown size={14} className="text-[#7C7F8A] group-hover:text-[#111318] transition shrink-0 hidden sm:block" />
              </button>

              {userDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] bg-[#F6F6F8] rounded-[24px] p-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-[#E7E8EC] z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-2 border-b border-[#E7E8EC] mb-1">
                      <p className="text-xs font-bold text-[#111318] truncate">{displayName}</p>
                      <p className="text-[11px] text-[#7C7F8A] truncate">{user?.email || "owner@bilzet.com"}</p>
                      <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#12151C] text-[#5BF07B]">
                        {displayRole}
                      </span>
                    </div>

                    {/* Secondary Action: Mobile Upgrade Banner if not on Premium */}
                    {!isPremium && (
                      <div className="p-2.5 my-1.5 rounded-2xl bg-[#12151C] text-white flex items-center justify-between gap-2 shadow-xs md:hidden">
                        <div className="flex items-center gap-2 min-w-0">
                          <Crown size={15} className="text-[#5BF07B] shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">Upgrade to Pro</p>
                            <p className="text-[10px] text-[#A9ABB5]">Unlimited bills & GST</p>
                          </div>
                        </div>
                        <NavLink
                          to="/plans?tier=PRO&redirect=/dashboard"
                          onClick={() => setUserDropdown(false)}
                          className="px-2.5 py-1 rounded-full bg-[#5BF07B] hover:brightness-105 text-[#0E2A16] font-bold text-[10px] shrink-0"
                        >
                          Upgrade
                        </NavLink>
                      </div>
                    )}

                    {/* Mobile Quick Store Switcher Trigger */}
                    <div className="px-1 py-1 md:hidden">
                      <StoreSwitcher variant="sidebar" />
                    </div>

                    <div className="my-1 border-t border-[#E7E8EC] md:hidden" />

                    {isCA && !user?.isOwner ? (
                      <NavLink
                        to="/ca-portal"
                        onClick={() => setUserDropdown(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#7C7F8A] hover:text-[#111318] hover:bg-white font-medium transition"
                      >
                        <Shield size={14} className="text-[#111318]" />
                        <span>CA Audit Portal</span>
                      </NavLink>
                    ) : (
                      <>
                        <NavLink
                          to="/settings"
                          onClick={() => setUserDropdown(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#7C7F8A] hover:text-[#111318] hover:bg-white font-medium transition"
                        >
                          <Settings size={14} className="text-[#7C7F8A]" />
                          <span>Business Settings</span>
                        </NavLink>

                        <NavLink
                          to="/subscription"
                          onClick={() => setUserDropdown(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#7C7F8A] hover:text-[#111318] hover:bg-white font-medium transition"
                        >
                          <CreditCard size={14} className="text-[#7C7F8A]" />
                          <span>Subscription &amp; Plans</span>
                        </NavLink>
                      </>
                    )}

                    <NavLink
                      to="/audit-logs"
                      onClick={() => setUserDropdown(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#7C7F8A] hover:text-[#111318] hover:bg-white font-medium transition"
                    >
                      <History size={14} className="text-[#7C7F8A]" />
                      <span>Security Logs</span>
                    </NavLink>

                    {/* Admin section only accessible if user is authorized admin */}
                    {isAuthorizedAdmin && (
                      <NavLink
                        to="/admin"
                        onClick={() => setUserDropdown(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#111318] bg-white hover:bg-[#E7E8EC] font-semibold transition mt-1 border border-[#E7E8EC]"
                      >
                        <Shield size={14} className="text-[#111318]" />
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
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-[#7C7F8A] hover:text-[#111318] hover:bg-white font-medium transition"
                      >
                        <span className="flex items-center gap-2.5">
                          {adminRevealed ? (
                            <Unlock size={14} className="text-[#5BF07B]" />
                          ) : (
                            <Lock size={14} className="text-[#7C7F8A]" />
                          )}
                          <span>{adminRevealed ? "Vault Unmasked" : "Secure Masked"}</span>
                        </span>
                        <span className="text-[10px] text-[#A9ABB5] font-mono">Toggle</span>
                      </button>
                    )}

                    {/* Preserved Quick Punch */}
                    {user && (
                      <button
                        type="button"
                        onClick={() => {
                          handleHeaderQuickPunch();
                          setUserDropdown(false);
                        }}
                        disabled={headerPunching || Boolean(headerAttendance?.checkIn && headerAttendance?.checkOut)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-[#7C7F8A] hover:text-[#111318] hover:bg-white font-medium transition"
                      >
                        <span className="flex items-center gap-2.5">
                          <span className={`w-2 h-2 rounded-full ${
                            headerAttendance?.checkIn && !headerAttendance?.checkOut
                              ? "bg-[#5BF07B] animate-pulse"
                              : headerAttendance?.checkIn && headerAttendance?.checkOut
                              ? "bg-slate-400"
                              : "bg-[#111318]"
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

                    <div className="border-t border-[#E7E8EC] my-1" />

                    <button
                      onClick={() => {
                        setUserDropdown(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#E5484D] hover:bg-[#FBD3D3]/40 font-semibold transition"
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
        <main key={storeRevision} className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 lg:p-8 bg-[#E3E3E5] min-w-0">
          <div className="max-w-[1600px] w-full mx-auto pb-8 min-w-0">
            {children}
          </div>
        </main>

        {/* ── Fixed Clean Footer ── */}
        <footer className="h-10 shrink-0 bg-[#EDEDEF] border-t border-[#D8D9DE] px-4 sm:px-6 flex items-center z-10">
          <div className="flex items-center gap-2.5 sm:gap-3 text-xs">
            <span className="font-bold text-[#111318] tracking-tight">{shopInfo?.shopName || "BILZET"}</span>
            <span className="h-3.5 w-px bg-[#D8D9DE]" aria-hidden="true" />
            <span className="text-[#7C7F8A] font-normal">© 2026 BILZET ERP. All rights reserved.</span>
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
