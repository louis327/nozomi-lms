'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useAutoSave(
  saveFn: () => Promise<void>,
  deps: unknown[],
  { delay = 2000, enabled = true }: { delay?: number; enabled?: boolean } = {}
) {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialRef = useRef(true)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const save = useCallback(async () => {
    if (!mountedRef.current) return
    setStatus('saving')
    try {
      await saveFn()
      if (mountedRef.current) {
        setStatus('saved')
        setTimeout(() => {
          if (mountedRef.current) setStatus('idle')
        }, 2000)
      }
    } catch {
      if (mountedRef.current) setStatus('error')
    }
  }, [saveFn])

  useEffect(() => {
    if (!enabled) return
    // Skip auto-save on initial load
    if (initialRef.current) {
      initialRef.current = false
      return
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setStatus('idle')

    timeoutRef.current = setTimeout(() => {
      save()
    }, delay)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { status, save }
}
