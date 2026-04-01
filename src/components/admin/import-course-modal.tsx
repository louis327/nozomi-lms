'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Upload, CheckCircle2, AlertCircle, FileText, Link2, Type, Sparkles, Clock, BookOpen, Layers, LayoutList, Blocks } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

type InputMode = 'paste' | 'link' | 'pdf'
type ImportPhase = 'idle' | 'sending' | 'waiting' | 'course-found' | 'building' | 'done' | 'error'

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

interface LiveProgress {
  courseId?: string
  courseTitle?: string
  modules: number
  sections: number
  blocks: number
}

const phaseLabels: Record<ImportPhase, string> = {
  idle: '',
  sending: 'Sending to AI...',
  waiting: 'Claude Opus is analyzing your content...',
  'course-found': 'Course created! Building structure...',
  building: 'Adding modules, sections & blocks...',
  done: 'Import complete!',
  error: 'Import failed',
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
  const [phase, setPhase] = useState<ImportPhase>('idle')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [progress, setProgress] = useState<LiveProgress>({ modules: 0, sections: 0, blocks: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<string>('')
  const importingRef = useRef(false)
  const phaseRef = useRef<ImportPhase>('idle')
  const pendingFinishRef = useRef<ImportResult | null>(null)

  const setPhaseSync = useCallback((p: ImportPhase) => {
    phaseRef.current = p
    setPhase(p)
  }, [])

  const stopAll = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    importingRef.current = false
  }, [])

  useEffect(() => () => stopAll(), [stopAll])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}s`
  }

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

    const supabase = createClient()
    importingRef.current = true
    pendingFinishRef.current = null
    setPhaseSync('sending')
    setResult(null)
    setElapsed(0)
    setProgress({ modules: 0, sections: 0, blocks: 0 })

    // Start elapsed timer
    timerRef.current = setInterval(() => setElapsed((t) => t + 1), 1000)

    // Record start time for polling
    startTimeRef.current = new Date().toISOString()

    // Build payload
    const payload: Record<string, string> = { courseTitle, courseDescription }
    if (inputMode === 'paste') payload.content = content
    else if (inputMode === 'link') payload.googleDocUrl = googleDocUrl
    else if (inputMode === 'pdf') {
      payload.pdfBase64 = pdfBase64
      payload.pdfFileName = pdfFile?.name || 'document.pdf'
    }

    // Fire and forget — don't wait for n8n response
    fetch('https://n8n.textflow.com.au/webhook/nozomi-import-course', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(async (res) => {
      try {
        const data: ImportResult = await res.json()
        if (data.success && importingRef.current) {
          // Don't finish immediately — store it so polling can show progress first
          pendingFinishRef.current = data
        }
      } catch {
        // Response parse failed, polling will handle it
      }
    }).catch(() => {
      // Network timeout is expected for long imports — polling handles it
    })

    // After 2 seconds, switch to waiting phase and start polling
    setTimeout(() => {
      if (!importingRef.current) return
      setPhaseSync('waiting')
      startPolling(supabase)
    }, 2000)

    // Hard timeout: 10 minutes
    setTimeout(() => {
      if (!importingRef.current) return
      stopAll()
      setPhaseSync('error')
      setResult({
        success: false,
        error: 'Import timed out after 10 minutes. The course may still be building — check your courses list in a moment.',
      })
    }, 600000)
  }

  const startPolling = (supabase: ReturnType<typeof createClient>) => {
    let lastBlockCount = 0
    let stableCount = 0

    pollRef.current = setInterval(async () => {
      if (!importingRef.current) return

      try {
        // Look for courses created after we started
        const { data: courses } = await supabase
          .from('courses')
          .select('id, title')
          .gte('created_at', startTimeRef.current)
          .order('created_at', { ascending: false })
          .limit(1)

        if (!courses || courses.length === 0) {
          // No course yet — if n8n already responded with success, use that
          if (pendingFinishRef.current) {
            finishSuccess(pendingFinishRef.current)
          }
          return
        }

        const course = courses[0]
        setProgress((p) => ({ ...p, courseId: course.id, courseTitle: course.title }))

        // Use ref to check current phase (avoids stale closure)
        const currentPhase = phaseRef.current
        if (currentPhase === 'waiting' || currentPhase === 'sending') {
          setPhaseSync('course-found')
        }

        // Count modules
        const { count: moduleCount } = await supabase
          .from('modules')
          .select('id', { count: 'exact', head: true })
          .eq('course_id', course.id)

        // Count sections via modules
        const { data: modules } = await supabase
          .from('modules')
          .select('id')
          .eq('course_id', course.id)

        const moduleIds = (modules || []).map((m) => m.id)
        let sectionCount = 0
        let blockCount = 0

        if (moduleIds.length > 0) {
          const { count: sc } = await supabase
            .from('sections')
            .select('id', { count: 'exact', head: true })
            .in('module_id', moduleIds)
          sectionCount = sc || 0

          // Count blocks via sections
          const { data: sections } = await supabase
            .from('sections')
            .select('id')
            .in('module_id', moduleIds)

          const sectionIds = (sections || []).map((s) => s.id)
          if (sectionIds.length > 0) {
            const { count: bc } = await supabase
              .from('content_blocks')
              .select('id', { count: 'exact', head: true })
              .in('section_id', sectionIds)
            blockCount = bc || 0
          }
        }

        setProgress({
          courseId: course.id,
          courseTitle: course.title,
          modules: moduleCount || 0,
          sections: sectionCount,
          blocks: blockCount,
        })

        if ((moduleCount || 0) > 0 && phaseRef.current === 'course-found') {
          setPhaseSync('building')
        }

        // Detect completion: either n8n responded OR block count stable for 3 polls
        const n8nDone = !!pendingFinishRef.current
        if (blockCount > 0 && blockCount === lastBlockCount) {
          stableCount++
          // Finish faster if n8n already confirmed success, or wait 3 stable polls
          if (n8nDone || stableCount >= 3) {
            finishSuccess({
              success: true,
              courseId: course.id,
              courseTitle: course.title,
              modulesCreated: moduleCount || 0,
              sectionsCreated: sectionCount,
              blocksCreated: blockCount,
              message: `Course "${course.title}" imported with ${moduleCount || 0} modules, ${sectionCount} sections, and ${blockCount} content blocks.`,
            })
          }
        } else {
          lastBlockCount = blockCount
          stableCount = 0
        }
      } catch {
        // Polling error — continue trying
      }
    }, 3000)
  }

  const finishSuccess = (data: ImportResult) => {
    if (!importingRef.current) return
    stopAll()
    setPhaseSync('done')
    setResult(data)
    setTimeout(() => {
      onSuccess()
      onClose()
    }, 2500)
  }

  const isImporting = phase !== 'idle' && phase !== 'done' && phase !== 'error'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={isImporting ? undefined : onClose} />

      <div className="relative w-full max-w-2xl bg-nz-bg-card border border-nz-border rounded-2xl shadow-xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-nz-border">
          <div>
            <h2 className="text-lg font-heading font-semibold text-nz-text-primary">Import Course</h2>
            <p className="text-xs text-nz-text-muted mt-0.5">Paste content, link a Google Doc, or upload a PDF</p>
          </div>
          {!isImporting && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-nz-text-muted hover:text-nz-text-primary hover:bg-nz-bg-elevated transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Form fields — hidden during import */}
          {!isImporting && phase !== 'done' && (
            <>
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
            </>
          )}

          {/* Live progress panel */}
          {isImporting && (
            <div className="space-y-4">
              {/* Animated header */}
              <div className="flex items-center gap-4 py-2">
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-nz-sakura/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-nz-sakura border-t-transparent animate-spin" />
                  <Sparkles className="w-5 h-5 text-nz-sakura" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-heading font-semibold text-nz-text-primary">
                    {phaseLabels[phase]}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3.5 h-3.5 text-nz-text-muted" />
                    <span className="text-sm text-nz-text-muted font-mono">{formatTime(elapsed)}</span>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-nz-bg-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-nz-sakura rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: phase === 'sending' ? '5%'
                      : phase === 'waiting' ? `${Math.min(45, 5 + (elapsed / 300) * 40)}%`
                      : phase === 'course-found' ? '50%'
                      : phase === 'building' ? `${Math.min(95, 50 + (progress.blocks / Math.max(progress.blocks + 5, 20)) * 45)}%`
                      : '100%',
                  }}
                />
              </div>

              {/* Live stats grid */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { icon: BookOpen, label: 'Course', value: progress.courseId ? '1' : '—', active: !!progress.courseId },
                  { icon: Layers, label: 'Modules', value: progress.modules > 0 ? String(progress.modules) : '—', active: progress.modules > 0 },
                  { icon: LayoutList, label: 'Sections', value: progress.sections > 0 ? String(progress.sections) : '—', active: progress.sections > 0 },
                  { icon: Blocks, label: 'Blocks', value: progress.blocks > 0 ? String(progress.blocks) : '—', active: progress.blocks > 0 },
                ].map((stat) => {
                  const Icon = stat.icon
                  return (
                    <div
                      key={stat.label}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-500 ${
                        stat.active
                          ? 'bg-nz-sakura/5 border-nz-sakura/20'
                          : 'bg-nz-bg-tertiary/50 border-nz-border/50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${stat.active ? 'text-nz-sakura' : 'text-nz-text-muted'}`} />
                      <span className={`text-lg font-heading font-bold ${stat.active ? 'text-nz-text-primary' : 'text-nz-text-muted'}`}>
                        {stat.value}
                      </span>
                      <span className="text-[10px] text-nz-text-muted uppercase tracking-wider">{stat.label}</span>
                    </div>
                  )
                })}
              </div>

              {/* Contextual tips */}
              <p className="text-xs text-nz-text-muted text-center">
                {elapsed < 15
                  ? 'Claude Opus is the most capable AI model — it takes time but produces elite results.'
                  : elapsed < 60
                    ? 'Analyzing document structure, identifying key concepts...'
                    : elapsed < 180
                      ? 'Building out modules with rich content blocks, callouts, and exercises...'
                      : 'Finalizing — large courses can take up to 5 minutes. Your content is being preserved in full.'}
              </p>
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
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-nz-border bg-nz-bg-secondary">
          {!isImporting && (
            <Button variant="secondary" size="sm" onClick={onClose}>
              {result ? 'Close' : 'Cancel'}
            </Button>
          )}
          {!result && (
            <Button
              size="sm"
              onClick={handleImport}
              disabled={!isReady() || isImporting}
            >
              <Upload className="w-4 h-4" />
              {isImporting ? 'Importing...' : 'Import Course'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
