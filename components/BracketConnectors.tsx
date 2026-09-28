'use client';

import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Draws the lines between bracket match boxes, like the official bracket:
 * from each match to the next match its winner played. Positions are
 * measured from the rendered boxes (`[data-series]` inside the parent
 * grid), so the lines follow the layout at any width and are redrawn when
 * the grid resizes. Rendered as an SVG overlay that ignores the pointer, so
 * the boxes underneath stay clickable.
 */
export function BracketConnectors({ edges }: { edges: [string, string][] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [paths, setPaths] = useState<string[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const grid = svgRef.current?.parentElement;
    if (!grid) return;

    function draw() {
      if (!grid) return;
      const origin = grid.getBoundingClientRect();
      const box = (series: string) => {
        const el = grid.querySelector<HTMLElement>(`[data-series="${series}"] .bracket-match`);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          left: r.left - origin.left + grid.scrollLeft,
          right: r.right - origin.left + grid.scrollLeft,
          midY: r.top - origin.top + grid.scrollTop + r.height / 2,
        };
      };
      const gap = parseFloat(getComputedStyle(grid).columnGap) || 16;

      const next: string[] = [];
      for (const [from, to] of edges) {
        const a = box(from);
        const b = box(to);
        if (!a || !b) continue;
        // Out to the middle of the gap after the source box, across to the
        // target's height, then into the target.
        const midX = a.right + gap / 2;
        next.push(`M ${a.right} ${a.midY} H ${midX} V ${b.midY} H ${b.left}`);
      }
      setPaths(next);
      setSize({ width: grid.scrollWidth, height: grid.scrollHeight });
    }

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [edges]);

  return (
    <svg
      ref={svgRef}
      className="bracket-connectors"
      width={size.width}
      height={size.height}
      aria-hidden="true"
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
