'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
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
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white border border-[#e8e8e8] text-[#666] hover:text-[#111] lg:hidden cursor-pointer shadow-sm"
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

      <aside className={`fixed top-0 left-0 h-screen w-[240px] bg-white border-r border-[#eee] flex-col z-50 transition-transform duration-200 ${mobileOpen ? 'flex translate-x-0' : 'hidden lg:flex'}`}>
        {/* Logo */}
        <div className="h-[60px] flex items-center justify-between px-5 border-b border-[#eee]">
          <Link href="/admin" className="flex items-center gap-0">
            <span className="font-heading font-bold text-[17px] text-[#111] tracking-[-0.02em]">NOZOMI</span>
            <span className="font-heading font-bold text-[17px] text-nz-sakura tracking-[-0.02em]">.</span>
            <span className="font-heading font-medium text-[11px] text-[#aaa] uppercase tracking-[0.06em] ml-2">Admin</span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-[#999] hover:text-[#111] lg:hidden cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-3">
          <p className="text-[10px] font-bold text-[#bbb] uppercase tracking-[0.1em] px-3 mb-2">Menu</p>
          <div className="space-y-0.5">
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
                  onClick={() => setMobileOpen(false)}
                  className={`
                    relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150
                    ${
                      isActive
                        ? 'bg-[#111] text-white'
                        : 'text-[#666] hover:bg-[#f5f5f5] hover:text-[#111]'
                    }
                  `}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-[#eee]">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="w-8 h-8 rounded-full bg-[#111] flex items-center justify-center text-white text-[13px] font-heading font-bold">
              {adminName?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#111] truncate">{adminName || 'Admin'}</p>
              <p className="text-[11px] text-[#aaa]">Administrator</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg text-[#ccc] hover:text-[#ef4444] hover:bg-[#fef2f2] transition-colors cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
