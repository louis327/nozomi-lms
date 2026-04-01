import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { AdminProviders } from '@/components/admin/admin-providers'
import { AiChat } from '@/components/admin/ai-chat'

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
    <AdminProviders>
      <div className="min-h-screen bg-[#fafafa]">
        <AdminSidebar adminName={adminName} />

        {/* Main content */}
        <main className="lg:ml-[240px] min-h-screen">
          <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8 max-w-[1200px]">{children}</div>
        </main>

        <AiChat />
      </div>
    </AdminProviders>
  )
}
