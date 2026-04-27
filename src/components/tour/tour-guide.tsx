'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Joyride, type EventData, type Options, type Step } from 'react-joyride'
import { TourContext } from '@/lib/tour-context'

type Group = {
  pathname: RegExp
  steps: Step[]
  nextHref?: string
}

const tourOptions: Partial<Options> = {
  primaryColor: '#ff5fa3',
  textColor: '#1a1a1a',
  backgroundColor: '#ffffff',
  arrowColor: '#ffffff',
  overlayColor: 'rgba(0, 0, 0, 0.45)',
  zIndex: 10000,
  showProgress: true,
  skipBeacon: true,
  buttons: ['back', 'skip', 'primary'],
}

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
          content: "Welcome aboard. This is your home base — pick up here every time you log in.",
          placement: 'bottom',
        },
        {
          target: '[data-tour="dashboard-courses"]',
          content: "Your courses live here. Click any tile to keep going from where you stopped.",
          placement: 'bottom',
        },
        {
          target: '[data-tour="dashboard-coach"]',
          content: "Stuck on something? Ask your AI coach — it knows your progress.",
          placement: 'top',
        },
      ],
      nextHref: '/courses',
    },
    {
      pathname: /^\/courses\/?$/,
      steps: [
        {
          target: '[data-tour="courses-grid"]',
          content: "All your enrolled courses. Let's open one.",
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
          content: "Modules expand here. Each section is a focused lesson — let's open the first one.",
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
          content: "The lesson content goes here. Highlight any text — your notes save automatically.",
          placement: 'auto',
        },
        {
          target: '[data-tour="section-highlights"]',
          content: "All your highlights live one click away.",
          placement: 'left',
        },
        {
          target: '[data-tour="section-footer"]',
          content: "When you're done, mark it complete and jump to the next section. That's it — you're set.",
          placement: 'top',
        },
      ],
    },
  ]
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
    const t = window.setTimeout(() => setRun(true), 800)
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
        <Joyride
          steps={steps}
          run={run}
          stepIndex={stepIndex}
          continuous
          options={tourOptions}
          locale={{
            back: 'Back',
            close: 'Close',
            last: isLastGroup ? 'Finish' : 'Next →',
            next: 'Next',
            skip: 'Skip tour',
          }}
          onEvent={handleEvent}
        />
      )}
    </TourContext.Provider>
  )
}
