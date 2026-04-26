'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { Check } from 'lucide-react'
import { useEditMode } from '@/lib/edit-mode-context'
import { saveBlock } from '@/lib/block-actions'
import { useToast } from '@/components/ui/toast'
import type { ContentBlock } from '@/lib/types'

const EditableBlockRender = dynamic(
  () =>
    import('@/components/course/editable-block-render').then(
      (m) => m.EditableBlockRender,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="py-4 flex justify-center">
        <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    ),
  },
)

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type InlineBlockEditorProps = {
  block: ContentBlock
  onBlockUpdate: (block: ContentBlock) => void
  isFocused: boolean
  onFocus: () => void
  gutter?: ReactNode
  onSlashInsert?: (type: ContentBlock['type']) => void
}

export function InlineBlockEditor({
  block,
  onBlockUpdate,
  isFocused,
  onFocus,
  gutter,
  onSlashInsert,
}: InlineBlockEditorProps) {
  const { editMode, markDirty, markClean } = useEditMode()
  const { addToast } = useToast()
  const [localContent, setLocalContent] = useState<Record<string, unknown>>(block.content)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingContent = useRef<Record<string, unknown>>(block.content)
  const lastSaved = useRef<string>(JSON.stringify(block.content))

  // Sync from parent when block changes externally (eg duplicate, convert)
  useEffect(() => {
    setLocalContent(block.content)
    pendingContent.current = block.content
    lastSaved.current = JSON.stringify(block.content)
  }, [block.id, block.type])

  const flushSave = useCallback(async () => {
    const content = pendingContent.current
    const serialized = JSON.stringify(content)
    if (serialized === lastSaved.current) return
    setStatus('saving')
    try {
      // Normalize cross-compat fields
      const contentToSave: Record<string, unknown> = { ...content }
      if (block.type === 'callout') {
        const ct = (contentToSave.calloutType ?? contentToSave.callout_type ?? 'tip') as string
        contentToSave.calloutType = ct
        contentToSave.callout_type = ct
        const body = (contentToSave.body ?? contentToSave.html ?? '') as string
        contentToSave.body = body
        contentToSave.html = body
      }
      if (block.type === 'workbook_prompt') {
        const label = (contentToSave.label ?? contentToSave.prompt ?? '') as string
        contentToSave.label = label
        contentToSave.prompt = label
      }

      const updated = await saveBlock(block.id, contentToSave)
      onBlockUpdate(updated)
      lastSaved.current = serialized
      markClean(block.id)
      setStatus('saved')
    } catch (err) {
      setStatus('error')
      addToast(err instanceof Error ? err.message : 'Failed to save', 'error')
    }
  }, [block.id, block.type, onBlockUpdate, markClean, addToast])

  const handleChange = useCallback(
    (content: Record<string, unknown>) => {
      setLocalContent(content)
      pendingContent.current = content
      markDirty(block.id)
      setStatus('saving')
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        flushSave()
      }, 700)
    },
    [block.id, markDirty, flushSave],
  )

  // Flush on unmount or block id change
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        flushSave()
      }
    }
  }, [block.id, flushSave])

  if (!editMode) return null

  return (
    <div
      onMouseDown={onFocus}
      onFocus={onFocus}
      className={`group relative rounded-lg transition-colors ${
        isFocused ? 'ring-1 ring-accent/30 bg-accent-soft/15' : 'hover:bg-surface-muted/40'
      }`}
    >
      {gutter}
      <div className="px-2 py-1">
        <EditableBlockRender
          block={{ ...block, content: localContent }}
          onChange={handleChange}
          onSlashInsert={onSlashInsert}
        />
      </div>
      {status !== 'idle' && (
        <span
          className={`absolute right-2 top-2 text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded transition-opacity ${
            isFocused ? 'opacity-100' : 'opacity-0'
          } ${
            status === 'error'
              ? 'text-error bg-error/10'
              : status === 'saving'
                ? 'text-ink-muted bg-surface'
                : 'text-success bg-success/10'
          }`}
        >
          {status === 'saving' && 'Saving…'}
          {status === 'saved' && (
            <span className="inline-flex items-center gap-1">
              <Check className="w-2.5 h-2.5" strokeWidth={2.5} />
              Saved
            </span>
          )}
          {status === 'error' && 'Failed'}
        </span>
      )}
    </div>
  )
}
