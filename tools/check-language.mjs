// Reports retired names that appear in the built app bundle (dist/index.html and
// dist/assets). Run `npm run build` first. REPORT-ONLY: it warns and always exits
// 0 until the team decides what language is allowed.
// Word-aware and case-insensitive; only these names are checked, so bare "gap",
// "story" and "Opportunity Atlas" are not reported.
// Cesium's own prebuilt files in dist/cesium/ are third-party and not scanned.
import fs from 'fs';
import path from 'path';

const DIST = path.resolve('dist');
const PATTERNS = [
  /\bCommunity Benefit Score\b/gi,
  /\bMismatch\b/gi,
  /\bSolutions\b/gi,
];

const files = [
  path.join(DIST, 'index.html'),
  ...fs.readdirSync(path.join(DIST, 'assets'))
    .filter((f) => /\.(js|css|html)$/.test(f))
    .map((f) => path.join(DIST, 'assets', f)),
];

let matches = 0;
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const re of PATTERNS) {
    for (const m of text.matchAll(re)) {
      matches++;
      const at = m.index;
      console.warn(`${path.relative(process.cwd(), file)}: "${m[0]}" … ${text.slice(Math.max(0, at - 40), at + 40).replace(/\s+/g, ' ')}`);
    }
  }
}

if (matches) {
  console.warn(`check:language (report-only): ${matches} match(es) in ${files.length} file(s). Not failing the build.`);
} else {
  console.log(`check:language (report-only): ${files.length} file(s) scanned, no retired names found.`);
}
