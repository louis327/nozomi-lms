'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SplitAuthShell } from '@/components/auth/split-auth-shell'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(
    searchParams.get('error') === 'auth' ? 'Authentication failed. Please try again.' : null
  )
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        return
      }

      router.push(redirectTo)
      router.refresh()
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <p className="eyebrow-accent mb-2 lg:hidden">Sign in</p>
      <h2 className="display text-[24px] leading-[1.2] mb-1.5">Sign in</h2>
      <p className="text-[13.5px] text-ink-soft mb-7">
        Enter your details to continue.
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

        <Input
          label="Password"
          type="password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        <Button type="submit" loading={loading} className="w-full" size="lg">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-[13px] text-ink-muted">
        Don&apos;t have an account?{' '}
        <Link
          href="/signup"
          className="text-accent hover:text-accent-deep transition-colors font-medium"
        >
          Sign up
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <SplitAuthShell hero="Welcome.">
      <Suspense
        fallback={
          <div className="space-y-5 animate-pulse">
            <div className="h-8 w-48 bg-surface-muted rounded-lg" />
            <div className="h-4 w-56 bg-surface-muted rounded-lg" />
            <div className="h-12 bg-surface-muted rounded-xl" />
            <div className="h-12 bg-surface-muted rounded-xl" />
            <div className="h-12 bg-surface-muted rounded-xl" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </SplitAuthShell>
  )
}
