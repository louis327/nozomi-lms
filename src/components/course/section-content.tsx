'use client'

import { ReactNode, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEditMode } from '@/lib/edit-mode-context'
import { useToast } from '@/components/ui/toast'
import { InlineBlockEditor } from '@/components/course/inline-block-editor'
import { SortableBlocksContainer, SortableBlockWrapper } from '@/components/course/sortable-blocks'
import { createBlock, reorderBlocks, getDefaultContent } from '@/lib/block-actions'
import { Callout } from '@/components/ui/callout'
import { VideoEmbed } from '@/components/course/video-embed'
import { ArrowRight, Check, Download, Pencil, Plus } from 'lucide-react'
import type { Section, ContentBlock, SectionProgress } from '@/lib/types'

const blockTypeOptions: { type: ContentBlock['type']; label: string }[] = [
  { type: 'rich_text', label: 'Rich Text' },
  { type: 'callout', label: 'Callout' },
  { type: 'table', label: 'Table' },
  { type: 'workbook_prompt', label: 'Workbook Prompt' },
  { type: 'checklist', label: 'Checklist' },
  { type: 'file', label: 'File Upload' },
  { type: 'video', label: 'Video' },
]

function InsertBlockButton({ onInsert }: { onInsert: (type: ContentBlock['type']) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative flex items-center justify-center py-1 group">
      <div className="absolute inset-x-0 top-1/2 h-px bg-line group-hover:bg-accent/30 transition-colors" />
      <button
        onClick={() => setOpen(!open)}
        className="relative z-10 w-6 h-6 rounded-full bg-surface border border-line hover:border-accent/40 hover:bg-accent-soft flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
      >
        <Plus className="w-3 h-3 text-ink-muted group-hover:text-accent" strokeWidth={2} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 bg-surface border border-line rounded-xl overflow-hidden shadow-xl z-30 w-48">
          {blockTypeOptions.map((bt) => (
            <button
              key={bt.type}
              onClick={() => { onInsert(bt.type); setOpen(false) }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-ink-soft hover:text-ink hover:bg-surface-muted transition-colors cursor-pointer"
            >
              {bt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function DoBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="my-7 rounded-xl border border-line-soft border-l-[3px] border-l-accent bg-surface-muted/60 p-5 lg:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Pencil className="w-3.5 h-3.5 text-accent" strokeWidth={1.8} />
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-accent">
          {label}
        </p>
      </div>
      {children}
    </div>
  )
}

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
  const { editMode, isAdmin } = useEditMode()
  const { addToast } = useToast()

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

  const [blocks, setBlocks] = useState<ContentBlock[]>(
    [...(section.content_blocks ?? [])].sort((a, b) => a.sort_order - b.sort_order)
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

  const handleBlockUpdate = useCallback((updated: ContentBlock) => {
    setBlocks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
  }, [])

  const handleBlockDelete = useCallback((blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId))
  }, [])

  const handleInsertBlock = useCallback(async (type: ContentBlock['type'], atIndex: number) => {
    try {
      const content = getDefaultContent(type)
      const newBlock = await createBlock(section.id, type, content, atIndex)
      setBlocks((prev) => {
        const next = [...prev]
        next.splice(atIndex, 0, newBlock)
        return next
      })
      addToast('Block added', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to add block', 'error')
    }
  }, [section.id, addToast])

  const handleReorder = useCallback((oldIndex: number, newIndex: number) => {
    setBlocks((prev) => {
      const next = [...prev]
      const [moved] = next.splice(oldIndex, 1)
      next.splice(newIndex, 0, moved)
      reorderBlocks(next.map((b, i) => ({ id: b.id, sort_order: i }))).catch(() => {
        addToast('Failed to reorder', 'error')
      })
      return next
    })
  }, [addToast])

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
          <div key={block.id} className="my-7 overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-[14px]" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  {headers.map((h: string, i: number) => (
                    <th
                      key={i}
                      className="px-5 py-3 text-left text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink-muted border-b border-line"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row: string[], ri: number) => (
                  <tr key={ri} className="border-b border-line-soft last:border-0">
                    {row.map((cell: string, ci: number) => (
                      <td
                        key={ci}
                        className={`px-5 py-4 text-[14px] leading-[1.55] ${
                          ci === 0 ? 'text-ink font-medium' : 'text-ink-soft'
                        }`}
                      >
                        {cell}
                      </td>
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
          <div key={block.id}>
            <DoBlock label={(block.content.label as string) ?? (block.content.prompt as string) ?? 'Your response'}>
              <textarea
                className="w-full min-h-[120px] bg-surface border border-line rounded-lg px-4 py-3 text-[14px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent/40 transition-colors resize-y leading-[1.6]"
                placeholder={(block.content.placeholder as string) || 'Type your response here…'}
                value={workbookData[block.id] ?? ''}
                onChange={(e) =>
                  setWorkbookData((prev) => ({ ...prev, [block.id]: e.target.value }))
                }
                disabled={saved}
              />
            </DoBlock>
          </div>
        )

      case 'checklist':
        return (
          <div key={block.id}>
            <DoBlock label={(block.content.title as string) ?? 'Checklist'}>
              {block.content.description && (
                <p className="text-[13px] text-ink-soft mb-4 -mt-1">{block.content.description as string}</p>
              )}
              <div className="space-y-0.5">
                {(block.content.items as string[] ?? []).map((item: string, i: number) => {
                  const key = `${block.id}_${i}`
                  const checked = checklistData[key] ?? false
                  return (
                    <label
                      key={key}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-surface transition-colors cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setChecklistData((prev) => ({ ...prev, [key]: e.target.checked }))
                        }
                        disabled={saved}
                        className="mt-0.5 w-4 h-4 rounded border-line accent-[var(--nz-accent)] cursor-pointer"
                      />
                      <span className={`text-[14px] leading-[1.5] transition-colors ${checked ? 'text-ink-muted line-through' : 'text-ink-soft group-hover:text-ink'}`}>
                        {item}
                      </span>
                    </label>
                  )
                })}
              </div>
            </DoBlock>
          </div>
        )

      case 'file':
        return (
          <a
            key={block.id}
            href={block.content.fileUrl ?? block.content.url}
            target="_blank"
            rel="noopener noreferrer"
            className="my-6 inline-flex items-center gap-3 px-4 py-3 rounded-xl border border-line bg-surface hover:border-accent/40 hover:bg-surface-muted transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-accent-soft flex items-center justify-center shrink-0">
              <Download className="w-4 h-4 text-accent-deep" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold text-ink group-hover:text-accent-deep transition-colors truncate">
                {block.content.label ?? block.content.fileName ?? block.content.filename ?? 'Download file'}
              </p>
              {block.content.description && (
                <p className="text-[11.5px] text-ink-muted truncate">{block.content.description}</p>
              )}
            </div>
          </a>
        )

      case 'video':
        return (
          <div key={block.id} className="my-7 rounded-xl overflow-hidden border border-line bg-surface">
            {block.content.url && <VideoEmbed url={block.content.url as string} />}
          </div>
        )

      case 'structured_prompt': {
        const spFields = (block.content.fields as Array<{ key: string; label: string; prefix?: string; suffix?: string; type?: string }>) ?? []
        return (
          <div key={block.id}>
            <DoBlock label={(block.content.label as string) || 'Your responses'}>
              <div className="space-y-3">
                {spFields.map((field) => {
                  const fieldKey = `${block.id}_${field.key}`
                  return (
                    <div key={field.key} className="flex items-center gap-3">
                      <label className="text-[13px] text-ink-soft w-2/5 shrink-0">{field.label}</label>
                      <div className="flex-1 flex items-center gap-0 bg-surface border border-line rounded-lg overflow-hidden focus-within:border-accent/40 transition-colors">
                        {field.prefix && (
                          <span className="pl-3 pr-1 text-[13px] text-ink-faint select-none">{field.prefix}</span>
                        )}
                        <input
                          type="text"
                          className="flex-1 bg-transparent px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-faint focus:outline-none"
                          placeholder="…"
                          value={workbookData[fieldKey] ?? ''}
                          onChange={(e) => setWorkbookData((prev) => ({ ...prev, [fieldKey]: e.target.value }))}
                          disabled={saved}
                        />
                        {field.suffix && (
                          <span className="pr-3 pl-1 text-[13px] text-ink-faint select-none">{field.suffix}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </DoBlock>
          </div>
        )
      }

      case 'fillable_table': {
        const ftColumns = (block.content.columns as string[]) ?? []
        const ftRows = (block.content.rows as Array<{ cells: Array<{ value: string; editable: boolean; prefix?: string; suffix?: string; placeholder?: string }> }>) ?? []
        return (
          <div key={block.id}>
            <DoBlock label={(block.content.label as string) || 'Fill in the table'}>
              <div className="overflow-x-auto rounded-lg border border-line bg-surface">
                <table className="w-full text-[13px]" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                  {ftColumns.length > 0 && (
                    <thead>
                      <tr className="bg-surface-muted">
                        {ftColumns.map((col, ci) => (
                          <th
                            key={ci}
                            className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted border-b border-line border-r border-line-soft last:border-r-0"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {ftRows.map((row, ri) => (
                      <tr key={ri} className="border-b border-line-soft last:border-0">
                        {row.cells.map((cell, ci) => {
                          const cellKey = `${block.id}_r${ri}_c${ci}`
                          if (!cell.editable) {
                            return (
                              <td
                                key={ci}
                                className="px-4 py-3 text-ink font-medium border-r border-line-soft last:border-r-0"
                              >
                                {cell.value}
                              </td>
                            )
                          }
                          return (
                            <td key={ci} className="px-2 py-1.5 border-r border-line-soft last:border-r-0">
                              <div className="flex items-center gap-0 bg-surface border border-line rounded-md overflow-hidden focus-within:border-accent/40 transition-colors">
                                {cell.prefix && (
                                  <span className="pl-2.5 pr-0.5 text-[13px] text-ink-faint select-none">{cell.prefix}</span>
                                )}
                                <input
                                  type="text"
                                  className="flex-1 bg-transparent px-2 py-2 text-[13px] text-ink placeholder:text-ink-faint focus:outline-none min-w-[60px]"
                                  placeholder={cell.placeholder || '…'}
                                  value={workbookData[cellKey] ?? ''}
                                  onChange={(e) => setWorkbookData((prev) => ({ ...prev, [cellKey]: e.target.value }))}
                                  disabled={saved}
                                />
                                {cell.suffix && (
                                  <span className="pr-2.5 pl-0.5 text-[13px] text-ink-faint select-none">{cell.suffix}</span>
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
            </DoBlock>
          </div>
        )
      }

      default:
        return null
    }
  }

  const renderBlocks = () => {
    if (editMode && isAdmin) {
      return (
        <div className="space-y-1 pl-6">
          <SortableBlocksContainer
            blockIds={blocks.map((b) => b.id)}
            onReorder={handleReorder}
          >
            {blocks.map((block, index) => (
              <div key={block.id}>
                <InsertBlockButton onInsert={(type) => handleInsertBlock(type, index)} />
                <SortableBlockWrapper id={block.id}>
                  <InlineBlockEditor
                    block={block}
                    onBlockUpdate={handleBlockUpdate}
                    onBlockDelete={handleBlockDelete}
                  >
                    {renderBlock(block)}
                  </InlineBlockEditor>
                </SortableBlockWrapper>
              </div>
            ))}
          </SortableBlocksContainer>
          <InsertBlockButton onInsert={(type) => handleInsertBlock(type, blocks.length)} />

          {blocks.length === 0 && (
            <div className="py-12 text-center bg-surface-muted border border-line rounded-2xl">
              <p className="text-ink-muted text-sm mb-2">No content blocks yet.</p>
              <p className="text-ink-faint text-xs">Hover between the lines above to add your first block.</p>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-7">
        {blocks.map((block) => (
          <div key={block.id}>{renderBlock(block)}</div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {renderBlocks()}

      {/* Complete / continue — lightweight */}
      {!editMode && (
        <div className="mt-12 pt-6 border-t border-line-soft">
          {saved ? (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-[12.5px] text-ink-soft">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-success/15 text-success">
                  <Check className="w-3 h-3" strokeWidth={2.5} />
                </span>
                <span>
                  Section complete
                  {sectionProgress?.completed_at && (
                    <span className="text-ink-faint">
                      {' · '}
                      {new Date(sectionProgress.completed_at).toLocaleDateString()}
                    </span>
                  )}
                </span>
              </div>
              {nextSectionId ? (
                <button
                  onClick={() => router.push(`/courses/${courseId}/learn/${nextSectionId}`)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink text-ink-inverted text-[13px] font-semibold hover:bg-accent transition-colors cursor-pointer"
                >
                  Next section
                  <ArrowRight className="w-4 h-4" strokeWidth={2} />
                </button>
              ) : (
                <button
                  onClick={() => router.push('/dashboard')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink text-ink-inverted text-[13px] font-semibold hover:bg-accent transition-colors cursor-pointer"
                >
                  Back to dashboard
                  <ArrowRight className="w-4 h-4" strokeWidth={2} />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-[12.5px] text-ink-muted">
                {hasWorkbookPrompts
                  ? 'Fill in your responses above, then mark this section complete.'
                  : 'Ready to move on?'}
              </p>
              <div className="flex items-center gap-3">
                {saveError && (
                  <span className="text-[12px] text-error">{saveError}</span>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink text-ink-inverted text-[13px] font-semibold hover:bg-accent transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {saving ? 'Saving…' : hasWorkbookPrompts ? 'Submit & complete' : 'Complete section'}
                  {!saving && <ArrowRight className="w-4 h-4" strokeWidth={2} />}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
