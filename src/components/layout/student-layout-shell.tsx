'use client'

import { usePathname } from 'next/navigation'
import { StudentSidebar } from './student-sidebar'

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

  if (isLearnMode) {
    return <>{children}</>
  }

  return (
    <>
      <StudentSidebar userName={userName} isAdmin={isAdmin} />
      <main
        className="min-h-screen lg:ml-[232px] bg-canvas"
        style={{ containerType: 'inline-size' }}
      >
        {children}
      </main>
    </>
  )
}
