import Link from 'next/link'

type ComingSoonProps = {
  eyebrow: string
  title: string
  titleAccent: string
  description: string
  icon: React.ReactNode
}

export function ComingSoon({ eyebrow, title, titleAccent, description, icon }: ComingSoonProps) {
  return (
    <div className="px-6 lg:px-10 py-10 pb-24">
      <div className="max-w-3xl mx-auto">
        <p className="eyebrow-accent mb-4">{eyebrow}</p>
        <h1 className="display text-[44px] sm:text-[56px] leading-[1.05] mb-4">
          {title} <em>{titleAccent}</em>
        </h1>
        <p className="text-[15px] text-ink-soft leading-relaxed max-w-xl mb-10">{description}</p>

        <div className="rounded-2xl bg-surface border border-line p-10 flex items-start gap-6">
          <div className="w-14 h-14 rounded-full bg-accent-soft flex items-center justify-center text-accent-deep shrink-0">
            {icon}
          </div>
          <div className="flex-1">
            <p className="eyebrow mb-2">Coming soon</p>
            <h2 className="font-serif text-[20px] text-ink mb-2">In the works.</h2>
            <p className="text-[13.5px] text-ink-soft leading-relaxed mb-5">
              We&apos;re building this out for a future release. In the meantime, stay focused on your current
              module — the rest will come online as you progress.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink hover:text-accent transition-colors"
            >
              Back to dashboard <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
