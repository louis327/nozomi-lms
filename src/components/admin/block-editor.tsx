'use client'

import { useState } from 'react'
import { RichTextEditor } from './rich-text-editor'
import {
  Trash2,
  GripVertical,
  AlertTriangle,
  Lightbulb,
  Calculator,
  KeyRound,
  Plus,
  Minus,
  Copy,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'

interface ContentBlock {
  id: string
  type: 'rich_text' | 'callout' | 'table' | 'workbook_prompt' | 'checklist' | 'completion_checklist' | 'file' | 'video' | 'structured_prompt' | 'fillable_table'
  content: Record<string, unknown>
  sort_order: number
}

interface BlockEditorProps {
  block: ContentBlock
  onChange: (content: Record<string, unknown>) => void
  onDelete: () => void
  onDuplicate?: () => void
  dragHandleProps?: Record<string, unknown>
}

const calloutTypes = [
  { value: 'tip', label: 'Tip', icon: Lightbulb, color: 'text-nz-info', bg: 'bg-blue-50', border: 'border-blue-200' },
  { value: 'warning', label: 'Warning', icon: AlertTriangle, color: 'text-nz-warning', bg: 'bg-amber-50', border: 'border-amber-200' },
  { value: 'formula', label: 'Formula', icon: Calculator, color: 'text-nz-sakura', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { value: 'key-insight', label: 'Key Insight', icon: KeyRound, color: 'text-nz-success', bg: 'bg-emerald-50', border: 'border-emerald-200' },
]

function RichTextBlock({ block, onChange }: { block: ContentBlock; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <RichTextEditor
      content={(block.content.html as string) || ''}
      onChange={(html) => onChange({ html })}
      placeholder="Write your content..."
    />
  )
}

function CalloutBlock({ block, onChange }: { block: ContentBlock; onChange: (c: Record<string, unknown>) => void }) {
  const calloutType = (block.content.calloutType as string) || (block.content.callout_type as string) || 'tip'
  const title = (block.content.title as string) || ''
  const body = (block.content.body as string) || (block.content.html as string) || ''
  const ct = calloutTypes.find((c) => c.value === calloutType) ?? calloutTypes[0]

  return (
    <div className={`rounded-xl border ${ct.border} ${ct.bg} p-4 space-y-3`}>
      <div className="flex items-center gap-3">
        {/* Type selector */}
        <select
          value={calloutType}
          onChange={(e) => onChange({ ...block.content, calloutType: e.target.value })}
          className="bg-transparent border border-nz-border rounded-lg px-2 py-1 text-xs text-nz-text-secondary focus:outline-none"
        >
          {calloutTypes.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={title}
          onChange={(e) => onChange({ ...block.content, title: e.target.value })}
          placeholder="Callout title..."
          className={`flex-1 bg-transparent text-sm font-heading font-semibold ${ct.color} placeholder:text-nz-text-muted focus:outline-none`}
        />
      </div>
      <RichTextEditor
        content={body}
        onChange={(html) => onChange({ ...block.content, body: html })}
        placeholder="Callout content..."
      />
    </div>
  )
}

function TableBlock({ block, onChange }: { block: ContentBlock; onChange: (c: Record<string, unknown>) => void }) {
  const rows = (block.content.rows as string[][]) || [['', ''], ['', '']]

  const updateCell = (rowIdx: number, colIdx: number, value: string) => {
    const newRows = rows.map((r, ri) =>
      ri === rowIdx ? r.map((c, ci) => (ci === colIdx ? value : c)) : [...r]
    )
    onChange({ ...block.content, rows: newRows })
  }

  const addRow = () => {
    const cols = rows[0]?.length || 2
    onChange({ ...block.content, rows: [...rows, new Array(cols).fill('')] })
  }

  const removeRow = () => {
    if (rows.length <= 1) return
    onChange({ ...block.content, rows: rows.slice(0, -1) })
  }

  const addCol = () => {
    onChange({ ...block.content, rows: rows.map((r) => [...r, '']) })
  }

  const removeCol = () => {
    if ((rows[0]?.length || 0) <= 1) return
    onChange({ ...block.content, rows: rows.map((r) => r.slice(0, -1)) })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={addRow} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-nz-text-tertiary hover:text-nz-text-primary hover:bg-nz-bg-elevated transition-colors cursor-pointer">
          <Plus className="w-3 h-3" /> Row
        </button>
        <button onClick={removeRow} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-nz-text-tertiary hover:text-nz-error hover:bg-nz-error/10 transition-colors cursor-pointer">
          <Minus className="w-3 h-3" /> Row
        </button>
        <button onClick={addCol} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-nz-text-tertiary hover:text-nz-text-primary hover:bg-nz-bg-elevated transition-colors cursor-pointer">
          <Plus className="w-3 h-3" /> Col
        </button>
        <button onClick={removeCol} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-nz-text-tertiary hover:text-nz-error hover:bg-nz-error/10 transition-colors cursor-pointer">
          <Minus className="w-3 h-3" /> Col
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-nz-border">
        <table className="w-full">
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className={ri === 0 ? 'bg-nz-bg-elevated' : ''}>
                {ri === 0 && (
                  <td className="border border-nz-border/50 p-0 w-0">
                    <span className="block px-2 py-2 text-[10px] uppercase tracking-wider text-nz-text-muted font-semibold whitespace-nowrap">Header Row</span>
                  </td>
                )}
                {ri !== 0 && (
                  <td className="border border-nz-border/50 p-0 w-0" />
                )}
                {row.map((cell, ci) => (
                  <td key={ci} className="border border-nz-border/50 p-0">
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => updateCell(ri, ci, e.target.value)}
                      className={`w-full px-3 py-2 bg-transparent text-sm focus:outline-none focus:bg-nz-bg-elevated/30 ${
                        ri === 0
                          ? 'text-nz-text-primary font-semibold'
                          : 'text-nz-text-secondary'
                      }`}
                      placeholder={ri === 0 ? 'Header' : 'Cell'}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function WorkbookPromptBlock({ block, onChange }: { block: ContentBlock; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-3">
      <input
        type="text"
        value={(block.content.label as string) || (block.content.prompt as string) || ''}
        onChange={(e) => onChange({ ...block.content, label: e.target.value, prompt: e.target.value })}
        placeholder="Question / prompt label..."
        className="w-full px-4 py-2 rounded-xl bg-nz-bg-tertiary border border-nz-border text-sm text-nz-text-primary placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40 transition-colors"
      />
      <input
        type="text"
        value={(block.content.placeholder as string) || ''}
        onChange={(e) => onChange({ ...block.content, placeholder: e.target.value })}
        placeholder="Placeholder text for the student's input..."
        className="w-full px-4 py-2 rounded-xl bg-nz-bg-tertiary border border-nz-border text-sm text-nz-text-tertiary placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40 transition-colors"
      />
      <p className="text-xs text-nz-text-muted">Students will see a text area to answer this prompt in their workbook.</p>
    </div>
  )
}

function ChecklistBlock({ block, onChange }: { block: ContentBlock; onChange: (c: Record<string, unknown>) => void }) {
  const items = (block.content.items as string[]) || ['']

  const updateItem = (idx: number, value: string) => {
    const newItems = items.map((item, i) => (i === idx ? value : item))
    onChange({ ...block.content, items: newItems })
  }

  const addItem = () => {
    onChange({ ...block.content, items: [...items, ''] })
  }

  const removeItem = (idx: number) => {
    if (items.length <= 1) return
    onChange({ ...block.content, items: items.filter((_, i) => i !== idx) })
  }

  const title = (block.content.title as string) || ''
  const description = (block.content.description as string) || ''

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={title}
        onChange={(e) => onChange({ ...block.content, title: e.target.value })}
        placeholder="Checklist title (e.g., 'Module Deliverables')"
        className="w-full px-4 py-2 rounded-xl bg-nz-bg-tertiary border border-nz-border text-sm font-heading font-semibold text-nz-text-primary placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40 transition-colors"
      />
      <input
        type="text"
        value={description}
        onChange={(e) => onChange({ ...block.content, description: e.target.value })}
        placeholder="Description (optional)"
        className="w-full px-3 py-1.5 rounded-lg bg-transparent border-none text-xs text-nz-text-tertiary placeholder:text-nz-text-muted focus:outline-none"
      />
      <p className="text-xs text-nz-text-muted">These become module deliverables that students check off.</p>
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-nz-border flex-shrink-0" />
          <input
            type="text"
            value={item}
            onChange={(e) => updateItem(idx, e.target.value)}
            placeholder="Checklist item..."
            className="flex-1 px-3 py-2 rounded-lg bg-nz-bg-tertiary border border-nz-border text-sm text-nz-text-primary placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40 transition-colors"
          />
          <button
            onClick={() => removeItem(idx)}
            className="p-1.5 rounded-lg text-nz-text-muted hover:text-nz-error hover:bg-nz-error/10 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button
        onClick={addItem}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-nz-sakura/70 hover:text-nz-sakura hover:bg-nz-sakura/5 transition-colors cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Item
      </button>
    </div>
  )
}

type CCItem = { label: string; hint?: string }
type CCGroup = { heading: string; items: CCItem[] }

function CompletionChecklistBlock({
  block,
  onChange,
}: {
  block: ContentBlock
  onChange: (c: Record<string, unknown>) => void
}) {
  const title = (block.content.title as string) || ''
  const subtitle = (block.content.subtitle as string) || ''
  const completionLabel = (block.content.completionLabel as string) || 'Complete before moving on'
  const groups = ((block.content.groups as CCGroup[]) || []).map((g) => ({
    heading: g.heading ?? '',
    items: (g.items ?? []).map((i) => ({ label: i.label ?? '', hint: i.hint ?? '' })),
  }))

  const setGroups = (next: CCGroup[]) => onChange({ ...block.content, groups: next })

  const updateGroup = (gi: number, patch: Partial<CCGroup>) => {
    setGroups(groups.map((g, i) => (i === gi ? { ...g, ...patch } : g)))
  }

  const addGroup = () => {
    setGroups([...groups, { heading: 'New group', items: [{ label: '', hint: '' }] }])
  }

  const removeGroup = (gi: number) => {
    if (groups.length <= 1) return
    setGroups(groups.filter((_, i) => i !== gi))
  }

  const updateItem = (gi: number, ii: number, patch: Partial<CCItem>) => {
    const nextGroups = groups.map((g, i) => {
      if (i !== gi) return g
      return {
        ...g,
        items: g.items.map((item, j) => (j === ii ? { ...item, ...patch } : item)),
      }
    })
    setGroups(nextGroups)
  }

  const addItem = (gi: number) => {
    const nextGroups = groups.map((g, i) =>
      i === gi ? { ...g, items: [...g.items, { label: '', hint: '' }] } : g,
    )
    setGroups(nextGroups)
  }

  const removeItem = (gi: number, ii: number) => {
    const nextGroups = groups.map((g, i) => {
      if (i !== gi) return g
      if (g.items.length <= 1) return g
      return { ...g, items: g.items.filter((_, j) => j !== ii) }
    })
    setGroups(nextGroups)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <input
          type="text"
          value={title}
          onChange={(e) => onChange({ ...block.content, title: e.target.value })}
          placeholder="Checklist title (e.g. 'Fundraising Goals and Blueprint')"
          className="w-full px-4 py-2 rounded-xl bg-nz-bg-tertiary border border-nz-border text-sm font-heading font-semibold text-nz-text-primary placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40 transition-colors"
        />
        <input
          type="text"
          value={subtitle}
          onChange={(e) => onChange({ ...block.content, subtitle: e.target.value })}
          placeholder="Subtitle (optional)"
          className="w-full px-3 py-2 rounded-lg bg-nz-bg-tertiary border border-nz-border text-xs text-nz-text-secondary placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40 transition-colors"
        />
        <input
          type="text"
          value={completionLabel}
          onChange={(e) => onChange({ ...block.content, completionLabel: e.target.value })}
          placeholder="Completion label (shown above the title)"
          className="w-full px-3 py-1.5 rounded-lg bg-transparent border-none text-xs text-nz-text-tertiary placeholder:text-nz-text-muted focus:outline-none"
        />
      </div>

      <div className="space-y-3">
        {groups.map((group, gi) => (
          <div key={gi} className="rounded-xl border border-nz-border/60 bg-nz-bg-secondary/40 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={group.heading}
                onChange={(e) => updateGroup(gi, { heading: e.target.value })}
                placeholder="Group heading (e.g. 'THE NUMBERS')"
                className="flex-1 px-3 py-1.5 rounded-lg bg-nz-bg-tertiary border border-nz-border text-xs font-semibold uppercase tracking-[0.16em] text-nz-text-secondary placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40 transition-colors"
              />
              <button
                onClick={() => removeGroup(gi)}
                disabled={groups.length <= 1}
                className="p-1.5 rounded-lg text-nz-text-muted hover:text-nz-error hover:bg-nz-error/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title="Remove group"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 pl-1">
              {group.items.map((item, ii) => (
                <div key={ii} className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded border border-nz-border shrink-0 mt-2" />
                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => updateItem(gi, ii, { label: e.target.value })}
                      placeholder="Checklist item…"
                      className="w-full px-3 py-2 rounded-lg bg-nz-bg-tertiary border border-nz-border text-sm text-nz-text-primary placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40 transition-colors"
                    />
                    <input
                      type="text"
                      value={item.hint ?? ''}
                      onChange={(e) => updateItem(gi, ii, { hint: e.target.value })}
                      placeholder="Clarifying hint (optional)"
                      className="w-full px-3 py-1.5 rounded-lg bg-transparent border border-dashed border-nz-border/50 text-xs text-nz-text-tertiary placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40"
                    />
                  </div>
                  <button
                    onClick={() => removeItem(gi, ii)}
                    disabled={group.items.length <= 1}
                    className="p-1.5 rounded-lg text-nz-text-muted hover:text-nz-error hover:bg-nz-error/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed mt-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addItem(gi)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs text-nz-sakura/70 hover:text-nz-sakura hover:bg-nz-sakura/5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add item
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addGroup}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-nz-sakura hover:bg-nz-sakura/10 transition-colors cursor-pointer border border-dashed border-nz-border hover:border-nz-sakura/40 w-full justify-center"
      >
        <Plus className="w-3.5 h-3.5" />
        Add group
      </button>
    </div>
  )
}

function FileUploadBlock({ block, onChange }: { block: ContentBlock; onChange: (c: Record<string, unknown>) => void }) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileUrl = (block.content.fileUrl as string) || ''
  const label = (block.content.label as string) || ''

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      onChange({ ...block.content, fileUrl: data.url, fileName: file.name })
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={label}
        onChange={(e) => onChange({ ...block.content, label: e.target.value })}
        placeholder="File label / description..."
        className="w-full px-4 py-2 rounded-xl bg-nz-bg-tertiary border border-nz-border text-sm text-nz-text-primary placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40 transition-colors"
      />
      {fileUrl ? (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-nz-bg-tertiary border border-nz-border">
          <span className="flex-1 text-sm text-nz-text-secondary truncate">
            {(block.content.fileName as string) || fileUrl}
          </span>
          <button
            onClick={() => onChange({ ...block.content, fileUrl: '', fileName: '' })}
            className="text-xs text-nz-error hover:underline cursor-pointer"
          >
            Remove
          </button>
        </div>
      ) : (
        <label className="flex items-center justify-center w-full py-6 rounded-xl border-2 border-dashed border-nz-border hover:border-nz-sakura/40 bg-nz-bg-tertiary cursor-pointer transition-colors">
          <input type="file" onChange={handleUpload} className="hidden" />
          <span className="text-sm text-nz-text-tertiary">
            {uploading ? 'Uploading...' : 'Click to upload file'}
          </span>
        </label>
      )}
      {uploadError && (
        <p className="text-xs text-nz-error bg-nz-error/10 px-3 py-2 rounded-lg">{uploadError}</p>
      )}
    </div>
  )
}

function VideoBlock({ block, onChange }: { block: ContentBlock; onChange: (c: Record<string, unknown>) => void }) {
  const url = (block.content.url as string) || ''

  return (
    <div className="space-y-3">
      <input
        type="url"
        value={url}
        onChange={(e) => onChange({ ...block.content, url: e.target.value })}
        placeholder="https://www.youtube.com/watch?v=... or Vimeo URL"
        className="w-full px-4 py-3 rounded-xl bg-nz-bg-tertiary border border-nz-border text-nz-text-primary placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40 transition-colors"
      />
      {url && (
        <p className="text-xs text-nz-text-muted truncate">Current: {url}</p>
      )}
    </div>
  )
}

interface StructuredField {
  key: string
  label: string
  prefix: string
  type: string
}

function StructuredPromptBlock({ block, onChange }: { block: ContentBlock; onChange: (c: Record<string, unknown>) => void }) {
  const label = (block.content.label as string) || ''
  const fields = (block.content.fields as StructuredField[]) || [{ key: 'field_1', label: '', prefix: '', type: 'text' }]

  const updateField = (idx: number, patch: Partial<StructuredField>) => {
    const newFields = fields.map((f, i) => (i === idx ? { ...f, ...patch } : f))
    // Auto-generate key from label if label changed
    if (patch.label !== undefined) {
      newFields[idx].key = patch.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `field_${idx + 1}`
    }
    onChange({ ...block.content, fields: newFields })
  }

  const addField = () => {
    const newFields = [...fields, { key: `field_${fields.length + 1}`, label: '', prefix: '', type: 'text' }]
    onChange({ ...block.content, fields: newFields })
  }

  const removeField = (idx: number) => {
    if (fields.length <= 1) return
    onChange({ ...block.content, fields: fields.filter((_, i) => i !== idx) })
  }

  const moveField = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= fields.length) return
    const newFields = [...fields]
    const temp = newFields[idx]
    newFields[idx] = newFields[target]
    newFields[target] = temp
    onChange({ ...block.content, fields: newFields })
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={label}
        onChange={(e) => onChange({ ...block.content, label: e.target.value })}
        placeholder="Overall prompt label (e.g. 'Operating plan')"
        className="w-full px-4 py-2 rounded-xl bg-nz-bg-tertiary border border-nz-border text-sm text-nz-text-primary placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40 transition-colors"
      />
      <p className="text-xs text-nz-text-muted">Each field becomes a labeled input for the student.</p>
      <div className="space-y-2">
        {fields.map((field, idx) => (
          <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-nz-bg-tertiary/50 border border-nz-border/50">
            <div className="flex flex-col gap-0.5">
              <button onClick={() => moveField(idx, -1)} disabled={idx === 0} className="p-0.5 text-nz-text-muted hover:text-nz-text-primary disabled:opacity-30 cursor-pointer disabled:cursor-default">
                <ArrowUp className="w-3 h-3" />
              </button>
              <button onClick={() => moveField(idx, 1)} disabled={idx === fields.length - 1} className="p-0.5 text-nz-text-muted hover:text-nz-text-primary disabled:opacity-30 cursor-pointer disabled:cursor-default">
                <ArrowDown className="w-3 h-3" />
              </button>
            </div>
            <input
              type="text"
              value={field.label}
              onChange={(e) => updateField(idx, { label: e.target.value })}
              placeholder="Field label"
              className="flex-1 px-3 py-1.5 rounded-lg bg-nz-bg-primary border border-nz-border text-sm text-nz-text-primary placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40 transition-colors"
            />
            <input
              type="text"
              value={field.key}
              onChange={(e) => updateField(idx, { key: e.target.value })}
              placeholder="key"
              className="w-28 px-2 py-1.5 rounded-lg bg-nz-bg-primary border border-nz-border text-xs font-mono text-nz-text-tertiary placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40 transition-colors"
            />
            <input
              type="text"
              value={field.prefix}
              onChange={(e) => updateField(idx, { prefix: e.target.value })}
              placeholder="$"
              className="w-12 px-2 py-1.5 rounded-lg bg-nz-bg-primary border border-nz-border text-xs text-nz-text-tertiary text-center placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40 transition-colors"
            />
            <button
              onClick={() => removeField(idx)}
              className="p-1.5 rounded-lg text-nz-text-muted hover:text-nz-error hover:bg-nz-error/10 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={addField}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-nz-sakura/70 hover:text-nz-sakura hover:bg-nz-sakura/5 transition-colors cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Field
      </button>
    </div>
  )
}

interface FillableCell {
  value: string
  editable: boolean
  prefix?: string
  suffix?: string
  placeholder?: string
}

interface FillableRow {
  cells: FillableCell[]
}

function FillableTableBlock({ block, onChange }: { block: ContentBlock; onChange: (c: Record<string, unknown>) => void }) {
  const label = (block.content.label as string) || ''
  const columns = (block.content.columns as string[]) || ['Label', 'Value']
  const rows = (block.content.rows as FillableRow[]) || [{ cells: [{ value: '', editable: false }, { value: '', editable: true }] }]

  const updateColumn = (idx: number, value: string) => {
    const newCols = columns.map((c, i) => (i === idx ? value : c))
    onChange({ ...block.content, columns: newCols })
  }

  const addColumn = () => {
    const newCols = [...columns, '']
    const newRows = rows.map((r) => ({
      cells: [...r.cells, { value: '', editable: true }],
    }))
    onChange({ ...block.content, columns: newCols, rows: newRows })
  }

  const removeColumn = () => {
    if (columns.length <= 1) return
    const newCols = columns.slice(0, -1)
    const newRows = rows.map((r) => ({
      cells: r.cells.slice(0, -1),
    }))
    onChange({ ...block.content, columns: newCols, rows: newRows })
  }

  const updateCell = (ri: number, ci: number, patch: Partial<FillableCell>) => {
    const newRows = rows.map((r, rIdx) => {
      if (rIdx !== ri) return r
      return {
        cells: r.cells.map((c, cIdx) => (cIdx === ci ? { ...c, ...patch } : c)),
      }
    })
    onChange({ ...block.content, rows: newRows })
  }

  const addRow = () => {
    const newRow: FillableRow = {
      cells: columns.map(() => ({ value: '', editable: true })),
    }
    onChange({ ...block.content, rows: [...rows, newRow] })
  }

  const removeRow = () => {
    if (rows.length <= 1) return
    onChange({ ...block.content, rows: rows.slice(0, -1) })
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={label}
        onChange={(e) => onChange({ ...block.content, label: e.target.value })}
        placeholder="Instruction label (e.g. 'Fill in each bucket')"
        className="w-full px-4 py-2 rounded-xl bg-nz-bg-tertiary border border-nz-border text-sm text-nz-text-primary placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40 transition-colors"
      />
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={addRow} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-nz-text-tertiary hover:text-nz-text-primary hover:bg-nz-bg-elevated transition-colors cursor-pointer">
          <Plus className="w-3 h-3" /> Row
        </button>
        <button onClick={removeRow} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-nz-text-tertiary hover:text-nz-error hover:bg-nz-error/10 transition-colors cursor-pointer">
          <Minus className="w-3 h-3" /> Row
        </button>
        <button onClick={addColumn} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-nz-text-tertiary hover:text-nz-text-primary hover:bg-nz-bg-elevated transition-colors cursor-pointer">
          <Plus className="w-3 h-3" /> Col
        </button>
        <button onClick={removeColumn} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-nz-text-tertiary hover:text-nz-error hover:bg-nz-error/10 transition-colors cursor-pointer">
          <Minus className="w-3 h-3" /> Col
        </button>
      </div>
      {/* Column headers */}
      <div className="flex gap-2">
        {columns.map((col, ci) => (
          <input
            key={ci}
            type="text"
            value={col}
            onChange={(e) => updateColumn(ci, e.target.value)}
            placeholder="Column header"
            className="flex-1 px-3 py-1.5 rounded-lg bg-nz-bg-elevated border border-nz-border text-xs font-semibold text-nz-text-primary placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40 transition-colors"
          />
        ))}
      </div>
      {/* Rows */}
      <div className="space-y-2">
        {rows.map((row, ri) => (
          <div key={ri} className="flex gap-2 items-start p-2 rounded-lg bg-nz-bg-tertiary/30 border border-nz-border/40">
            <span className="text-[10px] text-nz-text-muted font-mono mt-2 w-6 shrink-0">R{ri + 1}</span>
            <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
              {row.cells.map((cell, ci) => (
                <div key={ci} className="space-y-1">
                  <input
                    type="text"
                    value={cell.value}
                    onChange={(e) => updateCell(ri, ci, { value: e.target.value })}
                    placeholder="Cell value"
                    className="w-full px-2 py-1 rounded bg-nz-bg-primary border border-nz-border text-xs text-nz-text-primary placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40 transition-colors"
                  />
                  <div className="flex items-center gap-1">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cell.editable}
                        onChange={(e) => updateCell(ri, ci, { editable: e.target.checked })}
                        className="w-3 h-3 rounded accent-nz-sakura cursor-pointer"
                      />
                      <span className="text-[10px] text-nz-text-muted">Editable</span>
                    </label>
                    <input
                      type="text"
                      value={cell.prefix || ''}
                      onChange={(e) => updateCell(ri, ci, { prefix: e.target.value })}
                      placeholder="pfx"
                      className="w-8 px-1 py-0.5 rounded bg-nz-bg-primary border border-nz-border text-[10px] text-nz-text-muted text-center focus:outline-none"
                    />
                    <input
                      type="text"
                      value={cell.suffix || ''}
                      onChange={(e) => updateCell(ri, ci, { suffix: e.target.value })}
                      placeholder="sfx"
                      className="w-8 px-1 py-0.5 rounded bg-nz-bg-primary border border-nz-border text-[10px] text-nz-text-muted text-center focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-nz-text-muted">Mark cells as &quot;Editable&quot; for student input. Non-editable cells show fixed text.</p>
    </div>
  )
}

const blockTypeLabels: Record<string, string> = {
  rich_text: 'Rich Text',
  callout: 'Callout',
  table: 'Table',
  workbook_prompt: 'Workbook Prompt',
  checklist: 'Checklist',
  completion_checklist: 'Completion checklist',
  file: 'File Upload',
  video: 'Video',
  structured_prompt: 'Structured Prompt',
  fillable_table: 'Fillable Table',
}

export function BlockEditor({ block, onChange, onDelete, onDuplicate, dragHandleProps }: BlockEditorProps) {
  const renderEditor = () => {
    switch (block.type) {
      case 'rich_text':
        return <RichTextBlock block={block} onChange={onChange} />
      case 'callout':
        return <CalloutBlock block={block} onChange={onChange} />
      case 'table':
        return <TableBlock block={block} onChange={onChange} />
      case 'workbook_prompt':
        return <WorkbookPromptBlock block={block} onChange={onChange} />
      case 'checklist':
        return <ChecklistBlock block={block} onChange={onChange} />
      case 'completion_checklist':
        return <CompletionChecklistBlock block={block} onChange={onChange} />
      case 'file':
        return <FileUploadBlock block={block} onChange={onChange} />
      case 'video':
        return <VideoBlock block={block} onChange={onChange} />
      case 'structured_prompt':
        return <StructuredPromptBlock block={block} onChange={onChange} />
      case 'fillable_table':
        return <FillableTableBlock block={block} onChange={onChange} />
      default:
        return <p className="text-sm text-nz-text-tertiary">Unknown block type</p>
    }
  }

  return (
    <div className="bg-nz-bg-card border border-nz-border rounded-2xl overflow-hidden group">
      {/* Block header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-nz-border/50 bg-nz-bg-elevated/20">
        <button {...(dragHandleProps || {})} className="cursor-grab active:cursor-grabbing text-nz-text-muted hover:text-nz-text-tertiary">
          <GripVertical className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold text-nz-text-tertiary uppercase tracking-wider">
          {blockTypeLabels[block.type] || block.type}
        </span>
        <div className="flex-1" />
        {onDuplicate && (
          <button
            onClick={onDuplicate}
            className="p-1.5 rounded-lg text-nz-text-muted hover:text-nz-sakura hover:bg-nz-sakura/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
            title="Duplicate block"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-nz-text-muted hover:text-nz-error hover:bg-nz-error/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Block content */}
      <div className="p-4">{renderEditor()}</div>
    </div>
  )
}
