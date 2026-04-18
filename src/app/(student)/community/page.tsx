import { Users } from 'lucide-react'
import { ComingSoon } from '@/components/ui/coming-soon'

export const metadata = { title: 'Community — Nozomi' }

export default function CommunityPage() {
  return (
    <ComingSoon
      eyebrow="Community"
      title="Meet the"
      titleAccent="cohort."
      description="Connect with other founders, share wins and setbacks, and get unstuck faster."
      icon={<Users className="w-6 h-6" strokeWidth={1.5} />}
    />
  )
}
