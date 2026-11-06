import { useEffect, useState, useCallback, useRef } from 'react';
import { fetchHealth, calculateRoutes } from './api';
import { shiftNaiveIsoDateTime } from './utils/formatters';
import TripForm from './components/TripForm';
import RouteResults from './components/RouteResults';

export default function App() {
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [routes, setRoutes] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [submittedTrip, setSubmittedTrip] = useState(null);
  const [forecastOffset, setForecastOffset] = useState(0);

  const activeRequestRef = useRef(null);

  const checkConnection = useCallback(async (signal) => {
    setConnectionStatus('checking');
    try {
      const data = await fetchHealth(signal);
      if (data && data.status === 'ok') {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('unavailable');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setConnectionStatus('unavailable');
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    checkConnection(controller.signal);
    return () => controller.abort();
  }, [checkConnection]);

  // Clean up any ongoing route calculation request on unmount
  useEffect(() => {
    return () => {
      if (activeRequestRef.current) {
        activeRequestRef.current.abort();
      }
    };
  }, []);

  const handleTripSubmit = async (payload) => {
    // Abort previous in-flight request if present
    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
    }

    const controller = new AbortController();
    activeRequestRef.current = controller;

    setIsLoading(true);
    setIsRecalculating(false);
    setError(null);
    setForecastOffset(0); // Reset slider to 0 on new trip submission
    setSubmittedTrip(payload); // Preserve full trip config { origin, destination, departure, load_weight_lb, interval_miles }

    try {
      const data = await calculateRoutes(payload, controller.signal);
      setRoutes(data?.routes || []);
      setRecommendation(data?.recommendation || null);
      setHasSearched(true);
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setError({
          code: err.code || 'REQUEST_FAILED',
          message: err.message || 'An unexpected error occurred while calculating routes.',
        });
        setRoutes(null);
        setRecommendation(null);
      }
    } finally {
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
        setIsLoading(false);
      }
    }
  };

  const handleForecastOffsetChange = async (newOffset) => {
    if (!submittedTrip) return;

    // Abort previous in-flight request if present
    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
    }

    const controller = new AbortController();
    activeRequestRef.current = controller;

    setForecastOffset(newOffset);
    setIsRecalculating(true);
    setError(null);

    const shiftedDeparture = shiftNaiveIsoDateTime(submittedTrip.departure, newOffset);
    const shiftedPayload = {
      ...submittedTrip,
      departure: shiftedDeparture,
    };

    try {
      const data = await calculateRoutes(shiftedPayload, controller.signal);
      setRoutes(data?.routes || []);
      setRecommendation(data?.recommendation || null);
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setError({
          code: err.code || 'RECALCULATION_FAILED',
          message: err.message || 'Failed to recalculate routes for adjusted departure time.',
        });
      }
    } finally {
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
        setIsRecalculating(false);
      }
    }
  };

  return (
    <div className="app-layout">
      {/* App Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="brand-group">
            <span className="brand-tag">Weather-Aware Truck Routing</span>
            <span className="brand-title-compact">Dispatcher &amp; Driver Safety Assistant</span>
          </div>

          <div className="header-status">
            <div className={`status-badge ${connectionStatus}`}>
              <span className="status-dot" aria-hidden="true" />
              <span>
                {connectionStatus === 'checking' && 'Service: Checking...'}
                {connectionStatus === 'connected' && 'Service: Connected'}
                {connectionStatus === 'unavailable' && 'Service: Offline'}
              </span>
            </div>
            {connectionStatus === 'unavailable' && (
              <button
                className="retry-button"
                onClick={() => checkConnection()}
                type="button"
                title="Retry backend health check"
              >
                Reconnect
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Friendly First-Time Introduction Hero */}
      <section className="intro-hero" aria-label="Overview">
        <div className="intro-hero-inner">
          <h1 className="intro-headline">Plan your route. Understand the weather. Travel safer.</h1>
          <p className="intro-lead">
            Enter your truck trip details. We analyze weather along available truck routes and help identify the safest eligible alternative.
          </p>

          <div className="intro-steps-strip">
            <div className="step-card">
              <span className="step-number">1</span>
              <div className="step-text">
                <span className="step-title">Enter your trip</span>
                <span className="step-subtitle">Origin, destination, cargo weight &amp; schedule</span>
              </div>
            </div>

            <div className="step-arrow" aria-hidden="true">→</div>

            <div className="step-card">
              <span className="step-number">2</span>
              <div className="step-text">
                <span className="step-title">Analyze weather conditions</span>
                <span className="step-subtitle">Hourly winds, rain, &amp; snow at every checkpoint</span>
              </div>
            </div>

            <div className="step-arrow" aria-hidden="true">→</div>

            <div className="step-card">
              <span className="step-number">3</span>
              <div className="step-text">
                <span className="step-title">Choose the safest option</span>
                <span className="step-subtitle">Review hazard scores &amp; recommended corridor</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Workspace */}
      <main className="app-main">
        <div className="workspace-grid">
          {/* Left Column: Trip Configuration Form */}
          <aside className="form-column" aria-label="Trip planning panel">
            <TripForm onSubmit={handleTripSubmit} isLoading={isLoading} />
          </aside>

          {/* Right Column: Dynamic Results Area */}
          <section className="results-column" aria-live="polite">
            {isLoading && (
              <div className="loading-card" role="status">
                <div className="loading-spinner-large" aria-hidden="true" />
                <h3 className="loading-title">Analyzing Corridors &amp; Hourly Weather</h3>
                <p className="loading-description">
                  Calculating truck routes, interpolating arrival times at each checkpoint, and fetching live hourly Open-Meteo forecasts...
                </p>
              </div>
            )}

            {error && !isLoading && (
              <div className="error-card" role="alert">
                <div className="error-icon" aria-hidden="true">✕</div>
                <div className="error-content">
                  <span className="error-code-badge">{error.code}</span>
                  <h3 className="error-title">Routing Request Failed</h3>
                  <p className="error-message">{error.message}</p>
                </div>
              </div>
            )}

            {!isLoading && !error && hasSearched && routes && (
              <RouteResults
                routes={routes}
                recommendation={recommendation}
                origin={submittedTrip?.origin}
                destination={submittedTrip?.destination}
                baselineDeparture={submittedTrip?.departure}
                offsetHours={forecastOffset}
                onChangeOffset={handleForecastOffsetChange}
                isRecalculating={isRecalculating}
              />
            )}

            {!isLoading && !error && !hasSearched && (
              <div className="placeholder-state">
                <div className="placeholder-icon-wrap" aria-hidden="true">🚛</div>
                <h3 className="placeholder-title">Ready to Plan Your Trip</h3>
                <p className="placeholder-text">
                  Fill in your trip details on the left and click <strong>Analyze My Route</strong>. We will check road conditions, identify high-wind rollover risks, and display the safest eligible route.
                </p>

                <div className="placeholder-cards-grid">
                  <div className="info-card">
                    <span className="info-icon" aria-hidden="true">⏱</span>
                    <span className="info-title">Local Time Preservation</span>
                    <span className="info-desc">Departure times are kept in origin-local time for exact matching.</span>
                  </div>

                  <div className="info-card">
                    <span className="info-icon" aria-hidden="true">⚖</span>
                    <span className="info-title">Cargo Rollover Protection</span>
                    <span className="info-desc">Loads &gt;30,000 lbs trigger earlier wind warnings for vehicle safety.</span>
                  </div>

                  <div className="info-card">
                    <span className="info-icon" aria-hidden="true">🛡</span>
                    <span className="info-title">No Travel Screening</span>
                    <span className="info-desc">Routes crossing extreme hazards are flagged immediately.</span>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="app-footer">
        <div className="footer-inner">
          <span>Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo.com</a> (CC BY 4.0)</span>
          <span>•</span>
          <span>Truck routing powered by TomTom Maps Routing API</span>
        </div>
      </footer>
    </div>
  );
}
