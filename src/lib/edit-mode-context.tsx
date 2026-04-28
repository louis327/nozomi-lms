'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'

export type GlobalSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type EditModeContextValue = {
  isAdmin: boolean
  editMode: boolean
  setEditMode: (val: boolean) => void
  activeBlockId: string | null
  setActiveBlockId: (id: string | null) => void
  dirtyBlocks: Set<string>
  markDirty: (blockId: string) => void
  markClean: (blockId: string) => void
  hasDirtyBlocks: boolean
  saveStatus: GlobalSaveStatus
  setSaveStatus: (s: GlobalSaveStatus) => void
}

const EditModeContext = createContext<EditModeContextValue>({
  isAdmin: false,
  editMode: false,
  setEditMode: () => {},
  activeBlockId: null,
  setActiveBlockId: () => {},
  dirtyBlocks: new Set(),
  markDirty: () => {},
  markClean: () => {},
  hasDirtyBlocks: false,
  saveStatus: 'idle',
  setSaveStatus: () => {},
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
  const [editMode, setEditModeState] = useState(defaultEditMode)
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [dirtyBlocks, setDirtyBlocks] = useState<Set<string>>(new Set())
  const [saveStatus, setSaveStatusState] = useState<GlobalSaveStatus>('idle')

  const setEditMode = useCallback((val: boolean) => {
    setEditModeState(val)
    if (!val) setActiveBlockId(null)
  }, [])

  const setSaveStatus = useCallback((s: GlobalSaveStatus) => {
    setSaveStatusState(s)
    if (s === 'saved') {
      setTimeout(() => {
        setSaveStatusState((curr) => (curr === 'saved' ? 'idle' : curr))
      }, 1500)
    }
  }, [])

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
        activeBlockId,
        setActiveBlockId,
        dirtyBlocks,
        markDirty,
        markClean,
        hasDirtyBlocks,
        saveStatus,
        setSaveStatus,
      }}
    >
      {children}
    </EditModeContext.Provider>
  )
}
