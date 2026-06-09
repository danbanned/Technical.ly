import { SHAPE_REGISTRY } from '../../utils/buildingShapes.js';

const HALF_DEG = 0.001;

const INVESTMENT_CATS = new Set(['ventureCapital', 'startupIncubator']);

function footprint(lon, lat) {
  return [
    [lon - HALF_DEG, lat - HALF_DEG],
    [lon + HALF_DEG, lat - HALF_DEG],
    [lon + HALF_DEG, lat + HALF_DEG],
    [lon - HALF_DEG, lat + HALF_DEG],
  ];
}

/**
 * Returns polygon entity specs for VC hubs and startup incubators.
 * Each spec is a plain object — no Cesium dependency.
 */
export function buildInvestmentSpecs(buildings) {
  const specs = [];
  for (const [idx, b] of buildings.entries()) {
    if (!INVESTMENT_CATS.has(b.category)) continue;
    const fp = footprint(b.lon, b.lat);
    const totalH = Math.max(b.height * 8, 24);
    const shapeFn = SHAPE_REGISTRY[b.shape] ?? SHAPE_REGISTRY.monolithic_slab;
    const layers = shapeFn(fp, totalH, b.color);
    for (const [li, layer] of layers.entries()) {
      specs.push({
        type: 'polygon',
        id: `phila-invest-${idx}-${li}`,
        philaType: 'building',
        philaRef: idx,
        group: 'investment',
        positions: layer.footprint,
        height: layer.height,
        extrudedHeight: layer.extrudedHeight,
        colorHex: layer.color,
        alpha: 0.9,
        outline: !!layer.outlineColor,
        outlineHex: layer.outlineColor ?? '#FFFFFF',
        outlineWidth: layer.outlineWidth ?? 1,
      });
    }
  }
  return specs;
}
