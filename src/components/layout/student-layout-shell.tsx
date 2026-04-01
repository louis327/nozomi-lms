'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { StudentSidebar } from './student-sidebar'

const STORAGE_KEY = 'nz-sidebar-collapsed'

export function StudentLayoutShell({
  userName,
  isAdmin,
  children,
}: {
  userName: string
  isAdmin: boolean
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isLearnMode = /\/courses\/[^/]+\/learn/.test(pathname)

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

  if (isLearnMode) {
    return <>{children}</>
  }

  return (
    <>
      <StudentSidebar
        userName={userName}
        isAdmin={isAdmin}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />
      <main className={`min-h-screen transition-[margin] duration-300 ease-in-out ${collapsed ? 'lg:ml-[60px]' : 'lg:ml-[240px]'}`}>
        <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8 max-w-[1200px]">{children}</div>
      </main>
    </>
  )
}
