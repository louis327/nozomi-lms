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
} from 'lucide-react'

interface ContentBlock {
  id: string
  type: 'rich_text' | 'callout' | 'table' | 'workbook_prompt' | 'checklist' | 'file'
  content: Record<string, unknown>
  sort_order: number
}

interface BlockEditorProps {
  block: ContentBlock
  onChange: (content: Record<string, unknown>) => void
  onDelete: () => void
  dragHandleProps?: Record<string, unknown>
}

const calloutTypes = [
  { value: 'tip', label: 'Tip', icon: Lightbulb, color: 'text-nz-info', bg: 'bg-nz-info/10', border: 'border-nz-info/30' },
  { value: 'warning', label: 'Warning', icon: AlertTriangle, color: 'text-nz-warning', bg: 'bg-nz-warning/10', border: 'border-nz-warning/30' },
  { value: 'formula', label: 'Formula', icon: Calculator, color: 'text-nz-sakura', bg: 'bg-nz-sakura/10', border: 'border-nz-sakura/30' },
  { value: 'key-insight', label: 'Key Insight', icon: KeyRound, color: 'text-nz-success', bg: 'bg-nz-success/10', border: 'border-nz-success/30' },
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
  const calloutType = (block.content.calloutType as string) || 'tip'
  const title = (block.content.title as string) || ''
  const body = (block.content.body as string) || ''
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
              <tr key={ri} className={ri === 0 ? 'bg-nz-bg-elevated/50' : ''}>
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
        value={(block.content.label as string) || ''}
        onChange={(e) => onChange({ ...block.content, label: e.target.value })}
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

  return (
    <div className="space-y-2">
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

function FileUploadBlock({ block, onChange }: { block: ContentBlock; onChange: (c: Record<string, unknown>) => void }) {
  const [uploading, setUploading] = useState(false)
  const fileUrl = (block.content.fileUrl as string) || ''
  const label = (block.content.label as string) || ''

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      onChange({ ...block.content, fileUrl: data.url, fileName: file.name })
    } catch {
      // Silent fail
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
    </div>
  )
}

const blockTypeLabels: Record<string, string> = {
  rich_text: 'Rich Text',
  callout: 'Callout',
  table: 'Table',
  workbook_prompt: 'Workbook Prompt',
  checklist: 'Checklist',
  file: 'File Upload',
}

export function BlockEditor({ block, onChange, onDelete, dragHandleProps }: BlockEditorProps) {
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
      case 'file':
        return <FileUploadBlock block={block} onChange={onChange} />
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
