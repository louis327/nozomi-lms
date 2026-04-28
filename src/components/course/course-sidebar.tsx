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
      {/* Back + title */}
      <div className="px-5 pt-5 pb-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[11px] text-white/50 hover:text-white transition-colors uppercase tracking-[0.14em] font-semibold"
        >
          <ArrowLeft className="w-3 h-3" strokeWidth={2} />
          Dashboard
        </Link>
      </div>

      <div className="px-5 pb-5 border-b border-line-dark">
        <div className="flex items-center justify-between gap-2">
          <Link href={`/courses/${courseId}`} className="font-serif text-[17px] text-white leading-tight line-clamp-2 flex-1 hover:text-accent transition-colors">
            {course.title}
          </Link>
          {isAdmin && editMode && (
            <button
              onClick={() => setStructureOpen(true)}
              className="p-1.5 rounded-lg text-white/50 hover:text-accent hover:bg-white/[0.04] transition-colors cursor-pointer shrink-0"
              title="Edit course structure"
            >
              <Settings className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9.5px] text-white/40 uppercase tracking-[0.14em] font-semibold">Progress</span>
            <span className="text-[11px] text-white font-semibold tabular-nums">{pct}%</span>
          </div>
          <div className="w-full h-[3px] rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Modules */}
      <div className="flex-1 overflow-y-auto py-3">
        {modules.map((mod, modIdx) => {
          const sections = [...(mod.sections ?? [])].sort((a, b) => a.sort_order - b.sort_order)
          const modTotal = sections.length
          const modDone = sections.filter((s) => progress[s.id]).length
          const modPct = modTotal > 0 ? Math.round((modDone / modTotal) * 100) : 0
          const modCompleted = modTotal > 0 && modDone === modTotal
          const isExpanded = expandedModules.has(mod.id)

          return (
            <div key={mod.id} className="mb-0.5">
              <button
                onClick={() => toggleModule(mod.id)}
                className="w-full flex items-center gap-2.5 px-5 py-2.5 text-left hover:bg-white/[0.03] transition-colors cursor-pointer group"
              >
                <ChevronRight
                  className={`w-3 h-3 text-white/40 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                  strokeWidth={2}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[9.5px] text-white/40 font-semibold uppercase tracking-[0.14em]">
                      Module {String(modIdx + 1).padStart(2, '0')}
                    </p>
                    <span className="text-[9.5px] text-white/40 font-mono tabular-nums shrink-0">
                      {modDone}/{modTotal}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-white/90 font-medium leading-snug break-words group-hover:text-white transition-colors mt-0.5" title={mod.title}>
                    {mod.title}
                  </p>
                  {modTotal > 0 && (
                    <div className="mt-2 w-full h-[2px] rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${modCompleted ? 'bg-accent' : 'bg-accent/70'}`}
                        style={{ width: `${modPct}%` }}
                      />
                    </div>
                  )}
                </div>
                {modCompleted && <Check className="w-3.5 h-3.5 text-accent shrink-0" strokeWidth={2} />}
              </button>

              {isExpanded && (
                <div className="pb-1">
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
                          relative flex items-center gap-2.5 pl-[42px] pr-5 py-2 text-[12.5px] transition-colors min-w-0 group
                          ${isCurrent
                            ? 'text-white bg-white/[0.06]'
                            : isDraft
                              ? 'text-white/35 hover:text-white/60 hover:bg-white/[0.03] italic'
                              : 'text-white/55 hover:text-white hover:bg-white/[0.03]'
                          }
                        `}
                      >
                        {isCurrent && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-accent" />}
                        {isCompleted ? (
                          <Check className="w-3 h-3 text-accent shrink-0" strokeWidth={2.5} />
                        ) : (
                          <span className={`w-3 h-3 rounded-full border shrink-0 ${isCurrent ? 'border-white/80' : 'border-white/20'}`} />
                        )}
                        <span className="leading-snug break-words min-w-0" title={section.title} style={{ overflowWrap: 'anywhere' }}>{section.title}</span>
                        {isDraft && (
                          <span className="ml-auto text-[9px] font-semibold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/60 shrink-0">
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
      </div>

      <div className="p-3" />

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
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-surface-dark border border-line-dark text-white/80 hover:text-white transition-colors cursor-pointer shadow-sm"
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
          fixed top-0 left-0 bottom-0 w-[280px] bg-surface-dark border-r border-line-dark text-ink-inverted z-40
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
