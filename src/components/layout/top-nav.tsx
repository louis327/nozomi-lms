'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Search, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { NotificationBell } from '@/components/layout/notification-bell'

const NAV = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Courses', href: '/courses' },
]

export function TopNav({
  userName,
  userEmail,
  isAdmin,
}: {
  userName: string
  userEmail?: string
  isAdmin: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const initials = (userName || 'S').trim().charAt(0).toUpperCase()

  return (
    <header className="sticky top-0 z-20 h-[60px] border-b border-line bg-surface/85 backdrop-blur-md supports-[backdrop-filter]:bg-surface/75">
      <div className="mx-auto flex h-full max-w-[1180px] items-center justify-between px-6 lg:px-10">
        {/* Left: brand + nav */}
        <div className="flex items-center gap-7">
          <Link
            href="/dashboard"
            className="inline-flex items-baseline text-[19px] font-bold tracking-[-0.025em] text-ink"
          >
            Nozomi
            <span className="ml-[1px] text-accent">.</span>
          </Link>
          <nav className="hidden items-center gap-0.5 sm:flex">
            {NAV.map((item) => {
              const on = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative flex h-[60px] items-center px-1 text-[14px]"
                >
                  <span
                    className={`rounded-lg px-2.5 py-1.5 transition-colors ${
                      on
                        ? 'font-semibold text-ink'
                        : 'font-medium text-ink-soft hover:bg-surface-muted'
                    }`}
                  >
                    {item.label}
                  </span>
                  {on && (
                    <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-accent" />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Right: search + bell + avatar */}
        <div className="flex items-center gap-2.5">
          <div className="hidden w-[220px] items-center gap-2 rounded-[9px] border border-line bg-surface-muted px-3 py-2 text-ink-muted md:flex">
            <Search size={15} strokeWidth={1.9} />
            <span className="text-[13px]">Search</span>
            <span className="ml-auto rounded-[5px] border border-line-strong bg-surface px-1.5 text-[11px] text-ink-faint">
              ⌘K
            </span>
          </div>

          <NotificationBell />

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              title={userName}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[12.5px] font-semibold text-white transition-[filter] hover:brightness-110"
            >
              {initials}
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-[42px] z-30 w-[224px] overflow-hidden rounded-[14px] border border-line bg-surface shadow-[0_16px_40px_-12px_rgba(16,24,40,0.2)]">
                  <div className="border-b border-line px-4 py-3">
                    <p className="truncate text-[13.5px] font-bold text-ink">{userName || 'Student'}</p>
                    {userEmail && (
                      <p className="truncate text-[12px] text-ink-muted">{userEmail}</p>
                    )}
                  </div>
                  <div className="p-1.5">
                    <Link
                      href="/dashboard/profile"
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-lg px-2.5 py-2 text-[13.5px] font-medium text-ink hover:bg-surface-muted"
                    >
                      Profile
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13.5px] font-medium text-ink hover:bg-surface-muted"
                      >
                        <Shield size={15} strokeWidth={1.7} />
                        Admin panel
                      </Link>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="block w-full rounded-lg px-2.5 py-2 text-left text-[13.5px] font-medium text-accent-deep hover:bg-surface-muted"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
