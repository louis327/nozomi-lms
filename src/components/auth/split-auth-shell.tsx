import Link from 'next/link'
import type { ReactNode } from 'react'

type Props = {
  /** The single dominant italic word that fills the dark panel. End with a period. */
  hero: string
  /** Single supporting line under the hero. Keep it short. */
  tagline: string
  children: ReactNode
}

export function SplitAuthShell({ hero, tagline, children }: Props) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-canvas">
      {/* Left: dark hero panel */}
      <div className="relative flex flex-col bg-[#0a0a0b] text-white px-8 py-10 sm:px-10 lg:w-[42%] lg:px-14 lg:py-12 overflow-hidden isolate">
        {/* Animated gradient mesh — three blurred color blobs that drift slowly */}
        <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
          <div
            className="absolute -top-[15%] -left-[20%] w-[75%] aspect-square rounded-full will-change-transform animate-[meshFloat1_22s_ease-in-out_infinite] motion-reduce:animate-none"
            style={{
              background: 'radial-gradient(circle, #e91e63 0%, transparent 65%)',
              filter: 'blur(70px)',
              opacity: 0.55,
            }}
          />
          <div
            className="absolute top-[15%] -right-[25%] w-[70%] aspect-square rounded-full will-change-transform animate-[meshFloat2_28s_ease-in-out_infinite] motion-reduce:animate-none"
            style={{
              background: 'radial-gradient(circle, #4c1d95 0%, transparent 70%)',
              filter: 'blur(90px)',
              opacity: 0.5,
            }}
          />
          <div
            className="absolute bottom-[-10%] left-[5%] w-[65%] aspect-square rounded-full will-change-transform animate-[meshFloat3_24s_ease-in-out_infinite] motion-reduce:animate-none"
            style={{
              background: 'radial-gradient(circle, #831843 0%, transparent 70%)',
              filter: 'blur(80px)',
              opacity: 0.5,
            }}
          />
          {/* Top + bottom dark vignettes for text legibility */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(10,10,11,0.55) 0%, rgba(10,10,11,0.0) 22%, rgba(10,10,11,0.0) 65%, rgba(10,10,11,0.7) 100%)',
            }}
          />
          {/* Faint film grain feel via low-opacity noise overlay (radial dotted) */}
          <div
            className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
              backgroundSize: '3px 3px',
            }}
          />
        </div>

        {/* Right edge accent hairline */}
        <div
          aria-hidden
          className="hidden lg:block absolute top-0 bottom-0 right-0 w-px bg-gradient-to-b from-transparent via-accent/40 to-transparent z-10"
        />

        {/* Top row: wordmark + small proof line on left, editorial label on right */}
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <Link
              href="/"
              className="inline-flex items-center w-fit animate-[fadeInFast_500ms_ease-out_both]"
            >
              <span className="font-serif text-[24px] tracking-tight">Nozomi</span>
            </Link>
            <p className="mt-1 text-[11.5px] text-white/45 font-medium tracking-tight animate-[fadeInFast_700ms_ease-out_200ms_both]">
              The fundraising playbook
            </p>
          </div>
          <p className="hidden sm:block text-[10px] tracking-[0.28em] text-white/45 uppercase mt-2 text-right animate-[fadeInFast_700ms_ease-out_400ms_both]">
            Raise Protocol
            <span className="text-white/25 mx-1.5">·</span>
            Ed. 01
          </p>
        </div>

        {/* Hero block — anchored bottom-left */}
        <div className="relative flex-1 flex flex-col justify-end pt-16 lg:pt-0">
          <h1
            className="text-white tracking-tight animate-[fadeUp_900ms_cubic-bezier(0.2,0.8,0.2,1)_300ms_both]"
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 700,
              fontStyle: 'italic',
              fontSize: 'clamp(72px, 11vw, 148px)',
              lineHeight: 0.92,
              letterSpacing: '-0.045em',
              textWrap: 'balance',
              textShadow: '0 2px 40px rgba(0,0,0,0.4)',
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
          <p
            className="mt-5 lg:mt-6 text-white/65 leading-[1.5] max-w-[34ch] animate-[fadeUp_800ms_cubic-bezier(0.2,0.8,0.2,1)_600ms_both]"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'clamp(14px, 1.15vw, 17px)',
              letterSpacing: '-0.005em',
              textShadow: '0 1px 12px rgba(0,0,0,0.5)',
            }}
          >
            {tagline}
          </p>
        </div>

        {/* Footer */}
        <p className="relative mt-10 lg:mt-12 text-[10px] tracking-[0.24em] text-white/35 uppercase self-end animate-[fadeInFast_900ms_ease-out_900ms_both]">
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
