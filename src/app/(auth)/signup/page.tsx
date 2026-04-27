'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/onboarding'

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        },
      })

      if (authError) {
        setError(authError.message)
        return
      }

      // Auto-confirm is on — session is returned immediately
      if (data.session) {
        router.push(redirectTo)
        router.refresh()
        return
      }

      // Email confirmation required — show confirmation screen
      setConfirmationSent(true)
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  if (confirmationSent) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 w-14 h-14 rounded-full bg-accent-soft flex items-center justify-center">
          <svg className="w-7 h-7 text-accent-deep" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <h1 className="display text-[28px] leading-[1.2] mb-3">
          Check your <em>email.</em>
        </h1>
        <p className="text-[14px] text-ink-soft mb-1">We sent a confirmation link to</p>
        <p className="text-[14px] font-medium text-ink mb-6">{email}</p>
        <p className="text-[13px] text-ink-muted mb-8 leading-relaxed">
          Click the link in your email to activate your account. If you don&apos;t see it, check your spam folder.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-[13px] font-medium text-accent hover:text-accent-deep transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to login
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="text-center mb-8">
        <p className="eyebrow-accent mb-3">Create account</p>
        <h1 className="display text-[32px] leading-[1.15] mb-2">
          Start <em>your journey.</em>
        </h1>
        <p className="text-[14px] text-ink-soft">Web3 fundraising, taught by operators.</p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-error/10 border border-error/20 text-[13px] text-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Full name"
          type="text"
          placeholder="Your full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoComplete="name"
        />

        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <div>
          <Input
            label="Password"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
          <p className="mt-1.5 text-[11px] text-ink-muted">Must be at least 6 characters</p>
        </div>

        <Button
          type="submit"
          loading={loading}
          className="w-full"
          size="lg"
        >
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-ink-muted">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-accent hover:text-accent-deep transition-colors font-medium"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="space-y-5 animate-pulse">
        <div className="h-8 w-48 bg-surface-muted rounded-lg" />
        <div className="h-4 w-56 bg-surface-muted rounded-lg" />
        <div className="h-12 bg-surface-muted rounded-xl" />
        <div className="h-12 bg-surface-muted rounded-xl" />
        <div className="h-12 bg-surface-muted rounded-xl" />
        <div className="h-12 bg-surface-muted rounded-xl" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  )
}
