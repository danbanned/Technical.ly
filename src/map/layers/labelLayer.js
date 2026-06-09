/**
 * Returns label entity specs for named Philadelphia buildings.
 * Gap indicators are excluded — their names are too long for labels.
 */
export function buildLabelSpecs(buildings) {
  return buildings
    .map((b, idx) => {
      if (b.category === 'healthcareGap') return null;
      return {
        type: 'label',
        id: `phila-label-${idx}`,
        philaType: 'building',
        philaRef: idx,
        group: 'labels',
        lon: b.lon,
        lat: b.lat,
        altitudeM: Math.max(b.height * 8, 24) + 80,
        text: b.name,
        colorHex: '#FFFFFF',
        fontSize: 14,
      };
    })
    .filter(Boolean);
}
