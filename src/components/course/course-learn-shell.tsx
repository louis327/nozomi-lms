'use client'

import { useState, useEffect } from 'react'
import { CourseSidebar } from './course-sidebar'
import type { Course, Module, Section } from '@/lib/types'

const STORAGE_KEY = 'nz-course-sidebar-collapsed'

type CourseLearnShellProps = {
  course: Course & { modules: (Module & { sections: Section[] })[] }
  progress: Record<string, boolean>
  courseId: string
  children: React.ReactNode
}

export function CourseLearnShell({ course, progress, courseId, children }: CourseLearnShellProps) {
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
    <div className="flex min-h-screen bg-white">
      <CourseSidebar
        course={course as any}
        progress={progress}
        currentSectionId=""
        courseId={courseId}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />
      <div className={`flex-1 transition-all duration-300 ${collapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
        {children}
      </div>
    </div>
  )
}
