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
        <span className="text-[12px] text-[#ef4444]">Delete &quot;{courseTitle}&quot;?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="px-3 py-1.5 text-[12px] font-semibold rounded-lg bg-[#ef4444] text-white hover:bg-[#dc2626] transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Deleting...' : 'Confirm'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-1.5 text-[12px] font-semibold rounded-lg bg-white text-[#666] hover:text-[#111] border border-[#e8e8e8] transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="p-1.5 rounded-lg text-[#ccc] hover:text-[#ef4444] hover:bg-[#fef2f2] transition-colors cursor-pointer"
    >
      <Trash2 className="w-4 h-4" strokeWidth={1.5} />
    </button>
  )
}
