export interface BoundingBox {
  lamin: number;
  lamax: number;
  lomin: number;
  lomax: number;
}

export interface Region {
  id: string;
  name: string;
  bbox: BoundingBox;
}

/** One aircraft as returned by OpenSky (normalized from the raw array). */
export interface Aircraft {
  icao24: string;
  callsign: string | null;
  originCountry: string;
  timePosition: number | null;
  lastContact: number;
  longitude: number | null;
  latitude: number | null;
  baroAltitude: number | null; // metres
  geoAltitude: number | null; // metres
  velocity: number | null; // m/s
  trueTrack: number | null; // degrees, clockwise from north
  verticalRate: number | null; // m/s
  onGround: boolean;
}

export interface Snapshot {
  time: number;
  aircraft: Aircraft[];
}

/** Aircraft as held in app state, with local bookkeeping for staleness. */
export interface TrackedAircraft extends Aircraft {
  receivedAt: number; // local ms timestamp of the last poll that included it
  missedPolls: number; // consecutive polls in which it was absent
  stale: boolean; // true while it is missing from the latest poll
}

export interface Observation {
  t: number;
  lat: number;
  lon: number;
  altitude: number | null;
  speed: number | null;
  track: number | null;
}

export type Mode = 'live' | 'demo';
export type Status = 'idle' | 'loading' | 'ok' | 'error';
export type GroundFilter = 'all' | 'airborne' | 'ground';

export interface Filters {
  query: string;
  minAltitude: number; // metres
  maxAltitude: number; // metres
  minSpeedKnots: number;
  ground: GroundFilter;
}
