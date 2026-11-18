/**
 * Date and Timezone Utilities for BILZET
 *
 * Provides accurate, server-timezone-independent business date calculations
 * anchored to Indian Standard Time (Asia/Kolkata, UTC+05:30) or any configured IANA timezone.
 *
 * All dates returned for database queries (start/end boundaries) are authoritative UTC Date objects
 * matching exact midnight-to-midnight (00:00:00.000 to 23:59:59.999) in the business timezone.
 */

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * Parses an offset string or calculates UTC offset in minutes for a timezone at a given instant.
 * For Asia/Kolkata, it is always +330 minutes (+05:30).
 */
export function getTimezoneOffsetMinutes(timezone = DEFAULT_TIMEZONE, date = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'longOffset',
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value || '';
    // Format is like "GMT+05:30" or "GMT" or "GMT-08:00"
    const match = tzPart.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
    if (!match) return 330; // fallback to IST
    const sign = match[1] === '-' ? -1 : 1;
    const hours = parseInt(match[2], 10) || 0;
    const minutes = parseInt(match[3] || '0', 10) || 0;
    return sign * (hours * 60 + minutes);
  } catch {
    return 330;
  }
}

/**
 * Returns the current date in YYYY-MM-DD format within the given timezone.
 */
export function getCurrentDateInTimezone(timezone = DEFAULT_TIMEZONE, now = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now); // en-CA gives YYYY-MM-DD
}

/**
 * Returns date parts { year, month, day, hour, minute, second } in the given timezone.
 */
export function getDateTimePartsInTimezone(timezone = DEFAULT_TIMEZONE, date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10);

  return {
    year: get('year'),
    month: get('month'), // 1-12
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

/**
 * Converts a YYYY-MM-DD date in a business timezone into authoritative UTC boundaries:
 * startOfDay: YYYY-MM-DD 00:00:00.000 in timezone converted to UTC Date
 * endOfDay:   YYYY-MM-DD 23:59:59.999 in timezone converted to UTC Date
 *
 * Example for Asia/Kolkata on 2026-11-18:
 * - startOfDay: 2026-11-17T18:30:00.000Z
 * - endOfDay:   2026-11-18T18:29:59.999Z
 */
export function getBusinessDayRange(dateString = null, timezone = DEFAULT_TIMEZONE) {
  let targetDate = dateString;
  if (!targetDate) {
    targetDate = getCurrentDateInTimezone(timezone);
  }

  // Parse YYYY-MM-DD
  const [yearStr, monthStr, dayStr] = targetDate.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (!year || !month || !day) {
    throw new Error(`Invalid date string: ${dateString}. Expected format: YYYY-MM-DD`);
  }

  // Get timezone offset in minutes at midnight of that date
  // We approximate using UTC midday to check offset
  const approxDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const offsetMinutes = getTimezoneOffsetMinutes(timezone, approxDate);

  // Midnight in local timezone = UTC timestamp (year, month - 1, day, 0, 0, 0) minus offset
  const startUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - offsetMinutes * 60 * 1000;
  const endUtcMs = Date.UTC(year, month - 1, day, 23, 59, 59, 999) - offsetMinutes * 60 * 1000;

  return {
    date: targetDate,
    startOfDay: new Date(startUtcMs),
    endOfDay: new Date(endUtcMs),
  };
}

/**
 * Calculates remaining seconds until the next midnight (start of next business day)
 * in the specified timezone.
 */
export function getSecondsUntilNextBusinessDay(timezone = DEFAULT_TIMEZONE, now = new Date()) {
  const parts = getDateTimePartsInTimezone(timezone, now);
  const secondsElapsedToday = parts.hour * 3600 + parts.minute * 60 + parts.second;
  const totalSecondsInDay = 86400;
  const remaining = totalSecondsInDay - secondsElapsedToday;
  return Math.max(0, remaining);
}

/**
 * Calculates window boundaries for any predefined or custom dashboard date range.
 * Supported ranges:
 * - 'today': Current business day (00:00:00 to 23:59:59)
 * - 'yesterday': Previous business day (00:00:00 to 23:59:59)
 * - 'week' / 'last7days': Past 7 business days ending today 23:59:59
 * - 'last30days': Past 30 business days
 * - 'month': Current calendar month from 1st to end of month
 * - 'lastMonth': Previous calendar month
 * - 'year' / 'fy': Indian Financial Year (April 1 to March 31)
 * - 'lastFy': Previous Indian Financial Year
 */
export function getRangeWindow(rangeKey = 'today', timezone = DEFAULT_TIMEZONE, customParams = {}) {
  const todayStr = getCurrentDateInTimezone(timezone);
  const todayRange = getBusinessDayRange(todayStr, timezone);

  const [tYear, tMonth, tDay] = todayStr.split('-').map((v) => parseInt(v, 10));

  switch (rangeKey) {
    case 'today':
      return {
        rangeKey: 'today',
        label: "Today",
        startDate: todayStr,
        endDate: todayStr,
        startUtc: todayRange.startOfDay,
        endUtc: todayRange.endOfDay,
      };

    case 'yesterday': {
      // Calculate yesterday date string
      const yDate = new Date(Date.UTC(tYear, tMonth - 1, tDay - 1, 12, 0, 0));
      const yStr = getCurrentDateInTimezone(timezone, yDate);
      const yRange = getBusinessDayRange(yStr, timezone);
      return {
        rangeKey: 'yesterday',
        label: "Yesterday",
        startDate: yStr,
        endDate: yStr,
        startUtc: yRange.startOfDay,
        endUtc: yRange.endOfDay,
      };
    }

    case 'week':
    case 'last7days': {
      const startD = new Date(Date.UTC(tYear, tMonth - 1, tDay - 6, 12, 0, 0));
      const startStr = getCurrentDateInTimezone(timezone, startD);
      const startRange = getBusinessDayRange(startStr, timezone);
      return {
        rangeKey: 'week',
        label: "Last 7 Days",
        startDate: startStr,
        endDate: todayStr,
        startUtc: startRange.startOfDay,
        endUtc: todayRange.endOfDay,
      };
    }

    case 'last30days': {
      const startD = new Date(Date.UTC(tYear, tMonth - 1, tDay - 29, 12, 0, 0));
      const startStr = getCurrentDateInTimezone(timezone, startD);
      const startRange = getBusinessDayRange(startStr, timezone);
      return {
        rangeKey: 'last30days',
        label: "Last 30 Days",
        startDate: startStr,
        endDate: todayStr,
        startUtc: startRange.startOfDay,
        endUtc: todayRange.endOfDay,
      };
    }

    case 'month': {
      // 1st of current month to end of current month
      const startStr = `${tYear}-${String(tMonth).padStart(2, '0')}-01`;
      const lastDayOfMonth = new Date(Date.UTC(tYear, tMonth, 0)).getUTCDate();
      const endStr = `${tYear}-${String(tMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
      const startRange = getBusinessDayRange(startStr, timezone);
      const endRange = getBusinessDayRange(endStr, timezone);
      return {
        rangeKey: 'month',
        label: "This Month",
        startDate: startStr,
        endDate: endStr,
        startUtc: startRange.startOfDay,
        endUtc: endRange.endOfDay,
      };
    }

    case 'lastMonth': {
      let lYear = tYear;
      let lMonth = tMonth - 1;
      if (lMonth < 1) {
        lMonth = 12;
        lYear -= 1;
      }
      const startStr = `${lYear}-${String(lMonth).padStart(2, '0')}-01`;
      const lastDayOfMonth = new Date(Date.UTC(lYear, lMonth, 0)).getUTCDate();
      const endStr = `${lYear}-${String(lMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
      const startRange = getBusinessDayRange(startStr, timezone);
      const endRange = getBusinessDayRange(endStr, timezone);
      return {
        rangeKey: 'lastMonth',
        label: "Previous Month",
        startDate: startStr,
        endDate: endStr,
        startUtc: startRange.startOfDay,
        endUtc: endRange.endOfDay,
      };
    }

    case 'year':
    case 'fy': {
      // Indian Financial Year: April 1 to March 31
      let fyStartYear = tYear;
      if (tMonth < 4) {
        fyStartYear = tYear - 1;
      }
      const fyEndYear = fyStartYear + 1;
      const startStr = `${fyStartYear}-04-01`;
      const endStr = `${fyEndYear}-03-31`;
      const startRange = getBusinessDayRange(startStr, timezone);
      const endRange = getBusinessDayRange(endStr, timezone);
      return {
        rangeKey: 'year',
        label: `FY ${String(fyStartYear).slice(-2)}-${String(fyEndYear).slice(-2)}`,
        startDate: startStr,
        endDate: endStr,
        startUtc: startRange.startOfDay,
        endUtc: endRange.endOfDay,
      };
    }

    case 'lastFy': {
      let fyStartYear = tYear - 1;
      if (tMonth < 4) {
        fyStartYear = tYear - 2;
      }
      const fyEndYear = fyStartYear + 1;
      const startStr = `${fyStartYear}-04-01`;
      const endStr = `${fyEndYear}-03-31`;
      const startRange = getBusinessDayRange(startStr, timezone);
      const endRange = getBusinessDayRange(endStr, timezone);
      return {
        rangeKey: 'lastFy',
        label: `FY ${String(fyStartYear).slice(-2)}-${String(fyEndYear).slice(-2)}`,
        startDate: startStr,
        endDate: endStr,
        startUtc: startRange.startOfDay,
        endUtc: endRange.endOfDay,
      };
    }

    case 'custom': {
      const fromStr = customParams.startDate || todayStr;
      const toStr = customParams.endDate || todayStr;
      const startRange = getBusinessDayRange(fromStr, timezone);
      const endRange = getBusinessDayRange(toStr, timezone);
      return {
        rangeKey: 'custom',
        label: `${fromStr} to ${toStr}`,
        startDate: fromStr,
        endDate: toStr,
        startUtc: startRange.startOfDay,
        endUtc: endRange.endOfDay,
      };
    }

    default:
      return {
        rangeKey: 'today',
        label: "Today",
        startDate: todayStr,
        endDate: todayStr,
        startUtc: todayRange.startOfDay,
        endUtc: todayRange.endOfDay,
      };
  }
}

export default {
  DEFAULT_TIMEZONE,
  getTimezoneOffsetMinutes,
  getCurrentDateInTimezone,
  getDateTimePartsInTimezone,
  getBusinessDayRange,
  getSecondsUntilNextBusinessDay,
  getRangeWindow,
};
