# Air Traffic Control Dashboard

A real-time aircraft monitoring dashboard built with React, TypeScript, Vite, Leaflet and Zustand. It pulls live aircraft states from the [OpenSky Network REST API](https://openskynetwork.github.io/opensky-api/rest.html).

## Features

- Live aircraft positions on an interactive map (Leaflet + OpenStreetMap tiles)
- Region selection: preset cities/regions or a custom bounding box
- Aircraft details: callsign, ICAO24, altitude, ground speed, heading, vertical rate, last seen
- Recent movement: trail on the map and a table of recent observations
- Filters: search, altitude range, minimum ground speed, airborne/on-ground
- Dead-reckoning: markers move smoothly between polls, labelled "estimated"
- Stale-data handling: aircraft missing from a poll are shown faded, then dropped
- Failure handling: exponential backoff, rate-limit awareness, request timeout, response caching
- Demo mode: replays recorded data, so the app works offline or when rate-limited

## Requirements

- Node.js 18.18+ or 20 LTS (includes npm)
- Git (for GitHub)

## Run locally

```bash
# 1. Install dependencies
npm install

# 2. (Optional) create your env file
cp .env.example .env

# 3. Start the dev server
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

Other commands:

```bash
npm run build     # type-check and create a production build in dist/
npm run preview   # serve the production build locally
```

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_POLL_INTERVAL_MS` | `60000` | Milliseconds between polls. Keep it at 60s or more for anonymous access. |
| `VITE_OPENSKY_BASE_URL` | empty | Override the API base (e.g. your own server-side proxy). |

## Project structure

```
src/
  api/opensky.ts          OpenSky client: fetch, normalize, cache, timeouts, demo loader
  config/regions.ts       Preset bounding boxes
  store/useAircraftStore.ts  Zustand store: aircraft, trails, filters, status, merge logic
  hooks/usePolling.ts     Polling loop with backoff and visibility pause
  hooks/useNow.ts         Ticking clock for relative times and dead-reckoning
  utils/geo.ts            Bounding-box test and position estimation
  utils/filters.ts        Pure filter function
  utils/format.ts         Unit conversions and altitude helper
  components/             Header, Sidebar, MapView, DetailsPanel
public/sample-states.json Recorded API response used by Demo mode
```

## Architecture

**State management.** Zustand holds one store. Components subscribe to small slices, so a status tick does not re-render the map. The store owns the merge logic: `ingest()` takes a snapshot and updates aircraft, trails and stale flags in one atomic update.

**API integration.** `fetchSnapshot()` calls `GET /states/all` with the selected bounding box (`lamin`, `lamax`, `lomin`, `lomax`). Raw positional arrays are converted into typed `Aircraft` objects. In development, requests go through a Vite proxy (`vite.config.ts`) to avoid browser CORS problems. The client never sends credentials, so no secret is exposed in frontend code.

## How stale data, API failures and rate limits are handled

**Stale data.** An aircraft missing from a poll is kept with `stale: true` for up to three missed polls or three minutes, whichever comes first. It is drawn faded, its position is not extrapolated, and the details panel says it is missing from the latest response. It is dropped immediately if its last known position is outside the selected region, which covers aircraft leaving the monitored area. Aircraft are also removed from the map when the region changes.

**Dead reckoning.** Between polls, a marker moves along its reported heading at its reported ground speed. Extrapolation is capped at 30 seconds so errors stay small, and the tooltip marks positions as "estimated". Stale aircraft are never extrapolated.

**API failures.** Each failure doubles the retry delay (5s, 10s, 20s, ... up to 5 minutes). The header shows the error and a countdown to the next attempt. Requests time out after 15 seconds. The app keeps showing the last known aircraft while retrying, and Demo mode is always available.

**Rate limits.** HTTP 429 responses are handled with the server's `X-Rate-Limit-Retry-After-Seconds` hint when it is exposed, otherwise a 60-second wait. Polling pauses while the browser tab is hidden. Identical bounding-box requests within 15 seconds reuse the cached response. Larger regions cost more OpenSky API credits, so presets use small boxes by default.

**Missing data.** Aircraft without coordinates are kept in the store but not drawn on the map. Null fields display as "—" and are never coerced to zero.

## Limitations

- Anonymous OpenSky access has strict daily credit limits, so a long-running live session may hit a limit. Demo mode covers this.
- Bounding boxes that cross the antimeridian (±180° longitude) are not supported.
- Dead reckoning is an approximation and not a substitute for real position updates.

## Troubleshooting

- **Map is blank:** the OpenStreetMap tiles need internet access. Check your network connection.
- **"Could not reach OpenSky":** check your connection, or switch to Demo mode. In production builds, the browser calls OpenSky directly, and if CORS blocks it you need a small server-side proxy (set `VITE_OPENSKY_BASE_URL` to its URL).
- **"OpenSky rate limit reached":** wait for the countdown, raise `VITE_POLL_INTERVAL_MS`, or use a smaller region.
- **No aircraft in view:** try a busier region such as London or Dubai, or widen the bounding box.

## Deployment

Build with `npm run build` and host the `dist/` folder on any static host (Netlify, Vercel, GitHub Pages). For production, route API calls through a small server-side proxy so that any future credentials stay out of the browser.
