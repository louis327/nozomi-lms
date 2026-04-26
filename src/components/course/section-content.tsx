'use client'

import { ReactNode, useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEditMode } from '@/lib/edit-mode-context'
import { useToast } from '@/components/ui/toast'
import { InlineBlockEditor } from '@/components/course/inline-block-editor'
import { SortableBlocksContainer, SortableBlockWrapper } from '@/components/course/sortable-blocks'
import { createBlock, reorderBlocks, getDefaultContent } from '@/lib/block-actions'
import { Callout } from '@/components/ui/callout'
import { VideoEmbed } from '@/components/course/video-embed'
import { SectionRecapModal } from '@/components/course/section-recap-modal'
import { extractSectionAnswers, sectionHasPrompts } from '@/lib/answer-extract'
import { ArrowRight, Check, Download, Pencil, Plus } from 'lucide-react'
import type { Section, ContentBlock, SectionProgress } from '@/lib/types'

const blockTypeOptions: { type: ContentBlock['type']; label: string }[] = [
  { type: 'rich_text', label: 'Rich Text' },
  { type: 'callout', label: 'Callout' },
  { type: 'quote', label: 'Quote' },
  { type: 'bucket', label: 'Bucket' },
  { type: 'image', label: 'Image' },
  { type: 'table', label: 'Table' },
  { type: 'workbook_prompt', label: 'Workbook Prompt' },
  { type: 'checklist', label: 'Checklist' },
  { type: 'completion_checklist', label: 'Completion checklist' },
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

function DoBlock({
  label,
  question,
  example,
  children,
}: {
  label: string
  question?: string
  example?: string
  children: ReactNode
}) {
  return (
    <div
      className="my-8 relative rounded-r-lg rounded-l-sm border-l-[3px] border-l-accent px-5 py-5"
      style={{ background: 'rgba(198, 154, 63, 0.06)' }}
    >
      <div className="flex items-center gap-1.5 mb-2.5">
        <Pencil className="w-3 h-3 text-accent" strokeWidth={2.5} />
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">
          {label}
        </p>
      </div>
      {question && (
        <p
          className="text-[17px] leading-[1.5] mb-2 text-ink"
          style={{ fontWeight: 600 }}
        >
          {question}
        </p>
      )}
      {example && (
        <p className="text-[13px] text-ink-muted italic leading-[1.5] mb-4 pl-3 border-l-2 border-line">
          e.g. {example}
        </p>
      )}
      <div className="mt-3">{children}</div>
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
  const [recapOpen, setRecapOpen] = useState(false)
  const [recapCompletedAt, setRecapCompletedAt] = useState<string | null>(
    sectionProgress?.completed_at ?? null,
  )
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const lastSavedSerialized = useRef(
    JSON.stringify({
      w: existingWorkbook,
      c: (existingWorkbook as any)?._checklists ?? {},
    }),
  )

  const [blocks, setBlocks] = useState<ContentBlock[]>(
    [...(section.content_blocks ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  )

  const hasPrompts = sectionHasPrompts(blocks)
  const hasWorkbookPrompts = hasPrompts

  const mergedWorkbook = { ...workbookData, _checklists: checklistData }
  const recapAnswers = extractSectionAnswers(blocks, mergedWorkbook)

  useEffect(() => {
    if (saved) return
    if (!hasPrompts) return

    const currentSerialized = JSON.stringify({ w: workbookData, c: checklistData })
    if (currentSerialized === lastSavedSerialized.current) return

    const timer = setTimeout(async () => {
      setAutosaveStatus('saving')
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setAutosaveStatus('error')
          return
        }
        const mergedData = { ...workbookData, _checklists: checklistData }
        const { error } = await supabase.from('section_progress').upsert(
          {
            user_id: user.id,
            section_id: section.id,
            workbook_data: mergedData,
          },
          { onConflict: 'user_id,section_id' },
        )
        if (error) {
          setAutosaveStatus('error')
          return
        }
        lastSavedSerialized.current = currentSerialized
        setAutosaveStatus('saved')
      } catch {
        setAutosaveStatus('error')
      }
    }, 900)

    return () => clearTimeout(timer)
  }, [workbookData, checklistData, saved, hasPrompts, supabase, section.id])

  const goNext = useCallback(() => {
    if (nextSectionId) {
      router.push(`/courses/${courseId}/learn/${nextSectionId}`)
    } else {
      router.push(`/courses/${courseId}`)
    }
  }, [router, courseId, nextSectionId])

  const handleSubmit = useCallback(async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const mergedData = { ...workbookData, _checklists: checklistData }
      const completedAt = new Date().toISOString()

      const { error } = await supabase.from('section_progress').upsert(
        {
          user_id: user.id,
          section_id: section.id,
          completed: true,
          workbook_data: mergedData,
          completed_at: completedAt,
        },
        { onConflict: 'user_id,section_id' }
      )

      if (error) {
        setSaveError('Failed to save your progress. Please try again.')
        return
      }

      setSaved(true)
      setRecapCompletedAt(completedAt)
      lastSavedSerialized.current = JSON.stringify({ w: workbookData, c: checklistData })
      setAutosaveStatus('saved')
      router.refresh()

      if (hasPrompts) {
        setRecapOpen(true)
      } else {
        goNext()
      }
    } catch {
      setSaveError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [workbookData, checklistData, section.id, router, supabase, hasPrompts, goNext])

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
            <div
              className="prose-nozomi"
              dangerouslySetInnerHTML={{ __html: block.content.body ?? block.content.html ?? block.content.text ?? '' }}
            />
          </Callout>
        )

      case 'quote': {
        const text = (block.content.text as string) || (block.content.html as string) || ''
        const attribution = (block.content.attribution as string) || ''
        const isHtml = /<[a-z][\s\S]*>/i.test(text)
        return (
          <figure
            key={block.id}
            className="my-6 px-6 py-4"
            style={{
              background: '#faf1df',
              borderLeft: '6px solid #c69a3f',
              borderRadius: '2px',
            }}
          >
            <blockquote
              className="prose-nozomi italic"
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                color: '#2a2a2a',
                fontSize: '16px',
                lineHeight: 1.55,
              }}
            >
              {isHtml ? (
                <div dangerouslySetInnerHTML={{ __html: text }} />
              ) : (
                <p>{text}</p>
              )}
            </blockquote>
            {attribution && (
              <figcaption
                className="mt-2 text-[13px] not-italic"
                style={{ color: '#6b6b6b', fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                — {attribution}
              </figcaption>
            )}
          </figure>
        )
      }

      case 'bucket': {
        const number = block.content.number as number | undefined
        const eyebrow = (block.content.eyebrow as string) ||
          (number ? `Bucket ${number}` : 'Bucket')
        const title = (block.content.title as string) || ''
        const body = (block.content.body as string) || (block.content.html as string) || ''
        return (
          <section
            key={block.id}
            className="my-6 rounded-[2px] px-7 py-6"
            style={{
              background: '#faf1df',
              borderLeft: '6px solid #c69a3f',
            }}
          >
            <p
              className="text-[10.5px] font-semibold uppercase tracking-[0.22em] mb-2"
              style={{ color: '#a07a18' }}
            >
              {eyebrow}
            </p>
            {title && (
              <h3
                className="text-[24px] sm:text-[26px] font-bold leading-[1.2] tracking-tight mb-3"
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  color: '#2a2a2a',
                }}
              >
                {title}
              </h3>
            )}
            <div
              className="prose-nozomi"
              style={{ color: '#2a2a2a' }}
              dangerouslySetInnerHTML={{ __html: body }}
            />
          </section>
        )
      }

      case 'table': {
        const rows = (block.content.rows as string[][] ?? [])
        const headers = rows[0] ?? []
        const bodyRows = rows.slice(1)
        const isHtml = (s: string) => /<[a-z][\s\S]*>/i.test(s ?? '')
        return (
          <div key={block.id} className="my-6 overflow-x-auto rounded-lg border border-line">
            <table className="nz-table">
              <thead>
                <tr>
                  {headers.map((h: string, i: number) => (
                    <th key={i}>
                      {isHtml(h) ? <span dangerouslySetInnerHTML={{ __html: h }} /> : h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row: string[], ri: number) => (
                  <tr key={ri}>
                    {row.map((cell: string, ci: number) => (
                      <td key={ci}>
                        {isHtml(cell) ? (
                          <span dangerouslySetInnerHTML={{ __html: cell }} />
                        ) : (
                          cell
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      case 'image': {
        const url = (block.content.url as string) || ''
        const alt = (block.content.alt as string) || ''
        const caption = (block.content.caption as string) || ''
        if (!url) return null
        return (
          <figure key={block.id} className="my-5">
            <img
              src={url}
              alt={alt}
              className="w-full rounded-lg border border-line-soft"
              loading="lazy"
            />
            {caption && (
              <figcaption className="mt-2 text-[12.5px] text-ink-muted text-center italic">
                {caption}
              </figcaption>
            )}
          </figure>
        )
      }

      case 'workbook_prompt':
        return (
          <div key={block.id}>
            <DoBlock
              label="Your response"
              question={
                (block.content.label as string) ??
                (block.content.prompt as string) ??
                ''
              }
              example={(block.content.example as string) || ''}
            >
              <textarea
                className="w-full min-h-[100px] bg-white border border-line rounded-lg px-4 py-3 text-[15px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-line-strong transition-colors resize-y leading-[1.6]"
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

      case 'completion_checklist': {
        const title = (block.content.title as string) || 'Complete before moving on'
        const subtitle = (block.content.subtitle as string) || ''
        const completionLabel = (block.content.completionLabel as string) || 'Complete before moving on'
        const groups =
          (block.content.groups as Array<{
            heading: string
            items: Array<{ label: string; hint?: string }>
          }>) ?? []

        const allItems = groups.flatMap((g, gi) =>
          (g.items ?? []).map((_, ii) => `${block.id}_g${gi}_i${ii}`),
        )
        const totalCount = allItems.length
        const checkedCount = allItems.filter((k) => checklistData[k]).length
        const allChecked = totalCount > 0 && checkedCount === totalCount

        return (
          <div
            key={block.id}
            className="my-8 rounded-2xl border border-line bg-surface overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 lg:px-8 py-6 border-b border-line-soft bg-surface-muted/50">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-accent mb-2">
                {completionLabel}
              </p>
              <h3
                className="text-ink"
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 700,
                  fontStyle: 'italic',
                  fontSize: 'clamp(22px, 2.2cqi, 28px)',
                  lineHeight: 1.1,
                  letterSpacing: '-0.025em',
                }}
              >
                {title}
              </h3>
              {subtitle && (
                <p className="mt-2 text-[14px] text-ink-soft leading-[1.55] max-w-prose">
                  {subtitle}
                </p>
              )}

              <div className="mt-5 flex items-center gap-3">
                <div className="flex-1 h-[6px] rounded-full bg-line-soft overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      allChecked ? 'bg-success' : 'bg-accent'
                    }`}
                    style={{
                      width: totalCount === 0 ? '0%' : `${(checkedCount / totalCount) * 100}%`,
                    }}
                  />
                </div>
                <span
                  className={`text-[11px] font-mono tabular-nums tracking-wider uppercase shrink-0 ${
                    allChecked ? 'text-success' : 'text-ink-muted'
                  }`}
                >
                  {allChecked ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                      All items checked
                    </span>
                  ) : (
                    <>
                      {checkedCount} / {totalCount} checked
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Groups */}
            <div className="divide-y divide-line-soft">
              {groups.map((group, gi) => (
                <div key={gi} className="px-6 lg:px-8 py-5">
                  {group.heading && (
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ink-muted mb-3">
                      {group.heading}
                    </p>
                  )}
                  <div className="space-y-1">
                    {(group.items ?? []).map((item, ii) => {
                      const key = `${block.id}_g${gi}_i${ii}`
                      const checked = checklistData[key] ?? false
                      return (
                        <label
                          key={key}
                          className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-muted/60 transition-colors cursor-pointer group -mx-3"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setChecklistData((prev) => ({ ...prev, [key]: e.target.checked }))
                            }
                            disabled={saved}
                            className="mt-[3px] w-4 h-4 rounded border-line accent-[var(--nz-accent)] cursor-pointer shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-[14px] leading-[1.5] transition-colors ${
                                checked ? 'text-ink-muted line-through' : 'text-ink group-hover:text-ink'
                              }`}
                            >
                              {item.label}
                            </p>
                            {item.hint && (
                              <p
                                className={`mt-1 text-[12.5px] leading-[1.5] ${
                                  checked ? 'text-ink-faint' : 'text-ink-soft'
                                }`}
                              >
                                {item.hint}
                              </p>
                            )}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      }

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
          <div key={block.id} className="my-5">
            {block.content.url && <VideoEmbed url={block.content.url as string} />}
          </div>
        )

      case 'structured_prompt': {
        const spFields = (block.content.fields as Array<{ key: string; label: string; prefix?: string; suffix?: string; type?: string; computed?: 'sum'; sum_of?: string[] }>) ?? []

        const parseNum = (s: string): number => {
          if (!s) return 0
          const cleaned = String(s).replace(/[^0-9.\-]/g, '')
          const n = parseFloat(cleaned)
          return isNaN(n) ? 0 : n
        }

        const resolveValue = (key: string, seen: Set<string>): number => {
          if (seen.has(key)) return 0
          seen.add(key)
          const f = spFields.find((x) => x.key === key)
          if (!f) return 0
          if (f.computed === 'sum') {
            const targets = f.sum_of ?? []
            return targets.reduce((acc, k) => acc + resolveValue(k, seen), 0)
          }
          return parseNum(workbookData[`${block.id}_${f.key}`] ?? '')
        }

        const formatNum = (n: number) =>
          n.toLocaleString(undefined, { maximumFractionDigits: 2 })

        return (
          <div key={block.id}>
            <DoBlock label={(block.content.label as string) || 'Your responses'}>
              <div className="space-y-3">
                {spFields.map((field) => {
                  const fieldKey = `${block.id}_${field.key}`
                  if (field.computed === 'sum') {
                    const sum = resolveValue(field.key, new Set())
                    return (
                      <div key={field.key} className="flex items-center gap-3">
                        <label className="text-[13px] font-semibold text-ink w-2/5 shrink-0">{field.label}</label>
                        <div className="flex-1 flex items-center gap-0 bg-surface-muted/70 border border-line rounded-lg overflow-hidden">
                          {field.prefix && (
                            <span className="pl-3 pr-1 text-[13px] text-ink-muted select-none">{field.prefix}</span>
                          )}
                          <span className="flex-1 px-3 py-2.5 text-[13px] font-semibold text-ink tabular-nums">
                            {formatNum(sum)}
                          </span>
                          {field.suffix && (
                            <span className="pr-3 pl-1 text-[13px] text-ink-muted select-none">{field.suffix}</span>
                          )}
                        </div>
                      </div>
                    )
                  }
                  return (
                    <div key={field.key} className="flex items-center gap-3">
                      <label className="text-[13px] text-ink-soft w-2/5 shrink-0">{field.label}</label>
                      <div className="flex-1 flex items-center gap-0 bg-surface border border-line rounded-lg overflow-hidden focus-within:border-accent/40 transition-colors">
                        {field.prefix && (
                          <span className="pl-3 pr-1 text-[13px] text-ink-faint select-none">{field.prefix}</span>
                        )}
                        <input
                          type="text"
                          inputMode="decimal"
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
        const ftRows = (block.content.rows as Array<{ cells: Array<{ value: string; editable: boolean; prefix?: string; suffix?: string; placeholder?: string; computed?: 'sum' }> }>) ?? []

        const parseNum = (s: string): number => {
          if (!s) return 0
          const cleaned = String(s).replace(/[^0-9.\-]/g, '')
          const n = parseFloat(cleaned)
          return isNaN(n) ? 0 : n
        }

        const computeSum = (colIdx: number, upToRow: number): number => {
          let total = 0
          for (let ri = 0; ri < upToRow; ri++) {
            const row = ftRows[ri]
            const cell = row?.cells?.[colIdx]
            if (!cell) continue
            if (cell.editable) {
              total += parseNum(workbookData[`${block.id}_r${ri}_c${colIdx}`] ?? '')
            } else if (cell.computed !== 'sum') {
              total += parseNum(cell.value)
            }
          }
          return total
        }

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
                    {ftRows.map((row, ri) => {
                      const isTotalRow = row.cells.some((c) => c.computed === 'sum')
                      return (
                        <tr
                          key={ri}
                          className={`border-b border-line-soft last:border-0 ${isTotalRow ? 'bg-surface-muted/70 font-semibold' : ''}`}
                        >
                          {row.cells.map((cell, ci) => {
                            const cellKey = `${block.id}_r${ri}_c${ci}`

                            if (cell.computed === 'sum') {
                              const sum = computeSum(ci, ri)
                              const formatted = sum.toLocaleString(undefined, { maximumFractionDigits: 2 })
                              return (
                                <td
                                  key={ci}
                                  className="px-4 py-3 text-ink border-r border-line-soft last:border-r-0 tabular-nums"
                                >
                                  {cell.prefix || ''}{formatted}{cell.suffix || ''}
                                </td>
                              )
                            }

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
                                    inputMode="decimal"
                                    className="flex-1 bg-transparent px-2 py-2 text-[13px] text-ink placeholder:text-ink-faint focus:outline-none min-w-[60px] tabular-nums"
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
                      )
                    })}
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
      <div>
        {blocks.map((block) => (
          <div key={block.id}>{renderBlock(block)}</div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <SectionRecapModal
        open={recapOpen}
        sectionTitle={section.title}
        answers={recapAnswers}
        completedAt={recapCompletedAt}
        primaryLabel={nextSectionId ? 'Next section' : 'Back to course'}
        onPrimary={() => {
          setRecapOpen(false)
          goNext()
        }}
        onClose={() => setRecapOpen(false)}
      />

      {renderBlocks()}

      {/* Complete / continue — lightweight */}
      {!editMode && (
        <div className="mt-12 pt-6 border-t border-line-soft">
          {saved ? (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-[12.5px] text-ink-soft">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-success/15 text-success">
                    <Check className="w-3 h-3" strokeWidth={2.5} />
                  </span>
                  <span>
                    Section complete
                    {recapCompletedAt && (
                      <span className="text-ink-faint">
                        {' · '}
                        {new Date(recapCompletedAt).toLocaleDateString()}
                      </span>
                    )}
                  </span>
                </div>
                {hasPrompts && (
                  <button
                    onClick={() => setRecapOpen(true)}
                    className="text-[12px] font-medium text-accent hover:text-accent-deep underline underline-offset-4 decoration-accent/40 hover:decoration-accent cursor-pointer"
                  >
                    Review responses
                  </button>
                )}
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
                  onClick={() => router.push(`/courses/${courseId}`)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink text-ink-inverted text-[13px] font-semibold hover:bg-accent transition-colors cursor-pointer"
                >
                  Back to course
                  <ArrowRight className="w-4 h-4" strokeWidth={2} />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-[12.5px] text-ink-muted">
                  {hasWorkbookPrompts
                    ? 'Fill in your responses above, then mark this section complete.'
                    : 'Ready to move on?'}
                </p>
                {hasWorkbookPrompts && autosaveStatus !== 'idle' && (
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-mono tabular-nums tracking-wider uppercase ${
                      autosaveStatus === 'error'
                        ? 'text-error'
                        : autosaveStatus === 'saving'
                          ? 'text-ink-muted'
                          : 'text-ink-faint'
                    }`}
                  >
                    {autosaveStatus === 'saving' && (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-pulse" />
                        Saving
                      </>
                    )}
                    {autosaveStatus === 'saved' && (
                      <>
                        <Check className="w-3 h-3" strokeWidth={2.5} />
                        Saved
                      </>
                    )}
                    {autosaveStatus === 'error' && 'Save failed — will retry'}
                  </span>
                )}
              </div>
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
