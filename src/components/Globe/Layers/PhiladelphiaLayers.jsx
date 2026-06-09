import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useMapStore } from '../../../store/useMapStore';
import { PHILADELPHIA_BUILDINGS } from '../../../data/philadelphiaBuildings';
import { PHILADELPHIA_TRACTS } from '../../../data/philadelphiaTracts';
import { CBS_CONFIG } from '../../../data/config';
import { computeAllCBS, aggregateNearbyInnovation } from '../../../core/cbs';
import { buildInnovationSpecs } from '../../../map/layers/innovationLayer';
import { buildInvestmentSpecs } from '../../../map/layers/investmentLayer';
import { buildMobilityCircleSpecs } from '../../../map/layers/mobilityHeatmapLayer';
import { buildLabelSpecs } from '../../../map/layers/labelLayer';

function specToEntity(viewer, spec) {
  if (spec.type === 'polygon') {
    return viewer.entities.add({
      name: spec.id,
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(
          spec.positions.map(([lon, lat]) => Cesium.Cartesian3.fromDegrees(lon, lat))
        ),
        height: spec.height,
        extrudedHeight: spec.extrudedHeight,
        material: Cesium.Color.fromCssColorString(spec.colorHex).withAlpha(spec.alpha),
        outline: spec.outline,
        outlineColor: Cesium.Color.fromCssColorString(spec.outlineHex ?? '#FFFFFF'),
        outlineWidth: spec.outlineWidth ?? 1,
        perPositionHeight: false,
      },
      properties: new Cesium.PropertyBag({
        philaType: spec.philaType,
        philaRef: spec.philaRef,
        origHeight: spec.height,
        origExtrudedHeight: spec.extrudedHeight,
      }),
    });
  }

  if (spec.type === 'label') {
    return viewer.entities.add({
      name: spec.id,
      position: Cesium.Cartesian3.fromDegrees(spec.lon, spec.lat, spec.altitudeM),
      label: {
        text: spec.text,
        font: `bold ${spec.fontSize ?? 14}px system-ui, sans-serif`,
        fillColor: Cesium.Color.fromCssColorString(spec.colorHex ?? '#FFFFFF'),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        showBackground: true,
        backgroundColor: new Cesium.Color(0, 0, 0, 0.6),
        backgroundPadding: new Cesium.Cartesian2(8, 5),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 20000),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      properties: new Cesium.PropertyBag({
        philaType: spec.philaType,
        philaRef: spec.philaRef,
      }),
    });
  }

  if (spec.type === 'ellipse') {
    const { anim } = spec;
    // Pre-parse color once — withAlpha() is cheap and called every frame
    const baseColor = Cesium.Color.fromCssColorString(spec.colorHex);
    // J2000.0 as a stable time reference for secondsDifference
    const epoch = new Cesium.JulianDate(2451545, 0);

    const radiusCB = new Cesium.CallbackProperty((time) => {
      const t = Cesium.JulianDate.secondsDifference(time, epoch);
      return anim.baseRadius * (1 + anim.pulseRadiusAmp * Math.sin(t * anim.speed + anim.phase));
    }, false);

    const colorCB = new Cesium.CallbackProperty((time) => {
      const t = Cesium.JulianDate.secondsDifference(time, epoch);
      // Offset phase by π/4 so radius and alpha don't peak at the same moment
      const alpha = anim.baseAlpha + anim.pulseAlphaAmp * Math.sin(t * anim.speed + anim.phase + Math.PI / 4);
      return baseColor.withAlpha(Math.max(0.1, Math.min(1, alpha)));
    }, false);

    return viewer.entities.add({
      name: spec.id,
      position: Cesium.Cartesian3.fromDegrees(spec.lon, spec.lat, 0),
      ellipse: {
        semiMajorAxis: radiusCB,
        semiMinorAxis: radiusCB,
        height: 0,
        material: new Cesium.ColorMaterialProperty(colorCB),
        outline: spec.outline,
        outlineColor: Cesium.Color.fromCssColorString(spec.outlineHex ?? '#FFFFFF'),
        outlineWidth: spec.outlineWidth ?? 1,
      },
      properties: new Cesium.PropertyBag({
        philaType: spec.philaType,
        philaRef: spec.philaRef,
      }),
    });
  }

  if (spec.type === 'point') {
    return viewer.entities.add({
      name: spec.id,
      position: Cesium.Cartesian3.fromDegrees(spec.lon, spec.lat, 0),
      point: {
        pixelSize: spec.pixelSize ?? 5,
        color: Cesium.Color.fromCssColorString(spec.colorHex),
        outlineColor: Cesium.Color.WHITE.withAlpha(0.8),
        outlineWidth: 1,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      properties: new Cesium.PropertyBag({
        philaType: spec.philaType,
        philaRef: spec.philaRef,
      }),
    });
  }

  return null;
}

export default function PhiladelphiaLayers({ viewer }) {
  const groupRefs = useRef({ innovation: [], investment: [], mobility: [], labels: [] });
  const setPhilaTractsWithCBS = useMapStore((s) => s.setPhilaTractsWithCBS);
  const setPhilaBuildings = useMapStore((s) => s.setPhilaBuildings);
  const philaLayerVisibility = useMapStore((s) => s.philaLayerVisibility);
  const philaCBSafeMode = useMapStore((s) => s.philaCBSafeMode);
  const philaBuildingHeightScale = useMapStore((s) => s.philaBuildingHeightScale);

  // Compute CBS once on mount and push to store
  useEffect(() => {
    const withCBS = computeAllCBS(PHILADELPHIA_TRACTS, PHILADELPHIA_BUILDINGS, CBS_CONFIG);
    const enriched = withCBS.map((tract, i) => {
      const { rdSpendNearby, vcDealsNearby } = aggregateNearbyInnovation(
        PHILADELPHIA_TRACTS[i],
        PHILADELPHIA_BUILDINGS,
        CBS_CONFIG.RADIUS_KM
      );
      return { ...tract, rdSpendNearby, vcDealsNearby };
    });
    setPhilaTractsWithCBS(enriched);
    setPhilaBuildings(PHILADELPHIA_BUILDINGS);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Create all entities when viewer is ready
  useEffect(() => {
    if (!viewer) return;

    const { philaLayerVisibility: vis } = useMapStore.getState();
    const refs = { innovation: [], investment: [], mobility: [], labels: [] };

    for (const spec of buildInnovationSpecs(PHILADELPHIA_BUILDINGS)) {
      const e = specToEntity(viewer, spec);
      if (e) { e.show = vis.innovation; refs.innovation.push(e); }
    }

    for (const spec of buildInvestmentSpecs(PHILADELPHIA_BUILDINGS)) {
      const e = specToEntity(viewer, spec);
      if (e) { e.show = vis.investment; refs.investment.push(e); }
    }

    for (const spec of buildMobilityCircleSpecs(PHILADELPHIA_TRACTS, useMapStore.getState().philaCBSafeMode)) {
      const e = specToEntity(viewer, spec);
      if (e) { e.show = vis.mobility; refs.mobility.push(e); }
    }

    for (const spec of buildLabelSpecs(PHILADELPHIA_BUILDINGS)) {
      const e = specToEntity(viewer, spec);
      if (e) { e.show = vis.labels; refs.labels.push(e); }
    }

    groupRefs.current = refs;

    return () => {
      if (viewer.isDestroyed()) return;
      for (const group of Object.values(refs)) {
        for (const e of group) viewer.entities.remove(e);
      }
    };
  }, [viewer]);

  // Layer visibility toggles
  useEffect(() => {
    groupRefs.current.innovation.forEach((e) => { e.show = philaLayerVisibility.innovation; });
  }, [philaLayerVisibility.innovation]);

  useEffect(() => {
    groupRefs.current.investment.forEach((e) => { e.show = philaLayerVisibility.investment; });
  }, [philaLayerVisibility.investment]);

  useEffect(() => {
    groupRefs.current.mobility.forEach((e) => { e.show = philaLayerVisibility.mobility; });
  }, [philaLayerVisibility.mobility]);

  useEffect(() => {
    groupRefs.current.labels.forEach((e) => { e.show = philaLayerVisibility.labels; });
  }, [philaLayerVisibility.labels]);

  // Scale building extrusion heights without recreating entities
  useEffect(() => {
    const buildings = [
      ...groupRefs.current.innovation,
      ...groupRefs.current.investment,
    ];
    buildings.forEach((entity) => {
      const props = entity.properties;
      const origH = props.origHeight?.getValue();
      const origEH = props.origExtrudedHeight?.getValue();
      if (origH === undefined || origEH === undefined) return;
      entity.polygon.height = origH * philaBuildingHeightScale;
      entity.polygon.extrudedHeight = origEH * philaBuildingHeightScale;
    });
  }, [philaBuildingHeightScale]);

  // Update tract colors when CB-safe mode toggles.
  // CallbackProperty closures can't be patched in-place, so we remove and recreate
  // the mobility group. The visibility state is preserved from the store.
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;
    for (const e of groupRefs.current.mobility) viewer.entities.remove(e);
    const vis = philaLayerVisibility.mobility;
    const newRefs = [];
    for (const spec of buildMobilityCircleSpecs(PHILADELPHIA_TRACTS, philaCBSafeMode)) {
      const e = specToEntity(viewer, spec);
      if (e) { e.show = vis; newRefs.push(e); }
    }
    groupRefs.current.mobility = newRefs;
  }, [philaCBSafeMode]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
