'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import type { Section, ContentBlock, SectionProgress } from '@/lib/types'

type SectionContentProps = {
  section: Section & { content_blocks: ContentBlock[] }
  sectionProgress: SectionProgress | null
  courseId: string
  nextSectionId: string | null
}

export function SectionContent({
  section,
  sectionProgress,
  courseId,
  nextSectionId,
}: SectionContentProps) {
  const router = useRouter()
  const supabase = createClient()

  const existingWorkbook = sectionProgress?.workbook_data ?? {}
  const [workbookData, setWorkbookData] = useState<Record<string, string>>(
    existingWorkbook as Record<string, string>
  )
  const [checklistData, setChecklistData] = useState<Record<string, boolean>>(
    (existingWorkbook as any)?._checklists ?? {}
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(sectionProgress?.completed ?? false)

  const blocks = [...(section.content_blocks ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  )

  const hasWorkbookPrompts = blocks.some((b) => b.type === 'workbook_prompt')

  const handleSubmit = useCallback(async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const mergedData = { ...workbookData, _checklists: checklistData }

      await supabase.from('section_progress').upsert(
        {
          user_id: user.id,
          section_id: section.id,
          completed: true,
          workbook_data: mergedData,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,section_id' }
      )

      setSaved(true)
      router.refresh()

      // Navigate to next section after a brief pause
      if (nextSectionId) {
        setTimeout(() => {
          router.push(`/courses/${courseId}/learn/${nextSectionId}`)
        }, 600)
      }
    } catch (err) {
      console.error('Failed to save progress:', err)
    } finally {
      setSaving(false)
    }
  }, [workbookData, checklistData, section.id, courseId, nextSectionId, router, supabase])

  function renderBlock(block: ContentBlock) {
    switch (block.type) {
      case 'rich_text':
        return (
          <div
            key={block.id}
            className="prose-nozomi"
            dangerouslySetInnerHTML={{ __html: block.content.html ?? '' }}
          />
        )

      case 'callout':
        return (
          <Callout
            key={block.id}
            type={block.content.callout_type ?? 'tip'}
            title={block.content.title}
          >
            <div dangerouslySetInnerHTML={{ __html: block.content.html ?? block.content.text ?? '' }} />
          </Callout>
        )

      case 'table':
        return (
          <div key={block.id} className="my-6 overflow-x-auto rounded-xl border border-nz-border">
            <table className="w-full text-sm">
              {block.content.headers && (
                <thead>
                  <tr className="bg-nz-bg-tertiary">
                    {(block.content.headers as string[]).map((h: string, i: number) => (
                      <th
                        key={i}
                        className="px-4 py-3 text-left font-heading font-semibold text-nz-text-primary border-b border-nz-border"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {(block.content.rows as string[][] ?? []).map((row: string[], ri: number) => (
                  <tr
                    key={ri}
                    className="border-b border-nz-border last:border-0 hover:bg-nz-bg-tertiary/30 transition-colors"
                  >
                    {row.map((cell: string, ci: number) => (
                      <td key={ci} className="px-4 py-3 text-nz-text-secondary">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )

      case 'workbook_prompt':
        return (
          <div key={block.id} className="my-6 p-5 rounded-xl bg-nz-bg-tertiary/50 border border-nz-border">
            <div className="flex items-start gap-3 mb-3">
              <svg className="w-5 h-5 text-nz-sakura shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <p className="text-sm font-heading font-semibold text-nz-text-primary">
                {block.content.prompt ?? 'Your response'}
              </p>
            </div>
            <textarea
              className="w-full min-h-[120px] bg-nz-bg-primary border border-nz-border rounded-xl px-4 py-3 text-sm text-nz-text-primary placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40 transition-colors resize-y"
              placeholder="Type your response here..."
              value={workbookData[block.id] ?? ''}
              onChange={(e) =>
                setWorkbookData((prev) => ({ ...prev, [block.id]: e.target.value }))
              }
              disabled={saved}
            />
          </div>
        )

      case 'checklist':
        return (
          <div key={block.id} className="my-6 space-y-2">
            {block.content.title && (
              <p className="font-heading font-semibold text-sm text-nz-text-primary mb-3">
                {block.content.title}
              </p>
            )}
            {(block.content.items as string[] ?? []).map((item: string, i: number) => {
              const key = `${block.id}_${i}`
              return (
                <label
                  key={key}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-nz-bg-tertiary/30 transition-colors cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={checklistData[key] ?? false}
                    onChange={(e) =>
                      setChecklistData((prev) => ({ ...prev, [key]: e.target.checked }))
                    }
                    disabled={saved}
                    className="mt-0.5 w-4 h-4 rounded border-nz-border accent-nz-sakura cursor-pointer"
                  />
                  <span className="text-sm text-nz-text-secondary group-hover:text-nz-text-primary transition-colors">
                    {item}
                  </span>
                </label>
              )
            })}
          </div>
        )

      case 'file':
        return (
          <div key={block.id} className="my-4">
            <a
              href={block.content.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-4 py-3 rounded-xl bg-nz-bg-tertiary/50 border border-nz-border hover:border-nz-border-hover transition-colors group"
            >
              <svg className="w-5 h-5 text-nz-sakura shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-nz-text-primary group-hover:text-nz-sakura transition-colors">
                  {block.content.filename ?? 'Download File'}
                </p>
                {block.content.description && (
                  <p className="text-xs text-nz-text-muted">{block.content.description}</p>
                )}
              </div>
            </a>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div>
      {/* Content blocks */}
      <div className="space-y-2">
        {blocks.map(renderBlock)}
      </div>

      {/* Submit area */}
      <div className="mt-10 pt-8 border-t border-nz-border">
        {saved ? (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-nz-success/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-nz-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-heading font-semibold text-nz-success">Section Complete</p>
                <p className="text-xs text-nz-text-muted">
                  {sectionProgress?.completed_at
                    ? `Completed ${new Date(sectionProgress.completed_at).toLocaleDateString()}`
                    : 'Just now'}
                </p>
              </div>
            </div>
            {nextSectionId && (
              <Button
                onClick={() => router.push(`/courses/${courseId}/learn/${nextSectionId}`)}
                size="md"
              >
                Next Section
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <p className="text-sm text-nz-text-muted">
              {hasWorkbookPrompts
                ? 'Fill in your responses above, then submit to complete this section.'
                : 'Mark this section as complete to continue.'}
            </p>
            <Button
              onClick={handleSubmit}
              loading={saving}
              size="md"
            >
              {hasWorkbookPrompts ? 'Submit & Complete Section' : 'Complete Section'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
