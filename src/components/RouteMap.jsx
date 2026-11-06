import { useEffect, useMemo, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  Tooltip,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import {
  formatDateTime,
  formatDistance,
  formatDuration,
  getShortLocationLabel,
} from '../utils/formatters';

// Hazard color palette matching Phase 7/7.2 design tokens
const RISK_COLORS = {
  Low: '#10b981',
  Moderate: '#f59e0b',
  High: '#f97316',
  Severe: '#ef4444',
  'No Travel': '#7f1d1d',
  Unassessed: '#64748b',
};

// Route alternative line colors
const ROUTE_COLORS = {
  1: '#2563eb', // Primary Blue
  2: '#7c3aed', // Purple
  3: '#0891b2', // Teal
};

function getRiskColor(level) {
  return RISK_COLORS[level] || RISK_COLORS.Unassessed;
}

/**
 * Creates custom HTML divIcon for corridor checkpoints with risk-colored dot.
 */
function createCheckpointIcon(riskLevel, isEndpoint = false) {
  const color = getRiskColor(riskLevel);
  return L.divIcon({
    className: 'custom-cp-marker-wrap',
    html: `
      <div class="cp-map-dot ${isEndpoint ? 'cp-map-dot-lg' : ''}" style="background-color: ${color}; border-color: #ffffff;">
        <span class="cp-dot-inner"></span>
      </div>
    `,
    iconSize: isEndpoint ? [18, 18] : [14, 14],
    iconAnchor: isEndpoint ? [9, 9] : [7, 7],
    popupAnchor: [0, -8],
  });
}

/**
 * Creates custom HTML divIcon for trip Origin and Destination.
 */
function createEndpointIcon(letter, type) {
  const bg = type === 'origin' ? '#10b981' : '#2563eb';
  return L.divIcon({
    className: 'custom-endpoint-marker-wrap',
    html: `
      <div class="endpoint-pin ${type}" style="background-color: ${bg};">
        <span class="endpoint-letter">${letter}</span>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });
}

/**
 * Viewport updater component to fit map bounds to all routes whenever trip results change.
 */
function MapViewportController({ routes, selectedRouteId }) {
  const map = useMap();
  const lastFitSignatureRef = useRef(null);

  useEffect(() => {
    if (!routes || routes.length === 0) return;

    // Build signature from route IDs and lengths to avoid unnecessary refits
    const sig = routes.map((r) => `${r.id}:${r.geometry?.length}`).join('|');
    if (lastFitSignatureRef.current === sig) return;
    lastFitSignatureRef.current = sig;

    const allCoords = [];
    routes.forEach((route) => {
      if (Array.isArray(route.geometry)) {
        route.geometry.forEach((pt) => {
          if (pt?.latitude != null && pt?.longitude != null) {
            allCoords.push([pt.latitude, pt.longitude]);
          }
        });
      }
    });

    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      map.fitBounds(bounds, {
        padding: [45, 45],
        maxZoom: 13,
      });
    }
  }, [routes, map]);

  return null;
}

/**
 * Partition selected route geometry into segments between checkpoints,
 * coloring each segment according to the risk level of that segment/checkpoint.
 */
function buildCorridorHeatmapSegments(geometry, checkpoints) {
  if (!Array.isArray(geometry) || geometry.length < 2) return [];
  if (!Array.isArray(checkpoints) || checkpoints.length === 0) {
    return [
      {
        positions: geometry.map((pt) => [pt.latitude, pt.longitude]),
        riskLevel: 'Unassessed',
        mileMarker: 0,
      },
    ];
  }

  // Find closest geometry index for each checkpoint in sequence
  const checkpointIndices = [];
  let currentGeomIdx = 0;
  const numGeom = geometry.length;

  for (let c = 0; c < checkpoints.length; c++) {
    const cp = checkpoints[c];
    if (cp.latitude == null || cp.longitude == null) continue;

    const riskLevel = cp.risk?.overall_level || 'Unassessed';

    if (c === 0) {
      checkpointIndices.push({ cpIndex: c, geomIndex: 0, riskLevel, mileMarker: cp.mile_marker });
      continue;
    }
    if (c === checkpoints.length - 1) {
      checkpointIndices.push({
        cpIndex: c,
        geomIndex: numGeom - 1,
        riskLevel,
        mileMarker: cp.mile_marker,
      });
      break;
    }

    // Search forward for closest coordinate within a window
    let bestIdx = currentGeomIdx;
    let minD2 = Infinity;
    const searchLimit = Math.min(numGeom, currentGeomIdx + 1000);
    for (let g = currentGeomIdx; g < searchLimit; g++) {
      const dLat = geometry[g].latitude - cp.latitude;
      const dLon = geometry[g].longitude - cp.longitude;
      const d2 = dLat * dLat + dLon * dLon;
      if (d2 < minD2) {
        minD2 = d2;
        bestIdx = g;
      }
    }
    currentGeomIdx = bestIdx;
    checkpointIndices.push({
      cpIndex: c,
      geomIndex: bestIdx,
      riskLevel,
      mileMarker: cp.mile_marker,
    });
  }

  // Construct segments centered around each checkpoint using midpoint partitioning
  const segments = [];
  const numCps = checkpointIndices.length;

  if (numCps === 1) {
    segments.push({
      positions: geometry.map((pt) => [pt.latitude, pt.longitude]),
      riskLevel: checkpointIndices[0].riskLevel,
      mileMarker: checkpointIndices[0].mileMarker,
    });
    return segments;
  }

  for (let k = 0; k < numCps; k++) {
    const curr = checkpointIndices[k];
    const startIdx =
      k === 0
        ? 0
        : Math.floor((checkpointIndices[k - 1].geomIndex + curr.geomIndex) / 2);
    const endIdx =
      k === numCps - 1
        ? numGeom - 1
        : Math.ceil((curr.geomIndex + checkpointIndices[k + 1].geomIndex) / 2);

    const slice = geometry.slice(startIdx, Math.max(startIdx + 2, endIdx + 1));
    if (slice.length >= 2) {
      segments.push({
        positions: slice.map((pt) => [pt.latitude, pt.longitude]),
        riskLevel: curr.riskLevel,
        mileMarker: curr.mileMarker,
      });
    }
  }

  // Fallback if no segments could be sliced
  if (segments.length === 0) {
    segments.push({
      positions: geometry.map((pt) => [pt.latitude, pt.longitude]),
      riskLevel: checkpoints[0]?.risk?.overall_level || 'Unassessed',
      mileMarker: checkpoints[0]?.mile_marker || 0,
    });
  }

  return segments;
}

export default function RouteMap({
  routes = [],
  selectedRouteId = 1,
  onSelectRoute = () => {},
  recommendation = null,
  originLabel = '',
  destinationLabel = '',
}) {
  if (!routes || routes.length === 0) {
    return (
      <div className="map-empty-state">
        <p>No route geometries available to render.</p>
      </div>
    );
  }

  const selectedRoute =
    routes.find((r) => r.id === selectedRouteId) || routes[0];

  const originName = getShortLocationLabel(originLabel) || 'Origin';
  const destName = getShortLocationLabel(destinationLabel) || 'Destination';

  // Extract endpoints from selected route
  const originCoord = useMemo(() => {
    if (selectedRoute?.origin?.latitude && selectedRoute?.origin?.longitude) {
      return [selectedRoute.origin.latitude, selectedRoute.origin.longitude];
    }
    if (selectedRoute?.geometry?.[0]) {
      return [selectedRoute.geometry[0].latitude, selectedRoute.geometry[0].longitude];
    }
    return null;
  }, [selectedRoute]);

  const destCoord = useMemo(() => {
    if (selectedRoute?.destination?.latitude && selectedRoute?.destination?.longitude) {
      return [selectedRoute.destination.latitude, selectedRoute.destination.longitude];
    }
    if (selectedRoute?.geometry && selectedRoute.geometry.length > 0) {
      const last = selectedRoute.geometry[selectedRoute.geometry.length - 1];
      return [last.latitude, last.longitude];
    }
    return null;
  }, [selectedRoute]);

  // Build weather-risk heatmap segments along the selected route's real geometry
  const heatmapSegments = useMemo(() => {
    if (!selectedRoute?.geometry || !selectedRoute?.checkpoints) return [];
    return buildCorridorHeatmapSegments(selectedRoute.geometry, selectedRoute.checkpoints);
  }, [selectedRoute]);

  // Fallback initial center (Continental US center)
  const initialCenter = originCoord || [39.8283, -98.5795];

  return (
    <div className="route-map-wrapper" role="region" aria-label="Interactive route alternatives and checkpoints map">
      {/* Map Interactive Overlay Header */}
      <div className="map-overlay-header">
        <div className="overlay-route-info">
          <span className="overlay-kicker">
            Viewing Corridor:
          </span>
          <span className="overlay-route-title">
            Route {selectedRoute.id}
            {selectedRoute.is_recommended && (
              <span className="overlay-recommended-badge">★ Recommended</span>
            )}
          </span>
          <span className="overlay-stats">
            {formatDistance(selectedRoute.distance_miles)} • {formatDuration(selectedRoute.duration_seconds)} • {selectedRoute.checkpoint_count || selectedRoute.checkpoints?.length} checkpoints
          </span>
        </div>

        {/* Warning notification for non-truck-compatible sections if present */}
        {selectedRoute.has_non_truck_sections && (
          <div className="overlay-warning-pill" role="alert" title={selectedRoute.warnings?.[0] || 'Contains non-truck designated sections'}>
            <span aria-hidden="true">⚠</span> Non-Truck Designated Sections
          </div>
        )}
      </div>

      <MapContainer
        center={initialCenter}
        zoom={4}
        className="leaflet-map-canvas"
        scrollWheelZoom={true}
      >
        {/* OpenStreetMap Tile Layer with standard CC-BY-SA attribution */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={18}
        />

        {/* Dynamic Viewport Bounds Controller */}
        <MapViewportController routes={routes} selectedRouteId={selectedRouteId} />

        {/* Draw Unselected Routes first (bottom layer) */}
        {routes
          .filter((r) => r.id !== selectedRouteId)
          .map((route) => {
            const positions = (route.geometry || []).map((pt) => [
              pt.latitude,
              pt.longitude,
            ]);
            if (positions.length === 0) return null;

            const color = ROUTE_COLORS[route.id] || '#64748b';

            return (
              <Polyline
                key={`route-alt-${route.id}`}
                positions={positions}
                pathOptions={{
                  color: color,
                  weight: 4,
                  opacity: 0.5,
                  dashArray: route.is_recommended ? undefined : '6, 6',
                }}
                eventHandlers={{
                  click: () => onSelectRoute(route.id),
                }}
              >
                <Tooltip sticky>
                  <div className="polyline-tooltip">
                    <strong>Route {route.id}</strong> {route.is_recommended ? '(Recommended)' : ''}
                    <br />
                    {formatDistance(route.distance_miles)} • {formatDuration(route.duration_seconds)}
                    <br />
                    <span className="tooltip-action">Click to select and view checkpoints</span>
                  </div>
                </Tooltip>
              </Polyline>
            );
          })}

        {/* Draw Selected Route Corridor Heatmap with high-contrast background casing */}
        {selectedRoute && selectedRoute.geometry && (
          <>
            {/* White Casing for high contrast under all segments */}
            <Polyline
              positions={selectedRoute.geometry.map((pt) => [pt.latitude, pt.longitude])}
              pathOptions={{
                color: '#ffffff',
                weight: 10,
                opacity: 0.9,
              }}
              interactive={false}
            />

            {/* Weather-Risk Heatmap Segments along Actual Corridor Geometry */}
            {heatmapSegments.map((seg, idx) => (
              <Polyline
                key={`heatmap-seg-${selectedRoute.id}-${idx}-${seg.riskLevel}`}
                positions={seg.positions}
                pathOptions={{
                  color: getRiskColor(seg.riskLevel),
                  weight: 6,
                  opacity: 0.95,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              >
                <Tooltip sticky>
                  <div className="polyline-tooltip">
                    <strong>Route {selectedRoute.id} Corridor Segment</strong>
                    <br />
                    Risk Level: <strong style={{ color: getRiskColor(seg.riskLevel) }}>{seg.riskLevel}</strong>
                    {seg.mileMarker != null && <span> • Mile {seg.mileMarker}</span>}
                  </div>
                </Tooltip>
              </Polyline>
            ))}
          </>
        )}

        {/* Selected Route Checkpoint Markers (compact circles colored by backend risk) */}
        {selectedRoute &&
          Array.isArray(selectedRoute.checkpoints) &&
          selectedRoute.checkpoints.map((cp) => {
            if (cp.latitude == null || cp.longitude == null) return null;

            const risk = cp.risk || {};
            const weather = cp.weather || {};
            const riskLevel = risk.overall_level || 'Unassessed';
            const assessmentStatus = risk.assessment_status || weather.status || 'unavailable';

            return (
              <Marker
                key={`cp-${selectedRoute.id}-${cp.id}`}
                position={[cp.latitude, cp.longitude]}
                icon={createCheckpointIcon(riskLevel, cp.id === 1 || cp.id === selectedRoute.checkpoints.length)}
              >
                <Tooltip direction="top" offset={[0, -10]}>
                  <span>
                    <strong>Mile {cp.mile_marker}</strong> • {riskLevel}
                  </span>
                </Tooltip>

                <Popup className="checkpoint-popup-wrapper">
                  <div className="checkpoint-popup-card">
                    <div className="cp-popup-header">
                      <div className="cp-header-title-row">
                        <span className="cp-number-badge">CP #{cp.id}</span>
                        <h4 className="cp-popup-title">Mile {cp.mile_marker} mi</h4>
                      </div>
                      <span
                        className="cp-risk-pill"
                        style={{
                          backgroundColor: getRiskColor(riskLevel),
                          color: '#ffffff',
                        }}
                      >
                        {riskLevel}
                      </span>
                    </div>

                    <div className="cp-popup-meta">
                      <div className="cp-meta-row">
                        <span className="cp-meta-label">Est. Time (Local):</span>
                        <span className="cp-meta-val">{formatDateTime(cp.eta)}</span>
                      </div>
                      <div className="cp-meta-row">
                        <span className="cp-meta-label">Assessment:</span>
                        <span className={`cp-status-tag status-${assessmentStatus}`}>
                          {assessmentStatus === 'assessed'
                            ? 'Complete forecast'
                            : assessmentStatus === 'partial'
                            ? 'Partial coverage'
                            : 'Missing forecast'}
                        </span>
                      </div>
                    </div>

                    <hr className="cp-popup-divider" />

                    <div className="cp-metrics-table">
                      {/* Wind Speed */}
                      <div className="cp-metric-row">
                        <span className="metric-name">Wind:</span>
                        <span className="metric-val">
                          {weather.wind_speed_mph != null
                            ? `${weather.wind_speed_mph} mph`
                            : 'Unavailable'}
                        </span>
                        {risk.wind_level && (
                          <span
                            className="metric-tier-chip"
                            style={{ color: getRiskColor(risk.wind_level) }}
                          >
                            {risk.wind_level}
                          </span>
                        )}
                      </div>

                      {/* Rain */}
                      <div className="cp-metric-row">
                        <span className="metric-name">Rain:</span>
                        <span className="metric-val">
                          {weather.rain_in != null
                            ? `${weather.rain_in} in/hr`
                            : 'Unavailable'}
                        </span>
                        {risk.rain_level && (
                          <span
                            className="metric-tier-chip"
                            style={{ color: getRiskColor(risk.rain_level) }}
                          >
                            {risk.rain_level}
                          </span>
                        )}
                      </div>

                      {/* Snowfall */}
                      <div className="cp-metric-row">
                        <span className="metric-name">Snowfall:</span>
                        <span className="metric-val">
                          {weather.snowfall_in != null
                            ? `${weather.snowfall_in} in/hr`
                            : 'Unavailable'}
                        </span>
                        {risk.snow_level && (
                          <span
                            className="metric-tier-chip"
                            style={{ color: getRiskColor(risk.snow_level) }}
                          >
                            {risk.snow_level}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Origin Marker */}
        {originCoord && (
          <Marker position={originCoord} icon={createEndpointIcon('A', 'origin')}>
            <Popup>
              <div className="endpoint-popup">
                <strong>Origin: {originName}</strong>
                <p>Departure start point</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination Marker */}
        {destCoord && (
          <Marker position={destCoord} icon={createEndpointIcon('B', 'destination')}>
            <Popup>
              <div className="endpoint-popup">
                <strong>Destination: {destName}</strong>
                <p>Final arrival point</p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Map Footer Legend Strip */}
      <div className="map-legend-bar" aria-label="Hazard risk legend">
        <span className="legend-label">Checkpoint Risk:</span>
        <div className="legend-items-row">
          <span className="legend-item">
            <span className="legend-swatch" style={{ backgroundColor: RISK_COLORS.Low }} />
            Low (&lt;25 mph)
          </span>
          <span className="legend-item">
            <span className="legend-swatch" style={{ backgroundColor: RISK_COLORS.Moderate }} />
            Moderate (25-&lt;35 mph)
          </span>
          <span className="legend-item">
            <span className="legend-swatch" style={{ backgroundColor: RISK_COLORS.High }} />
            High (35-&lt;45 mph)
          </span>
          <span className="legend-item">
            <span className="legend-swatch" style={{ backgroundColor: RISK_COLORS.Severe }} />
            Severe (45-&lt;55 mph)
          </span>
          <span className="legend-item">
            <span className="legend-swatch" style={{ backgroundColor: RISK_COLORS['No Travel'] }} />
            No Travel (&ge;55 mph)
          </span>
          <span className="legend-item">
            <span className="legend-swatch" style={{ backgroundColor: RISK_COLORS.Unassessed }} />
            Unassessed
          </span>
        </div>
      </div>
    </div>
  );
}

