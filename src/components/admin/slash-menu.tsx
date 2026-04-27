'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Type,
  AlertCircle,
  Quote,
  Image as ImageIcon,
  Table as TableIcon,
  ListChecks,
  CheckSquare,
  FileText,
  Video,
  Pencil,
  Award,
  Minus,
  ArrowDownUp,
} from 'lucide-react'
import type { ContentBlock } from '@/lib/types'

export type SlashItem = {
  type: ContentBlock['type']
  label: string
  description: string
  Icon: typeof Type
}

const ITEMS: SlashItem[] = [
  { type: 'rich_text', label: 'Text', description: 'Plain paragraph text', Icon: Type },
  { type: 'callout', label: 'Callout', description: 'Tip, warning, or formula', Icon: AlertCircle },
  { type: 'quote', label: 'Quote', description: 'Italic pull-quote with attribution', Icon: Quote },
  { type: 'bucket', label: 'Bucket', description: 'Parchment card with eyebrow + title', Icon: Award },
  { type: 'image', label: 'Image', description: 'Single image with caption', Icon: ImageIcon },
  { type: 'table', label: 'Table', description: 'Editorial table with rich cells', Icon: TableIcon },
  { type: 'workbook_prompt', label: 'Workbook prompt', description: 'Question with text answer', Icon: Pencil },
  { type: 'checklist', label: 'Checklist', description: 'List of checkboxes', Icon: ListChecks },
  { type: 'completion_checklist', label: 'Completion checklist', description: 'Grouped check-before-moving-on', Icon: CheckSquare },
  { type: 'file', label: 'File', description: 'Downloadable attachment', Icon: FileText },
  { type: 'video', label: 'Video', description: 'YouTube or Vimeo embed', Icon: Video },
  { type: 'spacer', label: 'Spacer', description: 'Vertical breathing room (S/M/L/XL)', Icon: ArrowDownUp },
  { type: 'divider', label: 'Divider', description: 'Hairline rule between sections', Icon: Minus },
]

type Props = {
  rect: { top: number; left: number; bottom: number } | null
  query: string
  onSelect: (item: SlashItem) => void
  onClose: () => void
}

export function SlashMenu({ rect, query, onSelect, onClose }: Props) {
  const filtered = query
    ? ITEMS.filter((i) =>
        i.label.toLowerCase().includes(query.toLowerCase()) ||
        i.type.includes(query.toLowerCase()),
      )
    : ITEMS
  const [active, setActive] = useState(0)

  useEffect(() => setActive(0), [query])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActive((a) => (a + 1) % Math.max(filtered.length, 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActive((a) => (a - 1 + filtered.length) % Math.max(filtered.length, 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[active]) onSelect(filtered[active])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [active, filtered, onSelect, onClose])

  if (!rect) return null
  if (filtered.length === 0) return null

  return createPortal(
    <div
      className="fixed z-[60] w-72 bg-surface border border-line rounded-xl shadow-xl py-1 max-h-80 overflow-y-auto"
      style={{ top: rect.bottom + 6, left: rect.left }}
    >
      {filtered.map((item, i) => {
        const isActive = i === active
        return (
          <button
            key={item.type}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(item)}
            onMouseEnter={() => setActive(i)}
            className={`flex items-start gap-3 w-full px-3 py-2 text-left transition-colors ${
              isActive ? 'bg-accent-soft/60' : 'hover:bg-surface-muted'
            }`}
          >
            <div className="w-7 h-7 rounded-md bg-surface-muted border border-line-soft flex items-center justify-center shrink-0">
              <item.Icon className="w-3.5 h-3.5 text-ink-soft" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-ink leading-tight">{item.label}</p>
              <p className="text-[11.5px] text-ink-muted leading-tight mt-0.5 truncate">
                {item.description}
              </p>
            </div>
          </button>
        )
      })}
    </div>,
    document.body,
  )
}
