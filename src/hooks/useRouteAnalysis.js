import { useEffect, useRef, useState } from 'react';

import { calculateRoutes } from '../api';
import { shiftNaiveIsoDateTime } from '../utils/formatters';

export default function useRouteAnalysis() {
  const [routes, setRoutes] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [submittedTrip, setSubmittedTrip] = useState(null);
  const [forecastOffset, setForecastOffset] = useState(0);

  const activeRequestRef = useRef(null);

  useEffect(() => () => activeRequestRef.current?.abort(), []);

  // Only one request is in flight at a time. A newer request (e.g. the user
  // keeps moving the slider) cancels the older one so stale results never land.
  const runRequest = async (payload, { onSuccess, onError, onSettled }) => {
    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;

    try {
      const data = await calculateRoutes(payload, controller.signal);
      setRoutes(data?.routes || []);
      setRecommendation(data?.recommendation || null);
      onSuccess?.();
    } catch (err) {
      if (err?.name !== 'AbortError') onError(err);
    } finally {
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
        onSettled();
      }
    }
  };

  const submitTrip = (trip) => {
    setIsLoading(true);
    setIsRecalculating(false);
    setError(null);
    setForecastOffset(0);
    setSubmittedTrip(trip);

    runRequest(trip, {
      onSuccess: () => setHasSearched(true),
      onError: (err) => {
        setError({
          code: err.code || 'REQUEST_FAILED',
          message: err.message || 'An unexpected error occurred while calculating routes.',
        });
        setRoutes(null);
        setRecommendation(null);
      },
      onSettled: () => setIsLoading(false),
    });
  };

  const changeForecastOffset = (hours) => {
    if (!submittedTrip) return;

    setForecastOffset(hours);
    setIsRecalculating(true);
    setError(null);

    const shiftedTrip = {
      ...submittedTrip,
      departure: shiftNaiveIsoDateTime(submittedTrip.departure, hours),
    };

    runRequest(shiftedTrip, {
      onError: (err) => {
        setError({
          code: err.code || 'RECALCULATION_FAILED',
          message: err.message || 'Failed to recalculate routes for adjusted departure time.',
        });
      },
      onSettled: () => setIsRecalculating(false),
    });
  };

  return {
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
  };
}
