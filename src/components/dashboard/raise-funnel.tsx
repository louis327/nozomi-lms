type Props = {
  raiseStatus: string | null
  raiseAmount: string | null
}

type Stage = {
  key: string
  label: string
  description: string
  match: (s: string) => boolean
}

const STAGES: Stage[] = [
  {
    key: 'plan',
    label: 'Plan',
    description: 'Strategy & targets',
    match: (s) => s.includes('haven') && s.includes('thinking'),
  },
  {
    key: 'deck',
    label: 'Deck',
    description: 'Narrative & materials',
    match: (s) =>
      (s.includes('building the plan') && s.includes('not ready')) ||
      (s.includes('deck ready') && s.includes('haven')),
  },
  {
    key: 'outreach',
    label: 'Outreach',
    description: 'Warm intros, first meetings',
    match: (s) => s.includes('first few meetings'),
  },
  {
    key: 'pitching',
    label: 'Pitching',
    description: 'Actively in meetings',
    match: (s) => s.includes('actively pitching') || (s.includes('pitched') && s.includes('conversion')),
  },
  {
    key: 'commits',
    label: 'Commits',
    description: 'Soft circles, term sheets',
    match: (s) => s.includes('soft commit') || s.includes('trying to close'),
  },
  {
    key: 'closed',
    label: 'Closed',
    description: 'Round in the bank',
    match: (s) => s.includes('recently closed') || s.includes('next round'),
  },
]

function resolveStageIndex(raiseStatus: string | null): number {
  if (!raiseStatus) return -1
  const s = raiseStatus.toLowerCase()
  for (let i = 0; i < STAGES.length; i++) {
    if (STAGES[i].match(s)) return i
  }
  return -1
}

export function RaiseFunnel({ raiseStatus, raiseAmount }: Props) {
  const currentIndex = resolveStageIndex(raiseStatus)

  return (
    <div className="relative rounded-2xl border border-line bg-surface p-7 lg:p-8 overflow-hidden h-full">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10.5px] font-semibold tracking-[0.28em] text-ink-muted uppercase mb-2">
            Raise pipeline
          </p>
          <p
            className="text-ink"
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 700,
              fontStyle: 'italic',
              fontSize: 'clamp(22px, 2.4vw, 32px)',
              lineHeight: 1.05,
              letterSpacing: '-0.022em',
            }}
          >
            {currentIndex >= 0 ? STAGES[currentIndex].label : 'Not set'}
            <span className="text-accent">.</span>
          </p>
        </div>
        {raiseAmount && (
          <div className="text-right">
            <p className="text-[9.5px] font-mono tabular-nums tracking-[0.18em] text-ink-faint uppercase mb-1">
              Target
            </p>
            <p className="text-[15px] font-semibold text-ink tabular-nums">{raiseAmount}</p>
          </div>
        )}
      </div>

      <div className="relative pl-1">
        {STAGES.map((stage, i) => {
          const isCurrent = i === currentIndex
          const isPassed = currentIndex >= 0 && i < currentIndex
          const isFuture = currentIndex < 0 || i > currentIndex

          return (
            <div key={stage.key} className="relative flex items-start gap-4 pb-5 last:pb-0">
              {i < STAGES.length - 1 && (
                <span
                  aria-hidden
                  className={`absolute left-[11px] top-6 bottom-0 w-[2px] ${
                    isPassed ? 'bg-accent' : 'bg-line'
                  }`}
                />
              )}

              <div className="relative z-10 shrink-0 mt-0.5">
                {isCurrent ? (
                  <span className="relative flex w-6 h-6 items-center justify-center">
                    <span className="absolute inset-0 rounded-full bg-accent/20 animate-ping" />
                    <span className="relative w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-white" />
                    </span>
                  </span>
                ) : isPassed ? (
                  <span className="flex w-6 h-6 items-center justify-center rounded-full bg-accent">
                    <svg viewBox="0 0 16 16" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 8.5l3.5 3.5L13 4.5" />
                    </svg>
                  </span>
                ) : (
                  <span className="flex w-6 h-6 items-center justify-center rounded-full border-2 border-line-strong bg-surface">
                    <span className="text-[9px] font-mono tabular-nums text-ink-faint">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p
                    className={`text-[14px] font-semibold leading-tight ${
                      isCurrent ? 'text-ink' : isPassed ? 'text-ink-soft' : 'text-ink-muted'
                    }`}
                  >
                    {stage.label}
                  </p>
                  {isCurrent && (
                    <span className="text-[9px] font-semibold tracking-[0.22em] uppercase text-accent">
                      You are here
                    </span>
                  )}
                </div>
                <p
                  className={`text-[11.5px] mt-0.5 ${
                    isFuture ? 'text-ink-faint' : 'text-ink-muted'
                  }`}
                >
                  {stage.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
