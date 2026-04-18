import { Calendar } from 'lucide-react'
import { ComingSoon } from '@/components/ui/coming-soon'

export const metadata = { title: 'Schedule — Nozomi' }

export default function SchedulePage() {
  return (
    <ComingSoon
      eyebrow="Schedule"
      title="Your"
      titleAccent="schedule."
      description="Live sessions, deadlines, and office hours — all on one clean calendar."
      icon={<Calendar className="w-6 h-6" strokeWidth={1.5} />}
    />
  )
}
