import { formatDeltaDistance, formatDeltaDuration, formatRiskMiles } from './formatters';

const isFastestOf = (route, others) =>
  others.every((r) => (r.duration_seconds || 0) >= (route.duration_seconds || 0));

function hasSameRiskProfile(a, b) {
  return (
    (a.no_travel_miles || 0) === (b.no_travel_miles || 0) &&
    (a.severe_miles || 0) === (b.severe_miles || 0) &&
    (a.high_miles || 0) === (b.high_miles || 0) &&
    a.average_risk === b.average_risk &&
    a.is_fully_assessed === b.is_fully_assessed
  );
}

// Short reasons for the "Why this route was selected" list. Each reason is only
// added when the numbers actually support it.
export function getRecommendationRationale(bestRoute, allRoutes = []) {
  if (!bestRoute) return [];
  const rs = bestRoute.risk_summary || {};
  const others = allRoutes.filter((r) => r.id !== bestRoute.id);
  const reasons = [];

  const allEqualRisk = others.length > 0 && others.every((r) => hasSameRiskProfile(r.risk_summary || {}, rs));

  if (allEqualRisk) {
    const countWord =
      allRoutes.length === 2 ? 'Both' : allRoutes.length === 3 ? 'All three' : `All ${allRoutes.length}`;
    reasons.push(`${countWord} eligible routes have the same weather-risk profile`);
    if (isFastestOf(bestRoute, others)) {
      reasons.push('Shortest estimated travel time among equally safe options');
    }
    return reasons;
  }

  if (rs.no_travel_miles === 0 && rs.severe_miles === 0) {
    const othersHaveHazards = others.some(
      (r) => (r.risk_summary?.severe_miles || 0) > 0 || (r.risk_summary?.no_travel_miles || 0) > 0
    );
    reasons.push(
      othersHaveHazards
        ? 'Avoids severe or No Travel hazards present on alternative routes'
        : 'Zero severe or No Travel weather hazards along the corridor'
    );
  } else if (others.some((r) => (r.risk_summary?.severe_miles || 0) > (rs.severe_miles || 0))) {
    reasons.push('Fewest severe hazard miles among evaluated routes');
  }

  if (rs.high_miles === 0 && others.some((r) => (r.risk_summary?.high_miles || 0) > 0)) {
    reasons.push('Bypasses high-risk weather segments found on other options');
  }

  if (rs.average_risk !== null) {
    const score = Number(rs.average_risk).toFixed(2);
    const othersAreWorse = others.some(
      (r) => r.risk_summary?.average_risk !== null && r.risk_summary.average_risk > rs.average_risk
    );
    if (othersAreWorse) {
      reasons.push(`Lowest overall weather risk score (${score} / 4.00)`);
    } else if (reasons.length === 0) {
      reasons.push(`Clean weather profile (${score} / 4.00 risk score)`);
    }
  }

  const tiedOnRisk = others.length > 0 && others.every((r) => r.risk_summary?.average_risk === rs.average_risk);
  if (tiedOnRisk && isFastestOf(bestRoute, others) && reasons.length < 3) {
    reasons.push('Shortest estimated travel time among equally safe options');
  }

  return reasons;
}

export function getRouteRiskDescription(riskSummary) {
  if (!riskSummary) return 'No risk assessment data available.';
  const {
    has_no_travel,
    is_fully_assessed,
    severe_miles = 0,
    high_miles = 0,
    moderate_miles = 0,
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

function compareRisk(route, recommended) {
  if (route.has_no_travel && !recommended.has_no_travel) {
    return { riskDelta: 'Contains No Travel', riskDeltaClass: 'delta-risk-worse' };
  }
  if (!route.is_fully_assessed && recommended.is_fully_assessed) {
    return { riskDelta: 'Incomplete weather', riskDeltaClass: 'delta-risk-incomplete' };
  }
  if (
    (route.severe_miles || 0) > (recommended.severe_miles || 0) ||
    (route.high_miles || 0) > (recommended.high_miles || 0)
  ) {
    return { riskDelta: 'Higher weather risk', riskDeltaClass: 'delta-risk-worse' };
  }
  if (route.average_risk != null && recommended.average_risk != null) {
    if (route.average_risk > recommended.average_risk) {
      return { riskDelta: 'Higher weather risk', riskDeltaClass: 'delta-risk-worse' };
    }
    if (route.average_risk < recommended.average_risk) {
      return { riskDelta: 'Lower weather risk', riskDeltaClass: 'delta-risk-better' };
    }
  }
  return { riskDelta: 'Same weather risk', riskDeltaClass: 'delta-risk-equal' };
}

// Differences shown on alternative route cards, relative to the recommended route.
export function getRouteComparison(route, recommendedRoute) {
  if (!route || !recommendedRoute || route.id === recommendedRoute.id) return null;

  const deltaMiles = (route.distance_miles || 0) - (recommendedRoute.distance_miles || 0);
  const deltaSeconds = (route.duration_seconds || 0) - (recommendedRoute.duration_seconds || 0);

  return {
    deltaDistanceStr: formatDeltaDistance(deltaMiles),
    deltaDurationStr: formatDeltaDuration(deltaSeconds),
    ...compareRisk(route.risk_summary || {}, recommendedRoute.risk_summary || {}),
  };
}

const clampPercent = (value) => Math.min(100, Math.max(0, value));

export function calculateRiskPercentages(riskSummary, totalMiles) {
  if (!riskSummary || !totalMiles || totalMiles <= 0) {
    return { low: 0, moderate: 0, high: 0, severe: 0, noTravel: 0, unassessed: 0 };
  }
  const share = (miles) => clampPercent(((miles || 0) / totalMiles) * 100);

  return {
    low: share(riskSummary.low_miles),
    moderate: share(riskSummary.moderate_miles),
    high: share(riskSummary.high_miles),
    severe: share(riskSummary.severe_miles),
    noTravel: share(riskSummary.no_travel_miles),
    unassessed: share(riskSummary.unassessed_miles),
  };
}

export function getRiskBadge({ has_no_travel, is_fully_assessed, severe_miles, high_miles, moderate_miles }) {
  if (has_no_travel) return { label: 'No Travel Hazard', className: 'badge-danger' };
  if (!is_fully_assessed) return { label: 'Incomplete Weather', className: 'badge-incomplete' };
  if (severe_miles > 0) return { label: 'Severe Hazards', className: 'badge-severe' };
  if (high_miles > 0) return { label: 'High Risk', className: 'badge-high' };
  if (moderate_miles > 0) return { label: 'Moderate Risk', className: 'badge-moderate' };
  return { label: 'Low Risk', className: 'badge-low' };
}
