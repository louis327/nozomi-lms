'use client'

type LineChartProps = {
  data: number[]
  labels?: string[]
  height?: number
  width?: number
  highlightIndex?: number
  highlightLabel?: string
  className?: string
}

export function LineChart({
  data,
  labels = [],
  height = 220,
  width = 600,
  highlightIndex,
  highlightLabel,
  className = '',
}: LineChartProps) {
  if (data.length < 2) return null

  const pad = { top: 20, right: 20, bottom: 28, left: 30 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom

  const min = Math.min(...data) * 0.85
  const max = Math.max(...data) * 1.1
  const range = max - min || 1

  const xStep = innerW / (data.length - 1)
  const points = data.map((v, i) => ({
    x: pad.left + i * xStep,
    y: pad.top + innerH - ((v - min) / range) * innerH,
  }))

  // Smooth path using quadratic curves
  let path = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const midX = (prev.x + curr.x) / 2
    path += ` Q ${midX} ${prev.y} ${midX} ${(prev.y + curr.y) / 2} T ${curr.x} ${curr.y}`
  }

  const areaPath = `${path} L ${points[points.length - 1].x} ${pad.top + innerH} L ${points[0].x} ${pad.top + innerH} Z`

  // Y axis grid values
  const gridValues = [0.25, 0.5, 0.75, 1].map((t) => ({
    y: pad.top + innerH - t * innerH,
    label: Math.round(min + range * t),
  }))

  const hi = highlightIndex !== undefined && points[highlightIndex] ? points[highlightIndex] : null

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--nz-accent)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--nz-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridValues.map((g, i) => (
          <g key={i}>
            <line x1={pad.left} x2={width - pad.right} y1={g.y} y2={g.y} stroke="var(--nz-border-soft)" strokeDasharray="2 4" />
            <text x={pad.left - 6} y={g.y + 3} textAnchor="end" className="fill-ink-muted" style={{ fontSize: 9, fontWeight: 500 }}>
              {g.label}
            </text>
          </g>
        ))}

        {/* Area */}
        <path d={areaPath} fill="url(#chartFill)" />
        {/* Line */}
        <path d={path} fill="none" stroke="var(--nz-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* X-axis labels */}
        {labels.map((label, i) => (
          <text
            key={i}
            x={pad.left + i * xStep}
            y={height - 8}
            textAnchor="middle"
            className="fill-ink-muted"
            style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.08em' }}
          >
            {label}
          </text>
        ))}

        {/* Highlight */}
        {hi && (
          <>
            <circle cx={hi.x} cy={hi.y} r="5" fill="var(--nz-accent)" stroke="var(--nz-canvas)" strokeWidth="2" />
            <line x1={hi.x} x2={hi.x} y1={hi.y + 8} y2={height - pad.bottom} stroke="var(--nz-accent)" strokeDasharray="2 3" strokeOpacity="0.4" />
            {highlightLabel && (
              <g transform={`translate(${Math.min(hi.x, width - 130)} ${Math.max(hi.y - 55, 4)})`}>
                <rect width="120" height="44" rx="8" fill="#0d0d0e" />
                <text x="10" y="18" style={{ fontSize: 10, fontWeight: 600 }} className="fill-white">
                  {highlightLabel.split('·')[0]?.trim()}
                </text>
                <text x="10" y="34" className="fill-accent" style={{ fontSize: 11, fontWeight: 600 }}>
                  {highlightLabel.split('·')[1]?.trim()}
                </text>
              </g>
            )}
          </>
        )}
      </svg>
    </div>
  )
}
