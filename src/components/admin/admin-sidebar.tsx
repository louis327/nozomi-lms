'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Settings,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/courses', label: 'Courses', icon: BookOpen },
  { href: '/admin/students', label: 'Students', icon: Users },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminSidebar({ adminName }: { adminName: string }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <aside className="fixed top-0 left-0 h-screen w-60 bg-nz-bg-secondary border-r border-nz-border flex flex-col z-40">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-nz-border">
        <Link href="/admin" className="font-heading font-bold text-lg text-nz-text-primary tracking-tight">
          NOZOMI<span className="text-nz-sakura">.</span>
          <span className="text-nz-text-tertiary text-xs ml-2 font-sans font-normal">ADMIN</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${
                  isActive
                    ? 'bg-nz-sakura/10 text-nz-sakura border border-nz-sakura/20'
                    : 'text-nz-text-secondary hover:bg-nz-bg-elevated hover:text-nz-text-primary border border-transparent'
                }
              `}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User info & sign out */}
      <div className="p-4 border-t border-nz-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-nz-sakura/20 flex items-center justify-center text-nz-sakura text-sm font-heading font-semibold">
            {adminName?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-nz-text-primary truncate">{adminName || 'Admin'}</p>
            <p className="text-xs text-nz-text-tertiary">Administrator</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-nz-text-tertiary hover:text-nz-error hover:bg-nz-error/10 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
