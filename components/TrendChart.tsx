export type TrendPoint = { label: string; value: number };

const WIDTH = 640;
const HEIGHT = 200;
const PADDING = 24;

/**
 * A dependency-free SVG line chart - just enough for a season-progression
 * sparkline (cumulative points by event). Renders server-side (no client JS
 * needed); per-point detail is a native <title> tooltip on hover.
 */
export function TrendChart({ data, color = 'var(--accent)' }: { data: TrendPoint[]; color?: string }) {
  if (data.length < 2) {
    return <p className="note">Not enough events yet to show a trend.</p>;
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

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="trend-chart" preserveAspectRatio="none">
      <path d={areaPath} fill={color} opacity={0.1} stroke="none" />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill={color}>
          <title>{`${p.label}: ${p.value.toLocaleString()}`}</title>
        </circle>
      ))}
    </svg>
  );
}
