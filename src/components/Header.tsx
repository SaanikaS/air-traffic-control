import { useAircraftStore } from '../store/useAircraftStore';
import { useNow } from '../hooks/useNow';

export default function Header() {
  const now = useNow(1000);
  const status = useAircraftStore((s) => s.status);
  const mode = useAircraftStore((s) => s.mode);
  const error = useAircraftStore((s) => s.error);
  const retryAt = useAircraftStore((s) => s.retryAt);
  const lastUpdated = useAircraftStore((s) => s.lastUpdated);
  const tracked = useAircraftStore((s) => Object.keys(s.aircraft).length);

  const source = mode === 'demo' ? 'Demo data' : 'OpenSky live';
  let detail = 'Waiting for first update…';
  let cls = '';

  if (status === 'error') {
    cls = 'error';
    const secs = retryAt ? Math.max(0, Math.ceil((retryAt - now) / 1000)) : 0;
    detail = `${error ?? 'Error'} — retrying in ${secs}s`;
  } else if (status === 'loading') {
    detail = 'Fetching…';
  } else if (status === 'ok' && lastUpdated) {
    cls = 'ok';
    detail = `Updated ${Math.round((now - lastUpdated) / 1000)}s ago`;
  }

  return (
    <header className="header">
      <h1>Air Traffic Control</h1>
      <div className={`status ${cls}`}>
        {source} · {tracked} tracked · {detail}
      </div>
    </header>
  );
}
