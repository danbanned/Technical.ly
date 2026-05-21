import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useMapStore } from '../../../store/useMapStore';
import { buildDealPoint } from '../../../utils/cesiumHelpers';
import { filterFeaturesForYear } from '../../../utils/timeData';

/**
 * Pulsing points showing where venture capital landed.
 * Bigger point = bigger deal. Pulse signals active flow.
 */
export default function DealFlowPoints({ viewer }) {
  const dsRef = useRef(null);
  const dataRef = useRef([]);
  const visible = useMapStore((s) => s.dealFlowLayerVisible);
  const currentYear = useMapStore((s) => s.currentYear);

  useEffect(() => {
    if (!viewer) return;
    const ds = new Cesium.CustomDataSource('deals');
    viewer.dataSources.add(ds);
    dsRef.current = ds;

    fetch('/data/baltimore_deals.geojson')
      .then((r) => r.json())
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
    if (!dsRef.current) return;
    dsRef.current.show = visible;
  }, [visible]);

  useEffect(() => {
    renderEntities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentYear]);

  function renderEntities() {
    const ds = dsRef.current;
    if (!ds) return;
    ds.entities.removeAll();
    for (const feature of filterFeaturesForYear(
      dataRef.current,
      currentYear,
      (item) => item.properties?.company || item.properties?.startup_name
    )) {
      const point = buildDealPoint(feature);
      ds.entities.add(point);
    }
  }

  return null;
}
