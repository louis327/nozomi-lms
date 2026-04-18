import Link from 'next/link'

type Module = {
  id: string
  title: string
  sort_order: number
}

type Section = {
  id: string
  module_id: string
  title: string
  sort_order: number
}

type Props = {
  courseId: string
  modules: Module[]
  sections: Section[]
  progress: Record<string, { completed: boolean }>
  completedCount: number
  totalCount: number
}

export function SectionHeatmap({ courseId, modules, sections, progress, completedCount, totalCount }: Props) {
  const sectionsByModule = new Map<string, Section[]>()
  for (const s of sections) {
    const arr = sectionsByModule.get(s.module_id) ?? []
    arr.push(s)
    sectionsByModule.set(s.module_id, arr)
  }

  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="relative rounded-2xl border border-line bg-surface p-7 lg:p-8 overflow-hidden h-full">
      <div className="flex items-start justify-between mb-7">
        <div>
          <p className="text-[10.5px] font-semibold tracking-[0.28em] text-ink-muted uppercase mb-2">
            Course progress
          </p>
          <div className="flex items-baseline gap-3">
            <span
              className="tabular-nums text-ink"
              style={{
                fontFamily: 'var(--font-sans)',
                fontWeight: 700,
                fontStyle: 'italic',
                fontSize: 'clamp(28px, 3.6cqi, 44px)',
                lineHeight: 0.95,
                letterSpacing: '-0.032em',
              }}
            >
              {pct}
              <span className="text-ink-faint text-[0.55em]">%</span>
            </span>
            <span className="text-[12px] text-ink-muted tabular-nums">
              {completedCount} of {totalCount} sections
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3.5">
        {modules.map((mod, modIdx) => {
          const secs = sectionsByModule.get(mod.id) ?? []
          const done = secs.filter((s) => progress[s.id]?.completed).length
          const total = secs.length
          const modPct = total > 0 ? Math.round((done / total) * 100) : 0

          return (
            <div key={mod.id} className="group">
              <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <div className="flex items-baseline gap-2.5 min-w-0">
                  <span className="text-[9.5px] font-mono tabular-nums text-ink-faint shrink-0">
                    M{String(modIdx + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[12.5px] text-ink-soft truncate">{mod.title}</span>
                </div>
                <span className="text-[10px] font-mono tabular-nums text-ink-muted shrink-0">
                  {done}/{total}
                </span>
              </div>

              <div className="flex gap-[3px]">
                {secs.map((s) => {
                  const completed = progress[s.id]?.completed
                  return (
                    <Link
                      key={s.id}
                      href={`/courses/${courseId}/learn/${s.id}`}
                      title={s.title}
                      className={`h-[14px] flex-1 rounded-[2px] transition-all hover:scale-y-[1.4] ${
                        completed ? 'bg-accent' : 'bg-line hover:bg-line-strong'
                      }`}
                      style={{ minWidth: 8 }}
                    />
                  )
                })}
                {total === 0 && (
                  <div className="h-[14px] flex-1 rounded-[2px] bg-line/40" />
                )}
              </div>

              <div
                className="h-[2px] bg-accent/60 rounded-full mt-1 transition-all"
                style={{ width: `${modPct}%`, opacity: modPct > 0 ? 1 : 0 }}
              />
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-4 mt-6 pt-5 border-t border-line">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-accent" />
          <span className="text-[10px] font-semibold tracking-[0.18em] text-ink-muted uppercase">Complete</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-line" />
          <span className="text-[10px] font-semibold tracking-[0.18em] text-ink-muted uppercase">Remaining</span>
        </div>
      </div>
    </div>
  )
}
