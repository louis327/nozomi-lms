'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type ProfileFormProps = {
  email: string
  fullName: string
}

export function ProfileForm({ email, fullName: initialName }: ProfileFormProps) {
  const router = useRouter()
  const [fullName, setFullName] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() || null })
        .eq('id', user.id)

      if (updateError) {
        setError('Failed to update profile. Please try again.')
        return
      }

      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col gap-1.5 w-full">
        <label className="eyebrow">Email</label>
        <div className="px-4 py-2.5 rounded-xl bg-surface-muted/60 border border-line-soft text-[14px] text-ink-muted">
          {email}
        </div>
      </div>

      <Input
        label="Full name"
        type="text"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Enter your full name"
      />

      {error && (
        <div className="px-4 py-3 rounded-xl bg-error/10 border border-error/20 text-[13px] text-error">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" loading={saving}>
          Save changes
        </Button>
        {saved && (
          <span className="text-[12px] text-success uppercase tracking-[0.12em] font-medium">Saved</span>
        )}
      </div>
    </form>
  )
}
