'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Course, Module, Section } from '@/lib/types'

type CourseSidebarProps = {
  course: Course & { modules: (Module & { sections: Section[] })[] }
  progress: Record<string, boolean>
  currentSectionId: string
  courseId: string
  collapsed: boolean
  onToggleCollapse: () => void
}

export function CourseSidebar({ course, progress, currentSectionId: initialSectionId, courseId, collapsed, onToggleCollapse }: CourseSidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hoverOpen, setHoverOpen] = useState(false)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pathSegments = pathname.split('/')
  const learnIdx = pathSegments.indexOf('learn')
  const currentSectionId = (learnIdx >= 0 && pathSegments[learnIdx + 1]) ? pathSegments[learnIdx + 1] : initialSectionId

  const modules = [...(course.modules ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const allSections = modules.flatMap((m) => m.sections ?? [])
  const totalSections = allSections.length
  const completedSections = allSections.filter((s) => progress[s.id]).length
  const pct = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0

  const currentModuleId = modules.find((m) =>
    m.sections?.some((s) => s.id === currentSectionId)
  )?.id

  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    if (currentModuleId) initial.add(currentModuleId)
    return initial
  })

  useEffect(() => {
    if (currentModuleId && !expandedModules.has(currentModuleId)) {
      setExpandedModules((prev) => new Set(prev).add(currentModuleId))
    }
  }, [currentModuleId])

  function toggleModule(moduleId: string) {
    setExpandedModules((prev) => {
      const next = new Set(prev)
      if (next.has(moduleId)) next.delete(moduleId)
      else next.add(moduleId)
      return next
    })
  }

  const handleHoverEnter = () => {
    if (!collapsed) return
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setHoverOpen(true)
  }

  const handleHoverLeave = () => {
    if (!collapsed) return
    hoverTimeoutRef.current = setTimeout(() => setHoverOpen(false), 300)
  }

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    }
  }, [])

  const isDesktopVisible = !collapsed || hoverOpen

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-4 pb-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#aaa] hover:text-[#111] transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Dashboard
        </Link>
      </div>

      {/* Course title + progress */}
      <div className="px-5 pb-4 border-b border-[#eee]">
        <Link
          href={`/courses/${courseId}/learn`}
          className="font-heading font-semibold text-[13px] text-[#111] hover:text-nz-sakura transition-colors line-clamp-2"
        >
          {course.title}
        </Link>
        <div className="mt-3">
          <div className="w-full h-1.5 rounded-full bg-[#f0f0f0] overflow-hidden">
            <div className="h-full rounded-full bg-nz-sakura transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[11px] text-[#aaa] mt-1.5">{pct}% complete</p>
        </div>
      </div>

      {/* Modules */}
      <div className="flex-1 overflow-y-auto py-2">
        {modules.map((mod, modIdx) => {
          const sections = [...(mod.sections ?? [])].sort((a, b) => a.sort_order - b.sort_order)
          const modCompleted = sections.length > 0 && sections.every((s) => progress[s.id])
          const isExpanded = expandedModules.has(mod.id)

          return (
            <div key={mod.id} className="mb-0.5">
              <button
                onClick={() => toggleModule(mod.id)}
                className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-[#f9f9f9] transition-colors cursor-pointer group"
              >
                <svg
                  className={`w-3.5 h-3.5 text-[#ccc] transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>

                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[#bbb] font-bold uppercase tracking-[0.08em] mb-0.5">
                    Module {modIdx + 1}
                  </p>
                  <p className="text-[13px] text-[#111] font-medium truncate group-hover:text-nz-sakura transition-colors" title={mod.title}>
                    {mod.title}
                  </p>
                </div>

                {modCompleted && (
                  <svg className="w-4 h-4 text-[#22c55e] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </button>

              {isExpanded && (
                <div className="pb-2">
                  {sections.map((section) => {
                    const isCurrent = section.id === currentSectionId
                    const isCompleted = progress[section.id]

                    return (
                      <Link
                        key={section.id}
                        href={`/courses/${courseId}/learn/${section.id}`}
                        onClick={() => { setMobileOpen(false); setHoverOpen(false) }}
                        className={`
                          flex items-center gap-3 pl-12 pr-5 py-2.5 text-[13px] transition-colors min-w-0
                          ${isCurrent
                            ? 'bg-[#111] text-white font-medium'
                            : 'text-[#666] hover:text-[#111] hover:bg-[#f9f9f9]'
                          }
                        `}
                      >
                        {isCompleted ? (
                          <svg className="w-4 h-4 shrink-0 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${isCurrent ? 'border-white' : 'border-[#ddd]'}`} />
                        )}

                        <span className="truncate" title={section.title}>{section.title}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="p-3" />
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white border border-[#e8e8e8] text-[#666] hover:text-[#111] transition-colors cursor-pointer shadow-sm"
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

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={handleHoverEnter}
        onMouseLeave={handleHoverLeave}
        className={`
          fixed top-0 left-0 bottom-0 w-[280px] bg-white border-r border-[#eee] z-40
          transition-transform duration-300
          ${isDesktopVisible ? 'lg:translate-x-0' : 'lg:-translate-x-full'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          ${collapsed && hoverOpen ? 'lg:shadow-xl' : ''}
        `}
      >
        {sidebarContent}

        {/* Chevron toggle — pinned to sidebar edge, always visible on desktop */}
        <button
          onClick={onToggleCollapse}
          onMouseEnter={handleHoverEnter}
          className="hidden lg:flex absolute top-5 -right-3 w-6 h-6 items-center justify-center rounded-full bg-nz-sakura border border-nz-sakura text-white hover:brightness-110 shadow-sm transition-all cursor-pointer z-10 hover:scale-110"
          title={collapsed ? 'Pin sidebar' : 'Hide sidebar'}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            {collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            )}
          </svg>
        </button>
      </aside>

      {/* Invisible hover zone on left edge when collapsed */}
      {collapsed && !hoverOpen && (
        <div
          onMouseEnter={handleHoverEnter}
          className="fixed top-0 left-0 w-4 h-screen z-40 hidden lg:block"
        />
      )}

      {/* When fully collapsed (no hover), show a small expand chevron at left edge */}
      {collapsed && !hoverOpen && (
        <button
          onClick={onToggleCollapse}
          onMouseEnter={handleHoverEnter}
          className="hidden lg:flex fixed top-5 left-0 z-40 w-6 h-6 items-center justify-center rounded-r-full bg-nz-sakura border border-l-0 border-nz-sakura text-white hover:brightness-110 shadow-sm transition-all cursor-pointer hover:scale-110"
          title="Show sidebar"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </>
  )
}
