import { useEffect, useRef, useState } from 'react';

import { formatDateTime, shiftNaiveIsoDateTime } from '../utils/formatters';

const PRESET_OFFSETS = [0, 6, 12, 18, 24, 36, 48];

// Each change re-runs the full route analysis, so we wait until the user
// stops dragging before sending a request.
const DRAG_DEBOUNCE_MS = 450;

export default function ForecastSlider({
  offsetHours = 0,
  onChangeOffset = () => {},
  baselineDeparture = '',
  isLoading = false,
}) {
  const [localValue, setLocalValue] = useState(offsetHours);
  const debounceTimerRef = useRef(null);

  // Keep in sync when the parent resets the offset (new trip submitted).
  useEffect(() => {
    setLocalValue(offsetHours);
  }, [offsetHours]);

  useEffect(() => () => clearTimeout(debounceTimerRef.current), []);

  const handleSliderChange = (e) => {
    const nextVal = parseInt(e.target.value, 10);
    setLocalValue(nextVal);

    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (nextVal !== offsetHours) onChangeOffset(nextVal);
    }, DRAG_DEBOUNCE_MS);
  };

  const handlePresetClick = (presetVal) => {
    clearTimeout(debounceTimerRef.current);
    setLocalValue(presetVal);
    if (presetVal !== offsetHours) onChangeOffset(presetVal);
  };

  const previewDeparture = baselineDeparture ? shiftNaiveIsoDateTime(baselineDeparture, localValue) : '';

  return (
    <section className="forecast-slider-container" aria-label="Departure forecast offset slider">
      <div className="slider-header-row">
        <div className="slider-label-group">
          <span className="slider-kicker">
            <span className="slider-icon" aria-hidden="true">⏱</span>
            Weather Forecast Window &amp; Departure Adjustment
          </span>
          <h3 className="slider-title">
            {localValue === 0
              ? 'Departure adjustment: Baseline (+0h)'
              : `Departure adjustment: +${localValue} hour${localValue === 1 ? '' : 's'}`}
          </h3>
        </div>

        {previewDeparture && (
          <div className="slider-preview-badge">
            <span className="preview-caption">Adjusted Departure:</span>
            <span className="preview-timestamp">{formatDateTime(previewDeparture)}</span>
          </div>
        )}
      </div>

      <p className="slider-instructions">
        Slide to evaluate weather risks and corridor safety if departing up to 48 hours later.
        Route corridors, checkpoint ETAs, and weather forecasts will recalculate automatically.
      </p>

      <div className="slider-control-row">
        <span className="slider-bound bound-min">0h (Baseline)</span>
        <input
          type="range"
          min="0"
          max="48"
          step="1"
          value={localValue}
          onChange={handleSliderChange}
          className="forecast-range-input"
          aria-label="Departure adjustment in hours"
          aria-valuemin="0"
          aria-valuemax="48"
          aria-valuenow={localValue}
          disabled={isLoading}
        />
        <span className="slider-bound bound-max">+48h</span>
      </div>

      <div className="slider-presets-strip" aria-label="Quick departure offset buttons">
        <span className="preset-caption">Quick jump:</span>
        <div className="presets-button-group">
          {PRESET_OFFSETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`preset-btn ${localValue === preset ? 'preset-active' : ''}`}
              onClick={() => handlePresetClick(preset)}
              disabled={isLoading}
            >
              {preset === 0 ? '0h (Baseline)' : `+${preset}h`}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="slider-loading-callout" role="status">
          <span className="slider-spinner" aria-hidden="true" />
          <span>
            Recalculating corridor routes, checkpoint ETAs, and Open-Meteo forecasts for +{localValue}h departure...
          </span>
        </div>
      )}
    </section>
  );
}
