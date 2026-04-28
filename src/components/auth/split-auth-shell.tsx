import Link from 'next/link'
import type { ReactNode } from 'react'

type Props = {
  /** Single supporting line at the bottom of the panel. Keep it short. */
  tagline: string
  children: ReactNode
}

type PreviewItem = { label: string; state: 'done' | 'active' | 'todo' }

const PREVIEW_EYEBROW = 'Module 04 · Sample'
const PREVIEW_TITLE_PREFIX = 'The pitch'
const PREVIEW_TITLE_ACCENT = 'deck.'
const PREVIEW_ITEMS: PreviewItem[] = [
  { label: 'TL;DR & module overview', state: 'done' },
  { label: 'The ten-slide structure', state: 'done' },
  { label: 'Building the ask', state: 'active' },
  { label: 'Mistakes that kill rounds', state: 'todo' },
  { label: 'Final check', state: 'todo' },
]

function ItemMark({ state }: { state: PreviewItem['state'] }) {
  if (state === 'done') {
    return (
      <span className="w-[18px] h-[18px] rounded-full bg-accent flex items-center justify-center shrink-0">
        <svg
          className="w-[10px] h-[10px] text-white"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    )
  }
  if (state === 'active') {
    return (
      <span className="w-[18px] h-[18px] rounded-full border-[2px] border-accent shrink-0 relative">
        <span className="absolute inset-1 rounded-full bg-accent/40 animate-pulse" />
      </span>
    )
  }
  return <span className="w-[18px] h-[18px] rounded-full border border-white/20 shrink-0" />
}

export function SplitAuthShell({ tagline, children }: Props) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-canvas">
      {/* Left: dark hero panel */}
      <div className="relative flex flex-col bg-[#0a0a0b] text-white px-8 py-10 sm:px-10 lg:w-[42%] lg:px-14 lg:py-12 overflow-hidden isolate">
        {/* Animated gradient mesh */}
        <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
          <div
            className="absolute -top-[15%] -left-[20%] w-[75%] aspect-square rounded-full will-change-transform animate-[meshFloat1_22s_ease-in-out_infinite] motion-reduce:animate-none"
            style={{
              background: 'radial-gradient(circle, #e91e63 0%, transparent 65%)',
              filter: 'blur(70px)',
              opacity: 0.5,
            }}
          />
          <div
            className="absolute top-[15%] -right-[25%] w-[70%] aspect-square rounded-full will-change-transform animate-[meshFloat2_28s_ease-in-out_infinite] motion-reduce:animate-none"
            style={{
              background: 'radial-gradient(circle, #4c1d95 0%, transparent 70%)',
              filter: 'blur(90px)',
              opacity: 0.45,
            }}
          />
          <div
            className="absolute bottom-[-10%] left-[5%] w-[65%] aspect-square rounded-full will-change-transform animate-[meshFloat3_24s_ease-in-out_infinite] motion-reduce:animate-none"
            style={{
              background: 'radial-gradient(circle, #831843 0%, transparent 70%)',
              filter: 'blur(80px)',
              opacity: 0.45,
            }}
          />
          {/* Vignettes for legibility */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(10,10,11,0.55) 0%, rgba(10,10,11,0.0) 22%, rgba(10,10,11,0.0) 65%, rgba(10,10,11,0.7) 100%)',
            }}
          />
          {/* Subtle film grain */}
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

        {/* Center: floating course-preview card — what Nozomi actually looks like */}
        <div className="relative flex-1 flex items-center justify-center py-12 lg:py-8">
          <div
            className="relative w-full max-w-[420px] rounded-2xl border border-white/10 p-7 lg:p-8 animate-[fadeUp_900ms_cubic-bezier(0.2,0.8,0.2,1)_400ms_both]"
            style={{
              background: 'rgba(255,255,255,0.035)',
              backdropFilter: 'blur(24px) saturate(140%)',
              WebkitBackdropFilter: 'blur(24px) saturate(140%)',
              boxShadow:
                '0 40px 80px -24px rgba(233,30,99,0.18), 0 12px 36px -12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
              transform: 'rotate(-1.4deg)',
            }}
          >
            <p className="text-[10px] font-semibold tracking-[0.22em] text-accent uppercase mb-4">
              {PREVIEW_EYEBROW}
            </p>
            <h2
              className="text-white tracking-tight mb-7"
              style={{
                fontFamily: 'var(--font-sans)',
                fontWeight: 700,
                fontStyle: 'italic',
                fontSize: 'clamp(28px, 2.6vw, 36px)',
                lineHeight: 1.05,
                letterSpacing: '-0.025em',
              }}
            >
              {PREVIEW_TITLE_PREFIX}{' '}
              <span className="text-accent">{PREVIEW_TITLE_ACCENT}</span>
            </h2>
            <div className="h-px bg-white/10 mb-5" />
            <div className="space-y-3.5">
              {PREVIEW_ITEMS.map((item) => (
                <div key={item.label} className="flex items-center gap-3 text-[13px]">
                  <ItemMark state={item.state} />
                  <span
                    className={
                      item.state === 'done'
                        ? 'text-white/40 line-through decoration-white/20'
                        : item.state === 'active'
                          ? 'text-white font-medium'
                          : 'text-white/55'
                    }
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row: tagline (left) + copyright (right) */}
        <div className="relative flex items-end justify-between gap-4">
          <p
            className="text-white/65 leading-[1.5] max-w-[34ch] animate-[fadeUp_800ms_cubic-bezier(0.2,0.8,0.2,1)_700ms_both]"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'clamp(13px, 1vw, 15px)',
              letterSpacing: '-0.005em',
              textShadow: '0 1px 12px rgba(0,0,0,0.5)',
            }}
          >
            {tagline}
          </p>
          <p className="shrink-0 text-[10px] tracking-[0.24em] text-white/35 uppercase animate-[fadeInFast_900ms_ease-out_900ms_both]">
            © {new Date().getFullYear()}
          </p>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center px-6 py-14 sm:px-10 lg:px-14 animate-[fadeInFast_500ms_ease-out_300ms_both]">
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  )
}
