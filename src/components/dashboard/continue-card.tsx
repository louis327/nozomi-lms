import Link from 'next/link'
import { ArrowUpRight, BookOpen } from 'lucide-react'
import { ProgressRing } from '@/components/ui/progress-ring'

type Props = {
  courseId: string
  courseTitle: string
  nextSectionTitle: string | null
  nextModuleIndex: number | null
  nextModuleTitle: string | null
  completedSections: number
  totalSections: number
  resumeHref: string
  isEmpty?: boolean
}

export function ContinueCard({
  courseId,
  courseTitle,
  nextSectionTitle,
  nextModuleIndex,
  nextModuleTitle,
  completedSections,
  totalSections,
  resumeHref,
  isEmpty = false,
}: Props) {
  const pct = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0
  const sectionsLeft = Math.max(0, totalSections - completedSections)

  if (isEmpty || !nextSectionTitle) {
    return (
      <div className="relative rounded-2xl border border-line bg-surface p-7 lg:p-8 overflow-hidden h-full flex flex-col">
        <div className="flex items-start justify-between mb-6">
          <p className="text-[10.5px] font-semibold tracking-[0.28em] text-ink-muted uppercase">
            Course complete
          </p>
          <ProgressRing value={100} size={52} stroke={4} showLabel={false} />
        </div>
        <h3
          className="text-ink mb-2"
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 700,
            fontStyle: 'italic',
            fontSize: 'clamp(24px, 2.8cqi, 32px)',
            lineHeight: 1.05,
            letterSpacing: '-0.025em',
          }}
        >
          All sections done<span className="text-accent">.</span>
        </h3>
        <p className="text-[13px] text-ink-soft mb-6 flex-1">{courseTitle}</p>
        <Link
          href={resumeHref}
          className="inline-flex items-center justify-between gap-2 w-full px-5 py-3.5 rounded-xl bg-ink text-ink-inverted text-[13px] font-semibold hover:bg-accent transition-colors group"
        >
          <span className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" strokeWidth={1.8} />
            Review course
          </span>
          <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" strokeWidth={2.2} />
        </Link>
      </div>
    )
  }

  return (
    <div className="relative rounded-2xl border border-line bg-surface p-7 lg:p-8 overflow-hidden h-full flex flex-col">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <p className="text-[10.5px] font-semibold tracking-[0.28em] text-ink-muted uppercase mb-1.5">
            Up next
          </p>
          {nextModuleIndex !== null && nextModuleTitle && (
            <p className="text-[10px] font-mono tabular-nums tracking-wider text-ink-faint uppercase">
              M{String(nextModuleIndex + 1).padStart(2, '0')} &middot; {nextModuleTitle}
            </p>
          )}
        </div>
        <div className="relative shrink-0">
          <ProgressRing value={pct} size={52} stroke={4} showLabel={false} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] font-semibold tabular-nums text-ink">
              {pct}
              <span className="text-ink-faint">%</span>
            </span>
          </div>
        </div>
      </div>

      <h3
        className="text-ink mb-4"
        style={{
          fontFamily: 'var(--font-sans)',
          fontWeight: 700,
          fontStyle: 'italic',
          fontSize: 'clamp(22px, 2.6cqi, 30px)',
          lineHeight: 1.08,
          letterSpacing: '-0.025em',
        }}
      >
        {nextSectionTitle}
      </h3>

      <div className="flex-1 flex items-end">
        <div className="w-full">
          <div className="flex items-baseline justify-between mb-5 pb-5 border-b border-line-soft">
            <div>
              <p className="text-[9.5px] font-semibold tracking-[0.22em] text-ink-muted uppercase">Done</p>
              <p className="text-[15px] font-semibold text-ink tabular-nums mt-0.5">
                {completedSections}
                <span className="text-ink-faint text-[12px] ml-0.5">/{totalSections}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9.5px] font-semibold tracking-[0.22em] text-ink-muted uppercase">Remaining</p>
              <p className="text-[15px] font-semibold text-ink tabular-nums mt-0.5">{sectionsLeft}</p>
            </div>
          </div>

          <Link
            href={resumeHref}
            className="inline-flex items-center justify-between gap-2 w-full px-5 py-3.5 rounded-xl bg-ink text-ink-inverted text-[13px] font-semibold hover:bg-accent transition-colors group"
          >
            <span>Continue learning</span>
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" strokeWidth={2.2} />
          </Link>
        </div>
      </div>
    </div>
  )
}
