import { useState } from 'react';

import { INTERVAL_OPTIONS } from '../constants/risk';
import { formatDepartureForApi, getDefaultDepartureString } from '../utils/formatters';

const DEFAULT_INTERVAL = 25;
const DEFAULT_WEIGHT = 38000;

const INTERVAL_CHOICES = [
  { val: 10, title: '10 miles', desc: 'Detailed view — every 10 miles' },
  { val: 25, title: '25 miles', desc: 'Recommended — every 25 miles' },
  { val: 50, title: '50 miles', desc: 'High-level overview — every 50 miles' },
];

export default function TripForm({ onSubmit, isLoading }) {
  const [origin, setOrigin] = useState('Chicago, IL');
  const [destination, setDestination] = useState('Denver, CO');
  const [departure, setDeparture] = useState(getDefaultDepartureString());
  const [loadWeight, setLoadWeight] = useState(DEFAULT_WEIGHT);
  const [intervalMiles, setIntervalMiles] = useState(DEFAULT_INTERVAL);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    const trimmedOrigin = origin.trim();
    const trimmedDest = destination.trim();

    if (!trimmedOrigin) {
      errs.origin = 'Please enter where you are starting (e.g. "Chicago, IL").';
    }

    if (!trimmedDest) {
      errs.destination = 'Please enter where you are going (e.g. "Denver, CO").';
    }

    if (trimmedOrigin && trimmedDest && trimmedOrigin.toLowerCase() === trimmedDest.toLowerCase()) {
      errs.destination = 'Starting location and destination cannot be the same.';
    }

    if (!departure) {
      errs.departure = 'Please choose your planned departure date and time.';
    }

    const numWeight = Number(loadWeight);
    if (!loadWeight || isNaN(numWeight) || numWeight <= 0) {
      errs.loadWeight = 'Please enter a valid cargo weight greater than 0 lbs.';
    }

    if (!INTERVAL_OPTIONS.includes(Number(intervalMiles))) {
      errs.intervalMiles = 'Interval must be one of 10, 25, or 50 miles.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoading || !validate()) return;

    // Departure stays a naive local time (no "Z"); the backend resolves the
    // origin's timezone itself.
    onSubmit({
      origin: origin.trim(),
      destination: destination.trim(),
      departure: formatDepartureForApi(departure),
      load_weight_lb: Number(loadWeight),
      interval_miles: Number(intervalMiles),
    });
  };

  return (
    <form className="trip-form" onSubmit={handleSubmit} noValidate>
      <div className="form-header">
        <h2 className="form-title">Plan Your Trip</h2>
        <p className="form-subtitle">Enter your details to identify the safest available route.</p>
      </div>

      <div className="form-group">
        <label htmlFor="origin-input" className="form-label">
          Where are you starting? <span className="required-star">*</span>
        </label>
        <input
          id="origin-input"
          type="text"
          className={`form-input ${errors.origin ? 'input-error' : ''}`}
          placeholder="City, State (e.g. Chicago, IL)"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          disabled={isLoading}
          autoComplete="off"
        />
        {errors.origin && <span className="field-error">{errors.origin}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="destination-input" className="form-label">
          Where are you going? <span className="required-star">*</span>
        </label>
        <input
          id="destination-input"
          type="text"
          className={`form-input ${errors.destination ? 'input-error' : ''}`}
          placeholder="City, State (e.g. Denver, CO)"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          disabled={isLoading}
          autoComplete="off"
        />
        {errors.destination && <span className="field-error">{errors.destination}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="departure-input" className="form-label">
          When will you depart? <span className="required-star">*</span>
        </label>
        <input
          id="departure-input"
          type="datetime-local"
          className={`form-input ${errors.departure ? 'input-error' : ''}`}
          value={departure}
          onChange={(e) => setDeparture(e.target.value)}
          disabled={isLoading}
        />
        <span className="field-hint">Local clock time at your starting point.</span>
        {errors.departure && <span className="field-error">{errors.departure}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="weight-input" className="form-label">
          How much cargo are you carrying? <span className="required-star">*</span>
        </label>
        <div className="input-with-unit">
          <input
            id="weight-input"
            type="number"
            min="1"
            step="1"
            className={`form-input ${errors.loadWeight ? 'input-error' : ''}`}
            placeholder="e.g. 38000"
            value={loadWeight}
            onChange={(e) => setLoadWeight(e.target.value)}
            disabled={isLoading}
          />
          <span className="unit-badge">lbs</span>
        </div>
        <span className="field-hint">
          Heavy loads (&gt;30,000 lbs) automatically apply safer wind thresholds.
        </span>
        {errors.loadWeight && <span className="field-error">{errors.loadWeight}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">
          How often should we check the weather? <span className="required-star">*</span>
        </label>
        <div className="interval-selector">
          {INTERVAL_CHOICES.map(({ val, title, desc }) => (
            <label
              key={val}
              className={`interval-option ${Number(intervalMiles) === val ? 'selected' : ''} ${isLoading ? 'disabled' : ''}`}
            >
              <input
                type="radio"
                name="interval_miles"
                value={val}
                checked={Number(intervalMiles) === val}
                onChange={() => setIntervalMiles(val)}
                disabled={isLoading}
              />
              <span className="interval-title">{title}</span>
              <span className="interval-desc">{desc}</span>
            </label>
          ))}
        </div>
        {errors.intervalMiles && <span className="field-error">{errors.intervalMiles}</span>}
      </div>

      <div className="form-actions">
        <button type="submit" className="submit-button" disabled={isLoading}>
          {isLoading ? (
            <span className="button-loading-content">
              <span className="spinner" />
              Analyzing Routes &amp; Weather...
            </span>
          ) : (
            'Analyze My Route'
          )}
        </button>
      </div>
    </form>
  );
}
