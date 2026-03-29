'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import { Trash2 } from 'lucide-react'

export function CourseDeleteButton({
  courseId,
  courseTitle,
}: {
  courseId: string
  courseTitle: string
}) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { addToast } = useToast()

  const handleDelete = async () => {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('courses').delete().eq('id', courseId)
    if (error) {
      addToast('Failed to delete course: ' + error.message, 'error')
      setLoading(false)
      return
    }
    addToast('Course deleted', 'success')
    router.refresh()
    setConfirming(false)
    setLoading(false)
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-nz-error">Delete &quot;{courseTitle}&quot;?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-nz-error/20 text-nz-error border border-nz-error/30 hover:bg-nz-error/30 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Deleting...' : 'Confirm'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-nz-bg-elevated text-nz-text-secondary hover:text-nz-text-primary border border-nz-border transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-nz-error/10 text-nz-error/70 hover:text-nz-error hover:bg-nz-error/20 border border-nz-error/20 transition-colors cursor-pointer"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  )
}
