import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Check, Lock, PlayCircle, Clock, BookOpen, Download, FileText, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/ui/progress-bar'
import { EnrollButton } from '@/components/course/enroll-button'

const PANEL =
  'rounded-[14px] border border-line bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.04)]'
const EYEBROW =
  'text-[11.5px] font-semibold uppercase tracking-[0.04em] text-ink-muted'

export default async function CourseOverviewPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const isAdmin = profile?.role === 'admin'

  const { data: course } = await supabase
    .from('courses')
    .select(`
      id, title, description, cover_image, status,
      modules (
        id, title, description, sort_order,
        sections ( id, title, status, sort_order )
      )
    `)
    .eq('id', courseId)
    .single()

  if (!course) redirect('/courses')

  if (!isAdmin) {
    for (const mod of (course.modules ?? []) as any[]) {
      mod.sections = (mod.sections ?? []).filter((s: any) => s.status === 'published')
    }
  }

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .maybeSingle()

  const isEnrolled = !!enrollment

  const modules = [...(course.modules ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order)
  const allSectionIds: string[] = []
  for (const mod of modules) {
    for (const sec of [...((mod as any).sections ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order)) {
      allSectionIds.push(sec.id)
    }
  }

  let progressMap: Record<string, boolean> = {}
  if (allSectionIds.length > 0 && isEnrolled) {
    const { data: progress } = await supabase
      .from('section_progress')
      .select('section_id, completed')
      .eq('user_id', user.id)
      .in('section_id', allSectionIds)
    for (const p of progress ?? []) {
      progressMap[p.section_id] = p.completed
    }
  }

  const totalSections = allSectionIds.length
  const completedSections = allSectionIds.filter((id) => progressMap[id]).length
  const pct = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0

  let resumeSectionId: string | null = null
  for (const mod of modules) {
    const sections = [...((mod as any).sections ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order)
    for (const sec of sections) {
      if (!progressMap[sec.id]) {
        resumeSectionId = sec.id
        break
      }
    }
    if (resumeSectionId) break
  }
  if (!resumeSectionId && allSectionIds.length > 0) {
    const lastMod = modules[modules.length - 1]
    const lastSections = [...((lastMod as any).sections ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order)
    resumeSectionId = lastSections[lastSections.length - 1]?.id ?? null
  }

  const estMinutes = totalSections * 18

  return (
    <div className="px-6 pb-16 pt-8 lg:px-10">
      {/* Hero */}
      <section className="mb-8 grid grid-cols-1 items-start gap-9 lg:grid-cols-[1.55fr_1fr]">
        <div>
          <p className={`${EYEBROW} mb-3`}>Course</p>
          <h1 className="mb-4 text-[36px] font-bold leading-[1.05] tracking-[-0.035em] text-ink">
            {course.title}
          </h1>
          {course.description && (
            <p className="mb-[22px] max-w-[520px] text-[15px] leading-[1.6] text-ink-soft">
              {course.description}
            </p>
          )}

          <div className="mb-[26px] flex flex-wrap items-center gap-[18px]">
            <Meta icon={BookOpen} label={`${modules.length} ${modules.length === 1 ? 'module' : 'modules'}`} />
            <Dot />
            <Meta icon={PlayCircle} label={`${totalSections} sections`} />
            <Dot />
            <Meta icon={Clock} label={`~${Math.round(estMinutes / 60)}h`} />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isEnrolled && resumeSectionId ? (
              <Link
                href={`/courses/${courseId}/learn/${resumeSectionId}`}
                className="inline-flex items-center gap-1.5 rounded-[10px] bg-ink px-5 py-[11px] text-[13.5px] font-semibold text-white transition-[filter] hover:brightness-110"
              >
                {pct === 0 ? 'Start course' : pct === 100 ? 'Review course' : 'Resume learning'}
                <ArrowRight size={15} strokeWidth={2.2} />
              </Link>
            ) : (
              <EnrollButton courseId={courseId} firstSectionId={allSectionIds[0] ?? null} isLoggedIn={true} />
            )}
            {isEnrolled && (
              <Link
                href={`/courses/${courseId}/workbook`}
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-line-strong px-[18px] py-[11px] text-[13.5px] font-semibold text-ink transition-colors hover:bg-surface-muted"
              >
                <FileText size={15} strokeWidth={1.9} /> Workbook
              </Link>
            )}
            {isEnrolled && pct === 100 && (
              <a
                href={`/api/courses/${courseId}/export`}
                className="inline-flex items-center gap-1.5 px-2 py-[11px] text-[13.5px] font-semibold text-ink-soft transition-colors hover:text-ink"
              >
                <Download size={15} strokeWidth={1.9} /> Download PDF
              </a>
            )}
            {isEnrolled && pct !== 100 && <Badge variant="accent">Enrolled</Badge>}
            {isEnrolled && pct === 100 && <Badge variant="success">Complete</Badge>}
          </div>
        </div>

        <div className={`${PANEL} overflow-hidden`}>
          <div className="h-[172px] border-b border-line">
            <Thumb title={course.title} cover={course.cover_image} />
          </div>
          {isEnrolled && (
            <div className="p-5">
              <div className="mb-[9px] flex items-center justify-between">
                <span className={`${EYEBROW} text-[10.5px]`}>Your progress</span>
                <span className="text-[13px] font-bold tabular-nums text-ink">{pct}%</span>
              </div>
              <ProgressBar value={pct} className="h-[6px]" />
              <p className="mt-2.5 text-[12.5px] tabular-nums text-ink-muted">
                {completedSections} / {totalSections} sections complete
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Outline */}
      <section data-tour="course-modules">
        <div className="mb-4 flex items-center justify-between">
          <p className={EYEBROW}>Course outline</p>
          <span className="text-[12.5px] tabular-nums text-ink-muted">
            {modules.length} {modules.length === 1 ? 'module' : 'modules'}
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {modules.map((mod: any, modIdx: number) => {
            const sections = [...(mod.sections ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order)
            const modTotal = sections.length
            const modCompleted = sections.filter((s: any) => progressMap[s.id]).length
            const modComplete = modTotal > 0 && modCompleted === modTotal

            return (
              <div key={mod.id} className={`${PANEL} overflow-hidden`}>
                <div className="flex items-center gap-3.5 border-b border-line px-5 py-4">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold tabular-nums ${
                    modComplete ? 'bg-accent-soft text-accent-deep' : 'bg-surface-muted text-ink-soft'
                  }`}>
                    {modComplete ? <Check size={16} strokeWidth={2.4} /> : String(modIdx + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`${EYEBROW} mb-0.5 text-[10px]`}>Module {modIdx + 1}</p>
                    <h3 className="truncate text-[16px] font-bold tracking-[-0.01em] text-ink">{mod.title}</h3>
                    {mod.description && <p className="mt-0.5 line-clamp-1 text-[12px] text-ink-muted">{mod.description}</p>}
                  </div>
                  <span className="shrink-0 text-[12.5px] tabular-nums text-ink-muted">{modCompleted}/{modTotal}</span>
                </div>

                <div>
                  {sections.map((sec: any, secIdx: number) => {
                    const isComplete = progressMap[sec.id]
                    const isCurrent = isEnrolled && !isComplete && sec.id === resumeSectionId
                    const href = isEnrolled ? `/courses/${courseId}/learn/${sec.id}` : undefined
                    const isDraft = sec.status === 'draft'

                    const content = (
                      <>
                        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
                          {isComplete ? (
                            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-accent">
                              <Check size={11} strokeWidth={3} className="text-white" />
                            </span>
                          ) : isCurrent ? (
                            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-accent">
                              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                            </span>
                          ) : isEnrolled ? (
                            <span className="h-[15px] w-[15px] rounded-full border-[1.5px] border-line-strong" />
                          ) : (
                            <Lock size={12} strokeWidth={1.75} className="text-ink-faint" />
                          )}
                        </span>
                        <span className="w-[26px] shrink-0 text-[11px] font-semibold tabular-nums text-ink-faint">
                          {String(secIdx + 1).padStart(2, '0')}
                        </span>
                        <span
                          className={`flex-1 break-words text-[14px] leading-snug ${
                            isDraft
                              ? 'italic text-ink-faint'
                              : isComplete || isCurrent
                                ? 'font-medium text-ink'
                                : isEnrolled
                                  ? 'text-ink-soft group-hover:text-ink'
                                  : 'text-ink-muted'
                          } transition-colors`}
                          style={{ overflowWrap: 'anywhere', fontWeight: isCurrent ? 600 : undefined }}
                        >
                          {sec.title}
                        </span>
                        {isDraft && (
                          <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                            Draft
                          </span>
                        )}
                        {isCurrent && (
                          <span className="mr-2 shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-accent">
                            Current
                          </span>
                        )}
                        <span className="shrink-0 text-[11.5px] text-ink-faint">
                          {isComplete ? 'Complete' : '~18 min'}
                        </span>
                      </>
                    )

                    const rowBg = isCurrent ? 'bg-accent-soft/40' : ''

                    return href ? (
                      <Link
                        key={sec.id}
                        href={href}
                        className={`group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-muted ${rowBg} ${secIdx > 0 ? 'border-t border-line' : ''}`}
                      >
                        {content}
                      </Link>
                    ) : (
                      <div
                        key={sec.id}
                        className={`flex items-center gap-3 px-5 py-3 ${rowBg} ${secIdx > 0 ? 'border-t border-line' : ''}`}
                      >
                        {content}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function Meta({ icon: Icon, label }: { icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>; label: string }) {
  return (
    <span className="inline-flex items-center gap-[7px] text-[13px] text-ink-soft">
      <Icon size={15} strokeWidth={1.7} className="text-ink-muted" /> {label}
    </span>
  )
}

function Dot() {
  return <span className="h-[3px] w-[3px] rounded-full bg-ink-faint" />
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
      <span className="text-[56px] font-bold tracking-[-0.04em] text-ink-faint">{initials}</span>
    </div>
  )
}
