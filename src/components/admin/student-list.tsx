'use client'

import { useState } from 'react'
import { Search, ChevronDown, ChevronRight } from 'lucide-react'

interface CourseProgress {
  completed: number
  total: number
  title: string
}

interface Student {
  id: string
  full_name: string | null
  email: string
  created_at: string
  enrolledCount: number
  courseProgress: Record<string, CourseProgress>
  lastActive: string | null
}

export function StudentList({ students }: { students: Student[] }) {
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = students.filter((s) => {
    const q = search.toLowerCase()
    return (
      (s.full_name?.toLowerCase().includes(q) ?? false) ||
      s.email.toLowerCase().includes(q)
    )
  })

  return (
    <div>
      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-nz-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-nz-bg-tertiary border border-nz-border text-nz-text-primary placeholder:text-nz-text-muted focus:outline-none focus:border-nz-sakura/40 transition-colors"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-nz-bg-card border border-nz-border rounded-2xl p-12 text-center">
          <p className="text-nz-text-tertiary text-sm">
            {search ? 'No students match your search.' : 'No students enrolled yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-nz-bg-card border border-nz-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-nz-border">
                <th className="text-left px-6 py-4 text-xs font-semibold text-nz-text-tertiary uppercase tracking-wider w-8" />
                <th className="text-left px-6 py-4 text-xs font-semibold text-nz-text-tertiary uppercase tracking-wider">
                  Student
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-nz-text-tertiary uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-nz-text-tertiary uppercase tracking-wider">
                  Courses
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-nz-text-tertiary uppercase tracking-wider">
                  Last Active
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nz-border/50">
              {filtered.map((student) => {
                const isExpanded = expandedId === student.id
                const courseEntries = Object.entries(student.courseProgress)
                return (
                  <tr key={student.id} className="group">
                    <td colSpan={5} className="p-0">
                      <div>
                        {/* Main row */}
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : student.id)}
                          className="flex items-center w-full text-left hover:bg-nz-bg-elevated/30 transition-colors cursor-pointer"
                        >
                          <div className="px-6 py-4 w-8">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-nz-text-tertiary" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-nz-text-muted" />
                            )}
                          </div>
                          <div className="flex-1 px-6 py-4">
                            <p className="text-sm font-medium text-nz-text-primary">
                              {student.full_name || 'Unnamed'}
                            </p>
                          </div>
                          <div className="flex-1 px-6 py-4">
                            <p className="text-sm text-nz-text-secondary">{student.email}</p>
                          </div>
                          <div className="px-6 py-4 w-32">
                            <p className="text-sm text-nz-text-secondary">{student.enrolledCount}</p>
                          </div>
                          <div className="px-6 py-4 w-40">
                            <p className="text-sm text-nz-text-tertiary">
                              {student.lastActive
                                ? new Date(student.lastActive).toLocaleDateString()
                                : 'Never'}
                            </p>
                          </div>
                        </button>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="px-6 pb-4 ml-14">
                            {courseEntries.length === 0 ? (
                              <p className="text-xs text-nz-text-muted py-2">No enrolled courses.</p>
                            ) : (
                              <div className="space-y-2">
                                {courseEntries.map(([courseId, cp]) => {
                                  const pct = cp.total > 0 ? Math.round((cp.completed / cp.total) * 100) : 0
                                  return (
                                    <div
                                      key={courseId}
                                      className="flex items-center gap-4 px-4 py-3 rounded-xl bg-nz-bg-tertiary border border-nz-border/50"
                                    >
                                      <span className="flex-1 text-sm text-nz-text-secondary">
                                        {cp.title}
                                      </span>
                                      <div className="flex items-center gap-3 w-48">
                                        <div className="flex-1 h-2 rounded-full bg-nz-bg-primary overflow-hidden">
                                          <div
                                            className="h-full rounded-full bg-nz-sakura transition-all"
                                            style={{ width: `${pct}%` }}
                                          />
                                        </div>
                                        <span className="text-xs text-nz-text-tertiary w-16 text-right">
                                          {cp.completed}/{cp.total} ({pct}%)
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
