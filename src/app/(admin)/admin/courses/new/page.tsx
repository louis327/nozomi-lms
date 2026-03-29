'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Upload, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'

export default function NewCoursePage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [coverImage, setCoverImage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { data, error: insertError } = await supabase
      .from('courses')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        cover_image: coverImage,
        status,
      })
      .select('id')
      .single()

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    router.push(`/admin/courses/${data.id}/edit`)
  }

  return (
    <div className="max-w-2xl">
      <Link
        href="/admin/courses"
        className="inline-flex items-center gap-2 text-sm text-nz-text-tertiary hover:text-nz-text-primary transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Courses
      </Link>

      <h1 className="font-heading text-2xl font-bold text-nz-text-primary mb-8">
        Create New Course
      </h1>

      <div className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-nz-text-secondary mb-2">
            Course Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Web3 Fundraising Masterclass"
            className="w-full px-4 py-3 rounded-xl bg-nz-bg-tertiary border border-nz-border text-nz-text-primary placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40 transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-nz-text-secondary mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the course..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl bg-nz-bg-tertiary border border-nz-border text-nz-text-primary placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40 transition-colors resize-none"
          />
        </div>

        {/* Cover Image */}
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
              {uploading ? (
                <div className="flex items-center gap-2 text-nz-text-tertiary">
                  <Upload className="w-5 h-5 animate-pulse" />
                  <span className="text-sm">Uploading...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-nz-text-tertiary">
                  <ImageIcon className="w-8 h-8" />
                  <span className="text-sm">Click to upload cover image</span>
                </div>
              )}
            </label>
          )}
        </div>

        {/* Status toggle */}
        <div>
          <label className="block text-sm font-medium text-nz-text-secondary mb-2">
            Status
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setStatus('draft')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                status === 'draft'
                  ? 'bg-nz-warning/15 text-nz-warning border border-nz-warning/30'
                  : 'bg-nz-bg-tertiary text-nz-text-tertiary border border-nz-border hover:border-nz-border-hover'
              }`}
            >
              Draft
            </button>
            <button
              onClick={() => setStatus('published')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                status === 'published'
                  ? 'bg-nz-success/15 text-nz-success border border-nz-success/30'
                  : 'bg-nz-bg-tertiary text-nz-text-tertiary border border-nz-border hover:border-nz-border-hover'
              }`}
            >
              Published
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-nz-error bg-nz-error/10 px-4 py-3 rounded-xl border border-nz-error/20">
            {error}
          </p>
        )}

        <Button onClick={handleCreate} loading={saving} size="lg" className="w-full">
          Create Course
        </Button>
      </div>
    </div>
  )
}
