'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft, ChevronRight, ChevronLeft, Check, Settings, Menu, X } from 'lucide-react'
import { useEditMode } from '@/lib/edit-mode-context'
import { StructureEditorPanel } from '@/components/course/structure-editor-panel'
import type { Course, Module, Section } from '@/lib/types'

type CourseSidebarProps = {
  course: Course & { modules: (Module & { sections: Section[] })[] }
  progress: Record<string, boolean>
  currentSectionId: string
  courseId: string
  collapsed: boolean
  onToggleCollapse: () => void
  isAdmin?: boolean
}

export function CourseSidebar({ course, progress, currentSectionId: initialSectionId, courseId, collapsed, onToggleCollapse, isAdmin }: CourseSidebarProps) {
  const pathname = usePathname()
  const { editMode } = useEditMode()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hoverOpen, setHoverOpen] = useState(false)
  const [structureOpen, setStructureOpen] = useState(false)
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
      {/* Back + title + progress */}
      <div className="px-5 pt-5 pb-[18px] border-b border-line">
        <Link
          href={`/courses/${courseId}`}
          className="inline-flex items-center gap-1.5 mb-4 text-[12.5px] font-semibold text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
          Back to course
        </Link>
        <div className="flex items-start justify-between gap-2">
          <Link href={`/courses/${courseId}`} className="flex-1 text-[15.5px] font-bold leading-[1.25] tracking-[-0.015em] text-ink line-clamp-2 hover:text-accent-deep transition-colors">
            {course.title}
          </Link>
          {isAdmin && editMode && (
            <button
              onClick={() => setStructureOpen(true)}
              className="p-1.5 rounded-lg text-ink-muted hover:text-accent hover:bg-surface-muted transition-colors cursor-pointer shrink-0"
              title="Edit course structure"
            >
              <Settings className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2.5">
          <div className="flex-1 h-[5px] rounded-full bg-track overflow-hidden">
            <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[11.5px] font-semibold text-ink-soft tabular-nums">{pct}%</span>
        </div>
        <p className="mt-[7px] text-[11.5px] text-ink-muted tabular-nums">{completedSections} of {totalSections} lessons complete</p>
      </div>

      {/* Modules */}
      <nav className="flex-1 overflow-y-auto px-2.5 pt-2.5 pb-6">
        {modules.map((mod, modIdx) => {
          const sections = [...(mod.sections ?? [])].sort((a, b) => a.sort_order - b.sort_order)
          const modTotal = sections.length
          const modDone = sections.filter((s) => progress[s.id]).length
          const modCompleted = modTotal > 0 && modDone === modTotal
          const isExpanded = expandedModules.has(mod.id)
          const isCurrentModule = mod.id === currentModuleId

          return (
            <div key={mod.id} className="mb-1">
              <button
                onClick={() => toggleModule(mod.id)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-surface-muted transition-colors cursor-pointer"
              >
                <span className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold tabular-nums ${
                  modCompleted
                    ? 'bg-accent text-white'
                    : isCurrentModule
                      ? 'bg-accent-soft text-accent-deep'
                      : 'bg-track text-ink-muted'
                }`}>
                  {modCompleted ? <Check className="w-3 h-3" strokeWidth={3} /> : String(modIdx + 1).padStart(2, '0')}
                </span>
                <span className={`flex-1 min-w-0 truncate text-[13.5px] font-semibold tracking-[-0.01em] ${isCurrentModule ? 'text-ink' : 'text-ink-soft'}`} title={mod.title}>
                  {mod.title}
                </span>
                <ChevronRight
                  className={`w-3 h-3 text-ink-faint transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                  strokeWidth={2}
                />
              </button>

              {isExpanded && (
                <div className="pl-[33px] pb-2 pt-0.5">
                  {sections.map((section) => {
                    const isCurrent = section.id === currentSectionId
                    const isCompleted = progress[section.id]
                    const isDraft = section.status === 'draft'

                    return (
                      <Link
                        key={section.id}
                        href={`/courses/${courseId}/learn/${section.id}`}
                        onClick={() => { setMobileOpen(false); setHoverOpen(false) }}
                        className={`
                          relative my-px flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] transition-colors min-w-0
                          ${isCurrent
                            ? 'bg-surface border border-line shadow-[0_1px_2px_rgba(16,24,40,0.04)] text-ink font-semibold'
                            : isDraft
                              ? 'border border-transparent italic text-ink-faint hover:bg-surface-muted'
                              : isCompleted
                                ? 'border border-transparent text-ink-soft hover:bg-surface-muted'
                                : 'border border-transparent text-ink-muted hover:bg-surface-muted'
                          }
                        `}
                      >
                        <span className="flex h-[15px] w-[15px] shrink-0 items-center justify-center">
                          {isCompleted ? (
                            <span className="h-[7px] w-[7px] rounded-full bg-accent" />
                          ) : isCurrent ? (
                            <span className="flex h-[11px] w-[11px] items-center justify-center rounded-full border-2 border-accent">
                              <span className="h-1 w-1 rounded-full bg-accent" />
                            </span>
                          ) : (
                            <span className="h-[7px] w-[7px] rounded-full border-[1.5px] border-line-strong" />
                          )}
                        </span>
                        <span className="leading-snug break-words min-w-0" title={section.title} style={{ overflowWrap: 'anywhere' }}>{section.title}</span>
                        {isDraft && (
                          <span className="ml-auto text-[9px] font-semibold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded bg-surface-muted text-ink-muted shrink-0">
                            Draft
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {isAdmin && (
        <StructureEditorPanel
          open={structureOpen}
          onClose={() => setStructureOpen(false)}
          course={course}
          courseId={courseId}
        />
      )}
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-surface border border-line text-ink-soft hover:text-ink transition-colors cursor-pointer shadow-sm"
        aria-label="Toggle sidebar"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        onMouseEnter={handleHoverEnter}
        onMouseLeave={handleHoverLeave}
        className={`
          fixed top-0 left-0 bottom-0 w-[280px] bg-[#fbfbfa] border-r border-line text-ink z-40
          transition-transform duration-300
          ${isDesktopVisible ? 'lg:translate-x-0' : 'lg:-translate-x-full'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          ${collapsed && hoverOpen ? 'lg:shadow-2xl' : ''}
        `}
      >
        {sidebarContent}

        <button
          onClick={onToggleCollapse}
          onMouseEnter={handleHoverEnter}
          className="hidden lg:flex absolute top-6 -right-3 w-6 h-6 items-center justify-center rounded-full bg-accent text-white hover:bg-accent-deep shadow-sm transition-all cursor-pointer z-10"
          title={collapsed ? 'Pin sidebar' : 'Hide sidebar'}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" strokeWidth={2.5} /> : <ChevronLeft className="w-3 h-3" strokeWidth={2.5} />}
        </button>
      </aside>

      {collapsed && !hoverOpen && (
        <div
          onMouseEnter={handleHoverEnter}
          className="fixed top-0 left-0 w-4 h-screen z-40 hidden lg:block"
        />
      )}

      {collapsed && !hoverOpen && (
        <button
          onClick={onToggleCollapse}
          onMouseEnter={handleHoverEnter}
          className="hidden lg:flex fixed top-6 left-0 z-40 w-6 h-6 items-center justify-center rounded-r-full bg-accent text-white hover:bg-accent-deep shadow-sm transition-all cursor-pointer"
          title="Show sidebar"
        >
          <ChevronRight className="w-3 h-3" strokeWidth={2.5} />
        </button>
      )}
    </>
  )
}
