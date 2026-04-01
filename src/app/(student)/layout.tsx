import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StudentLayoutShell } from '@/components/layout/student-layout-shell'
import { ToastProvider } from '@/components/ui/toast'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single()

  const userName = profile?.full_name || profile?.email || 'Student'
  const isAdmin = profile?.role === 'admin'

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#fafafa]">
        <StudentLayoutShell userName={userName} isAdmin={isAdmin}>
          {children}
        </StudentLayoutShell>
      </div>
    </ToastProvider>
  )
}
