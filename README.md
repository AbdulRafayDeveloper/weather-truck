# Weather-Aware Truck Routing — Frontend

React single-page application that helps a truck driver or dispatcher choose the safest route based on **weather, load weight and travel time**. It compares three truck route alternatives on an interactive map, shows a weather-risk heatmap along the trip corridor, and lets the user test departure times up to 48 hours ahead.

**Live app:** https://weathertruck.vercel.app
**Backend API:** https://weather-truck-backend.vercel.app ([repository](https://github.com/AbdulRafayDeveloper/weather-truck-django-backend))

---

## 1. Features

| Requirement | Implementation |
|---|---|
| Trip inputs | Origin, destination, departure date/time, load weight (lb), and checkpoint interval (10 / 25 / 50 miles) |
| 3 route options | All three truck route alternatives returned by the API are drawn on the map and listed as comparison cards |
| Checkpoints & ETAs | Checkpoint markers along each route; each popup shows mile marker, ETA (origin-local time), wind / rain / snowfall, and per-hazard + overall risk level |
| Risk levels | Color-coded Low / Moderate / High / Severe / No Travel / Unassessed across markers, heatmap, and cards |
| Recommendation | Banner showing the recommended route and the rule that selected it, or a clear "no safe route" / "incomplete weather" notice |
| Route summaries | Distance, travel time, mileage-by-risk distribution bar, distance-weighted average risk, and distance / time / risk deltas vs. the recommended route |
| Corridor heatmap | The selected route's real road geometry is colored segment-by-segment by checkpoint risk level |
| 0–48 h forecast slider | Shifts the departure time forward (drag or presets 0 / 6 / 12 / 18 / 24 / 36 / 48 h) and re-evaluates routes, ETAs, weather, risk and recommendation |

Additional details:
- **Commercial truck restriction notice** on routes containing sections not designated for trucks.
- **Backend connection status** indicator with automatic polling and manual retry.

### Performance
- Slider drags are **debounced (450 ms)**, so a request is sent only once the user stops moving it; preset buttons apply instantly.
- Every new request **cancels the previous in-flight request** (`AbortController`), so stale responses never overwrite newer results.
- Heatmap segments and map layers are derived with `useMemo`, so switching routes or zooming does not recompute unchanged geometry.

### Risk color scale

| Level | Color |
|---|---|
| Low | `#10b981` green |
| Moderate | `#f59e0b` amber |
| High | `#f97316` orange |
| Severe | `#ef4444` red |
| No Travel | `#7f1d1d` dark red |
| Unassessed | `#64748b` slate |

---

## 2. Tech Stack

- **React 18** + **Vite 5**
- **Leaflet** / **React Leaflet** with OpenStreetMap tiles
- **Fetch API** with `AbortController` request cancellation
- Plain **CSS3** with a responsive layout

---

## 3. Project Structure

```text
weather-truck/
├── src/
│   ├── components/
│   │   ├── TripForm.jsx              # Trip inputs and validation
│   │   ├── RecommendationBanner.jsx  # Recommended / no-safe-route / incomplete-weather states
│   │   ├── RouteResults.jsx          # Results layout (map + cards + slider)
│   │   ├── RouteCard.jsx             # Per-route summary, risk distribution, comparisons
│   │   ├── RouteMap.jsx              # Leaflet map, routes, checkpoints, corridor heatmap
│   │   └── ForecastSlider.jsx        # 0–48 h departure offset slider
│   ├── utils/
│   │   └── formatters.js             # Distance, duration, date/time and rationale formatting
│   ├── api.js                        # Backend API client
│   ├── App.jsx                       # App state, health check, request orchestration
│   ├── main.jsx
│   └── styles.css
├── .env.example
├── index.html
├── package.json
└── vite.config.js
```

---

## 4. Getting Started

### Prerequisites
- Node.js 18+ and npm 9+
- The [backend API](https://github.com/AbdulRafayDeveloper/weather-truck-django-backend) running locally or a deployed backend URL

### Installation

```bash
npm install
cp .env.example .env.local
```

Set the backend URL in `.env.local`:

```ini
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### Run in development

```bash
npm run dev
```

Open http://localhost:5173. The header shows **Backend: Connected** once the API is reachable.

### Production build

```bash
npm run build
npm run preview
```

---

## 5. Deployment

Deployed on **Vercel** with continuous deployment from the `main` branch.

| Environment variable | Value |
|---|---|
| `VITE_API_BASE_URL` | Backend base URL, e.g. `https://weather-truck-backend.vercel.app` |

The frontend's domain must be included in the backend's `FRONTEND_URL` setting for CORS.

---

## 6. Attribution

- Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
- Routing and geocoding by [TomTom](https://developer.tomtom.com/); weather data by [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0), both called through the backend.
