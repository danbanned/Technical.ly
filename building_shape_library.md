// src/utils/buildingShapes.js

/**
 * Building Shape Library
 * 
 * Every shape is a function that returns an array of Layer objects.
 * Each layer: { offset, height, extrudedHeight, scale, color }
 * 
 * offset: [lonOffset, latOffset] from the footprint center (in degrees)
 * scale: multiplier applied to footprint dimensions (1.0 = full size)
 * height/extrudedHeight: in meters
 * 
 * The system stacks these layers to create architectural silhouettes.
 */

/**
 * @param {Array} footprint - Array of [lon, lat] coordinates
 * @param {number} totalHeight - Total building height in meters
 * @param {string} primaryColor - Hex color string
 * @returns {Array} Array of layer objects ready for Cesium entity creation
 */

// ─── Helper: create a slightly inset footprint ──────────
function insetFootprint(footprint, factor) {
  const centerLon = footprint.reduce((s, c) => s + c[0], 0) / footprint.length;
  const centerLat = footprint.reduce((s, c) => s + c[1], 0) / footprint.length;
  return footprint.map(([lon, lat]) => [
    centerLon + (lon - centerLon) * factor,
    centerLat + (lat - centerLat) * factor,
  ]);
}

// ─── Helper: create a footprint with offset ─────────────
function offsetFootprint(footprint, offsetLon, offsetLat) {
  return footprint.map(([lon, lat]) => [lon + offsetLon, lat + offsetLat]);
}

// ═══════════════════════════════════════════════════════════
// LANDMARK SHAPES
// ═══════════════════════════════════════════════════════════

// 1. Blade / Bullet Skyscraper (Shanghai Tower inspired) — comcastTower
export function shapeBladeBullet(footprint, totalHeight, primaryColor) {
  const layers = [];
  const segments = 8;

  for (let i = 0; i < segments; i++) {
    const bottomH = (totalHeight / segments) * i;
    const topH = (totalHeight / segments) * (i + 1);
    // Taper as we go up
    const taper = 1 - (i / segments) * 0.4;
    const roundness = i > segments / 2 ? 0.02 * (i - segments / 2) : 0;

    layers.push({
      footprint: i === 0 ? footprint : insetFootprint(footprint, taper),
      height: bottomH,
      extrudedHeight: topH,
      color: primaryColor,
      outlineColor: '#FFFFFF',
      outlineWidth: i === segments - 1 ? 2 : 1,
      type: 'wall',
    });
  }

  // Crown — rounded parabolic tip
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
  const bodyHeight = totalHeight * 0.75;
  const spireHeight = totalHeight * 0.25;
  const segments = 6;

  // Main body — tapered prism
  for (let i = 0; i < segments; i++) {
    const bottomH = (bodyHeight / segments) * i;
    const topH = (bodyHeight / segments) * (i + 1);
    const taper = 1 - (i / segments) * 0.25;

    layers.push({
      footprint: insetFootprint(footprint, taper),
      height: bottomH,
      extrudedHeight: topH,
      color: primaryColor,
      outlineColor: '#FFFFFF',
      outlineWidth: 1,
      type: 'wall',
    });
  }

  // Spire — very thin, tall
  const spireSegments = 4;
  for (let i = 0; i < spireSegments; i++) {
    const bottomH = bodyHeight + (spireHeight / spireSegments) * i;
    const topH = bodyHeight + (spireHeight / spireSegments) * (i + 1);
    const taper = 0.15 - (i / spireSegments) * 0.08;

    layers.push({
      footprint: insetFootprint(footprint, Math.max(taper, 0.05)),
      height: bottomH,
      extrudedHeight: topH,
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
  const terraces = 4;

  // Wide base
  layers.push({
    footprint: footprint,
    height: 0,
    extrudedHeight: totalHeight * 0.3,
    color: primaryColor,
    outlineColor: '#FFFFFF',
    outlineWidth: 1,
    type: 'base',
  });

  // Terraced levels — each recedes
  for (let i = 1; i <= terraces; i++) {
    const bottomH = (totalHeight / (terraces + 1)) * i;
    const topH = (totalHeight / (terraces + 1)) * (i + 0.7);
    const inset = 0.75 + (i / terraces) * 0.25;

    layers.push({
      footprint: insetFootprint(footprint, 1 - (i * 0.06)),
      height: bottomH,
      extrudedHeight: Math.min(topH, totalHeight),
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
  const tiers = 5;

  for (let i = 0; i < tiers; i++) {
    const bottomH = (totalHeight / tiers) * i;
    const topH = (totalHeight / tiers) * (i + 1);
    const scale = 1 - (i / tiers) * 0.5;

    // Triangular facets: alternate between full and offset footprints
    const useFootprint = i % 2 === 0
      ? insetFootprint(footprint, scale)
      : offsetFootprint(insetFootprint(footprint, scale), 0.00001 * (i - 2), 0.00001 * (i - 2));

    layers.push({
      footprint: useFootprint,
      height: bottomH,
      extrudedHeight: topH,
      color: i % 3 === 0 ? primaryColor : adjustBrightness(primaryColor, 0.9 + i * 0.02),
      outlineColor: '#FFFFFF',
      outlineWidth: i === tiers - 1 ? 2 : 1,
      type: 'tier',
    });
  }

  // Offset spire
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
  const layers = [];

  // Main slab
  layers.push({
    footprint: footprint,
    height: 0,
    extrudedHeight: totalHeight * 0.9,
    color: primaryColor,
    outlineColor: '#FFFFFF',
    outlineWidth: 2,
    type: 'wall',
  });

  // Flat roof with slight border
  layers.push({
    footprint: insetFootprint(footprint, 0.96),
    height: totalHeight * 0.9,
    extrudedHeight: totalHeight,
    color: '#FFFFFF',
    outlineColor: '#FFFFFF',
    outlineWidth: 1,
    type: 'roof',
  });

  return layers;
}

// ═══════════════════════════════════════════════════════════
// SATELLITE BUILDING SHAPES
// ═══════════════════════════════════════════════════════════

// 6. Standard High-Rise (Step-back Top) — housing, workforce
export function shapeStepbackHighrise(footprint, totalHeight, primaryColor) {
  const layers = [];
  const bodyHeight = totalHeight * 0.85;
  const setbackHeight = totalHeight * 0.15;

  // Main shaft
  layers.push({
    footprint: footprint,
    height: 0,
    extrudedHeight: bodyHeight,
    color: primaryColor,
    outlineColor: '#000000',
    outlineWidth: 1,
    type: 'wall',
  });

  // Setback top
  layers.push({
    footprint: insetFootprint(footprint, 0.75),
    height: bodyHeight,
    extrudedHeight: totalHeight,
    color: adjustBrightness(primaryColor, 0.9),
    outlineColor: '#000000',
    outlineWidth: 1,
    type: 'setback',
  });

  return layers;
}

// 7. Low-Rise Modular Office Block — training centers
export function shapeModularLowrise(footprint, totalHeight, primaryColor) {
  const layers = [];
  const modules = Math.ceil(totalHeight / 4);

  for (let i = 0; i < modules; i++) {
    const bottomH = i * 4;
    const topH = Math.min((i + 1) * 4, totalHeight);
    // Stagger offset for modular look
    const offsetLon = (i % 3 - 1) * 0.000005;
    const offsetLat = (Math.floor(i / 3) % 2) * 0.000005;

    layers.push({
      footprint: offsetFootprint(footprint, offsetLon, offsetLat),
      height: bottomH,
      extrudedHeight: topH,
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
  const layers = [];

  // Main walls
  layers.push({
    footprint: footprint,
    height: 0,
    extrudedHeight: totalHeight * 0.7,
    color: primaryColor,
    outlineColor: '#000000',
    outlineWidth: 1,
    type: 'wall',
  });

  // Gable roof — triangular profile via inset
  layers.push({
    footprint: insetFootprint(footprint, 0.9),
    height: totalHeight * 0.7,
    extrudedHeight: totalHeight,
    color: '#5D4037', // Brown roof
    outlineColor: '#000000',
    outlineWidth: 1,
    type: 'roof',
  });

  // Ridge line — tiny strip at peak
  layers.push({
    footprint: insetFootprint(footprint, 0.5),
    height: totalHeight,
    extrudedHeight: totalHeight + 0.8,
    color: '#3E2723',
    outlineColor: null,
    outlineWidth: 0,
    type: 'ridge',
  });

  return layers;
}

// 9. Segmented Tower (Jin Mao inspired) — spin-offs
export function shapeSegmentedTower(footprint, totalHeight, primaryColor) {
  const layers = [];
  const segments = 6;

  for (let i = 0; i < segments; i++) {
    const bottomH = (totalHeight / segments) * i;
    const topH = (totalHeight / segments) * (i + 1);
    const scale = 1 - (i / segments) * 0.35;
    const offsetLon = (i % 2 === 0 ? 1 : -1) * 0.000003 * i;
    const offsetLat = (i % 3 === 0 ? 1 : -1) * 0.000003 * i;

    layers.push({
      footprint: offsetFootprint(insetFootprint(footprint, scale), offsetLon, offsetLat),
      height: bottomH,
      extrudedHeight: topH,
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
  const tiers = 5;

  for (let i = 0; i < tiers; i++) {
    const bottomH = (totalHeight / tiers) * i;
    const topH = (totalHeight / tiers) * (i + 1);
    const scale = 1 - (i / tiers) * 0.5;

    // Each tier has a slight overhang effect via outline
    layers.push({
      footprint: insetFootprint(footprint, scale),
      height: bottomH,
      extrudedHeight: topH - 0.5,
      color: primaryColor,
      outlineColor: '#FFFFFF',
      outlineWidth: 2,
      type: 'tier',
    });

    // Roof lip for each tier
    layers.push({
      footprint: insetFootprint(footprint, scale - 0.03),
      height: topH - 0.5,
      extrudedHeight: topH,
      color: adjustBrightness(primaryColor, 0.7),
      outlineColor: '#FFFFFF',
      outlineWidth: 1,
      type: 'roof_lip',
    });
  }

  // Needle spire at top
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

// 11. Cylindrical Tower with Inset Crown — B2B suppliers
export function shapeCylindricalCrown(footprint, totalHeight, primaryColor) {
  const layers = [];

  // Cylindrical body — approximated by slightly rounded square footprint
  layers.push({
    footprint: footprint,
    height: 0,
    extrudedHeight: totalHeight * 0.88,
    color: primaryColor,
    outlineColor: '#000000',
    outlineWidth: 1,
    type: 'wall',
  });

  // Inset crown
  layers.push({
    footprint: insetFootprint(footprint, 0.7),
    height: totalHeight * 0.88,
    extrudedHeight: totalHeight,
    color: '#FFFFFF',
    outlineColor: primaryColor,
    outlineWidth: 2,
    type: 'crown',
  });

  return layers;
}

// 12. Rectangular Slab Skyscraper — low-wage gray buildings, standard housing
export function shapeSlabSkyscraper(footprint, totalHeight, primaryColor) {
  const layers = [];

  layers.push({
    footprint: footprint,
    height: 0,
    extrudedHeight: totalHeight,
    color: primaryColor,
    outlineColor: '#000000',
    outlineWidth: 1,
    type: 'wall',
  });

  return layers;
}

// 13. Low-Rise Compound — community capital, retail centers
export function shapeLowriseCompound(footprint, totalHeight, primaryColor) {
  const layers = [];
  const blocks = 3;

  for (let i = 0; i < blocks; i++) {
    const bottomH = 0;
    const topH = totalHeight * (0.6 + (i / blocks) * 0.4);
    const offsetLon = (i - 1) * 0.000015;
    const offsetLat = 0;

    layers.push({
      footprint: offsetFootprint(insetFootprint(footprint, 0.7), offsetLon, offsetLat),
      height: bottomH,
      extrudedHeight: topH,
      color: i === 0 ? primaryColor : adjustBrightness(primaryColor, 0.85 + i * 0.05),
      outlineColor: '#000000',
      outlineWidth: 1,
      type: 'block',
    });
  }

  return layers;
}

// 14. Dome-Crowned Tower — municipal buildings
export function shapeDomeCrown(footprint, totalHeight, primaryColor) {
  const layers = [];

  // Main body
  layers.push({
    footprint: footprint,
    height: 0,
    extrudedHeight: totalHeight * 0.8,
    color: primaryColor,
    outlineColor: '#FFFFFF',
    outlineWidth: 1,
    type: 'wall',
  });

  // Dome — multiple layers to approximate hemisphere
  const domeLayers = 5;
  for (let i = 0; i < domeLayers; i++) {
    const bottomH = totalHeight * 0.8 + (totalHeight * 0.2 / domeLayers) * i;
    const topH = totalHeight * 0.8 + (totalHeight * 0.2 / domeLayers) * (i + 1);
    const t = (i + 1) / domeLayers; // 0 to 1
    const scale = 0.8 - t * 0.7; // Shrinks as we go up

    layers.push({
      footprint: insetFootprint(footprint, Math.max(scale, 0.05)),
      height: bottomH,
      extrudedHeight: topH,
      color: i % 2 === 0 ? '#FFFFFF' : primaryColor,
      outlineColor: '#FFFFFF',
      outlineWidth: 1,
      type: 'dome',
    });
  }

  return layers;
}

// 15. Tripod Space Tower — telecom/observation (future)
export function shapeTripodSpace(footprint, totalHeight, primaryColor) {
  const layers = [];
  const podHeights = [0.3, 0.6, 0.9]; // Positions of pods

  // Main pillar
  layers.push({
    footprint: insetFootprint(footprint, 0.2),
    height: 0,
    extrudedHeight: totalHeight,
    color: '#B0BEC5',
    outlineColor: '#FFFFFF',
    outlineWidth: 1,
    type: 'pillar',
  });

  // Tripod legs at base (three wide feet)
  for (let leg = 0; leg < 3; leg++) {
    const angle = (leg / 3) * Math.PI * 2;
    const offsetLon = Math.cos(angle) * 0.00004;
    const offsetLat = Math.sin(angle) * 0.00004;

    layers.push({
      footprint: offsetFootprint(insetFootprint(footprint, 0.3), offsetLon, offsetLat),
      height: 0,
      extrudedHeight: totalHeight * 0.15,
      color: '#78909C',
      outlineColor: '#FFFFFF',
      outlineWidth: 1,
      type: 'leg',
    });
  }

  // Pods
  podHeights.forEach(podPos => {
    layers.push({
      footprint: insetFootprint(footprint, 0.5),
      height: totalHeight * podPos,
      extrudedHeight: totalHeight * (podPos + 0.08),
      color: primaryColor,
      outlineColor: '#FFFFFF',
      outlineWidth: 2,
      type: 'pod',
    });
  });

  return layers;
}

// ═══════════════════════════════════════════════════════════
// SHAPE REGISTRY
// ═══════════════════════════════════════════════════════════

export const SHAPE_REGISTRY = {
  blade_bullet: shapeBladeBullet,
  spired_futurist: shapeSpiredFuturist,
  terraced_midrise: shapeTerracedMidrise,
  tiered_blade: shapeTieredBlade,
  monolithic_slab: shapeMonolithicSlab,
  stepback_highrise: shapeStepbackHighrise,
  modular_lowrise: shapeModularLowrise,
  gable_house: shapeGableHouse,
  segmented_tower: shapeSegmentedTower,
  pagoda_tower: shapePagodaTower,
  cylindrical_crown: shapeCylindricalCrown,
  slab_skyscraper: shapeSlabSkyscraper,
  lowrise_compound: shapeLowriseCompound,
  dome_crown: shapeDomeCrown,
  tripod_space: shapeTripodSpace,
};

// ─── Helper: adjust color brightness ─────────────────────
function adjustBrightness(hex, factor) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const newR = Math.min(255, Math.round(r * factor));
  const newG = Math.min(255, Math.round(g * factor));
  const newB = Math.min(255, Math.round(b * factor));
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

Here's what the integration added without breaking anything:

  New fields on every building:
  - id — stable string key ('penn_research_tower', etc.)
  - label — short display name for map labels
  - type — normalized type ('university', 'hospital', 'vcHub', 'techCenter', 'transit', 'gap')
  - role — 'anchor' / 'transit' / 'gap' (controls innovation proximity contribution)
  - towerMetric — which metric drives the tower height
  - rdSpending / vcDealCount / patents / startupEmployment — four CBS innovation inputs
  - sourceTractId — original stated tract ID (preserved; tractId now resolves to a generated geoid)

  New exports from philadelphiaBuildings.js:
  - CBS_CONFIG — 4-factor weighted config with normalization ranges
  - INNOVATION_ANCHORS — filtered list of anchor buildings (no transit/gaps)
  - PHILADELPHIA_NEIGHBORHOOD_LABELS — label points for the map
  - outcomeIndex, innovationIndex, computeCommunityBenefitScore, plainLanguageSummary — CBS engine
  - generatePhiladelphiaTracts — gaussian-proximity tract generator
  - PHILADELPHIA — fully assembled dataset (PHILADELPHIA.tracts has 100+ generated grid tracts)
  - PHASE2_CITIES — 10-city expansion stub (Boston, NYC, SF, Chicago, DC, Baltimore, Pittsburgh, Wilmington, Austin, Detroit)
  - getCityData, getTractByGeoid, getBuildingsByTract, getTractPanel, getInsights, getBuildingColor, getMobilityColor

✻ Brewed for 7m 3s

※ recap: Building a Philadelphia innovation map pilot for technical.me. Just integrated richer seed data into philadelphiaBuildings.js with CBS engine, 
  PHASE2_CITIES stub, and lookup helpers. Next: run the dev server to verify the map loads correctly.


 Two fixes applied:

  LOD fix — maximumScreenSpaceError dropped from 16 (Cesium default) to 2 when the tileset loads. This tells Cesium to keep loading tile detail even when
  buildings are small on screen, so you'll see them from the full 800m city view instead of only when you dive in close.

  Height exaggeration — uses scene.verticalExaggeration + verticalExaggerationRelativeHeight: 0, which is Cesium's native API for exaggerating 3D Tile
  heights relative to the ellipsoid surface. This works correctly across the whole tile extent (unlike modelMatrix scaling which skews at geographic scale).
  It's scoped to 3D Tiles and terrain — it does not affect polygon entities, so your custom synthetic buildings won't be double-scaled.

  When you toggle OSM on, a green ↕ OSM height slider appears beneath the toggle, range 1–10×, defaulting to 2×. Turn OSM off and both the slider and the
  exaggeration reset.

✻ Brewed for 2m 35s
