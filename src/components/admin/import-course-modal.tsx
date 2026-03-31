'use client'

import { useState, useRef } from 'react'
import { X, Upload, Loader2, CheckCircle2, AlertCircle, FileText, Link2, Type } from 'lucide-react'
import { Button } from '@/components/ui/button'

type InputMode = 'paste' | 'link' | 'pdf'

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

const modes = [
  { key: 'paste' as const, label: 'Paste', icon: Type },
  { key: 'link' as const, label: 'Google Doc', icon: Link2 },
  { key: 'pdf' as const, label: 'Upload PDF', icon: FileText },
]

export function ImportCourseModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [courseTitle, setCourseTitle] = useState('')
  const [courseDescription, setCourseDescription] = useState('')
  const [content, setContent] = useState('')
  const [googleDocUrl, setGoogleDocUrl] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfBase64, setPdfBase64] = useState('')
  const [inputMode, setInputMode] = useState<InputMode>('paste')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPdfFile(file)

    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      setPdfBase64(base64)
    }
    reader.readAsDataURL(file)
  }

  const isReady = () => {
    if (!courseTitle.trim()) return false
    if (inputMode === 'paste') return !!content.trim()
    if (inputMode === 'link') return !!googleDocUrl.trim()
    if (inputMode === 'pdf') return !!pdfBase64
    return false
  }

  const handleImport = async () => {
    if (!isReady()) return
    setImporting(true)
    setResult(null)

    try {
      const payload: Record<string, string> = {
        courseTitle,
        courseDescription,
      }

      if (inputMode === 'paste') {
        payload.content = content
      } else if (inputMode === 'link') {
        payload.googleDocUrl = googleDocUrl
      } else if (inputMode === 'pdf') {
        payload.pdfBase64 = pdfBase64
        payload.pdfFileName = pdfFile?.name || 'document.pdf'
      }

      const res = await fetch('https://n8n.textflow.com.au/webhook/nozomi-import-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
            <p className="text-xs text-nz-text-muted mt-0.5">Paste content, link a Google Doc, or upload a PDF</p>
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

          {/* Input mode tabs */}
          <div>
            <label className="block text-sm font-medium text-nz-text-secondary mb-2">Content Source</label>
            <div className="flex gap-1 bg-nz-bg-tertiary rounded-xl p-1 border border-nz-border">
              {modes.map((mode) => {
                const Icon = mode.icon
                return (
                  <button
                    key={mode.key}
                    onClick={() => setInputMode(mode.key)}
                    className={`flex items-center gap-1.5 flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      inputMode === mode.key
                        ? 'bg-nz-bg-elevated text-nz-text-primary'
                        : 'text-nz-text-tertiary hover:text-nz-text-secondary'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {mode.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Paste mode */}
          {inputMode === 'paste' && (
            <div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste your full course content here — modules, sections, tables, exercises, everything. The AI will parse it into the correct block types automatically."
                rows={10}
                className="w-full px-4 py-3 rounded-xl bg-nz-bg-tertiary border border-nz-border text-sm text-nz-text-primary placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40 resize-none transition-colors font-mono leading-relaxed"
              />
              {content && (
                <p className="text-xs text-nz-text-muted mt-1">
                  {content.length.toLocaleString()} characters
                </p>
              )}
            </div>
          )}

          {/* Google Doc link mode */}
          {inputMode === 'link' && (
            <div className="space-y-2">
              <input
                type="url"
                value={googleDocUrl}
                onChange={(e) => setGoogleDocUrl(e.target.value)}
                placeholder="https://docs.google.com/document/d/..."
                className="w-full px-4 py-2.5 rounded-xl bg-nz-bg-tertiary border border-nz-border text-sm text-nz-text-primary placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40 transition-colors"
              />
              <p className="text-xs text-nz-text-muted">
                The document must be publicly accessible or shared with &quot;Anyone with the link&quot;.
              </p>
            </div>
          )}

          {/* PDF upload mode */}
          {inputMode === 'pdf' && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handlePdfSelect}
                className="hidden"
              />
              {pdfFile ? (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-nz-bg-tertiary border border-nz-border">
                  <FileText className="w-5 h-5 text-nz-sakura flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-nz-text-primary truncate">{pdfFile.name}</p>
                    <p className="text-xs text-nz-text-muted">
                      {(pdfFile.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setPdfFile(null)
                      setPdfBase64('')
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="text-xs text-nz-error hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center w-full py-10 rounded-xl border-2 border-dashed border-nz-border hover:border-nz-sakura/40 bg-nz-bg-tertiary cursor-pointer transition-colors"
                >
                  <Upload className="w-8 h-8 text-nz-text-muted mb-2" />
                  <span className="text-sm text-nz-text-tertiary">Click to upload PDF</span>
                  <span className="text-xs text-nz-text-muted mt-1">Max 10MB</span>
                </button>
              )}
            </div>
          )}

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
            disabled={!isReady()}
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
