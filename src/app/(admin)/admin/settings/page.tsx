import { Settings } from 'lucide-react'

export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-nz-text-primary mb-8">
        Settings
      </h1>

      <div className="bg-nz-bg-card border border-nz-border rounded-2xl p-12 text-center">
        <Settings className="w-12 h-12 text-nz-text-muted mx-auto mb-4" />
        <p className="text-nz-text-tertiary text-sm">
          Platform settings coming soon.
        </p>
      </div>
    </div>
  )
}
