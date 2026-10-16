import { create } from 'zustand';
import type {
  BoundingBox,
  Filters,
  Mode,
  Observation,
  Region,
  Snapshot,
  Status,
  TrackedAircraft,
} from '../types';
import { REGIONS } from '../config/regions';
import { inBox } from '../utils/geo';
import { altitudeOf } from '../utils/format';

/** An aircraft missing from this many consecutive polls is dropped. */
export const MAX_MISSED_POLLS = 3;
/** An aircraft not seen for this long is dropped regardless of poll count. */
export const STALE_AFTER_MS = 3 * 60_000;
export const TRAIL_MAX_POINTS = 120;

export const DEFAULT_FILTERS: Filters = {
  query: '',
  minAltitude: 0,
  maxAltitude: 20_000,
  minSpeedKnots: 0,
  ground: 'all',
};

interface AircraftState {
  region: Region;
  mode: Mode;
  status: Status;
  error: string | null;
  retryAt: number | null;
  lastUpdated: number | null;
  filters: Filters;
  aircraft: Record<string, TrackedAircraft>;
  history: Record<string, Observation[]>;
  selectedId: string | null;

  setRegion: (region: Region) => void;
  setMode: (mode: Mode) => void;
  setFilters: (patch: Partial<Filters>) => void;
  select: (id: string | null) => void;
  setStatus: (status: Status, error?: string | null, retryAt?: number | null) => void;
  ingest: (snapshot: Snapshot, bbox: BoundingBox) => void;
}

function keepInside(
  aircraft: Record<string, TrackedAircraft>,
  bbox: BoundingBox,
): Record<string, TrackedAircraft> {
  const out: Record<string, TrackedAircraft> = {};
  for (const [id, a] of Object.entries(aircraft)) {
    if (a.latitude === null || a.longitude === null || inBox(a.latitude, a.longitude, bbox)) {
      out[id] = a;
    }
  }
  return out;
}

function pruneHistory(
  history: Record<string, Observation[]>,
  keep: Record<string, unknown>,
): Record<string, Observation[]> {
  const out: Record<string, Observation[]> = {};
  for (const id of Object.keys(keep)) {
    if (history[id]) out[id] = history[id];
  }
  return out;
}

export const useAircraftStore = create<AircraftState>((set) => ({
  region: REGIONS[0],
  mode: 'live',
  status: 'idle',
  error: null,
  retryAt: null,
  lastUpdated: null,
  filters: DEFAULT_FILTERS,
  aircraft: {},
  history: {},
  selectedId: null,

  setRegion: (region) =>
    set((s) => {
      const aircraft = keepInside(s.aircraft, region.bbox);
      return {
        region,
        error: null,
        aircraft,
        history: pruneHistory(s.history, aircraft),
        selectedId: s.selectedId && aircraft[s.selectedId] ? s.selectedId : null,
      };
    }),

  setMode: (mode) => set({ mode, status: 'idle', error: null, retryAt: null, aircraft: {}, history: {}, selectedId: null }),

  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),

  select: (selectedId) => set({ selectedId }),

  setStatus: (status, error = null, retryAt = null) => set({ status, error, retryAt }),

  ingest: (snapshot, bbox) =>
    set((state) => {
      const now = Date.now();
      const aircraft: Record<string, TrackedAircraft> = {};
      const history = { ...state.history };
      const seen = new Set<string>();

      // 1) Aircraft present in this poll: refresh them and extend their trail.
      for (const a of snapshot.aircraft) {
        seen.add(a.icao24);
        aircraft[a.icao24] = { ...a, receivedAt: now, missedPolls: 0, stale: false };

        if (a.latitude !== null && a.longitude !== null) {
          const point: Observation = {
            t: now,
            lat: a.latitude,
            lon: a.longitude,
            altitude: altitudeOf(a),
            speed: a.velocity,
            track: a.trueTrack,
          };
          history[a.icao24] = [...(history[a.icao24] ?? []), point].slice(-TRAIL_MAX_POINTS);
        }
      }

      // 2) Aircraft missing from this poll: keep as stale for a grace period
      //    (they may just be temporarily untracked), or drop them if they left
      //    the region or have been missing too long.
      for (const [id, prev] of Object.entries(state.aircraft)) {
        if (seen.has(id)) continue;

        const missedPolls = prev.missedPolls + 1;
        const leftRegion =
          prev.latitude !== null && prev.longitude !== null && !inBox(prev.latitude, prev.longitude, bbox);
        const expired = missedPolls > MAX_MISSED_POLLS || now - prev.receivedAt > STALE_AFTER_MS;

        if (leftRegion || expired) {
          delete history[id];
          continue;
        }
        aircraft[id] = { ...prev, missedPolls, stale: true };
      }

      return {
        aircraft,
        history,
        lastUpdated: now,
        status: 'ok',
        error: null,
        retryAt: null,
        selectedId: state.selectedId && aircraft[state.selectedId] ? state.selectedId : null,
      };
    }),
}));
