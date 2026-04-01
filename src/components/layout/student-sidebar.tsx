'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Compass,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/courses', label: 'Browse Courses', icon: Compass },
]

export function StudentSidebar({
  userName,
  isAdmin,
  collapsed,
  onToggleCollapse,
}: {
  userName: string
  isAdmin: boolean
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hoverExpanded, setHoverExpanded] = useState(false)
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = useCallback(() => {
    if (!collapsed) return
    hoverTimeout.current = setTimeout(() => setHoverExpanded(true), 200)
  }, [collapsed])

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
    setHoverExpanded(false)
  }, [])

  const isExpanded = !collapsed || hoverExpanded

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

      {/* Invisible hover zone on left edge when collapsed */}
      {collapsed && !hoverExpanded && (
        <div
          onMouseEnter={handleMouseEnter}
          className="fixed top-0 left-0 w-[60px] h-screen z-40 hidden lg:block"
        />
      )}

      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`fixed top-0 left-0 h-screen bg-white border-r border-[#eee] flex-col z-50 transition-[width] duration-300 ease-in-out ${
          isExpanded ? 'w-[240px]' : 'w-[60px]'
        } ${mobileOpen ? 'flex translate-x-0' : 'hidden lg:flex'} ${hoverExpanded ? 'shadow-lg' : ''}`}
      >
        {/* Logo */}
        <div className={`h-[60px] flex items-center border-b border-[#eee] overflow-hidden ${!isExpanded ? 'justify-center px-2' : 'justify-between px-5'}`}>
          <Link href="/dashboard" className="flex items-center gap-0 shrink-0">
            <span className="font-heading font-bold text-[17px] text-[#111] tracking-[-0.02em]">N</span>
            <span className={`font-heading font-bold text-[17px] text-[#111] tracking-[-0.02em] transition-[opacity,max-width] duration-300 ease-in-out overflow-hidden whitespace-nowrap ${!isExpanded ? 'max-w-0 opacity-0' : 'max-w-[120px] opacity-100'}`}>OZOMI</span>
            <span className="font-heading font-bold text-[17px] text-nz-sakura tracking-[-0.02em]">.</span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className={`p-1.5 rounded-lg text-[#999] hover:text-[#111] lg:hidden cursor-pointer transition-opacity duration-200 ${!isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 py-3 transition-[padding] duration-300 ease-in-out ${!isExpanded ? 'px-1.5' : 'px-3'}`}>
          <p className={`text-[10px] font-bold text-[#bbb] uppercase tracking-[0.1em] px-3 mb-2 transition-[opacity,max-height] duration-300 ease-in-out overflow-hidden whitespace-nowrap ${!isExpanded ? 'max-h-0 opacity-0 mb-0' : 'max-h-6 opacity-100'}`}>Menu</p>
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const isActive =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href)
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  title={!isExpanded ? item.label : undefined}
                  className={`
                    relative flex items-center rounded-lg text-[13px] font-medium transition-all duration-300 ease-in-out overflow-hidden
                    ${!isExpanded ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'}
                    ${
                      isActive
                        ? 'bg-[#111] text-white'
                        : 'text-[#666] hover:bg-[#f5f5f5] hover:text-[#111]'
                    }
                  `}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
                  <span className={`transition-[opacity,max-width] duration-300 ease-in-out overflow-hidden whitespace-nowrap ${!isExpanded ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100'}`}>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* User section */}
        <div className={`border-t border-[#eee] transition-[padding] duration-300 ease-in-out ${!isExpanded ? 'p-1.5' : 'p-3'}`}>
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              title={!isExpanded ? 'Admin Panel' : undefined}
              className={`flex items-center rounded-lg text-[13px] font-medium text-[#888] hover:text-nz-sakura hover:bg-[#fdf2f8] transition-all duration-300 ease-in-out mb-1 overflow-hidden ${!isExpanded ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2'}`}
            >
              <Shield className="w-4 h-4 shrink-0" />
              <span className={`transition-[opacity,max-width] duration-300 ease-in-out overflow-hidden whitespace-nowrap ${!isExpanded ? 'max-w-0 opacity-0' : 'max-w-[120px] opacity-100'}`}>Admin Panel</span>
            </Link>
          )}

          <Link
            href="/dashboard/profile"
            title={!isExpanded ? `${userName || 'Student'} — Profile` : undefined}
            className={`flex items-center rounded-lg hover:bg-[#f5f5f5] transition-all duration-300 ease-in-out group overflow-hidden ${!isExpanded ? 'justify-center p-1.5' : 'gap-3 px-3 py-2.5'}`}
          >
            <div className="w-8 h-8 rounded-full bg-nz-sakura flex items-center justify-center text-white text-[13px] font-heading font-bold shrink-0 hover:ring-2 hover:ring-nz-sakura/30 transition-all cursor-pointer">
              {userName?.charAt(0)?.toUpperCase() || 'S'}
            </div>
            <div className={`flex-1 min-w-0 transition-[opacity,max-width] duration-300 ease-in-out overflow-hidden ${!isExpanded ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100'}`}>
              <p className="text-[13px] font-medium text-[#111] truncate group-hover:text-nz-sakura transition-colors">{userName || 'Student'}</p>
              <p className="text-[11px] text-[#aaa]">Profile</p>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleSignOut()
              }}
              className={`p-1.5 rounded-lg text-[#ccc] hover:text-[#ef4444] hover:bg-[#fef2f2] transition-all duration-300 ease-in-out cursor-pointer shrink-0 ${!isExpanded ? 'max-w-0 opacity-0 overflow-hidden p-0' : 'max-w-[40px] opacity-100'}`}
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </Link>
        </div>

        {/* Collapse/expand toggle — sits on the sidebar edge */}
        <button
          onClick={() => { onToggleCollapse(); setHoverExpanded(false) }}
          className="hidden lg:flex absolute top-[72px] -right-3.5 w-7 h-7 items-center justify-center rounded-full bg-nz-sakura border border-nz-sakura text-white hover:brightness-110 shadow-sm transition-all cursor-pointer z-10 hover:scale-110"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" strokeWidth={2} />
          ) : (
            <ChevronLeft className="w-4 h-4" strokeWidth={2} />
          )}
        </button>
      </aside>
    </>
  )
}
