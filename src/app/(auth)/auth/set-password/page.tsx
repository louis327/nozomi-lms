'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SplitAuthShell } from '@/components/auth/split-auth-shell'

function SetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [authReady, setAuthReady] = useState<'loading' | 'ok' | 'no-session'>('loading')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        setAuthReady('no-session')
      } else {
        setAuthReady('ok')
      }
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.updateUser({ password })
      if (authError) {
        setError(authError.message)
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  if (authReady === 'loading') {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-8 w-48 bg-surface-muted rounded-lg" />
        <div className="h-4 w-56 bg-surface-muted rounded-lg" />
        <div className="h-12 bg-surface-muted rounded-xl" />
        <div className="h-12 bg-surface-muted rounded-xl" />
        <div className="h-12 bg-surface-muted rounded-xl" />
      </div>
    )
  }

  if (authReady === 'no-session') {
    return (
      <div>
        <h2 className="display text-[24px] leading-[1.2] mb-2">
          Link expired or invalid.
        </h2>
        <p className="text-[13.5px] text-ink-soft mb-6 leading-relaxed">
          This reset link is no longer valid. Request a new one and try again.
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-2 text-[13px] font-medium text-accent hover:text-accent-deep transition-colors"
        >
          Request a new link
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h2 className="display text-[24px] leading-[1.2] mb-1.5">Set a new password</h2>
      <p className="text-[13.5px] text-ink-soft mb-7">
        Pick something you&apos;ll remember. At least six characters.
      </p>

      {error && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-error/10 border border-error/20 text-[13px] text-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="New password"
          type="password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
        />
        <Input
          label="Confirm password"
          type="password"
          placeholder="Re-enter the same password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
        />
        <Button type="submit" loading={loading} className="w-full" size="lg">
          Set password
        </Button>
      </form>
    </div>
  )
}

export default function SetPasswordPage() {
  return (
    <SplitAuthShell tagline="Set your password and you're in. Welcome to Nozomi.">
      <SetPasswordForm />
    </SplitAuthShell>
  )
}
