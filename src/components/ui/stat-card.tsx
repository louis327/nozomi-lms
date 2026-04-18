import { ReactNode } from 'react'

type StatCardProps = {
  label: string
  value: ReactNode
  unit?: string
  trend?: { direction: 'up' | 'down'; text: string }
  hint?: string
}

export function StatCard({ label, value, unit, trend, hint }: StatCardProps) {
  return (
    <div className="flex flex-col gap-2 px-5 py-4 bg-surface border border-line rounded-2xl">
      <span className="eyebrow">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span className="font-serif text-[28px] leading-none text-ink">{value}</span>
        {unit && <span className="text-[12px] text-ink-muted font-medium">{unit}</span>}
      </div>
      {trend && (
        <span className={trend.direction === 'up' ? 'trend-up' : 'trend-down'}>
          {trend.direction === 'up' ? '↑' : '↓'} {trend.text}
        </span>
      )}
      {!trend && hint && <span className="text-[11px] text-ink-muted">{hint}</span>}
    </div>
  )
}
