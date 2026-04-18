type ProgressBarProps = {
  value: number
  tone?: 'accent' | 'ink' | 'inverted'
  className?: string
}

export function ProgressBar({ value, tone = 'accent', className = '' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))
  const trackClass =
    tone === 'inverted' ? 'bg-white/10' : tone === 'ink' ? 'bg-surface-muted' : 'bg-surface-muted'
  const fillClass =
    tone === 'inverted' ? 'bg-accent' : tone === 'ink' ? 'bg-ink' : 'bg-accent'
  return (
    <div
      className={`w-full h-[3px] rounded-full overflow-hidden ${trackClass} ${className}`}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${fillClass}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
