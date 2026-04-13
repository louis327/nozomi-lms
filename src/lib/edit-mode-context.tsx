'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'

type EditModeContextValue = {
  isAdmin: boolean
  editMode: boolean
  setEditMode: (val: boolean) => void
  dirtyBlocks: Set<string>
  markDirty: (blockId: string) => void
  markClean: (blockId: string) => void
  hasDirtyBlocks: boolean
}

const EditModeContext = createContext<EditModeContextValue>({
  isAdmin: false,
  editMode: false,
  setEditMode: () => {},
  dirtyBlocks: new Set(),
  markDirty: () => {},
  markClean: () => {},
  hasDirtyBlocks: false,
})

export function useEditMode() {
  return useContext(EditModeContext)
}

export function EditModeProvider({
  isAdmin,
  defaultEditMode = false,
  children,
}: {
  isAdmin: boolean
  defaultEditMode?: boolean
  children: React.ReactNode
}) {
  const [editMode, setEditMode] = useState(defaultEditMode)
  const [dirtyBlocks, setDirtyBlocks] = useState<Set<string>>(new Set())

  const markDirty = useCallback((blockId: string) => {
    setDirtyBlocks((prev) => {
      const next = new Set(prev)
      next.add(blockId)
      return next
    })
  }, [])

  const markClean = useCallback((blockId: string) => {
    setDirtyBlocks((prev) => {
      const next = new Set(prev)
      next.delete(blockId)
      return next
    })
  }, [])

  const hasDirtyBlocks = dirtyBlocks.size > 0

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!hasDirtyBlocks) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasDirtyBlocks])

  return (
    <EditModeContext.Provider
      value={{
        isAdmin,
        editMode,
        setEditMode,
        dirtyBlocks,
        markDirty,
        markClean,
        hasDirtyBlocks,
      }}
    >
      {children}
    </EditModeContext.Provider>
  )
}
