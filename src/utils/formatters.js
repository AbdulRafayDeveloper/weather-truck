/**
 * Utility functions for formatting durations, distances, dates, and API payloads.
 */

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Format travel duration in seconds to a human-readable string (e.g. "14h 52m").
 * @param {number} seconds - Travel duration in seconds.
 * @returns {string} Formatted duration.
 */
export function formatDuration(seconds) {
  if (seconds == null || isNaN(seconds) || seconds < 0) return '—';
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Format distance in miles with one decimal place.
 * @param {number} miles - Distance in miles.
 * @returns {string} Formatted distance (e.g. "1,004.4 mi").
 */
export function formatDistance(miles) {
  if (miles == null || isNaN(miles)) return '—';
  return `${Number(miles).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mi`;
}

/**
 * Format category risk mileage with two decimal places.
 * @param {number} miles - Distance in miles.
 * @returns {string} Formatted risk mileage (e.g. "50.00 mi").
 */
export function formatRiskMiles(miles) {
  if (miles == null || isNaN(miles)) return '0.00 mi';
  return `${Number(miles).toFixed(2)} mi`;
}

/**
 * Extract a concise city or location name from a full location string.
 * Example: "Chicago, IL" -> "Chicago", "Denver, CO" -> "Denver"
 * @param {string} fullLocation
 * @returns {string}
 */
export function getShortLocationLabel(fullLocation) {
  if (!fullLocation || typeof fullLocation !== 'string') return '';
  const trimmed = fullLocation.trim();
  const commaIdx = trimmed.indexOf(',');
  if (commaIdx > 0) {
    return trimmed.substring(0, commaIdx).trim();
  }
  return trimmed;
}

/**
 * Format an ISO datetime string for display, strictly preserving the wall-clock time
 * and explicit UTC offset provided by the backend without browser timezone conversion.
 *
 * Example:
 *   "2026-11-04T08:00:00-06:00" -> "Nov 4, 2026, 8:00 AM (UTC−06:00)"
 *   "2026-11-04T21:10:00-07:00" -> "Nov 4, 2026, 9:10 PM (UTC−07:00)"
 *   "2026-11-04T12:00:00Z"      -> "Nov 4, 2026, 12:00 PM (UTC)"
 *   "2026-11-04T08:00:00"       -> "Nov 4, 2026, 8:00 AM"
 *
 * @param {string} isoString - ISO 8601 string from backend.
 * @returns {string} Formatted route-local date/time with UTC offset.
 */
export function formatDateTime(isoString) {
  if (!isoString || typeof isoString !== 'string') return '—';

  // Matches YYYY-MM-DDTHH:mm[:ss[.sss]][Z|[+-]HH[:mm]]
  const match = isoString.trim().match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:(Z)|([+-]\d{2}):?(\d{2}))?$/
  );

  if (!match) {
    return isoString;
  }

  const [, yearStr, monthStr, dayStr, hourStr, minStr, , isZ, tzSignHours, tzMinutes] = match;

  const monthIdx = parseInt(monthStr, 10) - 1;
  const monthName = MONTH_NAMES[monthIdx] || monthStr;
  const day = parseInt(dayStr, 10);
  const year = yearStr;

  const hour24 = parseInt(hourStr, 10);
  const minute = minStr;
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  let offsetStr = '';
  if (isZ) {
    offsetStr = ' (UTC)';
  } else if (tzSignHours) {
    const sign = tzSignHours.startsWith('-') ? '−' : '+';
    const hours = tzSignHours.slice(1);
    const mins = tzMinutes || '00';
    offsetStr = ` (UTC${sign}${hours}:${mins})`;
  }

  return `${monthName} ${day}, ${year}, ${hour12}:${minute} ${ampm}${offsetStr}`;
}

/**
 * Format an HTML datetime-local string to naive ISO 8601 format (YYYY-MM-DDTHH:mm:ss)
 * strictly without UTC conversion, timezone shifts, or appending 'Z'.
 * @param {string} naiveDateTimeString - e.g. "2026-11-03T08:00"
 * @returns {string} e.g. "2026-11-03T08:00:00"
 */
export function formatDepartureForApi(naiveDateTimeString) {
  if (!naiveDateTimeString) return '';
  const trimmed = naiveDateTimeString.trim();
  // Append seconds if omitted by input[type="datetime-local"]
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00`;
  }
  return trimmed;
}

/**
 * Generate a default departure date/time string for tomorrow at 08:00
 * in naive local format (YYYY-MM-DDTHH:mm) without UTC conversion.
 * @returns {string}
 */
/**
 * Generate factual, data-driven reasons why the recommended route was selected.
 * Strictly relies on actual backend comparisons (fewest severe miles, fewest high miles,
 * lowest average risk score, or fastest travel time).
 * @param {Object} bestRoute
 * @param {Array} allRoutes
 * @returns {Array<string>} List of short factual reasons.
 */
export function getRecommendationRationale(bestRoute, allRoutes = []) {
  if (!bestRoute) return [];
  const rs = bestRoute.risk_summary || {};
  const otherRoutes = allRoutes.filter((r) => r.id !== bestRoute.id);
  const reasons = [];

  // Check if all evaluated eligible routes have identical weather risk
  const allEqualRisk =
    otherRoutes.length > 0 &&
    otherRoutes.every((r) => {
      const ors = r.risk_summary || {};
      return (
        (ors.no_travel_miles || 0) === (rs.no_travel_miles || 0) &&
        (ors.severe_miles || 0) === (rs.severe_miles || 0) &&
        (ors.high_miles || 0) === (rs.high_miles || 0) &&
        ors.average_risk === rs.average_risk &&
        ors.is_fully_assessed === rs.is_fully_assessed
      );
    });

  if (allEqualRisk) {
    const routeCountWord =
      allRoutes.length === 2
        ? 'Both'
        : allRoutes.length === 3
        ? 'All three'
        : `All ${allRoutes.length}`;
    reasons.push(`${routeCountWord} eligible routes have the same weather-risk profile`);
    const isFastest = otherRoutes.every(
      (r) => (r.duration_seconds || 0) >= (bestRoute.duration_seconds || 0)
    );
    if (isFastest) {
      reasons.push('Shortest estimated travel time among equally safe options');
    }
    return reasons;
  }

  // Factual check 1: zero hazardous miles vs alternatives
  if (rs.no_travel_miles === 0 && rs.severe_miles === 0) {
    const othersHaveSevere = otherRoutes.some((r) => (r.risk_summary?.severe_miles || 0) > 0);
    const othersHaveNoTravel = otherRoutes.some((r) => (r.risk_summary?.no_travel_miles || 0) > 0);
    if (othersHaveSevere || othersHaveNoTravel) {
      reasons.push('Avoids severe or No Travel hazards present on alternative routes');
    } else {
      reasons.push('Zero severe or No Travel weather hazards along the corridor');
    }
  } else if (otherRoutes.some((r) => (r.risk_summary?.severe_miles || 0) > (rs.severe_miles || 0))) {
    reasons.push('Fewest severe hazard miles among evaluated routes');
  }

  // Factual check 2: high risk segments
  if (rs.high_miles === 0 && otherRoutes.some((r) => (r.risk_summary?.high_miles || 0) > 0)) {
    reasons.push('Bypasses high-risk weather segments found on other options');
  }

  // Factual check 3: average risk score
  if (rs.average_risk !== null) {
    const hasHigherAverage = otherRoutes.some(
      (r) => r.risk_summary?.average_risk !== null && r.risk_summary.average_risk > rs.average_risk
    );
    if (hasHigherAverage) {
      reasons.push(`Lowest overall weather risk score (${Number(rs.average_risk).toFixed(2)} / 4.00)`);
    } else if (reasons.length === 0) {
      reasons.push(`Clean weather profile (${Number(rs.average_risk).toFixed(2)} / 4.00 risk score)`);
    }
  }

  // Factual check 4: duration comparison if tied on risk
  if (otherRoutes.length > 0 && otherRoutes.every((r) => r.risk_summary?.average_risk === rs.average_risk)) {
    const isFastest = otherRoutes.every((r) => (r.duration_seconds || 0) >= (bestRoute.duration_seconds || 0));
    if (isFastest && reasons.length < 3) {
      reasons.push('Shortest estimated travel time among equally safe options');
    }
  }

  return reasons;
}

/**
 * Generate a concise, plain-language description of route weather conditions.
 * @param {Object} riskSummary
 * @returns {string} Plain-language summary text.
 */
export function getRouteRiskDescription(riskSummary) {
  if (!riskSummary) return 'No risk assessment data available.';
  const {
    has_no_travel,
    is_fully_assessed,
    severe_miles = 0,
    high_miles = 0,
    moderate_miles = 0,
    low_miles = 0,
    unassessed_miles = 0,
  } = riskSummary;

  if (has_no_travel) {
    return 'Critical hazard: route encounters No Travel conditions exceeding safe vehicle operating limits.';
  }
  if (is_fully_assessed === false || unassessed_miles > 0) {
    return 'Incomplete forecast: some checkpoint segments could not retrieve weather forecasts.';
  }
  if (severe_miles > 0) {
    return `Caution: contains ${formatRiskMiles(severe_miles)} of severe weather (elevated rollover risk).`;
  }
  if (high_miles > 0) {
    return `Caution: contains ${formatRiskMiles(high_miles)} of high-risk wind or heavy precipitation.`;
  }
  if (moderate_miles > 0) {
    return `Favorable: mostly calm with ${formatRiskMiles(moderate_miles)} in moderate conditions.`;
  }
  return 'Weather profile: Entire route currently Low Risk.';
}

/**
 * Format delta duration into e.g. "+1h 55m" or "-45m"
 * @param {number} seconds
 * @returns {string}
 */
export function formatDeltaDuration(seconds) {
  if (seconds == null || isNaN(seconds)) return '';
  const sign = seconds >= 0 ? '+' : '−';
  const absSec = Math.abs(seconds);
  const totalMinutes = Math.round(absSec / 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0 && mins === 0) return '0m';
  if (hours === 0) return `${sign}${mins}m`;
  if (mins === 0) return `${sign}${hours}h`;
  return `${sign}${hours}h ${mins}m`;
}

/**
 * Format delta distance into e.g. "+136.9 mi" or "-12.4 mi"
 * @param {number} deltaMiles
 * @returns {string}
 */
export function formatDeltaDistance(deltaMiles) {
  if (deltaMiles == null || isNaN(deltaMiles)) return '';
  const sign = deltaMiles >= 0 ? '+' : '−';
  const absMiles = Math.abs(deltaMiles);
  return `${sign}${absMiles.toFixed(1)} mi`;
}

/**
 * Compare alternative route against recommended route to display relative differences.
 * @param {Object} route
 * @param {Object} recommendedRoute
 * @returns {Object|null}
 */
export function getRouteComparison(route, recommendedRoute) {
  if (!route || !recommendedRoute || route.id === recommendedRoute.id) return null;

  const deltaMiles = (route.distance_miles || 0) - (recommendedRoute.distance_miles || 0);
  const deltaSeconds = (route.duration_seconds || 0) - (recommendedRoute.duration_seconds || 0);

  const rRs = route.risk_summary || {};
  const recRs = recommendedRoute.risk_summary || {};

  let riskDelta = 'Same weather risk';
  let riskDeltaClass = 'delta-risk-equal';

  if (rRs.has_no_travel && !recRs.has_no_travel) {
    riskDelta = 'Contains No Travel';
    riskDeltaClass = 'delta-risk-worse';
  } else if (!rRs.is_fully_assessed && recRs.is_fully_assessed) {
    riskDelta = 'Incomplete weather';
    riskDeltaClass = 'delta-risk-incomplete';
  } else if (
    (rRs.severe_miles || 0) > (recRs.severe_miles || 0) ||
    (rRs.high_miles || 0) > (recRs.high_miles || 0)
  ) {
    riskDelta = 'Higher weather risk';
    riskDeltaClass = 'delta-risk-worse';
  } else if (rRs.average_risk != null && recRs.average_risk != null) {
    if (rRs.average_risk > recRs.average_risk) {
      riskDelta = 'Higher weather risk';
      riskDeltaClass = 'delta-risk-worse';
    } else if (rRs.average_risk < recRs.average_risk) {
      riskDelta = 'Lower weather risk';
      riskDeltaClass = 'delta-risk-better';
    } else {
      riskDelta = 'Same weather risk';
      riskDeltaClass = 'delta-risk-equal';
    }
  }

  return {
    deltaDistanceStr: formatDeltaDistance(deltaMiles),
    deltaDurationStr: formatDeltaDuration(deltaSeconds),
    riskDelta,
    riskDeltaClass,
  };
}

/**
 * Calculate percentage share of each risk tier for the horizontal distribution bar.
 * @param {Object} riskSummary
 * @param {number} totalMiles
 * @returns {Object} Percentages summing to ~100%
 */
export function calculateRiskPercentages(riskSummary, totalMiles) {
  if (!riskSummary || !totalMiles || totalMiles <= 0) {
    return { low: 0, moderate: 0, high: 0, severe: 0, noTravel: 0, unassessed: 0 };
  }
  const low = (riskSummary.low_miles || 0) / totalMiles * 100;
  const moderate = (riskSummary.moderate_miles || 0) / totalMiles * 100;
  const high = (riskSummary.high_miles || 0) / totalMiles * 100;
  const severe = (riskSummary.severe_miles || 0) / totalMiles * 100;
  const noTravel = (riskSummary.no_travel_miles || 0) / totalMiles * 100;
  const unassessed = (riskSummary.unassessed_miles || 0) / totalMiles * 100;

  return {
    low: Math.min(100, Math.max(0, low)),
    moderate: Math.min(100, Math.max(0, moderate)),
    high: Math.min(100, Math.max(0, high)),
    severe: Math.min(100, Math.max(0, severe)),
    noTravel: Math.min(100, Math.max(0, noTravel)),
    unassessed: Math.min(100, Math.max(0, unassessed)),
  };
}

/**
 * Generate a default departure date/time string for tomorrow at 08:00
 * in naive local format (YYYY-MM-DDTHH:mm) without UTC conversion.
 * @returns {string}
 */
export function getDefaultDepartureString() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T08:00`;
}

/**
 * Shift a naive ISO datetime string (YYYY-MM-DDTHH:mm:ss or YYYY-MM-DDTHH:mm)
 * by a specified number of hours without browser timezone offset distortion.
 * @param {string} naiveIsoStr
 * @param {number} offsetHours
 * @returns {string} Shifted naive ISO string (YYYY-MM-DDTHH:mm:ss)
 */
export function shiftNaiveIsoDateTime(naiveIsoStr, offsetHours) {
  if (!naiveIsoStr) return '';
  const match = naiveIsoStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return naiveIsoStr;
  const [, yStr, mStr, dStr, hStr, minStr, sStr = '00'] = match;
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10) - 1;
  const d = parseInt(dStr, 10);
  const h = parseInt(hStr, 10);
  const min = parseInt(minStr, 10);
  const s = parseInt(sStr, 10);

  // Use UTC milliseconds purely as an arithmetic calendar adder
  const baseUtcMs = Date.UTC(y, m, d, h, min, s);
  const shiftedDate = new Date(baseUtcMs + Number(offsetHours) * 3600 * 1000);

  const pad = (n) => String(n).padStart(2, '0');
  const outY = shiftedDate.getUTCFullYear();
  const outM = pad(shiftedDate.getUTCMonth() + 1);
  const outD = pad(shiftedDate.getUTCDate());
  const outH = pad(shiftedDate.getUTCHours());
  const outMin = pad(shiftedDate.getUTCMinutes());
  const outSec = pad(shiftedDate.getUTCSeconds());

  return `${outY}-${outM}-${outD}T${outH}:${outMin}:${outSec}`;
}
