import { useEffect, useState } from 'react';

import ForecastSlider from './ForecastSlider';
import RecommendationBanner from './RecommendationBanner';
import RouteCard from './RouteCard';
import RouteMap from './RouteMap';

function findBestRoute(routes, recommendation) {
  if (!routes || routes.length === 0) return null;
  return (
    routes.find((r) => r.is_recommended) ||
    routes.find((r) => r.id === recommendation?.recommended_route_id) ||
    routes[0]
  );
}

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
  const bestRoute = findBestRoute(routes, recommendation);
  const [selectedRouteId, setSelectedRouteId] = useState(bestRoute?.id || 1);

  // New results (new trip or slider change) put the map back on the recommended route.
  useEffect(() => {
    if (bestRoute?.id) setSelectedRouteId(bestRoute.id);
  }, [routes, bestRoute?.id]);

  if (!routes || routes.length === 0) {
    return (
      <div className="results-empty-state">
        <p className="empty-message">No routes available to display.</p>
      </div>
    );
  }

  return (
    <section className="route-results-section" aria-label="Route analysis results">
      <ForecastSlider
        offsetHours={offsetHours}
        onChangeOffset={onChangeOffset}
        baselineDeparture={baselineDeparture}
        isLoading={isRecalculating}
      />

      <RecommendationBanner
        recommendation={recommendation}
        routesCount={routes.length}
        bestRoute={bestRoute}
        allRoutes={routes}
      />

      <div className="results-split-grid">
        <div className="results-cards-column">
          <div className="routes-list-header">
            <h2 className="results-heading">
              Evaluated Routes <span className="results-count">({routes.length})</span>
            </h2>
            <span className="results-subtitle">Click a card or map line to inspect checkpoint weather and risk.</span>
          </div>

          <div className="routes-list">
            {routes.map((route) => (
              <RouteCard
                key={route.id}
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

        <div className="results-map-column">
          <div className="map-sticky-wrapper">
            <RouteMap
              routes={routes}
              selectedRouteId={selectedRouteId}
              onSelectRoute={setSelectedRouteId}
              originLabel={origin}
              destinationLabel={destination}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
