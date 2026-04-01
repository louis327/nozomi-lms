import { ReactNode } from 'react'

const calloutConfig = {
  tip: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconColor: 'text-nz-info',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.674M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconColor: 'text-nz-warning',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
  },
  formula: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    iconColor: 'text-nz-sakura',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  'key-insight': {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    iconColor: 'text-nz-success',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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
    <div className={`rounded-xl ${config.bg} border ${config.border} p-5 my-4`}>
      <div className="flex gap-3">
        <div className={`shrink-0 mt-0.5 ${config.iconColor}`}>
          {config.icon}
        </div>
        <div className="min-w-0">
          {title && (
            <p className={`font-heading font-semibold text-sm mb-1 ${config.iconColor}`}>
              {title}
            </p>
          )}
          <div className="text-sm text-nz-text-secondary leading-relaxed">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
