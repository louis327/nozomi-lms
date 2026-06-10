import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Course } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/ui/progress-bar'
import { ArrowRight, Clock } from 'lucide-react'

export const metadata = { title: 'My Courses, Nozomi' }

const PANEL =
  'rounded-[14px] border border-line bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.04)]'
const EYEBROW =
  'text-[11.5px] font-semibold uppercase tracking-[0.04em] text-ink-muted'

export default async function CoursesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Enrollments first, so we can surface enrolled courses even when they're
  // still in draft (mirrors the dashboard, which never filtered on status).
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('user_id', user.id)

  const enrolledIds = new Set((enrollments ?? []).map((e) => e.course_id))

  const enrolledIdList = [...enrolledIds]
  const orFilter =
    enrolledIdList.length > 0
      ? `status.eq.published,id.in.(${enrolledIdList.join(',')})`
      : 'status.eq.published'

  const { data: courses } = await supabase
    .from('courses')
    .select('*, modules(id, sections(id))')
    .or(orFilter)
    .order('sort_order', { ascending: true })

  const allSectionIds = (courses ?? []).flatMap((c: Course & { modules: { id: string; sections: { id: string }[] }[] }) =>
    c.modules?.flatMap((m) => m.sections?.map((s) => s.id) ?? []) ?? []
  )

  const { data: progress } = await supabase
    .from('section_progress')
    .select('section_id, completed')
    .eq('user_id', user.id)
    .in('section_id', allSectionIds.length > 0 ? allSectionIds : ['00000000-0000-0000-0000-000000000000'])

  const completedSections = new Set((progress ?? []).filter((p) => p.completed).map((p) => p.section_id))

  type CourseWithProgress = Course & {
    modules: { id: string; sections: { id: string }[] }[]
    moduleCount: number
    sectionTotal: number
    sectionDone: number
    pct: number
    isEnrolled: boolean
  }

  const coursesList: CourseWithProgress[] = (courses ?? []).map((c: Course & { modules: { id: string; sections: { id: string }[] }[] }) => {
    const sectionIds = c.modules?.flatMap((m) => m.sections?.map((s) => s.id) ?? []) ?? []
    const sectionDone = sectionIds.filter((id) => completedSections.has(id)).length
    const sectionTotal = sectionIds.length
    const pct = sectionTotal > 0 ? Math.round((sectionDone / sectionTotal) * 100) : 0
    return {
      ...c,
      moduleCount: c.modules?.length ?? 0,
      sectionTotal,
      sectionDone,
      pct,
      isEnrolled: enrolledIds.has(c.id),
    }
  })

  const enrolledCourses = coursesList.filter((c) => c.isEnrolled)
  const inProgressCourses = enrolledCourses.filter((c) => c.sectionTotal === 0 || c.pct < 100)
  const completedCourses = enrolledCourses.filter((c) => c.sectionTotal > 0 && c.pct === 100)
  const otherCourses = coursesList.filter((c) => !c.isEnrolled)

  // Resume banner, most recently touched in-progress section
  const { data: lastProg } = await supabase
    .from('section_progress')
    .select('section_id, completed, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  type ResumeInfo = {
    courseId: string
    courseTitle: string
    moduleTitle: string
    sectionTitle: string
    sectionId: string
    completed: boolean
  }
  let resume: ResumeInfo | null = null
  if (lastProg?.section_id) {
    const { data: secRow } = await supabase
      .from('sections')
      .select('id, title, modules(id, title, courses(id, title))')
      .eq('id', lastProg.section_id)
      .maybeSingle()
    const mod = (secRow as any)?.modules
    const crs = mod?.courses
    if (secRow && mod && crs) {
      // If completed, prefer the next incomplete section in same course
      let targetId: string = secRow.id
      let targetTitle: string = (secRow as any).title
      let targetModuleTitle: string = mod.title
      if (lastProg.completed) {
        const { data: nextIncompleteList } = await supabase
          .from('sections')
          .select('id, title, sort_order, module_id, modules!inner(course_id, sort_order)')
          .eq('modules.course_id', crs.id)
          .order('sort_order', { ascending: true })
        type NextRow = {
          id: string; title: string; sort_order: number; module_id: string;
          modules: { course_id: string; sort_order: number } | { course_id: string; sort_order: number }[]
        }
        const rawList = (nextIncompleteList ?? []) as unknown as NextRow[]
        const normalize = (r: NextRow) => {
          const m = Array.isArray(r.modules) ? r.modules[0] : r.modules
          return { id: r.id, title: r.title, sort_order: r.sort_order, module_id: r.module_id, modSort: m?.sort_order ?? 0 }
        }
        const allOrdered = rawList.map(normalize)
        allOrdered.sort((a, b) => {
          if (a.modSort !== b.modSort) return a.modSort - b.modSort
          return a.sort_order - b.sort_order
        })
        const completedIds = new Set(
          (progress ?? []).filter((p) => p.completed).map((p) => p.section_id)
        )
        const nextIncomplete = allOrdered.find((s) => !completedIds.has(s.id))
        if (nextIncomplete) {
          targetId = nextIncomplete.id
          targetTitle = nextIncomplete.title
          const { data: nextMod } = await supabase
            .from('modules')
            .select('title')
            .eq('id', nextIncomplete.module_id)
            .maybeSingle()
          if (nextMod?.title) targetModuleTitle = nextMod.title
        }
      }
      resume = {
        courseId: crs.id,
        courseTitle: crs.title,
        moduleTitle: targetModuleTitle,
        sectionTitle: targetTitle,
        sectionId: targetId,
        completed: lastProg.completed,
      }
    }
  }

  const summaryParts: string[] = []
  if (inProgressCourses.length > 0) summaryParts.push(`${inProgressCourses.length} in progress`)
  if (completedCourses.length > 0) summaryParts.push(`${completedCourses.length} completed`)
  if (otherCourses.length > 0) summaryParts.push(`${otherCourses.length} to explore`)
  const summary =
    summaryParts.length > 0
      ? summaryParts.join(' · ')
      : `${coursesList.length} ${coursesList.length === 1 ? 'course' : 'courses'} available`

  return (
    <div className="px-6 pb-16 pt-8 lg:px-10" data-tour="courses-grid">
      {/* Header */}
      <div className="mb-7">
        <p className="mb-1.5 text-[13.5px] text-ink-muted">Your library</p>
        <h1 className="mb-1.5 text-[28px] font-bold tracking-[-0.03em] text-ink">My courses</h1>
        <p className="text-[14px] text-ink-soft">{summary}</p>
      </div>

      {/* Resume banner */}
      {resume && (
        <Link
          href={`/courses/${resume.courseId}/learn/${resume.sectionId}`}
          className="group mb-9 flex items-center gap-4 rounded-[14px] border border-line bg-surface px-[18px] py-[15px] shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-[box-shadow,border-color,transform] hover:-translate-y-px hover:border-line-strong hover:shadow-[0_8px_24px_-8px_rgba(16,24,40,0.16)]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-accent-soft text-accent-deep">
            <Clock size={19} strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <p className={`${EYEBROW} mb-1 text-[10.5px]`}>
              {resume.completed ? 'Up next' : 'Pick up where you left off'}
            </p>
            <p className="truncate text-[15.5px] font-semibold text-ink">{resume.sectionTitle}</p>
            <p className="truncate text-[12.5px] text-ink-muted">
              {resume.courseTitle} <span className="text-ink-faint">·</span> {resume.moduleTitle}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] bg-ink px-4 py-2.5 text-[13px] font-semibold text-white transition-[filter] group-hover:brightness-110">
            {resume.completed ? 'Continue' : 'Resume'}
            <ArrowRight size={14} strokeWidth={2.2} />
          </span>
        </Link>
      )}

      {/* Enrolled, full-width rows */}
      {enrolledCourses.length > 0 && (
        <Section title="Enrolled" count={enrolledCourses.length}>
          <div className="flex flex-col gap-3">
            {enrolledCourses.map((c) => (
              <CourseRow key={c.id} c={c} />
            ))}
          </div>
        </Section>
      )}

      {/* Explore, card grid */}
      {otherCourses.length > 0 && (
        <Section title="Explore more" count={otherCourses.length}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherCourses.map((c) => (
              <CourseCard key={c.id} c={c} />
            ))}
          </div>
        </Section>
      )}

      {coursesList.length === 0 && (
        <div className={`${PANEL} px-6 py-16 text-center`}>
          <p className="mb-2 text-[19px] font-bold tracking-[-0.02em] text-ink">No courses yet</p>
          <p className="text-[13px] text-ink-muted">New courses are being prepared. Check back soon.</p>
        </div>
      )}
    </div>
  )
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-3.5 flex items-center justify-between">
        <p className={EYEBROW}>{title}</p>
        <span className="text-[12.5px] tabular-nums text-ink-muted">{count}</span>
      </div>
      {children}
    </section>
  )
}

function Thumb({ title, cover }: { title: string; cover?: string | null }) {
  if (cover) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={cover} alt="" className="h-full w-full object-cover" />
  }
  const initials =
    title.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'N'
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#fafafa] to-[#f1f1f0]">
      <span className="text-[38px] font-bold tracking-[-0.04em] text-ink-faint">{initials}</span>
    </div>
  )
}

type RowCourse = {
  id: string
  title: string
  description: string | null
  cover_image: string | null
  moduleCount: number
  sectionTotal: number
  sectionDone: number
  pct: number
}

// Full-width horizontal row for an enrolled course.
function CourseRow({ c }: { c: RowCourse }) {
  const done = c.pct >= 100
  return (
    <Link
      href={`/courses/${c.id}`}
      className="flex min-h-[116px] items-stretch overflow-hidden rounded-[14px] border border-line bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-[box-shadow,border-color,transform] hover:-translate-y-px hover:border-line-strong hover:shadow-[0_8px_24px_-8px_rgba(16,24,40,0.16)]"
    >
      <div className="relative w-[168px] shrink-0 border-r border-line">
        <Thumb title={c.title} cover={c.cover_image} />
      </div>
      <div className="flex flex-1 items-center gap-7 px-[22px] py-[18px]">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2.5">
            <h3 className="truncate text-[16.5px] font-bold tracking-[-0.02em] text-ink">{c.title}</h3>
            {done ? <Badge variant="success">Complete</Badge> : <Badge variant="accent">Enrolled</Badge>}
          </div>
          {c.description && (
            <p className="line-clamp-2 text-[13px] leading-[1.5] text-ink-soft">{c.description}</p>
          )}
        </div>
        <div className="hidden w-[200px] shrink-0 sm:block">
          <div className="mb-[7px] flex items-center justify-between">
            <span className={`${EYEBROW} text-[10px]`}>{done ? 'Done' : 'Progress'}</span>
            <span className={`text-[12.5px] font-semibold tabular-nums ${done ? 'text-success' : 'text-ink'}`}>
              {c.pct}%
            </span>
          </div>
          <ProgressBar value={c.pct} />
          <p className="mt-2 text-[11.5px] tabular-nums text-ink-muted">
            {c.sectionDone} / {c.sectionTotal} sections · {c.moduleCount} {c.moduleCount === 1 ? 'module' : 'modules'}
          </p>
        </div>
        <ArrowRight size={18} strokeWidth={1.9} className="shrink-0 text-ink-faint" />
      </div>
    </Link>
  )
}

type CardCourse = {
  id: string
  title: string
  description: string | null
  cover_image: string | null
  moduleCount: number
  sectionTotal: number
}

// Compact card for an unenrolled course.
function CourseCard({ c }: { c: CardCourse }) {
  return (
    <Link
      href={`/courses/${c.id}`}
      className="group flex flex-col overflow-hidden rounded-[14px] border border-line bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-[box-shadow,border-color,transform] hover:-translate-y-px hover:border-line-strong hover:shadow-[0_8px_24px_-8px_rgba(16,24,40,0.16)]"
    >
      <div className="relative h-28 border-b border-line">
        <Thumb title={c.title} cover={c.cover_image} />
      </div>
      <div className="flex flex-1 flex-col p-[18px]">
        <h3 className="mb-1.5 text-[16px] font-bold leading-tight tracking-[-0.02em] text-ink">{c.title}</h3>
        {c.description && (
          <p className="mb-4 line-clamp-2 text-[13px] leading-[1.5] text-ink-soft">{c.description}</p>
        )}
        <div className="mt-auto flex items-center justify-between border-t border-line pt-3">
          <span className="text-[11.5px] tabular-nums text-ink-muted">
            {c.moduleCount} {c.moduleCount === 1 ? 'module' : 'modules'} · {c.sectionTotal} sections
          </span>
          <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-accent">
            View <ArrowRight size={13} strokeWidth={2.2} />
          </span>
        </div>
      </div>
    </Link>
  )
}
