'use client';

import { useRef, useState, type MouseEvent } from 'react';

// `formatted` is computed server-side and passed in as a plain string rather
// than a formatValue callback prop - functions can't cross the Server-Client
// boundary into this component (same rule as everywhere else in this app,
// see e.g. LeaderboardTable). Falls back to a plain toLocaleString() of
// `value` if omitted.
export type TrendPoint = { label: string; value: number; formatted?: string };
export type TrendSeries = { key: string; label: string; data: TrendPoint[] };

const WIDTH = 640;
const HEIGHT = 200;
const PADDING = 24;

/**
 * A dependency-free SVG line chart - just enough for a season-progression
 * sparkline. Pass one series for a plain chart (e.g. the Team page's points
 * trend), or several for a metric-switcher (e.g. the Player page's
 * Points/K-D/Slayer Rating toggle) - buttons only render when there's more
 * than one.
 *
 * Hover uses a custom-positioned tooltip div, not a native SVG <title> -
 * confirmed via user testing that native title tooltips on SVG shapes don't
 * reliably show up at all in Chromium, so this tracks the mouse directly
 * instead of relying on the browser's own (finicky) tooltip timing.
 */
export function TrendChart({ series, color = 'var(--accent)' }: { series: TrendSeries[]; color?: string }) {
  const [activeKey, setActiveKey] = useState(series[0]?.key);
  const [hover, setHover] = useState<{ x: number; y: number; label: string; value: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const active = series.find((s) => s.key === activeKey) ?? series[0];
  if (!active) return null;
  const data = active.data;

  const switcher = series.length > 1 && (
    <div className="table-filter-row">
      {series.map((s) => (
        <button key={s.key} className={s.key === active.key ? 'active' : ''} onClick={() => setActiveKey(s.key)}>
          {s.label}
        </button>
      ))}
    </div>
  );

  if (data.length < 2) {
    return (
      <div>
        {switcher}
        <p className="note">Not enough events yet to show a {active.label.toLowerCase()} trend.</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const stepX = (WIDTH - PADDING * 2) / (data.length - 1);
  const points = data.map((d, i) => ({
    x: PADDING + i * stepX,
    y: HEIGHT - PADDING - (d.value / maxValue) * (HEIGHT - PADDING * 2),
    ...d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${HEIGHT - PADDING} L ${points[0].x} ${HEIGHT - PADDING} Z`;

  function showTooltip(e: MouseEvent, p: TrendPoint) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      label: p.label,
      value: p.formatted ?? p.value.toLocaleString(),
    });
  }

  return (
    <div>
      {switcher}
      <div ref={containerRef} className="trend-chart-wrap">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="trend-chart" preserveAspectRatio="none">
          <path d={areaPath} fill={color} opacity={0.1} stroke="none" />
          <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={4} fill={color} style={{ pointerEvents: 'none' }} />
              <circle
                cx={p.x}
                cy={p.y}
                r={12}
                fill="transparent"
                style={{ pointerEvents: 'all', cursor: 'pointer' }}
                onMouseEnter={(e) => showTooltip(e, p)}
                onMouseMove={(e) => showTooltip(e, p)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          ))}
        </svg>
        {hover && (
          <div className="trend-tooltip" style={{ left: hover.x, top: hover.y }}>
            <strong>{hover.value}</strong>
            <span>{hover.label}</span>
          </div>
        )}
      </div>
      <div className="trend-summary">
        <span>{data[0].label}</span>
        <span>{data[data.length - 1].label}</span>
      </div>
    </div>
  );
}
