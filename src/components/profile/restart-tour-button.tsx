'use client'

import { Compass, ArrowRight } from 'lucide-react'
import { useTour } from '@/lib/tour-context'

export function RestartTourButton() {
  const { restart } = useTour()
  return (
    <button
      type="button"
      onClick={restart}
      className="group w-full flex items-center gap-4 text-left cursor-pointer"
    >
      <div className="w-11 h-11 rounded-xl bg-accent-soft flex items-center justify-center shrink-0">
        <Compass className="w-5 h-5 text-accent-deep" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-serif text-[16px] text-ink leading-tight group-hover:text-accent transition-colors">
          Replay the welcome tour
        </p>
        <p className="text-[12.5px] text-ink-soft mt-0.5">
          A quick walkthrough of the dashboard, courses, and lesson view.
        </p>
      </div>
      <ArrowRight className="w-4 h-4 text-ink-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all" strokeWidth={1.5} />
    </button>
  )
}
