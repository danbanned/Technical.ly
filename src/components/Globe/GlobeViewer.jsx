import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import { useMapStore } from '../../store/useMapStore';
import { pickedEntityToSelection } from '../../utils/cesiumHelpers';
import UniversityTowers from './Layers/UniversityTowers';
import DealFlowPoints from './Layers/DealFlowPoints';
import DealFlowArcs from './Layers/DealFlowArcs';
import MobilityHeatmap from './Layers/MobilityHeatmap';
import DayNightCycle from './Effects/DayNightCycle';
import ParticleDust from './Effects/ParticleDust';

// Continental US bounds — used to clip imagery and constrain min/max
// zoom so the camera can't fly to the bottom of the Pacific or drop
// below ground inside a city.
const US_BOUNDS = { west: -125.0, south: 24.0, east: -66.0, north: 50.0 };

/**
 * The 3D globe — root Cesium viewer.
 * Children layers render entities into the same viewer via the ref.
 *
 * When `mode="background"` the viewer skips its opening fly-to and
 * starts at the continental view so the Immersion Controller can
 * drive all subsequent camera moves.
 */
export default function GlobeViewer({ mode = 'foreground' }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const shiftPressedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const selectEntity = useMapStore((s) => s.selectEntity);
  const setViewer = useMapStore((s) => s.setViewer);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.info('[GlobeViewer] Using CartoDB Voyager basemap; Cesium Ion token is not required.');
    }

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
      terrainProvider: undefined,
    });

    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0a0a0c');
    viewer.scene.skyAtmosphere.show = true;
    viewer.scene.fog.enabled = true;
    viewer.scene.fog.density = 0.0001;

    // Camera safety — prevent diving underground and prevent flying
    // off into orbit. 500 m floor leaves room for tower geometry.
    viewer.scene.screenSpaceCameraController.minimumZoomDistance = 500;
    viewer.scene.screenSpaceCameraController.maximumZoomDistance = 20_000_000;

    // Constrain imagery loading + visual extent to the continental US.
    viewer.scene.globe.cartographicLimitRectangle = Cesium.Rectangle.fromDegrees(
      US_BOUNDS.west,
      US_BOUNDS.south,
      US_BOUNDS.east,
      US_BOUNDS.north
    );

    // Token-free labelled basemap. If CartoDB tiles fail, fall back to
    // OpenStreetMap so the globe remains usable without Cesium Ion.
    viewer.imageryLayers.removeAll();
    const fallbackProvider = () => new Cesium.UrlTemplateImageryProvider({
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      credit: '© OpenStreetMap contributors',
      maximumLevel: 19,
    });
    const cartoProvider = new Cesium.UrlTemplateImageryProvider({
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      subdomains: ['a', 'b', 'c', 'd'],
      credit: '© CartoDB / OpenStreetMap contributors',
    });
    let usedFallback = false;
    cartoProvider.errorEvent.addEventListener(() => {
      if (usedFallback || viewer.isDestroyed()) return;
      usedFallback = true;
      viewer.imageryLayers.removeAll();
      viewer.imageryLayers.addImageryProvider(fallbackProvider());
    });
    viewer.imageryLayers.addImageryProvider(cartoProvider);

    // Dev-only guard: if the camera ever ends up below the geoid, warn.
    if (import.meta.env.DEV) {
      viewer.camera.changed.addEventListener(() => {
        const h = viewer.camera.positionCartographic?.height;
        if (typeof h === 'number' && h < 0) {
          console.warn('[GlobeViewer] Camera underground, height=', h);
        }
      });
    }

    // Start at the continental view. In foreground mode we sweep into
    // Baltimore for the reveal; in background mode the Immersion
    // Controller owns all camera moves so we just stay continental.
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(-98.5, 32.0, 5_500_000),
    });
    if (mode === 'foreground') {
      setTimeout(() => {
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(-76.61, 39.20, 80_000),
          orientation: {
            heading: 0.0,
            pitch: Cesium.Math.toRadians(-45),
            roll: 0.0,
          },
          duration: 3.5,
        });
      }, 800);
    }

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click) => {
      const picked = viewer.scene.pick(click.position);
      const entity = picked?.id;
      if (entity instanceof Cesium.Entity) {
        const isShift = shiftPressedRef.current;
        selectEntity(pickedEntityToSelection(entity), { shift: isShift });
      } else {
        selectEntity(null);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction((move) => {
      const picked = viewer.scene.pick(move.endPosition);
      viewer.scene.canvas.style.cursor =
        picked?.id instanceof Cesium.Entity ? 'pointer' : 'default';
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    viewerRef.current = viewer;
    setViewer(viewer);
    setReady(true);

    const onKey = (e) => {
      shiftPressedRef.current = e.shiftKey;
      if (e.key === 'Escape') {
        useMapStore.getState().resetSelection();
      }
    };
    const onKeyUp = (e) => {
      shiftPressedRef.current = e.shiftKey;
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
      handler.destroy();
      viewer.destroy();
      viewerRef.current = null;
      setViewer(null);
    };
  }, [selectEntity, setViewer, mode]);

  return (
    <div
      className={`globe-canvas${mode === 'background' ? ' globe-canvas--bg' : ''}`}
      ref={containerRef}
      aria-hidden={mode === 'background' ? 'true' : undefined}
    >
      {ready && (
        <>
          <DayNightCycle viewer={viewerRef.current} />
          <UniversityTowers viewer={viewerRef.current} />
          <DealFlowPoints viewer={viewerRef.current} />
          <DealFlowArcs viewer={viewerRef.current} />
          <MobilityHeatmap viewer={viewerRef.current} />
          <ParticleDust viewer={viewerRef.current} />
        </>
      )}
    </div>
  );
}
