'use client'

import { ChevronDown } from 'lucide-react'

type Course = { id: string; title: string }
type FunnelRow = {
  sectionId: string
  moduleTitle: string
  sectionTitle: string
  reached: number
  completed: number
}

type Props = {
  courses: Course[]
  selectedCourseId: string | null
  courseTitle: string
  enrolled: number
  funnel: FunnelRow[]
}

export function AnalyticsView({
  courses,
  selectedCourseId,
  courseTitle,
  enrolled,
  funnel,
}: Props) {
  const peak = Math.max(enrolled, ...funnel.map((f) => f.reached), 1)

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#888] mb-1.5">
          Course
        </label>
        <div className="relative max-w-md">
          <select
            value={selectedCourseId ?? ''}
            onChange={(e) => {
              const v = e.target.value
              window.location.href = v ? `/admin/analytics?courseId=${v}` : '/admin/analytics'
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

      {!selectedCourseId ? (
        <div className="py-16 text-center text-sm text-[#999]">
          Pick a course to see drop-off.
        </div>
      ) : (
        <div>
          <div className="flex items-baseline gap-3 mb-5">
            <p className="text-[15px] font-heading font-semibold text-[#111]">{courseTitle}</p>
            <p className="text-[12px] text-[#888]">
              {enrolled} enrolled · {funnel.length} sections
            </p>
          </div>

          {funnel.length === 0 ? (
            <p className="text-sm text-[#999] italic">No sections in this course.</p>
          ) : (
            <div className="rounded-xl border border-[#eee] bg-white overflow-hidden">
              <div className="grid grid-cols-[2fr_1fr_1fr_2fr] px-4 py-2 text-[10.5px] uppercase tracking-wider font-semibold text-[#888] bg-[#fafafa] border-b border-[#eee]">
                <span>Section</span>
                <span className="text-right">Reached</span>
                <span className="text-right">Completed</span>
                <span>Funnel</span>
              </div>
              {funnel.map((f, i) => {
                const dropoff =
                  i === 0
                    ? enrolled - f.reached
                    : (funnel[i - 1].completed) - f.reached
                const reachedPct = Math.round((f.reached / peak) * 100)
                const completedPct = Math.round((f.completed / peak) * 100)
                return (
                  <div
                    key={f.sectionId}
                    className="grid grid-cols-[2fr_1fr_1fr_2fr] items-center px-4 py-2.5 border-b border-[#f3f3f3] last:border-b-0 hover:bg-[#fafafa] transition-colors"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-[10px] uppercase tracking-wider text-[#aaa] truncate">
                        {f.moduleTitle}
                      </p>
                      <p className="text-[12.5px] text-[#111] truncate">{f.sectionTitle}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[12.5px] text-[#111] tabular-nums">{f.reached}</p>
                      {dropoff > 0 && (
                        <p className="text-[10px] text-[#ef4444] tabular-nums">−{dropoff}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[12.5px] text-[#16a34a] tabular-nums">{f.completed}</p>
                      <p className="text-[10px] text-[#999] tabular-nums">
                        {f.reached > 0 ? Math.round((f.completed / f.reached) * 100) : 0}%
                      </p>
                    </div>
                    <div className="pl-2">
                      <div className="relative w-full h-3 bg-[#f5f5f5] rounded-full overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-[#fde0e0]"
                          style={{ width: `${reachedPct}%` }}
                        />
                        <div
                          className="absolute inset-y-0 left-0 bg-[#16a34a]"
                          style={{ width: `${completedPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
