import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Download, ArrowLeft } from 'lucide-react'
import { PageTopbar } from '@/components/layout/page-topbar'
import { WorkbookAnswers } from '@/components/course/workbook-answers'
import { extractSectionAnswers, type WorkbookData } from '@/lib/answer-extract'
import type { ContentBlock } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function WorkbookOnlinePage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: course }, { data: enrollment }, { data: profile }] =
    await Promise.all([
      supabase
        .from('courses')
        .select(
          `
          id, title, description,
          modules (
            id, title, sort_order,
            sections (
              id, title, sort_order,
              content_blocks ( id, section_id, type, content, sort_order )
            )
          )
        `,
        )
        .eq('id', courseId)
        .single(),
      supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single(),
    ])

  if (!course) redirect('/courses')

  const isAdmin = profile?.role === 'admin'
  if (!enrollment && !isAdmin) redirect(`/courses/${courseId}`)

  const modules = [...((course as any).modules ?? [])].sort(
    (a: any, b: any) => a.sort_order - b.sort_order,
  )

  const allSectionIds: string[] = []
  for (const mod of modules) {
    const sections = [...((mod as any).sections ?? [])].sort(
      (a: any, b: any) => a.sort_order - b.sort_order,
    )
    for (const sec of sections) allSectionIds.push(sec.id)
  }

  const progressById: Record<
    string,
    { workbook_data: WorkbookData | null; completed_at: string | null }
  > = {}

  if (allSectionIds.length > 0) {
    const { data: progressRows } = await supabase
      .from('section_progress')
      .select('section_id, workbook_data, completed_at')
      .eq('user_id', user.id)
      .in('section_id', allSectionIds)

    for (const row of progressRows ?? []) {
      progressById[row.section_id] = {
        workbook_data: row.workbook_data as WorkbookData | null,
        completed_at: row.completed_at,
      }
    }
  }

  const completedDates = Object.values(progressById)
    .map((p) => p.completed_at)
    .filter((d): d is string => !!d)
    .sort()
  const latestCompleted = completedDates[completedDates.length - 1]
  const completedOn = latestCompleted
    ? new Date(latestCompleted).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  const founderName =
    (profile?.full_name as string | null) ||
    user.email?.split('@')[0] ||
    'Founder'

  return (
    <div className="px-6 lg:px-10 pb-20">
      <PageTopbar
        breadcrumb={[
          { label: 'Nozomi', href: '/dashboard' },
          { label: 'Courses', href: '/courses' },
          { label: (course as any).title, href: `/courses/${courseId}` },
          { label: 'Workbook' },
        ]}
      />

      {/* Hero */}
      <section className="mt-6 mb-10 max-w-3xl">
        <p className="eyebrow mb-5">Your workbook</p>
        <h1 className="display text-[40px] md:text-[52px] mb-5 leading-[1.02]">
          {(course as any).title.split(' ').slice(0, -1).join(' ')}{' '}
          <em>{(course as any).title.split(' ').slice(-1)}</em>.
        </h1>
        <p className="text-[15px] text-ink-soft leading-relaxed">
          A complete record of the prompts, frameworks and responses you worked
          through. Your answers autosave as you go.
        </p>

        <div className="mt-6 flex items-center gap-5 flex-wrap">
          <div className="flex items-center gap-2 text-[11.5px] font-mono tabular-nums tracking-wider uppercase text-ink-muted">
            <span>Founder</span>
            <span className="text-ink font-semibold">{founderName}</span>
          </div>
          {completedOn && (
            <>
              <span className="w-px h-4 bg-line" />
              <div className="flex items-center gap-2 text-[11.5px] font-mono tabular-nums tracking-wider uppercase text-ink-muted">
                <span>Last completed</span>
                <span className="text-ink font-semibold">{completedOn}</span>
              </div>
            </>
          )}
          <span className="w-px h-4 bg-line" />
          <div className="flex items-center gap-2 text-[11.5px] font-mono tabular-nums tracking-wider uppercase text-ink-muted">
            <span>Modules</span>
            <span className="text-ink font-semibold">{modules.length}</span>
          </div>
        </div>

        <div className="mt-7 flex items-center gap-3 flex-wrap">
          <Link
            href={`/courses/${courseId}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[12.5px] font-medium text-ink-soft hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
            Back to course
          </Link>
          <a
            href={`/api/courses/${courseId}/export`}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-medium border border-line-strong text-ink rounded-full hover:bg-surface-muted transition-colors"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={2} />
            Download PDF
          </a>
        </div>
      </section>

      {/* Modules */}
      <div className="space-y-10 max-w-3xl">
        {modules.map((mod: any, mi: number) => {
          const sections = [...(mod.sections ?? [])].sort(
            (a: any, b: any) => a.sort_order - b.sort_order,
          )
          return (
            <section key={mod.id}>
              <div className="pb-3 mb-6 border-b border-line">
                <p className="eyebrow text-[10px] mb-1">
                  Module {String(mi + 1).padStart(2, '0')}
                </p>
                <h2 className="font-serif italic text-[26px] text-ink leading-tight">
                  {mod.title}
                </h2>
              </div>

              {sections.length === 0 ? (
                <p className="text-[13px] text-ink-faint italic">
                  No sections in this module.
                </p>
              ) : (
                <div className="space-y-10">
                  {sections.map((sec: any, si: number) => {
                    const blocks = [...((sec as any).content_blocks ?? [])].sort(
                      (a: ContentBlock, b: ContentBlock) =>
                        a.sort_order - b.sort_order,
                    ) as ContentBlock[]
                    const prog = progressById[sec.id]
                    const answers = extractSectionAnswers(
                      blocks,
                      prog?.workbook_data ?? null,
                    )
                    const dateLabel = prog?.completed_at
                      ? new Date(prog.completed_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : null

                    return (
                      <div key={sec.id}>
                        <div className="mb-5">
                          <p className="text-[10px] font-semibold tracking-[0.22em] text-accent uppercase mb-1.5">
                            Section {String(si + 1).padStart(2, '0')}
                            {dateLabel && (
                              <span className="text-ink-muted font-normal normal-case tracking-normal">
                                {' '}
                                · Completed {dateLabel}
                              </span>
                            )}
                            {!dateLabel && (
                              <span className="text-ink-muted font-normal normal-case tracking-normal">
                                {' '}
                                · In progress
                              </span>
                            )}
                          </p>
                          <h3 className="font-serif italic text-[20px] text-ink leading-snug">
                            {sec.title}
                          </h3>
                        </div>

                        {answers.length === 0 ? (
                          <p className="text-[13px] text-ink-faint italic">
                            This section had no prompts to respond to.
                          </p>
                        ) : (
                          <WorkbookAnswers answers={answers} />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
