'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { BlockEditor } from '@/components/admin/block-editor'
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
  type: 'rich_text' | 'callout' | 'table' | 'workbook_prompt' | 'checklist' | 'file'
  content: Record<string, unknown>
  sort_order: number
}

const blockTypes = [
  { type: 'rich_text', label: 'Rich Text', icon: Type },
  { type: 'callout', label: 'Callout', icon: AlertTriangle },
  { type: 'table', label: 'Table', icon: Table2 },
  { type: 'workbook_prompt', label: 'Workbook Prompt', icon: PenTool },
  { type: 'checklist', label: 'Checklist', icon: CheckSquare },
  { type: 'file', label: 'File Upload', icon: FileUp },
] as const

function SortableBlock({
  block,
  onChange,
  onDelete,
}: {
  block: ContentBlock
  onChange: (content: Record<string, unknown>) => void
  onDelete: () => void
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
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

export default function EditSectionPage() {
  const params = useParams<{ courseId: string; sectionId: string }>()
  const courseId = params.courseId
  const sectionId = params.sectionId
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [blocks, setBlocks] = useState<ContentBlock[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showBlockMenu, setShowBlockMenu] = useState(false)

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
    setVideoUrl(section.video_url || '')

    const { data: contentBlocks } = await supabase
      .from('content_blocks')
      .select('*')
      .eq('section_id', sectionId)
      .order('sort_order')

    setBlocks(contentBlocks ?? [])
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId, courseId])

  useEffect(() => {
    loadSection()
  }, [loadSection])

  const handleSave = async () => {
    setSaving(true)

    // Save section
    await supabase
      .from('sections')
      .update({ title, video_url: videoUrl || null })
      .eq('id', sectionId)

    // Save all blocks
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      await supabase
        .from('content_blocks')
        .update({ content: block.content, sort_order: i })
        .eq('id', block.id)
    }

    setSaving(false)
  }

  const handleAddBlock = async (type: ContentBlock['type']) => {
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

    const { data } = await supabase
      .from('content_blocks')
      .insert({
        section_id: sectionId,
        type,
        content: defaultContent,
        sort_order: blocks.length,
      })
      .select()
      .single()

    if (data) {
      setBlocks([...blocks, data])
    }
    setShowBlockMenu(false)
  }

  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm('Delete this content block?')) return
    await supabase.from('content_blocks').delete().eq('id', blockId)
    setBlocks(blocks.filter((b) => b.id !== blockId))
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
    <div className="max-w-4xl">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
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

        <Button onClick={handleSave} loading={saving} size="sm">
          <Save className="w-4 h-4" />
          Save
        </Button>
      </div>

      {/* Video URL */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-nz-text-secondary mb-2">
          Video URL
        </label>
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=... or Vimeo URL"
          className="w-full px-4 py-3 rounded-xl bg-nz-bg-tertiary border border-nz-border text-nz-text-primary placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40 transition-colors"
        />
      </div>

      {/* Content blocks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-nz-text-primary">
            Content Blocks
          </h2>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            {blocks.map((block) => (
              <SortableBlock
                key={block.id}
                block={block}
                onChange={(content) => handleBlockChange(block.id, content)}
                onDelete={() => handleDeleteBlock(block.id)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {blocks.length === 0 && (
          <div className="py-12 text-center bg-nz-bg-card border border-nz-border rounded-2xl">
            <p className="text-nz-text-tertiary text-sm mb-4">
              No content blocks yet. Add your first block below.
            </p>
          </div>
        )}

        {/* Add block dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowBlockMenu(!showBlockMenu)}
            className="flex items-center gap-2 w-full px-5 py-4 rounded-2xl text-sm font-semibold text-nz-sakura/70 hover:text-nz-sakura hover:bg-nz-sakura/5 border-2 border-dashed border-nz-sakura/20 hover:border-nz-sakura/40 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Block
            <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${showBlockMenu ? 'rotate-180' : ''}`} />
          </button>

          {showBlockMenu && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-nz-bg-elevated border border-nz-border rounded-xl overflow-hidden shadow-xl z-20">
              {blockTypes.map((bt) => {
                const Icon = bt.icon
                return (
                  <button
                    key={bt.type}
                    onClick={() => handleAddBlock(bt.type)}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-nz-text-secondary hover:text-nz-text-primary hover:bg-nz-bg-tertiary transition-colors cursor-pointer"
                  >
                    <Icon className="w-4 h-4 text-nz-sakura" />
                    {bt.label}
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
