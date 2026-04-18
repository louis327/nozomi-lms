'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Calendar,
  Users,
  BarChart3,
  Award,
  FileBadge,
  LogOut,
  Menu,
  X,
  Shield,
  Settings,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; badge?: string }

const learningItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/courses', label: 'My Courses', icon: BookOpen },
  { href: '/assignments', label: 'Assignments', icon: ClipboardList },
  { href: '/schedule', label: 'Schedule', icon: Calendar },
  { href: '/community', label: 'Community', icon: Users },
]

const progressItems: NavItem[] = [
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/achievements', label: 'Achievements', icon: Award },
  { href: '/certificates', label: 'Certificates', icon: FileBadge },
]

export function StudentSidebar({
  userName,
  isAdmin,
}: {
  userName: string
  isAdmin: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const renderItem = (item: NavItem) => {
    const Icon = item.icon
    const active = isActive(item.href)
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={`
          group relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors
          ${active
            ? 'bg-white/[0.06] text-white'
            : 'text-white/55 hover:text-white hover:bg-white/[0.04]'
          }
        `}
      >
        {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-accent" />}
        <Icon className="w-[17px] h-[17px] shrink-0" strokeWidth={1.5} />
        <span className="flex-1">{item.label}</span>
        {item.badge && (
          <span className="text-[10px] font-semibold text-white bg-accent rounded-full px-1.5 py-0.5 leading-none">
            {item.badge}
          </span>
        )}
      </Link>
    )
  }

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-surface border border-line text-ink-soft hover:text-ink lg:hidden cursor-pointer shadow-sm"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-screen w-[232px] bg-surface-dark text-ink-inverted
          flex-col z-50 border-r border-line-dark
          ${mobileOpen ? 'flex' : 'hidden lg:flex'}
        `}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 h-[64px] border-b border-line-dark">
          <Link href="/dashboard" className="flex items-center gap-1.5">
            <span className="font-serif text-[18px] text-white tracking-tight">Nozomi</span>
            <span className="w-[5px] h-[5px] rounded-full bg-accent mt-2" />
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded text-white/50 hover:text-white lg:hidden cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 overflow-y-auto">
          <p className="text-[10px] font-semibold text-white/35 uppercase tracking-[0.18em] px-3 mb-2">
            Learning
          </p>
          <div className="space-y-0.5 mb-6">{learningItems.map(renderItem)}</div>

          <p className="text-[10px] font-semibold text-white/35 uppercase tracking-[0.18em] px-3 mb-2">
            Progress
          </p>
          <div className="space-y-0.5">{progressItems.map(renderItem)}</div>
        </nav>

        {/* User section */}
        <div className="border-t border-line-dark px-3 py-3">
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-white/55 hover:text-white hover:bg-white/[0.04] transition-colors mb-1"
            >
              <Shield className="w-[17px] h-[17px]" strokeWidth={1.5} />
              <span>Admin Panel</span>
            </Link>
          )}

          <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
            <Link
              href="/dashboard/profile"
              className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white text-[13px] font-semibold shrink-0 hover:ring-2 hover:ring-accent/30 transition-all"
              aria-label="Profile"
            >
              {userName?.charAt(0)?.toUpperCase() || 'S'}
            </Link>
            <Link href="/dashboard/profile" className="flex-1 min-w-0 group">
              <p className="text-[13px] font-medium text-white truncate leading-tight group-hover:text-accent transition-colors">
                {userName || 'Student'}
              </p>
              <p className="text-[10.5px] text-white/40 uppercase tracking-[0.12em] mt-0.5">
                Learner
              </p>
            </Link>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-md text-white/35 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
