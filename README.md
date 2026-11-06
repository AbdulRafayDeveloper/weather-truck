# Weather-Aware Truck Routing — Frontend Application

Interactive React single-page application for the Weather-Aware Truck Routing platform.

---

## 1. Tech Stack

- **Framework:** React 18+
- **Build Tool:** Vite 5.x
- **Styling:** CSS3 (modern responsive design with status badges)
- **HTTP Client:** Fetch API with `AbortController` cancellation support

---

## 2. Current Implementation Status

This repository contains the verified application foundation:
- Vite development setup with Fast Refresh
- Real-time backend API connection status monitoring
- Resilient polling and manual retry mechanisms
- Environment configuration with local variable overrides

*Note: In accordance with the incremental development plan, interactive trip input forms, Leaflet route visualization, checkpoint heatmaps, and forecast sliders are scheduled for upcoming phases.*

---

## 3. Project Structure

```text
frontend/
├── src/
│   ├── api.js
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── README.md
└── vite.config.js
```

---

## 4. Getting Started

### Prerequisites

- Node.js 18.x or 20.x
- npm 9.x or higher

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` to point to the backend API:
   ```ini
   VITE_API_BASE_URL=http://127.0.0.1:8000
   ```

---

## 5. Running the Application

### Development Mode

Start the Vite development server:
```bash
npm run dev
```

Open your browser at `http://localhost:5173`. When the backend API is running, the connection badge will display `Backend: Connected`.

### Production Build

Create an optimized production bundle:
```bash
npm run build
```

Preview the production build locally:
```bash
npm run preview
```

---

## 6. Features Not Yet Implemented (Planned Roadmap)

- **Phase 8:** Trip planning input form (Origin, Destination, Departure Date/Time, Cargo Load Weight, Sampling Interval)
- **Phase 9:** Leaflet / React Leaflet interactive map with alternative route geometry rendering
- **Phase 10:** Weather hazard corridor heatmaps & 0–48-hour forecast timeline slider
