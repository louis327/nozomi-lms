import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-nz-border bg-nz-bg-secondary/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Branding */}
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-lg text-nz-text-primary tracking-tight">
              NOZOMI<span className="text-nz-sakura">.</span>
            </span>
            <span className="text-nz-text-muted text-sm">Learning Platform</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <a
              href="https://nozomi.network"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-nz-text-tertiary hover:text-nz-sakura transition-colors"
            >
              nozomi.network
            </a>
            <Link
              href="/courses"
              className="text-sm text-nz-text-tertiary hover:text-nz-text-secondary transition-colors"
            >
              Courses
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-xs text-nz-text-muted">
            &copy; {new Date().getFullYear()} Nozomi. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
