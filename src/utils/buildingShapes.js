/**
 * Building Shape Library
 *
 * Every shape is a function that returns an array of Layer objects.
 * Each layer: { footprint, height, extrudedHeight, color, outlineColor, outlineWidth, type }
 *
 * footprint: Array of [lon, lat] pairs
 * height/extrudedHeight: in meters above ground
 *
 * Used by FakeCityGenerator to build landmark silhouettes and satellite buildings
 * via stacked Cesium extruded polygons.
 */

// ── Helpers ────────────────────────────────────────────────────────────────

function insetFootprint(footprint, factor) {
  const cx = footprint.reduce((s, c) => s + c[0], 0) / footprint.length;
  const cy = footprint.reduce((s, c) => s + c[1], 0) / footprint.length;
  return footprint.map(([lon, lat]) => [
    cx + (lon - cx) * factor,
    cy + (lat - cy) * factor,
  ]);
}

function offsetFootprint(footprint, dLon, dLat) {
  return footprint.map(([lon, lat]) => [lon + dLon, lat + dLat]);
}

function adjustBrightness(hex, factor) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `#${[r, g, b].map((c) => Math.min(255, Math.round(c * factor)).toString(16).padStart(2, '0')).join('')}`;
}

// ── Landmark Shapes ────────────────────────────────────────────────────────

// 1. Blade / Bullet Skyscraper (Shanghai Tower inspired) — comcastTower
export function shapeBladeBullet(footprint, totalHeight, primaryColor) {
  const layers = [];
  const segments = 8;
  for (let i = 0; i < segments; i++) {
    const taper = 1 - (i / segments) * 0.4;
    layers.push({
      footprint: i === 0 ? footprint : insetFootprint(footprint, taper),
      height: (totalHeight / segments) * i,
      extrudedHeight: (totalHeight / segments) * (i + 1),
      color: primaryColor,
      outlineColor: '#FFFFFF',
      outlineWidth: i === segments - 1 ? 2 : 1,
      type: 'wall',
    });
  }
  layers.push({
    footprint: insetFootprint(footprint, 0.3),
    height: totalHeight,
    extrudedHeight: totalHeight + totalHeight * 0.08,
    color: '#FFFFFF',
    outlineColor: '#FFFFFF',
    outlineWidth: 2,
    type: 'crown',
  });
  return layers;
}

// 2. Spired Skyscraper (Neo-Futurist) — universityTower
export function shapeSpiredFuturist(footprint, totalHeight, primaryColor) {
  const layers = [];
  const bodyH = totalHeight * 0.75;
  const spireH = totalHeight * 0.25;
  for (let i = 0; i < 6; i++) {
    layers.push({
      footprint: insetFootprint(footprint, 1 - (i / 6) * 0.25),
      height: (bodyH / 6) * i,
      extrudedHeight: (bodyH / 6) * (i + 1),
      color: primaryColor,
      outlineColor: '#FFFFFF',
      outlineWidth: 1,
      type: 'wall',
    });
  }
  for (let i = 0; i < 4; i++) {
    const taper = Math.max(0.15 - (i / 4) * 0.08, 0.05);
    layers.push({
      footprint: insetFootprint(footprint, taper),
      height: bodyH + (spireH / 4) * i,
      extrudedHeight: bodyH + (spireH / 4) * (i + 1),
      color: i % 2 === 0 ? primaryColor : '#FFFFFF',
      outlineColor: '#FFFFFF',
      outlineWidth: 2,
      type: 'spire',
    });
  }
  return layers;
}

// 3. Terraced Mid-Rise Structure — hospitalComplex
export function shapeTerracedMidrise(footprint, totalHeight, primaryColor) {
  const layers = [];
  layers.push({
    footprint,
    height: 0,
    extrudedHeight: totalHeight * 0.3,
    color: primaryColor,
    outlineColor: '#FFFFFF',
    outlineWidth: 1,
    type: 'base',
  });
  for (let i = 1; i <= 4; i++) {
    layers.push({
      footprint: insetFootprint(footprint, 1 - i * 0.06),
      height: (totalHeight / 5) * i,
      extrudedHeight: Math.min((totalHeight / 5) * (i + 0.7), totalHeight),
      color: i % 2 === 0 ? primaryColor : adjustBrightness(primaryColor, 0.85),
      outlineColor: '#FFFFFF',
      outlineWidth: 1,
      type: 'terrace',
    });
  }
  return layers;
}

// 4. Tiered Blade Skyscraper (Bank of China style) — financialTower
export function shapeTieredBlade(footprint, totalHeight, primaryColor) {
  const layers = [];
  for (let i = 0; i < 5; i++) {
    const scale = 1 - (i / 5) * 0.5;
    const fp = i % 2 === 0
      ? insetFootprint(footprint, scale)
      : offsetFootprint(insetFootprint(footprint, scale), 0.00001 * (i - 2), 0.00001 * (i - 2));
    layers.push({
      footprint: fp,
      height: (totalHeight / 5) * i,
      extrudedHeight: (totalHeight / 5) * (i + 1),
      color: i % 3 === 0 ? primaryColor : adjustBrightness(primaryColor, 0.9 + i * 0.02),
      outlineColor: '#FFFFFF',
      outlineWidth: i === 4 ? 2 : 1,
      type: 'tier',
    });
  }
  layers.push({
    footprint: offsetFootprint(insetFootprint(footprint, 0.12), 0, 0.00008),
    height: totalHeight,
    extrudedHeight: totalHeight * 1.12,
    color: '#FFFFFF',
    outlineColor: '#FFFFFF',
    outlineWidth: 2,
    type: 'spire',
  });
  return layers;
}

// 5. Monolithic Flat Slab — transitHub
export function shapeMonolithicSlab(footprint, totalHeight, primaryColor) {
  return [
    {
      footprint,
      height: 0,
      extrudedHeight: totalHeight * 0.9,
      color: primaryColor,
      outlineColor: '#FFFFFF',
      outlineWidth: 2,
      type: 'wall',
    },
    {
      footprint: insetFootprint(footprint, 0.96),
      height: totalHeight * 0.9,
      extrudedHeight: totalHeight,
      color: '#FFFFFF',
      outlineColor: '#FFFFFF',
      outlineWidth: 1,
      type: 'roof',
    },
  ];
}

// ── Satellite Building Shapes ──────────────────────────────────────────────

// 6. Standard High-Rise (Step-back Top) — housing, workforce towers
export function shapeStepbackHighrise(footprint, totalHeight, primaryColor) {
  const bodyH = totalHeight * 0.85;
  return [
    {
      footprint,
      height: 0,
      extrudedHeight: bodyH,
      color: primaryColor,
      outlineColor: '#000000',
      outlineWidth: 1,
      type: 'wall',
    },
    {
      footprint: insetFootprint(footprint, 0.75),
      height: bodyH,
      extrudedHeight: totalHeight,
      color: adjustBrightness(primaryColor, 0.9),
      outlineColor: '#000000',
      outlineWidth: 1,
      type: 'setback',
    },
  ];
}

// 7. Low-Rise Modular Office Block — training centers
export function shapeModularLowrise(footprint, totalHeight, primaryColor) {
  const layers = [];
  const modules = Math.ceil(totalHeight / 4);
  for (let i = 0; i < modules; i++) {
    const dLon = (i % 3 - 1) * 0.000005;
    const dLat = (Math.floor(i / 3) % 2) * 0.000005;
    layers.push({
      footprint: offsetFootprint(footprint, dLon, dLat),
      height: i * 4,
      extrudedHeight: Math.min((i + 1) * 4, totalHeight),
      color: i % 2 === 0 ? primaryColor : adjustBrightness(primaryColor, 0.88),
      outlineColor: '#000000',
      outlineWidth: 1,
      type: 'module',
    });
  }
  return layers;
}

// 8. Vernacular Gable House — local retail
export function shapeGableHouse(footprint, totalHeight, primaryColor) {
  return [
    {
      footprint,
      height: 0,
      extrudedHeight: totalHeight * 0.7,
      color: primaryColor,
      outlineColor: '#000000',
      outlineWidth: 1,
      type: 'wall',
    },
    {
      footprint: insetFootprint(footprint, 0.9),
      height: totalHeight * 0.7,
      extrudedHeight: totalHeight,
      color: '#5D4037',
      outlineColor: '#000000',
      outlineWidth: 1,
      type: 'roof',
    },
    {
      footprint: insetFootprint(footprint, 0.5),
      height: totalHeight,
      extrudedHeight: totalHeight + 0.8,
      color: '#3E2723',
      outlineColor: null,
      outlineWidth: 0,
      type: 'ridge',
    },
  ];
}

// 9. Segmented Tower (Jin Mao inspired) — spin-offs, minority deal flow
export function shapeSegmentedTower(footprint, totalHeight, primaryColor) {
  const layers = [];
  for (let i = 0; i < 6; i++) {
    const dLon = (i % 2 === 0 ? 1 : -1) * 0.000003 * i;
    const dLat = (i % 3 === 0 ? 1 : -1) * 0.000003 * i;
    layers.push({
      footprint: offsetFootprint(insetFootprint(footprint, 1 - (i / 6) * 0.35), dLon, dLat),
      height: (totalHeight / 6) * i,
      extrudedHeight: (totalHeight / 6) * (i + 1),
      color: primaryColor,
      outlineColor: '#000000',
      outlineWidth: 1,
      type: 'segment',
    });
  }
  return layers;
}

// 10. Pagoda-Inspired Skyscraper — inclusive innovation
export function shapePagodaTower(footprint, totalHeight, primaryColor) {
  const layers = [];
  for (let i = 0; i < 5; i++) {
    const scale = 1 - (i / 5) * 0.5;
    layers.push({
      footprint: insetFootprint(footprint, scale),
      height: (totalHeight / 5) * i,
      extrudedHeight: (totalHeight / 5) * (i + 1) - 0.5,
      color: primaryColor,
      outlineColor: '#FFFFFF',
      outlineWidth: 2,
      type: 'tier',
    });
    layers.push({
      footprint: insetFootprint(footprint, scale - 0.03),
      height: (totalHeight / 5) * (i + 1) - 0.5,
      extrudedHeight: (totalHeight / 5) * (i + 1),
      color: adjustBrightness(primaryColor, 0.7),
      outlineColor: '#FFFFFF',
      outlineWidth: 1,
      type: 'roof_lip',
    });
  }
  layers.push({
    footprint: insetFootprint(footprint, 0.08),
    height: totalHeight,
    extrudedHeight: totalHeight * 1.15,
    color: '#FFFFFF',
    outlineColor: null,
    outlineWidth: 0,
    type: 'needle',
  });
  return layers;
}

// 11. Cylindrical Tower with Inset Crown — B2B supplier firms
export function shapeCylindricalCrown(footprint, totalHeight, primaryColor) {
  return [
    {
      footprint,
      height: 0,
      extrudedHeight: totalHeight * 0.88,
      color: primaryColor,
      outlineColor: '#000000',
      outlineWidth: 1,
      type: 'wall',
    },
    {
      footprint: insetFootprint(footprint, 0.7),
      height: totalHeight * 0.88,
      extrudedHeight: totalHeight,
      color: '#FFFFFF',
      outlineColor: primaryColor,
      outlineWidth: 2,
      type: 'crown',
    },
  ];
}

// 12. Rectangular Slab Skyscraper — low-wage gray buildings
export function shapeSlabSkyscraper(footprint, totalHeight, primaryColor) {
  return [
    {
      footprint,
      height: 0,
      extrudedHeight: totalHeight,
      color: primaryColor,
      outlineColor: '#000000',
      outlineWidth: 1,
      type: 'wall',
    },
  ];
}

// 13. Low-Rise Compound — community capital, CDFIs
export function shapeLowriseCompound(footprint, totalHeight, primaryColor) {
  const layers = [];
  for (let i = 0; i < 3; i++) {
    layers.push({
      footprint: offsetFootprint(insetFootprint(footprint, 0.7), (i - 1) * 0.000015, 0),
      height: 0,
      extrudedHeight: totalHeight * (0.6 + (i / 3) * 0.4),
      color: i === 0 ? primaryColor : adjustBrightness(primaryColor, 0.85 + i * 0.05),
      outlineColor: '#000000',
      outlineWidth: 1,
      type: 'block',
    });
  }
  return layers;
}

// 14. Dome-Crowned Tower — municipal buildings (future use)
export function shapeDomeCrown(footprint, totalHeight, primaryColor) {
  const layers = [
    {
      footprint,
      height: 0,
      extrudedHeight: totalHeight * 0.8,
      color: primaryColor,
      outlineColor: '#FFFFFF',
      outlineWidth: 1,
      type: 'wall',
    },
  ];
  for (let i = 0; i < 5; i++) {
    const t = (i + 1) / 5;
    layers.push({
      footprint: insetFootprint(footprint, Math.max(0.8 - t * 0.7, 0.05)),
      height: totalHeight * 0.8 + (totalHeight * 0.2 / 5) * i,
      extrudedHeight: totalHeight * 0.8 + (totalHeight * 0.2 / 5) * (i + 1),
      color: i % 2 === 0 ? '#FFFFFF' : primaryColor,
      outlineColor: '#FFFFFF',
      outlineWidth: 1,
      type: 'dome',
    });
  }
  return layers;
}

// 15. Tripod Space Tower — telecom/observation
export function shapeTripodSpace(footprint, totalHeight, primaryColor) {
  const layers = [
    {
      footprint: insetFootprint(footprint, 0.2),
      height: 0,
      extrudedHeight: totalHeight,
      color: '#B0BEC5',
      outlineColor: '#FFFFFF',
      outlineWidth: 1,
      type: 'pillar',
    },
  ];
  for (let leg = 0; leg < 3; leg++) {
    const angle = (leg / 3) * Math.PI * 2;
    layers.push({
      footprint: offsetFootprint(insetFootprint(footprint, 0.3), Math.cos(angle) * 0.00004, Math.sin(angle) * 0.00004),
      height: 0,
      extrudedHeight: totalHeight * 0.15,
      color: '#78909C',
      outlineColor: '#FFFFFF',
      outlineWidth: 1,
      type: 'leg',
    });
  }
  [0.3, 0.6, 0.9].forEach((pos) => {
    layers.push({
      footprint: insetFootprint(footprint, 0.5),
      height: totalHeight * pos,
      extrudedHeight: totalHeight * (pos + 0.08),
      color: primaryColor,
      outlineColor: '#FFFFFF',
      outlineWidth: 2,
      type: 'pod',
    });
  });
  return layers;
}

// ── Shape Registry ─────────────────────────────────────────────────────────

export const SHAPE_REGISTRY = {
  blade_bullet:      shapeBladeBullet,
  spired_futurist:   shapeSpiredFuturist,
  terraced_midrise:  shapeTerracedMidrise,
  tiered_blade:      shapeTieredBlade,
  monolithic_slab:   shapeMonolithicSlab,
  stepback_highrise: shapeStepbackHighrise,
  modular_lowrise:   shapeModularLowrise,
  gable_house:       shapeGableHouse,
  segmented_tower:   shapeSegmentedTower,
  pagoda_tower:      shapePagodaTower,
  cylindrical_crown: shapeCylindricalCrown,
  slab_skyscraper:   shapeSlabSkyscraper,
  lowrise_compound:  shapeLowriseCompound,
  dome_crown:        shapeDomeCrown,
  tripod_space:      shapeTripodSpace,
};
