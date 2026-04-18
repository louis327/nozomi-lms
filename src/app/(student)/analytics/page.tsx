import { BarChart3 } from 'lucide-react'
import { ComingSoon } from '@/components/ui/coming-soon'

export const metadata = { title: 'Analytics — Nozomi' }

export default function AnalyticsPage() {
  return (
    <ComingSoon
      eyebrow="Analytics"
      title="Your learning"
      titleAccent="rhythm."
      description="Deep-dive into focus hours, completion velocity, and where you lose momentum."
      icon={<BarChart3 className="w-6 h-6" strokeWidth={1.5} />}
    />
  )
}
