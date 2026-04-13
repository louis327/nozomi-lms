'use client'

import { EditModeProvider } from '@/lib/edit-mode-context'
import { InlineSectionTitle } from '@/components/course/inline-section-title'
import { SectionContent } from '@/components/course/section-content'
import { VideoEmbed } from '@/components/course/video-embed'
import type { Section, ContentBlock } from '@/lib/types'

type Props = {
  section: Section & { content_blocks: ContentBlock[] }
  courseId: string
}

export function AdminSectionEditor({ section, courseId }: Props) {
  const hasVideoBlock = (section.content_blocks ?? []).some((b) => b.type === 'video')

  return (
    <EditModeProvider isAdmin defaultEditMode>
      <div className="max-w-4xl mx-auto">
        {section.video_url && !hasVideoBlock && (
          <div className="mb-8">
            <VideoEmbed url={section.video_url} />
          </div>
        )}

        <InlineSectionTitle sectionId={section.id} title={section.title} />

        <SectionContent
          section={section}
          sectionProgress={null}
          courseId={courseId}
          nextSectionId={null}
        />
      </div>
    </EditModeProvider>
  )
}
