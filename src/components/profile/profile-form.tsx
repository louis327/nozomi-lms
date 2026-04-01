'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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
      {/* Email (read-only) */}
      <div>
        <label className="block text-[11px] font-bold text-[#999] uppercase tracking-[0.08em] mb-2">
          Email
        </label>
        <div className="px-4 py-3 rounded-lg bg-[#f9f9f9] border border-[#e8e8e8] text-[13px] text-[#888]">
          {email}
        </div>
      </div>

      {/* Full Name */}
      <div>
        <label htmlFor="fullName" className="block text-[11px] font-bold text-[#999] uppercase tracking-[0.08em] mb-2">
          Full Name
        </label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Enter your full name"
          className="w-full px-4 py-3 rounded-lg bg-white border border-[#e8e8e8] text-[13px] text-[#111] placeholder:text-[#ccc] focus:outline-none focus:border-[#111] transition-colors"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-[#fef2f2] border border-[#fecaca] text-[13px] text-[#ef4444]">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 text-[13px] font-heading font-semibold rounded-lg bg-[#111] text-white hover:bg-[#333] transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        {saved && (
          <span className="text-[13px] text-[#22c55e] font-medium">Saved successfully</span>
        )}
      </div>
    </form>
  )
}
