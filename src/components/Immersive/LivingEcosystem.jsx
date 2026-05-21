import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useMapStore } from '../../store/useMapStore';
import { getSeedCity } from '../../data/seedCityData';

/**
 * LivingEcosystem
 *
 * The symbolic living layer of the immersed city:
 *   - Bees   — innovation buzz, looping orbits. Density ∝ university bee count.
 *   - Trees  — growth, static dots. Color encodes city health.
 *   - Cars   — labor mobility, moving dots. Speed and count ∝ mobilityScore.
 *   - Planes — capital flow, dots arcing to connected cities.
 *
 * Every element is a Cesium `point` entity — no external image assets.
 * Seed data from seedCityData.js; real data integration comes later.
 *
 * Entity names are descriptive so they're legible in Cesium Inspector.
 * Listens for `immersion:ecosystemShow`; clears on `immersion:boardExit`.
 * prefers-reduced-motion keeps static trees only.
 *
 * ── Entity → Visual Reference ────────────────────────────────────────────
 * Name prefix         Cesium type       Color               Represents
 * "bee:<univ>"        point             Yellow #FFD54F       Innovation activity per university
 * "tree:<city>:<n>"   point (ground)    Green/Orange/Brown   Business growth health
 * "car:<city>:<n>"    point             Cyan #00D1FF (in)    Labor mobility
 *                                       Orange #FF8A00 (out)
 * "plane:<A>→<B>:<n>" point             White                Capital flow between cities
 * ─────────────────────────────────────────────────────────────────────────
 */
export default function LivingEcosystem() {
  const viewer = useMapStore((s) => s.viewer);
  const entitiesRef = useRef([]);

  useEffect(() => {
    if (!viewer) return;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const epoch = Cesium.JulianDate.now();
    const elapsed = (time) => Cesium.JulianDate.secondsDifference(time, epoch);

    const clear = () => {
      for (const e of entitiesRef.current) {
        if (!viewer.isDestroyed?.()) viewer.entities.remove(e);
      }
      entitiesRef.current = [];
    };

    const add = (opts) => {
      const e = viewer.entities.add(opts);
      entitiesRef.current.push(e);
      return e;
    };

    const spawn = (ev) => {
      const { city, ecosystem } = ev.detail || {};
      if (!city || viewer.isDestroyed?.()) return;
      clear();

      const seed = getSeedCity(city.name);
      const stats = useMapStore.getState().focusedCityStats;

      // ── Trees (static) ────────────────────────────────────────────
      // Color encodes growth health: green=strong, orange=stalling, brown=declining
      const treeCount = reduced ? Math.min(seed.treeCount, 40) : seed.treeCount;
      const health = seed.treeHealth;
      for (let i = 0; i < treeCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.008 + Math.random() * 0.04;
        const r = Math.random();
        let hex;
        if (r < health * 0.7) hex = '#00E676';       // green: thriving
        else if (r < health) hex = '#A5D6A7';         // light green: growing
        else if (r < 0.7) hex = '#FF8A00';            // orange: stalling
        else hex = '#8D6E63';                          // brown: declining
        add({
          id: `tree:${city.name}:${i}`,
          name: `Tree — ${hex === '#00E676' || hex === '#A5D6A7' ? 'growth' : hex === '#FF8A00' ? 'stalling' : 'declining'} ${city.name}`,
          position: Cesium.Cartesian3.fromDegrees(
            city.lon + Math.cos(angle) * radius,
            city.lat + Math.sin(angle) * radius,
            0
          ),
          point: {
            pixelSize: 4 + Math.random() * 4,
            color: Cesium.Color.fromCssColorString(hex).withAlpha(0.85),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
      }

      if (reduced) return;

      // ── Bees (looping orbits around university clusters) ──────────
      // Each university in beeCounts spawns proportional bees.
      // They orbit near the city center, density signals innovation volume.
      const beeEntries = Object.entries(seed.beeCounts);
      const totalBees = beeEntries.reduce((s, [, n]) => s + n, 0);
      let beeIdx = 0;
      for (const [univName, count] of beeEntries) {
        const univFraction = count / totalBees;
        const univAngle = (beeEntries.indexOf(beeEntries.find(([n]) => n === univName)) / beeEntries.length) * Math.PI * 2;
        const univOrbitRadius = 0.007 + univFraction * 0.02;

        for (let i = 0; i < count; i++) {
          const baseAngle = univAngle + (i / count) * Math.PI * 2;
          const orbit = univOrbitRadius * (0.6 + Math.random() * 0.8);
          const centerLon = city.lon + Math.cos(baseAngle) * orbit;
          const centerLat = city.lat + Math.sin(baseAngle) * orbit;
          const speed = 0.3 + Math.random() * 0.5;
          const phase = Math.random() * Math.PI * 2;
          const altitude = 200 + Math.random() * 800;
          add({
            id: `bee:${univName}:${i}`,
            name: `Bee — ${univName} innovation cluster`,
            position: new Cesium.CallbackProperty((time) => {
              const t = elapsed(time) * speed + phase;
              return Cesium.Cartesian3.fromDegrees(
                centerLon + Math.cos(t) * 0.002,
                centerLat + Math.sin(t) * 0.002,
                altitude + Math.sin(t * 3) * 80
              );
            }, false),
            point: {
              pixelSize: 4 + Math.round(univFraction * 3),
              color: Cesium.Color.fromCssColorString('#FFD54F').withAlpha(0.95),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });
          beeIdx++;
        }
      }

      // ── Cars (labor mobility) ─────────────────────────────────────
      // Count and speed driven by seed data calibrated to mobilityScore.
      const mobility = stats?.mobilityScore ?? 50;
      const carCount = seed.carCount;
      const carSpeed = seed.carSpeed * 0.08 + 0.02; // map 0-1 → 0.02-0.10
      for (let i = 0; i < carCount; i++) {
        const startLon = city.lon - 0.03 + Math.random() * 0.06;
        const startLat = city.lat - 0.03 + Math.random() * 0.06;
        const endLon = city.lon - 0.03 + Math.random() * 0.06;
        const endLat = city.lat - 0.03 + Math.random() * 0.06;
        const phase = Math.random();
        // Cyan = workers flowing in, orange = workers flowing out
        const inbound = Math.random() < (mobility / 100);
        const hex = inbound ? '#00D1FF' : '#FF8A00';
        add({
          id: `car:${city.name}:${i}`,
          name: `Car — ${inbound ? 'inbound' : 'outbound'} labor flow ${city.name}`,
          position: new Cesium.CallbackProperty((time) => {
            const t = ((elapsed(time) * carSpeed + phase) % 1 + 1) % 1;
            return Cesium.Cartesian3.fromDegrees(
              startLon + (endLon - startLon) * t,
              startLat + (endLat - startLat) * t,
              20
            );
          }, false),
          point: {
            pixelSize: 5,
            color: Cesium.Color.fromCssColorString(hex).withAlpha(0.95),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
      }

      // ── Planes (capital flow toward connected cities) ─────────────
      // Planes travel arc paths toward each ecosystem city.
      // Count per route comes from seed.planeCounts.
      const ecoList = ecosystem || [];
      ecoList.forEach((dest, ecoIdx) => {
        const planeCount = seed.planeCounts[dest.name] ?? 3;
        for (let i = 0; i < planeCount; i++) {
          const phase = i / planeCount + ecoIdx * 0.13;
          add({
            id: `plane:${city.name}→${dest.name}:${i}`,
            name: `Plane — capital flow ${city.name} → ${dest.name}`,
            position: new Cesium.CallbackProperty((time) => {
              const t = ((elapsed(time) * 0.12 + phase) % 1 + 1) % 1;
              const altitude = 3000 + Math.sin(t * Math.PI) * 9000;
              return Cesium.Cartesian3.fromDegrees(
                city.lon + (dest.lon - city.lon) * t,
                city.lat + (dest.lat - city.lat) * t,
                altitude
              );
            }, false),
            point: {
              pixelSize: 6,
              color: Cesium.Color.WHITE.withAlpha(0.85),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });
        }
      });

      // ── Extra dust-particle dots (deal activity ambience) ─────────
      // Static glowing dots near city center; density ∝ dustEmission.
      const dustCount = Math.round(seed.dustEmission * 80);
      for (let i = 0; i < dustCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * 0.015;
        add({
          id: `dust:${city.name}:${i}`,
          name: `Dust — deal activity ${city.name}`,
          position: new Cesium.CallbackProperty((time) => {
            const drift = elapsed(time) * 0.0002;
            return Cesium.Cartesian3.fromDegrees(
              city.lon + Math.cos(angle + drift) * r,
              city.lat + Math.sin(angle + drift) * r,
              100 + Math.sin(elapsed(time) * 0.3 + i) * 80
            );
          }, false),
          point: {
            pixelSize: 3,
            color: Cesium.Color.fromCssColorString('#FF8A00').withAlpha(0.5),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
      }
    };

    window.addEventListener('immersion:ecosystemShow', spawn);
    window.addEventListener('immersion:boardExit', clear);
    return () => {
      window.removeEventListener('immersion:ecosystemShow', spawn);
      window.removeEventListener('immersion:boardExit', clear);
      clear();
    };
  }, [viewer]);

  return null;
}
