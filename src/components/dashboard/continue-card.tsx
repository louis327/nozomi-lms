import Link from 'next/link'
import { ArrowUpRight, BookOpen, Play } from 'lucide-react'

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
  courseTitle,
  nextSectionTitle,
  resumeHref,
  isEmpty = false,
}: Props) {
  if (isEmpty || !nextSectionTitle) {
    return (
      <Link
        href={resumeHref}
        className="group relative rounded-2xl border border-line bg-surface p-6 lg:p-7 overflow-hidden flex items-center gap-5 hover:border-accent/40 transition-colors"
      >
        <div className="w-12 h-12 rounded-xl bg-accent-soft flex items-center justify-center shrink-0 group-hover:bg-accent group-hover:text-ink-inverted transition-colors">
          <BookOpen className="w-5 h-5 text-accent group-hover:text-ink-inverted" strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.24em] text-ink-muted uppercase mb-1">
            Course complete
          </p>
          <p className="text-[15px] font-semibold text-ink truncate">
            Review {courseTitle}
          </p>
        </div>
        <ArrowUpRight className="w-5 h-5 text-ink-faint group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" strokeWidth={1.8} />
      </Link>
    )
  }

  return (
    <Link
      href={resumeHref}
      className="group relative rounded-2xl border border-line bg-surface p-6 lg:p-7 overflow-hidden flex items-center gap-5 hover:border-accent/40 transition-colors"
    >
      <div className="w-12 h-12 rounded-xl bg-ink flex items-center justify-center shrink-0 group-hover:bg-accent transition-colors">
        <Play className="w-4 h-4 text-ink-inverted fill-current ml-0.5" strokeWidth={0} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold tracking-[0.24em] text-ink-muted uppercase mb-1">
          Resume where you left off
        </p>
        <p className="text-[15px] font-semibold text-ink truncate group-hover:text-accent transition-colors">
          {nextSectionTitle}
        </p>
      </div>
      <ArrowUpRight className="w-5 h-5 text-ink-faint group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" strokeWidth={1.8} />
    </Link>
  )
}
