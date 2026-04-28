'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SplitAuthShell } from '@/components/auth/split-auth-shell'

function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/set-password`,
      })
      if (authError) {
        setError(authError.message)
        return
      }
      setSent(true)
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div>
        <div className="mb-6 w-12 h-12 rounded-full bg-accent-soft flex items-center justify-center">
          <svg
            className="w-6 h-6 text-accent-deep"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
            />
          </svg>
        </div>
        <h2 className="display text-[24px] leading-[1.2] mb-2">
          Check your <em>email.</em>
        </h2>
        <p className="text-[13.5px] text-ink-soft mb-1">We sent a reset link to</p>
        <p className="text-[13.5px] font-medium text-ink mb-5">{email}</p>
        <p className="text-[13px] text-ink-muted mb-7 leading-relaxed">
          Click the link in your email to set a new password. If you don&apos;t see it, check your spam folder.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-[13px] font-medium text-accent hover:text-accent-deep transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to login
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h2 className="display text-[24px] leading-[1.2] mb-1.5">Reset password</h2>
      <p className="text-[13.5px] text-ink-soft mb-7">
        Enter your email and we&apos;ll send a link to set a new one.
      </p>

      {error && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-error/10 border border-error/20 text-[13px] text-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Button type="submit" loading={loading} className="w-full" size="lg">
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-[13px] text-ink-muted">
        Remembered it?{' '}
        <Link
          href="/login"
          className="text-accent hover:text-accent-deep transition-colors font-medium"
        >
          Back to login
        </Link>
      </p>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <SplitAuthShell tagline="Locked out? We'll get you back in. One email, one link, new password.">
      <ForgotPasswordForm />
    </SplitAuthShell>
  )
}
