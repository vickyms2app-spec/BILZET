import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  UserCheck,
  Plus,
  Calendar,
  DollarSign,
  Search,
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
} from "lucide-react";
import { staffApi } from "../api";

export default function StaffManagement({ defaultTab = "directory" }) {
  const location = useLocation();
  const initialTab = location.pathname.includes("payroll") ? "payroll" : defaultTab;
  const [activeTab, setActiveTab] = useState(initialTab);
  const [staffList, setStaffList] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);

  // Forms
  const [staffForm, setStaffForm] = useState({
    name: "",
    role: "CASHIER",
    phone: "",
    email: "",
    salary: "",
    joiningDate: new Date().toISOString().split("T")[0],
  });

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceEntries, setAttendanceEntries] = useState({});

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

  const loadData = async () => {
    setLoading(true);
    try {
      const [sRes, aRes, pRes] = await Promise.all([
        staffApi.list(),
        staffApi.attendance(),
        staffApi.payroll(),
      ]);
      const list = sRes?.staff || [];
      setStaffList(list);
      setAttendances(aRes?.attendances || []);
      setPayrolls(pRes?.payrolls || []);

      // initialize default attendance states
      const initial = {};
      list.forEach((s) => {
        initial[s.id] = "PRESENT";
      });
      setAttendanceEntries(initial);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const handleSaveAttendance = async () => {
    setSubmitting(true);
    try {
      // Mark attendance for all staff
      const promises = Object.entries(attendanceEntries).map(([staffId, status]) =>
        staffApi.markAttendance({
          staffId,
          date: selectedDate,
          status,
        })
      );
      await Promise.all(promises);
      notify("success", `Attendance recorded for ${selectedDate}!`);
      setShowAttendanceModal(false);
      loadData();
    } catch (err) {
      notify("error", err.response?.data?.error || err.message || "Failed to record attendance");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGeneratePayroll = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await staffApi.generatePayroll(payrollForm);
      notify("success", `Payroll processed for ${payrollForm.month} ${payrollForm.year}!`);
      setShowPayrollModal(false);
      loadData();
    } catch (err) {
      notify("error", err.response?.data?.error || err.message || "Failed to generate payroll");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto fade-up">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <UserCheck size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Staff, Attendance & Payroll
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Employee roster, daily shift check-ins and monthly salary disbursement calculations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {activeTab === "directory" && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-2xs"
            >
              <Plus size={15} />
              <span>Add Staff</span>
            </button>
          )}
          {activeTab === "attendance" && (
            <button
              onClick={() => setShowAttendanceModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-2xs"
            >
              <Calendar size={14} />
              <span>Mark Daily Attendance</span>
            </button>
          )}
          {activeTab === "payroll" && (
            <button
              onClick={() => setShowPayrollModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-2xs"
            >
              <Plus size={15} />
              <span>Process Payroll</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {message.text && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
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

      {/* ── Tabs & Search ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("directory")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "directory"
                ? "bg-white text-slate-800 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users size={14} />
            <span>Staff Roster ({staffList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("attendance")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "attendance"
                ? "bg-white text-slate-800 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Calendar size={14} />
            <span>Attendance Log ({attendances.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("payroll")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "payroll"
                ? "bg-white text-slate-800 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <DollarSign size={14} />
            <span>Payroll & Salaries ({payrolls.length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee or role..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* ── Content View ── */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <RefreshCw size={24} className="animate-spin text-emerald-600" />
          <p className="text-xs text-slate-500">Loading staff records & payroll…</p>
        </div>
      ) : activeTab === "directory" ? (
        /* Staff Directory Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {staffList
            .filter(
              (s) =>
                s.name.toLowerCase().includes(search.toLowerCase()) ||
                s.role.toLowerCase().includes(search.toLowerCase())
            )
            .map((staff) => (
              <div
                key={staff.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100/70 text-emerald-700 font-bold flex items-center justify-center text-sm">
                        {staff.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">{staff.name}</h3>
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80 mt-0.5">
                          {staff.role}
                        </span>
                      </div>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
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

                <div className="mt-4 pt-2 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500">
                    Base Salary:{" "}
                    <strong className="text-slate-800">
                      ₹{Number(staff.salary || 0).toLocaleString("en-IN")}/mo
                    </strong>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>
              </div>
            ))}
        </div>
      ) : activeTab === "attendance" ? (
        /* Attendance History Table */
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Attendance Status</th>
                  <th className="py-3 px-4">Notes / Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendances.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No attendance logged yet. Click "Mark Daily Attendance" to record today's shift.
                    </td>
                  </tr>
                ) : (
                  attendances.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono font-medium text-slate-600">
                        {new Date(a.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {a.staff?.name || "Staff Member"}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{a.staff?.role || "Staff"}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            a.status === "PRESENT"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : a.status === "HALF_DAY"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : a.status === "LEAVE"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{a.notes || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Payroll Table */
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-xs">Staff Payroll & Salary Statements</h3>
              <p className="text-[11px] text-slate-400">Monthly payout records, working days and deductions</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Month / Period</th>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4 text-right">Base Salary</th>
                  <th className="py-3 px-4 text-right">Deductions</th>
                  <th className="py-3 px-4 text-right">Net Payable</th>
                  <th className="py-3 px-4">Payment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payrolls.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No payroll disbursements calculated yet. Click "Process Month Payroll" above.
                    </td>
                  </tr>
                ) : (
                  payrolls.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {p.month} {p.year}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {p.staff?.name || "Staff Member"}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        ₹{Number(p.baseSalary || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 text-right text-rose-600">
                        ₹{Number(p.deductions || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">
                        ₹{Number(p.netSalary || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {p.status || "DISBURSED"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add Staff Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg my-auto bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Add New Staff Member</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Employee Name"
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role / Designation *</label>
                  <select
                    value={staffForm.role}
                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="MANAGER">Store Manager</option>
                    <option value="CASHIER">Billing Cashier</option>
                    <option value="SALES_EXECUTIVE">Sales Executive</option>
                    <option value="WAREHOUSE_STAFF">Godown Incharge</option>
                    <option value="ACCOUNTANT">Accountant</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monthly Salary (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 25000"
                    value={staffForm.salary}
                    onChange={(e) => setStaffForm({ ...staffForm, salary: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="staff@bilzet.com"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Joining Date</label>
                <input
                  type="date"
                  value={staffForm.joiningDate}
                  onChange={(e) => setStaffForm({ ...staffForm, joiningDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2"
                >
                  {submitting && <RefreshCw size={13} className="animate-spin" />}
                  <span>Save Staff Member</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Attendance Modal ── */}
      {showAttendanceModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg my-auto bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Mark Daily Staff Attendance</h3>
              <button
                onClick={() => setShowAttendanceModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Attendance Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {staffList.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/80"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{s.name}</p>
                      <p className="text-[10px] text-slate-500">{s.role}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      {["PRESENT", "HALF_DAY", "ABSENT"].map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() =>
                            setAttendanceEntries((prev) => ({ ...prev, [s.id]: st }))
                          }
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                            attendanceEntries[s.id] === st
                              ? st === "PRESENT"
                                ? "bg-emerald-600 text-white"
                                : st === "HALF_DAY"
                                ? "bg-amber-500 text-white"
                                : "bg-rose-600 text-white"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {st === "PRESENT" ? "Present" : st === "HALF_DAY" ? "Half" : "Absent"}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAttendanceModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2"
                >
                  {submitting && <RefreshCw size={13} className="animate-spin" />}
                  <span>Save Attendance</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Payroll Generator Modal ── */}
      {showPayrollModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md my-auto bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Generate Monthly Payroll</h3>
              <button
                onClick={() => setShowPayrollModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleGeneratePayroll} className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Month</label>
                  <select
                    value={payrollForm.month}
                    onChange={(e) => setPayrollForm({ ...payrollForm, month: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    {[
                      "January",
                      "February",
                      "March",
                      "April",
                      "May",
                      "June",
                      "July",
                      "August",
                      "September",
                      "October",
                      "November",
                      "December",
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
                    onChange={(e) =>
                      setPayrollForm({ ...payrollForm, year: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                This will automatically calculate salaries for all active staff members based on their registered base monthly salary minus any leave/unpaid absent days.
              </p>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPayrollModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2"
                >
                  {submitting && <RefreshCw size={13} className="animate-spin" />}
                  <span>Calculate & Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
