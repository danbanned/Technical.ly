import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import { useMapStore } from './store/useMapStore';
import { isPhilaEntity, resolvePick } from './map/interactions';

const HAS_ION_TOKEN    = !!import.meta.env.VITE_CESIUM_ION_TOKEN;
const GOOGLE_API_KEY   = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const HAS_GOOGLE_KEY   = !!GOOGLE_API_KEY;

/**
 * Standalone Cesium viewer for the Philadelphia pilot.
 * Free CartoDB Voyager basemap — no Ion token required.
 * Camera defaults to University City at 800 m, −30° pitch.
 */
export default function PhilaCesiumMap() {
  const containerRef    = useRef(null);
  const viewerRef       = useRef(null);
  const cartoLayerRef   = useRef(null);   // CartoDB imagery layer handle
  const osmTilesetRef   = useRef(null);
  const googleTilesetRef = useRef(null);
  const [ready, setReady] = useState(false);

  const setViewer          = useMapStore((s) => s.setViewer);
  const philaOSMBuildings  = useMapStore((s) => s.philaOSMBuildings);
  const philaOSMHeightScale = useMapStore((s) => s.philaOSMHeightScale);
  const philaGoogleTiles   = useMapStore((s) => s.philaGoogleTiles);

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
    viewer.scene.globe.showGroundAtmosphere = false;
    viewer.scene.skyAtmosphere.show = false;
    viewer.scene.fog.enabled = false;
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
      store.selectPhilaTract(null);
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

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0 }}
      aria-label="Philadelphia 3D map — use arrow keys and scroll to navigate"
      role="application"
    />
  );
}
