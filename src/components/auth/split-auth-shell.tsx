import Link from 'next/link'
import type { ReactNode } from 'react'

type Props = {
  eyebrow: string
  headlinePrefix: string
  headlineAccent: string
  subtitle: string
  footerNote?: ReactNode
  children: ReactNode
}

export function SplitAuthShell({
  eyebrow,
  headlinePrefix,
  headlineAccent,
  subtitle,
  footerNote,
  children,
}: Props) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-canvas">
      {/* Left: dark editorial hero */}
      <div className="relative flex flex-col justify-between bg-[#0a0a0b] text-white px-8 py-10 sm:px-12 lg:w-[55%] lg:px-16 lg:py-14 overflow-hidden">
        <Link
          href="/"
          className="inline-flex items-center w-fit animate-[fadeInFast_400ms_ease-out_both]"
        >
          <span className="font-serif text-[20px] tracking-tight">Nozomi</span>
        </Link>

        <div className="py-10 lg:py-0 max-w-[18ch]">
          <p className="text-[12px] font-semibold tracking-[0.36em] text-accent uppercase mb-6 lg:mb-8 animate-[fadeUp_600ms_ease-out_100ms_both]">
            {eyebrow}
          </p>
          <h1
            className="text-white tracking-tight mb-6 lg:mb-8 animate-[fadeUp_700ms_ease-out_250ms_both]"
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 700,
              fontStyle: 'italic',
              fontSize: 'clamp(44px, 7vw, 96px)',
              lineHeight: 0.95,
              letterSpacing: '-0.04em',
            }}
          >
            {headlinePrefix} <span className="text-accent">{headlineAccent}</span>
          </h1>
          <p className="text-[14px] lg:text-[16px] text-white/55 leading-[1.55] max-w-[42ch] animate-[fadeUp_700ms_ease-out_450ms_both]">
            {subtitle}
          </p>
        </div>

        <p className="text-[10px] tracking-[0.24em] text-white/30 uppercase animate-[fadeInFast_800ms_ease-out_700ms_both]">
          {footerNote ?? `© ${new Date().getFullYear()} Nozomi`}
        </p>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 sm:px-10 lg:px-12 animate-[fadeInFast_500ms_ease-out_300ms_both]">
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  )
}
