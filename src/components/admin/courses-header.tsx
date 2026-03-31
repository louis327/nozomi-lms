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
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-heading text-2xl font-bold text-nz-text-primary">
          Courses
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-heading font-semibold rounded-xl bg-transparent border border-nz-border text-nz-text-primary hover:border-nz-border-hover hover:bg-nz-bg-elevated transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Import Course
          </button>
          <Link
            href="/admin/courses/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-heading font-semibold rounded-xl bg-nz-sakura text-nz-bg-primary hover:bg-nz-sakura-deep transition-colors sakura-glow"
          >
            <Plus className="w-4 h-4" />
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
