import { useState, useEffect } from 'react';
import ForecastSlider from './ForecastSlider';
import RecommendationBanner from './RecommendationBanner';
import RouteCard from './RouteCard';
import RouteMap from './RouteMap';

export default function RouteResults({
  routes,
  recommendation,
  origin,
  destination,
  baselineDeparture = '',
  offsetHours = 0,
  onChangeOffset = () => {},
  isRecalculating = false,
}) {
  if (!routes || routes.length === 0) {
    return (
      <div className="results-empty-state">
        <p className="empty-message">No routes available to display.</p>
      </div>
    );
  }

  const bestRoute =
    routes.find((r) => r.is_recommended) ||
    routes.find((r) => r.id === recommendation?.recommended_route_id) ||
    routes[0] ||
    null;

  // Track the route actively viewed on the map (defaults to recommended route)
  const [selectedRouteId, setSelectedRouteId] = useState(bestRoute?.id || 1);

  // Synchronize selected route when new trip search results arrive
  useEffect(() => {
    if (bestRoute?.id) {
      setSelectedRouteId(bestRoute.id);
    }
  }, [routes, bestRoute?.id]);

  return (
    <section className="route-results-section" aria-label="Route analysis results">
      {/* 0–48h Departure & Weather Forecast Window Slider */}
      <ForecastSlider
        offsetHours={offsetHours}
        onChangeOffset={onChangeOffset}
        baselineDeparture={baselineDeparture}
        isLoading={isRecalculating}
      />

      {/* Top Level Recommendation Banner */}
      <RecommendationBanner
        recommendation={recommendation}
        routesCount={routes.length}
        bestRoute={bestRoute}
        allRoutes={routes}
      />

      {/* Main Split Grid: Route Cards on Left, Interactive Map on Right */}
      <div className="results-split-grid">
        {/* Left Column: Route Alternatives Cards */}
        <div className="results-cards-column">
          <div className="routes-list-header">
            <h2 className="results-heading">
              Evaluated Routes <span className="results-count">({routes.length})</span>
            </h2>
            <span className="results-subtitle">
              Click a card or map line to inspect checkpoint weather and risk.
            </span>
          </div>

          <div className="routes-list">
            {routes.map((route) => (
              <RouteCard
                key={route.id || route.summary?.departureTime}
                route={route}
                origin={origin}
                destination={destination}
                recommendedRoute={bestRoute}
                isSelected={route.id === selectedRouteId}
                onSelect={() => setSelectedRouteId(route.id)}
              />
            ))}
          </div>
        </div>

        {/* Right Column: Sticky Interactive Leaflet Map */}
        <div className="results-map-column">
          <div className="map-sticky-wrapper">
            <RouteMap
              routes={routes}
              selectedRouteId={selectedRouteId}
              onSelectRoute={setSelectedRouteId}
              recommendation={recommendation}
              originLabel={origin}
              destinationLabel={destination}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
