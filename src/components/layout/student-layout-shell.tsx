'use client'

import { usePathname } from 'next/navigation'
import { TopNav } from './top-nav'

export function StudentLayoutShell({
  userName,
  userEmail,
  isAdmin,
  children,
}: {
  userName: string
  userEmail?: string
  isAdmin: boolean
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isLearnMode = /\/courses\/[^/]+\/learn/.test(pathname)

  if (isLearnMode) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-canvas">
      <TopNav userName={userName} userEmail={userEmail} isAdmin={isAdmin} />
      <main className="mx-auto w-full max-w-[1180px]" style={{ containerType: 'inline-size' }}>
        {children}
      </main>
    </div>
  )
}
