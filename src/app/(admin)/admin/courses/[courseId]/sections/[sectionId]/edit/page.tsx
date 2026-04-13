import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Breadcrumbs } from '@/components/admin/breadcrumbs'
import { AdminSectionEditor } from '@/components/admin/admin-section-editor'

export default async function AdminEditSectionPage({
  params,
}: {
  params: Promise<{ courseId: string; sectionId: string }>
}) {
  const { courseId, sectionId } = await params
  const supabase = await createClient()

  const { data: section } = await supabase
    .from('sections')
    .select(`
      id, module_id, title, video_url, sort_order, created_at, updated_at,
      content_blocks ( id, section_id, type, content, sort_order, created_at, updated_at )
    `)
    .eq('id', sectionId)
    .single()

  if (!section) redirect(`/admin/courses/${courseId}/edit`)

  const sortedBlocks = [...(section.content_blocks ?? [])].sort(
    (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
  )

  const { data: moduleData } = await supabase
    .from('modules')
    .select('title')
    .eq('id', section.module_id)
    .single()

  const { data: courseData } = await supabase
    .from('courses')
    .select('title')
    .eq('id', courseId)
    .single()

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Courses', href: '/admin/courses' },
          { label: courseData?.title ?? 'Course', href: `/admin/courses/${courseId}/edit` },
          { label: moduleData?.title ?? 'Module' },
          { label: section.title },
        ]}
      />

      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-nz-border -mx-4 px-4 py-3 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/courses/${courseId}/edit`}
              className="p-2 rounded-lg text-nz-text-tertiary hover:text-nz-text-primary hover:bg-nz-bg-elevated transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-nz-text-muted">
                Editing as student sees it
              </p>
              <p className="text-sm font-heading font-semibold text-nz-text-primary">
                {courseData?.title} &middot; {moduleData?.title}
              </p>
            </div>
          </div>
        </div>
      </div>

      <AdminSectionEditor
        section={{ ...section, content_blocks: sortedBlocks } as Parameters<typeof AdminSectionEditor>[0]['section']}
        courseId={courseId}
      />
    </div>
  )
}
