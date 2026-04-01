'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Upload } from 'lucide-react'
import { ImportCourseModal } from './import-course-modal'
import { useRouter } from 'next/navigation'

export function CoursesHeader() {
  const [showImport, setShowImport] = useState(false)
  const router = useRouter()

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-[22px] font-bold text-[#111] tracking-[-0.02em]">Courses</h1>
          <p className="text-[13px] text-[#888] mt-1">Manage your course catalog</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-heading font-semibold rounded-lg bg-white border border-[#e8e8e8] text-[#111] hover:border-[#ccc] hover:bg-[#fafafa] transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" strokeWidth={1.5} />
            Import
          </button>
          <Link
            href="/admin/courses/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-heading font-semibold rounded-lg bg-[#111] text-white hover:bg-[#333] transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} />
            Create Course
          </Link>
        </div>
      </div>

      {showImport && (
        <ImportCourseModal
          onClose={() => setShowImport(false)}
          onSuccess={() => router.refresh()}
        />
      )}
    </>
  )
}
