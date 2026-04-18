'use client'

import { useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useEditMode } from '@/lib/edit-mode-context'
import { saveBlock, deleteBlock } from '@/lib/block-actions'
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
      <div className="py-8 flex justify-center">
        <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    ),
  },
)

type InlineBlockEditorProps = {
  block: ContentBlock
  children: React.ReactNode
  onBlockUpdate: (block: ContentBlock) => void
  onBlockDelete: (blockId: string) => void
}

export function InlineBlockEditor({
  block,
  children,
  onBlockUpdate,
  onBlockDelete,
}: InlineBlockEditorProps) {
  const { editMode, markDirty, markClean } = useEditMode()
  const { addToast } = useToast()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [localContent, setLocalContent] = useState<Record<string, unknown>>(block.content)
  const contentRef = useRef(block.content)

  const handleEdit = useCallback(() => {
    if (!editMode) return
    setLocalContent(block.content)
    contentRef.current = block.content
    setEditing(true)
  }, [editMode, block.content])

  const handleChange = useCallback((content: Record<string, unknown>) => {
    setLocalContent(content)
    markDirty(block.id)
  }, [block.id, markDirty])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      // Normalize fields for cross-compatibility between admin editor and student renderer
      let contentToSave = { ...localContent }
      if (block.type === 'callout') {
        const ct = contentToSave.calloutType || contentToSave.callout_type || 'tip'
        contentToSave.calloutType = ct
        contentToSave.callout_type = ct
        const body = contentToSave.body || contentToSave.html || ''
        contentToSave.body = body
        contentToSave.html = body
      }
      if (block.type === 'workbook_prompt') {
        const label = contentToSave.label || contentToSave.prompt || ''
        contentToSave.label = label
        contentToSave.prompt = label
      }

      const updated = await saveBlock(block.id, contentToSave)
      onBlockUpdate(updated)
      markClean(block.id)
      setEditing(false)
      addToast('Block saved', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }, [block.id, block.type, localContent, onBlockUpdate, markClean, addToast])

  const handleCancel = useCallback(() => {
    setLocalContent(contentRef.current)
    markClean(block.id)
    setEditing(false)
  }, [block.id, markClean])

  const handleDelete = useCallback(async () => {
    if (!confirm('Delete this content block?')) return
    try {
      await deleteBlock(block.id)
      markClean(block.id)
      onBlockDelete(block.id)
      addToast('Block deleted', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete', 'error')
    }
  }, [block.id, onBlockDelete, markClean, addToast])

  if (!editMode) return <>{children}</>

  if (editing) {
    return (
      <div className="relative rounded-2xl border border-accent/40 bg-surface shadow-sm">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-line-soft bg-surface-muted/40 rounded-t-2xl">
          <span className="text-[10.5px] font-semibold text-accent uppercase tracking-[0.22em]">
            Editing
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="px-2 py-1 rounded-lg text-[11.5px] text-ink-muted hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
            >
              Delete
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 rounded-lg text-[11.5px] font-medium text-ink-soft hover:text-ink hover:bg-surface-muted transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 rounded-full text-[11.5px] font-semibold bg-ink text-ink-inverted hover:bg-accent disabled:opacity-50 transition-colors cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
        {/* Editor */}
        <div className="px-4 py-2">
          <EditableBlockRender
            block={{ ...block, content: localContent }}
            onChange={handleChange}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={handleEdit}
      className="relative rounded-2xl border border-transparent hover:border-accent/30 hover:bg-accent-soft/20 transition-all cursor-pointer group"
    >
      {children}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="px-2 py-1 rounded-full bg-surface/90 border border-line text-[10px] font-semibold tracking-wider uppercase text-ink-muted backdrop-blur-sm">
          Click to edit
        </span>
      </div>
    </div>
  )
}
