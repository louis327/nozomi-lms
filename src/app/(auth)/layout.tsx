import Link from 'next/link'
import { SakuraPetals } from '@/components/layout/sakura-petals'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-nz-bg-primary flex flex-col items-center justify-center px-4 py-12 relative">
      <SakuraPetals count={20} />
      {/* Logo */}
      <Link
        href="/"
        className="mb-10 font-heading font-bold text-2xl text-nz-text-primary tracking-tight"
      >
        NOZOMI<span className="text-nz-sakura">.</span>
      </Link>

      {/* Auth card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-nz-bg-card/80 backdrop-blur-xl border border-nz-border p-8">
        {children}
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-nz-text-muted">
        &copy; {new Date().getFullYear()} Nozomi. All rights reserved.
      </p>
    </div>
  )
}
