'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEditMode } from '@/lib/edit-mode-context'
import { useToast } from '@/components/ui/toast'
import { InlineBlockEditor } from '@/components/course/inline-block-editor'
import { SortableBlocksContainer, SortableBlockWrapper } from '@/components/course/sortable-blocks'
import { createBlock, reorderBlocks, getDefaultContent } from '@/lib/block-actions'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { VideoEmbed } from '@/components/course/video-embed'
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
      <div className="absolute inset-x-0 top-1/2 h-px bg-[#eee] group-hover:bg-nz-sakura/20 transition-colors" />
      <button
        onClick={() => setOpen(!open)}
        className="relative z-10 w-6 h-6 rounded-full bg-white border border-[#ddd] hover:border-nz-sakura/40 hover:bg-nz-sakura/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
      >
        <svg className="w-3 h-3 text-[#aaa] group-hover:text-nz-sakura" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full mt-1 bg-white border border-[#e8e8e8] rounded-xl overflow-hidden shadow-xl z-30 w-48">
          {blockTypeOptions.map((bt) => (
            <button
              key={bt.type}
              onClick={() => { onInsert(bt.type); setOpen(false) }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#666] hover:text-[#111] hover:bg-[#f9f9f9] transition-colors cursor-pointer"
            >
              {bt.label}
            </button>
          ))}
        </div>
      )}
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

  // Edit mode handlers
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
          <div key={block.id} className="my-6 overflow-x-auto rounded-2xl border border-[#ececec] bg-white">
            <table className="w-full text-[14px]" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  {headers.map((h: string, i: number) => (
                    <th key={i} className="px-6 py-4 text-left font-heading font-semibold text-[#111] border-b border-[#ececec] text-[14px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row: string[], ri: number) => (
                  <tr key={ri} className="border-b border-[#f4f4f4] last:border-0">
                    {row.map((cell: string, ci: number) => (
                      <td key={ci} className={`px-6 py-4 text-[14px] leading-[1.55] ${ci === 0 ? 'text-[#111] font-medium' : 'text-[#5a5a5a]'}`}>{cell}</td>
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
          <div key={block.id} className="my-6 p-5 rounded-xl bg-[#f9f9f9] border border-[#e8e8e8]">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-6 h-6 rounded-md bg-nz-sakura flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <p className="text-[13px] font-heading font-semibold text-[#111]">
                {block.content.label ?? block.content.prompt ?? 'Your response'}
              </p>
            </div>
            <textarea
              className="w-full min-h-[120px] bg-white border border-[#e8e8e8] rounded-lg px-4 py-3 text-[13px] text-[#111] placeholder:text-[#bbb] focus:outline-none focus:border-[#111] transition-colors resize-y"
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
          <div key={block.id} className="my-6 p-5 rounded-xl bg-[#f9f9f9] border border-[#e8e8e8]">
            {block.content.title && (
              <h3 className="font-heading font-semibold text-[15px] text-[#111] mb-1">
                {block.content.title as string}
              </h3>
            )}
            {block.content.description && (
              <p className="text-[13px] text-[#888] mb-4">{block.content.description as string}</p>
            )}
            <div className="space-y-1">
            {(block.content.items as string[] ?? []).map((item: string, i: number) => {
              const key = `${block.id}_${i}`
              return (
                <label
                  key={key}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#f0f0f0] transition-colors cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={checklistData[key] ?? false}
                    onChange={(e) =>
                      setChecklistData((prev) => ({ ...prev, [key]: e.target.checked }))
                    }
                    disabled={saved}
                    className="mt-0.5 w-4 h-4 rounded border-[#ddd] accent-nz-sakura cursor-pointer"
                  />
                  <span className="text-[13px] text-[#666] group-hover:text-[#111] transition-colors">
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
              className="inline-flex items-center gap-3 px-4 py-3 rounded-lg bg-[#f9f9f9] border border-[#e8e8e8] hover:border-[#d4d4d4] transition-colors group"
            >
              <div className="w-8 h-8 rounded-md bg-nz-sakura flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-[13px] font-medium text-[#111] group-hover:text-nz-sakura transition-colors">
                  {block.content.label ?? block.content.fileName ?? block.content.filename ?? 'Download File'}
                </p>
                {block.content.description && (
                  <p className="text-[11px] text-[#aaa]">{block.content.description}</p>
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
          <div key={block.id} className="my-6 p-5 rounded-xl bg-[#f9f9f9] border border-[#e8e8e8]">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-6 h-6 rounded-md bg-nz-sakura flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <p className="text-[13px] font-heading font-semibold text-[#111]">
                {(block.content.label as string) || 'Your responses'}
              </p>
            </div>
            <div className="space-y-3">
              {spFields.map((field) => {
                const fieldKey = `${block.id}_${field.key}`
                return (
                  <div key={field.key} className="flex items-center gap-3">
                    <label className="text-[13px] text-[#666] w-2/5 shrink-0">{field.label}</label>
                    <div className="flex-1 flex items-center gap-0 bg-white border border-[#e8e8e8] rounded-lg overflow-hidden focus-within:border-[#111] transition-colors">
                      {field.prefix && (
                        <span className="pl-3 pr-1 text-[13px] text-[#aaa] select-none">{field.prefix}</span>
                      )}
                      <input
                        type="text"
                        className="flex-1 bg-transparent px-3 py-2.5 text-[13px] text-[#111] placeholder:text-[#ccc] focus:outline-none"
                        placeholder="..."
                        value={workbookData[fieldKey] ?? ''}
                        onChange={(e) => setWorkbookData((prev) => ({ ...prev, [fieldKey]: e.target.value }))}
                        disabled={saved}
                      />
                      {field.suffix && (
                        <span className="pr-3 pl-1 text-[13px] text-[#aaa] select-none">{field.suffix}</span>
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
                <div className="w-6 h-6 rounded-md bg-nz-sakura flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <p className="text-[13px] font-heading font-semibold text-[#111]">
                  {block.content.label as string}
                </p>
              </div>
            )}
            <div className="overflow-x-auto rounded-xl border border-[#e8e8e8]">
              <table className="w-full text-[13px]" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                {ftColumns.length > 0 && (
                  <thead>
                    <tr className="bg-[#f9f9f9]">
                      {ftColumns.map((col, ci) => (
                        <th key={ci} className="px-5 py-3.5 text-left font-heading font-semibold text-[#111] border-b border-[#e8e8e8] border-r border-[#f0f0f0] last:border-r-0 text-[11px] uppercase tracking-wider">{col}</th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {ftRows.map((row, ri) => (
                    <tr key={ri} className={`border-b border-[#f0f0f0] last:border-0 ${ri % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}`}>
                      {row.cells.map((cell, ci) => {
                        const cellKey = `${block.id}_r${ri}_c${ci}`
                        if (!cell.editable) {
                          return (
                            <td key={ci} className="px-5 py-3.5 text-[#666] border-r border-[#f0f0f0] last:border-r-0 font-medium">
                              {cell.value}
                            </td>
                          )
                        }
                        return (
                          <td key={ci} className="px-2 py-1.5 border-r border-[#f0f0f0] last:border-r-0">
                            <div className="flex items-center gap-0 bg-white border border-[#e8e8e8] rounded-lg overflow-hidden focus-within:border-[#111] transition-colors">
                              {cell.prefix && (
                                <span className="pl-2.5 pr-0.5 text-[13px] text-[#aaa] select-none">{cell.prefix}</span>
                              )}
                              <input
                                type="text"
                                className="flex-1 bg-transparent px-2 py-2 text-[13px] text-[#111] placeholder:text-[#ccc] focus:outline-none min-w-[60px]"
                                placeholder={cell.placeholder || '...'}
                                value={workbookData[cellKey] ?? ''}
                                onChange={(e) => setWorkbookData((prev) => ({ ...prev, [cellKey]: e.target.value }))}
                                disabled={saved}
                              />
                              {cell.suffix && (
                                <span className="pr-2.5 pl-0.5 text-[13px] text-[#aaa] select-none">{cell.suffix}</span>
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
            <div className="py-12 text-center bg-[#f9f9f9] border border-[#e8e8e8] rounded-2xl">
              <p className="text-[#888] text-sm mb-2">No content blocks yet.</p>
              <p className="text-[#aaa] text-xs">Hover between the lines above to add your first block.</p>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-8">
        {blocks.map((block) => (
          <div key={block.id}>{renderBlock(block)}</div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {renderBlocks()}

      {/* Submit — hide in edit mode */}
      {!editMode && <div className="mt-10">
        <div className="rounded-xl border border-[#e8e8e8] bg-[#f9f9f9] p-6">
          {saved ? (
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#22c55e] flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-heading font-semibold text-[#22c55e]">Section Complete</p>
                  <p className="text-[11px] text-[#aaa]">
                    {sectionProgress?.completed_at
                      ? `Completed ${new Date(sectionProgress.completed_at).toLocaleDateString()}`
                      : 'Just now'}
                  </p>
                </div>
              </div>
              {nextSectionId ? (
                <Button onClick={() => router.push(`/courses/${courseId}/learn/${nextSectionId}`)}>
                  Next Section &rarr;
                </Button>
              ) : (
                <Button onClick={() => router.push('/dashboard')} variant="dark">
                  Back to Dashboard
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {saveError && (
                <div className="px-4 py-3 rounded-lg bg-[#fef2f2] border border-[#fecaca] text-[13px] text-[#ef4444]">
                  {saveError}
                </div>
              )}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <p className="text-[13px] text-[#888]">
                  {hasWorkbookPrompts
                    ? 'Fill in your responses above, then submit to complete this section.'
                    : 'Mark this section as complete to continue.'}
                </p>
                <Button onClick={handleSubmit} loading={saving}>
                  {hasWorkbookPrompts ? 'Submit & Complete' : 'Complete Section'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>}
    </div>
  )
}
