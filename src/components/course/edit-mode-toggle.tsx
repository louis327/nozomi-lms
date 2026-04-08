'use client'

import { useEditMode } from '@/lib/edit-mode-context'

export function EditModeToggle() {
  const { isAdmin, editMode, setEditMode, hasDirtyBlocks, dirtyBlocks } = useEditMode()

  if (!isAdmin) return null

  return (
    <button
      onClick={() => setEditMode(!editMode)}
      className={`
        fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl
        font-medium text-sm shadow-xl backdrop-blur-xl border transition-all cursor-pointer
        ${editMode
          ? 'bg-nz-sakura/20 border-nz-sakura/40 text-nz-sakura hover:bg-nz-sakura/30'
          : 'bg-nz-bg-elevated border-nz-border text-nz-text-secondary hover:text-nz-text-primary hover:border-nz-text-muted'
        }
      `}
    >
      {editMode ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      )}
      {editMode ? 'Preview' : 'Edit'}
      {hasDirtyBlocks && (
        <span className="ml-1 flex items-center justify-center w-5 h-5 rounded-full bg-nz-sakura text-white text-xs font-bold">
          {dirtyBlocks.size}
        </span>
      )}
    </button>
  )
}
