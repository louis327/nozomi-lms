import Link from 'next/link'
import type { ReactNode } from 'react'

type Props = {
  /** The single dominant italic word that fills the dark panel. End with a period. */
  hero: string
  children: ReactNode
}

export function SplitAuthShell({ hero, children }: Props) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-canvas">
      {/* Left: dark hero panel */}
      <div className="relative flex flex-col bg-[#0a0a0b] text-white px-8 py-10 sm:px-10 lg:w-[42%] lg:px-14 lg:py-12 overflow-hidden">
        {/* Faint accent radial glow, anchored bottom-left */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-[fadeInFast_1200ms_ease-out_300ms_both]"
          style={{
            background:
              'radial-gradient(circle at 10% 105%, rgba(233, 30, 99, 0.18) 0%, rgba(233, 30, 99, 0.06) 28%, transparent 55%)',
          }}
        />

        {/* Subtle vertical accent line on inner edge */}
        <div
          aria-hidden
          className="hidden lg:block absolute top-0 bottom-0 right-0 w-px bg-gradient-to-b from-transparent via-accent/30 to-transparent animate-[fadeInFast_1500ms_ease-out_500ms_both]"
        />

        {/* Wordmark — top-left */}
        <Link
          href="/"
          className="relative inline-flex items-center w-fit animate-[fadeInFast_500ms_ease-out_both]"
        >
          <span className="font-serif text-[22px] tracking-tight">Nozomi</span>
        </Link>

        {/* Hero word — anchored bottom-left, fills the panel */}
        <div className="relative flex-1 flex items-end pt-12 lg:pt-0">
          <h1
            className="text-white tracking-tight animate-[fadeUp_900ms_cubic-bezier(0.2,0.8,0.2,1)_200ms_both]"
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 700,
              fontStyle: 'italic',
              fontSize: 'clamp(72px, 11vw, 148px)',
              lineHeight: 0.92,
              letterSpacing: '-0.045em',
              textWrap: 'balance',
            }}
          >
            {hero.endsWith('.') ? (
              <>
                {hero.slice(0, -1)}
                <span className="text-accent">.</span>
              </>
            ) : (
              hero
            )}
          </h1>
        </div>

        {/* Footer — bottom-right */}
        <p className="relative text-[10px] tracking-[0.24em] text-white/30 uppercase self-end animate-[fadeInFast_900ms_ease-out_800ms_both]">
          © {new Date().getFullYear()} Nozomi
        </p>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center px-6 py-14 sm:px-10 lg:px-14 animate-[fadeInFast_500ms_ease-out_300ms_both]">
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  )
}
