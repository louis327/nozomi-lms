import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Check, Lock, PlayCircle, Clock, BookOpen, Download, FileText } from 'lucide-react'
import { PageTopbar } from '@/components/layout/page-topbar'
import { CourseThumb } from '@/components/ui/course-thumb'
import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/ui/progress-bar'
import { EnrollButton } from '@/components/course/enroll-button'

export default async function CourseOverviewPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: course } = await supabase
    .from('courses')
    .select(`
      id, title, description, cover_image, status,
      modules (
        id, title, description, sort_order,
        sections ( id, title, sort_order )
      )
    `)
    .eq('id', courseId)
    .single()

  if (!course) redirect('/courses')

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
    <div className="px-6 lg:px-10 pb-16">
      <PageTopbar breadcrumb={[{ label: 'Nozomi', href: '/dashboard' }, { label: 'Courses', href: '/courses' }, { label: course.title }]} />

      {/* Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-10 mt-6 mb-12 items-start">
        <div>
          <p className="eyebrow mb-5">Course</p>
          <h1 className="display text-[48px] md:text-[58px] mb-5 max-w-2xl">
            {course.title.split(' ').slice(0, -1).join(' ')}{' '}
            <em>{course.title.split(' ').slice(-1)}</em>.
          </h1>
          {course.description && (
            <p className="text-[15px] text-ink-soft leading-relaxed max-w-xl mb-6">
              {course.description}
            </p>
          )}

          <div className="flex items-center gap-5 mb-6">
            <div className="flex items-center gap-2 text-[13px] text-ink-soft">
              <BookOpen className="w-4 h-4 text-ink-muted" strokeWidth={1.5} />
              {modules.length} {modules.length === 1 ? 'module' : 'modules'}
            </div>
            <div className="w-px h-4 bg-line" />
            <div className="flex items-center gap-2 text-[13px] text-ink-soft">
              <PlayCircle className="w-4 h-4 text-ink-muted" strokeWidth={1.5} />
              {totalSections} sections
            </div>
            <div className="w-px h-4 bg-line" />
            <div className="flex items-center gap-2 text-[13px] text-ink-soft">
              <Clock className="w-4 h-4 text-ink-muted" strokeWidth={1.5} />
              ~{Math.round(estMinutes / 60)}h
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {isEnrolled && resumeSectionId ? (
              <Link
                href={`/courses/${courseId}/learn/${resumeSectionId}`}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-medium bg-ink text-white rounded-full hover:bg-black transition-colors"
              >
                {pct === 0 ? 'Start course' : pct === 100 ? 'Review course' : 'Resume learning'} <span aria-hidden>→</span>
              </Link>
            ) : (
              <EnrollButton courseId={courseId} firstSectionId={allSectionIds[0] ?? null} isLoggedIn={true} />
            )}
            {isEnrolled && pct === 100 && (
              <>
                <Link
                  href={`/courses/${courseId}/workbook`}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-medium border border-line-strong text-ink rounded-full hover:bg-surface-muted transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" strokeWidth={2} />
                  View workbook
                </Link>
                <a
                  href={`/api/courses/${courseId}/export`}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-medium text-ink-soft hover:text-ink transition-colors"
                >
                  <Download className="w-3.5 h-3.5" strokeWidth={2} />
                  Download PDF
                </a>
              </>
            )}
            {isEnrolled && pct !== 100 && <Badge variant="accent">Enrolled</Badge>}
            {isEnrolled && pct === 100 && <Badge variant="success">Complete</Badge>}
          </div>
        </div>

        <div className="bg-surface border border-line rounded-2xl overflow-hidden">
          <div className="aspect-[16/10] bg-surface-muted relative">
            {course.cover_image ? (
              <img src={course.cover_image} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <CourseThumb title={course.title} size="xl" />
              </div>
            )}
          </div>
          {isEnrolled && (
            <div className="p-5 border-t border-line-soft">
              <div className="flex items-center justify-between text-[11px] text-ink-muted mb-2">
                <span className="uppercase tracking-[0.12em] font-semibold">Your progress</span>
                <span className="font-semibold text-ink tabular-nums">{pct}%</span>
              </div>
              <ProgressBar value={pct} />
              <p className="text-[12px] text-ink-muted mt-2">
                {completedSections} / {totalSections} sections complete
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Modules */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="eyebrow">Course outline</h2>
          <span className="text-[12px] text-ink-muted">{modules.length} {modules.length === 1 ? 'module' : 'modules'}</span>
        </div>

        <div className="space-y-3">
          {modules.map((mod: any, modIdx: number) => {
            const sections = [...(mod.sections ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order)
            const modTotal = sections.length
            const modCompleted = sections.filter((s: any) => progressMap[s.id]).length
            const modComplete = modTotal > 0 && modCompleted === modTotal

            return (
              <div key={mod.id} className="bg-surface border border-line rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-line-soft flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-[13px] font-semibold ${
                    modComplete ? 'bg-accent-soft text-accent-deep' : 'bg-surface-muted text-ink-soft'
                  }`}>
                    {modComplete ? <Check className="w-4 h-4" strokeWidth={2} /> : String(modIdx + 1).padStart(2, '0')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="eyebrow text-[9.5px] mb-0.5">Module {modIdx + 1}</p>
                    <h3 className="font-serif text-[18px] text-ink leading-tight">{mod.title}</h3>
                    {mod.description && <p className="text-[12px] text-ink-muted mt-0.5 line-clamp-1">{mod.description}</p>}
                  </div>
                  <span className="text-[12px] text-ink-soft shrink-0 tabular-nums">{modCompleted}/{modTotal}</span>
                </div>

                <div className="divide-y divide-line-soft">
                  {sections.map((sec: any, secIdx: number) => {
                    const isComplete = progressMap[sec.id]
                    const href = isEnrolled ? `/courses/${courseId}/learn/${sec.id}` : undefined

                    const content = (
                      <>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                          {isComplete ? (
                            <Check className="w-4 h-4 text-accent" strokeWidth={2.25} />
                          ) : isEnrolled ? (
                            <span className="w-3.5 h-3.5 rounded-full border border-line-strong" />
                          ) : (
                            <Lock className="w-3 h-3 text-ink-faint" strokeWidth={1.75} />
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-[0.12em] tabular-nums shrink-0 w-8">
                          {String(secIdx + 1).padStart(2, '0')}
                        </span>
                        <span className={`text-[13.5px] flex-1 truncate ${isEnrolled ? 'text-ink-soft group-hover:text-ink' : 'text-ink-muted'} transition-colors`}>
                          {sec.title}
                        </span>
                        <span className="text-[11px] text-ink-faint shrink-0">
                          {isComplete ? 'Complete' : '~18 min'}
                        </span>
                      </>
                    )

                    return href ? (
                      <Link key={sec.id} href={href} className="flex items-center gap-3 px-6 py-3 hover:bg-surface-muted/60 transition-colors group">
                        {content}
                      </Link>
                    ) : (
                      <div key={sec.id} className="flex items-center gap-3 px-6 py-3">
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
