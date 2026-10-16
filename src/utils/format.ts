import type { Aircraft } from '../types';

export const KNOTS_PER_MPS = 1.943844;
export const FEET_PER_M = 3.28084;

/** Prefer GPS altitude, fall back to barometric altitude. */
export function altitudeOf(a: Aircraft): number | null {
  return a.geoAltitude ?? a.baroAltitude;
}
