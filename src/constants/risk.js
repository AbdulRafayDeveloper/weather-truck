export const RISK_COLORS = {
  Low: '#10b981',
  Moderate: '#f59e0b',
  High: '#f97316',
  Severe: '#ef4444',
  'No Travel': '#7f1d1d',
  Unassessed: '#64748b',
};

export const ROUTE_COLORS = {
  1: '#2563eb',
  2: '#7c3aed',
  3: '#0891b2',
};

export const INTERVAL_OPTIONS = [10, 25, 50];

export function getRiskColor(level) {
  return RISK_COLORS[level] || RISK_COLORS.Unassessed;
}
