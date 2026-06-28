import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import { useMapStore } from './store/useMapStore';
import { isPhilaEntity, resolvePick } from './map/interactions';

const HAS_ION_TOKEN    = !!import.meta.env.VITE_CESIUM_ION_TOKEN;
const GOOGLE_API_KEY   = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const HAS_GOOGLE_KEY   = !!GOOGLE_API_KEY;

// ── Enriched buildings style builders ────────────────────────────────────────
//
// Property names as exported by enrich_buildings.py:
//   height_m         — parsed numeric height (metres); "height" is the raw OSM string
//   mobilityScore    — 0-100 tract-level mobility
//   innovationIndex  — 0-1 tract-level innovation index
//   building         — OSM building tag (e.g. "university", "yes")
//   amenity          — OSM amenity tag (e.g. "hospital", "college")
//
// If all buildings appear gray after enabling Economic Color, open the browser
// console and check the "[EnrichedBuildings]" lines to see the actual property
// names reported by the tileset — Cesium ion may have normalised them.

function buildEconomicStyle() {
  return new Cesium.Cesium3DTileStyle({
    color: {
      conditions: [
        // Cast to Number() because Cesium ion may store numeric properties as strings.
        // 1. Mismatch alert — high innovation + low mobility → MAGENTA
        ['Number(${innovationIndex}) > 0.6 && Number(${mobilityScore}) < 35',
         'color("#D500F9", 0.95)'],

        // 2. University buildings — blue, shaded by height_m
        ["${building} === 'university' || ${amenity} === 'university' || ${amenity} === 'college'",
         "Number(${height_m}) > 60 ? color('#0D47A1', 0.9) : Number(${height_m}) > 30 ? color('#1565C0', 0.9) : color('#2979FF', 0.9)"],

        // 3. Healthcare anchors → CYAN
        ["${amenity} === 'hospital' || ${building} === 'hospital' || ${amenity} === 'clinic' || ${amenity} === 'doctors'",
         'color("#00E5FF", 0.9)'],

        // 4-6. Mobility tiers for buildings matched to a tract
        ['Number(${mobilityScore}) >= 70', 'color("#00E676", 0.88)'],
        ['Number(${mobilityScore}) >= 40', 'color("#FFD600", 0.88)'],
        ['Number(${mobilityScore}) > 0',   'color("#FF3D00", 0.88)'],

        // 7-9. Height fallback for unmatched buildings (outside the 16 seed tracts)
        ['Number(${height_m}) > 60', 'color("#00BCD4", 0.70)'],
        ['Number(${height_m}) > 30', 'color("#0097A7", 0.70)'],
        ['Number(${height_m}) > 0',  'color("#00838F", 0.65)'],

        // 10. No data at all
        ['true', 'color("#455A64", 0.55)'],
      ],
    },
  });
}

// Height-only proof-of-concept style — no tract data required.
// Enable via the "Height test" toggle in Layer Controls to confirm the
// style system is wired correctly before diagnosing property names.
function buildHeightOnlyStyle() {
  return new Cesium.Cesium3DTileStyle({
    color: {
      conditions: [
        ['Number(${height_m}) > 80', 'color("#00E5FF", 0.95)'],
        ['Number(${height_m}) > 40', 'color("#40C4FF", 0.90)'],
        ['Number(${height_m}) > 15', 'color("#82B1FF", 0.85)'],
        ['Number(${height_m}) > 0',  'color("#B0BEC5", 0.75)'],
        ['true',                     'color("#546E7A", 0.60)'],
      ],
    },
  });
}

function buildGrayStyle() {
  return new Cesium.Cesium3DTileStyle({
    color: { conditions: [['true', 'color("#607D8B", 0.75)']] },
  });
}

// Single-category filter — matching buildings keep their color, everything else dims.
function buildFilteredEconomicStyle(filterKey) {
  const DIM = 'color("#0a0a0a", 0.10)';
  const RULES = {
    mismatch:      ['Number(${innovationIndex}) > 0.6 && Number(${mobilityScore}) < 35',                         'color("#D500F9", 0.95)'],
    university:    ["${building} === 'university' || ${amenity} === 'university' || ${amenity} === 'college'",    'color("#2979FF", 0.90)'],
    healthcare:    ["${amenity} === 'hospital' || ${building} === 'hospital' || ${amenity} === 'clinic' || ${amenity} === 'doctors'", 'color("#00E5FF", 0.90)'],
    highMobility:  ['Number(${mobilityScore}) >= 70',                                                            'color("#00E676", 0.88)'],
    mediumMobility:['Number(${mobilityScore}) >= 40 && Number(${mobilityScore}) < 70',                          'color("#FFD600", 0.88)'],
    lowMobility:   ['Number(${mobilityScore}) > 0  && Number(${mobilityScore}) < 40',                           'color("#FF3D00", 0.88)'],
    other:         ['Number(${mobilityScore}) <= 0',                                                             'color("#546E7A", 0.70)'],
  };
  const [cond, expr] = RULES[filterKey] ?? ['true', 'color("#546E7A", 0.70)'];
  return new Cesium.Cesium3DTileStyle({
    color: { conditions: [[cond, expr], ['true', DIM]] },
  });
}

function pickEnrichedStyle(economicColor, heightDebug, filterColor) {
  if (heightDebug)                    return buildHeightOnlyStyle();
  if (economicColor && filterColor)   return buildFilteredEconomicStyle(filterColor);
  if (economicColor)                  return buildEconomicStyle();
  return buildGrayStyle();
}

// Fires once when the first tile with features loads.
// Logs the actual property names from the tileset so you can verify them.
function attachPropertyInspector(tileset) {
  // Log schema-level property stats (available immediately after load)
  const schema = tileset.properties;
  if (schema && Object.keys(schema).length) {
    console.log('[EnrichedBuildings] schema properties (name → {min,max}):', schema);
  } else {
    console.warn('[EnrichedBuildings] tileset.properties is empty — tile not yet fully loaded');
  }

  let inspected = false;
  const onTileLoad = (tile) => {
    if (inspected) return;
    try {
      const c = tile.content;
      if (c && typeof c.getFeature === 'function' && c.featuresLength > 0) {
        inspected = true;
        tileset.tileLoad.removeEventListener(onTileLoad);
        const f = c.getFeature(0);
        const ids = f.getPropertyIds ? f.getPropertyIds() : [];
        const sample = Object.fromEntries(ids.map((id) => [id, f.getProperty(id)]));
        console.log('[EnrichedBuildings] ▶ actual property names:', ids);
        console.log('[EnrichedBuildings] ▶ sample feature values:', sample);

        const expected = ['mobilityScore', 'innovationIndex', 'height_m', 'building', 'amenity'];
        const missing  = expected.filter((k) => !ids.includes(k));
        if (missing.length) {
          console.warn(
            '[EnrichedBuildings] ⚠ expected properties NOT found:', missing,
            '\n  → update buildEconomicStyle() conditions to use the names above.',
          );
        } else {
          console.log('[EnrichedBuildings] ✓ all expected properties present');
        }
      }
    } catch (_) { /* parent tiles have no features */ }
  };
  tileset.tileLoad.addEventListener(onTileLoad);
}

/**
 * Standalone Cesium viewer for the Philadelphia pilot.
 * Free CartoDB Voyager basemap — no Ion token required.
 * Camera defaults to University City at 800 m, −30° pitch.
 */
export default function PhilaCesiumMap() {
  const containerRef    = useRef(null);
  const viewerRef       = useRef(null);
  const cartoLayerRef          = useRef(null);
  const osmTilesetRef          = useRef(null);
  const googleTilesetRef       = useRef(null);
  const enrichedTilesetRef     = useRef(null);
  const activeBillboardRef     = useRef(null);
  const [ready, setReady] = useState(false);

  const setViewer               = useMapStore((s) => s.setViewer);
  const philaOSMBuildings       = useMapStore((s) => s.philaOSMBuildings);
  const philaOSMHeightScale     = useMapStore((s) => s.philaOSMHeightScale);
  const philaGoogleTiles        = useMapStore((s) => s.philaGoogleTiles);
  const philaEnrichedBuildings  = useMapStore((s) => s.philaEnrichedBuildings);
  const philaEconomicColor      = useMapStore((s) => s.philaEconomicColor);
  const philaHeightDebug        = useMapStore((s) => s.philaHeightDebug);
  const philaFilterColor        = useMapStore((s) => s.philaFilterColor);
  const activeInsight           = useMapStore((s) => s.activeInsight);

  // ── Viewer initialisation ────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const token = import.meta.env.VITE_CESIUM_ION_TOKEN;
    if (token) Cesium.Ion.defaultAccessToken = token;

    const viewer = new Cesium.Viewer(containerRef.current, {
      animation: false,
      timeline: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      baseLayerPicker: false,
      infoBox: false,
      selectionIndicator: false,
      terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    });

    // CartoDB Voyager — free basemap with labels + roads
    viewer.imageryLayers.removeAll();
    const cartoLayer = viewer.imageryLayers.addImageryProvider(
      new Cesium.UrlTemplateImageryProvider({
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        subdomains: ['a', 'b', 'c', 'd'],
        credit: '© CartoDB • © OpenStreetMap contributors',
        maximumLevel: 19,
      })
    );
    cartoLayerRef.current = cartoLayer;

    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0f172a');
    viewer.scene.globe.showGroundAtmosphere = true;
    viewer.scene.globe.enableLighting = true;
    viewer.scene.skyAtmosphere.show = true;
    viewer.scene.sun.show = true;
    viewer.scene.moon.show = false;
    viewer.scene.fog.enabled = false;

    // Seed clock to real local time — frozen snapshot, no animation loop
    viewer.clock.currentTime = Cesium.JulianDate.fromDate(new Date());
    viewer.clock.shouldAnimate = false;
    viewer.scene.screenSpaceCameraController.minimumZoomDistance = 150;
    viewer.scene.screenSpaceCameraController.maximumZoomDistance = 40000;

    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(-75.190, 39.953, 800),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-30), roll: 0 },
    });

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click) => {
      const picked = viewer.scene.pick(click.position);
      const entity = picked?.id;
      const store = useMapStore.getState();
      if (entity instanceof Cesium.Entity && isPhilaEntity(entity)) {
        const pick = resolvePick(entity);
        if (pick?.type === 'tract') store.selectPhilaTract(pick.ref);
        else if (pick?.type === 'building') store.selectPhilaBuilding(pick.ref);
      } else {
        store.selectPhilaTract(null);
        store.selectPhilaBuilding(null);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction((move) => {
      const picked = viewer.scene.pick(move.endPosition);
      viewer.scene.canvas.style.cursor =
        picked?.id instanceof Cesium.Entity ? 'pointer' : 'default';
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      const store = useMapStore.getState();
      store.clearActiveInsight();
      store.selectPhilaBuilding(null);
      store.clearPhilaCompare();
    };
    window.addEventListener('keydown', onKey);

    viewerRef.current = viewer;
    setViewer(viewer);
    setReady(true);

    return () => {
      window.removeEventListener('keydown', onKey);
      handler.destroy();
      if (!viewer.isDestroyed()) viewer.destroy();
      viewerRef.current = null;
      cartoLayerRef.current = null;
      setViewer(null);
    };
  }, [setViewer]);

  // ── OSM 3D Buildings ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !HAS_ION_TOKEN) return;
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    if (philaOSMBuildings) {
      Cesium.createOsmBuildingsAsync()
        .then((tileset) => {
          if (!viewerRef.current || viewerRef.current.isDestroyed()) {
            tileset.destroy();
            return;
          }
          tileset.maximumScreenSpaceError = 2;
          viewerRef.current.scene.primitives.add(tileset);
          osmTilesetRef.current = tileset;
        })
        .catch((err) => console.warn('[OSM Buildings]', err.message));
    } else {
      if (osmTilesetRef.current && !viewer.isDestroyed()) {
        viewer.scene.primitives.remove(osmTilesetRef.current);
        osmTilesetRef.current = null;
      }
      if (!viewer.isDestroyed()) {
        viewer.scene.verticalExaggeration = 1.0;
        viewer.scene.verticalExaggerationRelativeHeight = 0.0;
      }
    }
  }, [philaOSMBuildings, ready]);


  // OSM height exaggeration (applies to 3D Tiles, not polygon entities)
  useEffect(() => {
    if (!ready || !HAS_ION_TOKEN || !philaOSMBuildings) return;
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    viewer.scene.verticalExaggeration = philaOSMHeightScale;
    viewer.scene.verticalExaggerationRelativeHeight = 0.0;
  }, [philaOSMHeightScale, philaOSMBuildings, ready]);

  // ── Google Photorealistic 3D Tiles ───────────────────────────────────────
  useEffect(() => {
    if (!ready || !HAS_GOOGLE_KEY) return;
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    if (philaGoogleTiles) {
      Cesium.Cesium3DTileset.fromUrl(
        `https://tile.googleapis.com/v1/3dtiles/root.json?key=${GOOGLE_API_KEY}&session=`
      ).catch(() =>
        // Fallback without session param
        Cesium.Cesium3DTileset.fromUrl(
          `https://tile.googleapis.com/v1/3dtiles/root.json?key=${GOOGLE_API_KEY}`
        )
      ).then((tileset) => {
        if (!viewerRef.current || viewerRef.current.isDestroyed()) {
          tileset.destroy();
          return;
        }
        // Google tiles include their own imagery — hide CartoDB to avoid z-fighting
        if (cartoLayerRef.current) cartoLayerRef.current.show = false;
        tileset.maximumScreenSpaceError = 8;
        viewerRef.current.scene.primitives.add(tileset);
        googleTilesetRef.current = tileset;
      }).catch((err) => console.warn('[Google 3D Tiles]', err.message));
    } else {
      if (googleTilesetRef.current && !viewer.isDestroyed()) {
        viewer.scene.primitives.remove(googleTilesetRef.current);
        googleTilesetRef.current = null;
      }
      // Restore CartoDB basemap
      if (cartoLayerRef.current && !viewer.isDestroyed()) {
        cartoLayerRef.current.show = true;
      }
    }
  }, [philaGoogleTiles, ready]);

  // ── Enriched Philadelphia Buildings (ion asset 4979179) ─────────────────────

  useEffect(() => {
    if (!ready || !HAS_ION_TOKEN) return;
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    if (philaEnrichedBuildings) {
      Cesium.Cesium3DTileset.fromIonAssetId(4980304)
        .then((tileset) => {
          if (!viewerRef.current || viewerRef.current.isDestroyed()) {
            tileset.destroy();
            return;
          }
          tileset.maximumScreenSpaceError = 4;
          tileset.style = pickEnrichedStyle(philaEconomicColor, philaHeightDebug, philaFilterColor);
          attachPropertyInspector(tileset);
          viewerRef.current.scene.primitives.add(tileset);
          enrichedTilesetRef.current = tileset;
        })
        .catch((err) => console.warn('[Enriched Buildings]', err.message));
    } else {
      if (enrichedTilesetRef.current && !viewer.isDestroyed()) {
        viewer.scene.primitives.remove(enrichedTilesetRef.current);
        enrichedTilesetRef.current = null;
      }
    }
  }, [philaEnrichedBuildings, ready]);

  // Live-swap style when economic color / height-debug / filter changes
  useEffect(() => {
    if (!enrichedTilesetRef.current) return;
    enrichedTilesetRef.current.style = pickEnrichedStyle(philaEconomicColor, philaHeightDebug, philaFilterColor);
  }, [philaEconomicColor, philaHeightDebug, philaFilterColor]);

  // ── Active insight billboard ─────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    // Remove previous billboard
    if (activeBillboardRef.current) {
      if (!viewer.isDestroyed()) viewer.entities.remove(activeBillboardRef.current);
      activeBillboardRef.current = null;
    }

    if (!activeInsight?.centroid) return;

    const [lon, lat] = activeInsight.centroid;
    const cbsColor = activeInsight.cbs >= 7 ? '#4caf50'
                   : activeInsight.cbs >= 4 ? '#ffa726'
                   : '#ef5350';

    activeBillboardRef.current = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lon, lat, 250),
      label: {
        text: `${activeInsight.neighborhood}\nCBS ${activeInsight.cbs ?? '—'} / 10`,
        font: 'bold 14px system-ui, sans-serif',
        fillColor: Cesium.Color.fromCssColorString(cbsColor),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 4,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        showBackground: true,
        backgroundColor: new Cesium.Color(0.04, 0.06, 0.14, 0.92),
        backgroundPadding: new Cesium.Cartesian2(14, 9),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        pixelOffset: new Cesium.Cartesian2(0, -12),
        scaleByDistance: new Cesium.NearFarScalar(500, 1.1, 8000, 0.7),
      },
    });
  }, [activeInsight, ready]);

  // Dim basemap when economic color mode is on so colored buildings pop
  useEffect(() => {
    if (!ready) return;
    const layer = cartoLayerRef.current;
    if (!layer) return;
    layer.brightness = philaEconomicColor ? 0.30 : 1.0;
    layer.contrast   = philaEconomicColor ? 0.70 : 1.0;
    layer.saturation = philaEconomicColor ? 0.0  : 1.0;
  }, [philaEconomicColor, ready]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0 }}
      aria-label="Philadelphia 3D map — use arrow keys and scroll to navigate"
      role="application"
    />
  );
}
