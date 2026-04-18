type ProgressRingProps = {
  value: number
  size?: number
  stroke?: number
  showLabel?: boolean
  color?: string
  trackColor?: string
  className?: string
}

export function ProgressRing({
  value,
  size = 44,
  stroke = 3,
  showLabel = true,
  color = 'var(--nz-accent)',
  trackColor = 'var(--nz-border)',
  className = '',
}: ProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, value))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dash = (clamped / 100) * circumference

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: 'stroke-dasharray 0.7s ease-out' }}
        />
      </svg>
      {showLabel && (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-ink">
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  )
}
