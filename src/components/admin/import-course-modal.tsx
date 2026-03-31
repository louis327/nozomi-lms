'use client'

import { useState } from 'react'
import { X, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImportResult {
  success: boolean
  courseId?: string
  courseTitle?: string
  modulesCreated?: number
  sectionsCreated?: number
  blocksCreated?: number
  message?: string
  error?: string
}

export function ImportCourseModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [courseTitle, setCourseTitle] = useState('')
  const [courseDescription, setCourseDescription] = useState('')
  const [content, setContent] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const handleImport = async () => {
    if (!content.trim() || !courseTitle.trim()) return
    setImporting(true)
    setResult(null)

    try {
      const res = await fetch('https://n8n.textflow.com.au/webhook/nozomi-import-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseTitle, courseDescription, content }),
      })

      const data: ImportResult = await res.json()
      setResult(data)

      if (data.success) {
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 2000)
      }
    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : 'Import failed',
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-nz-bg-secondary border border-nz-border rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-nz-border">
          <div>
            <h2 className="text-lg font-heading font-semibold text-nz-text-primary">Import Course</h2>
            <p className="text-xs text-nz-text-muted mt-0.5">Paste your content and AI will build the course structure</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-nz-text-muted hover:text-nz-text-primary hover:bg-nz-bg-elevated transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-nz-text-secondary mb-1.5">Course Title</label>
            <input
              type="text"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              placeholder="e.g., Raise Web3 - Fundraising Masterclass"
              className="w-full px-4 py-2.5 rounded-xl bg-nz-bg-tertiary border border-nz-border text-sm text-nz-text-primary placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-nz-text-secondary mb-1.5">Description (optional)</label>
            <input
              type="text"
              value={courseDescription}
              onChange={(e) => setCourseDescription(e.target.value)}
              placeholder="Brief course description..."
              className="w-full px-4 py-2.5 rounded-xl bg-nz-bg-tertiary border border-nz-border text-sm text-nz-text-primary placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-nz-text-secondary mb-1.5">
              Course Content
              <span className="text-nz-text-muted font-normal ml-2">Paste your document content here</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your full course content here — modules, sections, tables, exercises, everything. The AI will parse it into the correct block types automatically."
              rows={12}
              className="w-full px-4 py-3 rounded-xl bg-nz-bg-tertiary border border-nz-border text-sm text-nz-text-primary placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40 resize-none transition-colors font-mono leading-relaxed"
            />
            {content && (
              <p className="text-xs text-nz-text-muted mt-1">
                {content.length.toLocaleString()} characters
              </p>
            )}
          </div>

          {/* Result */}
          {result && (
            <div
              className={`flex items-start gap-3 p-4 rounded-xl border ${
                result.success
                  ? 'bg-nz-success/5 border-nz-success/20'
                  : 'bg-nz-error/5 border-nz-error/20'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="w-5 h-5 text-nz-success flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-nz-error flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`text-sm font-medium ${result.success ? 'text-nz-success' : 'text-nz-error'}`}>
                  {result.success ? 'Course imported successfully!' : 'Import failed'}
                </p>
                <p className="text-xs text-nz-text-tertiary mt-1">
                  {result.message || result.error}
                </p>
                {result.success && (
                  <p className="text-xs text-nz-text-muted mt-1">
                    {result.modulesCreated} modules, {result.sectionsCreated} sections, {result.blocksCreated} content blocks
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-nz-border bg-nz-bg-primary/30">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={importing}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleImport}
            loading={importing}
            disabled={!content.trim() || !courseTitle.trim()}
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Building course with AI...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Import Course
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
