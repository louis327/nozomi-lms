'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Settings, Layers, FileText, Blocks } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import type { Course, Module, Section } from '@/lib/types'

type CourseWithTree = Course & { modules: (Module & { sections: Section[] })[] }

export function AdminCourseBar({ course }: { course: CourseWithTree }) {
  const router = useRouter()
  const supabase = createClient()
  const { addToast } = useToast()

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [title, setTitle] = useState(course.title)
  const [description, setDescription] = useState(course.description ?? '')
  const [coverImage, setCoverImage] = useState(course.cover_image ?? '')
  const [status, setStatus] = useState<'draft' | 'published'>(course.status)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [, startTransition] = useTransition()

  const counts = useMemo(() => {
    const modules = course.modules ?? []
    let sections = 0
    for (const m of modules) sections += (m.sections ?? []).length
    return { modules: modules.length, sections }
  }, [course.modules])

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase
      .from('courses')
      .update({
        title: title.trim() || 'Untitled course',
        description: description.trim() || null,
        cover_image: coverImage || null,
        status,
      })
      .eq('id', course.id)
    setSaving(false)

    if (error) {
      addToast(error.message, 'error')
      return
    }
    addToast('Course settings saved', 'success')
    setSettingsOpen(false)
    startTransition(() => router.refresh())
  }

  async function toggleStatus() {
    const next: 'draft' | 'published' = status === 'published' ? 'draft' : 'published'
    setStatus(next)
    const { error } = await supabase.from('courses').update({ status: next }).eq('id', course.id)
    if (error) {
      addToast(error.message, 'error')
      setStatus(status)
      return
    }
    addToast(next === 'published' ? 'Course published' : 'Course moved to draft', 'success')
    startTransition(() => router.refresh())
  }

  async function handleCoverUpload(file: File) {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: form })
      if (!res.ok) throw new Error('Upload failed')
      const data = (await res.json()) as { url: string }
      setCoverImage(data.url)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Upload failed', 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#eee] px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/admin/courses"
              className="p-1.5 rounded-lg text-[#999] hover:text-[#111] hover:bg-[#f5f5f5] transition-colors"
              aria-label="Back to admin courses"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.08em] font-bold text-[#bbb]">
                Admin &middot; editing live
              </p>
              <p className="text-[13px] font-heading font-semibold text-[#111] truncate">
                {course.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-3 mr-1 text-[11px] text-[#888]">
              <span className="inline-flex items-center gap-1" title="Modules">
                <Layers className="w-3.5 h-3.5" /> {counts.modules}
              </span>
              <span className="inline-flex items-center gap-1" title="Sections">
                <FileText className="w-3.5 h-3.5" /> {counts.sections}
              </span>
              <span className="inline-flex items-center gap-1" title="Health">
                <Blocks className="w-3.5 h-3.5" />
                {counts.sections > 0 ? 'OK' : 'Empty'}
              </span>
            </div>

            <button
              onClick={toggleStatus}
              className={`px-2.5 py-1 rounded-full text-[10px] font-heading font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                status === 'published'
                  ? 'bg-[#22c55e]/10 text-[#16a34a] hover:bg-[#22c55e]/20'
                  : 'bg-[#f5f5f5] text-[#888] hover:bg-[#eee]'
              }`}
              title="Click to toggle"
            >
              {status}
            </button>

            <button
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-[#555] hover:text-[#111] hover:bg-[#f5f5f5] transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </button>
          </div>
        </div>
      </div>

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Course Settings">
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-heading font-semibold text-[#555] mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#e8e8e8] text-[13px] text-[#111] focus:outline-none focus:border-nz-sakura/50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-heading font-semibold text-[#555] mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-[#e8e8e8] text-[13px] text-[#111] focus:outline-none focus:border-nz-sakura/50 resize-y"
            />
          </div>

          <div>
            <label className="block text-[11px] font-heading font-semibold text-[#555] mb-1.5">
              Cover Image
            </label>
            {coverImage ? (
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImage}
                  alt="Cover"
                  className="w-28 h-20 object-cover rounded-lg border border-[#e8e8e8]"
                />
                <button
                  onClick={() => setCoverImage('')}
                  className="text-[12px] text-[#888] hover:text-[#ef4444] transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center px-3 py-6 rounded-lg border-2 border-dashed border-[#e8e8e8] cursor-pointer hover:border-nz-sakura/40 hover:bg-nz-sakura/5 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleCoverUpload(f)
                  }}
                />
                <span className="text-[12px] text-[#888]">
                  {uploading ? 'Uploading…' : 'Click to upload'}
                </span>
              </label>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-heading font-semibold text-[#555] mb-1.5">
              Status
            </label>
            <div className="flex gap-2">
              {(['draft', 'published'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`flex-1 px-3 py-2 rounded-lg text-[12px] font-heading font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                    status === s
                      ? s === 'published'
                        ? 'bg-[#22c55e]/10 text-[#16a34a] border border-[#22c55e]/30'
                        : 'bg-[#111] text-white border border-[#111]'
                      : 'bg-white text-[#888] border border-[#e8e8e8] hover:border-[#ccc]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setSettingsOpen(false)}
              className="px-3 py-2 text-[12px] text-[#888] hover:text-[#111] transition-colors"
            >
              Cancel
            </button>
            <Button onClick={handleSave} loading={saving} size="sm">
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
