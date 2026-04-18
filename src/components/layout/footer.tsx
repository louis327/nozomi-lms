import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-line bg-canvas">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-serif text-[18px] text-ink tracking-tight">Nozomi</span>
            <span className="text-ink-muted text-[12px]">Learning Platform</span>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="https://nozomi.network"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] text-ink-muted hover:text-accent transition-colors"
            >
              nozomi.network
            </a>
            <Link
              href="/courses"
              className="text-[12px] text-ink-muted hover:text-ink transition-colors"
            >
              Courses
            </Link>
          </div>

          <p className="text-[11px] text-ink-faint uppercase tracking-[0.14em]">
            &copy; {new Date().getFullYear()} Nozomi
          </p>
        </div>
      </div>
    </footer>
  )
}
