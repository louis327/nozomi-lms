import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Download, ArrowLeft } from 'lucide-react'
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
    <div className="px-6 pb-24 pt-8 lg:px-10">
      {/* Top toolbar */}
      <div className="mx-auto mb-10 flex max-w-[620px] items-center justify-between">
        <Link
          href={`/courses/${courseId}`}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          Back to course
        </Link>
        <a
          href={`/api/courses/${courseId}/export`}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-muted transition-colors hover:text-ink"
        >
          <Download className="h-3.5 w-3.5" strokeWidth={2} />
          Download PDF
        </a>
      </div>

      {/* Title */}
      <article className="mx-auto max-w-[620px]">
        <header className="mb-14 text-center">
          <p className="eyebrow mb-3.5">Workbook</p>
          <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[40px]">
            {(course as any).title}
          </h1>
          {completedOn && (
            <p className="mt-4 text-[13px] text-ink-muted">Completed {completedOn}</p>
          )}
        </header>

        <div className="flex flex-col gap-16">
          {modules.map((mod: any, mi: number) => {
            const sections = [...(mod.sections ?? [])].sort(
              (a: any, b: any) => a.sort_order - b.sort_order,
            )
            return (
              <section key={mod.id}>
                <h2 className="mb-8 border-b border-line pb-3.5 text-[24px] font-bold leading-[1.15] tracking-[-0.025em] text-ink">
                  <span className="text-accent">{mi + 1}.</span> {mod.title}
                </h2>

                {sections.length === 0 ? (
                  <p className="text-[13.5px] italic text-ink-faint">
                    No sections in this module.
                  </p>
                ) : (
                  <div className="flex flex-col gap-11">
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
                          <h3 className="mb-5 text-[16.5px] font-bold tracking-[-0.01em] text-ink">
                            {sec.title}
                          </h3>

                          {answers.length === 0 ? (
                            <p className="text-[13.5px] italic text-ink-faint">
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
