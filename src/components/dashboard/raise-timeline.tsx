type Props = {
  closeDate: Date | null
  closeText: string | null
  daysToClose: number | null
  raiseAmount: string | null
}

function monthsBetween(a: Date, b: Date): Date[] {
  const out: Date[] = []
  const cursor = new Date(a.getFullYear(), a.getMonth(), 1)
  const endMarker = new Date(b.getFullYear(), b.getMonth(), 1)
  while (cursor <= endMarker) {
    out.push(new Date(cursor))
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return out
}

export function RaiseTimeline({ closeDate, closeText, daysToClose, raiseAmount }: Props) {
  const today = new Date()

  if (!closeDate) {
    return (
      <div className="relative h-[180px] rounded-2xl border border-line bg-surface p-7 flex flex-col justify-between overflow-hidden">
        <div>
          <p className="text-[10.5px] font-semibold tracking-[0.28em] text-ink-muted uppercase mb-3">
            No close date set
          </p>
          <p className="text-[14px] text-ink-soft max-w-md">
            Set a target close in onboarding to see your raise timeline.
          </p>
        </div>
      </div>
    )
  }

  const months = monthsBetween(today, closeDate)
  const totalDays = Math.max(1, Math.ceil((closeDate.getTime() - today.getTime()) / 86400000))
  const urgencyPct = daysToClose === null
    ? 0
    : daysToClose <= 0
      ? 100
      : daysToClose <= 14
        ? 92
        : daysToClose <= 30
          ? 80
          : daysToClose <= 60
            ? 65
            : daysToClose <= 90
              ? 45
              : 25

  const headline = daysToClose === null
    ? '—'
    : daysToClose < 0
      ? 'Past target'
      : daysToClose === 0
        ? 'Today'
        : daysToClose <= 14
          ? `${daysToClose} days`
          : daysToClose <= 90
            ? `${Math.ceil(daysToClose / 7)} weeks`
            : `${Math.round(daysToClose / 30)} months`

  const urgencyLabel = daysToClose === null ? '' : daysToClose <= 14 ? 'CRITICAL' : daysToClose <= 45 ? 'URGENT' : daysToClose <= 120 ? 'ACTIVE' : 'EARLY'
  const urgencyColor = daysToClose === null
    ? 'text-ink-muted'
    : daysToClose <= 14
      ? 'text-error'
      : daysToClose <= 45
        ? 'text-accent'
        : 'text-ink-soft'

  return (
    <div className="relative rounded-2xl border border-line bg-surface p-7 lg:p-8 overflow-hidden">
      <div
        className="absolute -right-20 -top-20 w-[320px] h-[320px] rounded-full opacity-[0.06] blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--nz-accent) 0%, transparent 70%)' }}
      />

      <div className="relative flex items-start justify-between mb-8">
        <div>
          <p className="text-[10.5px] font-semibold tracking-[0.28em] text-ink-muted uppercase mb-2">
            Target close &middot; {closeText ?? '—'}
          </p>
          <div className="flex items-baseline gap-4">
            <span
              className="tabular-nums text-ink"
              style={{
                fontFamily: 'var(--font-sans)',
                fontWeight: 700,
                fontStyle: 'italic',
                fontSize: 'clamp(42px, 5.2vw, 68px)',
                lineHeight: 0.95,
                letterSpacing: '-0.035em',
              }}
            >
              {headline}
            </span>
            {raiseAmount && (
              <span className="text-[14px] text-ink-muted">
                to close <span className="text-ink font-semibold">{raiseAmount}</span>
              </span>
            )}
          </div>
        </div>

        {urgencyLabel && (
          <div className={`flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.24em] uppercase ${urgencyColor}`}>
            <span className="relative flex w-2 h-2">
              <span className={`absolute inset-0 rounded-full bg-current animate-ping opacity-60`} />
              <span className="relative rounded-full bg-current w-2 h-2" />
            </span>
            {urgencyLabel}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="relative h-[64px]">
        <svg
          viewBox="0 0 1000 64"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
          aria-hidden
        >
          {/* Baseline */}
          <line x1="20" y1="42" x2="980" y2="42" stroke="var(--nz-border-strong)" strokeWidth="1" />

          {/* Urgency fill */}
          <line
            x1="20"
            y1="42"
            x2={20 + (960 * urgencyPct) / 100}
            y2="42"
            stroke="var(--nz-accent)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Month ticks */}
          {months.map((m, i) => {
            const daysFromStart = Math.max(0, Math.floor((m.getTime() - today.getTime()) / 86400000))
            const x = 20 + (960 * daysFromStart) / totalDays
            const isFirst = i === 0
            const isLast = i === months.length - 1
            if (isFirst || isLast) return null
            return (
              <g key={i}>
                <line x1={x} y1="38" x2={x} y2="46" stroke="var(--nz-border-strong)" strokeWidth="1" />
              </g>
            )
          })}

          {/* Today marker */}
          <circle cx="20" cy="42" r="6" fill="var(--nz-surface)" stroke="var(--nz-accent)" strokeWidth="2" />
          <circle cx="20" cy="42" r="3" fill="var(--nz-accent)" />

          {/* Close marker */}
          <circle cx="980" cy="42" r="6" fill="var(--nz-ink)" />
        </svg>

        <div className="absolute left-0 -bottom-1">
          <p className="text-[9.5px] font-mono tabular-nums tracking-wider text-ink-muted uppercase">TODAY</p>
        </div>
        <div className="absolute right-0 -bottom-1 text-right">
          <p className="text-[9.5px] font-mono tabular-nums tracking-wider text-ink-muted uppercase">
            CLOSE
          </p>
        </div>

        {/* Month labels — only show a few if many */}
        <div className="absolute inset-x-5 top-0 flex items-start justify-between text-[9px] font-mono tabular-nums uppercase tracking-wider text-ink-faint pointer-events-none">
          {months
            .filter((_, i) => i !== 0 && i !== months.length - 1 && (months.length <= 8 || i % Math.ceil(months.length / 6) === 0))
            .map((m, i) => (
              <span key={i} className="absolute" style={{
                left: `${(Math.max(0, Math.floor((m.getTime() - today.getTime()) / 86400000)) / totalDays) * 100}%`,
                transform: 'translateX(-50%)',
              }}>
                {m.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}
              </span>
            ))}
        </div>
      </div>
    </div>
  )
}
