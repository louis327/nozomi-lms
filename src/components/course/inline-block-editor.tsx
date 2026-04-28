'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
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

type InlineBlockEditorProps = {
  block: ContentBlock
  onBlockUpdate: (block: ContentBlock) => void
  onSlashInsert?: (type: ContentBlock['type']) => void
}

export function InlineBlockEditor({
  block,
  onBlockUpdate,
  onSlashInsert,
}: InlineBlockEditorProps) {
  const { editMode, markDirty, markClean, setSaveStatus } = useEditMode()
  const { addToast } = useToast()
  const [localContent, setLocalContent] = useState<Record<string, unknown>>(block.content)
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
    setSaveStatus('saving')
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
      setSaveStatus('saved')
    } catch (err) {
      setSaveStatus('error')
      addToast(err instanceof Error ? err.message : 'Failed to save', 'error')
    }
  }, [block.id, block.type, onBlockUpdate, markClean, addToast, setSaveStatus])

  const handleChange = useCallback(
    (content: Record<string, unknown>) => {
      setLocalContent(content)
      pendingContent.current = content
      markDirty(block.id)
      setSaveStatus('saving')
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        flushSave()
      }, 700)
    },
    [block.id, markDirty, flushSave, setSaveStatus],
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
    <EditableBlockRender
      block={{ ...block, content: localContent }}
      onChange={handleChange}
      onSlashInsert={onSlashInsert}
    />
  )
}
