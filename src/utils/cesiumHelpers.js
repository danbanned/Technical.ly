import * as Cesium from 'cesium';
import {
  researchFieldColor,
  rdSpendingToHeight,
  dealSizeScale,
  dynamismColor,
  dynamismToHeight,
  PALETTE,
} from './colorScales';

/**
 * Build a Cesium cylinder entity for a university.
 * Height = R&D spending. Color = research field.
 */
export function buildUniversityTower(feature, year) {
  const props = feature.properties || {};
  const [lon, lat] = feature.geometry.coordinates;
  const height = rdSpendingToHeight(props.rd_spending);
  const color = Cesium.Color.fromCssColorString(researchFieldColor(props.research_field));

  return {
    id: `univ-${props.name}-${props.year || year}`,
    name: props.name,
    position: Cesium.Cartesian3.fromDegrees(lon, lat, height / 2),
    cylinder: {
      length: height,
      topRadius: 6000,
      bottomRadius: 8000,
      material: color.withAlpha(0.85),
      outline: true,
      outlineColor: color,
    },
    properties: { ...props, kind: 'university' },
  };
}

/**
 * Build a pulsing point entity for a venture deal.
 * Pixel size scales with deal amount.
 */
export function buildDealPoint(feature) {
  const props = feature.properties || {};
  const [lon, lat] = feature.geometry.coordinates;
  const basePixelSize = dealSizeScale(props.deal_amount || 1_000_000);

  return {
    id: `deal-${props.company || props.startup_name}-${props.deal_date || props.year}`,
    name: props.company || props.startup_name,
    position: Cesium.Cartesian3.fromDegrees(lon, lat, 1000),
    point: {
      pixelSize: new Cesium.CallbackProperty(
        () => basePixelSize + 0.3 * basePixelSize * Math.sin(Date.now() * 0.005),
        false
      ),
      color: Cesium.Color.fromCssColorString(PALETTE.capital).withAlpha(0.85),
      outlineColor: Cesium.Color.fromCssColorString(PALETTE.capital),
      outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    properties: { ...props, kind: 'deal' },
  };
}

/**
 * Build an extruded state polygon for the dynamism layer.
 * Color + height encode the dynamism score.
 */
export function buildStatePolygon(feature) {
  const props = feature.properties || {};
  const score = props.dynamism_score || 0;
  const fill = Cesium.Color.fromCssColorString(dynamismColor(score)).withAlpha(0.55);

  const hierarchy = geometryToHierarchy(feature.geometry);
  if (!hierarchy) return null;

  return {
    id: `state-${props.name || props.state}`,
    name: props.name || props.state,
    polygon: {
      hierarchy,
      extrudedHeight: dynamismToHeight(score),
      material: fill,
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString(PALETTE.mobilityMid),
    },
    properties: { ...props, kind: 'state' },
  };
}

function geometryToHierarchy(geom) {
  if (!geom) return null;
  if (geom.type === 'Polygon') {
    const [outer, ...holes] = geom.coordinates;
    return new Cesium.PolygonHierarchy(
      Cesium.Cartesian3.fromDegreesArray(outer.flat()),
      holes.map(
        (h) => new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(h.flat()))
      )
    );
  }
  if (geom.type === 'MultiPolygon') {
    const [outer] = geom.coordinates[0];
    return new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(outer.flat()));
  }
  return null;
}

/**
 * Build a curved arc polyline between two coordinates.
 */
export function buildDealArc(arc) {
  const { origin, destination, value, year } = arc;
  const width = Math.max(1, Math.min(8, Math.log10(value || 1) - 4));
  return {
    id: `arc-${origin.join(',')}-${destination.join(',')}-${year}`,
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray([
        origin[0], origin[1],
        destination[0], destination[1],
      ]),
      width,
      arcType: Cesium.ArcType.RHUMB,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.25,
        color: Cesium.Color.fromCssColorString(PALETTE.capital).withAlpha(0.6),
      }),
    },
    properties: { ...arc, kind: 'arc' },
  };
}

/**
 * Convert a Cesium picked entity back to a plain object usable by the UI store.
 */
export function pickedEntityToSelection(entity) {
  if (!entity) return null;
  const props = entity.properties?.getValue?.(Cesium.JulianDate.now()) || {};
  return {
    id: entity.id,
    name: entity.name || props.name,
    kind: props.kind,
    properties: props,
  };
}
