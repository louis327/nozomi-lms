import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Course } from '@/lib/types'

export const metadata = { title: 'Nozomi, Master Web3 fundraising' }

// Deterministic swatch palette (cycled by course order).
const PALETTE = [
  { c: '#e91e63', deep: '#c2185b', tint: '#fdf1f5', grad: 'linear-gradient(140deg,#f0356f,#c2185b)' },
  { c: '#7c3aed', deep: '#6d28d9', tint: '#f5f1fe', grad: 'linear-gradient(140deg,#8b5cf6,#6d28d9)' },
  { c: '#16a06b', deep: '#13855a', tint: '#eefaf4', grad: 'linear-gradient(140deg,#22b07d,#13855a)' },
  { c: '#2563eb', deep: '#1d4ed8', tint: '#eef3fe', grad: 'linear-gradient(140deg,#3b82f6,#1d4ed8)' },
  { c: '#d97706', deep: '#b45309', tint: '#fef6ec', grad: 'linear-gradient(140deg,#f59e0b,#b45309)' },
]

function initials(title: string) {
  return (
    title
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'N'
  )
}

export default async function HomePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  const { data: courses } = await supabase
    .from('courses')
    .select('*, modules(id)')
    .eq('status', 'published')
    .order('sort_order', { ascending: true })

  const coursesWithCount = (courses ?? []).map((course: Course & { modules: { id: string }[] }) => ({
    ...course,
    moduleCount: course.modules?.length ?? 0,
  }))

  const year = new Date().getFullYear()

  return (
    <>
      <style>{`
        .lr-swatch, .lr-arr { transition: all .25s ease; }
        .lr-row:hover { background: var(--tint); }
        .lr-row:hover .lr-swatch { transform: scale(1.06) rotate(-2deg); }
        .lr-row:hover h3 { color: var(--c-deep); }
        .lr-row:hover .lr-arr { border-color: var(--c); background: var(--c); color: #fff; transform: translateX(4px); }
      `}</style>

      {/* Hero */}
      <header className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-[120px] -top-[160px] h-[560px] w-[620px] rounded-full"
          style={{ background: 'radial-gradient(circle, var(--nz-accent-soft), transparent 64%)', opacity: 0.85 }}
        />
        <div className="relative mx-auto max-w-[1140px] px-6 sm:px-11">
          <div className="relative pb-16 pt-20 sm:pt-28 lg:pl-[74px]">
            {/* Vertical spine, desktop only */}
            <div className="absolute left-[14px] top-1/2 hidden -translate-y-1/2 flex-col items-center gap-[18px] lg:flex">
              <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.26em] text-ink-muted [writing-mode:vertical-rl] [transform:rotate(180deg)]">
                Nozomi Learn
              </span>
              <span className="h-16 w-px bg-line-strong" />
            </div>

            <p className="mb-6 text-[12px] font-semibold uppercase tracking-[0.16em] text-accent">
              The YC for Web3 fundraising
            </p>

            <h1 className="max-w-[15ch] text-[clamp(44px,6.6vw,84px)] font-bold leading-[0.98] tracking-[-0.045em] text-ink">
              Master fundraising,
              <br />
              taught by <span className="text-accent">operators.</span>
            </h1>

            <div className="mt-9 flex flex-wrap items-end justify-between gap-10">
              <p className="max-w-[46ch] text-[18px] leading-[1.6] text-ink-soft">
                Learn from founders who&apos;ve raised and deployed capital across DeFi, infrastructure, and
                consumer, actionable knowledge, not theory.
              </p>
              <div className="flex shrink-0 items-center gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-[10px] border border-line-strong px-6 py-[13px] text-[14.5px] font-semibold text-ink transition-colors hover:border-ink-faint hover:bg-surface-muted"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="group inline-flex items-center justify-center gap-2 rounded-[10px] bg-ink px-6 py-[13px] text-[14.5px] font-semibold text-white transition-[filter] hover:brightness-110"
                >
                  Get started
                  <ArrowRight size={15} strokeWidth={2.2} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Curriculum index */}
      <section id="courses" className="flex flex-1 flex-col pb-20 pt-6">
        <div className="mx-auto w-full max-w-[1140px] px-6 sm:px-11">
          <div className="flex items-baseline justify-between gap-5 pb-2">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Courses</span>
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Self-paced</span>
          </div>

          {coursesWithCount.length === 0 ? (
            <div className="border-t border-line py-20 text-center">
              <p className="text-[15px] text-ink-soft">New courses are being prepared, check back soon.</p>
            </div>
          ) : (
            <div>
              {coursesWithCount.map((course, i) => {
                const p = PALETTE[i % PALETTE.length]
                return (
                  <Link
                    key={course.id}
                    href={`/courses/${course.id}`}
                    className="lr-row group grid items-center gap-5 border-t border-line px-2 py-[26px] last:border-b sm:gap-[30px] sm:px-[18px] sm:py-[34px] [grid-template-columns:1fr_auto] sm:[grid-template-columns:76px_1fr_auto]"
                    style={{ '--c': p.c, '--c-deep': p.deep, '--tint': p.tint } as React.CSSProperties}
                  >
                    <span
                      className="lr-swatch hidden h-[76px] w-[76px] shrink-0 items-center justify-center rounded-[18px] text-[24px] font-bold tracking-[-0.03em] text-white shadow-[0_8px_22px_-10px_rgba(16,24,40,0.4)] sm:flex"
                      style={{ background: p.grad }}
                    >
                      {initials(course.title)}
                    </span>
                    <span className="min-w-0">
                      <h3 className="mb-[7px] text-[clamp(22px,2.6vw,32px)] font-bold leading-[1.08] tracking-[-0.03em] text-ink transition-colors">
                        {course.title}
                      </h3>
                      {course.description && (
                        <p className="line-clamp-2 max-w-[54ch] text-[14.5px] leading-[1.55] text-ink-soft">
                          {course.description}
                        </p>
                      )}
                    </span>
                    <span className="flex items-center gap-5 sm:gap-7">
                      <span className="hidden whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted sm:inline">
                        {course.moduleCount} {course.moduleCount === 1 ? 'module' : 'modules'}
                      </span>
                      <span className="lr-arr flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full border border-line-strong text-ink-muted">
                        <ArrowRight size={18} strokeWidth={2} />
                      </span>
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-surface-muted">
        <div className="mx-auto flex max-w-[1140px] flex-wrap items-center justify-between gap-5 px-6 py-[30px] sm:px-11">
          <span className="text-[18px] font-bold tracking-[-0.02em] text-ink">
            Nozomi <span className="font-semibold text-ink-muted">Learn</span>
          </span>
          <div className="flex items-center gap-6">
            <a href="#courses" className="text-[13px] text-ink-muted transition-colors hover:text-ink">
              Courses
            </a>
            <Link href="/login" className="text-[13px] text-ink-muted transition-colors hover:text-ink">
              Log in
            </Link>
            <a
              href="https://nozomi.network"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-ink-muted transition-colors hover:text-ink"
            >
              nozomi.network
            </a>
          </div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">© {year} Nozomi</p>
        </div>
      </footer>
    </>
  )
}
