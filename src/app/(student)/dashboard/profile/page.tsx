import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileForm } from '@/components/profile/profile-form'

export const metadata = { title: 'Profile — Nozomi' }

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const displayName = profile?.full_name || user.email?.split('@')[0] || 'Student'
  const initial = (profile?.full_name || user.email || 'S').charAt(0).toUpperCase()

  return (
    <div className="px-6 lg:px-10 py-10 pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="mb-10">
          <p className="eyebrow mb-3">Account</p>
          <h1 className="display text-[40px] sm:text-[48px] leading-[1.05] mb-2">
            Your <em>profile.</em>
          </h1>
          <p className="text-[14px] text-ink-soft">Manage your account details and preferences.</p>
        </div>

        <div className="bg-surface rounded-2xl border border-line p-8">
          <div className="flex items-center gap-4 mb-8 pb-8 border-b border-line-soft">
            <div className="w-16 h-16 rounded-full bg-accent-soft flex items-center justify-center font-serif text-[26px] text-accent-deep">
              {initial}
            </div>
            <div>
              <p className="font-serif text-[20px] text-ink leading-tight">{displayName}</p>
              <p className="text-[12px] text-ink-muted uppercase tracking-[0.12em] mt-0.5">Student</p>
            </div>
          </div>

          <ProfileForm
            email={user.email ?? ''}
            fullName={profile?.full_name ?? ''}
          />
        </div>
      </div>
    </div>
  )
}
