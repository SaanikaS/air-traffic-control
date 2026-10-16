import { useState, type FormEvent } from 'react';
import { REGIONS } from '../config/regions';
import { useAircraftStore } from '../store/useAircraftStore';
import type { BoundingBox, GroundFilter, Mode } from '../types';

const EMPTY_BOX = { lamin: '', lamax: '', lomin: '', lomax: '' };

export default function Sidebar() {
  const region = useAircraftStore((s) => s.region);
  const setRegion = useAircraftStore((s) => s.setRegion);
  const mode = useAircraftStore((s) => s.mode);
  const setMode = useAircraftStore((s) => s.setMode);
  const filters = useAircraftStore((s) => s.filters);
  const setFilters = useAircraftStore((s) => s.setFilters);

  const [custom, setCustom] = useState(EMPTY_BOX);
  const [customError, setCustomError] = useState<string | null>(null);

  const onPreset = (id: string) => {
    const r = REGIONS.find((x) => x.id === id);
    if (r) {
      setRegion(r);
      setCustomError(null);
    }
  };

  const onCustom = (e: FormEvent) => {
    e.preventDefault();
    if (Object.values(custom).some((v) => v.trim() === '')) {
      setCustomError('Fill in all four coordinates.');
      return;
    }
    const [lamin, lamax, lomin, lomax] = [custom.lamin, custom.lamax, custom.lomin, custom.lomax].map(Number);
    if (lamin < -90 || lamax > 90 || lamin >= lamax) {
      setCustomError('Latitude must be within -90 to 90, with min below max.');
      return;
    }
    if (lomin < -180 || lomax > 180 || lomin >= lomax) {
      setCustomError('Longitude must be within -180 to 180, with min below max.');
      return;
    }
    const bbox: BoundingBox = { lamin, lamax, lomin, lomax };
    setRegion({ id: 'custom', name: 'Custom area', bbox });
    setCustomError(null);
  };

  const setMode2 = (m: Mode) => setMode(m);

  return (
    <aside className="sidebar">
      <h2>Region</h2>
      <select value={region.id} onChange={(e) => onPreset(e.target.value)}>
        {region.id === 'custom' && <option value="custom">Custom area</option>}
        {REGIONS.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>

      <form onSubmit={onCustom}>
        <h2>Custom bounding box</h2>
        <div className="row">
          <label>
            Min lat
            <input value={custom.lamin} onChange={(e) => setCustom({ ...custom, lamin: e.target.value })} />
          </label>
          <label>
            Max lat
            <input value={custom.lamax} onChange={(e) => setCustom({ ...custom, lamax: e.target.value })} />
          </label>
        </div>
        <div className="row">
          <label>
            Min lon
            <input value={custom.lomin} onChange={(e) => setCustom({ ...custom, lomin: e.target.value })} />
          </label>
          <label>
            Max lon
            <input value={custom.lomax} onChange={(e) => setCustom({ ...custom, lomax: e.target.value })} />
          </label>
        </div>
        {customError && <p className="error-text">{customError}</p>}
        <button type="submit">Apply area</button>
      </form>

      <h2>Data source</h2>
      <div className="row">
        <button type="button" className={mode === 'live' ? 'active' : ''} onClick={() => setMode2('live')}>
          Live
        </button>
        <button type="button" className={mode === 'demo' ? 'active' : ''} onClick={() => setMode2('demo')}>
          Demo
        </button>
      </div>
      <p className="muted">Demo replays recorded data (London only).</p>

      <h2>Filters</h2>
      <label>
        Search
        <input
          value={filters.query}
          placeholder="Callsign, ICAO24 or country"
          onChange={(e) => setFilters({ query: e.target.value })}
        />
      </label>
      <div className="row">
        <label>
          Min alt (m)
          <input
            type="number"
            value={filters.minAltitude}
            onChange={(e) => setFilters({ minAltitude: Number(e.target.value) || 0 })}
          />
        </label>
        <label>
          Max alt (m)
          <input
            type="number"
            value={filters.maxAltitude}
            onChange={(e) => setFilters({ maxAltitude: Number(e.target.value) || 0 })}
          />
        </label>
      </div>
      <label>
        Min ground speed (kt)
        <input
          type="number"
          value={filters.minSpeedKnots}
          onChange={(e) => setFilters({ minSpeedKnots: Number(e.target.value) || 0 })}
        />
      </label>
      <label>
        Ground status
        <select value={filters.ground} onChange={(e) => setFilters({ ground: e.target.value as GroundFilter })}>
          <option value="all">All</option>
          <option value="airborne">Airborne only</option>
          <option value="ground">On ground only</option>
        </select>
      </label>
    </aside>
  );
}
