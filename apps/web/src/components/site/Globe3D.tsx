import { useEffect, useMemo, useRef, useState } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import { useI18n } from '../../i18n';

/**
 * 3D trade globe for the hero: real world map, animated flight arcs between
 * trade hubs and ship dots moving along sea lanes. Loaded lazily (three.js is
 * heavy) with the old SVG globe as Suspense fallback.
 */

interface Hub {
  name: string;
  lat: number;
  lng: number;
}

const HUBS: Record<string, Hub> = {
  dubai: { name: 'Dubai', lat: 25.27, lng: 55.3 },
  mumbai: { name: 'Mumbai', lat: 19.08, lng: 72.88 },
  mundra: { name: 'Mundra', lat: 22.84, lng: 69.72 },
  rotterdam: { name: 'Rotterdam', lat: 51.92, lng: 4.48 },
  singapore: { name: 'Singapore', lat: 1.35, lng: 103.82 },
  shanghai: { name: 'Shanghai', lat: 31.23, lng: 121.47 },
  santos: { name: 'Santos', lat: -23.96, lng: -46.33 },
  mombasa: { name: 'Mombasa', lat: -4.04, lng: 39.66 },
  istanbul: { name: 'Istanbul', lat: 41.01, lng: 28.98 },
  odesa: { name: 'Odesa', lat: 46.48, lng: 30.72 },
  almaty: { name: 'Almaty', lat: 43.24, lng: 76.89 },
  newyork: { name: 'New York', lat: 40.71, lng: -74.01 },
};

const GREEN = '#53B86A';
const MANGO = '#FFA000';
const ORANGE = '#FB8C00';

// Flight arcs between trade hubs (animated dashes = planes in transit).
const FLIGHTS = [
  ['dubai', 'mumbai'], ['dubai', 'rotterdam'], ['dubai', 'shanghai'],
  ['mumbai', 'singapore'], ['rotterdam', 'newyork'], ['istanbul', 'almaty'],
  ['shanghai', 'santos'], ['dubai', 'mombasa'], ['istanbul', 'rotterdam'],
  ['mumbai', 'newyork'],
].map(([a, b], i) => ({
  startLat: HUBS[a].lat,
  startLng: HUBS[a].lng,
  endLat: HUBS[b].lat,
  endLng: HUBS[b].lng,
  color: i % 2 === 0 ? MANGO : GREEN,
}));

// Sea lanes for ship dots (interpolated along the great circle each frame).
const SEA_ROUTES: [string, string, number][] = [
  ['mundra', 'dubai', 0.9],
  ['odesa', 'istanbul', 0.5],
  ['singapore', 'shanghai', 0.7],
  ['santos', 'rotterdam', 0.4],
  ['mombasa', 'mumbai', 0.6],
];

/** Spherical interpolation between two lat/lng points (fraction t ∈ [0,1]). */
function slerp(a: Hub, b: Hub, t: number) {
  const d2r = Math.PI / 180;
  const [lat1, lng1, lat2, lng2] = [a.lat * d2r, a.lng * d2r, b.lat * d2r, b.lng * d2r];
  const toVec = (lat: number, lng: number) => [
    Math.cos(lat) * Math.cos(lng),
    Math.cos(lat) * Math.sin(lng),
    Math.sin(lat),
  ];
  const [v1, v2] = [toVec(lat1, lng1), toVec(lat2, lng2)];
  const dot = Math.min(1, Math.max(-1, v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]));
  const omega = Math.acos(dot) || 1e-6;
  const [s1, s2] = [Math.sin((1 - t) * omega) / Math.sin(omega), Math.sin(t * omega) / Math.sin(omega)];
  const v = [s1 * v1[0] + s2 * v2[0], s1 * v1[1] + s2 * v2[1], s1 * v1[2] + s2 * v2[2]];
  return {
    lat: Math.asin(v[2] / Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2)) / d2r,
    lng: Math.atan2(v[1], v[0]) / d2r,
  };
}

interface ShipPoint {
  lat: number;
  lng: number;
}

export default function Globe3D({ size = 480 }: { size?: number }) {
  const { t } = useI18n();
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [ships, setShips] = useState<ShipPoint[]>([]);

  // Hub markers (rings that pulse at each port/market).
  const rings = useMemo(
    () => Object.values(HUBS).slice(0, 8).map((h) => ({ lat: h.lat, lng: h.lng })),
    [],
  );
  // City labels rendered on the globe — translated per locale.
  const labels = useMemo(
    () => ['dubai', 'mumbai', 'rotterdam', 'santos', 'shanghai'].map((k) => ({
      ...HUBS[k],
      name: t(`site.globe.cities.${k}`, { defaultValue: HUBS[k].name }),
    })),
    [t],
  );

  // Ship dots crawl their sea lane on a slow loop (offset so they spread out).
  // Updated on a gentle interval, not per-frame: ships move slowly and pushing
  // pointsData through React 60×/s would burn CPU for invisible motion.
  useEffect(() => {
    const tick = () => {
      const t = Date.now() / 60000; // one full lap ≈ 60s
      setShips(
        SEA_ROUTES.map(([a, b], i) => {
          const phase = (t * (0.6 + (i % 3) * 0.25) + i * 0.19) % 1;
          // Ping-pong so ships sail back and forth instead of teleporting home.
          const f = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
          return slerp(HUBS[a], HUBS[b], f * SEA_ROUTES[i][2]);
        }),
      );
    };
    tick();
    const id = setInterval(tick, 300);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.55;
    controls.enableZoom = false;
    controls.enablePan = false;
    g.pointOfView({ lat: 22, lng: 60, altitude: 2.1 });
  }, []);

  return (
    <div style={{ width: size, height: size }} className="pointer-events-none select-none [&_canvas]:!outline-none">
      <Globe
        ref={globeRef}
        width={size}
        height={size}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-day.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        atmosphereColor={GREEN}
        atmosphereAltitude={0.18}
        arcsData={FLIGHTS}
        arcColor={(d: object) => (d as { color: string }).color}
        arcAltitude={0.28}
        arcStroke={0.6}
        arcDashLength={0.45}
        arcDashGap={1.2}
        arcDashAnimateTime={3200}
        ringsData={rings}
        ringColor={() => (t: number) => `rgba(255,160,0,${Math.max(0, 1 - t)})`}
        ringMaxRadius={3.4}
        ringPropagationSpeed={1.6}
        ringRepeatPeriod={1600}
        pointsData={ships}
        pointColor={() => ORANGE}
        pointAltitude={0.012}
        pointRadius={0.42}
        labelsData={labels}
        labelLat={(d: object) => (d as Hub).lat}
        labelLng={(d: object) => (d as Hub).lng}
        labelText={(d: object) => (d as Hub).name}
        labelSize={1.15}
        labelDotRadius={0.35}
        labelColor={() => 'rgba(255,255,255,0.85)'}
        labelResolution={2}
        animateIn
      />
    </div>
  );
}
