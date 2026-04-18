'use client'

import { useEffect } from 'react'
import { ArrowRight, Check, X } from 'lucide-react'
import type { ExtractedAnswer } from '@/lib/answer-extract'

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
          {answers.length === 0 ? (
            <p className="text-[13.5px] text-ink-soft">
              No prompts in this section. Your progress is saved.
            </p>
          ) : (
            <div className="space-y-7">
              <p className="text-[10.5px] font-semibold tracking-[0.22em] text-ink-muted uppercase">
                Your responses
              </p>
              {answers.map((a, i) => (
                <AnswerBlock key={i} answer={a} />
              ))}
            </div>
          )}
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

function AnswerBlock({ answer }: { answer: ExtractedAnswer }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold tracking-[0.22em] text-accent uppercase mb-2">
        {answer.prompt}
      </p>
      {renderAnswerBody(answer)}
    </div>
  )
}

function renderAnswerBody(answer: ExtractedAnswer) {
  switch (answer.kind) {
    case 'text': {
      if (!answer.answer.trim()) {
        return <p className="text-[13px] text-ink-faint italic">(no response)</p>
      }
      return (
        <div className="pl-4 border-l-2 border-line-soft">
          <p className="text-[15px] leading-[1.65] text-ink whitespace-pre-wrap">
            {answer.answer}
          </p>
        </div>
      )
    }

    case 'fields':
      return (
        <div className="space-y-2">
          {answer.fields.map((f, i) => (
            <div
              key={i}
              className="flex items-baseline gap-4 py-1.5 border-b border-line-soft last:border-0"
            >
              <span className="text-[12.5px] text-ink-soft w-2/5 shrink-0">
                {f.label}
              </span>
              <span className="flex-1 text-[14px] text-ink tabular-nums">
                {f.value || <span className="text-ink-faint italic">—</span>}
              </span>
            </div>
          ))}
        </div>
      )

    case 'table':
      return (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-[13px]" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            {answer.columns.length > 0 && (
              <thead>
                <tr className="bg-surface-muted">
                  {answer.columns.map((c, i) => (
                    <th
                      key={i}
                      className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted border-b border-line"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {answer.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-line-soft last:border-0">
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`px-4 py-2.5 ${
                        cell.editable
                          ? cell.value
                            ? 'text-ink'
                            : 'text-ink-faint italic'
                          : 'text-ink-soft font-medium'
                      }`}
                    >
                      {cell.value || (cell.editable ? '—' : '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case 'checklist':
      return (
        <ul className="space-y-1.5">
          {answer.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span
                className={`mt-[3px] inline-flex items-center justify-center w-4 h-4 rounded border ${
                  item.checked
                    ? 'bg-accent border-accent text-ink-inverted'
                    : 'border-line-strong text-transparent'
                }`}
              >
                <Check className="w-3 h-3" strokeWidth={2.5} />
              </span>
              <span
                className={`text-[13.5px] leading-[1.5] ${
                  item.checked ? 'text-ink' : 'text-ink-muted'
                }`}
              >
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      )

    case 'completion_checklist': {
      const allItems = answer.groups.flatMap((g) => g.items)
      const totalCount = allItems.length
      const checkedCount = allItems.filter((i) => i.checked).length
      return (
        <div className="space-y-5">
          {answer.subtitle && (
            <p className="text-[13px] text-ink-soft leading-[1.55]">{answer.subtitle}</p>
          )}
          <p className="text-[11px] font-mono tabular-nums tracking-wider uppercase text-ink-muted">
            {checkedCount} / {totalCount} checked
          </p>
          {answer.groups.map((g, gi) => (
            <div key={gi}>
              {g.heading && (
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-muted mb-2">
                  {g.heading}
                </p>
              )}
              <ul className="space-y-1.5">
                {g.items.map((item, ii) => (
                  <li key={ii} className="flex items-start gap-2.5">
                    <span
                      className={`mt-[3px] inline-flex items-center justify-center w-4 h-4 rounded border shrink-0 ${
                        item.checked
                          ? 'bg-accent border-accent text-ink-inverted'
                          : 'border-line-strong text-transparent'
                      }`}
                    >
                      <Check className="w-3 h-3" strokeWidth={2.5} />
                    </span>
                    <div className="min-w-0">
                      <p
                        className={`text-[13.5px] leading-[1.5] ${
                          item.checked ? 'text-ink' : 'text-ink-muted'
                        }`}
                      >
                        {item.label}
                      </p>
                      {item.hint && (
                        <p className="mt-0.5 text-[12px] leading-[1.45] text-ink-faint">
                          {item.hint}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )
    }
  }
}
