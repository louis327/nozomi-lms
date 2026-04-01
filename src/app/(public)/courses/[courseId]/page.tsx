import { createClient } from '@/lib/supabase/server'
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

  const firstSection = sortedModules[0]?.sections?.[0]

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-[#aaa] hover:text-[#111] transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          All Courses
        </Link>

        {/* Cover */}
        <div className="rounded-xl overflow-hidden bg-[#f5f5f5] aspect-[21/9] border border-[#e8e8e8] mb-8">
          {course.cover_image ? (
            <img src={course.cover_image} alt={course.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-12 h-12 text-[#ccc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
          )}
        </div>

        {/* Header */}
        <div className="mb-10">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-[#111] tracking-[-0.02em] mb-3">
            {course.title}
          </h1>

          {course.description && (
            <p className="text-[15px] text-[#666] leading-relaxed mb-5 max-w-3xl">
              {course.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#fdf2f8] text-nz-sakura border border-[#fce7f3]">
              {sortedModules.length} {sortedModules.length === 1 ? 'module' : 'modules'}
            </span>
            <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#f5f5f5] text-[#666] border border-[#e8e8e8]">
              {totalSections} {totalSections === 1 ? 'section' : 'sections'}
            </span>
          </div>

          <EnrollButton
            courseId={courseId}
            firstSectionId={firstSection?.id ?? null}
            isLoggedIn={!!user}
          />
        </div>

        {/* Outline */}
        <h2 className="font-heading text-[13px] font-bold text-[#111] uppercase tracking-[0.06em] mb-4">
          Course Outline
        </h2>

        <div className="bg-white rounded-xl border border-[#e8e8e8] divide-y divide-[#f0f0f0]">
          {sortedModules.map((mod: Module, modIndex: number) => (
            <div key={mod.id}>
              {/* Module header */}
              <div className="px-5 py-4 flex items-center gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#111] flex items-center justify-center text-white text-[12px] font-heading font-bold">
                  {modIndex + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-semibold text-[14px] text-[#111] truncate">{mod.title}</h3>
                  {mod.description && (
                    <p className="text-[12px] text-[#aaa] mt-0.5 line-clamp-1">{mod.description}</p>
                  )}
                </div>
                <span className="text-[12px] text-[#aaa] shrink-0">
                  {mod.sections?.length ?? 0} {(mod.sections?.length ?? 0) === 1 ? 'section' : 'sections'}
                </span>
              </div>

              {/* Sections */}
              {mod.sections && mod.sections.length > 0 && (
                <div className="border-t border-[#f0f0f0]">
                  {mod.sections.map((section: Section, secIndex: number) => (
                    <div
                      key={section.id}
                      className="px-5 py-3 flex items-center gap-3 hover:bg-[#fafafa] transition-colors border-b border-[#f5f5f5] last:border-b-0"
                    >
                      <span className="text-[11px] text-[#ccc] font-mono w-8 text-right shrink-0">
                        {modIndex + 1}.{secIndex + 1}
                      </span>
                      <div className="w-1.5 h-1.5 rounded-full bg-nz-sakura shrink-0" />
                      <span className="text-[13px] text-[#666]">{section.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {sortedModules.length === 0 && (
          <div className="bg-white rounded-xl border border-[#e8e8e8] p-12 text-center">
            <p className="text-[13px] text-[#888]">Course content is being prepared. Check back soon.</p>
          </div>
        )}
      </div>
    </div>
  )
}
