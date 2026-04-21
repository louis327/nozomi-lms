'use client'

import { useEffect } from 'react'
import { ArrowRight, Check, X } from 'lucide-react'
import type { ExtractedAnswer } from '@/lib/answer-extract'
import { WorkbookAnswers } from '@/components/course/workbook-answers'

type Props = {
  open: boolean
  sectionTitle: string
  answers: ExtractedAnswer[]
  completedAt: string | null
  primaryLabel: string
  onPrimary: () => void
  onClose: () => void
}

export function SectionRecapModal({
  open,
  sectionTitle,
  answers,
  completedAt,
  primaryLabel,
  onPrimary,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  const dateLabel = completedAt
    ? new Date(completedAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-[680px] max-h-[90vh] bg-surface rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-line">
        {/* Header */}
        <div className="shrink-0 relative px-8 py-6 border-b border-line-soft">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-surface-muted flex items-center justify-center text-ink-muted hover:text-ink transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-success/15 text-success">
              <Check className="w-3 h-3" strokeWidth={2.5} />
            </span>
            <p className="text-[10.5px] font-semibold tracking-[0.28em] text-success uppercase">
              Section complete
            </p>
          </div>

          <h2
            className="text-ink"
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 700,
              fontStyle: 'italic',
              fontSize: 'clamp(22px, 2.6cqi, 30px)',
              lineHeight: 1.08,
              letterSpacing: '-0.025em',
            }}
          >
            {sectionTitle}
          </h2>

          {dateLabel && (
            <p className="mt-2 text-[11px] font-mono tabular-nums tracking-wider text-ink-faint uppercase">
              {dateLabel}
            </p>
          )}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {answers.length > 0 && (
            <p className="text-[10.5px] font-semibold tracking-[0.22em] text-ink-muted uppercase mb-7">
              Your responses
            </p>
          )}
          <WorkbookAnswers answers={answers} />
        </div>

        {/* Footer */}
        <div className="shrink-0 px-8 py-5 border-t border-line-soft flex items-center justify-between gap-3 bg-surface-muted/40">
          <button
            onClick={onClose}
            className="text-[12.5px] font-medium text-ink-soft hover:text-ink transition-colors cursor-pointer"
          >
            Back to section
          </button>
          <button
            onClick={onPrimary}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink text-ink-inverted text-[13px] font-semibold hover:bg-accent transition-colors cursor-pointer"
          >
            {primaryLabel}
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}

