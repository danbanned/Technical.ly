import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useMapStore } from '../../store/useMapStore';
import { getCityData } from '../../data/seedCityData';
import { SHAPE_REGISTRY } from '../../utils/buildingShapes';

/**
 * FakeCityGenerator v2 — Voxel City with Economic Storytelling
 *
 * Major changes from v1:
 *  - Extruded polygons (not boxes) so buildings have proper separation gaps
 *  - Zoning system: downtown / commercial / residential / industrial / innovation
 *  - 20-category economic color map: each building color = a specific stat
 *  - Landmark stepped-pyramid towers per city (Comcast-style, university, hospital, etc.)
 *  - Road grid as polylines between building plots
 *  - Street lights as point entities at intersections
 *  - Noise-based height variation within zone bounds
 *  - Seeded RNG so the city is deterministic per city name
 *
 * Uses the store viewer (no prop), named { useMapStore } import.
 * Listens for immersion:fakeCityGenerate / immersion:boardExit.
 *
 * ── Entity Name Reference (visible in Cesium Inspector) ──────────────────
 *  "Bldg — <zone> <stat> [px,pz]"   extruded polygon   economic zone building
 *  "LM — <name> step <n>"            extruded polygon   landmark pyramid step
 *  "LM — <name> beacon"              point              landmark glow beacon
 *  "LM — <name> antenna"             extruded polygon   roof antenna
 *  "Road — NS x=<n>"                 polyline           N-S road strip
 *  "Road — EW z=<n>"                 polyline           E-W road strip
 *  "Light — <x>,<z>"                 point              street-light glow
 * ─────────────────────────────────────────────────────────────────────────
 */

// ── Scale constants ────────────────────────────────────────────────────────
const BLOCK_SCALE   = 3;    // meters per voxel unit — heights in the zone rules
const PLOT_SIZE     = 20;   // meters per building plot (building + road gap)
const ROAD_GAP      = 8;    // meters reserved for the road (building = PLOT_SIZE - ROAD_GAP)
const CITY_RADIUS   = 600;  // meters from city center
const CHUNK_SIZE    = 200;  // meters per generation chunk

// ── Economic color map ──────────────────────────────────────────────────────
// Every building gets one color = one specific economic statistic.
const ECON = {
  universityResearch:    { hex: '#00D1FF', label: 'University R&D',       pri: 5 },
  corporateResearch:     { hex: '#0091EA', label: 'Corporate R&D',        pri: 4 },
  patents:               { hex: '#00B8D4', label: 'Patents Filed',         pri: 3 },
  ventureCapital:        { hex: '#FF8A00', label: 'Venture Capital',       pri: 5 },
  privateEquity:         { hex: '#FF6D00', label: 'Private Equity',        pri: 4 },
  angelInvestment:       { hex: '#FFAB40', label: 'Angel Investment',      pri: 3 },
  bankLending:           { hex: '#FFD180', label: 'Bank Lending',          pri: 2 },
  techTalent:            { hex: '#00E676', label: 'Tech Talent',           pri: 4 },
  healthcareTalent:      { hex: '#69F0AE', label: 'Healthcare Talent',     pri: 3 },
  graduateOutput:        { hex: '#B9F6CA', label: 'Graduate Output',       pri: 3 },
  newBusinesses:         { hex: '#E040FB', label: 'New Businesses',        pri: 4 },
  smallBusiness:         { hex: '#EA80FC', label: 'Small Business',        pri: 2 },
  commercialRealEstate:  { hex: '#795548', label: 'Commercial RE',         pri: 3 },
  residentialRealEstate: { hex: '#8D6E63', label: 'Residential RE',        pri: 2 },
  industrialRealEstate:  { hex: '#A1887F', label: 'Industrial RE',         pri: 2 },
  minorityOwned:         { hex: '#FF005C', label: 'Minority-Owned',        pri: 4 },
  womenOwned:            { hex: '#FF4081', label: 'Women-Owned',           pri: 3 },
  affordableHousing:     { hex: '#F50057', label: 'Affordable Housing',    pri: 3 },
  publicSpending:        { hex: '#607D8B', label: 'Public Spending',       pri: 3 },
  transit:               { hex: '#90A4AE', label: 'Transit',               pri: 2 },
  mixedUse:              { hex: '#B0BEC5', label: 'Mixed Use',             pri: 1 },
  vacant:                { hex: '#37474F', label: 'Vacant',                pri: 0 },
};

// ── Zone rules ─────────────────────────────────────────────────────────────
// minH/maxH in voxel units (×BLOCK_SCALE for meters). roadW in meters.
const ZONES = {
  downtown:    { plotSize: 24, roadW: 10, minH: 10, maxH: 50, density: 0.85, roof: 'antenna',   dominant: ['ventureCapital','corporateResearch','techTalent','privateEquity'] },
  innovation:  { plotSize: 22, roadW: 8,  minH: 7,  maxH: 38, density: 0.72, roof: 'stepped',  dominant: ['universityResearch','patents','techTalent','graduateOutput'] },
  commercial:  { plotSize: 20, roadW: 8,  minH: 5,  maxH: 22, density: 0.75, roof: 'flat',     dominant: ['smallBusiness','bankLending','commercialRealEstate','newBusinesses'] },
  residential: { plotSize: 18, roadW: 6,  minH: 2,  maxH: 10, density: 0.65, roof: 'peaked',   dominant: ['residentialRealEstate','minorityOwned','womenOwned','affordableHousing'] },
  industrial:  { plotSize: 24, roadW: 10, minH: 3,  maxH: 12, density: 0.55, roof: 'flat',     dominant: ['industrialRealEstate','publicSpending','transit'] },
};

// ── Landmark template → shape/footprint spec ───────────────────────────────
// Maps seedCityData landmark.template names to rendering params.
const TEMPLATE_MAP = {
  comcastTower:    { shapeKey: 'blade_bullet',     footW: 32 },
  universityTower: { shapeKey: 'spired_futurist',  footW: 28 },
  financialTower:  { shapeKey: 'tiered_blade',     footW: 28 },
  hospitalComplex: { shapeKey: 'terraced_midrise', footW: 40 },
  transitHub:      { shapeKey: 'monolithic_slab',  footW: 50 },
};

// ── Seeded RNG ─────────────────────────────────────────────────────────────
function makeRng(seed) {
  let s = Math.abs(seed) % 233280 || 1;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

// ── Smooth noise (deterministic height variation) ──────────────────────────
function noise(x, z) {
  const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

// ── Zone classifier ────────────────────────────────────────────────────────
function zoneFor(gx, gz, radius) {
  const d = Math.hypot(gx, gz) / radius;
  const a = Math.atan2(gz, gx);
  if (d < 0.18) return 'downtown';
  if (Math.abs(a) < 0.35 && d < 0.52) return 'innovation';
  if (d < 0.52) return 'commercial';
  if (a > 2.0 && a < 3.5 && d < 0.72) return 'industrial';
  return 'residential';
}

// ── Coordinate converter: grid meters ↔ lon/lat ───────────────────────────
class Converter {
  constructor(lat, lon) {
    this._lat = lat; this._lon = lon;
    this._mpLat = 111320;
    this._mpLon = 111320 * Math.cos(lat * Math.PI / 180);
  }
  toLonLat(gx, gz) {
    return { lon: this._lon + gx / this._mpLon, lat: this._lat + gz / this._mpLat };
  }
  // Convert absolute lat/lon to grid coordinates (meters from city center)
  toGrid(lat, lon) {
    const dLat = lat - this._lat;
    const dLon = lon - this._lon;
    return { gx: dLon * this._mpLon, gz: dLat * this._mpLat };
  }
  // Returns flat degrees array [lon0,lat0, lon1,lat1, lon2,lat2, lon3,lat3]
  rect(cx, cz, w, d) {
    const hw = w / 2, hd = d / 2;
    const sw = this.toLonLat(cx - hw, cz - hd);
    const se = this.toLonLat(cx + hw, cz - hd);
    const ne = this.toLonLat(cx + hw, cz + hd);
    const nw = this.toLonLat(cx - hw, cz + hd);
    return [sw.lon, sw.lat, se.lon, se.lat, ne.lon, ne.lat, nw.lon, nw.lat];
  }
}

// ── Cesium polygon hierarchy from flat degrees array ──────────────────────
function toH(flatDeg) {
  return new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(flatDeg));
}

// ── Shrink a flat-degrees footprint toward its centroid ───────────────────
function shrink(fp, factor) {
  const cx = (fp[0] + fp[2] + fp[4] + fp[6]) / 4;
  const cy = (fp[1] + fp[3] + fp[5] + fp[7]) / 4;
  return fp.map((v, i) => { const c = i % 2 === 0 ? cx : cy; return c + (v - c) * factor; });
}

// ── Shape-library bridge helpers ───────────────────────────────────────────
// Converts Converter.rect() flat-degrees output → [[lon,lat],...] for buildingShapes
function rectFootprint(C, gx, gz, w, h) {
  const flat = C.rect(gx, gz, w, h);
  const out = [];
  for (let i = 0; i < flat.length; i += 2) out.push([flat[i], flat[i + 1]]);
  return out;
}

// Renders every layer returned by a shape function as a Cesium polygon entity
function renderShape(shapeFn, fp, totalHeight, hexColor, entityArr, viewer, namePrefix) {
  if (!shapeFn) return;
  const layers = shapeFn(fp, totalHeight, hexColor);
  for (const layer of layers) {
    const flat = layer.footprint.flatMap(([lon, lat]) => [lon, lat]);
    const col  = Cesium.Color.fromCssColorString(layer.color ?? hexColor).withAlpha(0.92);
    const hasOutline = layer.outlineColor !== null && layer.outlineColor !== undefined;
    entityArr.push(viewer.entities.add({
      name: `${namePrefix} ${layer.type}`,
      polygon: {
        hierarchy:      new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(flat)),
        height:         layer.height,
        extrudedHeight: layer.extrudedHeight,
        material:       col,
        outline:        hasOutline,
        outlineColor:   hasOutline
          ? Cesium.Color.fromCssColorString(layer.outlineColor).withAlpha(0.6)
          : Cesium.Color.WHITE.withAlpha(0),
        outlineWidth:   layer.outlineWidth ?? 1,
      },
    }));
  }
}

// ── Pick an economic stat for a building ───────────────────────────────────
// Non-dominant selection is weighted by city percentile when available.
function pickStat(zone, rng, cityStats) {
  const rules = ZONES[zone];
  if (rng() < 0.62) {
    return rules.dominant[Math.floor(rng() * rules.dominant.length)];
  }
  const all = Object.entries(ECON).filter(([, v]) => v.pri >= 1);
  const w = ([k, v]) => v.pri * (cityStats ? (cityStats[k]?.percentile ?? 50) / 100 + 0.1 : 1);
  const total = all.reduce((s, e) => s + w(e), 0);
  let r = rng() * total, cum = 0;
  for (const e of all) { cum += w(e); if (r < cum) return e[0]; }
  return 'mixedUse';
}

// ── Billboard canvas material ──────────────────────────────────────────────
// Creates an HTML canvas rendered as a wall-entity texture — the "sign face"
// placed on top of landmark buildings.
function createBillboardMaterial(name, statLabel, hexColor) {
  const W = 512, H = 192;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background: building accent color, darkened
  ctx.fillStyle = hexColor ?? '#0D1B2A';
  ctx.fillRect(0, 0, W, H);

  // Cyan accent strips (top & bottom)
  ctx.fillStyle = '#00D1FF';
  ctx.fillRect(0, 0, W, 9);
  ctx.fillRect(0, H - 9, W, 9);

  // Left accent stripe (building color at 80% alpha)
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = hexColor ?? '#0D47A1';
  ctx.fillRect(0, 9, 7, H - 18);
  ctx.globalAlpha = 1;

  // Main name text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 52px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(name, W / 2, 108, W - 56);

  // Stat label text
  ctx.fillStyle = '#00D1FF';
  ctx.font = '30px Arial, sans-serif';
  ctx.fillText(statLabel, W / 2, 155, W - 56);

  return new Cesium.ImageMaterialProperty({ image: canvas });
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function FakeCityGenerator() {
  const viewer = useMapStore((s) => s.viewer);
  const buildRef      = useRef([]);  // building + landmark entities
  const roadRef       = useRef([]);  // road + light entities
  const conv          = useRef(null);
  const radiusRef     = useRef(CITY_RADIUS);
  const cityStatsRef  = useRef(null);

  useEffect(() => {
    if (!viewer) return;

    const clearAll = () => {
      const v = useMapStore.getState().viewer;
      for (const e of buildRef.current) if (v && !v.isDestroyed?.()) v.entities.remove(e);
      for (const e of roadRef.current)  if (v && !v.isDestroyed?.()) v.entities.remove(e);
      buildRef.current = [];
      roadRef.current  = [];
    };

    const onGenerate = (ev) => {
      const { city } = ev.detail || {};
      if (!city || viewer.isDestroyed?.()) return;
      clearAll();

      const cityData       = getCityData(city.name);
      radiusRef.current    = cityData?.cityRadius || CITY_RADIUS;
      cityStatsRef.current = cityData?.stats || null;

      conv.current = new Converter(city.lat, city.lon);

      generateBuildings(city, cityData, viewer);
      addLandmarks(city, cityData, viewer);
      addSatellites(city, cityData, viewer);
      addRoads(viewer);
      addStreetLights(viewer);
    };

    window.addEventListener('immersion:fakeCityGenerate', onGenerate);
    window.addEventListener('immersion:boardExit', clearAll);
    return () => {
      window.removeEventListener('immersion:fakeCityGenerate', onGenerate);
      window.removeEventListener('immersion:boardExit', clearAll);
      clearAll();
    };
  }, [viewer]);

  // ── Building generation (chunk-based) ──────────────────────────────────
  function generateBuildings(city, cityData, viewer) {
    const C = conv.current;
    const radius = radiusRef.current;
    const chunkCount = Math.ceil((radius * 2) / CHUNK_SIZE);

    for (let cx = -chunkCount; cx <= chunkCount; cx++) {
      for (let cz = -chunkCount; cz <= chunkCount; cz++) {
        const chunkX = cx * CHUNK_SIZE;
        const chunkZ = cz * CHUNK_SIZE;
        if (Math.hypot(chunkX, chunkZ) > radius + CHUNK_SIZE) continue;

        const plotsPerSide = Math.floor(CHUNK_SIZE / PLOT_SIZE);
        const chunkSeed = Math.abs(cx * 73856093 + cz * 19349663);

        for (let px = 0; px < plotsPerSide; px++) {
          for (let pz = 0; pz < plotsPerSide; pz++) {
            const gx = chunkX - CHUNK_SIZE / 2 + px * PLOT_SIZE + PLOT_SIZE / 2;
            const gz = chunkZ - CHUNK_SIZE / 2 + pz * PLOT_SIZE + PLOT_SIZE / 2;
            if (Math.hypot(gx, gz) > radius) continue;

            const zone  = zoneFor(gx, gz, radius);
            const rules = ZONES[zone];
            const rng   = makeRng(chunkSeed + px * 1000 + pz);
            if (rng() > rules.density) continue;

            // Height: noise-driven within zone limits (voxel units → meters)
            const n = noise(gx * 0.05, gz * 0.05);
            const height = (rules.minH + n * (rules.maxH - rules.minH)) * BLOCK_SCALE;

            const stat = pickStat(zone, rng, cityStatsRef.current);
            const hex  = ECON[stat]?.hex ?? '#B0BEC5';
            const color = Cesium.Color.fromCssColorString(hex);

            // Building footprint with road gap on all sides
            const bw = rules.plotSize - rules.roadW / 2;
            const fp = C.rect(gx, gz, bw, bw);

            const entity = viewer.entities.add({
              name: `Bldg — ${zone} ${stat} [${px},${pz}]`,
              polygon: {
                hierarchy: toH(fp),
                height: 0,
                extrudedHeight: height,
                material: color.withAlpha(0.92),
                outline: true,
                outlineColor: Cesium.Color.BLACK.withAlpha(0.25),
                outlineWidth: 1,
              },
            });
            buildRef.current.push(entity);

            // Peaked roof cap on residential buildings
            if (rules.roof === 'peaked' && height > 9) {
              const roof = shrink(fp, 0.7);
              buildRef.current.push(viewer.entities.add({
                name: `Bldg — ${zone} roof [${px},${pz}]`,
                polygon: {
                  hierarchy: toH(roof),
                  height,
                  extrudedHeight: height + 4,
                  material: Cesium.Color.fromCssColorString('#5D4037').withAlpha(0.9),
                },
              }));
            }

            // Antenna on tall downtown/innovation buildings
            if ((rules.roof === 'antenna' || rules.roof === 'stepped') && height > 60) {
              const mid = C.toLonLat(gx, gz);
              const ant = [
                mid.lon - 0.00003, mid.lat - 0.00003,
                mid.lon + 0.00003, mid.lat - 0.00003,
                mid.lon + 0.00003, mid.lat + 0.00003,
                mid.lon - 0.00003, mid.lat + 0.00003,
              ];
              buildRef.current.push(viewer.entities.add({
                name: `Bldg — ${zone} antenna [${px},${pz}]`,
                polygon: {
                  hierarchy: toH(ant),
                  height,
                  extrudedHeight: height + 10,
                  material: Cesium.Color.RED.withAlpha(0.85),
                },
              }));
            }
          }
        }
      }
    }
  }

  // ── Resolve a landmark's grid coordinates (gx, gz) from seed data ──────
  function resolveLandmarkGridCoords(city, cityData, lm) {
    const C = conv.current;
    let lat, lon;

    // 1. Explicit lat/lon (highest priority)
    if (lm.lat !== undefined && lm.lon !== undefined) {
      lat = lm.lat;
      lon = lm.lon;
    }
    // 2. University reference – look up real coordinates
    else if (lm.universityRef) {
      const uni = cityData.universities?.find(u => u.name === lm.universityRef);
      if (!uni) {
        console.warn(`University "${lm.universityRef}" not found for landmark "${lm.name}" – skipping.`);
        return null;
      }
      lat = uni.lat;
      lon = uni.lon;
    }
    else if (lm.techCenterRef) {
      const techCenter = cityData.techCenters?.find(tc => tc.name === lm.techCenterRef);
      if (!techCenter) {
        console.warn(`Tech center "${lm.techCenterRef}" not found for landmark "${lm.name}" – skipping.`);
        return null;
      }
      lat = techCenter.lat;
      lon = techCenter.lon;
    }
    else if (lm.hospitalRef) {
      const hospital = cityData.hospitals?.find(h => h.name === lm.hospitalRef);
      if (!hospital) {
        console.warn(`Hospital "${lm.hospitalRef}" not found for landmark "${lm.name}" – skipping.`);
        return null;
      }
      lat = hospital.lat;
      lon = hospital.lon;
    }
    else if (lm.financialRef) {
      const district = cityData.financialDistricts?.find(fd => fd.name === lm.financialRef);
      if (!district) {
        console.warn(`Financial district "${lm.financialRef}" not found for landmark "${lm.name}" – skipping.`);
        return null;
      }
      lat = district.lat;
      lon = district.lon;
    }
    else if (lm.transitRef) {
      const transitHub = cityData.transitHubs?.find(th => th.name === lm.transitRef);
      if (!transitHub) {
        console.warn(`Transit hub "${lm.transitRef}" not found for landmark "${lm.name}" – skipping.`);
        return null;
      }
      lat = transitHub.lat;
      lon = transitHub.lon;
    }
    // 3. Legacy gridX/gridZ (fallback)
    else if (lm.gridX !== undefined && lm.gridZ !== undefined) {
      const pos = C.toLonLat(lm.gridX, lm.gridZ);
      lat = pos.lat;
      lon = pos.lon;
    }
    else {
      console.warn(`Landmark "${lm.name}" has no location data (lat/lon, universityRef, techCenterRef, hospitalRef, financialRef, transitRef, or gridX/gridZ) – skipping.`);
      return null;
    }

    // Convert absolute lat/lon to grid coordinates (meters from city center)
    const { gx, gz } = C.toGrid(lat, lon);
    return { gx, gz, lat, lon };
  }

  // ── Landmark placement (seed-data driven) ────────────────────────────
  function addLandmarks(city, cityData, viewer) {
    const C = conv.current;
    const landmarks = cityData?.landmarks || [];

    for (const lm of landmarks) {
      const spec = TEMPLATE_MAP[lm.template];
      if (!spec) continue;

      const grid = resolveLandmarkGridCoords(city, cityData, lm);
      if (!grid) continue;
      const { gx, gz, lat, lon } = grid;

      const height = lm.height * BLOCK_SCALE;
      const fp     = rectFootprint(C, gx, gz, spec.footW, spec.footW);

      renderShape(
        SHAPE_REGISTRY[spec.shapeKey],
        fp,
        height,
        lm.color ?? '#B0BEC5',
        buildRef.current,
        viewer,
        `LM — ${lm.name}`
      );

      // Billboard placement – use the resolved lat/lon
      const mpLon = 111320 * Math.cos(city.lat * Math.PI / 180);
      const panelW = spec.footW * 0.88;
      const halfWDeg = (panelW / 2) / mpLon;
      const panelH = Math.max(10, height * 0.22);
      const signBase = height + 12;

      buildRef.current.push(viewer.entities.add({
        name: `LM — ${lm.name} sign`,
        wall: {
          positions: Cesium.Cartesian3.fromDegreesArray([
            lon - halfWDeg, lat,
            lon + halfWDeg, lat,
          ]),
          minimumHeights: [signBase, signBase],
          maximumHeights: [signBase + panelH, signBase + panelH],
          material: createBillboardMaterial(
            lm.name,
            ECON[lm.stat]?.label ?? lm.stat,
            lm.color
          ),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('#00D1FF').withAlpha(0.7),
          outlineWidth: 1,
        },
      }));

      // Floating label
      buildRef.current.push(viewer.entities.add({
        name: `LM — ${lm.name} label`,
        position: Cesium.Cartesian3.fromDegrees(lon, lat, signBase + panelH + 8),
        label: {
          text: lm.name,
          font: 'bold 13px Inter, Arial, sans-serif',
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK.withAlpha(0.8),
          outlineWidth: 2,
          backgroundColor: Cesium.Color.fromCssColorString(lm.color ?? '#1A2A3A').withAlpha(0.9),
          backgroundPadding: new Cesium.Cartesian2(10, 6),
          showBackground: true,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3500),
        },
      }));
    }
  }

  // ── Road grid (polylines) ─────────────────────────────────────────────
  function addRoads(viewer) {
    const C = conv.current;
    const roadColor = new Cesium.PolylineOutlineMaterialProperty({
      color: Cesium.Color.fromCssColorString('#333333').withAlpha(0.9),
      outlineColor: Cesium.Color.fromCssColorString('#222222').withAlpha(0.6),
      outlineWidth: 1,
    });

    // N-S roads
    const r = radiusRef.current;
    for (let x = -r; x <= r; x += PLOT_SIZE) {
      const s = C.toLonLat(x, -r);
      const n = C.toLonLat(x, r);
      roadRef.current.push(viewer.entities.add({
        name: `Road — NS x=${Math.round(x)}`,
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray([s.lon, s.lat, n.lon, n.lat]),
          width: 2,
          material: roadColor,
          clampToGround: true,
        },
      }));
    }

    // E-W roads
    for (let z = -r; z <= r; z += PLOT_SIZE) {
      const w = C.toLonLat(-r, z);
      const e = C.toLonLat(r, z);
      roadRef.current.push(viewer.entities.add({
        name: `Road — EW z=${Math.round(z)}`,
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray([w.lon, w.lat, e.lon, e.lat]),
          width: 2,
          material: roadColor,
          clampToGround: true,
        },
      }));
    }
  }

  // ── Street lights (points at every other intersection) ───────────────
  function addStreetLights(viewer) {
    const C = conv.current;
    const step = PLOT_SIZE * 2;
    const r = radiusRef.current;

    for (let x = -r; x <= r; x += step) {
      for (let z = -r; z <= r; z += step) {
        if (Math.hypot(x, z) > r) continue;
        const p = C.toLonLat(x, z);
        roadRef.current.push(viewer.entities.add({
          name: `Light — ${Math.round(x)},${Math.round(z)}`,
          position: Cesium.Cartesian3.fromDegrees(p.lon, p.lat, 8),
          point: {
            pixelSize: 4,
            color: Cesium.Color.fromCssColorString('#FFF59D').withAlpha(0.85),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        }));
      }
    }
  }

  // ── Satellite districts around each landmark ─────────────────────────
  function addSatellites(city, cityData, viewer) {
    const C = conv.current;
    const landmarks = cityData?.landmarks || [];
    const rng = makeRng(city.name.charCodeAt(0) * 997 + 42);

    for (const lm of landmarks) {
      if (!TEMPLATE_MAP[lm.template]) continue;
      const grid = resolveLandmarkGridCoords(city, cityData, lm);
      if (!grid) continue;
      const { gx, gz } = grid;

      // ── Universal ring (training, housing, retail) ──────────────────
      for (let i = 0; i < 3; i++) {
        const ang = (i * 120 + 30) * Math.PI / 180;
        const r = 80 + rng() * 40;
        renderShape(SHAPE_REGISTRY.modular_lowrise, rectFootprint(C, gx + Math.cos(ang) * r, gz + Math.sin(ang) * r, 16, 20), 6 + rng() * 10, '#455A64', buildRef.current, viewer, `SAT — ${lm.name} training`);
      }
      for (let i = 0; i < 4; i++) {
        const ang = (i * 90 + 45 + (rng() - 0.5) * 30) * Math.PI / 180;
        const r = 120 + rng() * 40;
        const hexes = ['#37474F', '#455A64', '#546E7A', '#607D8B'];
        renderShape(SHAPE_REGISTRY.stepback_highrise, rectFootprint(C, gx + Math.cos(ang) * r, gz + Math.sin(ang) * r, 18, 22), 8 + rng() * 14, hexes[i % 4], buildRef.current, viewer, `SAT — ${lm.name} housing`);
      }
      for (let i = 0; i < 5; i++) {
        const ang = (i * 72 + rng() * 20) * Math.PI / 180;
        const r = 140 + rng() * 40;
        renderShape(SHAPE_REGISTRY.gable_house, rectFootprint(C, gx + Math.cos(ang) * r, gz + Math.sin(ang) * r, 12, 14), 4 + rng() * 5, '#5D4037', buildRef.current, viewer, `SAT — ${lm.name} retail`);
      }

      // ── Template-specific satellites ────────────────────────────────
      if (lm.template === 'comcastTower') {
        for (let i = 0; i < 3; i++) {
          const ang = (i * 120 + 15) * Math.PI / 180;
          const r = 100 + rng() * 40;
          renderShape(SHAPE_REGISTRY.cylindrical_crown, rectFootprint(C, gx + Math.cos(ang) * r, gz + Math.sin(ang) * r, 20, 20), 12 + rng() * 16, '#0D47A1', buildRef.current, viewer, `SAT — ${lm.name} supplier`);
        }
        for (let i = 0; i < 2; i++) {
          const ang = (i * 180 + 60) * Math.PI / 180;
          const r = 100 + rng() * 50;
          renderShape(SHAPE_REGISTRY.slab_skyscraper, rectFootprint(C, gx + Math.cos(ang) * r, gz + Math.sin(ang) * r, 14, 28), 10 + rng() * 12, '#455A64', buildRef.current, viewer, `SAT — ${lm.name} lowwage`);
        }
      } else if (lm.template === 'universityTower') {
        for (let i = 0; i < 3; i++) {
          const ang = (i * 120 + 20) * Math.PI / 180;
          const r = 100 + rng() * 40;
          renderShape(SHAPE_REGISTRY.segmented_tower, rectFootprint(C, gx + Math.cos(ang) * r, gz + Math.sin(ang) * r, 18, 18), 14 + rng() * 18, '#00B8D4', buildRef.current, viewer, `SAT — ${lm.name} spinoff`);
        }
        for (let i = 0; i < 2; i++) {
          const ang = (i * 180 + 70) * Math.PI / 180;
          const r = 120 + rng() * 40;
          renderShape(SHAPE_REGISTRY.pagoda_tower, rectFootprint(C, gx + Math.cos(ang) * r, gz + Math.sin(ang) * r, 16, 16), 12 + rng() * 14, '#E040FB', buildRef.current, viewer, `SAT — ${lm.name} inclusive`);
        }
      } else if (lm.template === 'hospitalComplex') {
        for (let i = 0; i < 3; i++) {
          const ang = (i * 120 + 10) * Math.PI / 180;
          const r = 100 + rng() * 30;
          renderShape(SHAPE_REGISTRY.stepback_highrise, rectFootprint(C, gx + Math.cos(ang) * r, gz + Math.sin(ang) * r, 20, 24), 16 + rng() * 20, '#E91E63', buildRef.current, viewer, `SAT — ${lm.name} workforce`);
        }
        for (let i = 0; i < 2; i++) {
          const ang = (i * 180 + 45) * Math.PI / 180;
          const r = 110 + rng() * 40;
          renderShape(SHAPE_REGISTRY.spired_futurist, rectFootprint(C, gx + Math.cos(ang) * r, gz + Math.sin(ang) * r, 16, 16), 20 + rng() * 20, '#F06292', buildRef.current, viewer, `SAT — ${lm.name} biotech`);
        }
      } else if (lm.template === 'financialTower') {
        for (let i = 0; i < 3; i++) {
          const ang = (i * 120 + 30) * Math.PI / 180;
          const r = 100 + rng() * 40;
          renderShape(SHAPE_REGISTRY.pagoda_tower, rectFootprint(C, gx + Math.cos(ang) * r, gz + Math.sin(ang) * r, 18, 18), 16 + rng() * 18, '#FF005C', buildRef.current, viewer, `SAT — ${lm.name} minority`);
        }
        for (let i = 0; i < 2; i++) {
          const ang = (i * 180 + 80) * Math.PI / 180;
          const r = 120 + rng() * 40;
          renderShape(SHAPE_REGISTRY.lowrise_compound, rectFootprint(C, gx + Math.cos(ang) * r, gz + Math.sin(ang) * r, 22, 22), 8 + rng() * 10, '#FF8A00', buildRef.current, viewer, `SAT — ${lm.name} community`);
        }
      } else if (lm.template === 'transitHub') {
        for (let i = 0; i < 6; i++) {
          const ang = (i * 60) * Math.PI / 180;
          const r = 80 + rng() * 60;
          renderShape(SHAPE_REGISTRY.modular_lowrise, rectFootprint(C, gx + Math.cos(ang) * r, gz + Math.sin(ang) * r, 20, 20), 10 + rng() * 18, '#607D8B', buildRef.current, viewer, `SAT — ${lm.name} TOD`);
        }
      }
    }
  }

  return null;
}
