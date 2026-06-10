'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Joyride, type EventData, type Options, type Step, type TooltipRenderProps } from 'react-joyride'
import { ArrowRight, ArrowLeft, X } from 'lucide-react'
import { TourContext } from '@/lib/tour-context'

type Group = {
  pathname: RegExp
  steps: Step[]
  nextHref?: string
}

// Brand-aligned options. We render our own tooltip, so these mainly drive
// the overlay + spotlight (the focus ring around the highlighted element).
const tourOptions: Partial<Options> = {
  primaryColor: '#e91e63',
  textColor: '#16181d',
  backgroundColor: '#ffffff',
  overlayColor: 'rgba(13, 13, 14, 0.55)',
  spotlightPadding: 6,
  spotlightRadius: 14,
  zIndex: 10000,
  // Wait for the target to mount after a route change instead of bailing -
  // this is what kills the cross-page jank.
  targetWaitTimeout: 5000,
}

// Global step numbering across the whole multi-page tour (e.g. "3 of 7").
const StepMetaContext = createContext<{ offset: number; total: number }>({ offset: 0, total: 0 })

function buildGroups(opts: {
  firstCourseHref: string | null
  firstSectionHref: string | null
}): Group[] {
  return [
    {
      pathname: /^\/dashboard\/?$/,
      steps: [
        {
          target: '[data-tour="dashboard-greeting"]',
          title: 'Welcome to Nozomi',
          content:
            'This is your home base. Everything you need to run your raise starts here, and you land back here every time you log in.',
          placement: 'bottom',
        },
        {
          target: '[data-tour="dashboard-courses"]',
          title: 'Your progress, at a glance',
          content:
            'Track where you are in each course and jump straight back into your next lesson.',
          placement: 'bottom',
        },
      ],
      nextHref: '/courses',
    },
    {
      pathname: /^\/courses\/?$/,
      steps: [
        {
          target: '[data-tour="courses-grid"]',
          title: 'Your library',
          content: 'Every course you’re enrolled in lives here. Let’s open one.',
          placement: 'top',
        },
      ],
      nextHref: opts.firstCourseHref ?? '/dashboard',
    },
    {
      pathname: /^\/courses\/[^/]+\/?$/,
      steps: [
        {
          target: '[data-tour="course-modules"]',
          title: 'The course outline',
          content:
            'Each module breaks down into focused lessons. We’ll open the first one for you.',
          placement: 'top',
        },
      ],
      nextHref: opts.firstSectionHref ?? '/dashboard',
    },
    {
      pathname: /^\/courses\/[^/]+\/learn\/[^/]+\/?$/,
      steps: [
        {
          target: '[data-tour="section-content"]',
          title: 'Your lesson',
          content:
            'Lessons read top to bottom. Select any passage to save a highlight, it’s stored automatically.',
          placement: 'auto',
        },
        {
          target: '[data-tour="section-highlights"]',
          title: 'Highlights & notes',
          content: 'Everything you save stays one click away, whenever you need it.',
          placement: 'left',
        },
        {
          target: '[data-tour="section-footer"]',
          title: 'Complete & continue',
          content:
            'Mark a lesson done to lock in your progress and move to the next. That’s everything, you’re ready to go.',
          placement: 'top',
        },
      ],
    },
  ]
}

// Polished, brand-aligned tooltip card.
function TourCard({
  index,
  size,
  isLastStep,
  step,
  backProps,
  primaryProps,
  skipProps,
  closeProps,
  tooltipProps,
}: TooltipRenderProps) {
  const { offset, total } = useContext(StepMetaContext)
  const current = offset + index + 1
  const isFinal = current >= total
  const showBack = index > 0

  return (
    <div
      {...tooltipProps}
      className="w-[340px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[16px] border border-line bg-surface shadow-[0_24px_60px_-16px_rgba(16,24,40,0.32)]"
      style={{ fontFamily: 'var(--font-sans)' }}
    >
      <div className="px-[22px] pb-5 pt-[18px]">
        {/* Top row: step counter + close */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent tabular-nums">
            Step {current} of {total}
          </span>
          <button
            {...closeProps}
            className="-mr-1.5 -mt-1 flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        {/* Title */}
        {step.title && (
          <h3 className="mb-1.5 text-[17px] font-bold leading-tight tracking-[-0.02em] text-ink">
            {step.title}
          </h3>
        )}

        {/* Body */}
        <div className="text-[13.5px] leading-[1.6] text-ink-soft">{step.content}</div>

        {/* Progress dots */}
        <div className="mt-4 flex items-center gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current - 1
                  ? 'w-5 bg-accent'
                  : i < current - 1
                    ? 'w-1.5 bg-accent/45'
                    : 'w-1.5 bg-line-strong'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-line bg-surface-muted/40 px-[22px] py-3.5">
        <button
          {...skipProps}
          className="text-[12.5px] font-semibold text-ink-muted transition-colors hover:text-ink"
        >
          Skip tour
        </button>
        <div className="flex items-center gap-2">
          {showBack && (
            <button
              {...backProps}
              className="inline-flex items-center gap-1 rounded-[9px] border border-line-strong px-3 py-2 text-[12.5px] font-semibold text-ink transition-colors hover:bg-surface"
            >
              <ArrowLeft size={13} strokeWidth={2.2} /> Back
            </button>
          )}
          <button
            {...primaryProps}
            className="inline-flex items-center gap-1.5 rounded-[9px] bg-ink px-4 py-2 text-[12.5px] font-semibold text-white transition-[filter] hover:brightness-110"
          >
            {isFinal ? 'Finish' : isLastStep ? 'Continue' : 'Next'}
            {!isFinal && <ArrowRight size={13} strokeWidth={2.3} />}
          </button>
        </div>
      </div>
    </div>
  )
}

type Props = {
  initialCompleted: boolean
  firstCourseHref: string | null
  firstSectionHref: string | null
  children: React.ReactNode
}

export function TourGuide({
  initialCompleted,
  firstCourseHref,
  firstSectionHref,
  children,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [completed, setCompleted] = useState(initialCompleted)
  const [run, setRun] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [forceShow, setForceShow] = useState(false)
  const advanceLockRef = useRef(false)

  const groups = useMemo(
    () => buildGroups({ firstCourseHref, firstSectionHref }),
    [firstCourseHref, firstSectionHref],
  )

  const currentGroup = useMemo(
    () => groups.find((g) => g.pathname.test(pathname || '')) ?? null,
    [groups, pathname],
  )

  const isLastGroup = currentGroup
    ? groups.indexOf(currentGroup) === groups.length - 1
    : false

  // Global numbering: how many steps come before this page's group, and the total.
  const totalSteps = useMemo(() => groups.reduce((n, g) => n + g.steps.length, 0), [groups])
  const groupOffset = useMemo(() => {
    if (!currentGroup) return 0
    const idx = groups.indexOf(currentGroup)
    return groups.slice(0, idx).reduce((n, g) => n + g.steps.length, 0)
  }, [groups, currentGroup])

  useEffect(() => {
    if (completed && !forceShow) {
      setRun(false)
      return
    }
    if (!currentGroup) {
      setRun(false)
      return
    }
    setStepIndex(0)
    // Short, smooth lead-in; targetWaitTimeout covers any late-mounting target.
    const t = window.setTimeout(() => setRun(true), 350)
    return () => window.clearTimeout(t)
  }, [pathname, completed, forceShow, currentGroup])

  const restart = async () => {
    try {
      await fetch('/api/tour', { method: 'DELETE' })
    } catch { /* best effort */ }
    setCompleted(false)
    setForceShow(true)
    setStepIndex(0)
    if (pathname !== '/dashboard') router.push('/dashboard')
    else setRun(true)
  }

  const markComplete = async () => {
    setCompleted(true)
    setForceShow(false)
    setRun(false)
    try {
      await fetch('/api/tour', { method: 'POST' })
    } catch { /* best effort */ }
  }

  const handleEvent = (data: EventData) => {
    const { status, type, index, action } = data

    if (status === 'finished' || status === 'skipped' || action === 'close' || action === 'skip') {
      if (action === 'close' || action === 'skip' || status === 'skipped') {
        markComplete()
        return
      }
      if (advanceLockRef.current) return
      advanceLockRef.current = true
      window.setTimeout(() => { advanceLockRef.current = false }, 800)

      setRun(false)
      if (isLastGroup) {
        markComplete()
      } else if (currentGroup?.nextHref) {
        router.push(currentGroup.nextHref)
      } else {
        markComplete()
      }
      return
    }

    if (type === 'step:after' && action === 'next') {
      setStepIndex(index + 1)
    } else if (type === 'step:after' && action === 'prev') {
      setStepIndex(Math.max(0, index - 1))
    }
  }

  const steps = currentGroup?.steps ?? []

  return (
    <TourContext.Provider value={{ restart, completed }}>
      {children}
      {steps.length > 0 && run && (
        <StepMetaContext.Provider value={{ offset: groupOffset, total: totalSteps }}>
          <Joyride
            steps={steps}
            run={run}
            stepIndex={stepIndex}
            continuous
            options={tourOptions}
            tooltipComponent={TourCard}
            locale={{
              back: 'Back',
              close: 'Close',
              last: isLastGroup ? 'Finish' : 'Continue',
              next: 'Next',
              skip: 'Skip tour',
            }}
            onEvent={handleEvent}
          />
        </StepMetaContext.Provider>
      )}
    </TourContext.Provider>
  )
}
