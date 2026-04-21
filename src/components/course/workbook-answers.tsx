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
    <div className="space-y-8">
      {answers.map((a, i) => (
        <AnswerBlock key={i} answer={a} />
      ))}
    </div>
  )
}

export function AnswerBlock({ answer }: { answer: ExtractedAnswer }) {
  return (
    <div>
      <p className="text-[14.5px] leading-[1.5] text-ink-soft mb-3">
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
        return <p className="text-[13.5px] text-ink-faint italic">No response.</p>
      }
      return (
        <p className="text-[15.5px] leading-[1.7] text-ink whitespace-pre-wrap">
          {answer.answer}
        </p>
      )
    }

    case 'fields':
      return (
        <dl className="divide-y divide-line-soft border-t border-b border-line-soft">
          {answer.fields.map((f, i) => (
            <div
              key={i}
              className="flex items-baseline gap-6 py-2.5"
            >
              <dt className="text-[13.5px] text-ink-soft w-2/5 shrink-0">
                {f.label}
              </dt>
              <dd className="flex-1 text-[14.5px] text-ink">
                {f.value || <span className="text-ink-faint italic">—</span>}
              </dd>
            </div>
          ))}
        </dl>
      )

    case 'table':
      return (
        <div className="overflow-x-auto">
          <table
            className="w-full text-[14px]"
            style={{ borderCollapse: 'collapse' }}
          >
            {answer.columns.length > 0 && (
              <thead>
                <tr>
                  {answer.columns.map((c, i) => (
                    <th
                      key={i}
                      className="px-3 py-2 text-left text-[13px] font-semibold text-ink-soft border-b border-line"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {answer.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`px-3 py-2 border-b border-line-soft ${
                        cell.editable
                          ? cell.value
                            ? 'text-ink'
                            : 'text-ink-faint italic'
                          : 'text-ink-soft'
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
        <ul className="space-y-2">
          {answer.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className={`mt-[4px] inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm border shrink-0 ${
                  item.checked
                    ? 'bg-ink border-ink text-ink-inverted'
                    : 'border-line-strong text-transparent'
                }`}
              >
                <Check className="w-2.5 h-2.5" strokeWidth={3} />
              </span>
              <span
                className={`text-[14.5px] leading-[1.55] ${
                  item.checked ? 'text-ink' : 'text-ink-faint line-through'
                }`}
              >
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      )

    case 'completion_checklist': {
      return (
        <div className="space-y-6">
          {answer.subtitle && (
            <p className="text-[14px] text-ink-soft leading-[1.6]">
              {answer.subtitle}
            </p>
          )}
          {answer.groups.map((g, gi) => (
            <div key={gi}>
              {g.heading && (
                <p className="text-[13.5px] font-semibold text-ink mb-2">
                  {g.heading}
                </p>
              )}
              <ul className="space-y-2">
                {g.items.map((item, ii) => (
                  <li key={ii} className="flex items-start gap-3">
                    <span
                      className={`mt-[4px] inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm border shrink-0 ${
                        item.checked
                          ? 'bg-ink border-ink text-ink-inverted'
                          : 'border-line-strong text-transparent'
                      }`}
                    >
                      <Check className="w-2.5 h-2.5" strokeWidth={3} />
                    </span>
                    <div className="min-w-0">
                      <p
                        className={`text-[14.5px] leading-[1.55] ${
                          item.checked ? 'text-ink' : 'text-ink-faint line-through'
                        }`}
                      >
                        {item.label}
                      </p>
                      {item.hint && (
                        <p className="mt-1 text-[13px] leading-[1.5] text-ink-muted">
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
