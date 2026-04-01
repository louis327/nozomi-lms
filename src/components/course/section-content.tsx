'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { VideoEmbed } from '@/components/course/video-embed'
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
  const [saveError, setSaveError] = useState<string | null>(null)

  const blocks = [...(section.content_blocks ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  )

  const hasWorkbookPrompts = blocks.some((b) => b.type === 'workbook_prompt' || b.type === 'structured_prompt' || b.type === 'fillable_table')

  const handleSubmit = useCallback(async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const mergedData = { ...workbookData, _checklists: checklistData }

      const { error } = await supabase.from('section_progress').upsert(
        {
          user_id: user.id,
          section_id: section.id,
          completed: true,
          workbook_data: mergedData,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,section_id' }
      )

      if (error) {
        setSaveError('Failed to save your progress. Please try again.')
        return
      }

      setSaved(true)
      router.refresh()

      if (nextSectionId) {
        setTimeout(() => {
          router.push(`/courses/${courseId}/learn/${nextSectionId}`)
        }, 600)
      }
    } catch {
      setSaveError('Something went wrong. Please try again.')
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
            type={block.content.calloutType ?? block.content.callout_type ?? 'tip'}
            title={block.content.title}
          >
            <div dangerouslySetInnerHTML={{ __html: block.content.body ?? block.content.html ?? block.content.text ?? '' }} />
          </Callout>
        )

      case 'table': {
        const rows = (block.content.rows as string[][] ?? [])
        const headers = rows[0] ?? []
        const bodyRows = rows.slice(1)
        return (
          <div key={block.id} className="my-6 overflow-x-auto rounded-xl border border-nz-border/60">
            <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr className="bg-nz-bg-elevated">
                  {headers.map((h: string, i: number) => (
                    <th key={i} className="px-5 py-3.5 text-left font-heading font-semibold text-nz-text-primary border-b border-nz-border/60 border-r border-nz-border/30 last:border-r-0 text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row: string[], ri: number) => (
                  <tr key={ri} className={`border-b border-nz-border/50 last:border-0 ${ri % 2 === 0 ? 'bg-nz-bg-card' : 'bg-nz-bg-tertiary/30'}`}>
                    {row.map((cell: string, ci: number) => (
                      <td key={ci} className="px-5 py-3.5 text-nz-text-secondary border-r border-nz-border/30 last:border-r-0">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      case 'workbook_prompt':
        return (
          <div key={block.id} className="my-6 p-5 rounded-xl bg-nz-bg-tertiary/50 border border-nz-border">
            <div className="flex items-start gap-3 mb-3">
              <svg className="w-5 h-5 text-nz-sakura shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <p className="text-sm font-heading font-semibold text-nz-text-primary">
                {block.content.label ?? block.content.prompt ?? 'Your response'}
              </p>
            </div>
            <textarea
              className="w-full min-h-[120px] bg-nz-bg-primary border border-nz-border rounded-xl px-4 py-3 text-sm text-nz-text-primary placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40 transition-colors resize-y"
              placeholder={block.content.placeholder as string || 'Type your response here...'}
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
          <div key={block.id} className="my-6 p-5 rounded-xl bg-nz-bg-tertiary/30 border border-nz-border">
            {block.content.title && (
              <h3 className="font-heading font-semibold text-base text-nz-text-primary mb-1">
                {block.content.title as string}
              </h3>
            )}
            {block.content.description && (
              <p className="text-sm text-nz-text-tertiary mb-4">{block.content.description as string}</p>
            )}
            <div className="space-y-1.5">
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
          </div>
        )

      case 'file':
        return (
          <div key={block.id} className="my-4">
            <a
              href={block.content.fileUrl ?? block.content.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-4 py-3 rounded-xl bg-nz-bg-tertiary/50 border border-nz-border hover:border-nz-border-hover transition-colors group"
            >
              <svg className="w-5 h-5 text-nz-sakura shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-nz-text-primary group-hover:text-nz-sakura transition-colors">
                  {block.content.label ?? block.content.fileName ?? block.content.filename ?? 'Download File'}
                </p>
                {block.content.description && (
                  <p className="text-xs text-nz-text-muted">{block.content.description}</p>
                )}
              </div>
            </a>
          </div>
        )

      case 'video':
        return (
          <div key={block.id} className="my-6">
            {block.content.url && <VideoEmbed url={block.content.url as string} />}
          </div>
        )

      case 'structured_prompt': {
        const spFields = (block.content.fields as Array<{ key: string; label: string; prefix?: string; suffix?: string; type?: string }>) ?? []
        return (
          <div key={block.id} className="my-6 p-5 rounded-xl bg-nz-bg-tertiary/50 border border-nz-border">
            <div className="flex items-start gap-3 mb-4">
              <svg className="w-5 h-5 text-nz-sakura shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <p className="text-sm font-heading font-semibold text-nz-text-primary">
                {(block.content.label as string) || 'Your responses'}
              </p>
            </div>
            <div className="space-y-3">
              {spFields.map((field) => {
                const fieldKey = `${block.id}_${field.key}`
                return (
                  <div key={field.key} className="flex items-center gap-3">
                    <label className="text-sm text-nz-text-secondary w-2/5 shrink-0">{field.label}</label>
                    <div className="flex-1 flex items-center gap-0 bg-nz-bg-primary border border-nz-border rounded-xl overflow-hidden focus-within:border-nz-sakura/40 transition-colors">
                      {field.prefix && (
                        <span className="pl-3 pr-1 text-sm text-nz-text-muted select-none">{field.prefix}</span>
                      )}
                      <input
                        type="text"
                        className="flex-1 bg-transparent px-3 py-2.5 text-sm text-nz-text-primary placeholder:text-nz-text-muted focus:outline-none"
                        placeholder="..."
                        value={workbookData[fieldKey] ?? ''}
                        onChange={(e) => setWorkbookData((prev) => ({ ...prev, [fieldKey]: e.target.value }))}
                        disabled={saved}
                      />
                      {field.suffix && (
                        <span className="pr-3 pl-1 text-sm text-nz-text-muted select-none">{field.suffix}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      }

      case 'fillable_table': {
        const ftColumns = (block.content.columns as string[]) ?? []
        const ftRows = (block.content.rows as Array<{ cells: Array<{ value: string; editable: boolean; prefix?: string; suffix?: string; placeholder?: string }> }>) ?? []
        return (
          <div key={block.id} className="my-6">
            {block.content.label && (
              <div className="flex items-start gap-3 mb-3">
                <svg className="w-5 h-5 text-nz-sakura shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <p className="text-sm font-heading font-semibold text-nz-text-primary">
                  {block.content.label as string}
                </p>
              </div>
            )}
            <div className="overflow-x-auto rounded-xl border border-nz-border/60">
              <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                {ftColumns.length > 0 && (
                  <thead>
                    <tr className="bg-nz-bg-elevated">
                      {ftColumns.map((col, ci) => (
                        <th key={ci} className="px-5 py-3.5 text-left font-heading font-semibold text-nz-text-primary border-b border-nz-border/60 border-r border-nz-border/30 last:border-r-0 text-xs uppercase tracking-wider">{col}</th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {ftRows.map((row, ri) => (
                    <tr key={ri} className={`border-b border-nz-border/50 last:border-0 ${ri % 2 === 0 ? 'bg-nz-bg-card' : 'bg-nz-bg-tertiary/30'}`}>
                      {row.cells.map((cell, ci) => {
                        const cellKey = `${block.id}_r${ri}_c${ci}`
                        if (!cell.editable) {
                          return (
                            <td key={ci} className="px-5 py-3.5 text-nz-text-secondary border-r border-nz-border/30 last:border-r-0 font-medium">
                              {cell.value}
                            </td>
                          )
                        }
                        return (
                          <td key={ci} className="px-2 py-1.5 border-r border-nz-border/30 last:border-r-0">
                            <div className="flex items-center gap-0 bg-nz-bg-primary border border-nz-border rounded-lg overflow-hidden focus-within:border-nz-sakura/40 transition-colors">
                              {cell.prefix && (
                                <span className="pl-2.5 pr-0.5 text-sm text-nz-text-muted select-none">{cell.prefix}</span>
                              )}
                              <input
                                type="text"
                                className="flex-1 bg-transparent px-2 py-2 text-sm text-nz-text-primary placeholder:text-nz-text-muted focus:outline-none min-w-[60px]"
                                placeholder={cell.placeholder || '...'}
                                value={workbookData[cellKey] ?? ''}
                                onChange={(e) => setWorkbookData((prev) => ({ ...prev, [cellKey]: e.target.value }))}
                                disabled={saved}
                              />
                              {cell.suffix && (
                                <span className="pr-2.5 pl-0.5 text-sm text-nz-text-muted select-none">{cell.suffix}</span>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      }

      default:
        return null
    }
  }

  return (
    <div>
      {/* Content blocks */}
      <div className="space-y-6">
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
            {nextSectionId ? (
              <Button
                onClick={() => router.push(`/courses/${courseId}/learn/${nextSectionId}`)}
                size="md"
              >
                Next Section
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Button>
            ) : (
              <Button
                onClick={() => router.push('/dashboard')}
                variant="secondary"
                size="md"
              >
                Back to Dashboard
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {saveError && (
              <div className="px-4 py-3 rounded-xl bg-nz-error/10 border border-nz-error/20 text-sm text-nz-error">
                {saveError}
              </div>
            )}
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
          </div>
        )}
      </div>
    </div>
  )
}
