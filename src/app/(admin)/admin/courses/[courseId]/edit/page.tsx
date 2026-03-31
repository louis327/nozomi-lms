'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useToast } from '@/components/ui/toast'
import { Breadcrumbs } from '@/components/admin/breadcrumbs'
import { SaveIndicator } from '@/components/admin/save-indicator'
import { useAutoSave } from '@/hooks/useAutoSave'
import {
  ArrowLeft,
  Save,
  Plus,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Copy,
  Layers,
  FileText,
  Eye,
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

interface Module {
  id: string
  title: string
  description: string | null
  sort_order: number
  sections: Section[]
}

interface Section {
  id: string
  module_id: string
  title: string
  sort_order: number
  block_count?: number
}

function SortableModule({
  module,
  expanded,
  onToggle,
  onTitleChange,
  onDescriptionChange,
  onDeleteModule,
  onDuplicateModule,
  onAddSection,
  onDeleteSection,
  onDuplicateSection,
  courseId,
}: {
  module: Module
  expanded: boolean
  onToggle: () => void
  onTitleChange: (title: string) => void
  onDescriptionChange: (desc: string) => void
  onDeleteModule: () => void
  onDuplicateModule: () => void
  onAddSection: () => void
  onDeleteSection: (sectionId: string) => void
  onDuplicateSection: (sectionId: string) => void
  courseId: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: module.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const totalBlocks = module.sections.reduce((sum, s) => sum + (s.block_count || 0), 0)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-nz-bg-card border border-nz-border rounded-2xl overflow-hidden"
    >
      {/* Module header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-nz-bg-elevated/30">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-nz-text-muted hover:text-nz-text-tertiary">
          <GripVertical className="w-4 h-4" />
        </button>
        <button onClick={onToggle} className="text-nz-text-tertiary hover:text-nz-text-primary cursor-pointer">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <input
          type="text"
          value={module.title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="flex-1 bg-transparent text-nz-text-primary font-heading font-semibold text-sm focus:outline-none border-b border-transparent focus:border-nz-sakura/40 transition-colors"
        />
        {/* Module stats */}
        <div className="flex items-center gap-3 mr-2">
          <span className="flex items-center gap-1 text-xs text-nz-text-muted" title={`${module.sections.length} sections`}>
            <Layers className="w-3 h-3" />
            {module.sections.length}
          </span>
          <span className="flex items-center gap-1 text-xs text-nz-text-muted" title={`${totalBlocks} content blocks`}>
            <FileText className="w-3 h-3" />
            {totalBlocks}
          </span>
        </div>
        <button
          onClick={onDuplicateModule}
          className="p-1.5 rounded-lg text-nz-text-muted hover:text-nz-sakura hover:bg-nz-sakura/10 transition-colors cursor-pointer"
          title="Duplicate module"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDeleteModule}
          className="p-1.5 rounded-lg text-nz-text-muted hover:text-nz-error hover:bg-nz-error/10 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="px-5 py-4 space-y-4">
          {/* Module description */}
          <textarea
            value={module.description || ''}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Module description (optional)"
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-nz-bg-tertiary border border-nz-border text-sm text-nz-text-secondary placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40 resize-none transition-colors"
          />

          {/* Sections */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-nz-text-tertiary uppercase tracking-wider">
              Sections
            </p>
            {module.sections.length === 0 ? (
              <p className="text-xs text-nz-text-muted py-3 text-center">
                No sections yet.
              </p>
            ) : (
              <SortableContext
                items={module.sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {module.sections
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((section) => (
                    <SortableSection
                      key={section.id}
                      section={section}
                      courseId={courseId}
                      onDelete={() => onDeleteSection(section.id)}
                      onDuplicate={() => onDuplicateSection(section.id)}
                    />
                  ))}
              </SortableContext>
            )}
            <button
              onClick={onAddSection}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-nz-sakura/70 hover:text-nz-sakura hover:bg-nz-sakura/5 border border-dashed border-nz-sakura/20 hover:border-nz-sakura/40 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Section
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SortableSection({
  section,
  courseId,
  onDelete,
  onDuplicate,
}: {
  section: Section
  courseId: string
  onDelete: () => void
  onDuplicate: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: section.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const blockCount = section.block_count || 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-nz-bg-tertiary border border-nz-border/50 hover:border-nz-border transition-colors group"
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-nz-text-muted hover:text-nz-text-tertiary">
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <span className="flex-1 text-sm text-nz-text-secondary">{section.title}</span>
      {/* Block count badge */}
      <span className={`text-xs px-1.5 py-0.5 rounded-md ${blockCount > 0 ? 'bg-nz-bg-elevated text-nz-text-muted' : 'bg-nz-warning/10 text-nz-warning'}`}>
        {blockCount > 0 ? `${blockCount} blocks` : 'empty'}
      </span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link
          href={`/admin/courses/${courseId}/sections/${section.id}/edit`}
          className="p-1.5 rounded-lg text-nz-text-tertiary hover:text-nz-sakura hover:bg-nz-sakura/10 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Link>
        <button
          onClick={onDuplicate}
          className="p-1.5 rounded-lg text-nz-text-tertiary hover:text-nz-sakura hover:bg-nz-sakura/10 transition-colors cursor-pointer"
          title="Duplicate section"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-nz-text-tertiary hover:text-nz-error hover:bg-nz-error/10 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export default function EditCoursePage() {
  const params = useParams<{ courseId: string }>()
  const courseId = params.courseId
  const router = useRouter()
  const supabase = createClient()

  const { addToast } = useToast()
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [modules, setModules] = useState<Module[]>([])
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'modules' | 'settings'>('modules')
  const [description, setDescription] = useState('')
  const [coverImage, setCoverImage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

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

  const loadCourse = useCallback(async () => {
    setLoading(true)
    const { data: course } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single()

    if (!course) {
      router.push('/admin/courses')
      return
    }

    setTitle(course.title)
    setStatus(course.status)
    setDescription(course.description || '')
    setCoverImage(course.cover_image)

    const { data: mods } = await supabase
      .from('modules')
      .select('id, title, description, sort_order')
      .eq('course_id', courseId)
      .order('sort_order')

    const moduleList = mods ?? []

    // Fetch sections for all modules
    const moduleIds = moduleList.map((m) => m.id)
    const { data: secs } = await supabase
      .from('sections')
      .select('id, module_id, title, sort_order')
      .in('module_id', moduleIds.length ? moduleIds : [''])
      .order('sort_order')

    // Fetch block counts per section
    const sectionIds = (secs ?? []).map((s) => s.id)
    const { data: blockCounts } = await supabase
      .from('content_blocks')
      .select('section_id')
      .in('section_id', sectionIds.length ? sectionIds : [''])

    const blockCountMap: Record<string, number> = {}
    ;(blockCounts ?? []).forEach((b) => {
      blockCountMap[b.section_id] = (blockCountMap[b.section_id] || 0) + 1
    })

    const sectionsByModule: Record<string, Section[]> = {}
    ;(secs ?? []).forEach((s) => {
      if (!sectionsByModule[s.module_id]) sectionsByModule[s.module_id] = []
      sectionsByModule[s.module_id].push({ ...s, block_count: blockCountMap[s.id] || 0 })
    })

    setModules(
      moduleList.map((m) => ({
        ...m,
        sections: sectionsByModule[m.id] || [],
      }))
    )
    setExpandedModules(new Set(moduleList.map((m) => m.id)))
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  useEffect(() => {
    loadCourse()
  }, [loadCourse])

  const handleSave = async () => {
    setSaving(true)

    try {
      // Save course
      const { error: courseError } = await supabase
        .from('courses')
        .update({ title, status, description: description || null, cover_image: coverImage })
        .eq('id', courseId)

      if (courseError) throw courseError

      // Save modules
      for (let i = 0; i < modules.length; i++) {
        const mod = modules[i]
        const { error: modError } = await supabase
          .from('modules')
          .update({
            title: mod.title,
            description: mod.description,
            sort_order: i,
          })
          .eq('id', mod.id)

        if (modError) throw modError

        // Save section sort orders
        for (let j = 0; j < mod.sections.length; j++) {
          const { error: secError } = await supabase
            .from('sections')
            .update({ sort_order: j })
            .eq('id', mod.sections[j].id)

          if (secError) throw secError
        }
      }

      addToast('Course saved successfully', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save course'
      addToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const autoSaveFn = useCallback(async () => {
    const { error: courseError } = await supabase
      .from('courses')
      .update({ title, status, description: description || null, cover_image: coverImage })
      .eq('id', courseId)
    if (courseError) throw courseError

    for (let i = 0; i < modules.length; i++) {
      const mod = modules[i]
      const { error: modError } = await supabase
        .from('modules')
        .update({ title: mod.title, description: mod.description, sort_order: i })
        .eq('id', mod.id)
      if (modError) throw modError

      for (let j = 0; j < mod.sections.length; j++) {
        const { error: secError } = await supabase
          .from('sections')
          .update({ sort_order: j })
          .eq('id', mod.sections[j].id)
        if (secError) throw secError
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, status, description, coverImage, modules, courseId])

  const { status: autoSaveStatus } = useAutoSave(
    autoSaveFn,
    [title, status, description, coverImage, modules],
    { delay: 3000, enabled: !loading }
  )

  const handleAddModule = async () => {
    const { data } = await supabase
      .from('modules')
      .insert({
        course_id: courseId,
        title: 'New Module',
        sort_order: modules.length,
      })
      .select()
      .single()

    if (data) {
      const newModule: Module = { ...data, sections: [] }
      setModules([...modules, newModule])
      setExpandedModules((prev) => new Set([...prev, data.id]))
    }
  }

  const handleDeleteModule = (moduleId: string) => {
    const mod = modules.find((m) => m.id === moduleId)
    setConfirmModal({
      open: true,
      title: 'Delete Module',
      message: `Delete "${mod?.title || 'this module'}" and all its sections? This cannot be undone.`,
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, open: false }))
        const { error } = await supabase.from('modules').delete().eq('id', moduleId)
        if (error) {
          addToast('Failed to delete module', 'error')
          return
        }
        setModules(modules.filter((m) => m.id !== moduleId))
        addToast('Module deleted', 'success')
      },
    })
  }

  const handleDuplicateModule = async (moduleId: string) => {
    const mod = modules.find((m) => m.id === moduleId)
    if (!mod) return

    addToast('Duplicating module...', 'success')

    // Create the module copy
    const { data: newMod } = await supabase
      .from('modules')
      .insert({
        course_id: courseId,
        title: mod.title + ' (Copy)',
        description: mod.description,
        sort_order: modules.length,
      })
      .select()
      .single()

    if (!newMod) {
      addToast('Failed to duplicate module', 'error')
      return
    }

    // Duplicate all sections and their blocks
    const newSections: Section[] = []
    for (const sec of mod.sections) {
      const { data: newSec } = await supabase
        .from('sections')
        .insert({
          module_id: newMod.id,
          title: sec.title,
          sort_order: sec.sort_order,
        })
        .select()
        .single()

      if (!newSec) continue

      // Copy blocks
      const { data: blocks } = await supabase
        .from('content_blocks')
        .select('type, content, sort_order')
        .eq('section_id', sec.id)
        .order('sort_order')

      if (blocks && blocks.length > 0) {
        await supabase
          .from('content_blocks')
          .insert(blocks.map((b) => ({ ...b, section_id: newSec.id })))
      }

      newSections.push({ ...newSec, block_count: blocks?.length || 0 })
    }

    const newModule: Module = { ...newMod, sections: newSections }
    setModules([...modules, newModule])
    setExpandedModules((prev) => new Set([...prev, newMod.id]))
    addToast('Module duplicated', 'success')
  }

  const handleAddSection = async (moduleId: string) => {
    const mod = modules.find((m) => m.id === moduleId)
    if (!mod) return

    const { data } = await supabase
      .from('sections')
      .insert({
        module_id: moduleId,
        title: 'New Section',
        sort_order: mod.sections.length,
      })
      .select()
      .single()

    if (data) {
      setModules(
        modules.map((m) =>
          m.id === moduleId ? { ...m, sections: [...m.sections, { ...data, block_count: 0 }] } : m
        )
      )
    }
  }

  const handleDeleteSection = (moduleId: string, sectionId: string) => {
    const mod = modules.find((m) => m.id === moduleId)
    const sec = mod?.sections.find((s) => s.id === sectionId)
    setConfirmModal({
      open: true,
      title: 'Delete Section',
      message: `Delete "${sec?.title || 'this section'}" and all its content blocks? This cannot be undone.`,
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, open: false }))
        const { error } = await supabase.from('sections').delete().eq('id', sectionId)
        if (error) {
          addToast('Failed to delete section', 'error')
          return
        }
        setModules(
          modules.map((m) =>
            m.id === moduleId
              ? { ...m, sections: m.sections.filter((s) => s.id !== sectionId) }
              : m
          )
        )
        addToast('Section deleted', 'success')
      },
    })
  }

  const handleDuplicateSection = async (moduleId: string, sectionId: string) => {
    const mod = modules.find((m) => m.id === moduleId)
    const sec = mod?.sections.find((s) => s.id === sectionId)
    if (!mod || !sec) return

    const { data: newSec } = await supabase
      .from('sections')
      .insert({
        module_id: moduleId,
        title: sec.title + ' (Copy)',
        sort_order: mod.sections.length,
      })
      .select()
      .single()

    if (!newSec) {
      addToast('Failed to duplicate section', 'error')
      return
    }

    // Copy blocks
    const { data: blocks } = await supabase
      .from('content_blocks')
      .select('type, content, sort_order')
      .eq('section_id', sectionId)
      .order('sort_order')

    if (blocks && blocks.length > 0) {
      await supabase
        .from('content_blocks')
        .insert(blocks.map((b) => ({ ...b, section_id: newSec.id })))
    }

    setModules(
      modules.map((m) =>
        m.id === moduleId
          ? { ...m, sections: [...m.sections, { ...newSec, block_count: blocks?.length || 0 }] }
          : m
      )
    )
    addToast('Section duplicated', 'success')
  }

  const handleModuleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setModules((items) => {
      const oldIndex = items.findIndex((m) => m.id === active.id)
      const newIndex = items.findIndex((m) => m.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return items
      return arrayMove(items, oldIndex, newIndex)
    })
  }

  const handleSectionDragEnd = (moduleId: string) => (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setModules((mods) =>
      mods.map((m) => {
        if (m.id !== moduleId) return m
        const oldIndex = m.sections.findIndex((s) => s.id === active.id)
        const newIndex = m.sections.findIndex((s) => s.id === over.id)
        if (oldIndex === -1 || newIndex === -1) return m
        return { ...m, sections: arrayMove(m.sections, oldIndex, newIndex) }
      })
    )
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCoverImage(data.url)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to upload image', 'error')
    } finally {
      setUploading(false)
    }
  }

  // Course overview stats
  const totalModules = modules.length
  const totalSections = modules.reduce((sum, m) => sum + m.sections.length, 0)
  const totalBlocks = modules.reduce((sum, m) => sum + m.sections.reduce((s, sec) => s + (sec.block_count || 0), 0), 0)
  const emptySections = modules.reduce((sum, m) => sum + m.sections.filter((s) => !s.block_count).length, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-nz-sakura/30 border-t-nz-sakura rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
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
          { label: title || 'Course' },
        ]}
      />

      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/courses"
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
          <SaveIndicator status={autoSaveStatus} />

          {/* Status toggle */}
          <div className="flex gap-1 bg-nz-bg-tertiary rounded-xl p-1 border border-nz-border">
            <button
              onClick={() => setStatus('draft')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                status === 'draft'
                  ? 'bg-nz-warning/15 text-nz-warning'
                  : 'text-nz-text-tertiary hover:text-nz-text-secondary'
              }`}
            >
              Draft
            </button>
            <button
              onClick={() => setStatus('published')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                status === 'published'
                  ? 'bg-nz-success/15 text-nz-success'
                  : 'text-nz-text-tertiary hover:text-nz-text-secondary'
              }`}
            >
              Published
            </button>
          </div>

          <Link
            href={`/courses/${courseId}`}
            target="_blank"
            className="p-2 rounded-lg text-nz-text-tertiary hover:text-nz-sakura hover:bg-nz-sakura/10 transition-colors"
            title="Preview as student"
          >
            <Eye className="w-4 h-4" />
          </Link>

          <Button onClick={handleSave} loading={saving} size="sm" variant="secondary">
            <Save className="w-4 h-4" />
            Save
          </Button>
        </div>
      </div>

      {/* Course Overview Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-nz-bg-card border border-nz-border rounded-xl px-4 py-3">
          <p className="text-xs text-nz-text-muted">Modules</p>
          <p className="text-lg font-heading font-bold text-nz-text-primary">{totalModules}</p>
        </div>
        <div className="bg-nz-bg-card border border-nz-border rounded-xl px-4 py-3">
          <p className="text-xs text-nz-text-muted">Sections</p>
          <p className="text-lg font-heading font-bold text-nz-text-primary">{totalSections}</p>
        </div>
        <div className="bg-nz-bg-card border border-nz-border rounded-xl px-4 py-3">
          <p className="text-xs text-nz-text-muted">Content Blocks</p>
          <p className="text-lg font-heading font-bold text-nz-text-primary">{totalBlocks}</p>
        </div>
        <div className={`border rounded-xl px-4 py-3 ${emptySections > 0 ? 'bg-nz-warning/5 border-nz-warning/20' : 'bg-nz-success/5 border-nz-success/20'}`}>
          <p className="text-xs text-nz-text-muted">Health</p>
          <p className={`text-sm font-heading font-bold ${emptySections > 0 ? 'text-nz-warning' : 'text-nz-success'}`}>
            {emptySections > 0 ? `${emptySections} empty sections` : 'All sections filled'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-nz-bg-tertiary rounded-xl p-1 border border-nz-border w-fit">
        <button
          onClick={() => setActiveTab('modules')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'modules'
              ? 'bg-nz-bg-elevated text-nz-text-primary'
              : 'text-nz-text-tertiary hover:text-nz-text-secondary'
          }`}
        >
          Modules &amp; Sections
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-nz-bg-elevated text-nz-text-primary'
              : 'text-nz-text-tertiary hover:text-nz-text-secondary'
          }`}
        >
          Settings
        </button>
      </div>

      {activeTab === 'modules' ? (
        <div className="space-y-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleModuleDragEnd}
          >
            <SortableContext
              items={modules.map((m) => m.id)}
              strategy={verticalListSortingStrategy}
            >
              {modules.map((mod) => (
                <DndContext
                  key={mod.id}
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleSectionDragEnd(mod.id)}
                >
                  <SortableModule
                    module={mod}
                    expanded={expandedModules.has(mod.id)}
                    onToggle={() => {
                      setExpandedModules((prev) => {
                        const next = new Set(prev)
                        if (next.has(mod.id)) next.delete(mod.id)
                        else next.add(mod.id)
                        return next
                      })
                    }}
                    onTitleChange={(t) =>
                      setModules(modules.map((m) => (m.id === mod.id ? { ...m, title: t } : m)))
                    }
                    onDescriptionChange={(d) =>
                      setModules(modules.map((m) => (m.id === mod.id ? { ...m, description: d } : m)))
                    }
                    onDeleteModule={() => handleDeleteModule(mod.id)}
                    onDuplicateModule={() => handleDuplicateModule(mod.id)}
                    onAddSection={() => handleAddSection(mod.id)}
                    onDeleteSection={(sId) => handleDeleteSection(mod.id, sId)}
                    onDuplicateSection={(sId) => handleDuplicateSection(mod.id, sId)}
                    courseId={courseId}
                  />
                </DndContext>
              ))}
            </SortableContext>
          </DndContext>

          <button
            onClick={handleAddModule}
            className="flex items-center gap-2 w-full px-5 py-4 rounded-2xl text-sm font-semibold text-nz-sakura/70 hover:text-nz-sakura hover:bg-nz-sakura/5 border-2 border-dashed border-nz-sakura/20 hover:border-nz-sakura/40 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Module
          </button>
        </div>
      ) : (
        <div className="max-w-2xl space-y-6">
          <div>
            <label className="block text-sm font-medium text-nz-text-secondary mb-2">
              Course Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-nz-bg-tertiary border border-nz-border text-nz-text-primary placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40 resize-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-nz-text-secondary mb-2">
              Cover Image
            </label>
            {coverImage ? (
              <div className="relative rounded-xl overflow-hidden border border-nz-border">
                <img src={coverImage} alt="Cover" className="w-full h-48 object-cover" />
                <button
                  onClick={() => setCoverImage(null)}
                  className="absolute top-2 right-2 px-3 py-1 text-xs font-semibold rounded-lg bg-nz-bg-primary/80 text-nz-text-secondary hover:text-nz-error transition-colors cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-48 rounded-xl border-2 border-dashed border-nz-border hover:border-nz-sakura/40 bg-nz-bg-tertiary cursor-pointer transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <span className="text-sm text-nz-text-tertiary">
                  {uploading ? 'Uploading...' : 'Click to upload cover image'}
                </span>
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
