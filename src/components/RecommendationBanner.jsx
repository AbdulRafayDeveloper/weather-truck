import {
  formatDistance,
  formatDuration,
  getRecommendationRationale,
} from '../utils/formatters';

export default function RecommendationBanner({
  recommendation,
  routesCount = 0,
  bestRoute = null,
  allRoutes = [],
}) {
  if (!recommendation) return null;

  const {
    recommended_route_id,
    status,
    message,
    all_routes_unsafe,
    is_weather_complete,
  } = recommendation;

  if (status === 'recommended') {
    const rationale = getRecommendationRationale(bestRoute, allRoutes);

    return (
      <div className="recommendation-hero banner-recommended" role="region" aria-label="Route recommendation">
        <div className="hero-top-row">
          <span className="hero-kicker">
            <span className="kicker-check-icon" aria-hidden="true">✓</span>
            RECOMMENDED ROUTE
          </span>
          <span className="hero-badge">Recommended</span>
        </div>

        <div className="hero-main">
          <h2 className="hero-route-title">Route {recommended_route_id}</h2>

          {bestRoute && (
            <div className="hero-key-stats">
              <span className="stat-pill">{formatDistance(bestRoute.distance_miles)}</span>
              <span className="stat-divider">·</span>
              <span className="stat-pill">{formatDuration(bestRoute.duration_seconds)}</span>
              <span className="stat-divider">·</span>
              <span className="stat-pill">{bestRoute.checkpoint_count} checkpoints evaluated</span>
            </div>
          )}
        </div>

        {rationale && rationale.length > 0 && (
          <div className="hero-rationale-box">
            <span className="rationale-heading">Why this route was selected:</span>
            <ul className="rationale-list">
              {rationale.map((reason, idx) => (
                <li key={idx} className="rationale-item">
                  <span className="rationale-bullet" aria-hidden="true">✓</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="hero-footer-note">{message}</p>
      </div>
    );
  }

  if (status === 'no_safe_route' || all_routes_unsafe) {
    return (
      <div className="recommendation-hero banner-hazard" role="region" aria-label="Safety hazard warning">
        <div className="hero-top-row">
          <span className="hero-kicker hero-kicker-hazard">
            <span className="kicker-warn-icon" aria-hidden="true">⚠</span>
            Safety Notice
          </span>
          <span className="hero-badge hero-badge-hazard">All Routes Hazardous</span>
        </div>

        <div className="hero-main">
          <h2 className="hero-hazard-title">No safe route is currently available under these weather conditions.</h2>
          <p className="hero-hazard-message">{message}</p>
          <p className="hero-hazard-subtext">
            All {routesCount} available route alternatives encounter No Travel limits or severe environmental hazards along their corridor. We recommend delaying departure or reviewing cargo load weight.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'incomplete_weather' || !is_weather_complete) {
    return (
      <div className="recommendation-hero banner-incomplete" role="region" aria-label="Incomplete weather notification">
        <div className="hero-top-row">
          <span className="hero-kicker hero-kicker-incomplete">
            <span className="kicker-info-icon" aria-hidden="true">ℹ</span>
            Verification Notice
          </span>
          <span className="hero-badge hero-badge-incomplete">Partial Weather</span>
        </div>

        <div className="hero-main">
          <h2 className="hero-incomplete-title">
            We couldn't fully verify route safety because some weather information is missing.
          </h2>
          <p className="hero-incomplete-message">{message}</p>
          <p className="hero-incomplete-subtext">
            Hourly forecasts could not be retrieved for all checkpoints on the corridor. Please check regional weather broadcasts before dispatching.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="recommendation-hero banner-neutral" role="region" aria-label="Recommendation notice">
      <p className="hero-message">{message}</p>
    </div>
  );
}
