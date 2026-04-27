import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileText, ArrowRight } from 'lucide-react'
import { ProfileForm } from '@/components/profile/profile-form'
import { RestartTourButton } from '@/components/profile/restart-tour-button'

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

        <div className="mt-6 bg-surface rounded-2xl border border-line p-6">
          <Link
            href="/onboarding?redo=1"
            className="group flex items-center gap-4"
          >
            <div className="w-11 h-11 rounded-xl bg-accent-soft flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-accent-deep" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-serif text-[16px] text-ink leading-tight group-hover:text-accent transition-colors">
                Revisit your founder dossier
              </p>
              <p className="text-[12.5px] text-ink-soft mt-0.5">
                Update your raise, team, or blocker as things change.
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-ink-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all" strokeWidth={1.5} />
          </Link>
        </div>

        <div className="mt-3 bg-surface rounded-2xl border border-line p-6">
          <RestartTourButton />
        </div>
      </div>
    </div>
  )
}
