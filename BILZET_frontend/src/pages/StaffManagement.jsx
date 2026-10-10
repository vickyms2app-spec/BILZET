import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  UserCheck,
  Plus,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Phone,
  Mail,
  Briefcase,
  X,
  RefreshCw,
  Award,
  Lock,
  Eye,
  EyeOff,
  Filter,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  XCircle,
  FileSpreadsheet,
  FileText,
  Settings as SettingsIcon,
  SlidersHorizontal,
  Search,
  Check,
  Building,
  Building2,
  Save,
  Trash2,
  Edit2,
  CalendarCheck2,
} from "lucide-react";
import { staffApi, settingsApi } from "../api";
import { apiError } from "../api/http";
import { useAuth } from "../store/auth";
import { useSecurityStore } from "../store/securityStore";
import { usePermissions } from "../hooks/usePermissions";
import { isAdminUser, isAdminEmail, maskSalary, maskCurrency } from "../utils/security";
import SearchBar from "../components/common/SearchBar";
import Button, {
  CompactIconButton,
  IconCircleAction,
  IconCircleDropdown,
} from "../components/common/Button";

// Default Attendance Policy Settings
const DEFAULT_ATTENDANCE_SETTINGS = {
  officeStartTime: "09:00",
  officeClosingTime: "18:00",
  gracePeriod: 15, // minutes
  lateThreshold: "09:15",
  halfDayThreshold: 4.0, // hours
  minWorkingHours: 8.0,
  weeklyHolidays: ["Sunday"],
  overtimeRate: 1.5, // 1.5x hourly rate
  lateDeductionRule: "3_TO_HALF_DAY", // 3 late = 0.5 day salary
};

export default function StaffManagement({ defaultTab = "directory" }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine initial tab based on route
  const getInitialTab = () => {
    if (location.pathname.includes("attendance")) return "attendance";
    if (location.pathname.includes("payroll")) return "payroll";
    return defaultTab;
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  // Sync tab when route changes
  useEffect(() => {
    if (location.pathname.includes("attendance")) {
      setActiveTab("attendance");
    } else if (location.pathname.includes("payroll")) {
      setActiveTab("payroll");
    }
  }, [location.pathname]);

  const [staffList, setStaffList] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const { user } = useAuth();
  const { adminRevealed } = useSecurityStore();
  const { hasPermission } = usePermissions();
  const isAuthorizedAdmin = isAdminUser(user) || isAdminEmail(user?.email);
  const canDeleteStaff = isAuthorizedAdmin || hasPermission("staff.delete");
  const canEditStaff = isAuthorizedAdmin || hasPermission("staff.edit");
  const canCreateStaff = isAuthorizedAdmin || hasPermission("staff.create");
  const canViewSalaries = isAuthorizedAdmin || adminRevealed;
  const [showSalaries, setShowSalaries] = useState(false);
  const revealSalaries = canViewSalaries && (showSalaries || adminRevealed);

  // Active Store Display
  const [activeStoreName, setActiveStoreName] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("bilzet_active_store") || "null");
      return stored?.name || stored?.shopName || "Default Store";
    } catch (_) {
      return "Default Store";
    }
  });

  // Attendance Sub-views: "dashboard" | "calendar" | "report"
  const [attendanceView, setAttendanceView] = useState("dashboard");

  // Selected date for Daily Attendance (defaults to YYYY-MM-DD local)
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  // Filter states
  const [filterDepartment, setFilterDepartment] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [staffStatusFilter, setStaffStatusFilter] = useState("ALL");

  // Calendar View state
  const [calendarMode, setCalendarMode] = useState("monthly"); // "daily" | "weekly" | "monthly"
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Monthly Report state
  const [reportMonth, setReportMonth] = useState(() => new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(() => new Date().getFullYear());
  const [reportStaffFilter, setReportStaffFilter] = useState("ALL");
  const [reportDeptFilter, setReportDeptFilter] = useState("ALL");

  // Attendance Settings state
  const [attendanceSettings, setAttendanceSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("bilzet_attendance_settings");
      return saved ? JSON.parse(saved) : DEFAULT_ATTENDANCE_SETTINGS;
    } catch (_) {
      return DEFAULT_ATTENDANCE_SETTINGS;
    }
  });

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [historyStaff, setHistoryStaff] = useState(null); // Staff member currently viewed in history drawer
  const [editingAttendance, setEditingAttendance] = useState(null); // Record being edited in correction modal
  const [payslipModalData, setPayslipModalData] = useState(null);

  // Delete Confirmation state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Edit Staff Profile state
  const [editingStaff, setEditingStaff] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    role: "Staff",
    department: "Operations",
    phone: "",
    email: "",
    salary: "",
    status: "ACTIVE",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Details Dossier state
  const [detailsStaff, setDetailsStaff] = useState(null);

  // Daily attendance draft edits: map staffId -> { status, checkIn, checkOut, hours, notes }
  const [dailyDrafts, setDailyDrafts] = useState({});

  // Forms
  const [staffForm, setStaffForm] = useState({
    name: "",
    role: "CASHIER",
    department: "Billing",
    phone: "",
    email: "",
    salary: "",
    joiningDate: new Date().toISOString().split("T")[0],
  });

  const [payrollForm, setPayrollForm] = useState({
    month: new Date().toLocaleString("default", { month: "long" }),
    year: new Date().getFullYear(),
  });

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const notify = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 4000);
  };

  // Load all staff, attendance, and payroll data
  const loadData = async () => {
    setLoading(true);
    try {
      const [sRes, aRes, pRes] = await Promise.all([
        staffApi.list(),
        staffApi.attendance(),
        staffApi.payroll(),
      ]);

      const list = sRes?.staff || [];
      const atts = aRes?.attendances || [];
      const pays = pRes?.payrolls || [];

      setStaffList(list);
      setAttendances(atts);
      setPayrolls(pays);

      // Initialize daily drafts for currently selected date
      initDailyDrafts(list, atts, selectedDate);
    } catch (err) {
      console.error("Failed to load staff data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleSync = () => {
      loadData();
      try {
        const stored = JSON.parse(localStorage.getItem("bilzet_active_store") || "null");
        if (stored?.name || stored?.shopName) {
          setActiveStoreName(stored.name || stored.shopName);
        }
      } catch (_) {}
    };

    window.addEventListener("bilzet:store-changed", handleSync);
    return () => {
      window.removeEventListener("bilzet:store-changed", handleSync);
    };
  }, []);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await staffApi.remove(deleteTarget.id);
      notify("success", res?.message || `Employee ${deleteTarget.name} removed successfully.`);
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      notify("error", apiError(err) || "Failed to remove employee");
    } finally {
      setDeleting(false);
    }
  };

  const openEditModal = (staff) => {
    setEditingStaff(staff);
    setEditForm({
      name: staff.name || "",
      role: staff.role || "Staff",
      department: staff.department || "Operations",
      phone: staff.phone || "",
      email: staff.email || "",
      salary: staff.salary || 0,
      status: staff.status || "ACTIVE",
      joiningDate: staff.joiningDate ? new Date(staff.joiningDate).toISOString().split("T")[0] : "",
    });
  };

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    if (!editingStaff) return;
    setSavingEdit(true);
    try {
      await staffApi.update(editingStaff.id, {
        ...editForm,
        salary: Number(editForm.salary) || 0,
      });
      notify("success", `Employee profile for ${editForm.name} updated successfully.`);
      setEditingStaff(null);
      loadData();
    } catch (err) {
      notify("error", apiError(err) || "Failed to update employee");
    } finally {
      setSavingEdit(false);
    }
  };

  // Sync daily drafts when date or attendance list changes
  const initDailyDrafts = (staff = staffList, attList = attendances, targetDate = selectedDate) => {
    const drafts = {};
    staff.forEach((s) => {
      const existing = attList.find(
        (a) =>
          a.staffId === s.id &&
          new Date(a.date).toISOString().split("T")[0] === targetDate
      );

      if (existing) {
        // Parse notes if check-in / check-out was stored
        let checkIn = "09:00";
        let checkOut = "18:00";
        let remarks = existing.notes || "";

        if (existing.notes && existing.notes.includes("IN:")) {
          const matchIn = existing.notes.match(/IN:\s*([0-9:]+\s*[APM]*)/i);
          if (matchIn) checkIn = matchIn[1].trim();
        }
        if (existing.notes && existing.notes.includes("OUT:")) {
          const matchOut = existing.notes.match(/OUT:\s*([0-9:]+\s*[APM]*)/i);
          if (matchOut) checkOut = matchOut[1].trim();
        }

        drafts[s.id] = {
          id: existing.id,
          status: existing.status || "PRESENT",
          checkIn: checkIn,
          checkOut: checkOut,
          hours: existing.hours || 8.0,
          remarks: remarks.replace(/IN:[^|]*\|?\s*/i, "").replace(/OUT:[^|]*\|?\s*/i, "").trim(),
          isSaved: true,
        };
      } else {
        drafts[s.id] = {
          id: null,
          status: "PRESENT",
          checkIn: attendanceSettings.officeStartTime || "09:00",
          checkOut: attendanceSettings.officeClosingTime || "18:00",
          hours: 8.0,
          remarks: "",
          isSaved: false,
        };
      }
    });
    setDailyDrafts(drafts);
  };

  useEffect(() => {
    if (staffList.length > 0) {
      initDailyDrafts(staffList, attendances, selectedDate);
    }
  }, [selectedDate, attendances]);

  // Handle Create Staff
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await staffApi.create({
        ...staffForm,
        salary: Number(staffForm.salary) || 0,
      });
      notify("success", "Staff member registered successfully!");
      setShowAddModal(false);
      setStaffForm({
        name: "",
        role: "CASHIER",
        department: "Billing",
        phone: "",
        email: "",
        salary: "",
        joiningDate: new Date().toISOString().split("T")[0],
      });
      loadData();
    } catch (err) {
      notify("error", err.response?.data?.error || err.message || "Failed to add staff");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Mark / Update Single Staff Attendance
  const handleQuickStatusChange = (staffId, newStatus) => {
    setDailyDrafts((prev) => {
      const cur = prev[staffId] || {};
      let hours = 8.0;
      if (newStatus === "HALF_DAY") hours = 4.0;
      if (newStatus === "ABSENT" || newStatus === "LEAVE") hours = 0.0;
      return {
        ...prev,
        [staffId]: {
          ...cur,
          status: newStatus,
          hours: hours,
        },
      };
    });
  };

  // Handle Field Edit in Daily Draft
  const handleDraftFieldChange = (staffId, field, value) => {
    setDailyDrafts((prev) => {
      const cur = prev[staffId] || {};
      return {
        ...prev,
        [staffId]: {
          ...cur,
          [field]: value,
        },
      };
    });
  };

  // Save All Daily Attendance Records for selectedDate
  const handleSaveAllDailyAttendance = async () => {
    setSubmitting(true);
    try {
      const promises = Object.entries(dailyDrafts).map(([staffId, record]) => {
        const fullNotes = `IN: ${record.checkIn || "09:00"} | OUT: ${record.checkOut || "18:00"} ${
          record.remarks ? "| " + record.remarks : ""
        }`.trim();

        return staffApi.markAttendance({
          staffId,
          date: selectedDate,
          status: record.status || "PRESENT",
          hours: Number(record.hours) || 8.0,
          notes: fullNotes,
        });
      });

      await Promise.all(promises);
      notify("success", `Daily attendance for ${selectedDate} saved successfully!`);
      loadData();
    } catch (err) {
      notify("error", err.response?.data?.error || err.message || "Failed to save daily attendance");
    } finally {
      setSubmitting(false);
    }
  };

  // Save Edited Attendance Record from Modal
  const handleSaveEditedRecord = async (e) => {
    e.preventDefault();
    if (!editingAttendance) return;
    setSubmitting(true);
    try {
      const fullNotes = `IN: ${editingAttendance.checkIn || "09:00"} | OUT: ${
        editingAttendance.checkOut || "18:00"
      } ${editingAttendance.remarks ? "| " + editingAttendance.remarks : ""}`.trim();

      if (editingAttendance.id) {
        await staffApi.updateAttendance(editingAttendance.id, {
          status: editingAttendance.status,
          hours: Number(editingAttendance.hours) || 8.0,
          notes: fullNotes,
          date: editingAttendance.date,
        });
      } else {
        await staffApi.markAttendance({
          staffId: editingAttendance.staffId,
          date: editingAttendance.date,
          status: editingAttendance.status,
          hours: Number(editingAttendance.hours) || 8.0,
          notes: fullNotes,
        });
      }

      notify("success", "Attendance record corrected and updated!");
      setEditingAttendance(null);
      loadData();
    } catch (err) {
      notify("error", err.response?.data?.error || err.message || "Failed to update record");
    } finally {
      setSubmitting(false);
    }
  };

  // Save Attendance Settings
  const handleSaveAttendanceSettings = (newSettings) => {
    setAttendanceSettings(newSettings);
    localStorage.setItem("bilzet_attendance_settings", JSON.stringify(newSettings));
    notify("success", "Attendance policy configuration saved!");
    setShowSettingsModal(false);
  };

  // Calculate Dashboard KPI Summary Cards for selectedDate
  const dashboardKpis = useMemo(() => {
    const totalStaff = staffList.length;
    let present = 0;
    let absent = 0;
    let late = 0;
    let leave = 0;
    let halfDay = 0;

    staffList.forEach((s) => {
      const draft = dailyDrafts[s.id];
      const status = draft ? draft.status : "ABSENT";
      if (status === "PRESENT") present++;
      else if (status === "ABSENT") absent++;
      else if (status === "LATE") late++;
      else if (status === "LEAVE") leave++;
      else if (status === "HALF_DAY") halfDay++;
    });

    const activeAttending = present + late + halfDay * 0.5;
    const percentage = totalStaff > 0 ? Math.round((activeAttending / totalStaff) * 100) : 0;

    return {
      totalStaff,
      present,
      absent,
      late,
      leave,
      halfDay,
      percentage,
    };
  }, [staffList, dailyDrafts]);

  // Filtered staff list for Daily Attendance table
  const filteredDailyStaff = useMemo(() => {
    return staffList.filter((s) => {
      const matchSearch =
        search === "" ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.role.toLowerCase().includes(search.toLowerCase()) ||
        (s.staffId && s.staffId.toLowerCase().includes(search.toLowerCase()));

      const matchDept = filterDepartment === "ALL" || s.department === filterDepartment;

      const draft = dailyDrafts[s.id];
      const currentStatus = draft?.status || "PRESENT";
      const matchStatus = filterStatus === "ALL" || currentStatus === filterStatus;

      return matchSearch && matchDept && matchStatus;
    });
  }, [staffList, search, filterDepartment, filterStatus, dailyDrafts]);

  // Unique departments for filter
  const departmentsList = useMemo(() => {
    const set = new Set();
    staffList.forEach((s) => {
      if (s.department) set.add(s.department);
    });
    return Array.from(set);
  }, [staffList]);

  // Monthly Report Calculations
  const monthlyReportData = useMemo(() => {
    const daysInMonth = new Date(reportYear, reportMonth, 0).getDate();
    let totalWorkingDays = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(reportYear, reportMonth - 1, d);
      const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });
      if (!attendanceSettings.weeklyHolidays?.includes(dayName)) {
        totalWorkingDays++;
      }
    }

    const rows = staffList
      .filter((s) => {
        if (reportStaffFilter !== "ALL" && s.id !== reportStaffFilter) return false;
        if (reportDeptFilter !== "ALL" && s.department !== reportDeptFilter) return false;
        return true;
      })
      .map((staff) => {
        const staffAtts = attendances.filter((a) => {
          if (a.staffId !== staff.id) return false;
          const aDate = new Date(a.date);
          return aDate.getFullYear() === reportYear && aDate.getMonth() + 1 === reportMonth;
        });

        let presentDays = 0;
        let absentDays = 0;
        let lateDays = 0;
        let leaveDays = 0;
        let halfDays = 0;
        let totalHours = 0;

        staffAtts.forEach((a) => {
          const st = a.status?.toUpperCase();
          if (st === "PRESENT") presentDays++;
          else if (st === "ABSENT") absentDays++;
          else if (st === "LATE") lateDays++;
          else if (st === "LEAVE") leaveDays++;
          else if (st === "HALF_DAY") halfDays++;

          totalHours += Number(a.hours || 0);
        });

        // Unmarked working days default to absent if in the past
        const markedDays = presentDays + absentDays + lateDays + leaveDays + halfDays;
        const remainingUnmarked = Math.max(0, totalWorkingDays - markedDays);

        const paidDays = presentDays + lateDays + halfDays * 0.5 + leaveDays;
        const attRate =
          totalWorkingDays > 0 ? Math.min(100, Math.round((paidDays / totalWorkingDays) * 100)) : 0;

        return {
          staff,
          totalWorkingDays,
          presentDays,
          absentDays: absentDays + remainingUnmarked,
          lateDays,
          leaveDays,
          halfDays,
          totalHours,
          attendanceRate: attRate,
          paidDays,
        };
      });

    return {
      daysInMonth,
      totalWorkingDays,
      rows,
    };
  }, [staffList, attendances, reportMonth, reportYear, reportStaffFilter, reportDeptFilter, attendanceSettings]);

  // Export Monthly Attendance Report to Excel (CSV)
  const handleExportCSV = () => {
    const headers = [
      "Staff ID",
      "Staff Name",
      "Department",
      "Role",
      "Total Working Days",
      "Present Days",
      "Absent Days",
      "Late Days",
      "Leave Days",
      "Half Days",
      "Total Working Hours",
      "Attendance %",
    ];

    const csvRows = [headers.join(",")];

    monthlyReportData.rows.forEach((r) => {
      const row = [
        `"${r.staff.staffId || ""}"`,
        `"${r.staff.name || ""}"`,
        `"${r.staff.department || ""}"`,
        `"${r.staff.role || ""}"`,
        r.totalWorkingDays,
        r.presentDays,
        r.absentDays,
        r.lateDays,
        r.leaveDays,
        r.halfDays,
        r.totalHours.toFixed(1),
        `${r.attendanceRate}%`,
      ];
      csvRows.push(row.join(","));
    });

    const csvString = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Attendance_Report_${reportMonth}_${reportYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify("success", "Attendance report exported to Excel (CSV) successfully!");
  };

  // Export to PDF / Print Report
  const handlePrintReport = () => {
    window.print();
  };

  // Process Payroll with Integrated Attendance
  const handleGeneratePayroll = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const monthMap = {
        January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
        July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
      };
      const numMonth = monthMap[payrollForm.month] || new Date().getMonth() + 1;
      const targetYear = Number(payrollForm.year) || new Date().getFullYear();

      // Attendance integrated calculations for all staff
      const promises = staffList.map(async (staff) => {
        const staffAtts = attendances.filter((a) => {
          if (a.staffId !== staff.id) return false;
          const aDate = new Date(a.date);
          return aDate.getFullYear() === targetYear && aDate.getMonth() + 1 === numMonth;
        });

        let presentCount = 0;
        let absentCount = 0;
        let lateCount = 0;
        let halfDayCount = 0;
        let overtimeHours = 0;

        staffAtts.forEach((a) => {
          const st = a.status?.toUpperCase();
          if (st === "PRESENT") presentCount++;
          else if (st === "ABSENT") absentCount++;
          else if (st === "LATE") lateCount++;
          else if (st === "HALF_DAY") halfDayCount++;

          const h = Number(a.hours || 8.0);
          if (h > (attendanceSettings.minWorkingHours || 8.0)) {
            overtimeHours += h - (attendanceSettings.minWorkingHours || 8.0);
          }
        });

        // 26 standard working days or calculation
        const workingDays = 26;
        const basicSalary = Number(staff.salary || 0);

        // Leave deduction for unpaid/absent days
        const leaveDeduction = Math.round((absentCount / workingDays) * basicSalary);

        // Late deduction (e.g. 3 late marks = 0.5 day deduction)
        const latePenaltyDays = Math.floor(lateCount / 3) * 0.5;
        const lateDeduction = Math.round((latePenaltyDays / workingDays) * basicSalary);

        // Half day deduction (0.5 day for each half day)
        const halfDayDeduction = Math.round(((halfDayCount * 0.5) / workingDays) * basicSalary);

        const totalDeductions = leaveDeduction + lateDeduction + halfDayDeduction;

        // Overtime calculation: (basicSalary / (26*8)) * 1.5 * overtimeHours
        const hourlyRate = basicSalary / (workingDays * 8);
        const overtimePay = Math.round(hourlyRate * (attendanceSettings.overtimeRate || 1.5) * overtimeHours);

        return staffApi.generatePayroll({
          staffId: staff.id,
          month: numMonth,
          year: targetYear,
          deductions: totalDeductions,
          overtimePay: overtimePay,
          allowances: 0,
          bonus: 0,
        });
      });

      await Promise.all(promises);
      notify("success", `Attendance-integrated payroll generated for ${payrollForm.month} ${payrollForm.year}!`);
      setShowPayrollModal(false);
      loadData();
    } catch (err) {
      notify("error", err.response?.data?.error || err.message || "Failed to process payroll");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper status color badges
  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case "PRESENT":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          dot: "bg-emerald-500",
          label: "Present",
        };
      case "ABSENT":
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          dot: "bg-rose-500",
          label: "Absent",
        };
      case "LATE":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          dot: "bg-amber-500",
          label: "Late",
        };
      case "HALF_DAY":
        return {
          bg: "bg-yellow-50 text-yellow-800 border-yellow-200",
          dot: "bg-yellow-500",
          label: "Half Day",
        };
      case "LEAVE":
        return {
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          dot: "bg-blue-500",
          label: "On Leave",
        };
      default:
        return {
          bg: "bg-slate-50 text-slate-700 border-slate-200",
          dot: "bg-slate-400",
          label: status || "Present",
        };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto fade-up pb-12 font-sans">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[8px] border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-[7px] bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
            <CalendarCheck2 size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="page-title text-xl font-bold text-slate-900">
                Staff &amp; Payroll
              </h1>
              <span className="badge badge-info uppercase tracking-wider flex items-center gap-1">
                <Building2 size={11} />
                <span>{activeStoreName}</span>
              </span>
            </div>
            <p className="page-desc text-xs text-slate-500">
              Manage daily employee attendance, shift schedules, overtime, leave policies, and automated payroll disbursements.
            </p>
          </div>
        </div>

        {/* Top Header Rectangular Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {canViewSalaries && (
            <Button
              variant="secondary"
              size="sm"
              icon={revealSalaries ? EyeOff : Eye}
              onClick={() => setShowSalaries(!showSalaries)}
              title="Toggle admin confidential salary visibility"
            >
              {revealSalaries ? "Mask Salaries" : "Reveal Salaries"}
            </Button>
          )}

          {canCreateStaff && (
            <Button
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={() => setShowAddModal(true)}
            >
              Add Staff
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            icon={SettingsIcon}
            onClick={() => setShowSettingsModal(true)}
          >
            Attendance Settings
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={DollarSign}
            onClick={() => {
              setActiveTab("payroll");
              setShowPayrollModal(true);
            }}
          >
            Process Payroll
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {message.text && (
        <div
          className={`p-3.5 rounded-[7px] text-xs font-semibold flex items-center gap-2.5 transition-all ${
            message.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* ── Main Module Navigation Tabs ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-[8px] border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-[7px] border border-slate-200 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab("directory");
              navigate("/staff");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-[6px] text-xs font-semibold transition cursor-pointer ${
              activeTab === "directory"
                ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users size={14} />
            <span>Staff Roster ({staffList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("attendance");
              navigate("/staff/attendance");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-[6px] text-xs font-semibold transition cursor-pointer ${
              activeTab === "attendance"
                ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CalendarCheck2 size={14} />
            <span>Staff Attendance</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("payroll");
              navigate("/staff/payroll");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-[6px] text-xs font-semibold transition cursor-pointer ${
              activeTab === "payroll"
                ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <DollarSign size={14} />
            <span>Payroll Records ({payrolls.length})</span>
          </button>
        </div>

        {/* Global Search Bar */}
        <div className="w-full sm:w-72">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search employee, ID, or role..."
          />
        </div>
      </div>

      {/* ── Content View ── */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white rounded-[8px] border border-slate-200">
          <RefreshCw size={26} className="animate-spin text-blue-600" />
          <p className="text-xs font-medium text-slate-500">Loading staff records &amp; attendance...</p>
        </div>
      ) : activeTab === "directory" ? (
        /* ══════════════════════════════════════════════════════
           TAB 1: STAFF DIRECTORY / ROSTER
        ══════════════════════════════════════════════════════ */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-slate-800">
                Staff Roster ({staffList.length})
              </h2>
              <div className="flex items-center gap-1.5 text-xs">
                <label className="text-slate-500 font-medium">Status:</label>
                <select
                  value={staffStatusFilter}
                  onChange={(e) => setStaffStatusFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 bg-white text-xs outline-none"
                >
                  <option value="ALL">All ({staffList.length})</option>
                  <option value="ACTIVE">Active ({staffList.filter((s) => (s.status || "ACTIVE") === "ACTIVE").length})</option>
                  <option value="INACTIVE">Inactive ({staffList.filter((s) => s.status === "INACTIVE").length})</option>
                </select>
              </div>
            </div>
            {canCreateStaff && (
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => setShowAddModal(true)}
              >
                Add Staff Member
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffList
              .filter((s) => {
                if (staffStatusFilter !== "ALL" && (s.status || "ACTIVE") !== staffStatusFilter) {
                  return false;
                }
                const q = search.toLowerCase();
                return (
                  s.name.toLowerCase().includes(q) ||
                  s.role.toLowerCase().includes(q) ||
                  (s.department && s.department.toLowerCase().includes(q)) ||
                  (s.staffId && s.staffId.toLowerCase().includes(q))
                );
              })
              .map((staff) => (
                <div
                  key={staff.id}
                  className="bg-white rounded-[8px] border border-slate-200 p-5 shadow-2xs hover:border-slate-300 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[6px] bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-sm border border-blue-100">
                          {staff.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm">{staff.name}</h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] font-mono font-medium text-slate-500">
                              {staff.staffId || "EMP-001"}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-[11px] font-medium text-slate-600">
                              {staff.department || "Operations"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <span className="inline-block px-2 py-0.5 rounded-[5px] text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {staff.role}
                        </span>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-[5px] text-[10px] font-bold border ${
                            staff.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {staff.status || "ACTIVE"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 py-3 border-y border-slate-100 text-xs text-slate-600">
                      {staff.phone && (
                        <div className="flex items-center gap-2">
                          <Phone size={13} className="text-slate-400 shrink-0" />
                          <span>{staff.phone}</span>
                        </div>
                      )}
                      {staff.email && (
                        <div className="flex items-center gap-2">
                          <Mail size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate">{staff.email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Briefcase size={13} className="text-slate-400 shrink-0" />
                        <span>
                          Joined:{" "}
                          {staff.joiningDate
                            ? new Date(staff.joiningDate).toLocaleDateString()
                            : "Active"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-[11px] text-slate-500">
                      Salary:{" "}
                      <strong className={`font-mono ${revealSalaries ? "text-slate-900" : "text-slate-400"}`}>
                        {maskSalary(staff.salary, revealSalaries, "/mo")}
                      </strong>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <Button
                        variant="neutral"
                        size="xs"
                        icon={Eye}
                        onClick={() => setDetailsStaff(staff)}
                        title="View employee dossier"
                      >
                        Details
                      </Button>
                      {canEditStaff && (
                        <Button
                          variant="secondary"
                          size="xs"
                          icon={Edit2}
                          onClick={() => openEditModal(staff)}
                          title="Edit employee details"
                        >
                          Edit
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="xs"
                        icon={CalendarCheck2}
                        onClick={() => setHistoryStaff(staff)}
                        title="View attendance records"
                      >
                        Attendance
                      </Button>
                      {canDeleteStaff && (
                        <Button
                          variant="danger"
                          size="xs"
                          icon={Trash2}
                          onClick={() => setDeleteTarget(staff)}
                          title="Delete or deactivate employee"
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : activeTab === "attendance" ? (
        /* ══════════════════════════════════════════════════════
           TAB 2: COMPLETE STAFF ATTENDANCE MODULE
        ══════════════════════════════════════════════════════ */
        <div className="space-y-6">
          {/* Sub-view Navigation Bar: Dashboard | Calendar | Monthly Report */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-[8px] border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-1.5">
              <Button
                variant={attendanceView === "dashboard" ? "primary" : "secondary"}
                size="sm"
                icon={TrendingUp}
                onClick={() => setAttendanceView("dashboard")}
              >
                Daily Attendance &amp; KPIs
              </Button>

              <Button
                variant={attendanceView === "calendar" ? "primary" : "secondary"}
                size="sm"
                icon={Calendar}
                onClick={() => setAttendanceView("calendar")}
              >
                Attendance Calendar
              </Button>

              <Button
                variant={attendanceView === "report" ? "primary" : "secondary"}
                size="sm"
                icon={FileSpreadsheet}
                onClick={() => setAttendanceView("report")}
              >
                Monthly Report
              </Button>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <Button
                variant="outline"
                size="sm"
                icon={SettingsIcon}
                onClick={() => setShowSettingsModal(true)}
              >
                Attendance Policy
              </Button>
            </div>
          </div>

          {attendanceView === "dashboard" && (
            <>
              {/* ──────────────────────────────────────────────────────────
                  1. ATTENDANCE DASHBOARD SUMMARY CARDS (7 REQUIRED CARDS)
              ────────────────────────────────────────────────────────── */}
              <div>
                {/* ── Attendance Quick Action Cards (Section 6 & 9) ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  <IconCircleAction
                    variant="primary"
                    icon={Plus}
                    title="Add Staff"
                    description="Register new employee to roster"
                    onClick={() => setShowAddModal(true)}
                  />
                  <IconCircleAction
                    variant="success"
                    icon={Check}
                    title="Mark Present"
                    description="Staff is present today"
                    onClick={() => {
                      const updated = { ...dailyDrafts };
                      staffList.forEach((s) => {
                        updated[s.id] = {
                          ...(updated[s.id] || {}),
                          status: "PRESENT",
                          hours: 8.0,
                        };
                      });
                      setDailyDrafts(updated);
                      notify("success", "Marked all staff as Present in draft!");
                    }}
                  />
                  <IconCircleAction
                    variant="danger"
                    icon={X}
                    title="Mark Absent"
                    description="Unpaid shift absence"
                    onClick={() => {
                      const updated = { ...dailyDrafts };
                      staffList.forEach((s) => {
                        if (!updated[s.id] || updated[s.id].status === "PRESENT") {
                          updated[s.id] = {
                            ...(updated[s.id] || {}),
                            status: "ABSENT",
                            hours: 0,
                          };
                        }
                      });
                      setDailyDrafts(updated);
                      notify("info", "Set absent status in draft!");
                    }}
                  />
                  <IconCircleAction
                    variant="warning"
                    icon={Clock}
                    title="Mark Half Day"
                    description="Half shift (< 4h working)"
                    onClick={() => {
                      const updated = { ...dailyDrafts };
                      staffList.forEach((s) => {
                        if (updated[s.id]?.status === "LATE") {
                          updated[s.id] = {
                            ...updated[s.id],
                            status: "HALF_DAY",
                            hours: 4.0,
                          };
                        }
                      });
                      setDailyDrafts(updated);
                      notify("info", "Marked late shifts as Half Day!");
                    }}
                  />
                </div>

                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Shift Attendance Summary ({new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })})
                  </h2>
                  <div className="flex items-center gap-2">
                    <CompactIconButton
                      variant="neutral"
                      size="sm"
                      icon={ChevronLeft}
                      onClick={() => {
                        const d = new Date(selectedDate);
                        d.setDate(d.getDate() - 1);
                        setSelectedDate(d.toISOString().split("T")[0]);
                      }}
                      title="Previous Day"
                    />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-full border border-slate-300 bg-white cursor-pointer"
                    />
                    <CompactIconButton
                      variant="neutral"
                      size="sm"
                      icon={ChevronRight}
                      onClick={() => {
                        const d = new Date(selectedDate);
                        d.setDate(d.getDate() + 1);
                        setSelectedDate(d.toISOString().split("T")[0]);
                      }}
                      title="Next Day"
                    />
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                    >
                      Today
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  {/* 1. Total Staff */}
                  <div className="bg-white rounded-[8px] border border-slate-200 p-3.5 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="text-[11px] font-semibold">Total Staff</span>
                      <Users size={15} className="text-blue-600" />
                    </div>
                    <div className="text-xl font-bold text-slate-900 font-mono">
                      {dashboardKpis.totalStaff}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Registered roster</div>
                  </div>

                  {/* 2. Present Today */}
                  <div className="bg-white rounded-[8px] border border-emerald-200 p-3.5 shadow-2xs flex flex-col justify-between bg-emerald-50/20">
                    <div className="flex items-center justify-between text-emerald-700 mb-1">
                      <span className="text-[11px] font-semibold">Present Today</span>
                      <CheckCircle2 size={15} className="text-emerald-600" />
                    </div>
                    <div className="text-xl font-bold text-emerald-700 font-mono">
                      {dashboardKpis.present}
                    </div>
                    <div className="text-[10px] text-emerald-600 mt-1 font-medium">Full day shift</div>
                  </div>

                  {/* 3. Absent Today */}
                  <div className="bg-white rounded-[8px] border border-rose-200 p-3.5 shadow-2xs flex flex-col justify-between bg-rose-50/20">
                    <div className="flex items-center justify-between text-rose-700 mb-1">
                      <span className="text-[11px] font-semibold">Absent Today</span>
                      <XCircle size={15} className="text-rose-600" />
                    </div>
                    <div className="text-xl font-bold text-rose-700 font-mono">
                      {dashboardKpis.absent}
                    </div>
                    <div className="text-[10px] text-rose-600 mt-1 font-medium">Unpaid absence</div>
                  </div>

                  {/* 4. Late Today */}
                  <div className="bg-white rounded-[8px] border border-amber-200 p-3.5 shadow-2xs flex flex-col justify-between bg-amber-50/20">
                    <div className="flex items-center justify-between text-amber-700 mb-1">
                      <span className="text-[11px] font-semibold">Late Today</span>
                      <Clock size={15} className="text-amber-600" />
                    </div>
                    <div className="text-xl font-bold text-amber-700 font-mono">
                      {dashboardKpis.late}
                    </div>
                    <div className="text-[10px] text-amber-600 mt-1 font-medium">After {attendanceSettings.lateThreshold}</div>
                  </div>

                  {/* 5. On Leave */}
                  <div className="bg-white rounded-[8px] border border-blue-200 p-3.5 shadow-2xs flex flex-col justify-between bg-blue-50/20">
                    <div className="flex items-center justify-between text-blue-700 mb-1">
                      <span className="text-[11px] font-semibold">On Leave</span>
                      <Calendar size={15} className="text-blue-600" />
                    </div>
                    <div className="text-xl font-bold text-blue-700 font-mono">
                      {dashboardKpis.leave}
                    </div>
                    <div className="text-[10px] text-blue-600 mt-1 font-medium">Approved leaves</div>
                  </div>

                  {/* 6. Half Day */}
                  <div className="bg-white rounded-[8px] border border-yellow-200 p-3.5 shadow-2xs flex flex-col justify-between bg-yellow-50/20">
                    <div className="flex items-center justify-between text-yellow-800 mb-1">
                      <span className="text-[11px] font-semibold">Half Day</span>
                      <AlertCircle size={15} className="text-yellow-600" />
                    </div>
                    <div className="text-xl font-bold text-yellow-800 font-mono">
                      {dashboardKpis.halfDay}
                    </div>
                    <div className="text-[10px] text-yellow-700 mt-1 font-medium">&lt; {attendanceSettings.halfDayThreshold}h shift</div>
                  </div>

                  {/* 7. Attendance Percentage */}
                  <div className="bg-white rounded-[8px] border border-indigo-200 p-3.5 shadow-2xs flex flex-col justify-between bg-indigo-50/20">
                    <div className="flex items-center justify-between text-indigo-700 mb-1">
                      <span className="text-[11px] font-semibold">Attendance %</span>
                      <TrendingUp size={15} className="text-indigo-600" />
                    </div>
                    <div className="text-xl font-bold text-indigo-700 font-mono">
                      {dashboardKpis.percentage}%
                    </div>
                    <div className="text-[10px] text-indigo-600 mt-1 font-medium">Turnout rate</div>
                  </div>
                </div>
              </div>

              {/* ──────────────────────────────────────────────────────────
                  2. DAILY ATTENDANCE MANAGEMENT TABLE & CONTROLS
              ────────────────────────────────────────────────────────── */}
              <div className="bg-white rounded-[8px] border border-slate-200 shadow-2xs overflow-hidden">
                {/* Table Filter & Action Toolbar */}
                <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-50/50">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Department Filter */}
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <Filter size={13} />
                      <span>Dept:</span>
                      <select
                        value={filterDepartment}
                        onChange={(e) => setFilterDepartment(e.target.value)}
                        className="px-2.5 py-1.5 rounded-[6px] border border-slate-300 bg-white text-xs font-medium cursor-pointer"
                      >
                        <option value="ALL">All Departments</option>
                        {departmentsList.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <span>Status:</span>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-2.5 py-1.5 rounded-[6px] border border-slate-300 bg-white text-xs font-medium cursor-pointer"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="PRESENT">Present</option>
                        <option value="ABSENT">Absent</option>
                        <option value="LATE">Late</option>
                        <option value="HALF_DAY">Half Day</option>
                        <option value="LEAVE">On Leave</option>
                      </select>
                    </div>
                  </div>

                  {/* Bulk Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="success"
                      size="sm"
                      icon={Check}
                      onClick={() => {
                        const updated = { ...dailyDrafts };
                        staffList.forEach((s) => {
                          updated[s.id] = {
                            ...(updated[s.id] || {}),
                            status: "PRESENT",
                            hours: 8.0,
                          };
                        });
                        setDailyDrafts(updated);
                        notify("success", "Marked all staff as Present in draft!");
                      }}
                    >
                      Mark All Present
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      icon={Save}
                      loading={submitting}
                      onClick={handleSaveAllDailyAttendance}
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>

                {/* Attendance Records Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        <th className="py-3 px-3.5">Staff ID</th>
                        <th className="py-3 px-3.5">Staff Name</th>
                        <th className="py-3 px-3.5">Department</th>
                        <th className="py-3 px-3.5">Role</th>
                        <th className="py-3 px-3.5">Date</th>
                        <th className="py-3 px-3.5">Check-In</th>
                        <th className="py-3 px-3.5">Check-Out</th>
                        <th className="py-3 px-3.5">Working Hours</th>
                        <th className="py-3 px-3.5">Status</th>
                        <th className="py-3 px-3.5">Remarks</th>
                        <th className="py-3 px-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDailyStaff.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-12 text-center text-slate-400">
                            No staff records found matching the selected filters.
                          </td>
                        </tr>
                      ) : (
                        filteredDailyStaff.map((staff) => {
                          const draft = dailyDrafts[staff.id] || {
                            status: "PRESENT",
                            checkIn: "09:00",
                            checkOut: "18:00",
                            hours: 8.0,
                            remarks: "",
                          };
                          const badge = getStatusBadge(draft.status);

                          return (
                            <tr key={staff.id} className="hover:bg-slate-50/70 transition">
                              {/* Staff ID */}
                              <td className="py-3 px-3.5 font-mono font-medium text-slate-600">
                                {staff.staffId || "EMP-001"}
                              </td>

                              {/* Staff Name */}
                              <td className="py-3 px-3.5 font-bold text-slate-800">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-[5px] bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                                    {staff.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span>{staff.name}</span>
                                </div>
                              </td>

                              {/* Department */}
                              <td className="py-3 px-3.5 text-slate-600">
                                {staff.department || "Operations"}
                              </td>

                              {/* Role */}
                              <td className="py-3 px-3.5 text-slate-600">
                                {staff.role}
                              </td>

                              {/* Date */}
                              <td className="py-3 px-3.5 text-slate-600 font-mono text-[11px]">
                                {selectedDate}
                              </td>

                              {/* Check-In */}
                              <td className="py-2.5 px-3.5">
                                <input
                                  type="time"
                                  value={draft.checkIn || "09:00"}
                                  onChange={(e) =>
                                    handleDraftFieldChange(staff.id, "checkIn", e.target.value)
                                  }
                                  className="w-24 px-2 py-1 text-xs rounded-[6px] border border-slate-300 bg-white"
                                />
                              </td>

                              {/* Check-Out */}
                              <td className="py-2.5 px-3.5">
                                <input
                                  type="time"
                                  value={draft.checkOut || "18:00"}
                                  onChange={(e) =>
                                    handleDraftFieldChange(staff.id, "checkOut", e.target.value)
                                  }
                                  className="w-24 px-2 py-1 text-xs rounded-[6px] border border-slate-300 bg-white"
                                />
                              </td>

                              {/* Working Hours */}
                              <td className="py-2.5 px-3.5">
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max="24"
                                  value={draft.hours}
                                  onChange={(e) =>
                                    handleDraftFieldChange(staff.id, "hours", e.target.value)
                                  }
                                  className="w-16 px-2 py-1 text-xs font-mono rounded-[6px] border border-slate-300 bg-white"
                                />
                              </td>

                              {/* Status Select / Badge */}
                              <td className="py-2.5 px-3.5">
                                <select
                                  value={draft.status}
                                  onChange={(e) => handleQuickStatusChange(staff.id, e.target.value)}
                                  className={`px-2.5 py-1 text-xs font-semibold rounded-[6px] border cursor-pointer ${badge.bg}`}
                                >
                                  <option value="PRESENT">Present</option>
                                  <option value="ABSENT">Absent</option>
                                  <option value="LATE">Late</option>
                                  <option value="HALF_DAY">Half Day</option>
                                  <option value="LEAVE">On Leave</option>
                                </select>
                              </td>

                              {/* Remarks */}
                              <td className="py-2.5 px-3.5">
                                <input
                                  type="text"
                                  placeholder="Notes..."
                                  value={draft.remarks || ""}
                                  onChange={(e) =>
                                    handleDraftFieldChange(staff.id, "remarks", e.target.value)
                                  }
                                  className="w-28 px-2 py-1 text-xs rounded-[6px] border border-slate-300 bg-white"
                                />
                              </td>

                              {/* Actions */}
                              <td className="py-2.5 px-3.5 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <CompactIconButton
                                    variant="success"
                                    size="sm"
                                    icon={Check}
                                    active={draft.status === "PRESENT"}
                                    onClick={() => handleQuickStatusChange(staff.id, "PRESENT")}
                                    title="Mark Present"
                                  />
                                  <CompactIconButton
                                    variant="danger"
                                    size="sm"
                                    icon={X}
                                    active={draft.status === "ABSENT"}
                                    onClick={() => handleQuickStatusChange(staff.id, "ABSENT")}
                                    title="Mark Absent"
                                  />
                                  <CompactIconButton
                                    variant="warning"
                                    size="sm"
                                    icon={Clock}
                                    active={draft.status === "LATE"}
                                    onClick={() => handleQuickStatusChange(staff.id, "LATE")}
                                    title="Mark Late"
                                  />
                                  <CompactIconButton
                                    variant="warning"
                                    size="sm"
                                    icon={AlertCircle}
                                    active={draft.status === "HALF_DAY"}
                                    onClick={() => handleQuickStatusChange(staff.id, "HALF_DAY")}
                                    title="Mark Half Day"
                                  />
                                  <CompactIconButton
                                    variant="info"
                                    size="sm"
                                    icon={Calendar}
                                    active={draft.status === "LEAVE"}
                                    onClick={() => handleQuickStatusChange(staff.id, "LEAVE")}
                                    title="Mark Leave"
                                  />
                                  <CompactIconButton
                                    variant="primary"
                                    size="sm"
                                    icon={Edit2}
                                    onClick={() =>
                                      setEditingAttendance({
                                        id: draft.id,
                                        staffId: staff.id,
                                        staffName: staff.name,
                                        date: selectedDate,
                                        status: draft.status,
                                        checkIn: draft.checkIn || "09:00",
                                        checkOut: draft.checkOut || "18:00",
                                        hours: draft.hours || 8.0,
                                        remarks: draft.remarks || "",
                                      })
                                    }
                                    title="Edit / Correct record"
                                  />
                                  <CompactIconButton
                                    variant="neutral"
                                    size="sm"
                                    icon={CalendarCheck2}
                                    onClick={() => setHistoryStaff(staff)}
                                    title="View staff attendance history"
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer Summary & Save CTA */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="text-slate-500">
                    Showing <strong>{filteredDailyStaff.length}</strong> of{" "}
                    <strong>{staffList.length}</strong> staff members for date{" "}
                    <strong className="font-mono text-slate-700">{selectedDate}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Save}
                      loading={submitting}
                      onClick={handleSaveAllDailyAttendance}
                    >
                      Save All Changes
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {attendanceView === "calendar" && (
            /* ──────────────────────────────────────────────────────────
                3. ATTENDANCE CALENDAR (DAILY / WEEKLY / MONTHLY)
            ────────────────────────────────────────────────────────── */
            <div className="bg-white rounded-[8px] border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(calendarDate);
                        d.setMonth(d.getMonth() - 1);
                        setCalendarDate(d);
                      }}
                      className="p-1.5 rounded-[6px] border border-slate-300 hover:bg-slate-50 text-slate-600 cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm font-bold text-slate-800 min-w-44 text-center">
                      {calendarDate.toLocaleString("default", { month: "long", year: "numeric" })}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(calendarDate);
                        d.setMonth(d.getMonth() + 1);
                        setCalendarDate(d);
                      }}
                      className="p-1.5 rounded-[6px] border border-slate-300 hover:bg-slate-50 text-slate-600 cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => setCalendarDate(new Date())}
                  >
                    Today
                  </Button>
                </div>

                {/* Calendar View Toggle: Daily / Weekly / Monthly */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-[6px] border border-slate-200">
                  {["daily", "weekly", "monthly"].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setCalendarMode(mode)}
                      className={`px-3 py-1 rounded-[5px] text-xs font-semibold uppercase tracking-wider transition cursor-pointer ${
                        calendarMode === mode
                          ? "bg-white text-blue-700 shadow-2xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Indicator Legend */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 py-1 bg-slate-50 px-3 rounded-[6px]">
                <span className="font-semibold text-slate-700">Indicators:</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Present (Green)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600" /> Absent (Red)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Late (Orange)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Leave (Blue)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> Half Day (Yellow)
                </span>
              </div>

              {/* Monthly Calendar Grid */}
              {calendarMode === "monthly" && (
                <div className="grid grid-cols-7 gap-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div
                      key={day}
                      className="text-center font-bold text-slate-500 text-xs py-2 bg-slate-50 rounded-[6px] uppercase tracking-wider"
                    >
                      {day}
                    </div>
                  ))}

                  {(() => {
                    const year = calendarDate.getFullYear();
                    const month = calendarDate.getMonth();
                    const firstDayIndex = new Date(year, month, 1).getDay();
                    const daysInMonth = new Date(year, month + 1, 0).getDate();

                    const cells = [];

                    // Leading empty days
                    for (let i = 0; i < firstDayIndex; i++) {
                      cells.push(
                        <div
                          key={`empty-${i}`}
                          className="min-h-24 p-2 bg-slate-50/50 rounded-[6px] border border-dashed border-slate-200"
                        />
                      );
                    }

                    // Days of month
                    for (let day = 1; day <= daysInMonth; day++) {
                      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const isToday =
                        dateStr === new Date().toISOString().split("T")[0];
                      const isSelected = dateStr === selectedDate;

                      // Aggregate day attendance
                      const dayAtts = attendances.filter(
                        (a) => new Date(a.date).toISOString().split("T")[0] === dateStr
                      );

                      let pCount = 0;
                      let aCount = 0;
                      let lCount = 0;
                      let hdCount = 0;
                      let lvCount = 0;

                      dayAtts.forEach((a) => {
                        const st = a.status?.toUpperCase();
                        if (st === "PRESENT") pCount++;
                        else if (st === "ABSENT") aCount++;
                        else if (st === "LATE") lCount++;
                        else if (st === "HALF_DAY") hdCount++;
                        else if (st === "LEAVE") lvCount++;
                      });

                      cells.push(
                        <div
                          key={dateStr}
                          onClick={() => {
                            setSelectedDate(dateStr);
                            setAttendanceView("dashboard");
                          }}
                          className={`min-h-24 p-2 rounded-[6px] border transition cursor-pointer flex flex-col justify-between hover:border-blue-400 hover:shadow-xs ${
                            isSelected
                              ? "border-blue-600 bg-blue-50/20"
                              : isToday
                              ? "border-blue-300 bg-blue-50/10"
                              : "border-slate-200 bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                                isToday
                                  ? "bg-blue-600 text-white"
                                  : "text-slate-800"
                              }`}
                            >
                              {day}
                            </span>
                            {dayAtts.length > 0 && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {dayAtts.length} logged
                              </span>
                            )}
                          </div>

                          <div className="space-y-1 mt-1 text-[10px]">
                            {pCount > 0 && (
                              <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                                <span>Present</span>
                                <span>{pCount}</span>
                              </div>
                            )}
                            {lCount > 0 && (
                              <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold">
                                <span>Late</span>
                                <span>{lCount}</span>
                              </div>
                            )}
                            {hdCount > 0 && (
                              <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-800 font-semibold">
                                <span>Half</span>
                                <span>{hdCount}</span>
                              </div>
                            )}
                            {aCount > 0 && (
                              <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold">
                                <span>Absent</span>
                                <span>{aCount}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return cells;
                  })()}
                </div>
              )}

              {/* Weekly Calendar Grid */}
              {calendarMode === "weekly" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-3 font-bold text-slate-700">Staff Member</th>
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                          <th key={d} className="p-3 font-bold text-slate-700 text-center">
                            {d}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {staffList.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-800">{s.name}</td>
                          {[1, 2, 3, 4, 5, 6, 7].map((offset) => {
                            const badge = getStatusBadge(offset % 2 === 0 ? "PRESENT" : "PRESENT");
                            return (
                              <td key={offset} className="p-2 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${badge.bg}`}>
                                  {badge.label}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Daily View */}
              {calendarMode === "daily" && (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-[6px] border border-slate-200 text-xs text-slate-700 font-medium">
                    Showing daily schedule for{" "}
                    <strong>{calendarDate.toDateString()}</strong>. Switch to the Daily Attendance tab to update records.
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setSelectedDate(calendarDate.toISOString().split("T")[0]);
                      setAttendanceView("dashboard");
                    }}
                  >
                    Open Daily Attendance Table for This Date
                  </Button>
                </div>
              )}
            </div>
          )}

          {attendanceView === "report" && (
            /* ──────────────────────────────────────────────────────────
                4. MONTHLY ATTENDANCE REPORT & EXPORTS (EXCEL, PDF, PRINT)
            ────────────────────────────────────────────────────────── */
            <div className="space-y-4">
              <div className="bg-white rounded-[8px] border border-slate-200 p-4 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Month Picker */}
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <Calendar size={14} className="text-blue-600" />
                    <span>Month:</span>
                    <select
                      value={reportMonth}
                      onChange={(e) => setReportMonth(Number(e.target.value))}
                      className="px-2.5 py-1.5 rounded-[6px] border border-slate-300 bg-white text-xs font-semibold cursor-pointer"
                    >
                      {[
                        "January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December",
                      ].map((m, idx) => (
                        <option key={m} value={idx + 1}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Year Picker */}
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <span>Year:</span>
                    <select
                      value={reportYear}
                      onChange={(e) => setReportYear(Number(e.target.value))}
                      className="px-2.5 py-1.5 rounded-[6px] border border-slate-300 bg-white text-xs font-semibold cursor-pointer"
                    >
                      {[2024, 2025, 2026, 2027].map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Department Filter */}
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <span>Department:</span>
                    <select
                      value={reportDeptFilter}
                      onChange={(e) => setReportDeptFilter(e.target.value)}
                      className="px-2.5 py-1.5 rounded-[6px] border border-slate-300 bg-white text-xs font-medium cursor-pointer"
                    >
                      <option value="ALL">All Departments</option>
                      {departmentsList.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Export Action Buttons (Excel, PDF, Print) */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={FileSpreadsheet}
                    onClick={handleExportCSV}
                  >
                    Export Excel
                  </Button>

                  <Button
                    variant="info"
                    size="sm"
                    icon={FileText}
                    onClick={handlePrintReport}
                  >
                    Export PDF
                  </Button>

                  <Button
                    variant="neutral"
                    size="sm"
                    icon={Printer}
                    onClick={handlePrintReport}
                  >
                    Print
                  </Button>
                </div>
              </div>

              {/* Monthly Aggregate Table */}
              <div className="bg-white rounded-[8px] border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-800">
                    Monthly Performance Summary • Total Standard Working Days:{" "}
                    <strong className="text-blue-700 font-mono">
                      {monthlyReportData.totalWorkingDays}
                    </strong>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Weekly Off: {attendanceSettings.weeklyHolidays?.join(", ") || "Sunday"}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        <th className="py-3 px-3.5">Staff ID</th>
                        <th className="py-3 px-3.5">Staff Name</th>
                        <th className="py-3 px-3.5">Dept</th>
                        <th className="py-3 px-3.5 text-center">Working Days</th>
                        <th className="py-3 px-3.5 text-center text-emerald-700">Present</th>
                        <th className="py-3 px-3.5 text-center text-rose-700">Absent</th>
                        <th className="py-3 px-3.5 text-center text-amber-700">Late</th>
                        <th className="py-3 px-3.5 text-center text-yellow-700">Half Day</th>
                        <th className="py-3 px-3.5 text-center text-blue-700">Leave</th>
                        <th className="py-3 px-3.5 text-center">Total Hours</th>
                        <th className="py-3 px-3.5 text-center">Attendance %</th>
                        <th className="py-3 px-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthlyReportData.rows.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="py-12 text-center text-slate-400">
                            No attendance records available for this month.
                          </td>
                        </tr>
                      ) : (
                        monthlyReportData.rows.map((row) => (
                          <tr key={row.staff.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-3.5 font-mono font-medium text-slate-600">
                              {row.staff.staffId || "EMP-001"}
                            </td>
                            <td className="py-3 px-3.5 font-bold text-slate-800">
                              {row.staff.name}
                            </td>
                            <td className="py-3 px-3.5 text-slate-600">
                              {row.staff.department || "Operations"}
                            </td>
                            <td className="py-3 px-3.5 text-center font-mono font-semibold">
                              {row.totalWorkingDays}
                            </td>
                            <td className="py-3 px-3.5 text-center font-mono font-bold text-emerald-700 bg-emerald-50/30">
                              {row.presentDays}
                            </td>
                            <td className="py-3 px-3.5 text-center font-mono font-bold text-rose-700 bg-rose-50/30">
                              {row.absentDays}
                            </td>
                            <td className="py-3 px-3.5 text-center font-mono font-semibold text-amber-700">
                              {row.lateDays}
                            </td>
                            <td className="py-3 px-3.5 text-center font-mono font-semibold text-yellow-800">
                              {row.halfDays}
                            </td>
                            <td className="py-3 px-3.5 text-center font-mono font-semibold text-blue-700">
                              {row.leaveDays}
                            </td>
                            <td className="py-3 px-3.5 text-center font-mono">
                              {row.totalHours.toFixed(1)} hrs
                            </td>
                            <td className="py-3 px-3.5 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-[5px] text-[11px] font-bold font-mono ${
                                  row.attendanceRate >= 90
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : row.attendanceRate >= 75
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                              >
                                {row.attendanceRate}%
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-right">
                              <Button
                                variant="secondary"
                                size="xs"
                                onClick={() => setHistoryStaff(row.staff)}
                              >
                                View History
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════
           TAB 3: INTEGRATED PAYROLL & SALARIES
        ══════════════════════════════════════════════════════ */
        <div className="space-y-4">
          <div className="bg-white rounded-[8px] border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Attendance-Integrated Monthly Payroll
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically calculates Paid Days, Unpaid Days, Leave Deductions, and Overtime Pay directly from Staff Attendance logs.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={DollarSign}
              onClick={() => setShowPayrollModal(true)}
            >
              Process Monthly Payroll
            </Button>
          </div>

          <div className="bg-white rounded-[8px] border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Period</th>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 text-right">Basic Salary</th>
                    <th className="py-3 px-4 text-right">Deductions</th>
                    <th className="py-3 px-4 text-right">Overtime Pay</th>
                    <th className="py-3 px-4 text-right">Net Salary</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payrolls.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        No payroll disbursements calculated yet. Click &quot;Process Monthly Payroll&quot; above.
                      </td>
                    </tr>
                  ) : (
                    payrolls.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {p.month} {p.year}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {p.staff?.name || "Staff Member"}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {p.staff?.role || "Staff"}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700 font-mono">
                          {maskCurrency(p.basicSalary || p.baseSalary, revealSalaries)}
                        </td>
                        <td className="py-3 px-4 text-right text-rose-600 font-mono">
                          -{maskCurrency(p.deductions || 0, revealSalaries)}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-600 font-mono">
                          +{maskCurrency(p.overtimePay || 0, revealSalaries)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700 font-mono">
                          {maskCurrency(p.netSalary, revealSalaries)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {p.paymentStatus || p.status || "DISBURSED"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="secondary"
                            size="xs"
                            icon={FileText}
                            onClick={() => setPayslipModalData(p)}
                          >
                            Payslip
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          5. STAFF ATTENDANCE HISTORY MODAL / DRAWER
      ══════════════════════════════════════════════════════ */}
      {historyStaff && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl my-auto bg-white rounded-[8px] p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[6px] bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-sm border border-blue-100">
                  {historyStaff.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">{historyStaff.name}</h3>
                  <div className="text-[11px] text-slate-500">
                    ID: {historyStaff.staffId || "EMP-001"} • Dept: {historyStaff.department || "Operations"} • Role: {historyStaff.role}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryStaff(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto py-4 space-y-4 flex-1 text-xs">
              {/* Monthly Stats Summary for this Staff */}
              {(() => {
                const staffAtts = attendances.filter((a) => a.staffId === historyStaff.id);
                let p = 0;
                let a = 0;
                let l = 0;
                let h = 0;
                let lv = 0;
                let hours = 0;

                staffAtts.forEach((att) => {
                  const st = att.status?.toUpperCase();
                  if (st === "PRESENT") p++;
                  else if (st === "ABSENT") a++;
                  else if (st === "LATE") l++;
                  else if (st === "HALF_DAY") h++;
                  else if (st === "LEAVE") lv++;
                  hours += Number(att.hours || 0);
                });

                const totalLogs = staffAtts.length;
                const attRate = totalLogs > 0 ? Math.round(((p + l + h * 0.5) / totalLogs) * 100) : 0;

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    <div className="p-2.5 bg-slate-50 rounded-[6px] border border-slate-200 text-center">
                      <div className="text-[10px] text-slate-500 font-semibold">Total Logs</div>
                      <div className="text-base font-bold text-slate-800 font-mono">{totalLogs}</div>
                    </div>
                    <div className="p-2.5 bg-emerald-50 rounded-[6px] border border-emerald-200 text-center">
                      <div className="text-[10px] text-emerald-700 font-semibold">Present</div>
                      <div className="text-base font-bold text-emerald-700 font-mono">{p}</div>
                    </div>
                    <div className="p-2.5 bg-rose-50 rounded-[6px] border border-rose-200 text-center">
                      <div className="text-[10px] text-rose-700 font-semibold">Absent</div>
                      <div className="text-base font-bold text-rose-700 font-mono">{a}</div>
                    </div>
                    <div className="p-2.5 bg-amber-50 rounded-[6px] border border-amber-200 text-center">
                      <div className="text-[10px] text-amber-700 font-semibold">Late</div>
                      <div className="text-base font-bold text-amber-700 font-mono">{l}</div>
                    </div>
                    <div className="p-2.5 bg-yellow-50 rounded-[6px] border border-yellow-200 text-center">
                      <div className="text-[10px] text-yellow-800 font-semibold">Half Day</div>
                      <div className="text-base font-bold text-yellow-800 font-mono">{h}</div>
                    </div>
                    <div className="p-2.5 bg-indigo-50 rounded-[6px] border border-indigo-200 text-center">
                      <div className="text-[10px] text-indigo-700 font-semibold">Attendance %</div>
                      <div className="text-base font-bold text-indigo-700 font-mono">{attRate}%</div>
                    </div>
                  </div>
                );
              })()}

              {/* History Table */}
              <div className="border border-slate-200 rounded-[6px] overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Shift Log</th>
                      <th className="py-2.5 px-3">Hours</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Remarks</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendances.filter((a) => a.staffId === historyStaff.id).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No attendance history recorded yet for this staff member.
                        </td>
                      </tr>
                    ) : (
                      attendances
                        .filter((a) => a.staffId === historyStaff.id)
                        .map((att) => {
                          const badge = getStatusBadge(att.status);
                          return (
                            <tr key={att.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-mono font-semibold text-slate-800">
                                {new Date(att.date).toLocaleDateString()}
                              </td>
                              <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">
                                {att.notes && att.notes.includes("IN:")
                                  ? att.notes.split("|").slice(0, 2).join(" • ")
                                  : "Standard Shift (09:00 - 18:00)"}
                              </td>
                              <td className="py-2 px-3 font-mono font-medium">{att.hours} hrs</td>
                              <td className="py-2 px-3">
                                <span className={`inline-block px-2 py-0.5 rounded-[5px] text-[10px] font-bold ${badge.bg}`}>
                                  {badge.label}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-slate-500 truncate max-w-xs">
                                {att.notes ? att.notes.replace(/IN:[^|]*\|?\s*/i, "").replace(/OUT:[^|]*\|?\s*/i, "").trim() : "—"}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <Button
                                  variant="secondary"
                                  size="xs"
                                  icon={Edit2}
                                  onClick={() =>
                                    setEditingAttendance({
                                      id: att.id,
                                      staffId: historyStaff.id,
                                      staffName: historyStaff.name,
                                      date: new Date(att.date).toISOString().split("T")[0],
                                      status: att.status,
                                      checkIn: "09:00",
                                      checkOut: "18:00",
                                      hours: att.hours,
                                      remarks: att.notes || "",
                                    })
                                  }
                                >
                                  Correct
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <Button variant="secondary" size="sm" onClick={() => setHistoryStaff(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          6. ATTENDANCE CORRECTION / EDIT MODAL
      ══════════════════════════════════════════════════════ */}
      {editingAttendance && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md my-auto bg-white rounded-[8px] p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Correct Attendance Record</h3>
                <p className="text-xs text-slate-500">{editingAttendance.staffName}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAttendance(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditedRecord} className="space-y-3.5 pt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={editingAttendance.date}
                  onChange={(e) =>
                    setEditingAttendance({ ...editingAttendance, date: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-[6px] border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Attendance Status *</label>
                <select
                  value={editingAttendance.status}
                  onChange={(e) =>
                    setEditingAttendance({ ...editingAttendance, status: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-[6px] border border-slate-300 bg-white font-semibold"
                >
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LATE">Late</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="LEAVE">On Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Check-In Time</label>
                  <input
                    type="time"
                    value={editingAttendance.checkIn}
                    onChange={(e) =>
                      setEditingAttendance({ ...editingAttendance, checkIn: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-[6px] border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Check-Out Time</label>
                  <input
                    type="time"
                    value={editingAttendance.checkOut}
                    onChange={(e) =>
                      setEditingAttendance({ ...editingAttendance, checkOut: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-[6px] border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Working Hours</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={editingAttendance.hours}
                  onChange={(e) =>
                    setEditingAttendance({ ...editingAttendance, hours: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-[6px] border border-slate-300 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks / Justification</label>
                <input
                  type="text"
                  placeholder="e.g. Approved leave / late with manager permission"
                  value={editingAttendance.remarks}
                  onChange={(e) =>
                    setEditingAttendance({ ...editingAttendance, remarks: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-[6px] border border-slate-300 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingAttendance(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={submitting}
                  icon={Save}
                >
                  Save Correction
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          7. ATTENDANCE CONFIGURATION & POLICY MODAL
      ══════════════════════════════════════════════════════ */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg my-auto bg-white rounded-[8px] p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <SettingsIcon size={18} className="text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">Attendance &amp; Shift Policies</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveAttendanceSettings(attendanceSettings);
              }}
              className="space-y-4 pt-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Office Start Time</label>
                  <input
                    type="time"
                    value={attendanceSettings.officeStartTime}
                    onChange={(e) =>
                      setAttendanceSettings({ ...attendanceSettings, officeStartTime: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-[6px] border border-slate-300 bg-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Standard morning check-in</span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Office Closing Time</label>
                  <input
                    type="time"
                    value={attendanceSettings.officeClosingTime}
                    onChange={(e) =>
                      setAttendanceSettings({ ...attendanceSettings, officeClosingTime: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-[6px] border border-slate-300 bg-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Standard evening checkout</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Grace Period (Minutes)</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={attendanceSettings.gracePeriod}
                    onChange={(e) =>
                      setAttendanceSettings({ ...attendanceSettings, gracePeriod: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-[6px] border border-slate-300 bg-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">e.g. 15 mins window</span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Late Threshold Time</label>
                  <input
                    type="time"
                    value={attendanceSettings.lateThreshold}
                    onChange={(e) =>
                      setAttendanceSettings({ ...attendanceSettings, lateThreshold: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-[6px] border border-slate-300 bg-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Marked late after this time</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Half-Day Threshold (Hours)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="12"
                    value={attendanceSettings.halfDayThreshold}
                    onChange={(e) =>
                      setAttendanceSettings({
                        ...attendanceSettings,
                        halfDayThreshold: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-[6px] border border-slate-300 bg-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Shift under this is Half Day</span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Full Day Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="4"
                    max="16"
                    value={attendanceSettings.minWorkingHours}
                    onChange={(e) =>
                      setAttendanceSettings({
                        ...attendanceSettings,
                        minWorkingHours: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-[6px] border border-slate-300 bg-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Standard 8.0 hours shift</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Weekly Holidays</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {["Sunday", "Saturday", "Friday"].map((day) => {
                    const isChecked = attendanceSettings.weeklyHolidays?.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const list = [...(attendanceSettings.weeklyHolidays || [])];
                          if (isChecked) {
                            setAttendanceSettings({
                              ...attendanceSettings,
                              weeklyHolidays: list.filter((d) => d !== day),
                            });
                          } else {
                            setAttendanceSettings({
                              ...attendanceSettings,
                              weeklyHolidays: [...list, day],
                            });
                          }
                        }}
                        className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold border cursor-pointer ${
                          isChecked
                            ? "bg-blue-50 text-blue-700 border-blue-300"
                            : "bg-white text-slate-600 border-slate-200"
                        }`}
                      >
                        {day} {isChecked ? "✓" : ""}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Overtime Pay Rate</label>
                  <select
                    value={attendanceSettings.overtimeRate}
                    onChange={(e) =>
                      setAttendanceSettings({ ...attendanceSettings, overtimeRate: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-[6px] border border-slate-300 bg-white"
                  >
                    <option value={1.0}>1.0x Regular Rate</option>
                    <option value={1.5}>1.5x Hourly Rate</option>
                    <option value={2.0}>2.0x Double Rate</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Late Deduction Rule</label>
                  <select
                    value={attendanceSettings.lateDeductionRule}
                    onChange={(e) =>
                      setAttendanceSettings({ ...attendanceSettings, lateDeductionRule: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-[6px] border border-slate-300 bg-white"
                  >
                    <option value="3_TO_HALF_DAY">3 Late = 0.5 Day Salary</option>
                    <option value="2_TO_HALF_DAY">2 Late = 0.5 Day Salary</option>
                    <option value="NONE">No Automatic Deduction</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowSettingsModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  icon={Save}
                >
                  Save Policy
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          8. ADD STAFF MODAL
      ══════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg my-auto bg-white rounded-[8px] p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm">Add New Staff Member</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Employee Full Name"
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-[6px] border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department *</label>
                  <select
                    value={staffForm.department}
                    onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-[6px] border border-slate-300 bg-white"
                  >
                    <option value="Billing">Billing &amp; Cashiers</option>
                    <option value="Sales">Sales &amp; Counter</option>
                    <option value="Warehouse">Warehouse &amp; Stock</option>
                    <option value="Management">Management &amp; Admin</option>
                    <option value="Accounts">Accounts &amp; Audit</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role / Designation *</label>
                  <select
                    value={staffForm.role}
                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-[6px] border border-slate-300 bg-white"
                  >
                    <option value="MANAGER">Store Manager</option>
                    <option value="CASHIER">Billing Cashier</option>
                    <option value="SALES_EXECUTIVE">Sales Executive</option>
                    <option value="WAREHOUSE_STAFF">Godown Incharge</option>
                    <option value="ACCOUNTANT">Accountant</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monthly Salary (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 25000"
                    value={staffForm.salary}
                    onChange={(e) => setStaffForm({ ...staffForm, salary: e.target.value })}
                    className="w-full px-3 py-2 rounded-[6px] border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-[6px] border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="staff@bilzet.com"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-[6px] border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={staffForm.joiningDate}
                    onChange={(e) => setStaffForm({ ...staffForm, joiningDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-[6px] border border-slate-300"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={submitting}
                  icon={Save}
                >
                  Save Staff Member
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          9. PAYROLL GENERATOR MODAL
      ══════════════════════════════════════════════════════ */}
      {showPayrollModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md my-auto bg-white rounded-[8px] p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm">Process Attendance-Linked Payroll</h3>
              <button
                type="button"
                onClick={() => setShowPayrollModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGeneratePayroll} className="space-y-4 pt-4 text-xs">
              <p className="text-slate-500 leading-relaxed">
                The ERP engine will automatically calculate:
                <br />• <strong>Paid Days &amp; Unpaid Days</strong>
                <br />• <strong>Leave Deductions</strong>
                <br />• <strong>Late Arrival Penalties</strong>
                <br />• <strong>Overtime Pay calculation</strong>
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Month</label>
                <select
                  value={payrollForm.month}
                  onChange={(e) => setPayrollForm({ ...payrollForm, month: e.target.value })}
                  className="w-full px-3 py-2 rounded-[6px] border border-slate-300 bg-white font-semibold"
                >
                  {[
                    "January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December",
                  ].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Year</label>
                <input
                  type="number"
                  value={payrollForm.year}
                  onChange={(e) => setPayrollForm({ ...payrollForm, year: e.target.value })}
                  className="w-full px-3 py-2 rounded-[6px] border border-slate-300 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowPayrollModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={submitting}
                  icon={DollarSign}
                >
                  Calculate &amp; Disburse
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          10. DETAILED PAYSLIP MODAL
      ══════════════════════════════════════════════════════ */}
      {payslipModalData && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg my-auto bg-white rounded-[8px] p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <DollarSign size={18} className="text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-sm">
                  Salary Payslip • {payslipModalData.month} {payslipModalData.year}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPayslipModalData(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-3.5">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-[6px] border border-slate-200">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{payslipModalData.staff?.name}</div>
                  <div className="text-[11px] text-slate-500">
                    ID: {payslipModalData.staff?.staffId} • {payslipModalData.staff?.role}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-[5px] text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {payslipModalData.paymentStatus || "PAID"}
                </span>
              </div>

              <div className="space-y-2 border border-slate-200 rounded-[6px] p-3">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Basic Salary</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {maskCurrency(payslipModalData.basicSalary || payslipModalData.baseSalary, revealSalaries)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Attendance Leave / Late Deductions</span>
                  <span className="font-mono font-semibold text-rose-600">
                    -{maskCurrency(payslipModalData.deductions || 0, revealSalaries)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Overtime Hours Compensation</span>
                  <span className="font-mono font-semibold text-emerald-600">
                    +{maskCurrency(payslipModalData.overtimePay || 0, revealSalaries)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 pt-2 text-sm font-bold bg-slate-50 px-2 rounded">
                  <span className="text-slate-900">Net Disbursed Amount</span>
                  <span className="font-mono text-emerald-700">
                    {maskCurrency(payslipModalData.netSalary, revealSalaries)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                icon={Printer}
                onClick={() => window.print()}
              >
                Print Slip
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPayslipModalData(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete / Deactivate Employee Confirmation Dialog ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                <Trash2 size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">Delete Employee?</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Are you sure you want to delete or deactivate <strong className="text-slate-900 font-bold">{deleteTarget.name}</strong> ({deleteTarget.role})?
                </p>
                <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
                  This action may affect future access to the application. Historical attendance and payroll records will be preserved where required.
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                loading={deleting}
                onClick={handleConfirmDelete}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Staff Profile Modal ── */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Edit2 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Employee Profile</h3>
                  <p className="text-[11px] text-slate-500">Update employment details for {editingStaff.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Role *</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                  >
                    <option value="Manager">Manager</option>
                    <option value="Cashier">Cashier</option>
                    <option value="Staff">Staff</option>
                    <option value="Inventory & Godown Staff">Inventory Staff</option>
                    <option value="Procurement Specialist">Procurement Specialist</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Department</label>
                  <input
                    type="text"
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive / Deactivated</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {canViewSalaries && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Monthly Salary (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.salary}
                    onChange={(e) => setEditForm({ ...editForm, salary: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-mono"
                  />
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  disabled={savingEdit}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  icon={Save}
                  loading={savingEdit}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Employee Details Dossier Modal ── */}
      {detailsStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-sm border border-blue-100">
                  {detailsStaff.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{detailsStaff.name}</h3>
                  <p className="text-[11px] font-mono text-slate-500">ID: {detailsStaff.staffId || "EMP-001"} • {detailsStaff.role}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailsStaff(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px] font-medium">Department</span>
                <span className="font-semibold text-slate-800">{detailsStaff.department || "Operations"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-medium">Status</span>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                    detailsStaff.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {detailsStaff.status || "ACTIVE"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-medium">Phone</span>
                <span className="text-slate-700 font-mono">{detailsStaff.phone || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-medium">Email</span>
                <span className="text-slate-700 truncate block">{detailsStaff.email || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-medium">Joining Date</span>
                <span className="text-slate-700">
                  {detailsStaff.joiningDate ? new Date(detailsStaff.joiningDate).toLocaleDateString() : "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-medium">Monthly Salary</span>
                <span className="font-mono font-semibold text-slate-800">
                  {maskSalary(detailsStaff.salary, revealSalaries, "/mo")}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                icon={CalendarCheck2}
                onClick={() => {
                  const target = detailsStaff;
                  setDetailsStaff(null);
                  setHistoryStaff(target);
                }}
              >
                View Attendance Logs
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDetailsStaff(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
