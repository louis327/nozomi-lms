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

function startOfWeek(d: Date): Date {
  const day = d.getDay() // 0 = Sun
  const diff = (day + 6) % 7 // make Monday = 0
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  out.setDate(out.getDate() - diff)
  return out
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
  const todayWeek = startOfWeek(today)
  const closeWeek = startOfWeek(closeDate)

  const totalWeeks = Math.max(
    1,
    Math.round((closeWeek.getTime() - todayWeek.getTime()) / (7 * MS_PER_DAY)) + 1,
  )
  const segments = Math.min(totalWeeks, 16)
  const weekStep = totalWeeks / segments

  const weekCells = Array.from({ length: segments }, (_, i) => {
    const wOffset = Math.round(i * weekStep)
    const d = new Date(todayWeek.getTime() + wOffset * 7 * MS_PER_DAY)
    return {
      index: i,
      date: d,
      monthShort: d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
      isMonthStart: d.getDate() <= 7,
      isFirst: i === 0,
      isLast: i === segments - 1,
    }
  })

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

  const chips: { label: string; value: string }[] = []
  if (raiseAmount) chips.push({ label: 'Raising', value: raiseAmount })
  if (targetValuation) chips.push({ label: 'At', value: targetValuation })
  chips.push({ label: '', value: `${Math.max(0, daysToClose)} days left` })

  return (
    <div className="relative rounded-2xl border border-line bg-surface p-7 lg:p-8 overflow-hidden">
      <div
        className="absolute -right-24 -top-24 w-[340px] h-[340px] rounded-full opacity-[0.07] blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--nz-accent) 0%, transparent 70%)' }}
      />

      {/* Header */}
      <div className="relative flex items-start justify-between mb-6 gap-4">
        <p className="text-[10.5px] font-semibold tracking-[0.28em] text-ink-muted uppercase">
          Target close &middot; {closeText ?? formatShortDate(closeDate)}
        </p>
        <div className={`flex items-center gap-2 text-[10px] font-semibold tracking-[0.24em] uppercase ${statusColor}`}>
          <span className="relative flex w-2 h-2">
            <span className="absolute inset-0 rounded-full bg-current animate-ping opacity-60" />
            <span className="relative rounded-full bg-current w-2 h-2" />
          </span>
          {statusLabel}
        </div>
      </div>

      {/* Headline + chips */}
      <div className="relative mb-7">
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
          <span className="text-ink-muted font-normal not-italic text-[0.32em] align-middle ml-3 tracking-[0.14em] uppercase">
            to close
          </span>
        </h2>

        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
          {chips.map((chip, i) => (
            <div key={i} className="flex items-baseline gap-1.5">
              {i > 0 && <span className="w-1 h-1 rounded-full bg-line-strong mr-3 self-center" />}
              {chip.label && (
                <span className="text-[9.5px] font-semibold uppercase tracking-[0.22em] text-ink-muted">
                  {chip.label}
                </span>
              )}
              <span className="text-[13px] font-semibold text-ink tabular-nums">{chip.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Segmented week timeline */}
      <div className="relative">
        <div className="flex gap-[3px] mb-3">
          {weekCells.map((c) => {
            const base =
              'relative flex-1 rounded-sm transition-all'
            let tone: string
            if (c.isFirst) tone = 'bg-accent h-[14px]'
            else if (c.isLast) tone = 'bg-ink h-[14px]'
            else if (c.isMonthStart) tone = 'bg-line-strong h-[14px]'
            else tone = 'bg-line h-[10px]'
            return (
              <div key={c.index} className="flex-1 flex items-center">
                <div className={`${base} ${tone} w-full`} />
                {c.isFirst && (
                  <span className="absolute left-0 -top-1.5 flex w-3 h-3 items-center justify-center">
                    <span className="absolute inset-0 rounded-full bg-accent/40 animate-ping" />
                    <span className="relative w-3 h-3 rounded-full bg-accent ring-2 ring-surface" />
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Month axis */}
        <div className="relative flex gap-[3px] h-4 mb-4">
          {weekCells.map((c) => (
            <div key={c.index} className="flex-1 flex items-start justify-start">
              {c.isMonthStart && !c.isFirst && !c.isLast && (
                <span className="text-[9px] font-mono tabular-nums tracking-wider text-ink-faint uppercase">
                  {c.monthShort}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Endpoint pill labels */}
        <div className="flex items-end justify-between pt-1 border-t border-line-soft">
          <div className="pt-2.5">
            <p className="text-[10.5px] font-mono tabular-nums tracking-wider text-accent uppercase leading-none">
              {formatShortDate(today)}
            </p>
            <p className="text-[9px] font-semibold tracking-[0.22em] text-ink-muted uppercase mt-1">
              Today
            </p>
          </div>
          <div className="pt-2.5 text-right">
            <p className="text-[10.5px] font-mono tabular-nums tracking-wider text-ink uppercase leading-none">
              {formatShortDate(closeDate)}
            </p>
            <p className="text-[9px] font-semibold tracking-[0.22em] text-ink-muted uppercase mt-1">
              Close
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
