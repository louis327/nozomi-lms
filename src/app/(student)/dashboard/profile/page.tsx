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

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-[22px] font-bold text-[#111] tracking-[-0.02em]">
          Profile
        </h1>
        <p className="text-[13px] text-[#888] mt-1">Manage your account settings</p>
      </div>

      <div className="bg-white rounded-xl border border-[#e8e8e8] p-6 max-w-lg">
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[#f0f0f0]">
          <div className="w-14 h-14 rounded-full bg-nz-sakura flex items-center justify-center text-white text-[20px] font-heading font-bold">
            {(profile?.full_name || user.email || 'S').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-heading font-semibold text-[14px] text-[#111]">
              {profile?.full_name || user.email?.split('@')[0] || 'Student'}
            </p>
            <p className="text-[12px] text-[#aaa]">Student</p>
          </div>
        </div>

        <ProfileForm
          email={user.email ?? ''}
          fullName={profile?.full_name ?? ''}
        />
      </div>
    </div>
  )
}
