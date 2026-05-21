import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useMapStore } from '../../../store/useMapStore';
import { buildDealArc } from '../../../utils/cesiumHelpers';
import { filterFeaturesForYear } from '../../../utils/timeData';

/**
 * Curved arcs showing investor-to-startup money flow.
 * Off by default — toggleable from the legend.
 */
export default function DealFlowArcs({ viewer }) {
  const dsRef = useRef(null);
  const dataRef = useRef([]);
  const visible = useMapStore((s) => s.arcsLayerVisible);
  const currentYear = useMapStore((s) => s.currentYear);

  useEffect(() => {
    if (!viewer) return;
    const ds = new Cesium.CustomDataSource('arcs');
    ds.show = visible;
    viewer.dataSources.add(ds);
    dsRef.current = ds;

    fetch('/data/baltimore_arcs.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((arcs) => {
        dataRef.current = arcs || [];
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
  }, [currentYear]);

  function renderEntities() {
    const ds = dsRef.current;
    if (!ds) return;
    ds.entities.removeAll();
    for (const arc of filterFeaturesForYear(
      dataRef.current,
      currentYear,
      (item) => `${item.company || 'unknown'}-${item.origin?.join(',')}-${item.destination?.join(',')}`
    )) {
      ds.entities.add(buildDealArc(arc));
    }
  }

  return null;
}
