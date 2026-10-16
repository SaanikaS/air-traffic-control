import { useAircraftStore } from '../store/useAircraftStore';
import { useNow } from '../hooks/useNow';
import { altitudeOf, FEET_PER_M, KNOTS_PER_MPS } from '../utils/format';

export default function DetailsPanel() {
  const now = useNow(1000);
  const a = useAircraftStore((s) => (s.selectedId ? s.aircraft[s.selectedId] : undefined));
  const history = useAircraftStore((s) => (s.selectedId ? s.history[s.selectedId] : undefined));
  const select = useAircraftStore((s) => s.select);

  if (!a) {
    return (
      <aside className="panel">
        <h2>Aircraft details</h2>
        <p className="muted">Click an aircraft on the map to inspect it and see its recent movement.</p>
      </aside>
    );
  }

  const alt = altitudeOf(a);
  const secondsAgo = Math.round((now - a.receivedAt) / 1000);
  const recent = (history ?? []).slice(-20).reverse();

  return (
    <aside className="panel">
      <div className="row" style={{ alignItems: 'center' }}>
        <h2 style={{ flex: 1 }}>{a.callsign ?? 'Unknown callsign'}</h2>
        <button style={{ width: 'auto' }} onClick={() => select(null)}>
          ×
        </button>
      </div>

      <dl>
        <dt>ICAO24</dt>
        <dd>{a.icao24}</dd>
        <dt>Origin</dt>
        <dd>{a.originCountry || '—'}</dd>
        <dt>Altitude</dt>
        <dd>{alt === null ? '—' : `${Math.round(alt)} m (${Math.round(alt * FEET_PER_M)} ft)`}</dd>
        <dt>Ground speed</dt>
        <dd>{a.velocity === null ? '—' : `${Math.round(a.velocity * KNOTS_PER_MPS)} kt`}</dd>
        <dt>Heading</dt>
        <dd>{a.trueTrack === null ? '—' : `${Math.round(a.trueTrack)}°`}</dd>
        <dt>Vertical rate</dt>
        <dd>{a.verticalRate === null ? '—' : `${a.verticalRate.toFixed(1)} m/s`}</dd>
        <dt>On ground</dt>
        <dd>{a.onGround ? 'Yes' : 'No'}</dd>
        <dt>Last position</dt>
        <dd>
          {a.latitude !== null && a.longitude !== null
            ? `${a.latitude.toFixed(4)}, ${a.longitude.toFixed(4)}`
            : 'Not available'}
        </dd>
        <dt>Last seen</dt>
        <dd>
          {secondsAgo}s ago
          {a.stale ? ' (stale: missing from latest poll)' : ''}
        </dd>
      </dl>

      <h2>Recent movement</h2>
      {recent.length === 0 ? (
        <p className="muted">No position history yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Lat / Lon</th>
              <th>Alt (m)</th>
              <th>kt</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((p) => (
              <tr key={p.t}>
                <td>{new Date(p.t).toLocaleTimeString()}</td>
                <td>
                  {p.lat.toFixed(3)}, {p.lon.toFixed(3)}
                </td>
                <td>{p.altitude === null ? '—' : Math.round(p.altitude)}</td>
                <td>{p.speed === null ? '—' : Math.round(p.speed * KNOTS_PER_MPS)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </aside>
  );
}
