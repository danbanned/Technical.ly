import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useMapStore } from '../../../store/useMapStore';
import { buildStatePolygon } from '../../../utils/cesiumHelpers';
import { PALETTE } from '../../../utils/colorScales';
import { filterFeaturesForYear } from '../../../utils/timeData';

/**
 * Choropleth-style state polygons encoding economic dynamism.
 * Cool = stagnant, warm = mobile. Extruded slightly for the 3D read.
 */
export default function MobilityHeatmap({ viewer }) {
  const dsRef = useRef(null);
  const dataRef = useRef([]);
  const visible = useMapStore((s) => s.mobilityLayerVisible);
  const mismatchMode = useMapStore((s) => s.mismatchModeEnabled);
  const mismatches = useMapStore((s) => s.mismatches);
  const currentYear = useMapStore((s) => s.currentYear);

  useEffect(() => {
    if (!viewer) return;
    const ds = new Cesium.CustomDataSource('mobility');
    viewer.dataSources.add(ds);
    dsRef.current = ds;

    fetch('/data/states_dynamism.geojson')
      .then((r) => (r.ok ? r.json() : { features: [] }))
      .then((geo) => {
        dataRef.current = geo.features || [];
        renderEntities();
      })
      .catch(() => {});

    return () => {
      if (viewer && !viewer.isDestroyed()) viewer.dataSources.remove(ds, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer]);

  useEffect(() => {
    if (dsRef.current) dsRef.current.show = visible;
  }, [visible]);

  useEffect(() => {
    renderEntities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentYear, mismatchMode, mismatches]);

  function renderEntities() {
    const ds = dsRef.current;
    if (!ds) return;
    ds.entities.removeAll();
    for (const feature of filterFeaturesForYear(
      dataRef.current,
      currentYear,
      (item) => item.properties?.state || item.properties?.name
    )) {
      const entity = buildStatePolygon(feature);
      if (!entity) continue;

      if (mismatchMode && mismatches.highInvestmentLowMobility?.includes(entity.name)) {
        entity.polygon.outlineColor = Cesium.Color.fromCssColorString(PALETTE.mismatch);
        entity.polygon.outlineWidth = 3;
      }

      ds.entities.add(entity);
    }
  }

  return null;
}
