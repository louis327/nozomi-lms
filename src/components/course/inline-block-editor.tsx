'use client'

import { useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useEditMode } from '@/lib/edit-mode-context'
import { saveBlock, deleteBlock } from '@/lib/block-actions'
import { useToast } from '@/components/ui/toast'
import type { ContentBlock } from '@/lib/types'

const BlockEditor = dynamic(
  () => import('@/components/admin/block-editor').then((m) => m.BlockEditor),
  { ssr: false, loading: () => <div className="py-8 flex justify-center"><div className="w-6 h-6 border-2 border-nz-sakura/30 border-t-nz-sakura rounded-full animate-spin" /></div> }
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
      <div className="relative rounded-2xl border-2 border-nz-sakura/40 bg-nz-bg-card">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-nz-border/50 bg-nz-bg-elevated/30 rounded-t-2xl">
          <span className="text-xs font-semibold text-nz-sakura uppercase tracking-wider">
            Editing
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="px-2 py-1 rounded-lg text-xs text-nz-text-muted hover:text-nz-error hover:bg-nz-error/10 transition-colors cursor-pointer"
            >
              Delete
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-nz-text-secondary hover:text-nz-text-primary hover:bg-nz-bg-elevated transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-nz-sakura text-white hover:bg-nz-sakura/90 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
        {/* Editor */}
        <div className="p-4">
          <BlockEditor
            block={{ ...block, content: localContent }}
            onChange={handleChange}
            onDelete={handleDelete}
            dragHandleProps={{}}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={handleEdit}
      className="relative rounded-2xl border-2 border-transparent hover:border-nz-sakura/30 hover:bg-nz-sakura/[0.02] transition-all cursor-pointer group"
    >
      {children}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="px-2 py-1 rounded-lg bg-nz-bg-elevated/90 border border-nz-border text-[10px] font-medium text-nz-text-muted backdrop-blur-sm">
          Click to edit
        </span>
      </div>
    </div>
  )
}
