import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CalendarRange,
  RotateCcw,
} from "lucide-react";

const MONTH_NAMES = [
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
];

export default function DateNavigator({
  initialView = "day", // 'day' | 'month' | 'year' | 'range'
  onChange,
  className = "",
  showPresets = true,
}) {
  const [viewMode, setViewMode] = useState(initialView);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [customRange, setCustomRange] = useState({
    start: new Date().toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  // Calculate days in selected month and year
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

  // Helper formatting
  const formatDayLabel = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

    const dayName = target.toLocaleDateString("en-US", { weekday: "short" });
    const formatted = target.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    if (diffDays === 0) return `Today · ${formatted}`;
    if (diffDays === -1) return `Yesterday · ${formatted}`;
    if (diffDays === 1) return `Tomorrow · ${formatted}`;
    return `${dayName} · ${formatted}`;
  };

  // Emit changes to parent
  useEffect(() => {
    if (!onChange) return;

    if (viewMode === "day") {
      const start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(currentDate);
      end.setHours(23, 59, 59, 999);
      onChange({
        mode: "day",
        date: currentDate,
        startDate: start,
        endDate: end,
        label: formatDayLabel(currentDate),
      });
    } else if (viewMode === "month") {
      const start = new Date(selectedYear, selectedMonth, 1, 0, 0, 0, 0);
      const totalDays = getDaysInMonth(selectedYear, selectedMonth);
      const end = new Date(selectedYear, selectedMonth, totalDays, 23, 59, 59, 999);
      onChange({
        mode: "month",
        month: selectedMonth,
        year: selectedYear,
        daysCount: totalDays,
        startDate: start,
        endDate: end,
        label: `${MONTH_NAMES[selectedMonth]} ${selectedYear} (${totalDays} days)`,
      });
    } else if (viewMode === "year") {
      const start = new Date(selectedYear, 0, 1, 0, 0, 0, 0);
      const end = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
      onChange({
        mode: "year",
        year: selectedYear,
        startDate: start,
        endDate: end,
        label: `Year ${selectedYear}`,
      });
    } else if (viewMode === "range") {
      const start = new Date(customRange.start);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customRange.end);
      end.setHours(23, 59, 59, 999);
      onChange({
        mode: "range",
        startDate: start,
        endDate: end,
        label: `${customRange.start} to ${customRange.end}`,
      });
    }
  }, [viewMode, currentDate, selectedMonth, selectedYear, customRange]);

  // Day Navigation Handlers
  const handlePrevDay = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() - 1);
    setCurrentDate(next);
  };

  const handleNextDay = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const handleGoToday = () => {
    setCurrentDate(new Date());
    setSelectedMonth(new Date().getMonth());
    setSelectedYear(new Date().getFullYear());
  };

  // Month Navigation Handlers
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // Year Navigation Handlers
  const handlePrevYear = () => setSelectedYear((y) => y - 1);
  const handleNextYear = () => setSelectedYear((y) => y + 1);

  // Quick Preset Handlers
  const applyPreset = (preset) => {
    const today = new Date();
    if (preset === "today") {
      setViewMode("day");
      setCurrentDate(today);
    } else if (preset === "yesterday") {
      setViewMode("day");
      const y = new Date();
      y.setDate(y.getDate() - 1);
      setCurrentDate(y);
    } else if (preset === "thisWeek") {
      setViewMode("range");
      const start = new Date(today);
      const day = start.getDay() || 7;
      start.setDate(start.getDate() - day + 1);
      setCustomRange({
        start: start.toISOString().split("T")[0],
        end: today.toISOString().split("T")[0],
      });
    } else if (preset === "thisMonth") {
      setViewMode("month");
      setSelectedMonth(today.getMonth());
      setSelectedYear(today.getFullYear());
    } else if (preset === "thisYear") {
      setViewMode("year");
      setSelectedYear(today.getFullYear());
    }
  };

  // Dynamic years list from currentYear-5 to currentYear+5
  const currentSystemYear = new Date().getFullYear();
  const yearsList = Array.from({ length: 11 }, (_, i) => currentSystemYear - 5 + i);

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-2xs space-y-3 ${className}`}
    >
      {/* ── Top View Mode Pills & Preset Triggers ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => setViewMode("day")}
            className={`px-3 py-1.5 rounded-lg transition ${
              viewMode === "day"
                ? "bg-white text-blue-600 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Day View
          </button>
          <button
            type="button"
            onClick={() => setViewMode("month")}
            className={`px-3 py-1.5 rounded-lg transition ${
              viewMode === "month"
                ? "bg-white text-blue-600 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Month View
          </button>
          <button
            type="button"
            onClick={() => setViewMode("year")}
            className={`px-3 py-1.5 rounded-lg transition ${
              viewMode === "year"
                ? "bg-white text-blue-600 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Year View
          </button>
          <button
            type="button"
            onClick={() => setViewMode("range")}
            className={`px-3 py-1.5 rounded-lg transition ${
              viewMode === "range"
                ? "bg-white text-blue-600 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Custom Range
          </button>
        </div>

        {showPresets && (
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-semibold text-slate-500">
            <span className="text-slate-400 mr-1 hidden sm:inline">Presets:</span>
            <button
              type="button"
              onClick={() => applyPreset("today")}
              className="px-2 py-1 rounded-md bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 transition"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => applyPreset("yesterday")}
              className="px-2 py-1 rounded-md bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 transition"
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => applyPreset("thisWeek")}
              className="px-2 py-1 rounded-md bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 transition"
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => applyPreset("thisMonth")}
              className="px-2 py-1 rounded-md bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 transition"
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => applyPreset("thisYear")}
              className="px-2 py-1 rounded-md bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 transition"
            >
              This Year
            </button>
          </div>
        )}
      </div>

      {/* ── Active Date Controls ── */}
      {viewMode === "day" && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition"
              title="Previous Day"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-blue-100 bg-blue-50/50">
              <CalendarIcon size={16} className="text-blue-600 shrink-0" />
              <span className="font-bold text-slate-800 text-xs sm:text-sm tracking-tight">
                {formatDayLabel(currentDate)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextDay}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition"
              title="Next Day"
            >
              <ChevronRight size={16} />
            </button>

            <button
              type="button"
              onClick={handleGoToday}
              className="ml-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
            >
              <RotateCcw size={12} />
              <span>Today</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs text-slate-400 whitespace-nowrap">Pick date:</label>
            <input
              type="date"
              value={currentDate.toISOString().split("T")[0]}
              onChange={(e) => {
                if (e.target.value) setCurrentDate(new Date(e.target.value));
              }}
              className="w-full sm:w-auto px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500 font-mono"
            />
          </div>
        </div>
      )}

      {viewMode === "month" && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition"
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-1.5 text-xs sm:text-sm font-bold border border-slate-200 rounded-xl bg-white outline-none focus:border-blue-500 cursor-pointer"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-1.5 text-xs sm:text-sm font-bold border border-slate-200 rounded-xl bg-white outline-none focus:border-blue-500 cursor-pointer"
              >
                {yearsList.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition"
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <span className="text-xs text-slate-500 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200/60">
            Total Days:{" "}
            <strong className="text-slate-800">
              {getDaysInMonth(selectedYear, selectedMonth)} days
            </strong>
          </span>
        </div>
      )}

      {viewMode === "year" && (
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevYear}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition"
              title="Previous Year"
            >
              <ChevronLeft size={16} />
            </button>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-1.5 text-sm font-bold border border-blue-200 bg-blue-50/50 text-blue-900 rounded-xl outline-none focus:border-blue-500 cursor-pointer"
            >
              {yearsList.map((y) => (
                <option key={y} value={y}>
                  Fiscal &amp; Calendar Year {y}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleNextYear}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition"
              title="Next Year"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <span className="text-xs text-slate-400">12 Months · 4 Quarters</span>
        </div>
      )}

      {viewMode === "range" && (
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-600">From:</span>
            <input
              type="date"
              value={customRange.start}
              onChange={(e) =>
                setCustomRange((prev) => ({ ...prev, start: e.target.value }))
              }
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500 font-mono w-full sm:w-auto"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-600">To:</span>
            <input
              type="date"
              value={customRange.end}
              onChange={(e) =>
                setCustomRange((prev) => ({ ...prev, end: e.target.value }))
              }
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500 font-mono w-full sm:w-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
