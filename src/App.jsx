import AppHeader from './components/AppHeader';
import EmptyState from './components/EmptyState';
import IntroHero from './components/IntroHero';
import RouteResults from './components/RouteResults';
import TripForm from './components/TripForm';
import useBackendHealth from './hooks/useBackendHealth';
import useRouteAnalysis from './hooks/useRouteAnalysis';

export default function App() {
  const health = useBackendHealth();
  const {
    routes,
    recommendation,
    error,
    isLoading,
    isRecalculating,
    hasSearched,
    submittedTrip,
    forecastOffset,
    submitTrip,
    changeForecastOffset,
  } = useRouteAnalysis();

  const showResults = !isLoading && !error && hasSearched && routes;
  const showEmptyState = !isLoading && !error && !hasSearched;

  return (
    <div className="app-layout">
      <AppHeader connectionStatus={health.status} onRetry={health.retry} />
      <IntroHero />

      <main className="app-main">
        <div className="workspace-grid">
          <aside className="form-column" aria-label="Trip planning panel">
            <TripForm onSubmit={submitTrip} isLoading={isLoading} />
          </aside>

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

            {showResults && (
              <RouteResults
                routes={routes}
                recommendation={recommendation}
                origin={submittedTrip?.origin}
                destination={submittedTrip?.destination}
                baselineDeparture={submittedTrip?.departure}
                offsetHours={forecastOffset}
                onChangeOffset={changeForecastOffset}
                isRecalculating={isRecalculating}
              />
            )}

            {showEmptyState && <EmptyState />}
          </section>
        </div>
      </main>

      <footer className="app-footer">
        <div className="footer-inner">
          <span>
            Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo.com</a> (CC BY 4.0)
          </span>
          <span>•</span>
          <span>Truck routing powered by TomTom Maps Routing API</span>
        </div>
      </footer>
    </div>
  );
}
