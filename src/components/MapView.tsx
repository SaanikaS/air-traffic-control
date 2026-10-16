import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAircraftStore } from '../store/useAircraftStore';
import { useNow } from '../hooks/useNow';
import { applyFilters } from '../utils/filters';
import { estimatePosition } from '../utils/geo';
import { altitudeOf } from '../utils/format';
import type { Observation, TrackedAircraft } from '../types';

function FitToRegion() {
  const map = useMap();
  const bbox = useAircraftStore((s) => s.region.bbox);
  useEffect(() => {
    map.fitBounds(
      [
        [bbox.lamin, bbox.lomin],
        [bbox.lamax, bbox.lomax],
      ],
      { padding: [20, 20] },
    );
  }, [map, bbox]);
  return null;
}

function altitudeColor(alt: number | null): string {
  if (alt === null) return '#94a3b8';
  if (alt < 3000) return '#22c55e';
  if (alt < 8000) return '#eab308';
  if (alt < 12000) return '#f97316';
  return '#38bdf8';
}

function makeIcon(track: number | null, color: string, stale: boolean, selected: boolean) {
  const size = selected ? 28 : 22;
  return L.divIcon({
    className: 'plane-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div class="plane${stale ? ' stale' : ''}" style="transform:rotate(${track ?? 0}deg)">
      <svg viewBox="0 0 24 24" width="${size}" height="${size}">
        <path d="M12 2 19 21 12 17 5 21Z" fill="${color}" stroke="${selected ? '#ffffff' : '#0b1220'}" stroke-width="${selected ? 1.5 : 1}"/>
      </svg></div>`,
  });
}

interface LayerProps {
  a: TrackedAircraft;
  now: number;
  trail: Observation[] | undefined;
  selected: boolean;
  onSelect: () => void;
}

function AircraftLayer({ a, now, trail, selected, onSelect }: LayerProps) {
  const color = altitudeColor(altitudeOf(a));
  const icon = useMemo(
    () => makeIcon(a.trueTrack, color, a.stale, selected),
    [a.trueTrack, color, a.stale, selected],
  );

  const pos = estimatePosition(a, now);
  if (!pos) return null;

  const line = (trail ?? []).map((p) => [p.lat, p.lon] as [number, number]);

  return (
    <>
      {selected && line.length > 1 && (
        <Polyline positions={line} pathOptions={{ color, weight: 2, opacity: 0.8 }} />
      )}
      <Marker
        position={[pos.lat, pos.lon]}
        icon={icon}
        opacity={a.stale ? 0.4 : 1}
        eventHandlers={{ click: onSelect }}
      >
        <Tooltip>
          {a.callsign ?? a.icao24}
          {pos.estimated ? ' (estimated)' : ''}
          {a.stale ? ' — stale' : ''}
        </Tooltip>
      </Marker>
    </>
  );
}

export default function MapView() {
  const now = useNow(1000);
  const region = useAircraftStore((s) => s.region);
  const aircraft = useAircraftStore((s) => s.aircraft);
  const history = useAircraftStore((s) => s.history);
  const filters = useAircraftStore((s) => s.filters);
  const selectedId = useAircraftStore((s) => s.selectedId);
  const select = useAircraftStore((s) => s.select);

  const visible = useMemo(() => applyFilters(Object.values(aircraft), filters), [aircraft, filters]);

  const center: [number, number] = [
    (region.bbox.lamin + region.bbox.lamax) / 2,
    (region.bbox.lomin + region.bbox.lomax) / 2,
  ];

  return (
    <MapContainer center={center} zoom={7} className="map" worldCopyJump>
      <FitToRegion />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      {visible.map((a) => (
        <AircraftLayer
          key={a.icao24}
          a={a}
          now={now}
          trail={a.icao24 === selectedId ? history[a.icao24] : undefined}
          selected={a.icao24 === selectedId}
          onSelect={() => select(a.icao24)}
        />
      ))}
    </MapContainer>
  );
}
