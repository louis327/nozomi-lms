import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function CourseOverviewPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch course with modules and sections
  const { data: course } = await supabase
    .from('courses')
    .select(`
      id, title, description, cover_image,
      modules (
        id, title, description, sort_order,
        sections ( id, title, sort_order )
      )
    `)
    .eq('id', courseId)
    .single()

  if (!course) redirect('/dashboard')

  // Fetch progress
  const allSectionIds: string[] = []
  const modules = [...(course.modules ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order)
  for (const mod of modules) {
    for (const sec of (mod as any).sections ?? []) {
      allSectionIds.push(sec.id)
    }
  }

  let progressMap: Record<string, boolean> = {}
  if (allSectionIds.length > 0) {
    const { data: progress } = await supabase
      .from('section_progress')
      .select('section_id, completed')
      .eq('user_id', user.id)
      .in('section_id', allSectionIds)

    for (const p of progress ?? []) {
      progressMap[p.section_id] = p.completed
    }
  }

  // Calculate stats
  const totalSections = allSectionIds.length
  const completedSections = allSectionIds.filter((id) => progressMap[id]).length
  const pct = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0

  // Find first incomplete section for resume
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
    // All complete — point to last section
    const lastMod = modules[modules.length - 1]
    const lastSections = [...((lastMod as any).sections ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order)
    resumeSectionId = lastSections[lastSections.length - 1]?.id ?? null
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#111] tracking-[-0.02em] mb-2">
          {course.title}
        </h1>
        {course.description && (
          <p className="text-[14px] text-[#888] leading-relaxed max-w-2xl">{course.description}</p>
        )}
      </div>

      {/* Progress card */}
      <div className="rounded-xl bg-[#111] p-6 mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-[11px] text-[#888] font-bold uppercase tracking-[0.08em] mb-1">Your Progress</p>
            <div className="flex items-baseline gap-2">
              <span className="text-[32px] font-heading font-bold text-white leading-none">{pct}%</span>
              <span className="text-[13px] text-[#666]">{completedSections} of {totalSections} sections</span>
            </div>
            <div className="w-48 h-1.5 rounded-full bg-[#333] overflow-hidden mt-3">
              <div
                className="h-full rounded-full bg-nz-sakura transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          {resumeSectionId && (
            <Link
              href={`/courses/${courseId}/learn/${resumeSectionId}`}
              className="px-5 py-2.5 text-[13px] font-heading font-semibold rounded-lg bg-nz-sakura text-white hover:bg-nz-sakura-deep transition-colors"
            >
              {pct === 0 ? 'Start Course' : pct === 100 ? 'Review Course' : 'Resume Learning'} &rarr;
            </Link>
          )}
        </div>
      </div>

      {/* Modules */}
      <div className="space-y-4">
        {modules.map((mod: any, modIdx: number) => {
          const sections = [...(mod.sections ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order)
          const modTotal = sections.length
          const modCompleted = sections.filter((s: any) => progressMap[s.id]).length
          const modComplete = modTotal > 0 && modCompleted === modTotal

          return (
            <div key={mod.id} className="rounded-xl border border-[#e8e8e8] bg-white overflow-hidden">
              {/* Module header */}
              <div className="px-5 py-4 border-b border-[#f0f0f0]">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-heading font-bold shrink-0 ${
                    modComplete ? 'bg-[#22c55e] text-white' : 'bg-[#f5f5f5] text-[#111]'
                  }`}>
                    {modComplete ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      modIdx + 1
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-[#bbb] font-bold uppercase tracking-[0.08em]">Module {modIdx + 1}</p>
                    <h3 className="font-heading font-semibold text-[14px] text-[#111] truncate" title={mod.title}>{mod.title}</h3>
                  </div>
                  <span className="text-[12px] text-[#aaa] shrink-0">{modCompleted}/{modTotal}</span>
                </div>
              </div>

              {/* Sections */}
              <div className="divide-y divide-[#f0f0f0]">
                {sections.map((sec: any) => {
                  const isComplete = progressMap[sec.id]

                  return (
                    <Link
                      key={sec.id}
                      href={`/courses/${courseId}/learn/${sec.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#fafafa] transition-colors group"
                    >
                      {isComplete ? (
                        <svg className="w-4.5 h-4.5 text-[#22c55e] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-[#ddd] shrink-0" />
                      )}
                      <span className="text-[13px] text-[#666] group-hover:text-[#111] transition-colors truncate flex-1" title={sec.title}>
                        {sec.title}
                      </span>
                      {isComplete && (
                        <span className="text-[11px] text-[#ccc] shrink-0">Complete</span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
