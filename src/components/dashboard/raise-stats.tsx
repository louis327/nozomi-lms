type Props = {
  raiseAmount: string | null
  targetValuation: string | null
  daysToClose: number | null
}

export function RaiseStats({ raiseAmount, targetValuation, daysToClose }: Props) {
  const rows: { label: string; value: string }[] = []
  if (raiseAmount) rows.push({ label: 'Target raise', value: raiseAmount })
  if (targetValuation) rows.push({ label: 'Valuation', value: targetValuation })
  if (daysToClose !== null) {
    rows.push({ label: 'Days left', value: String(Math.max(0, daysToClose)) })
  }

  if (rows.length === 0) return null

  return (
    <div className="relative rounded-2xl border border-line bg-surface p-6 lg:p-7 overflow-hidden">
      <p className="text-[10.5px] font-semibold tracking-[0.28em] text-ink-muted uppercase mb-5">
        Raise at a glance
      </p>
      <div className="space-y-0">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={`flex items-baseline justify-between py-3.5 ${
              i < rows.length - 1 ? 'border-b border-line-soft' : ''
            }`}
          >
            <span className="text-[10px] font-semibold tracking-[0.22em] text-ink-muted uppercase">
              {row.label}
            </span>
            <span className="text-[16px] font-semibold text-ink tabular-nums">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
