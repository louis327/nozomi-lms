import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-nz-bg-secondary via-white to-nz-bg-tertiary flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Subtle decorative background dots */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #E8458B 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      {/* Logo */}
      <Link
        href="/"
        className="relative z-10 mb-8 font-heading font-bold text-3xl text-nz-text-primary tracking-tight"
      >
        NOZOMI<span className="text-nz-sakura">.</span>
      </Link>

      {/* Auth card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white border border-nz-border shadow-xl p-8 sm:p-10">
        {children}
      </div>

      {/* Footer */}
      <p className="relative z-10 mt-8 text-xs text-nz-text-muted">
        &copy; {new Date().getFullYear()} Nozomi. All rights reserved.
      </p>
    </div>
  )
}
