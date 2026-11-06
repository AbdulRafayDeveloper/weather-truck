const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

/**
 * Health check request to verify backend connectivity.
 * @param {AbortSignal} [signal]
 * @returns {Promise<{status: string}>}
 */
export async function fetchHealth(signal) {
  const response = await fetch(`${API_BASE_URL}/api/health/`, { signal });
  if (!response.ok) {
    throw new Error(`Health check returned status ${response.status}`);
  }
  return response.json();
}

/**
 * Submit trip parameters to calculate route alternatives and risk recommendations.
 * @param {Object} payload - { origin, destination, departure, load_weight_lb, interval_miles }
 * @param {AbortSignal} [signal]
 * @returns {Promise<{routes: Array, recommendation: Object}>}
 */
export async function calculateRoutes(payload, signal) {
  const response = await fetch(`${API_BASE_URL}/api/routes/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // If response body is not JSON
  }

  if (!response.ok) {
    const errorMsg = data?.error?.message || `Routing request failed with status ${response.status}`;
    const errorCode = data?.error?.code || 'REQUEST_FAILED';
    const err = new Error(errorMsg);
    err.code = errorCode;
    err.status = response.status;
    throw err;
  }

  return data;
}
