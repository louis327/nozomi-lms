type Props = {
  closeDate: Date | null
  closeText: string | null
  daysToClose: number | null
  raiseAmount: string | null
  targetValuation: string | null
}

const MS_PER_DAY = 86400000

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()
}

export function RaiseTimeline({ closeDate, closeText, daysToClose, raiseAmount, targetValuation }: Props) {
  if (!closeDate || daysToClose === null) {
    return (
      <div className="relative rounded-2xl border border-line bg-surface p-7 lg:p-8 overflow-hidden">
        <p className="text-[10.5px] font-semibold tracking-[0.28em] text-ink-muted uppercase mb-3">
          No close date set
        </p>
        <p className="text-[14px] text-ink-soft max-w-md">
          Set a target close in onboarding to see your raise timeline.
        </p>
      </div>
    )
  }

  const today = new Date()
  const totalDays = Math.max(1, Math.ceil((closeDate.getTime() - today.getTime()) / MS_PER_DAY))
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7))

  const headline =
    daysToClose < 0
      ? 'Past target'
      : daysToClose === 0
        ? 'Today'
        : daysToClose <= 14
          ? `${daysToClose} days`
          : daysToClose <= 90
            ? `${Math.ceil(daysToClose / 7)} weeks`
            : `${Math.round(daysToClose / 30)} months`

  const statusLabel =
    daysToClose <= 14 ? 'CRITICAL' : daysToClose <= 45 ? 'URGENT' : daysToClose <= 120 ? 'ACTIVE' : 'EARLY'
  const statusColor =
    daysToClose <= 14 ? 'text-error' : daysToClose <= 45 ? 'text-accent' : 'text-ink-soft'

  const barCount = Math.min(totalWeeks, 26)
  const barStep = totalWeeks / barCount

  const bars = Array.from({ length: barCount }, (_, i) => {
    const weekOffset = Math.round(i * barStep)
    const date = new Date(today.getTime() + weekOffset * 7 * MS_PER_DAY)
    const isFirst = i === 0
    const isLast = i === barCount - 1
    const isMonthStart = date.getDate() <= 7
    return { weekOffset, date, isFirst, isLast, isMonthStart }
  })

  const chips: { label: string; value: string }[] = []
  if (raiseAmount) chips.push({ label: 'Raising', value: raiseAmount })
  if (targetValuation) chips.push({ label: 'At', value: targetValuation })
  chips.push({ label: '', value: `${totalDays} days left` })

  return (
    <div className="relative rounded-2xl border border-line bg-surface p-7 lg:p-8 overflow-hidden">
      <div
        className="absolute -right-24 -top-24 w-[340px] h-[340px] rounded-full opacity-[0.07] blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--nz-accent) 0%, transparent 70%)' }}
      />

      {/* Header */}
      <div className="relative flex items-start justify-between mb-6 gap-4">
        <div>
          <p className="text-[10.5px] font-semibold tracking-[0.28em] text-ink-muted uppercase">
            Target close &middot; {closeText ?? formatShortDate(closeDate)}
          </p>
        </div>
        <div className={`flex items-center gap-2 text-[10px] font-semibold tracking-[0.24em] uppercase ${statusColor}`}>
          <span className="relative flex w-2 h-2">
            <span className="absolute inset-0 rounded-full bg-current animate-ping opacity-60" />
            <span className="relative rounded-full bg-current w-2 h-2" />
          </span>
          {statusLabel}
        </div>
      </div>

      {/* Headline + chips */}
      <div className="relative mb-8">
        <h2
          className="text-ink mb-3"
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 700,
            fontStyle: 'italic',
            fontSize: 'clamp(40px, 5.2cqi, 64px)',
            lineHeight: 0.98,
            letterSpacing: '-0.035em',
          }}
        >
          {headline}
          <span className="text-ink-muted font-normal not-italic text-[0.35em] align-middle ml-3 tracking-[0.14em] uppercase">
            to close
          </span>
        </h2>

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            {chips.map((chip, i) => (
              <div key={i} className="flex items-baseline gap-1.5">
                {i > 0 && <span className="w-1 h-1 rounded-full bg-line-strong mr-3" />}
                {chip.label && (
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-muted">
                    {chip.label}
                  </span>
                )}
                <span className="text-[13.5px] font-semibold text-ink tabular-nums">{chip.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bar timeline */}
      <div className="relative">
        <div className="flex items-end gap-[3px] h-[52px]">
          {bars.map((b, i) => {
            const isToday = b.isFirst
            const height = b.isFirst || b.isLast ? 48 : b.isMonthStart ? 32 : 22
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end relative">
                <div
                  className={`w-full rounded-sm ${
                    isToday
                      ? 'bg-accent'
                      : b.isLast
                        ? 'bg-ink'
                        : b.isMonthStart
                          ? 'bg-ink-faint'
                          : 'bg-line-strong'
                  }`}
                  style={{ height: `${height}px` }}
                />
              </div>
            )
          })}
        </div>

        {/* Pulsing dot on today bar */}
        <div
          className="absolute top-0 flex items-center justify-center"
          style={{ left: 0, width: `${100 / barCount}%` }}
        >
          <span className="relative flex w-3 h-3 -mt-1">
            <span className="absolute inset-0 rounded-full bg-accent animate-ping opacity-60" />
            <span className="relative rounded-full bg-accent border-2 border-surface w-3 h-3 shadow-[0_0_0_2px_var(--nz-accent)]" />
          </span>
        </div>

        {/* Endpoint labels */}
        <div className="flex items-baseline justify-between mt-3">
          <div>
            <p className="text-[9.5px] font-mono tabular-nums tracking-wider text-accent uppercase">
              {formatShortDate(today)}
            </p>
            <p className="text-[9px] font-semibold tracking-[0.22em] text-ink-muted uppercase mt-0.5">
              Today
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9.5px] font-mono tabular-nums tracking-wider text-ink uppercase">
              {formatShortDate(closeDate)}
            </p>
            <p className="text-[9px] font-semibold tracking-[0.22em] text-ink-muted uppercase mt-0.5">
              Close
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
