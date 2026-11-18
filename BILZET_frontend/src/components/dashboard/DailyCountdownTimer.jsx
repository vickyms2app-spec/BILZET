import { useState, useEffect, useRef, useCallback } from "react";
import { Clock, Sparkles } from "lucide-react";

/**
 * Calculates remaining seconds until the next 00:00:00 midnight
 * in the specified business timezone (defaults to Asia/Kolkata).
 */
function getSecondsToMidnight(timezone = "Asia/Kolkata") {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const get = (type) => parseInt(parts.find((p) => p.type === type)?.value || "0", 10);
    const hour = get("hour") % 24;
    const minute = get("minute");
    const second = get("second");
    const elapsed = hour * 3600 + minute * 60 + second;
    return Math.max(0, 86400 - elapsed);
  } catch (err) {
    // Fallback: standard UTC+5:30 offset
    const nowUtc = Date.now();
    const istOffset = 5.5 * 3600 * 1000;
    const istTime = new Date(nowUtc + istOffset);
    const elapsed =
      istTime.getUTCHours() * 3600 +
      istTime.getUTCMinutes() * 60 +
      istTime.getUTCSeconds();
    return Math.max(0, 86400 - elapsed);
  }
}

/**
 * Returns current business date string (YYYY-MM-DD) in the specified timezone.
 */
function getCurrentDateString(timezone = "Asia/Kolkata") {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date());
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

export default function DailyCountdownTimer({
  dateRange = "today",
  timezone = "Asia/Kolkata",
  onMidnightReset,
  initialSeconds = null,
}) {
  const [remainingSeconds, setRemainingSeconds] = useState(() => {
    if (typeof initialSeconds === "number" && initialSeconds > 0) return initialSeconds;
    return getSecondsToMidnight(timezone);
  });

  const [newDayAnnounced, setNewDayAnnounced] = useState(false);
  const lastDateRef = useRef(getCurrentDateString(timezone));
  const onMidnightResetRef = useRef(onMidnightReset);

  useEffect(() => {
    onMidnightResetRef.current = onMidnightReset;
  }, [onMidnightReset]);

  // Keep remainingSeconds in sync if initialSeconds updates from authoritative server response
  useEffect(() => {
    if (typeof initialSeconds === "number" && initialSeconds > 0) {
      setRemainingSeconds(initialSeconds);
    }
  }, [initialSeconds]);

  // Stable handler for day transition
  const handleDayTransition = useCallback(() => {
    const newDate = getCurrentDateString(timezone);
    lastDateRef.current = newDate;
    setNewDayAnnounced(true);

    // Announce new business day for 8 seconds
    setTimeout(() => {
      setNewDayAnnounced(false);
    }, 8000);

    // Trigger authoritative non-destructive backend refresh
    if (typeof onMidnightResetRef.current === "function") {
      onMidnightResetRef.current(newDate);
    }

    // Reset countdown to fresh 24 hours
    setRemainingSeconds(getSecondsToMidnight(timezone));
  }, [timezone]);

  // 1-second interval live countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        // Check date rollover
        const currentDate = getCurrentDateString(timezone);
        if (currentDate !== lastDateRef.current) {
          handleDayTransition();
          return getSecondsToMidnight(timezone);
        }

        if (prev <= 1) {
          handleDayTransition();
          return 86400;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timezone, handleDayTransition]);

  // Detect day change on tab visibility return or window focus (overnight sleep recovery)
  useEffect(() => {
    const checkFreshness = () => {
      const currentDate = getCurrentDateString(timezone);
      if (currentDate !== lastDateRef.current) {
        handleDayTransition();
      } else {
        // Re-align seconds with authoritative clock
        setRemainingSeconds(getSecondsToMidnight(timezone));
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkFreshness();
      }
    };

    window.addEventListener("focus", checkFreshness);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", checkFreshness);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [timezone, handleDayTransition]);

  // Format HH : MM : SS
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  const pad = (n) => String(n).padStart(2, "0");

  const label = dateRange === "today" ? "Daily Closing In" : "Next Daily Reset";

  if (newDayAnnounced) {
    return (
      <div
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#DFFFE6] border border-[#5BF07B]/40 text-[#0E2A16] shadow-xs text-xs font-semibold animate-pulse"
        title="Midnight boundary reached. Daily counters successfully recalculated from zero."
      >
        <span className="w-2 h-2 rounded-full bg-[#5BF07B]" />
        <Sparkles size={13} className="text-[#0E2A16]" />
        <span>New Business Day Started</span>
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E7E8EC] shadow-xs hover:border-[#111318]/20 transition-all select-none"
      title={`Business Timezone: ${timezone} (IST). Counters recalculate from zero at 00:00:00.`}
    >
      <div className="w-5 h-5 rounded-full bg-[#12151C] text-[#5BF07B] flex items-center justify-center shrink-0">
        <Clock size={11} strokeWidth={2.5} />
      </div>

      <div className="flex items-center gap-1.5 text-xs leading-none">
        <span className="text-[11px] font-medium text-[#7C7F8A] hidden sm:inline">
          {label}
        </span>
        <span className="text-[11px] font-medium text-[#7C7F8A] sm:hidden">
          Closing:
        </span>

        <span className="font-mono font-bold text-[#111318] tracking-tight text-xs flex items-center gap-0.5">
          <span className="bg-[#F6F6F8] px-1 py-0.5 rounded text-[11px]">{pad(hours)}</span>
          <span className="text-[#7C7F8A] text-[10px]">:</span>
          <span className="bg-[#F6F6F8] px-1 py-0.5 rounded text-[11px]">{pad(minutes)}</span>
          <span className="text-[#7C7F8A] text-[10px]">:</span>
          <span className="bg-[#F6F6F8] px-1 py-0.5 rounded text-[11px]">{pad(seconds)}</span>
        </span>
      </div>
    </div>
  );
}
