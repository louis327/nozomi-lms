import { Award } from 'lucide-react'
import { ComingSoon } from '@/components/ui/coming-soon'

export const metadata = { title: 'Achievements — Nozomi' }

export default function AchievementsPage() {
  return (
    <ComingSoon
      eyebrow="Achievements"
      title="Milestones"
      titleAccent="worth marking."
      description="Celebrate streaks, module completions, and the rare moments your answer lands on the first try."
      icon={<Award className="w-6 h-6" strokeWidth={1.5} />}
    />
  )
}
