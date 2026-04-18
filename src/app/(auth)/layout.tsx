import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 inline-flex items-center">
        <span className="font-serif text-[22px] text-ink tracking-tight">Nozomi</span>
      </Link>

      <div
        className="w-full max-w-md rounded-2xl bg-surface border border-line p-8 sm:p-10"
        style={{ boxShadow: '0 1px 2px rgba(20,20,20,0.04), 0 8px 24px -12px rgba(20,20,20,0.08)' }}
      >
        {children}
      </div>

      <p className="mt-8 text-[11px] text-ink-faint uppercase tracking-[0.14em]">
        &copy; {new Date().getFullYear()} Nozomi
      </p>
    </div>
  )
}
