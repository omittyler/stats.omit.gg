// Maps a Series ID (e.g. "SR001") to the real event it belongs to. Provided
// directly by the user 2026-09-02 - the match-map source data has no event
// name/type/region column at all, just a Series number, so this is the only
// way to know which event a given series happened at. Ranges not listed here
// (e.g. SR412-436, SR614-701) are gaps - series numbers in those ranges are
// skipped entirely during seeding rather than guessed at, same as every
// other "no data was guessed" gap in this project.
//
// Region is never knowable from the range alone: Cup events keep one name
// across all 4 regions ("2026 Cup 1" + a separate NA/EU/AP/LATAM region
// column - PROJECT.md §8f), while Elite events embed the region IN the name
// ("2026 NA Elite Stage 1" vs "2026 EU Elite Stage 1"). Either way, each
// range below lists every {name, region} candidate worth trying; the seed
// script picks whichever candidate's placings.csv roster actually resolves
// that series' players (see resolveEventForSeries in seed-match-maps.js).
// AP/LATAM aren't tried - out of scope for the whole site (PROJECT.md §8f).
const RANGES = [
  { from: 1, to: 14, candidates: cupCandidates('2026 Cup 1') },
  { from: 15, to: 42, candidates: cupCandidates('2026 Cup 2') },
  { from: 43, to: 68, candidates: cupCandidates('2026 Cup 3') },
  { from: 69, to: 156, candidates: eliteCandidates(1) },
  { from: 157, to: 184, candidates: cupCandidates('2026 Cup 5') },
  { from: 185, to: 247, candidates: [{ name: '2026 Major 1 - Dallas Open', region: '' }] },
  { from: 248, to: 275, candidates: cupCandidates('2026 Cup 6') },
  { from: 276, to: 363, candidates: eliteCandidates(2) },
  { from: 364, to: 411, candidates: [{ name: '2026 Major 2 - Birmingham Open', region: '' }] },
  { from: 437, to: 524, candidates: eliteCandidates(3) },
  { from: 525, to: 552, candidates: cupCandidates('2026 Cup 11') },
  { from: 553, to: 613, candidates: [{ name: '2026 Major 3 - Atlanta Open', region: '' }] },
  { from: 702, to: 731, candidates: [{ name: '2026 Major 4 - Paris Open', region: '' }] },
  { from: 732, to: 765, candidates: [{ name: '2026 Champs - Challengers Finals', region: '' }] },
];

function cupCandidates(name) {
  return [
    { name, region: 'NA' },
    { name, region: 'EU' },
  ];
}

function eliteCandidates(stage) {
  return [
    { name: `2026 NA Elite Stage ${stage}`, region: 'NA' },
    { name: `2026 EU Elite Stage ${stage}`, region: 'EU' },
  ];
}

/** "SR001" -> 1 */
export function parseSeriesNumber(seriesLabel) {
  const match = seriesLabel.match(/\d+/);
  return match ? Number(match[0]) : null;
}

/** Returns [] if the series number falls in a gap (not covered by any range). */
export function eventCandidatesForSeries(seriesNumber) {
  const range = RANGES.find((r) => seriesNumber >= r.from && seriesNumber <= r.to);
  return range ? range.candidates : [];
}
