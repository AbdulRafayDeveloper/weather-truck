import { useState } from 'react';
import {
  formatDistance,
  formatDuration,
  formatRiskMiles,
  formatDateTime,
  getShortLocationLabel,
  getRouteRiskDescription,
  calculateRiskPercentages,
  getRouteComparison,
} from '../utils/formatters';

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

  const {
    low_miles = 0,
    moderate_miles = 0,
    high_miles = 0,
    severe_miles = 0,
    no_travel_miles = 0,
    unassessed_miles = 0,
    average_risk = null,
    is_fully_assessed = false,
    has_no_travel = false,
  } = risk_summary;

  const comparison =
    !is_recommended && recommendedRoute
      ? getRouteComparison(route, recommendedRoute)
      : null;

  const originCity = getShortLocationLabel(origin);
  const destCity = getShortLocationLabel(destination);

  const departureLabel = originCity
    ? `Departure (${originCity} local):`
    : 'Departure (Origin local):';
  const arrivalLabel = destCity
    ? `Est. Arrival (${destCity} local):`
    : 'Est. Arrival (Destination local):';

  // Safety status indicator strictly based on raw backend flags
  let badgeLabel = 'Low Risk';
  let badgeClass = 'badge-low';

  if (has_no_travel) {
    badgeLabel = 'No Travel Hazard';
    badgeClass = 'badge-danger';
  } else if (!is_fully_assessed) {
    badgeLabel = 'Incomplete Weather';
    badgeClass = 'badge-incomplete';
  } else if (severe_miles > 0) {
    badgeLabel = 'Severe Hazards';
    badgeClass = 'badge-severe';
  } else if (high_miles > 0) {
    badgeLabel = 'High Risk';
    badgeClass = 'badge-high';
  } else if (moderate_miles > 0) {
    badgeLabel = 'Moderate Risk';
    badgeClass = 'badge-moderate';
  }

  const plainLanguageRisk = getRouteRiskDescription(risk_summary);
  const pct = calculateRiskPercentages(risk_summary, distance_miles);

  return (
    <article
      className={`route-card ${is_recommended ? 'card-recommended' : ''} ${isSelected ? 'card-selected' : ''}`}
      aria-label={`Route ${id} comparison details`}
      onClick={onSelect}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Top Banner Row */}
      <div className="card-top-header">
        <div className="card-identity-group">
          <h3 className="card-route-name">Route {id}</h3>
          <span className={`status-pill ${badgeClass}`}>
            <span className="status-pill-dot" aria-hidden="true" />
            {badgeLabel}
          </span>
          {isSelected && (
            <span className="pill-selected-map" title="Currently active on map">
              ● Active on Map
            </span>
          )}
        </div>

        <div className="card-header-actions">
          {is_recommended && (
            <span className="pill-recommended-flag">
              ★ Recommended
            </span>
          )}
        </div>
      </div>

      {/* Alternative Route Relative Comparison to Recommended Route */}
      {comparison && (
        <div className="card-comparison-badge-strip" aria-label="Comparison to recommended route">
          <span className="comparison-pill comp-dist" title="Distance difference vs recommended route">
            {comparison.deltaDistanceStr}
          </span>
          <span className="comparison-pill comp-time" title="Travel time difference vs recommended route">
            {comparison.deltaDurationStr}
          </span>
          <span className={`comparison-pill comp-risk ${comparison.riskDeltaClass}`} title="Risk profile relative to recommended route">
            {comparison.riskDelta}
          </span>
        </div>
      )}

      {/* Non-truck-compatible sections warning if present */}
      {has_non_truck_sections && (
        <div className="card-truck-warning-callout" role="alert">
          <span className="warning-icon" aria-hidden="true">⚠</span>
          <div className="warning-text-group">
            <span className="warning-title">Commercial Truck Restriction Notice</span>
            <span className="warning-detail">
              {warnings && warnings.length > 0
                ? warnings.join(' ')
                : 'Contains route sections not officially designated for commercial trucks.'}
            </span>
          </div>
        </div>
      )}

      {/* Primary Metrics Row */}
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
          {average_risk !== null ? (
            <span className="metric-figure figure-risk">
              {Number(average_risk).toFixed(2)}
              <span className="figure-scale"> / 4.00</span>
            </span>
          ) : (
            <span className="metric-figure figure-na" title={has_no_travel ? 'Excluded due to No Travel conditions' : 'Incomplete weather'}>
              N/A
              <span className="figure-na-subtext">
                {has_no_travel ? '(No Travel hazard)' : '(Incomplete)'}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Schedule Row */}
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

      {/* Plain Language Weather Assessment */}
      <div className="card-risk-summary-callout">
        <p className="risk-plain-text">{plainLanguageRisk}</p>
      </div>

      {/* Horizontal Mileage Distribution Bar */}
      <div className="mileage-distribution-container" aria-label="Mileage risk distribution">
        <div className="distribution-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100">
          {pct.low > 0 && (
            <div className="bar-seg seg-low" style={{ width: `${pct.low}%` }} title={`Low risk: ${formatRiskMiles(low_miles)}`} />
          )}
          {pct.moderate > 0 && (
            <div className="bar-seg seg-moderate" style={{ width: `${pct.moderate}%` }} title={`Moderate risk: ${formatRiskMiles(moderate_miles)}`} />
          )}
          {pct.high > 0 && (
            <div className="bar-seg seg-high" style={{ width: `${pct.high}%` }} title={`High risk: ${formatRiskMiles(high_miles)}`} />
          )}
          {pct.severe > 0 && (
            <div className="bar-seg seg-severe" style={{ width: `${pct.severe}%` }} title={`Severe risk: ${formatRiskMiles(severe_miles)}`} />
          )}
          {pct.noTravel > 0 && (
            <div className="bar-seg seg-notravel" style={{ width: `${pct.noTravel}%` }} title={`No Travel: ${formatRiskMiles(no_travel_miles)}`} />
          )}
          {pct.unassessed > 0 && (
            <div className="bar-seg seg-unassessed" style={{ width: `${pct.unassessed}%` }} title={`Unassessed: ${formatRiskMiles(unassessed_miles)}`} />
          )}
        </div>

        {/* Compact Legend */}
        <div className="distribution-legend">
          <span className="legend-chip">
            <span className="chip-dot dot-low" />
            Low: {formatRiskMiles(low_miles)}
          </span>
          {moderate_miles > 0 && (
            <span className="legend-chip">
              <span className="chip-dot dot-moderate" />
              Mod: {formatRiskMiles(moderate_miles)}
            </span>
          )}
          {high_miles > 0 && (
            <span className="legend-chip">
              <span className="chip-dot dot-high" />
              High: {formatRiskMiles(high_miles)}
            </span>
          )}
          {severe_miles > 0 && (
            <span className="legend-chip">
              <span className="chip-dot dot-severe" />
              Severe: {formatRiskMiles(severe_miles)}
            </span>
          )}
          {no_travel_miles > 0 && (
            <span className="legend-chip legend-chip-alert">
              <span className="chip-dot dot-notravel" />
              No Travel: {formatRiskMiles(no_travel_miles)}
            </span>
          )}
          {unassessed_miles > 0 && (
            <span className="legend-chip">
              <span className="chip-dot dot-unassessed" />
              Unassessed: {formatRiskMiles(unassessed_miles)}
            </span>
          )}
        </div>
      </div>

      {/* Expandable Details Section */}
      <div className="details-toggle-row">
        <button
          type="button"
          className="details-toggle-btn"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          aria-expanded={isExpanded}
        >
          {isExpanded ? 'Hide detailed risk breakdown ▲' : 'View detailed risk breakdown ▼'}
        </button>
      </div>

      {isExpanded && (
        <div className="expanded-breakdown-tray">
          <div className="tray-grid">
            <div className="tray-cell tray-low">
              <span className="cell-tier">Low Risk</span>
              <span className="cell-miles">{formatRiskMiles(low_miles)}</span>
              <span className="cell-criteria">&lt;25 mph wind</span>
            </div>

            <div className="tray-cell tray-moderate">
              <span className="cell-tier">Moderate</span>
              <span className="cell-miles">{formatRiskMiles(moderate_miles)}</span>
              <span className="cell-criteria">25–35 mph wind</span>
            </div>

            <div className="tray-cell tray-high">
              <span className="cell-tier">High Risk</span>
              <span className="cell-miles">{formatRiskMiles(high_miles)}</span>
              <span className="cell-criteria">35–45 mph wind</span>
            </div>

            <div className="tray-cell tray-severe">
              <span className="cell-tier">Severe</span>
              <span className="cell-miles">{formatRiskMiles(severe_miles)}</span>
              <span className="cell-criteria">45–55 mph wind</span>
            </div>

            <div className="tray-cell tray-notravel">
              <span className="cell-tier">No Travel</span>
              <span className="cell-miles">{formatRiskMiles(no_travel_miles)}</span>
              <span className="cell-criteria">&ge;55 mph / high wind+cargo</span>
            </div>

            <div className="tray-cell tray-unassessed">
              <span className="cell-tier">Unassessed</span>
              <span className="cell-miles">{formatRiskMiles(unassessed_miles)}</span>
              <span className="cell-criteria">Missing forecast data</span>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
