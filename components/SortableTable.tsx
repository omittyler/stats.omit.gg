'use client';

import { useState, type ReactNode } from 'react';

export type Column<T> = {
  key: string;
  label: string;
  sortValue?: (row: T) => number | string; // omit for a non-sortable column (e.g. Rank)
  render: (row: T) => ReactNode;
  align?: 'left' | 'right';
};

/**
 * A plain <table> with clickable, sortable column headers. Data is fetched
 * server-side and already arrives in a sensible default order (e.g. by
 * points descending) - this just re-sorts that same array client-side on
 * click, no refetch. Rank columns should be pre-computed into each row
 * before passing in (see e.g. app/standings/page.tsx) rather than derived
 * from position here, so a player's displayed rank stays the same
 * (their real standing) even while the table is sorted by a different column.
 */
export default function SortableTable<T>({
  columns,
  rows,
  initialSortKey,
  initialDirection = 'desc',
}: {
  columns: Column<T>[];
  rows: T[];
  initialSortKey?: string;
  initialDirection?: 'asc' | 'desc';
}) {
  const [sortKey, setSortKey] = useState<string | undefined>(initialSortKey);
  const [direction, setDirection] = useState<'asc' | 'desc'>(initialDirection);

  const sortCol = columns.find((c) => c.key === sortKey);
  const sortedRows = sortCol?.sortValue
    ? [...rows].sort((a, b) => {
        const av = sortCol.sortValue!(a);
        const bv = sortCol.sortValue!(b);
        const cmp =
          typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
        return direction === 'asc' ? cmp : -cmp;
      })
    : rows;

  function handleSort(col: Column<T>) {
    if (!col.sortValue) return;
    if (sortKey === col.key) {
      setDirection(direction === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(col.key);
      setDirection('desc');
    }
  }

  return (
    <table>
      <thead>
        <tr>
          {columns.map((c) => (
            <th
              key={c.key}
              onClick={() => handleSort(c)}
              className={c.sortValue ? 'sortable' : undefined}
              style={{ textAlign: c.align ?? 'left' }}
            >
              {c.label}
              {sortKey === c.key && <span className="sort-arrow">{direction === 'asc' ? ' ▲' : ' ▼'}</span>}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sortedRows.map((row, i) => (
          <tr key={i}>
            {columns.map((c) => (
              <td key={c.key} style={{ textAlign: c.align ?? 'left' }}>
                {c.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
