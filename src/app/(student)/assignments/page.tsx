import { ClipboardList } from 'lucide-react'
import { ComingSoon } from '@/components/ui/coming-soon'

export const metadata = { title: 'Assignments — Nozomi' }

export default function AssignmentsPage() {
  return (
    <ComingSoon
      eyebrow="Assignments"
      title="Your"
      titleAccent="assignments."
      description="Track deliverables, pitch decks, and review tasks across every module in one place."
      icon={<ClipboardList className="w-6 h-6" strokeWidth={1.5} />}
    />
  )
}
