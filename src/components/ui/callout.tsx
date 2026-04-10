import { ReactNode } from 'react'

const calloutConfig = {
  tip: {
    accentColor: '#3b82f6',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.674M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  warning: {
    accentColor: '#d97706',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
  },
  formula: {
    accentColor: '#E8458B',
    // Pushpin / "rule" icon
    icon: (
      <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
      </svg>
    ),
  },
  'key-insight': {
    accentColor: '#10b981',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.674M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
} as const

type CalloutProps = {
  type: keyof typeof calloutConfig
  title?: string
  children: ReactNode
}

export function Callout({ type, title, children }: CalloutProps) {
  const config = calloutConfig[type]

  return (
    <div className="rounded-2xl bg-[#fafaf8] border border-[#ececec] px-6 py-5 my-6">
      {title && (
        <div className="flex items-center gap-2.5 mb-4">
          <span style={{ color: config.accentColor }} className="shrink-0">
            {config.icon}
          </span>
          <p className="font-heading font-semibold text-[15px] text-[#111] leading-tight">
            {title}
          </p>
        </div>
      )}
      <div className="text-[14px] text-[#3a3a3a] leading-[1.65]">
        {children}
      </div>
    </div>
  )
}
