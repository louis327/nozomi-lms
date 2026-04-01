import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Course, Module, Section } from '@/lib/types'
import { EnrollButton } from '@/components/course/enroll-button'

export default async function CourseOverviewPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: course } = await supabase
    .from('courses')
    .select('*, modules(*, sections(*))')
    .eq('id', courseId)
    .single()

  if (!course) notFound()

  // Sort modules and sections by sort_order
  const sortedModules = [...(course.modules ?? [])].sort(
    (a: Module, b: Module) => a.sort_order - b.sort_order
  )
  sortedModules.forEach((mod: Module) => {
    if (mod.sections) {
      mod.sections.sort((a: Section, b: Section) => a.sort_order - b.sort_order)
    }
  })

  const totalSections = sortedModules.reduce(
    (sum: number, mod: Module) => sum + (mod.sections?.length ?? 0),
    0
  )

  // Get first section for CTA link
  const firstSection = sortedModules[0]?.sections?.[0]

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-5xl mx-auto">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-nz-text-muted hover:text-nz-text-secondary transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          All Courses
        </Link>

        {/* Course Header */}
        <div className="flex flex-col lg:flex-row gap-10 mb-12">
          <div className="flex-1">
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-nz-text-primary tracking-tight mb-4">
              {course.title}
            </h1>

            {/* Accent line */}
            <div className="h-0.5 w-16 rounded-full bg-nz-sakura/40 mb-6" />

            {course.description && (
              <p className="text-lg text-nz-text-secondary leading-relaxed mb-6">
                {course.description}
              </p>
            )}

            <div className="flex items-center gap-4 mb-8">
              <Badge variant="sakura">
                {sortedModules.length} {sortedModules.length === 1 ? 'module' : 'modules'}
              </Badge>
              <Badge variant="neutral">
                {totalSections} {totalSections === 1 ? 'section' : 'sections'}
              </Badge>
            </div>

            {/* CTA */}
            <EnrollButton
              courseId={courseId}
              firstSectionId={firstSection?.id ?? null}
              isLoggedIn={!!user}
            />
          </div>

          {/* Cover image */}
          <div className="lg:w-80 shrink-0">
            <div className="rounded-2xl overflow-hidden bg-nz-bg-tertiary aspect-video lg:aspect-[4/3] border border-nz-border">
              {course.cover_image ? (
                <img
                  src={course.cover_image}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-20 h-20 rounded-2xl bg-nz-sakura/10 flex items-center justify-center">
                    <svg className="w-10 h-10 text-nz-sakura/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Module / Section Outline */}
        <h2 className="font-heading text-xl font-semibold text-nz-text-primary mb-6">
          Course Outline
        </h2>

        <div className="space-y-4">
          {sortedModules.map((mod: Module, modIndex: number) => (
            <Card key={mod.id} className="overflow-hidden">
              {/* Module header */}
              <div className="px-6 py-4 border-b border-nz-border bg-nz-bg-elevated/30">
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-nz-sakura/10 flex items-center justify-center text-nz-sakura text-sm font-heading font-semibold">
                    {modIndex + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-semibold text-nz-text-primary truncate">
                      {mod.title}
                    </h3>
                    {mod.description && (
                      <p className="text-sm text-nz-text-muted mt-0.5 truncate">
                        {mod.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="neutral">
                    {mod.sections?.length ?? 0} {(mod.sections?.length ?? 0) === 1 ? 'section' : 'sections'}
                  </Badge>
                </div>
              </div>

              {/* Sections list */}
              {mod.sections && mod.sections.length > 0 && (
                <ul className="divide-y divide-nz-border/50">
                  {mod.sections.map((section: Section, secIndex: number) => (
                    <li
                      key={section.id}
                      className="px-6 py-3 flex items-center gap-3 hover:bg-nz-bg-tertiary/30 transition-colors"
                    >
                      <span className="text-xs text-nz-text-muted font-mono w-8 text-right shrink-0">
                        {modIndex + 1}.{secIndex + 1}
                      </span>
                      <svg className="w-4 h-4 text-nz-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                      </svg>
                      <span className="text-sm text-nz-text-secondary">
                        {section.title}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>

        {sortedModules.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-nz-text-muted">
              Course content is being prepared. Check back soon.
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
