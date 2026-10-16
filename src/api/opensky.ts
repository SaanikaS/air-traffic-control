import type { Aircraft, BoundingBox, Snapshot } from '../types';
import { inBox } from '../utils/geo';

// In dev we go through the Vite proxy (vite.config.ts) to avoid CORS issues.
const LIVE_BASE: string =
  import.meta.env.VITE_OPENSKY_BASE_URL ||
  (import.meta.env.DEV ? '/opensky/api' : 'https://opensky-network.org/api');

const CACHE_TTL_MS = 15_000; // identical box requests within 15s reuse the last response
const REQUEST_TIMEOUT_MS = 15_000;

const cache = new Map<string, { at: number; snapshot: Snapshot }>();

// OpenSky returns each state as a positional array. Index meanings are documented
// at https://openskynetwork.github.io/opensky-api/rest.html
type RawState = Array<string | number | boolean | number[] | null>;

export class ApiError extends Error {
  status?: number;
  retryAfterMs?: number;

  constructor(message: string, opts: { status?: number; retryAfterMs?: number } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = opts.status;
    this.retryAfterMs = opts.retryAfterMs;
  }
}

function bboxKey(b: BoundingBox): string {
  return `${b.lamin},${b.lamax},${b.lomin},${b.lomax}`;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function normalize(s: RawState): Aircraft | null {
  const icao24 = s[0];
  if (typeof icao24 !== 'string') return null;

  const callsign = typeof s[1] === 'string' ? s[1].trim() : '';
  return {
    icao24,
    callsign: callsign || null,
    originCountry: typeof s[2] === 'string' ? s[2] : '',
    timePosition: num(s[3]),
    lastContact: num(s[4]) ?? 0,
    longitude: num(s[5]),
    latitude: num(s[6]),
    baroAltitude: num(s[7]),
    onGround: Boolean(s[8]),
    velocity: num(s[9]),
    trueTrack: num(s[10]),
    verticalRate: num(s[11]),
    geoAltitude: num(s[13]),
  };
}

function notNull<T>(v: T | null): v is T {
  return v !== null;
}

/** Fetches live aircraft states inside the bounding box from OpenSky. */
export async function fetchSnapshot(bbox: BoundingBox, signal: AbortSignal): Promise<Snapshot> {
  const key = bboxKey(bbox);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.snapshot;

  const params = new URLSearchParams({
    lamin: String(bbox.lamin),
    lamax: String(bbox.lamax),
    lomin: String(bbox.lomin),
    lomax: String(bbox.lomax),
  });

  // Combine the caller's abort signal with a request timeout.
  const timeoutCtrl = new AbortController();
  const timer = setTimeout(() => timeoutCtrl.abort(), REQUEST_TIMEOUT_MS);
  signal.addEventListener('abort', () => timeoutCtrl.abort(), { once: true });

  let res: Response;
  try {
    res = await fetch(`${LIVE_BASE}/states/all?${params.toString()}`, {
      signal: timeoutCtrl.signal,
      headers: { Accept: 'application/json' },
    });
  } catch (err) {
    if (signal.aborted) throw err; // superseded by a region/mode change, not a failure
    throw new ApiError('Could not reach OpenSky (network error or timeout)');
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 429) {
    const retry = Number(res.headers.get('X-Rate-Limit-Retry-After-Seconds'));
    throw new ApiError('OpenSky rate limit reached', {
      status: 429,
      retryAfterMs: Number.isFinite(retry) && retry > 0 ? retry * 1000 : 60_000,
    });
  }
  if (!res.ok) {
    throw new ApiError(`OpenSky responded with HTTP ${res.status}`, { status: res.status });
  }

  const body = (await res.json()) as { time: number; states: RawState[] | null };
  const snapshot: Snapshot = {
    time: body.time,
    aircraft: (body.states ?? []).map(normalize).filter(notNull),
  };

  cache.set(key, { at: Date.now(), snapshot });
  return snapshot;
}

/**
 * Demo mode: replays recorded responses from /public/sample-states.json.
 * Useful offline, when rate-limited, or for demos. Data is London-only.
 */
export async function fetchSample(bbox: BoundingBox, signal: AbortSignal): Promise<Snapshot> {
  const res = await fetch('/sample-states.json', { signal });
  if (!res.ok) throw new ApiError(`Could not load demo data (HTTP ${res.status})`);
  const body = (await res.json()) as { time: number; states: RawState[] };

  const aircraft = body.states
    .map(normalize)
    .filter(notNull)
    .filter((a) => a.latitude !== null && a.longitude !== null && inBox(a.latitude, a.longitude, bbox));

  return { time: body.time, aircraft };
}
