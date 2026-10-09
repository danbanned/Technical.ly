// Labels float this far above the tower top so they read from the high
// opening view; a leader line ties each one back to its building.
const LABEL_CLEARANCE_M = 350;

/**
 * Returns label entity specs for named Philadelphia buildings.
 * Gap indicators are excluded — their names are too long for labels.
 */
export function buildLabelSpecs(buildings) {
  return buildings
    .map((b, idx) => {
      if (b.category === 'healthcareGap') return null;
      const towerTopM = Math.max(b.height * 8, 24); // matches innovation/investment extrusion
      return {
        type: 'label',
        id: `phila-label-${idx}`,
        philaType: 'building',
        philaRef: idx,
        group: 'labels',
        lon: b.lon,
        lat: b.lat,
        altitudeM: towerTopM + LABEL_CLEARANCE_M,
        leaderFromM: 0,
        text: b.name,
        colorHex: '#FFFFFF',
        fontSize: 14,
      };
    })
    .filter(Boolean);
}
