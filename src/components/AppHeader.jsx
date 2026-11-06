const STATUS_LABELS = {
  checking: 'Service: Checking...',
  connected: 'Service: Connected',
  unavailable: 'Service: Offline',
};

export default function AppHeader({ connectionStatus, onRetry }) {
  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="brand-group">
          <span className="brand-tag">Weather-Aware Truck Routing</span>
          <span className="brand-title-compact">Dispatcher &amp; Driver Safety Assistant</span>
        </div>

        <div className="header-status">
          <div className={`status-badge ${connectionStatus}`}>
            <span className="status-dot" aria-hidden="true" />
            <span>{STATUS_LABELS[connectionStatus]}</span>
          </div>
          {connectionStatus === 'unavailable' && (
            <button
              type="button"
              className="retry-button"
              onClick={onRetry}
              title="Retry backend health check"
            >
              Reconnect
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
