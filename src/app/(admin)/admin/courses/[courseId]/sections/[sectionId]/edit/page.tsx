'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useToast } from '@/components/ui/toast'
import { BlockEditor } from '@/components/admin/block-editor'
import { Breadcrumbs } from '@/components/admin/breadcrumbs'
import { SaveIndicator } from '@/components/admin/save-indicator'
import { useAutoSave } from '@/hooks/useAutoSave'
import {
  ArrowLeft,
  Save,
  Plus,
  Type,
  AlertTriangle,
  Table2,
  PenTool,
  CheckSquare,
  FileUp,
  ChevronDown,
  Video,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface ContentBlock {
  id: string
  type: 'rich_text' | 'callout' | 'table' | 'workbook_prompt' | 'checklist' | 'file' | 'video'
  content: Record<string, unknown>
  sort_order: number
}

const blockTypes = [
  { type: 'rich_text', label: 'Rich Text', icon: Type, desc: 'Paragraphs, headings, lists' },
  { type: 'callout', label: 'Callout', icon: AlertTriangle, desc: 'Tips, warnings, key insights' },
  { type: 'table', label: 'Table', icon: Table2, desc: 'Structured data in rows & cols' },
  { type: 'workbook_prompt', label: 'Workbook Prompt', icon: PenTool, desc: 'Student exercise / reflection' },
  { type: 'checklist', label: 'Checklist', icon: CheckSquare, desc: 'Action items & deliverables' },
  { type: 'file', label: 'File Upload', icon: FileUp, desc: 'Downloadable resources' },
  { type: 'video', label: 'Video', icon: Video, desc: 'YouTube or Vimeo embed' },
] as const

function SortableBlock({
  block,
  onChange,
  onDelete,
  onDuplicate,
}: {
  block: ContentBlock
  onChange: (content: Record<string, unknown>) => void
  onDelete: () => void
  onDuplicate: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: block.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <BlockEditor
        block={block}
        onChange={onChange}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

function InsertBlockButton({ onInsert }: { onInsert: (type: ContentBlock['type']) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative flex items-center justify-center py-1 group">
      <div className="absolute inset-x-0 top-1/2 h-px bg-nz-border/30 group-hover:bg-nz-sakura/20 transition-colors" />
      <button
        onClick={() => setOpen(!open)}
        className="relative z-10 w-6 h-6 rounded-full bg-nz-bg-elevated border border-nz-border hover:border-nz-sakura/40 hover:bg-nz-sakura/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
      >
        <Plus className="w-3 h-3 text-nz-text-muted group-hover:text-nz-sakura" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 bg-nz-bg-elevated border border-nz-border rounded-xl overflow-hidden shadow-xl z-30 w-56">
          {blockTypes.map((bt) => {
            const Icon = bt.icon
            return (
              <button
                key={bt.type}
                onClick={() => { onInsert(bt.type); setOpen(false) }}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-nz-bg-tertiary transition-colors cursor-pointer"
              >
                <Icon className="w-4 h-4 text-nz-sakura flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-nz-text-primary">{bt.label}</p>
                  <p className="text-[10px] text-nz-text-muted">{bt.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function EditSectionPage() {
  const params = useParams<{ courseId: string; sectionId: string }>()
  const courseId = params.courseId
  const sectionId = params.sectionId
  const router = useRouter()
  const supabase = createClient()

  const { addToast } = useToast()
  const [title, setTitle] = useState('')
  const [blocks, setBlocks] = useState<ContentBlock[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showBlockMenu, setShowBlockMenu] = useState(false)
  const [courseName, setCourseName] = useState('')
  const [moduleName, setModuleName] = useState('')

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({ open: false, title: '', message: '', onConfirm: () => {} })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const loadSection = useCallback(async () => {
    setLoading(true)

    const { data: section } = await supabase
      .from('sections')
      .select('*')
      .eq('id', sectionId)
      .single()

    if (!section) {
      router.push(`/admin/courses/${courseId}/edit`)
      return
    }

    setTitle(section.title)

    // Load breadcrumb data
    const { data: moduleData } = await supabase
      .from('modules')
      .select('title')
      .eq('id', section.module_id)
      .single()
    if (moduleData) setModuleName(moduleData.title)

    const { data: courseData } = await supabase
      .from('courses')
      .select('title')
      .eq('id', courseId)
      .single()
    if (courseData) setCourseName(courseData.title)

    const { data: contentBlocks } = await supabase
      .from('content_blocks')
      .select('*')
      .eq('section_id', sectionId)
      .order('sort_order')

    // If section has a video_url but no video block, create one at the top
    const loadedBlocks: ContentBlock[] = contentBlocks ?? []
    const hasVideoBlock = loadedBlocks.some((b) => b.type === 'video')
    if (section.video_url && !hasVideoBlock) {
      const { data: newBlock } = await supabase
        .from('content_blocks')
        .insert({
          section_id: sectionId,
          type: 'video',
          content: { url: section.video_url },
          sort_order: -1,
        })
        .select()
        .single()

      if (newBlock) {
        loadedBlocks.unshift(newBlock)
      }
    }

    setBlocks(loadedBlocks)
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId, courseId])

  useEffect(() => {
    loadSection()
  }, [loadSection])

  const handleSave = async () => {
    setSaving(true)

    try {
      // Extract video_url from the first video block for backward compat
      const firstVideoBlock = blocks.find((b) => b.type === 'video')
      const videoUrl = firstVideoBlock ? (firstVideoBlock.content.url as string) || null : null

      // Save section
      const { error: sectionError } = await supabase
        .from('sections')
        .update({ title, video_url: videoUrl })
        .eq('id', sectionId)

      if (sectionError) throw sectionError

      // Save all blocks
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i]
        const { error: blockError } = await supabase
          .from('content_blocks')
          .update({ content: block.content, sort_order: i })
          .eq('id', block.id)

        if (blockError) throw blockError
      }

      addToast('Section saved successfully', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save section'
      addToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const autoSaveFn = useCallback(async () => {
    const firstVideoBlock = blocks.find((b) => b.type === 'video')
    const videoUrl = firstVideoBlock ? (firstVideoBlock.content.url as string) || null : null

    const { error: sectionError } = await supabase
      .from('sections')
      .update({ title, video_url: videoUrl })
      .eq('id', sectionId)
    if (sectionError) throw sectionError

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      const { error: blockError } = await supabase
        .from('content_blocks')
        .update({ content: block.content, sort_order: i })
        .eq('id', block.id)
      if (blockError) throw blockError
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, blocks, sectionId])

  const { status: autoSaveStatus } = useAutoSave(
    autoSaveFn,
    [title, blocks],
    { delay: 3000, enabled: !loading }
  )

  const handleAddBlock = async (type: ContentBlock['type'], insertAtIndex?: number) => {
    const defaultContent: Record<string, unknown> = {}
    if (type === 'rich_text') defaultContent.html = ''
    if (type === 'callout') {
      defaultContent.calloutType = 'tip'
      defaultContent.title = ''
      defaultContent.body = ''
    }
    if (type === 'table') defaultContent.rows = [['', ''], ['', '']]
    if (type === 'workbook_prompt') {
      defaultContent.label = ''
      defaultContent.placeholder = ''
    }
    if (type === 'checklist') defaultContent.items = ['']
    if (type === 'file') {
      defaultContent.fileUrl = ''
      defaultContent.label = ''
      defaultContent.fileName = ''
    }
    if (type === 'video') {
      defaultContent.url = ''
    }

    const insertIndex = insertAtIndex !== undefined ? insertAtIndex : blocks.length

    const { data } = await supabase
      .from('content_blocks')
      .insert({
        section_id: sectionId,
        type,
        content: defaultContent,
        sort_order: insertIndex,
      })
      .select()
      .single()

    if (data) {
      const newBlocks = [...blocks]
      newBlocks.splice(insertIndex, 0, data)
      setBlocks(newBlocks)
    }
    setShowBlockMenu(false)
  }

  const handleDeleteBlock = (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId)
    const blockLabel = block ? block.type.replace(/_/g, ' ') : 'block'
    setConfirmModal({
      open: true,
      title: 'Delete Block',
      message: `Delete this ${blockLabel}? This cannot be undone.`,
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, open: false }))
        const { error } = await supabase.from('content_blocks').delete().eq('id', blockId)
        if (error) {
          addToast('Failed to delete block', 'error')
          return
        }
        setBlocks(blocks.filter((b) => b.id !== blockId))
        addToast('Block deleted', 'success')
      },
    })
  }

  const handleDuplicateBlock = async (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId)
    if (!block) return

    const blockIndex = blocks.findIndex((b) => b.id === blockId)

    const { data } = await supabase
      .from('content_blocks')
      .insert({
        section_id: sectionId,
        type: block.type,
        content: block.content,
        sort_order: blockIndex + 1,
      })
      .select()
      .single()

    if (data) {
      const newBlocks = [...blocks]
      newBlocks.splice(blockIndex + 1, 0, data)
      setBlocks(newBlocks)
      addToast('Block duplicated', 'success')
    }
  }

  const handleBlockChange = (blockId: string, content: Record<string, unknown>) => {
    setBlocks(blocks.map((b) => (b.id === blockId ? { ...b, content } : b)))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setBlocks((items) => {
      const oldIndex = items.findIndex((b) => b.id === active.id)
      const newIndex = items.findIndex((b) => b.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return items
      return arrayMove(items, oldIndex, newIndex)
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-nz-sakura/30 border-t-nz-sakura rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl">
      {/* Confirm Modal */}
      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((p) => ({ ...p, open: false }))}
      />

      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Courses', href: '/admin/courses' },
          { label: courseName || 'Course', href: `/admin/courses/${courseId}/edit` },
          { label: moduleName || 'Module' },
          { label: title || 'Section' },
        ]}
      />

      {/* Floating save bar */}
      <div className="sticky top-0 z-40 bg-nz-bg-primary/80 backdrop-blur-md border-b border-nz-border/50 -mx-4 px-4 py-3 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/admin/courses/${courseId}/edit`}
              className="p-2 rounded-lg text-nz-text-tertiary hover:text-nz-text-primary hover:bg-nz-bg-elevated transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xl font-heading font-bold text-nz-text-primary bg-transparent focus:outline-none border-b-2 border-transparent focus:border-nz-sakura/40 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-nz-text-muted">{blocks.length} blocks</span>
            <SaveIndicator status={autoSaveStatus} />
            <Button onClick={handleSave} loading={saving} size="sm" variant="secondary">
              <Save className="w-4 h-4" />
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Content blocks */}
      <div className="space-y-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold text-nz-text-primary">
            Content Blocks
          </h2>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            {blocks.map((block, index) => (
              <div key={block.id}>
                <InsertBlockButton
                  onInsert={(type) => handleAddBlock(type, index)}
                />
                <SortableBlock
                  block={block}
                  onChange={(content) => handleBlockChange(block.id, content)}
                  onDelete={() => handleDeleteBlock(block.id)}
                  onDuplicate={() => handleDuplicateBlock(block.id)}
                />
              </div>
            ))}
          </SortableContext>
        </DndContext>

        {/* Insert button after last block */}
        {blocks.length > 0 && (
          <InsertBlockButton
            onInsert={(type) => handleAddBlock(type, blocks.length)}
          />
        )}

        {blocks.length === 0 && (
          <div className="py-12 text-center bg-nz-bg-card border border-nz-border rounded-2xl">
            <p className="text-nz-text-tertiary text-sm mb-4">
              No content blocks yet. Add your first block below.
            </p>
          </div>
        )}

        {/* Add block dropdown */}
        <div className="relative mt-4">
          <button
            onClick={() => setShowBlockMenu(!showBlockMenu)}
            className="flex items-center gap-2 w-full px-5 py-4 rounded-2xl text-sm font-semibold text-nz-sakura/70 hover:text-nz-sakura hover:bg-nz-sakura/5 border-2 border-dashed border-nz-sakura/20 hover:border-nz-sakura/40 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Block
            <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${showBlockMenu ? 'rotate-180' : ''}`} />
          </button>

          {showBlockMenu && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-nz-bg-elevated border border-nz-border rounded-xl overflow-hidden shadow-xl z-20 grid grid-cols-2 gap-0">
              {blockTypes.map((bt) => {
                const Icon = bt.icon
                return (
                  <button
                    key={bt.type}
                    onClick={() => handleAddBlock(bt.type)}
                    className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-nz-bg-tertiary transition-colors cursor-pointer border-b border-r border-nz-border/30"
                  >
                    <Icon className="w-4 h-4 text-nz-sakura flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-nz-text-primary">{bt.label}</p>
                      <p className="text-xs text-nz-text-muted">{bt.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
