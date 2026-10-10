import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  FilePlus,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Receipt,
  UserCheck,
  Shield,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Timer,
  ChevronRight,
  Key,
  Layers,
  Lock,
} from "lucide-react";
import { useAuth } from "../store/auth";
import { usePermissions } from "../hooks/usePermissions";
import { staffApi, salesApi } from "../api";
import TeamManagement from "../components/team/TeamManagement";

export default function StaffDashboard({ defaultTab }) {
  const { user } = useAuth();
  const { hasPermission, isOwner, isSuperAdmin } = usePermissions();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine permissions
  const canManageTeam = isOwner || isSuperAdmin || hasPermission("team.view") || hasPermission("team.manage");

  // Determine initial tab: users (for admin) or clock (for regular staff)
  const queryTab = searchParams.get("tab");
  const initialTab = defaultTab || queryTab || (canManageTeam ? "users" : "clock");
  const [activeTab, setActiveTabState] = useState(initialTab);

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    setSearchParams({ tab });
  };

  // Attendance states
  const [attendanceToday, setAttendanceToday] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [punching, setPunching] = useState(false);

  // Personal sales states
  const [mySales, setMySales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);

  // Feedback toast
  const [feedback, setFeedback] = useState({ message: "", type: "success" });

  const showNotification = (message, type = "success") => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: "", type: "success" }), 4500);
  };

  // Live timer for active shift
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadAttendance = async () => {
    setLoadingAttendance(true);
    try {
      const [todayRes, historyRes] = await Promise.all([
        staffApi.getMyAttendanceToday().catch(() => null),
        staffApi.getMyAttendanceHistory({ limit: 7 }).catch(() => ({ attendances: [] })),
      ]);
      setAttendanceToday(todayRes?.attendance || todayRes || null);
      setAttendanceHistory(historyRes?.attendances || []);
    } catch (err) {
      console.warn("Failed to load attendance state:", err);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const loadMySales = async () => {
    if (!hasPermission("billing.view") && !hasPermission("billing.create") && !isOwner) {
      return;
    }
    setSalesLoading(true);
    try {
      const res = await salesApi.mySales({ limit: 10 }).catch(() => ({ sales: [] }));
      setMySales(res?.sales || []);
    } catch (err) {
      console.warn("Failed to load personal sales:", err);
    } finally {
      setSalesLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
    loadMySales();
  }, []);

  const isCheckedIn = Boolean(attendanceToday?.checkIn && !attendanceToday?.checkOut);
  const isShiftCompleted = Boolean(attendanceToday?.checkIn && attendanceToday?.checkOut);

  // Elapsed time if currently checked in
  const elapsedMinutes = useMemo(() => {
    if (!isCheckedIn || !attendanceToday?.checkIn) return 0;
    const start = new Date(attendanceToday.checkIn).getTime();
    const diffMs = currentTime.getTime() - start;
    return Math.max(0, Math.floor(diffMs / 60000));
  }, [isCheckedIn, attendanceToday, currentTime]);

  const handleCheckIn = async () => {
    setPunching(true);
    try {
      const res = await staffApi.checkInSelf();
      setAttendanceToday(res?.attendance || res);
      showNotification("Checked in successfully! Shift started.", "success");
      loadAttendance();
    } catch (err) {
      showNotification(err?.response?.data?.message || "Check-in failed.", "error");
    } finally {
      setPunching(false);
    }
  };

  const handleCheckOut = async () => {
    setPunching(true);
    try {
      const res = await staffApi.checkOutSelf();
      setAttendanceToday(res?.attendance || res);
      const hours = res?.attendance?.workingHours || res?.attendance?.hours || "0";
      showNotification(`Checked out successfully! Total shift time: ${hours} hours.`, "success");
      loadAttendance();
    } catch (err) {
      showNotification(err?.response?.data?.message || "Check-out failed.", "error");
    } finally {
      setPunching(false);
    }
  };

  // Sales aggregates
  const todaySalesCount = mySales.length;
  const todaySalesTotal = mySales.reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {feedback.message && (
        <div
          className={`flex items-center gap-3 p-3.5 rounded-xl border text-sm font-medium ${
            feedback.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {feedback.type === "error" ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ── TOP HERO HEADER ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="p-2 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-400">
                <UserCheck className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Staff Workspace
              </h1>
              <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                {user?.role || "STAFF"}
              </span>
            </div>
            <p className="text-sm text-slate-300 max-w-xl">
              Welcome back, <strong>{user?.name || "Team Member"}</strong>.{" "}
              {canManageTeam
                ? "Manage store sub-users, configure role-based access, and supervise operational shifts."
                : "Track your daily shift attendance, view personal sales invoices, and check assigned privileges."}
            </p>
          </div>

          {/* Digital Clock & Shift Status Badge */}
          <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-2xl p-4 min-w-[240px] text-right space-y-1.5 shadow-inner">
            <div className="text-xs text-slate-400">Current Time</div>
            <div className="text-xl font-bold font-mono text-white tracking-wider">
              {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
            <div className="flex items-center justify-end gap-2 text-xs">
              <span className="text-slate-400">Shift Status:</span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                  isCheckedIn
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                    : isShiftCompleted
                    ? "bg-blue-500/20 text-blue-300 border border-blue-400/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isCheckedIn ? "bg-emerald-400 animate-pulse" : isShiftCompleted ? "bg-blue-400" : "bg-amber-400"
                  }`}
                />
                {isCheckedIn ? "On Duty" : isShiftCompleted ? "Shift Done" : "Not Started"}
              </span>
            </div>
          </div>
        </div>

        {/* ── WORKSPACE NAVIGATION TABS ── */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-slate-800/80 overflow-x-auto">
          {canManageTeam && (
            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === "users"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Team &amp; Sub-Users (RBAC)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab("clock")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "clock"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Daily Shift Clock</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sales")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "sales"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Personal Sales ({todaySalesCount})</span>
          </button>

          {!canManageTeam && (
            <button
              type="button"
              onClick={() => setActiveTab("my_permissions")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === "my_permissions"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>My Role &amp; Access</span>
            </button>
          )}
        </div>
      </div>

      {/* ── TAB 1: TEAM & SUB-USERS (ADMIN RBAC WORKSPACE) ── */}
      {canManageTeam && activeTab === "users" && (
        <div className="space-y-6">
          <TeamManagement />
        </div>
      )}

      {/* ── TAB 2: DAILY SHIFT PUNCH CLOCK (NO SHORTCUTS UI) ── */}
      {activeTab === "clock" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-6">
            {/* Self Attendance Clock */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                      Daily Shift Punch Clock
                    </h3>
                    <p className="text-xs text-slate-400">
                      Self check-in and check-out for today
                    </p>
                  </div>
                </div>

                <button
                  onClick={loadAttendance}
                  title="Refresh attendance status"
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingAttendance ? "animate-spin" : ""}`} />
                </button>
              </div>

              {/* Shift Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <span className="text-[11px] font-medium text-slate-400 block">Check-in</span>
                  <span className="text-sm font-bold text-slate-800 font-mono">
                    {attendanceToday?.checkIn
                      ? new Date(attendanceToday.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <span className="text-[11px] font-medium text-slate-400 block">Check-out</span>
                  <span className="text-sm font-bold text-slate-800 font-mono">
                    {attendanceToday?.checkOut
                      ? new Date(attendanceToday.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <span className="text-[11px] font-medium text-slate-400 block">Duration</span>
                  <span className="text-sm font-bold text-indigo-700 font-mono">
                    {isCheckedIn
                      ? `${Math.floor(elapsedMinutes / 60)}h ${elapsedMinutes % 60}m`
                      : attendanceToday?.workingHours
                      ? `${attendanceToday.workingHours} hrs`
                      : "0 hrs"}
                  </span>
                </div>
              </div>

              {/* Punch In / Out Actions */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                {!isCheckedIn ? (
                  <button
                    type="button"
                    onClick={handleCheckIn}
                    disabled={punching || isShiftCompleted}
                    className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/20 disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{punching ? "Punching..." : isShiftCompleted ? "Shift Already Completed Today" : "Punch In / Start Shift"}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCheckOut}
                    disabled={punching}
                    className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white shadow-md shadow-rose-600/20 disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Timer className="w-4 h-4" />
                    <span>{punching ? "Punching Out..." : "Punch Out / End Shift"}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Attendance History */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
              <h4 className="font-bold text-slate-800 text-sm">Recent Shifts (Last 7 Days)</h4>
              {attendanceHistory.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No shift logs found for this week.</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                  {attendanceHistory.map((att, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/50">
                      <div>
                        <span className="font-bold text-slate-800 font-mono">
                          {new Date(att.date || att.createdAt).toLocaleDateString()}
                        </span>
                        <div className="text-[11px] text-slate-400">
                          In: {att.checkIn ? new Date(att.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"} | Out: {att.checkOut ? new Date(att.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {att.workingHours ? `${att.workingHours} hrs` : "PRESENT"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Quick Performance Summary */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Shift Performance</h3>
                  <p className="text-xs text-slate-400">Bills processed during your shift</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">My Invoices</span>
                  <div className="text-xl font-bold text-slate-800">{todaySalesCount}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Revenue</span>
                  <div className="text-xl font-bold text-emerald-600">₹{todaySalesTotal.toLocaleString()}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab("sales")}
                className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <span>View Full Sales Register</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: PERSONAL SALES PERFORMANCE REGISTER ── */}
      {activeTab === "sales" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  Personal Sales Performance Register
                </h3>
                <p className="text-xs text-slate-400">
                  Detailed checkout receipts and sales logged under your staff ID
                </p>
              </div>
            </div>

            <button
              onClick={loadMySales}
              title="Refresh personal sales"
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition border border-slate-200"
            >
              <RefreshCw className={`w-4 h-4 ${salesLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Sales Aggregate Counters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Bills Processed</span>
              <div className="text-2xl font-bold text-slate-900">{todaySalesCount} invoices</div>
              <div className="text-[11px] text-slate-500">Processed through POS terminal</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Sales Value</span>
              <div className="text-2xl font-bold text-emerald-600">₹{todaySalesTotal.toLocaleString()}</div>
              <div className="text-[11px] text-slate-500">Generated revenue for store</div>
            </div>
          </div>

          {/* Invoices Table */}
          {salesLoading ? (
            <p className="text-center text-xs text-slate-400 py-10">Loading sales records…</p>
          ) : mySales.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border border-slate-200/80">
              <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No personal sales recorded</p>
              <p className="text-xs text-slate-400 mt-0.5">Bills completed at POS checkout will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Grand Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mySales.map((s) => (
                    <tr key={s.id || s._id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{s.invoiceNumber}</td>
                      <td className="py-3 px-4 text-slate-500">{new Date(s.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-slate-700">{s.customer?.name || "Walk-in Customer"}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.paymentStatus === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {s.paymentStatus || "PAID"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                        ₹{Number(s.grandTotal).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: MY ROLE & ACCESS (FOR NON-ADMIN STAFF) ── */}
      {!canManageTeam && activeTab === "my_permissions" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                Your Assigned Role &amp; Permissions
              </h3>
              <p className="text-xs text-slate-400">
                Current role: <strong>{user?.role || "STAFF"}</strong>
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Your business administrator has granted your user account controlled access to store modules based on role-based security. Contact your store manager or administrator if you require additional authorizations.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
              <span className="font-bold text-slate-800">Billing &amp; Invoicing</span>
              <p className="text-[11px] text-slate-500">Create, view, and print sales invoices</p>
              <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mt-1">
                ✓ Allowed
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
              <span className="font-bold text-slate-800">Product &amp; Price Lookup</span>
              <p className="text-[11px] text-slate-500">Scan barcodes and view item prices</p>
              <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mt-1">
                ✓ Allowed
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
              <span className="font-bold text-slate-800">Customer Directory</span>
              <p className="text-[11px] text-slate-500">Add walk-in clients during billing checkout</p>
              <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mt-1">
                ✓ Allowed
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
