'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (authError) {
        setError(authError.message)
        return
      }

      setSuccess(true)
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-nz-sakura/10 flex items-center justify-center">
          <svg className="w-7 h-7 text-nz-sakura" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <h2 className="font-heading text-xl font-bold text-nz-text-primary mb-2">
          Check your email
        </h2>
        <p className="text-sm text-nz-text-secondary mb-6">
          We sent a confirmation link to <span className="text-nz-text-primary font-medium">{email}</span>.
          Click the link to activate your account.
        </p>
        <Link
          href="/login"
          className="text-sm text-nz-sakura hover:text-nz-sakura-deep transition-colors font-medium"
        >
          Back to login
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-nz-text-primary mb-1">
        Create your account
      </h1>
      <p className="text-sm text-nz-text-muted mb-8">
        Start your Web3 fundraising journey.
      </p>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-nz-error/10 border border-nz-error/20 text-sm text-nz-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Full Name"
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

        <Button
          type="submit"
          loading={loading}
          className="w-full"
          size="lg"
        >
          Create Account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-nz-text-muted">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-nz-sakura hover:text-nz-sakura-deep transition-colors font-medium"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
