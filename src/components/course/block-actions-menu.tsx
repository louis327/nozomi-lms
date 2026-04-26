'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Link2,
  Repeat,
  Trash2,
  Type,
  AlertCircle,
  Quote,
} from 'lucide-react'
import type { ContentBlock } from '@/lib/types'

type ConvertTarget = 'rich_text' | 'callout' | 'quote'

const CONVERTIBLE: ContentBlock['type'][] = ['rich_text', 'callout', 'quote']

const CONVERT_OPTIONS: { type: ConvertTarget; label: string; Icon: typeof Type }[] = [
  { type: 'rich_text', label: 'Rich text', Icon: Type },
  { type: 'callout', label: 'Callout', Icon: AlertCircle },
  { type: 'quote', label: 'Quote', Icon: Quote },
]

type Props = {
  block: ContentBlock
  anchorRect: DOMRect | null
  canMoveUp: boolean
  canMoveDown: boolean
  onClose: () => void
  onDuplicate: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onConvert: (target: ConvertTarget) => void
  onCopyLink: () => void
}

export function BlockActionsMenu({
  block,
  anchorRect,
  canMoveUp,
  canMoveDown,
  onClose,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onConvert,
  onCopyLink,
}: Props) {
  const [showConvert, setShowConvert] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handle)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('keydown', esc)
    }
  }, [onClose])

  if (!anchorRect) return null

  const top = anchorRect.bottom + 6
  const left = anchorRect.left

  const isConvertible = CONVERTIBLE.includes(block.type)

  const Item = ({
    onClick,
    disabled,
    Icon,
    label,
    shortcut,
    danger,
  }: {
    onClick: () => void
    disabled?: boolean
    Icon: typeof Type
    label: string
    shortcut?: string
    danger?: boolean
  }) => (
    <button
      type="button"
      onClick={() => { if (!disabled) onClick() }}
      disabled={disabled}
      className={`flex items-center gap-2.5 w-full px-3 py-1.5 text-[12.5px] rounded-md transition-colors text-left ${
        disabled
          ? 'opacity-40 cursor-not-allowed'
          : danger
            ? 'text-error hover:bg-error/10 cursor-pointer'
            : 'text-ink-soft hover:text-ink hover:bg-surface-muted cursor-pointer'
      }`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
      <span className="flex-1">{label}</span>
      {shortcut && (
        <span className="text-[10px] text-ink-faint font-mono tracking-wider">{shortcut}</span>
      )}
    </button>
  )

  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)
  const cmd = isMac ? '⌘' : 'Ctrl'

  return createPortal(
    <div
      ref={ref}
      className="fixed z-50 w-56 bg-surface border border-line rounded-xl shadow-xl py-1.5"
      style={{ top, left }}
    >
      {showConvert ? (
        <div className="px-1">
          <button
            type="button"
            onClick={() => setShowConvert(false)}
            className="px-2 py-1 text-[10.5px] uppercase tracking-[0.18em] text-ink-faint hover:text-ink-soft cursor-pointer"
          >
            ← Convert to
          </button>
          <div className="mt-1 space-y-0.5">
            {CONVERT_OPTIONS.filter((o) => o.type !== block.type).map((o) => (
              <Item
                key={o.type}
                Icon={o.Icon}
                label={o.label}
                onClick={() => { onConvert(o.type); onClose() }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="px-1 space-y-0.5">
          <Item
            Icon={Copy}
            label="Duplicate"
            shortcut={`${cmd}D`}
            onClick={() => { onDuplicate(); onClose() }}
          />
          <Item
            Icon={ArrowUp}
            label="Move up"
            shortcut={`${cmd}⇧↑`}
            disabled={!canMoveUp}
            onClick={() => { onMoveUp(); onClose() }}
          />
          <Item
            Icon={ArrowDown}
            label="Move down"
            shortcut={`${cmd}⇧↓`}
            disabled={!canMoveDown}
            onClick={() => { onMoveDown(); onClose() }}
          />
          {isConvertible && (
            <Item
              Icon={Repeat}
              label="Convert to…"
              onClick={() => setShowConvert(true)}
            />
          )}
          <Item
            Icon={Link2}
            label="Copy link"
            onClick={() => { onCopyLink(); onClose() }}
          />
          <div className="my-1 h-px bg-line-soft" />
          <Item
            Icon={Trash2}
            label="Delete"
            danger
            onClick={() => { onDelete(); onClose() }}
          />
        </div>
      )}
    </div>,
    document.body,
  )
}
