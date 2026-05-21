import { scaleLinear, scaleThreshold } from 'd3';

export const PALETTE = {
  innovation: '#00D1FF',
  innovationDeep: '#0097A7',
  capital: '#FF8A00',
  capitalDeep: '#C56500',
  mismatch: '#FF005C',
  mobilityCool: '#1A237E',
  mobilityMid: '#455A64',
  mobilityWarm: '#FF8A00',
  baseMap: '#1A1A1B',
  text: '#E4E4E7',
  focus: '#FFD700',
};

/**
 * Research field → hue. Maps a university's primary research domain
 * to its tower color.
 */
export function researchFieldColor(field) {
  switch ((field || '').toLowerCase()) {
    case 'medical/health':
    case 'medical':
    case 'health':
      return '#00D1FF';
    case 'engineering/cs':
    case 'engineering':
    case 'computer science':
      return '#00B8D4';
    case 'life sciences':
    case 'biology':
      return '#0097A7';
    default:
      return '#006064';
  }
}

/**
 * R&D spending ($) → tower height (meters).
 * $1B ≈ 100,000m (per spec). Clamped to a sane minimum so tiny universities
 * are still visible at continental zoom.
 */
export function rdSpendingToHeight(spending) {
  if (!spending) return 5000;
  return Math.max(5000, (spending / 1_000_000_000) * 100_000);
}

/**
 * Deal amount ($) → point pixel size. Min 8, max 25.
 */
export const dealSizeScale = scaleLinear()
  .domain([100_000, 100_000_000])
  .range([8, 25])
  .clamp(true);

/**
 * Dynamism score (0–100) → state polygon color.
 */
export const dynamismColor = scaleThreshold()
  .domain([40, 70])
  .range([PALETTE.mobilityCool, PALETTE.mobilityMid, PALETTE.mobilityWarm]);

/**
 * Dynamism score (0–100) → extruded polygon height (meters).
 */
export function dynamismToHeight(score) {
  if (!score) return 0;
  return (score / 100) * 50_000;
}
