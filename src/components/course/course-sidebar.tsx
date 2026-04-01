'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ProgressBar } from '@/components/ui/progress-bar'
import type { Course, Module, Section } from '@/lib/types'

type CourseSidebarProps = {
  course: Course & { modules: (Module & { sections: Section[] })[] }
  progress: Record<string, boolean>
  currentSectionId: string
  courseId: string
}

export function CourseSidebar({ course, progress, currentSectionId: initialSectionId, courseId }: CourseSidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Derive currentSectionId from the URL path so it updates on navigation
  const pathSegments = pathname.split('/')
  const learnIdx = pathSegments.indexOf('learn')
  const currentSectionId = (learnIdx >= 0 && pathSegments[learnIdx + 1]) ? pathSegments[learnIdx + 1] : initialSectionId

  const modules = [...(course.modules ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const allSections = modules.flatMap((m) => m.sections ?? [])
  const totalSections = allSections.length
  const completedSections = allSections.filter((s) => progress[s.id]).length
  const pct = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0

  // Track which modules are expanded - default expand the one containing current section
  const currentModuleId = modules.find((m) =>
    m.sections?.some((s) => s.id === currentSectionId)
  )?.id

  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    if (currentModuleId) initial.add(currentModuleId)
    return initial
  })

  // Auto-expand the module containing the current section on navigation
  useEffect(() => {
    if (currentModuleId && !expandedModules.has(currentModuleId)) {
      setExpandedModules((prev) => new Set(prev).add(currentModuleId))
    }
  }, [currentModuleId])

  function toggleModule(moduleId: string) {
    setExpandedModules((prev) => {
      const next = new Set(prev)
      if (next.has(moduleId)) {
        next.delete(moduleId)
      } else {
        next.add(moduleId)
      }
      return next
    })
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Course title + progress */}
      <div className="p-5 border-b border-nz-border">
        <Link
          href={`/courses/${courseId}/learn`}
          className="font-heading font-semibold text-sm text-nz-text-primary hover:text-nz-sakura transition-colors line-clamp-2"
        >
          {course.title}
        </Link>
        <div className="mt-3">
          <ProgressBar value={pct} />
          <p className="text-xs text-nz-text-muted mt-1.5">{pct}% complete</p>
        </div>
      </div>

      {/* Module list */}
      <div className="flex-1 overflow-y-auto py-2">
        {modules.map((mod, modIdx) => {
          const sections = [...(mod.sections ?? [])].sort((a, b) => a.sort_order - b.sort_order)
          const modCompleted = sections.length > 0 && sections.every((s) => progress[s.id])
          const isExpanded = expandedModules.has(mod.id)

          return (
            <div key={mod.id} className="mb-1">
              {/* Module header */}
              <button
                onClick={() => toggleModule(mod.id)}
                className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-nz-bg-tertiary/50 transition-colors cursor-pointer group"
              >
                {/* Expand chevron */}
                <svg
                  className={`w-4 h-4 text-nz-text-muted transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>

                <div className="flex-1 min-w-0">
                  <p className="text-xs text-nz-text-muted font-medium uppercase tracking-wider mb-0.5">
                    Module {modIdx + 1}
                  </p>
                  <p className="text-sm text-nz-text-primary font-medium truncate group-hover:text-nz-sakura transition-colors">
                    {mod.title}
                  </p>
                </div>

                {modCompleted && (
                  <svg className="w-4 h-4 text-nz-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </button>

              {/* Sections */}
              {isExpanded && (
                <div className="pb-2">
                  {sections.map((section) => {
                    const isCurrent = section.id === currentSectionId
                    const isCompleted = progress[section.id]

                    return (
                      <Link
                        key={section.id}
                        href={`/courses/${courseId}/learn/${section.id}`}
                        onClick={() => setMobileOpen(false)}
                        className={`
                          flex items-center gap-3 pl-12 pr-5 py-2.5 text-sm transition-colors
                          ${isCurrent
                            ? 'bg-nz-sakura/10 text-nz-sakura border-r-2 border-nz-sakura'
                            : 'text-nz-text-secondary hover:text-nz-text-primary hover:bg-nz-bg-tertiary/30'
                          }
                        `}
                      >
                        {/* Completion indicator */}
                        {isCompleted ? (
                          <svg className="w-4 h-4 text-nz-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${isCurrent ? 'border-nz-sakura' : 'border-nz-text-muted'}`} />
                        )}

                        <span className="truncate">{section.title}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Back to dashboard */}
      <div className="p-4 border-t border-nz-border">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-nz-text-muted hover:text-nz-text-secondary transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </Link>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-[72px] left-4 z-50 p-2 rounded-xl bg-nz-bg-elevated border border-nz-border text-nz-text-secondary hover:text-nz-text-primary transition-colors cursor-pointer"
        aria-label="Toggle sidebar"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {mobileOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-16 left-0 bottom-0 w-[280px] bg-nz-bg-secondary border-r border-nz-border z-40
          transition-transform duration-300
          lg:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
