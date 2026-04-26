'use client'

import { useRef, useState } from 'react'
import { GripVertical, Plus, MoreHorizontal } from 'lucide-react'
import { BlockActionsMenu } from '@/components/course/block-actions-menu'
import type { ContentBlock } from '@/lib/types'

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

type Props = {
  block: ContentBlock
  canMoveUp: boolean
  canMoveDown: boolean
  dragAttributes: Record<string, unknown>
  dragListeners: Record<string, unknown> | undefined
  setDragRef: (el: HTMLButtonElement | null) => void
  onInsertAfter: (type: ContentBlock['type']) => void
  onDuplicate: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onConvert: (type: 'rich_text' | 'callout' | 'quote') => void
  onCopyLink: () => void
}

export function BlockGutter({
  block,
  canMoveUp,
  canMoveDown,
  dragAttributes,
  dragListeners,
  setDragRef,
  onInsertAfter,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onConvert,
  onCopyLink,
}: Props) {
  const [insertOpen, setInsertOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [actionsRect, setActionsRect] = useState<DOMRect | null>(null)
  const insertBtnRef = useRef<HTMLButtonElement>(null)
  const actionsBtnRef = useRef<HTMLButtonElement>(null)
  const insertMenuRef = useRef<HTMLDivElement>(null)

  // Click-outside for insert menu
  const handleInsertOpen = () => {
    setInsertOpen(true)
    setTimeout(() => {
      const close = (e: MouseEvent) => {
        if (insertMenuRef.current && !insertMenuRef.current.contains(e.target as Node)) {
          setInsertOpen(false)
          document.removeEventListener('mousedown', close)
        }
      }
      document.addEventListener('mousedown', close)
    }, 0)
  }

  const handleActionsOpen = () => {
    if (actionsBtnRef.current) {
      setActionsRect(actionsBtnRef.current.getBoundingClientRect())
    }
    setActionsOpen(true)
  }

  return (
    <div className="absolute -left-12 top-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
      {/* + insert after */}
      <div className="relative">
        <button
          ref={insertBtnRef}
          type="button"
          onClick={handleInsertOpen}
          title="Add block below"
          className="w-5 h-5 rounded-md flex items-center justify-center text-ink-faint hover:text-ink hover:bg-surface-muted transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.25} />
        </button>
        {insertOpen && (
          <div
            ref={insertMenuRef}
            className="absolute left-0 top-full mt-1 z-30 w-44 bg-surface border border-line rounded-xl shadow-xl overflow-hidden py-1"
          >
            {blockTypeOptions.map((bt) => (
              <button
                key={bt.type}
                type="button"
                onClick={() => {
                  onInsertAfter(bt.type)
                  setInsertOpen(false)
                }}
                className="block w-full px-3 py-1.5 text-left text-[12.5px] text-ink-soft hover:text-ink hover:bg-surface-muted transition-colors cursor-pointer"
              >
                {bt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* drag handle */}
      <button
        ref={setDragRef}
        {...dragAttributes}
        {...dragListeners}
        type="button"
        title="Drag to reorder"
        className="w-5 h-5 rounded-md flex items-center justify-center text-ink-faint hover:text-ink hover:bg-surface-muted transition-colors cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-3.5 h-3.5" strokeWidth={2.25} />
      </button>

      {/* ⋯ actions */}
      <button
        ref={actionsBtnRef}
        type="button"
        onClick={handleActionsOpen}
        title="Block actions"
        className="w-5 h-5 rounded-md flex items-center justify-center text-ink-faint hover:text-ink hover:bg-surface-muted transition-colors cursor-pointer"
      >
        <MoreHorizontal className="w-3.5 h-3.5" strokeWidth={2.25} />
      </button>

      {actionsOpen && (
        <BlockActionsMenu
          block={block}
          anchorRect={actionsRect}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          onClose={() => setActionsOpen(false)}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onConvert={onConvert}
          onCopyLink={onCopyLink}
        />
      )}
    </div>
  )
}
