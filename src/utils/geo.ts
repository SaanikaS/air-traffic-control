import type { BoundingBox, TrackedAircraft } from '../types';

const M_PER_DEG_LAT = 111_320;

/** Dead-reckoning is capped so the estimate never drifts far from the last real fix. */
export const MAX_EXTRAPOLATION_S = 30;

export function inBox(lat: number, lon: number, b: BoundingBox): boolean {
  return lat >= b.lamin && lat <= b.lamax && lon >= b.lomin && lon <= b.lomax;
}

/**
 * Estimates where an aircraft is now, using its last reported speed and track.
 * Returns the last observed fix (estimated = false) when extrapolation is not
 * appropriate: stale aircraft, missing velocity/track, or no time has passed.
 */
export function estimatePosition(
  a: TrackedAircraft,
  now: number,
): { lat: number; lon: number; estimated: boolean } | null {
  if (a.latitude === null || a.longitude === null) return null;

  const elapsed = Math.min((now - a.receivedAt) / 1000, MAX_EXTRAPOLATION_S);
  if (a.stale || a.velocity === null || a.trueTrack === null || elapsed <= 0) {
    return { lat: a.latitude, lon: a.longitude, estimated: false };
  }

  const distance = a.velocity * elapsed; // metres
  const rad = (a.trueTrack * Math.PI) / 180;
  const lat = a.latitude + (distance * Math.cos(rad)) / M_PER_DEG_LAT;
  const lon =
    a.longitude +
    (distance * Math.sin(rad)) / (M_PER_DEG_LAT * Math.cos((a.latitude * Math.PI) / 180));
  return { lat, lon, estimated: true };
}
