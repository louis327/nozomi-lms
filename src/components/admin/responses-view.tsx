'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { extractSectionAnswers, type ExtractedAnswer } from '@/lib/answer-extract'
import type { ContentBlock } from '@/lib/types'

type CourseTree = {
  id: string
  title: string
  modules: {
    id: string
    title: string
    sort_order: number
    sections: { id: string; title: string; sort_order: number }[]
  }[]
}

type Response = {
  user_id: string
  full_name: string | null
  email: string | null
  workbook_data: Record<string, unknown> | null
  completed: boolean
  completed_at: string | null
  updated_at: string
}

type Props = {
  courses: CourseTree[]
  selectedCourseId: string | null
  selectedSectionId: string | null
  sectionTitle: string
  blocks: ContentBlock[]
  responses: Response[]
}

function AnswerBlock({ a }: { a: ExtractedAnswer }) {
  if (a.kind === 'text') {
    return (
      <div className="space-y-1">
        <p className="text-[10.5px] uppercase tracking-[0.18em] font-semibold text-[#888]">
          {a.prompt}
        </p>
        <p className="text-[13px] text-[#222] whitespace-pre-wrap">
          {a.answer || <span className="italic text-[#bbb]">No answer</span>}
        </p>
      </div>
    )
  }
  if (a.kind === 'fields') {
    return (
      <div className="space-y-1">
        <p className="text-[10.5px] uppercase tracking-[0.18em] font-semibold text-[#888]">
          {a.prompt}
        </p>
        <ul className="space-y-0.5">
          {a.fields.map((f, i) => (
            <li key={i} className="text-[13px] text-[#222]">
              <span className="text-[#999] mr-1.5">{f.label}:</span>
              {f.value || <span className="italic text-[#bbb]">—</span>}
            </li>
          ))}
        </ul>
      </div>
    )
  }
  if (a.kind === 'checklist') {
    return (
      <div className="space-y-1">
        <p className="text-[10.5px] uppercase tracking-[0.18em] font-semibold text-[#888]">
          {a.prompt}
        </p>
        <ul className="space-y-0.5">
          {a.items.map((it, i) => (
            <li key={i} className="text-[13px] text-[#222] flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded border ${
                  it.checked ? 'bg-[#16a34a] border-[#16a34a]' : 'border-[#ccc]'
                }`}
              />
              {it.label}
            </li>
          ))}
        </ul>
      </div>
    )
  }
  if (a.kind === 'completion_checklist') {
    return (
      <div className="space-y-1">
        <p className="text-[10.5px] uppercase tracking-[0.18em] font-semibold text-[#888]">
          {a.prompt}
        </p>
        {a.groups.map((g, gi) => (
          <div key={gi} className="mt-2">
            {g.heading && (
              <p className="text-[11.5px] font-semibold text-[#444]">{g.heading}</p>
            )}
            <ul className="space-y-0.5 mt-1">
              {g.items.map((it, ii) => (
                <li key={ii} className="text-[12.5px] text-[#222] flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded border ${
                      it.checked ? 'bg-[#16a34a] border-[#16a34a]' : 'border-[#ccc]'
                    }`}
                  />
                  {it.label}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    )
  }
  if (a.kind === 'table') {
    return (
      <div className="space-y-1">
        <p className="text-[10.5px] uppercase tracking-[0.18em] font-semibold text-[#888]">
          {a.prompt}
        </p>
        <table className="text-[12px] border border-[#eee] rounded">
          <thead className="bg-[#fafafa]">
            <tr>
              {a.columns.map((c, i) => (
                <th key={i} className="px-2 py-1 text-left text-[#666]">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {a.rows.map((row, ri) => (
              <tr key={ri} className="border-t border-[#f0f0f0]">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-2 py-1 text-[#222]">
                    {cell.value || <span className="italic text-[#bbb]">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  return null
}

export function ResponsesView({
  courses,
  selectedCourseId,
  selectedSectionId,
  sectionTitle,
  blocks,
  responses,
}: Props) {
  const [expandedUser, setExpandedUser] = useState<string | null>(null)

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  )

  const sectionsFlat = useMemo(() => {
    if (!selectedCourse) return []
    const list: { id: string; label: string }[] = []
    const mods = [...selectedCourse.modules].sort((a, b) => a.sort_order - b.sort_order)
    for (const m of mods) {
      const secs = [...(m.sections ?? [])].sort((a, b) => a.sort_order - b.sort_order)
      for (const s of secs) {
        list.push({ id: s.id, label: `${m.title} · ${s.title}` })
      }
    }
    return list
  }, [selectedCourse])

  return (
    <div className="space-y-6">
      {/* Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#888] mb-1.5">
            Course
          </label>
          <div className="relative">
            <select
              value={selectedCourseId ?? ''}
              onChange={(e) => {
                const v = e.target.value
                if (v) window.location.href = `/admin/responses?courseId=${v}`
                else window.location.href = '/admin/responses'
              }}
              className="w-full appearance-none px-3 py-2 pr-9 rounded-lg border border-[#e8e8e8] bg-white text-[13px] text-[#111] focus:outline-none focus:border-nz-sakura/50 cursor-pointer"
            >
              <option value="">— Select course —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999] pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#888] mb-1.5">
            Section
          </label>
          <div className="relative">
            <select
              value={selectedSectionId ?? ''}
              disabled={!selectedCourseId}
              onChange={(e) => {
                const v = e.target.value
                if (v && selectedCourseId) {
                  window.location.href = `/admin/responses?courseId=${selectedCourseId}&sectionId=${v}`
                } else if (selectedCourseId) {
                  window.location.href = `/admin/responses?courseId=${selectedCourseId}`
                }
              }}
              className="w-full appearance-none px-3 py-2 pr-9 rounded-lg border border-[#e8e8e8] bg-white text-[13px] text-[#111] focus:outline-none focus:border-nz-sakura/50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="">— Select section —</option>
              {sectionsFlat.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Results */}
      {!selectedSectionId ? (
        <div className="py-16 text-center text-sm text-[#999]">
          Pick a course and section to view responses.
        </div>
      ) : responses.length === 0 ? (
        <div className="py-16 text-center text-sm text-[#999]">
          No student responses for <span className="font-semibold text-[#444]">{sectionTitle}</span> yet.
        </div>
      ) : (
        <div>
          <p className="text-[11px] uppercase tracking-wider font-semibold text-[#888] mb-3">
            {responses.length} response{responses.length === 1 ? '' : 's'} · {sectionTitle}
          </p>
          <div className="space-y-2">
            {responses.map((r) => {
              const answers = extractSectionAnswers(blocks, r.workbook_data ?? {})
              const isOpen = expandedUser === r.user_id
              return (
                <div
                  key={r.user_id}
                  className="border border-[#eee] rounded-xl bg-white overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedUser(isOpen ? null : r.user_id)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#fafafa] transition-colors cursor-pointer text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#111] truncate">
                        {r.full_name || r.email || 'Anonymous'}
                      </p>
                      <p className="text-[11px] text-[#888] truncate">
                        {r.email || 'no email'} ·{' '}
                        {r.completed ? (
                          <span className="text-[#16a34a] font-medium">Completed</span>
                        ) : (
                          <span className="text-[#888]">In progress</span>
                        )}
                        {r.completed_at && (
                          <> · {new Date(r.completed_at).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-[#999] shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 py-4 border-t border-[#f0f0f0] bg-[#fafbfc] space-y-5">
                      {answers.length === 0 ? (
                        <p className="italic text-[#bbb] text-[12.5px]">
                          Saved data exists but no prompts to display.
                        </p>
                      ) : (
                        answers.map((a, i) => <AnswerBlock key={i} a={a} />)
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {selectedCourseId && (
            <div className="mt-6">
              <Link
                href={`/courses/${selectedCourseId}/learn/${selectedSectionId}`}
                className="inline-flex items-center gap-1.5 text-[12px] text-[#888] hover:text-nz-sakura transition-colors"
              >
                Open this section →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
