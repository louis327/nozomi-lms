import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/admin/admin-sidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/')
  }

  const adminName = profile.full_name || profile.email || 'Admin'

  return (
    <div className="min-h-screen bg-nz-bg-primary">
      <AdminSidebar adminName={adminName} />

      {/* Main content */}
      <main className="ml-60 min-h-screen">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
