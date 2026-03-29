'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export function EnrollButton({
  courseId,
  firstSectionId,
  isLoggedIn,
}: {
  courseId: string
  firstSectionId: string | null
  isLoggedIn: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (!isLoggedIn) {
    return (
      <Link
        href={`/signup?redirect=/courses/${courseId}`}
        className="inline-flex items-center px-7 py-3.5 font-heading font-semibold text-base bg-nz-sakura text-nz-bg-primary rounded-xl hover:bg-nz-sakura-deep transition-all duration-200 sakura-glow"
      >
        Enroll &amp; Start Learning
        <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </Link>
    )
  }

  const handleEnroll = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Enroll (upsert to avoid duplicate errors)
      await supabase
        .from('enrollments')
        .upsert({ user_id: user.id, course_id: courseId }, { onConflict: 'user_id,course_id' })

      // Navigate to first section or course learn page
      if (firstSectionId) {
        router.push(`/courses/${courseId}/learn/${firstSectionId}`)
      } else {
        router.push(`/courses/${courseId}/learn`)
      }
    } catch {
      // fallback
      router.push(`/courses/${courseId}/learn`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleEnroll}
      disabled={loading}
      className="inline-flex items-center px-7 py-3.5 font-heading font-semibold text-base bg-nz-sakura text-nz-bg-primary rounded-xl hover:bg-nz-sakura-deep transition-all duration-200 sakura-glow cursor-pointer disabled:opacity-50"
    >
      {loading ? 'Enrolling...' : 'Start Learning'}
      <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
    </button>
  )
}
