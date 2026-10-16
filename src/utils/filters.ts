import type { Filters, TrackedAircraft } from '../types';
import { altitudeOf, KNOTS_PER_MPS } from './format';

export function applyFilters(list: TrackedAircraft[], f: Filters): TrackedAircraft[] {
  const q = f.query.trim().toLowerCase();

  return list.filter((a) => {
    if (q) {
      const haystack = [a.callsign ?? '', a.icao24, a.originCountry].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    const alt = altitudeOf(a);
    if (alt !== null && (alt < f.minAltitude || alt > f.maxAltitude)) return false;

    if (f.minSpeedKnots > 0) {
      if (a.velocity === null || a.velocity * KNOTS_PER_MPS < f.minSpeedKnots) return false;
    }

    if (f.ground === 'airborne' && a.onGround) return false;
    if (f.ground === 'ground' && !a.onGround) return false;

    return true;
  });
}
