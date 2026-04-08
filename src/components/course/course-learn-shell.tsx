'use client'

import { useState, useEffect } from 'react'
import { CourseSidebar } from './course-sidebar'
import { EditModeWrapper } from './edit-mode-wrapper'
import type { Course, Module, Section } from '@/lib/types'

const STORAGE_KEY = 'nz-course-sidebar-collapsed'

type CourseLearnShellProps = {
  course: Course & { modules: (Module & { sections: Section[] })[] }
  progress: Record<string, boolean>
  courseId: string
  isAdmin?: boolean
  children: React.ReactNode
}

export function CourseLearnShell({ course, progress, courseId, isAdmin, children }: CourseLearnShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'true') setCollapsed(true)
  }, [])

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }

  return (
    <EditModeWrapper isAdmin={isAdmin ?? false}>
      <div className="flex min-h-screen bg-white">
        <CourseSidebar
          course={course as any}
          progress={progress}
          currentSectionId=""
          courseId={courseId}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
          isAdmin={isAdmin}
        />
        <div className={`flex-1 transition-all duration-300 ${collapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
          {children}
        </div>
      </div>
    </EditModeWrapper>
  )
}
