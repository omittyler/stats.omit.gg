import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';

/** Parses a CSV with a normal single header row into an array of objects. */
export function readCsvObjects(path) {
  const raw = readFileSync(path, 'utf8');
  return parse(raw, { columns: true, skip_empty_lines: true, trim: true });
}

/** Parses a CSV into raw rows (arrays), no header handling — for the double-header bo7_stats files. */
export function readCsvRows(path) {
  const raw = readFileSync(path, 'utf8');
  return parse(raw, { columns: false, skip_empty_lines: true, trim: true });
}

/** "1,735.15" / "65%" / "" / "-153" -> number | null */
export function toNumber(value) {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).trim().replace(/,/g, '').replace(/%$/, '');
  if (cleaned === '' || cleaned === '#DIV/0!') return null;
  const n = Number(cleaned);
  return Number.isNaN(n) ? null : n;
}

/** "5-6" -> [5, 6]; "1" -> [1, 1] */
export function parsePlacementRange(value) {
  const [min, max] = String(value).trim().split('-').map((s) => Number(s.trim()));
  return [min, max === undefined || Number.isNaN(max) ? min : max];
}
