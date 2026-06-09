import { SHAPE_REGISTRY } from '../../utils/buildingShapes.js';

const HALF_DEG = 0.001;

const INNOVATION_CATS = new Set(['universityResearch', 'healthcareAnchor', 'transitHub', 'healthcareGap']);

function footprint(lon, lat) {
  return [
    [lon - HALF_DEG, lat - HALF_DEG],
    [lon + HALF_DEG, lat - HALF_DEG],
    [lon + HALF_DEG, lat + HALF_DEG],
    [lon - HALF_DEG, lat + HALF_DEG],
  ];
}

/**
 * Returns polygon entity specs for university, healthcare, transit, and gap buildings.
 * Each spec is a plain object — no Cesium dependency.
 */
export function buildInnovationSpecs(buildings) {
  const specs = [];
  for (const [idx, b] of buildings.entries()) {
    if (!INNOVATION_CATS.has(b.category)) continue;
    const fp = footprint(b.lon, b.lat);
    const totalH = Math.max(b.height * 8, 24);
    const shapeFn = SHAPE_REGISTRY[b.shape] ?? SHAPE_REGISTRY.monolithic_slab;
    const layers = shapeFn(fp, totalH, b.color);
    for (const [li, layer] of layers.entries()) {
      specs.push({
        type: 'polygon',
        id: `phila-bldg-${idx}-${li}`,
        philaType: 'building',
        philaRef: idx,
        group: 'innovation',
        positions: layer.footprint,
        height: layer.height,
        extrudedHeight: layer.extrudedHeight,
        colorHex: layer.color,
        alpha: b.category === 'healthcareGap' ? 0.45 : 0.9,
        outline: !!layer.outlineColor,
        outlineHex: layer.outlineColor ?? '#FFFFFF',
        outlineWidth: layer.outlineWidth ?? 1,
      });
    }
  }
  return specs;
}
