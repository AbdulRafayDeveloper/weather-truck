# Weather-Aware Truck Routing (Frontend)

React app that helps a driver or dispatcher pick the safest truck route based on weather, load weight and travel time. It shows three route options on a map, colors each route by weather risk, and lets you check how the picture changes if you leave up to 48 hours later.

- Live app: https://weathertruck.vercel.app
- Backend API: https://weather-truck-backend.vercel.app ([repo](https://github.com/AbdulRafayDeveloper/weather-truck-django-backend))

## What it does

| Requirement | How it's handled |
|---|---|
| Trip inputs | Origin, destination, departure date/time, load weight (lb) and a checkpoint interval of 10, 25 or 50 miles |
| 3 route options | All alternatives from the API are drawn on the map and listed as cards |
| Checkpoints and ETAs | Markers along the selected route. The popup shows mile marker, ETA in local time, wind / rain / snow and the risk level for each |
| Risk levels | Same color scale on markers, the heatmap and the cards |
| Recommendation | Banner with the recommended route and why it was picked. If nothing is safe, or weather data is missing, it says so |
| Route summaries | Distance, travel time, miles per risk level, average risk, and how each alternative compares to the recommended route |
| Corridor heatmap | The selected route's road line is split into segments and colored by the nearest checkpoint's risk |
| 0–48 h slider | Moves the departure time forward and reruns the analysis (drag, or use the 0/6/12/18/24/36/48 h buttons) |

Routes with sections TomTom doesn't mark as truck-friendly get a warning on the card and on the map.

### Keeping it responsive

- Dragging the slider is debounced (450 ms), so we only call the API once the user stops. Preset buttons fire right away.
- Starting a new request cancels the one in flight with `AbortController`, so an older response can't overwrite a newer one.
- Heatmap segments are memoized and only rebuilt when the selected route changes.

### Risk colors

| Level | Color |
|---|---|
| Low | `#10b981` |
| Moderate | `#f59e0b` |
| High | `#f97316` |
| Severe | `#ef4444` |
| No Travel | `#7f1d1d` |
| Unassessed | `#64748b` |

## Tech

React 18, Vite 5, Leaflet / React Leaflet with OpenStreetMap tiles, and plain CSS. No other runtime dependencies.

## Project structure

```text
src/
├── api.js                     # Calls to the backend
├── App.jsx                    # Page layout
├── main.jsx
├── styles.css
├── constants/
│   └── risk.js                # Risk/route colors and interval options
├── hooks/
│   ├── useBackendHealth.js    # Health check for the header badge
│   └── useRouteAnalysis.js    # Trip submission, slider re-runs, request cancelling
├── utils/
│   ├── formatters.js          # Distance, duration and date/time formatting
│   ├── routeInsights.js       # Recommendation reasons, route comparisons, risk badges
│   └── corridor.js            # Splits a route into heatmap segments
└── components/
    ├── AppHeader.jsx
    ├── IntroHero.jsx
    ├── EmptyState.jsx
    ├── TripForm.jsx
    ├── RouteResults.jsx       # Slider + banner + cards + map
    ├── ForecastSlider.jsx
    ├── RecommendationBanner.jsx
    ├── RouteCard.jsx
    ├── RouteMap.jsx
    └── CheckpointPopup.jsx
```

## Running locally

You'll need Node 18+ and the [backend](https://github.com/AbdulRafayDeveloper/weather-truck-django-backend) running (or point to the deployed one).

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local`:

```ini
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Open http://localhost:5173. The header shows "Service: Connected" once the API responds.

Production build:

```bash
npm run build
npm run preview
```

## Deployment

Hosted on Vercel and deployed automatically from `main`. The only environment variable is `VITE_API_BASE_URL`, which points to the backend. The frontend's domain also needs to be in the backend's `FRONTEND_URL` so CORS allows it.

## Credits

Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors. Routing and geocoding by [TomTom](https://developer.tomtom.com/). Weather by [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0).
