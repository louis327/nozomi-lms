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

  return (
    <div className="px-6 lg:px-10 pb-24">
      <PageTopbar
        breadcrumb={[
          { label: 'Nozomi', href: '/dashboard' },
          { label: 'Courses', href: '/courses' },
          { label: (course as any).title, href: `/courses/${courseId}` },
          { label: 'Workbook' },
        ]}
      />

      {/* Top toolbar */}
      <div className="flex items-center justify-between mt-4 mb-12 max-w-[640px] mx-auto">
        <Link
          href={`/courses/${courseId}`}
          className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
          Back to course
        </Link>
        <a
          href={`/api/courses/${courseId}/export`}
          className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-muted hover:text-ink transition-colors"
        >
          <Download className="w-3.5 h-3.5" strokeWidth={2} />
          Download PDF
        </a>
      </div>

      {/* Title */}
      <article className="max-w-[640px] mx-auto">
        <header className="mb-16 text-center">
          <h1
            className="text-ink"
            style={{
              fontFamily: 'var(--font-serif, Georgia, serif)',
              fontWeight: 400,
              fontStyle: 'italic',
              fontSize: 'clamp(34px, 4.2cqi, 48px)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
          >
            {(course as any).title}
          </h1>
          {completedOn && (
            <p className="mt-5 text-[13px] text-ink-muted">
              Completed {completedOn}
            </p>
          )}
        </header>

        <div className="space-y-20">
          {modules.map((mod: any, mi: number) => {
            const sections = [...(mod.sections ?? [])].sort(
              (a: any, b: any) => a.sort_order - b.sort_order,
            )
            return (
              <section key={mod.id}>
                <h2
                  className="text-ink mb-10"
                  style={{
                    fontFamily: 'var(--font-serif, Georgia, serif)',
                    fontWeight: 400,
                    fontStyle: 'italic',
                    fontSize: 'clamp(24px, 2.8cqi, 30px)',
                    lineHeight: 1.15,
                    letterSpacing: '-0.015em',
                  }}
                >
                  {mi + 1}. {mod.title}
                </h2>

                {sections.length === 0 ? (
                  <p className="text-[13.5px] text-ink-faint italic">
                    No sections in this module.
                  </p>
                ) : (
                  <div className="space-y-14">
                    {sections.map((sec: any) => {
                      const blocks = [
                        ...((sec as any).content_blocks ?? []),
                      ].sort(
                        (a: ContentBlock, b: ContentBlock) =>
                          a.sort_order - b.sort_order,
                      ) as ContentBlock[]
                      const prog = progressById[sec.id]
                      const answers = extractSectionAnswers(
                        blocks,
                        prog?.workbook_data ?? null,
                      )

                      return (
                        <div key={sec.id}>
                          <h3 className="text-[17px] font-semibold text-ink mb-6">
                            {sec.title}
                          </h3>

                          {answers.length === 0 ? (
                            <p className="text-[13.5px] text-ink-faint italic">
                              No prompts in this section.
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
      </article>
    </div>
  )
}
