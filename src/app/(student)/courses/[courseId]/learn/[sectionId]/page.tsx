import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { VideoEmbed } from '@/components/course/video-embed'
import { SectionContent } from '@/components/course/section-content'
import { ModuleChecklist } from '@/components/course/module-checklist'
import { InlineSectionTitle } from '@/components/course/inline-section-title'
import { ModuleHero } from '@/components/course/module-hero'
import { SectionHighlights } from '@/components/course/section-highlights'

export default async function SectionPage({
  params,
}: {
  params: Promise<{ courseId: string; sectionId: string }>
}) {
  const { courseId, sectionId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: section } = await supabase
    .from('sections')
    .select(`
      id, module_id, title, video_url, sort_order, created_at, updated_at,
      content_blocks ( id, section_id, type, content, sort_order, created_at, updated_at )
    `)
    .eq('id', sectionId)
    .single()

  if (!section) redirect(`/courses/${courseId}/learn`)

  const { data: sectionProgress } = await supabase
    .from('section_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('section_id', sectionId)
    .single()

  const { data: moduleMeta } = await supabase
    .from('modules')
    .select('id, title, description, sort_order, course_id, courses ( id, title )')
    .eq('id', section.module_id)
    .single()

  // Next section
  const { data: siblingsSections } = await supabase
    .from('sections')
    .select('id, sort_order')
    .eq('module_id', section.module_id)
    .gt('sort_order', section.sort_order)
    .order('sort_order', { ascending: true })
    .limit(1)

  let nextSectionId: string | null = siblingsSections?.[0]?.id ?? null

  if (!nextSectionId && moduleMeta) {
    const { data: nextModules } = await supabase
      .from('modules')
      .select('id, sort_order, sections ( id, sort_order )')
      .eq('course_id', moduleMeta.course_id)
      .gt('sort_order', moduleMeta.sort_order)
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

  // Prev section
  const { data: prevSiblings } = await supabase
    .from('sections')
    .select('id, sort_order')
    .eq('module_id', section.module_id)
    .lt('sort_order', section.sort_order)
    .order('sort_order', { ascending: false })
    .limit(1)

  let prevSectionId: string | null = prevSiblings?.[0]?.id ?? null

  if (!prevSectionId && moduleMeta) {
    const { data: prevModules } = await supabase
      .from('modules')
      .select('id, sort_order, sections ( id, sort_order )')
      .eq('course_id', moduleMeta.course_id)
      .lt('sort_order', moduleMeta.sort_order)
      .order('sort_order', { ascending: false })
      .limit(1)

    const prevModule = prevModules?.[0]
    if (prevModule) {
      const prevModSections = [...((prevModule as any).sections ?? [])].sort(
        (a: any, b: any) => b.sort_order - a.sort_order
      )
      prevSectionId = prevModSections[0]?.id ?? null
    }
  }

  const { data: allModuleSections } = await supabase
    .from('sections')
    .select('id, sort_order')
    .eq('module_id', section.module_id)
    .order('sort_order', { ascending: false })
    .limit(1)

  const isLastSectionInModule = allModuleSections?.[0]?.id === sectionId

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

  const courseTitle = (moduleMeta as any)?.courses?.title ?? 'Course'
  const isFirstSectionInModule = !prevSiblings?.length

  return (
    <div className="px-4 sm:px-6 lg:px-10 pt-16 lg:pt-10">
      <div className="max-w-[680px] mx-auto" id="nz-section-content-column">
        {isFirstSectionInModule && moduleMeta ? (
          <ModuleHero
            moduleId={moduleMeta.id}
            moduleNumber={(moduleMeta.sort_order ?? 0) + 1}
            moduleTitle={moduleMeta.title}
            description={(moduleMeta as any).description ?? null}
            courseTitle={courseTitle}
          />
        ) : (
          <div className="flex items-center gap-2 mb-6 breadcrumb">
            <Link href={`/courses/${courseId}`} className="hover:text-ink transition-colors">{courseTitle}</Link>
            <span className="text-ink-faint">/</span>
            <span className="text-ink font-semibold">{moduleMeta?.title ?? 'Module'}</span>
          </div>
        )}

        {section.video_url && !(section.content_blocks ?? []).some((b: any) => b.type === 'video') && (
          <div className="mb-8 rounded-xl overflow-hidden bg-surface border border-line">
            <VideoEmbed url={section.video_url} />
          </div>
        )}

        {!isFirstSectionInModule && (
          <InlineSectionTitle sectionId={sectionId} title={section.title} />
        )}

        <SectionContent
          section={section as any}
          sectionProgress={sectionProgress as any}
          courseId={courseId}
          nextSectionId={nextSectionId}
          prevSectionId={prevSectionId}
        />

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

      <div
        id="nz-section-footer-slot"
        className="mt-16 -mx-4 sm:-mx-6 lg:-mx-10 border-t border-line bg-surface"
      />

      <SectionHighlights sectionId={sectionId} />
    </div>
  )
}
