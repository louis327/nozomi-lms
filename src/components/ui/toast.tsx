'use client'
import { useState, createContext, useContext, useCallback } from 'react'

type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' }

const ToastContext = createContext<{
  addToast: (message: string, type?: Toast['type']) => void
}>({ addToast: () => {} })

export function useToast() { return useContext(ToastContext) }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-5 py-3 rounded-xl text-sm font-medium shadow-lg border animate-fade-in ${
              toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-nz-success' :
              toast.type === 'error' ? 'bg-red-50 border-red-200 text-nz-error' :
              'bg-nz-bg-card border-nz-border text-nz-text-primary shadow-md'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
