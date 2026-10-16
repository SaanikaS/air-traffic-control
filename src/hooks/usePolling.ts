import { useEffect } from 'react';
import { useAircraftStore } from '../store/useAircraftStore';
import { ApiError, fetchSample, fetchSnapshot } from '../api/opensky';

const POLL_MS = Number(import.meta.env.VITE_POLL_INTERVAL_MS) || 60_000;
const MAX_BACKOFF_MS = 5 * 60_000;
const HIDDEN_CHECK_MS = 5_000;

/**
 * Polls the selected region on a timer. Each region/mode change restarts the
 * loop. Failures back off exponentially, and rate-limit responses use the
 * server's retry hint. Polling pauses while the tab is hidden.
 */
export function usePolling(): void {
  const bbox = useAircraftStore((s) => s.region.bbox);
  const mode = useAircraftStore((s) => s.mode);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;

    const schedule = (ms: number) => {
      if (!controller.signal.aborted) timer = setTimeout(tick, ms);
    };

    const tick = async () => {
      if (document.visibilityState === 'hidden') {
        schedule(HIDDEN_CHECK_MS);
        return;
      }

      const { ingest, setStatus } = useAircraftStore.getState();
      setStatus('loading');

      try {
        const snapshot =
          mode === 'demo'
            ? await fetchSample(bbox, controller.signal)
            : await fetchSnapshot(bbox, controller.signal);
        if (controller.signal.aborted) return;

        failures = 0;
        ingest(snapshot, bbox);
        schedule(POLL_MS);
      } catch (err) {
        if (controller.signal.aborted) return;

        failures += 1;
        const message = err instanceof Error ? err.message : 'Unknown error';
        const retryMs =
          err instanceof ApiError && err.retryAfterMs
            ? err.retryAfterMs
            : Math.min(MAX_BACKOFF_MS, 5_000 * 2 ** (failures - 1));

        setStatus('error', message, Date.now() + retryMs);
        schedule(retryMs);
      }
    };

    tick();

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [bbox, mode]);
}
