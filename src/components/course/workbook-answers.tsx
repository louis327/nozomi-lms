import { Check } from 'lucide-react'
import type { ExtractedAnswer } from '@/lib/answer-extract'

export function WorkbookAnswers({ answers }: { answers: ExtractedAnswer[] }) {
  if (answers.length === 0) {
    return (
      <p className="text-[13.5px] text-ink-soft">
        No prompts in this section. Your progress is saved.
      </p>
    )
  }
  return (
    <div className="space-y-7">
      {answers.map((a, i) => (
        <AnswerBlock key={i} answer={a} />
      ))}
    </div>
  )
}

export function AnswerBlock({ answer }: { answer: ExtractedAnswer }) {
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
