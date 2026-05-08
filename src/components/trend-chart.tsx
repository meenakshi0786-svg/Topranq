"use client";

interface DataPoint {
  day: string;
  pageviews: number;
  visitors: number;
}

interface Props {
  data: DataPoint[];
  height?: number;
}

export function TrendChart({ data, height = 180 }: Props) {
  if (data.length === 0) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
        Not enough data yet. Come back tomorrow.
      </div>
    );
  }

  const width = 100; // we'll use viewBox so it scales
  const padding = { top: 10, right: 10, bottom: 24, left: 10 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const maxPv = Math.max(...data.map(d => d.pageviews), 1);
  const maxV = Math.max(...data.map(d => d.visitors), 1);
  const max = Math.max(maxPv, maxV);

  const xStep = data.length > 1 ? innerWidth / (data.length - 1) : 0;
  const x = (i: number) => padding.left + i * xStep;
  const y = (v: number) => padding.top + innerHeight - (v / max) * innerHeight;

  const pvPath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.pageviews)}`).join(" ");
  const vPath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.visitors)}`).join(" ");
  const pvArea = `${pvPath} L ${x(data.length - 1)} ${padding.top + innerHeight} L ${x(0)} ${padding.top + innerHeight} Z`;

  // x-axis labels (show first, middle, last)
  const labelIdxs = [0, Math.floor(data.length / 2), data.length - 1].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 11 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
          <span style={{ width: 10, height: 3, background: "linear-gradient(90deg, #4F6EF7, #7C5CFC)", borderRadius: 2 }} />
          Page views
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
          <span style={{ width: 10, height: 3, background: "#22c55e", borderRadius: 2 }} />
          Unique visitors
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
        <defs>
          <linearGradient id="trend-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4F6EF7" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#4F6EF7" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="trend-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4F6EF7" />
            <stop offset="100%" stopColor="#7C5CFC" />
          </linearGradient>
        </defs>

        {/* Area under page views */}
        <path d={pvArea} fill="url(#trend-area)" />

        {/* Page views line */}
        <path d={pvPath} stroke="url(#trend-line)" strokeWidth="0.6" fill="none" vectorEffect="non-scaling-stroke" />

        {/* Visitors line */}
        <path d={vPath} stroke="#22c55e" strokeWidth="0.6" fill="none" strokeDasharray="0.8 0.6" vectorEffect="non-scaling-stroke" />

        {/* Dots */}
        {data.map((d, i) => (
          <g key={d.day}>
            <circle cx={x(i)} cy={y(d.pageviews)} r="0.5" fill="#4F6EF7" vectorEffect="non-scaling-stroke" />
            <circle cx={x(i)} cy={y(d.visitors)} r="0.5" fill="#22c55e" vectorEffect="non-scaling-stroke" />
          </g>
        ))}

        {/* X-axis labels */}
        {labelIdxs.map(i => (
          <text
            key={i}
            x={x(i)}
            y={height - 6}
            fontSize="3.2"
            fill="var(--text-muted)"
            textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            {data[i].day.slice(5)}
          </text>
        ))}
      </svg>
    </div>
  );
}
