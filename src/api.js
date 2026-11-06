const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export async function fetchHealth(signal) {
  const response = await fetch(`${API_BASE_URL}/api/health/`, { signal });
  if (!response.ok) {
    throw new Error(`Health check returned status ${response.status}`);
  }
  return response.json();
}

// payload: { origin, destination, departure, load_weight_lb, interval_miles }
export async function calculateRoutes(payload, signal) {
  const response = await fetch(`${API_BASE_URL}/api/routes/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  // Error responses may not have a JSON body (e.g. a proxy error page).
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const err = new Error(data?.error?.message || `Routing request failed with status ${response.status}`);
    err.code = data?.error?.code || 'REQUEST_FAILED';
    err.status = response.status;
    throw err;
  }

  return data;
}
