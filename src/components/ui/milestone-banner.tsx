import { ReactNode } from 'react'
import { Award } from 'lucide-react'

type MilestoneBannerProps = {
  eyebrow?: string
  title: ReactNode
  description?: string
  primaryAction?: { label: string; href: string }
  secondaryAction?: { label: string; onClick?: () => void; href?: string }
}

export function MilestoneBanner({
  eyebrow = 'Milestone · Achievement Unlocked',
  title,
  description,
  primaryAction,
  secondaryAction,
}: MilestoneBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface-dark text-ink-inverted border border-line-dark px-7 py-6">
      <div className="flex items-start gap-6">
        <div className="flex-1 min-w-0">
          <p className="eyebrow-accent mb-3">{eyebrow}</p>
          <h3 className="display text-[28px] leading-tight text-white mb-2">{title}</h3>
          {description && (
            <p className="text-[13.5px] text-ink-inverted-soft max-w-xl leading-relaxed mb-5">
              {description}
            </p>
          )}
          <div className="flex items-center gap-2.5">
            {primaryAction && (
              <a
                href={primaryAction.href}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[12.5px] font-medium rounded-full bg-white text-ink hover:bg-surface-muted transition-colors"
              >
                {primaryAction.label} <span aria-hidden>→</span>
              </a>
            )}
            {secondaryAction &&
              (secondaryAction.href ? (
                <a
                  href={secondaryAction.href}
                  className="inline-flex items-center px-4 py-2 text-[12.5px] font-medium rounded-full bg-white/10 text-white hover:bg-white/15 transition-colors"
                >
                  {secondaryAction.label}
                </a>
              ) : (
                <button
                  onClick={secondaryAction.onClick}
                  className="inline-flex items-center px-4 py-2 text-[12.5px] font-medium rounded-full bg-white/10 text-white hover:bg-white/15 transition-colors cursor-pointer"
                >
                  {secondaryAction.label}
                </button>
              ))}
          </div>
        </div>
        <div className="hidden sm:flex shrink-0 w-20 h-20 rounded-2xl bg-accent-soft/10 border border-accent/30 items-center justify-center">
          <Award className="w-8 h-8 text-accent" strokeWidth={1.25} />
        </div>
      </div>
    </div>
  )
}
