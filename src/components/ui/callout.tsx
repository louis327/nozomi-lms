import { ReactNode } from 'react'

type CalloutStyle = {
  color: string
  bg: string
  border: string
  defaultLabel: string
  icon: ReactNode
}

const calloutConfig: Record<string, CalloutStyle> = {
  tip: {
    color: 'var(--nz-info)',
    bg: '#eff6ff',
    border: '#bfdbfe',
    defaultLabel: 'Tip',
    icon: (
      <svg className="w-[16px] h-[16px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.674M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  warning: {
    color: 'var(--nz-warning)',
    bg: '#fffbeb',
    border: '#fde68a',
    defaultLabel: 'Heads up',
    icon: (
      <svg className="w-[16px] h-[16px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
  },
  formula: {
    color: 'var(--nz-accent)',
    bg: '#fdf2f8',
    border: '#fbcfe8',
    defaultLabel: 'Formula',
    icon: (
      <svg className="w-[16px] h-[16px]" fill="currentColor" viewBox="0 0 24 24">
        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
      </svg>
    ),
  },
  'key-insight': {
    color: 'var(--nz-success)',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    defaultLabel: 'Key insight',
    icon: (
      <svg className="w-[16px] h-[16px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.674M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
}

type CalloutProps = {
  type: keyof typeof calloutConfig
  title?: string
  children: ReactNode
}

export function Callout({ type, title, children }: CalloutProps) {
  const config = calloutConfig[type] ?? calloutConfig.tip
  const label = title ?? config.defaultLabel

  return (
    <aside
      className="my-5 rounded-xl px-5 py-4 border"
      style={{
        background: config.bg,
        borderColor: config.border,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: config.color }} className="shrink-0">
          {config.icon}
        </span>
        <p
          className="text-[10.5px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: config.color }}
        >
          {label}
        </p>
      </div>
      <div className="text-[15px] leading-[1.65]" style={{ color: 'var(--nz-ink)' }}>
        {children}
      </div>
    </aside>
  )
}
