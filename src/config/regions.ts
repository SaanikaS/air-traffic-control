import type { Region } from '../types';

// Keep boxes small: OpenSky charges more API credits for larger areas.
export const REGIONS: Region[] = [
  { id: 'london', name: 'London area', bbox: { lamin: 51.2, lamax: 51.8, lomin: -0.6, lomax: 0.4 } },
  { id: 'mumbai', name: 'Mumbai area', bbox: { lamin: 18.9, lamax: 19.4, lomin: 72.7, lomax: 73.1 } },
  { id: 'new-york', name: 'New York area', bbox: { lamin: 40.5, lamax: 41.0, lomin: -74.3, lomax: -73.7 } },
  { id: 'singapore', name: 'Singapore area', bbox: { lamin: 1.2, lamax: 1.5, lomin: 103.6, lomax: 104.0 } },
  { id: 'dubai', name: 'Dubai area', bbox: { lamin: 24.8, lamax: 25.4, lomin: 54.9, lomax: 55.6 } },
  { id: 'europe', name: 'Europe (wide, uses more credits)', bbox: { lamin: 35, lamax: 60, lomin: -10, lomax: 30 } },
];
