import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { VideoEmbed } from '@/components/course/video-embed'
import { SectionContent } from '@/components/course/section-content'
import { ModuleChecklist } from '@/components/course/module-checklist'
import { SectionNotes } from '@/components/course/section-notes'
import { InlineSectionTitle } from '@/components/course/inline-section-title'

export default async function SectionPage({
  params,
}: {
  params: Promise<{ courseId: string; sectionId: string }>
}) {
  const { courseId, sectionId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch section with content blocks
  const { data: section } = await supabase
    .from('sections')
    .select(`
      id, module_id, title, video_url, sort_order, created_at, updated_at,
      content_blocks ( id, section_id, type, content, sort_order, created_at, updated_at )
    `)
    .eq('id', sectionId)
    .single()

  if (!section) redirect(`/courses/${courseId}/learn`)

  // Fetch user's progress for this section
  const { data: sectionProgress } = await supabase
    .from('section_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('section_id', sectionId)
    .single()

  // Determine the next section for navigation
  // 1. Get all sections in the same module after this one
  const { data: siblingsSections } = await supabase
    .from('sections')
    .select('id, sort_order')
    .eq('module_id', section.module_id)
    .gt('sort_order', section.sort_order)
    .order('sort_order', { ascending: true })
    .limit(1)

  let nextSectionId: string | null = siblingsSections?.[0]?.id ?? null

  // 2. If no more sections in this module, look at the next module
  if (!nextSectionId) {
    // Get the current module's sort_order and course_id
    const { data: currentModule } = await supabase
      .from('modules')
      .select('sort_order, course_id')
      .eq('id', section.module_id)
      .single()

    if (currentModule) {
      const { data: nextModules } = await supabase
        .from('modules')
        .select('id, sort_order, sections ( id, sort_order )')
        .eq('course_id', currentModule.course_id)
        .gt('sort_order', currentModule.sort_order)
        .order('sort_order', { ascending: true })
        .limit(1)

      const nextModule = nextModules?.[0]
      if (nextModule) {
        const nextModSections = [...((nextModule as any).sections ?? [])].sort(
          (a: any, b: any) => a.sort_order - b.sort_order
        )
        nextSectionId = nextModSections[0]?.id ?? null
      }
    }
  }

  // Fetch user's notes for this section
  const { data: sectionNote } = await supabase
    .from('section_notes')
    .select('content')
    .eq('user_id', user.id)
    .eq('section_id', sectionId)
    .single()

  // Check if this is the last section of the module (for module deliverable checklist)
  const { data: allModuleSections } = await supabase
    .from('sections')
    .select('id, sort_order')
    .eq('module_id', section.module_id)
    .order('sort_order', { ascending: false })
    .limit(1)

  const isLastSectionInModule = allModuleSections?.[0]?.id === sectionId

  // Fetch module deliverables if last section
  let moduleDeliverables: any[] = []
  let moduleProgress: any = null
  if (isLastSectionInModule) {
    const { data: deliverables } = await supabase
      .from('module_deliverables')
      .select('*')
      .eq('module_id', section.module_id)
      .order('sort_order', { ascending: true })

    moduleDeliverables = deliverables ?? []

    if (moduleDeliverables.length > 0) {
      const { data: mp } = await supabase
        .from('module_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('module_id', section.module_id)
        .single()

      moduleProgress = mp
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Video embed — only show top-level video_url if no video block exists in content_blocks */}
      {section.video_url && !(section.content_blocks ?? []).some((b: any) => b.type === 'video') && (
        <div className="mb-8">
          <VideoEmbed url={section.video_url} />
        </div>
      )}

      {/* Section title */}
      <InlineSectionTitle sectionId={sectionId} title={section.title} />

      {/* Content blocks + submit */}
      <SectionContent
        section={section as any}
        sectionProgress={sectionProgress as any}
        courseId={courseId}
        nextSectionId={nextSectionId}
      />

      {/* Section Notes */}
      <div className="mt-10">
        <SectionNotes
          sectionId={sectionId}
          initialContent={sectionNote?.content ?? ''}
        />
      </div>

      {/* Module checklist (if last section and has deliverables) */}
      {isLastSectionInModule && moduleDeliverables.length > 0 && (
        <div className="mt-12">
          <ModuleChecklist
            moduleId={section.module_id}
            deliverables={moduleDeliverables}
            moduleProgress={moduleProgress}
          />
        </div>
      )}
    </div>
  )
}
