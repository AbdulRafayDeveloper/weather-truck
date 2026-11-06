import { getRiskColor } from '../constants/risk';
import { formatDateTime } from '../utils/formatters';

const ASSESSMENT_LABELS = {
  assessed: 'Complete forecast',
  partial: 'Partial coverage',
};

function MetricRow({ name, value, unit, level }) {
  return (
    <div className="cp-metric-row">
      <span className="metric-name">{name}:</span>
      <span className="metric-val">{value != null ? `${value} ${unit}` : 'Unavailable'}</span>
      {level && (
        <span className="metric-tier-chip" style={{ color: getRiskColor(level) }}>
          {level}
        </span>
      )}
    </div>
  );
}

export default function CheckpointPopup({ checkpoint, riskLevel }) {
  const risk = checkpoint.risk || {};
  const weather = checkpoint.weather || {};
  const assessmentStatus = risk.assessment_status || weather.status || 'unavailable';

  return (
    <div className="checkpoint-popup-card">
      <div className="cp-popup-header">
        <div className="cp-header-title-row">
          <span className="cp-number-badge">CP #{checkpoint.id}</span>
          <h4 className="cp-popup-title">Mile {checkpoint.mile_marker} mi</h4>
        </div>
        <span
          className="cp-risk-pill"
          style={{ backgroundColor: getRiskColor(riskLevel), color: '#ffffff' }}
        >
          {riskLevel}
        </span>
      </div>

      <div className="cp-popup-meta">
        <div className="cp-meta-row">
          <span className="cp-meta-label">Est. Time (Local):</span>
          <span className="cp-meta-val">{formatDateTime(checkpoint.eta)}</span>
        </div>
        <div className="cp-meta-row">
          <span className="cp-meta-label">Assessment:</span>
          <span className={`cp-status-tag status-${assessmentStatus}`}>
            {ASSESSMENT_LABELS[assessmentStatus] || 'Missing forecast'}
          </span>
        </div>
      </div>

      <hr className="cp-popup-divider" />

      <div className="cp-metrics-table">
        <MetricRow name="Wind" value={weather.wind_speed_mph} unit="mph" level={risk.wind_level} />
        <MetricRow name="Rain" value={weather.rain_in} unit="in/hr" level={risk.rain_level} />
        <MetricRow name="Snowfall" value={weather.snowfall_in} unit="in/hr" level={risk.snow_level} />
      </div>
    </div>
  );
}
