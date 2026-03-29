'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

export function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user ?? null)
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()
        setIsAdmin(profile?.role === 'admin')
      }
    })
  }, [])

  const navLinks = [
    { href: '/#courses', label: 'Courses' },
    ...(user ? [{ href: '/dashboard', label: 'Dashboard' }] : []),
    ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-nz-bg-primary/60 backdrop-blur-2xl border-b border-nz-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-0.5 font-heading font-bold text-xl text-nz-text-primary tracking-tight">
            NOZOMI<span className="text-nz-sakura">.</span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-nz-text-secondary hover:text-nz-text-primary transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="relative group">
                <button className="flex items-center gap-2 text-sm text-nz-text-secondary hover:text-nz-text-primary transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-nz-sakura/20 flex items-center justify-center text-nz-sakura text-xs font-semibold">
                    {(user.email?.[0] ?? 'U').toUpperCase()}
                  </div>
                </button>
                <div className="absolute right-0 top-full mt-2 w-48 py-2 bg-nz-bg-elevated border border-nz-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="px-4 py-2 text-xs text-nz-text-muted truncate border-b border-nz-border">
                    {user.email}
                  </div>
                  <Link
                    href="/dashboard"
                    className="block px-4 py-2 text-sm text-nz-text-secondary hover:text-nz-text-primary hover:bg-nz-bg-tertiary transition-colors"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={async () => {
                      const supabase = createClient()
                      await supabase.auth.signOut()
                      window.location.href = '/'
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-nz-text-secondary hover:text-nz-error hover:bg-nz-bg-tertiary transition-colors cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-nz-text-secondary hover:text-nz-text-primary transition-colors font-medium"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 text-sm font-heading font-semibold bg-nz-sakura text-nz-bg-primary rounded-xl hover:bg-nz-sakura-deep transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden text-nz-text-secondary hover:text-nz-text-primary p-2 cursor-pointer"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-nz-border bg-nz-bg-primary/95 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block py-2.5 text-sm text-nz-text-secondary hover:text-nz-text-primary transition-colors font-medium"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-nz-border space-y-2">
              {user ? (
                <button
                  onClick={async () => {
                    const supabase = createClient()
                    await supabase.auth.signOut()
                    window.location.href = '/'
                  }}
                  className="block w-full text-left py-2.5 text-sm text-nz-error cursor-pointer"
                >
                  Sign Out
                </button>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block py-2.5 text-sm text-nz-text-secondary hover:text-nz-text-primary transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    Log In
                  </Link>
                  <Link
                    href="/signup"
                    className="block py-2.5 text-sm text-nz-sakura font-semibold"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
