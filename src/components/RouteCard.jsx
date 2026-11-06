import { useState } from 'react';

import {
  formatDateTime,
  formatDistance,
  formatDuration,
  formatRiskMiles,
  getShortLocationLabel,
} from '../utils/formatters';
import {
  calculateRiskPercentages,
  getRiskBadge,
  getRouteComparison,
  getRouteRiskDescription,
} from '../utils/routeInsights';

// One entry per risk tier, in display order. `pct` is the key returned by
// calculateRiskPercentages; `legend` is the short label used under the bar.
const TIERS = [
  { key: 'low', pct: 'low', miles: 'low_miles', barTitle: 'Low risk', legend: 'Low', alwaysShow: true },
  { key: 'moderate', pct: 'moderate', miles: 'moderate_miles', barTitle: 'Moderate risk', legend: 'Mod' },
  { key: 'high', pct: 'high', miles: 'high_miles', barTitle: 'High risk', legend: 'High' },
  { key: 'severe', pct: 'severe', miles: 'severe_miles', barTitle: 'Severe risk', legend: 'Severe' },
  { key: 'notravel', pct: 'noTravel', miles: 'no_travel_miles', barTitle: 'No Travel', legend: 'No Travel', alert: true },
  { key: 'unassessed', pct: 'unassessed', miles: 'unassessed_miles', barTitle: 'Unassessed', legend: 'Unassessed' },
];

const BREAKDOWN = [
  { key: 'low', tier: 'Low Risk', miles: 'low_miles', criteria: '<25 mph wind' },
  { key: 'moderate', tier: 'Moderate', miles: 'moderate_miles', criteria: '25–35 mph wind' },
  { key: 'high', tier: 'High Risk', miles: 'high_miles', criteria: '35–45 mph wind' },
  { key: 'severe', tier: 'Severe', miles: 'severe_miles', criteria: '45–55 mph wind' },
  { key: 'notravel', tier: 'No Travel', miles: 'no_travel_miles', criteria: '≥55 mph / high wind+cargo' },
  { key: 'unassessed', tier: 'Unassessed', miles: 'unassessed_miles', criteria: 'Missing forecast data' },
];

export default function RouteCard({
  route,
  origin,
  destination,
  recommendedRoute = null,
  isSelected = false,
  onSelect = () => {},
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!route) return null;

  const {
    id,
    distance_miles,
    duration_seconds,
    departure,
    arrival,
    checkpoint_count,
    is_recommended,
    has_non_truck_sections = false,
    warnings = [],
    risk_summary = {},
  } = route;

  const miles = {
    low_miles: risk_summary.low_miles ?? 0,
    moderate_miles: risk_summary.moderate_miles ?? 0,
    high_miles: risk_summary.high_miles ?? 0,
    severe_miles: risk_summary.severe_miles ?? 0,
    no_travel_miles: risk_summary.no_travel_miles ?? 0,
    unassessed_miles: risk_summary.unassessed_miles ?? 0,
  };
  const averageRisk = risk_summary.average_risk ?? null;
  const hasNoTravel = risk_summary.has_no_travel ?? false;

  const badge = getRiskBadge({
    has_no_travel: hasNoTravel,
    is_fully_assessed: risk_summary.is_fully_assessed ?? false,
    severe_miles: miles.severe_miles,
    high_miles: miles.high_miles,
    moderate_miles: miles.moderate_miles,
  });

  const comparison = !is_recommended && recommendedRoute ? getRouteComparison(route, recommendedRoute) : null;
  const pct = calculateRiskPercentages(risk_summary, distance_miles);

  const originCity = getShortLocationLabel(origin);
  const destCity = getShortLocationLabel(destination);
  const departureLabel = `Departure (${originCity || 'Origin'} local):`;
  const arrivalLabel = `Est. Arrival (${destCity || 'Destination'} local):`;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <article
      className={`route-card ${is_recommended ? 'card-recommended' : ''} ${isSelected ? 'card-selected' : ''}`}
      aria-label={`Route ${id} comparison details`}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
    >
      <div className="card-top-header">
        <div className="card-identity-group">
          <h3 className="card-route-name">Route {id}</h3>
          <span className={`status-pill ${badge.className}`}>
            <span className="status-pill-dot" aria-hidden="true" />
            {badge.label}
          </span>
          {isSelected && (
            <span className="pill-selected-map" title="Currently active on map">
              ● Active on Map
            </span>
          )}
        </div>

        <div className="card-header-actions">
          {is_recommended && <span className="pill-recommended-flag">★ Recommended</span>}
        </div>
      </div>

      {comparison && (
        <div className="card-comparison-badge-strip" aria-label="Comparison to recommended route">
          <span className="comparison-pill comp-dist" title="Distance difference vs recommended route">
            {comparison.deltaDistanceStr}
          </span>
          <span className="comparison-pill comp-time" title="Travel time difference vs recommended route">
            {comparison.deltaDurationStr}
          </span>
          <span
            className={`comparison-pill comp-risk ${comparison.riskDeltaClass}`}
            title="Risk profile relative to recommended route"
          >
            {comparison.riskDelta}
          </span>
        </div>
      )}

      {has_non_truck_sections && (
        <div className="card-truck-warning-callout" role="alert">
          <span className="warning-icon" aria-hidden="true">⚠</span>
          <div className="warning-text-group">
            <span className="warning-title">Commercial Truck Restriction Notice</span>
            <span className="warning-detail">
              {warnings?.length > 0
                ? warnings.join(' ')
                : 'Contains route sections not officially designated for commercial trucks.'}
            </span>
          </div>
        </div>
      )}

      <div className="card-metrics-strip">
        <div className="metric-cell">
          <span className="metric-caption">Distance</span>
          <span className="metric-figure">{formatDistance(distance_miles)}</span>
        </div>

        <div className="metric-cell">
          <span className="metric-caption">Travel Time</span>
          <span className="metric-figure">{formatDuration(duration_seconds)}</span>
        </div>

        <div className="metric-cell">
          <span className="metric-caption">Checkpoints</span>
          <span className="metric-figure">{checkpoint_count || '—'}</span>
        </div>

        <div className="metric-cell">
          <span className="metric-caption">Weather Risk</span>
          {averageRisk !== null ? (
            <span className="metric-figure figure-risk">
              {Number(averageRisk).toFixed(2)}
              <span className="figure-scale"> / 4.00</span>
            </span>
          ) : (
            <span
              className="metric-figure figure-na"
              title={hasNoTravel ? 'Excluded due to No Travel conditions' : 'Incomplete weather'}
            >
              N/A
              <span className="figure-na-subtext">{hasNoTravel ? '(No Travel hazard)' : '(Incomplete)'}</span>
            </span>
          )}
        </div>
      </div>

      <div className="card-schedule-strip">
        <div className="schedule-item">
          <span className="schedule-tag">{departureLabel}</span>
          <span className="schedule-timestamp">{formatDateTime(departure)}</span>
        </div>
        <div className="schedule-item">
          <span className="schedule-tag">{arrivalLabel}</span>
          <span className="schedule-timestamp">{formatDateTime(arrival)}</span>
        </div>
      </div>

      <div className="card-risk-summary-callout">
        <p className="risk-plain-text">{getRouteRiskDescription(risk_summary)}</p>
      </div>

      <div className="mileage-distribution-container" aria-label="Mileage risk distribution">
        <div className="distribution-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100">
          {TIERS.filter((t) => pct[t.pct] > 0).map((t) => (
            <div
              key={t.key}
              className={`bar-seg seg-${t.key}`}
              style={{ width: `${pct[t.pct]}%` }}
              title={`${t.barTitle}: ${formatRiskMiles(miles[t.miles])}`}
            />
          ))}
        </div>

        <div className="distribution-legend">
          {TIERS.filter((t) => t.alwaysShow || miles[t.miles] > 0).map((t) => (
            <span key={t.key} className={`legend-chip${t.alert ? ' legend-chip-alert' : ''}`}>
              <span className={`chip-dot dot-${t.key}`} />
              {t.legend}: {formatRiskMiles(miles[t.miles])}
            </span>
          ))}
        </div>
      </div>

      <div className="details-toggle-row">
        <button
          type="button"
          className="details-toggle-btn"
          onClick={(e) => {
            // Don't let the toggle also select the card.
            e.stopPropagation();
            setIsExpanded((open) => !open);
          }}
          aria-expanded={isExpanded}
        >
          {isExpanded ? 'Hide detailed risk breakdown ▲' : 'View detailed risk breakdown ▼'}
        </button>
      </div>

      {isExpanded && (
        <div className="expanded-breakdown-tray">
          <div className="tray-grid">
            {BREAKDOWN.map(({ key, tier, miles: field, criteria }) => (
              <div key={key} className={`tray-cell tray-${key}`}>
                <span className="cell-tier">{tier}</span>
                <span className="cell-miles">{formatRiskMiles(miles[field])}</span>
                <span className="cell-criteria">{criteria}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
