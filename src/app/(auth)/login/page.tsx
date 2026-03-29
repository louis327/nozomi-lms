'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

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
      <h1 className="font-heading text-2xl font-bold text-nz-text-primary mb-1">
        Welcome back
      </h1>
      <p className="text-sm text-nz-text-muted mb-8">
        Sign in to continue learning.
      </p>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-nz-error/10 border border-nz-error/20 text-sm text-nz-error">
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

        <Button
          type="submit"
          loading={loading}
          className="w-full"
          size="lg"
        >
          Sign In
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-nz-text-muted">
        Don&apos;t have an account?{' '}
        <Link
          href="/signup"
          className="text-nz-sakura hover:text-nz-sakura-deep transition-colors font-medium"
        >
          Sign up
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="space-y-5 animate-pulse">
        <div className="h-8 w-48 bg-nz-bg-tertiary rounded-lg" />
        <div className="h-4 w-56 bg-nz-bg-tertiary rounded-lg" />
        <div className="h-12 bg-nz-bg-tertiary rounded-xl" />
        <div className="h-12 bg-nz-bg-tertiary rounded-xl" />
        <div className="h-12 bg-nz-bg-tertiary rounded-xl" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
