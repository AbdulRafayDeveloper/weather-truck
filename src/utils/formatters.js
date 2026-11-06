const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n) => String(n).padStart(2, '0');

export function formatDuration(seconds) {
  if (seconds == null || isNaN(seconds) || seconds < 0) return '—';
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatDistance(miles) {
  if (miles == null || isNaN(miles)) return '—';
  const value = Number(miles).toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${value} mi`;
}

export function formatRiskMiles(miles) {
  if (miles == null || isNaN(miles)) return '0.00 mi';
  return `${Number(miles).toFixed(2)} mi`;
}

export function formatDeltaDuration(seconds) {
  if (seconds == null || isNaN(seconds)) return '';
  const sign = seconds >= 0 ? '+' : '−';
  const totalMinutes = Math.round(Math.abs(seconds) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0 && mins === 0) return '0m';
  if (hours === 0) return `${sign}${mins}m`;
  if (mins === 0) return `${sign}${hours}h`;
  return `${sign}${hours}h ${mins}m`;
}

export function formatDeltaDistance(deltaMiles) {
  if (deltaMiles == null || isNaN(deltaMiles)) return '';
  const sign = deltaMiles >= 0 ? '+' : '−';
  return `${sign}${Math.abs(deltaMiles).toFixed(1)} mi`;
}

// "Chicago, IL" -> "Chicago"
export function getShortLocationLabel(fullLocation) {
  if (!fullLocation || typeof fullLocation !== 'string') return '';
  const trimmed = fullLocation.trim();
  const commaIdx = trimmed.indexOf(',');
  return commaIdx > 0 ? trimmed.substring(0, commaIdx).trim() : trimmed;
}

// Formats the backend's ISO string as-is. We parse it by hand instead of using
// Date so the browser doesn't convert the route-local time into its own timezone.
// "2026-11-04T08:00:00-06:00" -> "Nov 4, 2026, 8:00 AM (UTC−06:00)"
export function formatDateTime(isoString) {
  if (!isoString || typeof isoString !== 'string') return '—';

  const match = isoString.trim().match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:(Z)|([+-]\d{2}):?(\d{2}))?$/
  );
  if (!match) return isoString;

  const [, year, monthStr, dayStr, hourStr, minute, , isUtc, tzHours, tzMinutes] = match;

  const monthName = MONTH_NAMES[parseInt(monthStr, 10) - 1] || monthStr;
  const day = parseInt(dayStr, 10);
  const hour24 = parseInt(hourStr, 10);
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  let offset = '';
  if (isUtc) {
    offset = ' (UTC)';
  } else if (tzHours) {
    const sign = tzHours.startsWith('-') ? '−' : '+';
    offset = ` (UTC${sign}${tzHours.slice(1)}:${tzMinutes || '00'})`;
  }

  return `${monthName} ${day}, ${year}, ${hour12}:${minute} ${ampm}${offset}`;
}

// datetime-local inputs omit seconds; the API expects a naive "YYYY-MM-DDTHH:mm:ss".
export function formatDepartureForApi(value) {
  if (!value) return '';
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed) ? `${trimmed}:00` : trimmed;
}

// Tomorrow at 08:00, in the format a datetime-local input expects.
export function getDefaultDepartureString() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T08:00`;
}

// Adds hours to a naive datetime string. Date.UTC is used only for calendar
// math, so DST changes in the browser's timezone can't shift the result.
export function shiftNaiveIsoDateTime(naiveIso, offsetHours) {
  if (!naiveIso) return '';
  const match = naiveIso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return naiveIso;

  const [, y, m, d, h, min, s = '00'] = match;
  const baseMs = Date.UTC(+y, +m - 1, +d, +h, +min, +s);
  const shifted = new Date(baseMs + Number(offsetHours) * 3600 * 1000);

  return (
    `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}` +
    `T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}`
  );
}
