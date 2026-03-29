import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { SakuraPetals } from '@/components/layout/sakura-petals'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <SakuraPetals />
      <main className="min-h-screen pt-20">{children}</main>
      <Footer />
    </>
  )
}
