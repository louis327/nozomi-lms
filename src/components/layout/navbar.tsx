'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
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
    <nav className="fixed top-0 left-0 right-0 z-40 bg-canvas/85 backdrop-blur-xl border-b border-line">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="font-serif text-[20px] text-ink tracking-tight">Nozomi</span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[13px] text-ink-soft hover:text-ink transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="relative group">
                <button className="flex items-center gap-2 cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center text-accent-deep text-[11px] font-semibold">
                    {(user.email?.[0] ?? 'U').toUpperCase()}
                  </div>
                </button>
                <div className="absolute right-0 top-full mt-2 w-48 py-2 bg-surface border border-line rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="px-4 py-2 text-[11px] text-ink-muted truncate border-b border-line-soft">
                    {user.email}
                  </div>
                  <Link
                    href="/dashboard"
                    className="block px-4 py-2 text-[13px] text-ink-soft hover:text-ink hover:bg-surface-muted transition-colors"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={async () => {
                      const supabase = createClient()
                      await supabase.auth.signOut()
                      window.location.href = '/'
                    }}
                    className="w-full text-left px-4 py-2 text-[13px] text-ink-soft hover:text-error hover:bg-surface-muted transition-colors cursor-pointer"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-[13px] text-ink-soft hover:text-ink transition-colors font-medium"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 text-[13px] font-medium bg-ink text-white rounded-full hover:bg-black transition-colors"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden text-ink-soft hover:text-ink p-2 cursor-pointer"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" strokeWidth={1.5} /> : <Menu className="w-5 h-5" strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-line bg-canvas/95 backdrop-blur-xl">
          <div className="px-6 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block py-2.5 text-[13px] text-ink-soft hover:text-ink transition-colors font-medium"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-line-soft space-y-2">
              {user ? (
                <button
                  onClick={async () => {
                    const supabase = createClient()
                    await supabase.auth.signOut()
                    window.location.href = '/'
                  }}
                  className="block w-full text-left py-2.5 text-[13px] text-error cursor-pointer"
                >
                  Sign out
                </button>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block py-2.5 text-[13px] text-ink-soft hover:text-ink transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="block py-2.5 text-[13px] text-accent font-medium"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign up
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
