import { FileBadge } from 'lucide-react'
import { ComingSoon } from '@/components/ui/coming-soon'

export const metadata = { title: 'Certificates — Nozomi' }

export default function CertificatesPage() {
  return (
    <ComingSoon
      eyebrow="Certificates"
      title="Proof of"
      titleAccent="completion."
      description="On-chain attestations for each course you complete — share them with investors and employers."
      icon={<FileBadge className="w-6 h-6" strokeWidth={1.5} />}
    />
  )
}
