'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SplitAuthShell } from '@/components/auth/split-auth-shell'

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

      if (data.session) {
        router.push(redirectTo)
        router.refresh()
        return
      }

      setConfirmationSent(true)
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  if (confirmationSent) {
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
        <p className="text-[13.5px] text-ink-soft mb-1">We sent a confirmation link to</p>
        <p className="text-[13.5px] font-medium text-ink mb-5">{email}</p>
        <p className="text-[13px] text-ink-muted mb-7 leading-relaxed">
          Click the link in your email to activate your account. If you don&apos;t see it, check
          your spam folder.
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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to login
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h2 className="display text-[24px] leading-[1.2] mb-1.5">Create account</h2>
      <p className="text-[13.5px] text-ink-soft mb-7">
        Three fields. Then onto your brief.
      </p>

      {error && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-error/10 border border-error/20 text-[13px] text-error">
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

        <Button type="submit" loading={loading} className="w-full" size="lg">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-[13px] text-ink-muted">
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
    <SplitAuthShell
      hero="Begin."
      tagline="Web3 fundraising, taught by operators who've raised the rounds."
    >
      <Suspense
        fallback={
          <div className="space-y-5 animate-pulse">
            <div className="h-8 w-48 bg-surface-muted rounded-lg" />
            <div className="h-4 w-56 bg-surface-muted rounded-lg" />
            <div className="h-12 bg-surface-muted rounded-xl" />
            <div className="h-12 bg-surface-muted rounded-xl" />
            <div className="h-12 bg-surface-muted rounded-xl" />
            <div className="h-12 bg-surface-muted rounded-xl" />
          </div>
        }
      >
        <SignupForm />
      </Suspense>
    </SplitAuthShell>
  )
}
