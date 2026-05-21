import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useMapStore } from '../../../store/useMapStore';
import { buildUniversityTower } from '../../../utils/cesiumHelpers';
import { filterFeaturesForYear } from '../../../utils/timeData';

/**
 * Universities as 3D towers. Height tells you research spending instantly.
 * Taller = more money. Click for details.
 */
export default function UniversityTowers({ viewer }) {
  const dsRef = useRef(null);
  const dataRef = useRef([]);
  const visible = useMapStore((s) => s.universityLayerVisible);
  const currentYear = useMapStore((s) => s.currentYear);

  useEffect(() => {
    if (!viewer) return;
    const ds = new Cesium.CustomDataSource('universities');
    viewer.dataSources.add(ds);
    dsRef.current = ds;

    fetch('/data/baltimore_universities.geojson')
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
      (item) => item.properties?.name
    )) {
      const tower = buildUniversityTower(feature, currentYear);
      ds.entities.add(tower);
    }
  }

  return null;
}
