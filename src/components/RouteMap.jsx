import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { RISK_COLORS, ROUTE_COLORS, getRiskColor } from '../constants/risk';
import { buildCorridorSegments } from '../utils/corridor';
import { formatDistance, formatDuration, getShortLocationLabel } from '../utils/formatters';
import CheckpointPopup from './CheckpointPopup';

const US_CENTER = [39.8283, -98.5795];

const LEGEND = [
  { level: 'Low', label: 'Low (<25 mph)' },
  { level: 'Moderate', label: 'Moderate (25-<35 mph)' },
  { level: 'High', label: 'High (35-<45 mph)' },
  { level: 'Severe', label: 'Severe (45-<55 mph)' },
  { level: 'No Travel', label: 'No Travel (≥55 mph)' },
  { level: 'Unassessed', label: 'Unassessed' },
];

const toLatLng = (pt) => [pt.latitude, pt.longitude];

function checkpointIcon(riskLevel, isEndpoint) {
  return L.divIcon({
    className: 'custom-cp-marker-wrap',
    html: `
      <div class="cp-map-dot ${isEndpoint ? 'cp-map-dot-lg' : ''}" style="background-color: ${getRiskColor(riskLevel)}; border-color: #ffffff;">
        <span class="cp-dot-inner"></span>
      </div>
    `,
    iconSize: isEndpoint ? [18, 18] : [14, 14],
    iconAnchor: isEndpoint ? [9, 9] : [7, 7],
    popupAnchor: [0, -8],
  });
}

function endpointIcon(letter, type) {
  const background = type === 'origin' ? '#10b981' : '#2563eb';
  return L.divIcon({
    className: 'custom-endpoint-marker-wrap',
    html: `
      <div class="endpoint-pin ${type}" style="background-color: ${background};">
        <span class="endpoint-letter">${letter}</span>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });
}

// Fits the map to all routes, but only when a new set of routes comes in.
// Selecting a different route shouldn't reset the user's zoom.
function FitToRoutes({ routes }) {
  const map = useMap();
  const lastFitRef = useRef(null);

  useEffect(() => {
    if (!routes || routes.length === 0) return;

    const signature = routes.map((r) => `${r.id}:${r.geometry?.length}`).join('|');
    if (lastFitRef.current === signature) return;
    lastFitRef.current = signature;

    const coords = routes
      .flatMap((route) => (Array.isArray(route.geometry) ? route.geometry : []))
      .filter((pt) => pt?.latitude != null && pt?.longitude != null)
      .map(toLatLng);

    if (coords.length > 0) {
      map.fitBounds(L.latLngBounds(coords), { padding: [45, 45], maxZoom: 13 });
    }
  }, [routes, map]);

  return null;
}

function getEndpointCoord(route, key, geometryIndex) {
  const point = route?.[key];
  if (point?.latitude && point?.longitude) return [point.latitude, point.longitude];

  const geometry = route?.geometry;
  if (geometry?.length > 0) {
    const fallback = geometry[geometryIndex === -1 ? geometry.length - 1 : geometryIndex];
    return toLatLng(fallback);
  }
  return null;
}

export default function RouteMap({
  routes = [],
  selectedRouteId = 1,
  onSelectRoute = () => {},
  originLabel = '',
  destinationLabel = '',
}) {
  const selectedRoute = routes?.find((r) => r.id === selectedRouteId) || routes?.[0];

  const originCoord = useMemo(() => getEndpointCoord(selectedRoute, 'origin', 0), [selectedRoute]);
  const destCoord = useMemo(() => getEndpointCoord(selectedRoute, 'destination', -1), [selectedRoute]);

  const corridorSegments = useMemo(() => {
    if (!selectedRoute?.geometry || !selectedRoute?.checkpoints) return [];
    return buildCorridorSegments(selectedRoute.geometry, selectedRoute.checkpoints);
  }, [selectedRoute]);

  if (!routes || routes.length === 0) {
    return (
      <div className="map-empty-state">
        <p>No route geometries available to render.</p>
      </div>
    );
  }

  const originName = getShortLocationLabel(originLabel) || 'Origin';
  const destName = getShortLocationLabel(destinationLabel) || 'Destination';
  const checkpoints = Array.isArray(selectedRoute.checkpoints) ? selectedRoute.checkpoints : [];

  return (
    <div className="route-map-wrapper" role="region" aria-label="Interactive route alternatives and checkpoints map">
      <div className="map-overlay-header">
        <div className="overlay-route-info">
          <span className="overlay-kicker">Viewing Corridor:</span>
          <span className="overlay-route-title">
            Route {selectedRoute.id}
            {selectedRoute.is_recommended && <span className="overlay-recommended-badge">★ Recommended</span>}
          </span>
          <span className="overlay-stats">
            {formatDistance(selectedRoute.distance_miles)} • {formatDuration(selectedRoute.duration_seconds)} •{' '}
            {selectedRoute.checkpoint_count || selectedRoute.checkpoints?.length} checkpoints
          </span>
        </div>

        {selectedRoute.has_non_truck_sections && (
          <div
            className="overlay-warning-pill"
            role="alert"
            title={selectedRoute.warnings?.[0] || 'Contains non-truck designated sections'}
          >
            <span aria-hidden="true">⚠</span> Non-Truck Designated Sections
          </div>
        )}
      </div>

      <MapContainer center={originCoord || US_CENTER} zoom={4} className="leaflet-map-canvas" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={18}
        />

        <FitToRoutes routes={routes} />

        {/* Alternatives are drawn first so the selected route sits on top. */}
        {routes
          .filter((r) => r.id !== selectedRouteId)
          .map((route) => {
            const positions = (route.geometry || []).map(toLatLng);
            if (positions.length === 0) return null;

            return (
              <Polyline
                key={`route-alt-${route.id}`}
                positions={positions}
                pathOptions={{
                  color: ROUTE_COLORS[route.id] || '#64748b',
                  weight: 4,
                  opacity: 0.5,
                  dashArray: route.is_recommended ? undefined : '6, 6',
                }}
                eventHandlers={{ click: () => onSelectRoute(route.id) }}
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

        {selectedRoute.geometry && (
          <>
            {/* White casing underneath keeps the heatmap readable on busy map tiles. */}
            <Polyline
              positions={selectedRoute.geometry.map(toLatLng)}
              pathOptions={{ color: '#ffffff', weight: 10, opacity: 0.9 }}
              interactive={false}
            />

            {corridorSegments.map((seg, idx) => (
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

        {checkpoints.map((cp) => {
          if (cp.latitude == null || cp.longitude == null) return null;

          const riskLevel = cp.risk?.overall_level || 'Unassessed';
          const isEndpoint = cp.id === 1 || cp.id === checkpoints.length;

          return (
            <Marker
              key={`cp-${selectedRoute.id}-${cp.id}`}
              position={[cp.latitude, cp.longitude]}
              icon={checkpointIcon(riskLevel, isEndpoint)}
            >
              <Tooltip direction="top" offset={[0, -10]}>
                <span>
                  <strong>Mile {cp.mile_marker}</strong> • {riskLevel}
                </span>
              </Tooltip>
              <Popup className="checkpoint-popup-wrapper">
                <CheckpointPopup checkpoint={cp} riskLevel={riskLevel} />
              </Popup>
            </Marker>
          );
        })}

        {originCoord && (
          <Marker position={originCoord} icon={endpointIcon('A', 'origin')}>
            <Popup>
              <div className="endpoint-popup">
                <strong>Origin: {originName}</strong>
                <p>Departure start point</p>
              </div>
            </Popup>
          </Marker>
        )}

        {destCoord && (
          <Marker position={destCoord} icon={endpointIcon('B', 'destination')}>
            <Popup>
              <div className="endpoint-popup">
                <strong>Destination: {destName}</strong>
                <p>Final arrival point</p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      <div className="map-legend-bar" aria-label="Hazard risk legend">
        <span className="legend-label">Checkpoint Risk:</span>
        <div className="legend-items-row">
          {LEGEND.map(({ level, label }) => (
            <span key={level} className="legend-item">
              <span className="legend-swatch" style={{ backgroundColor: RISK_COLORS[level] }} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
