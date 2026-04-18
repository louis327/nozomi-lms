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
        className="inline-flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-medium bg-ink text-white rounded-full hover:bg-black transition-colors"
      >
        Enroll &amp; start learning <span aria-hidden>→</span>
      </Link>
    )
  }

  const handleEnroll = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('enrollments')
        .upsert({ user_id: user.id, course_id: courseId }, { onConflict: 'user_id,course_id' })

      if (firstSectionId) {
        router.push(`/courses/${courseId}/learn/${firstSectionId}`)
      } else {
        router.push(`/courses/${courseId}/learn`)
      }
    } catch {
      router.push(`/courses/${courseId}/learn`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleEnroll}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-medium bg-ink text-white rounded-full hover:bg-black transition-colors cursor-pointer disabled:opacity-50"
    >
      {loading ? 'Enrolling…' : 'Start learning'} <span aria-hidden>→</span>
    </button>
  )
}
