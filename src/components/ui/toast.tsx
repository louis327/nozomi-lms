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
            className={`px-5 py-3 rounded-xl text-sm font-medium shadow-xl backdrop-blur-xl border animate-fade-in ${
              toast.type === 'success' ? 'bg-nz-success/10 border-nz-success/30 text-nz-success' :
              toast.type === 'error' ? 'bg-nz-error/10 border-nz-error/30 text-nz-error' :
              'bg-nz-bg-elevated border-nz-border text-nz-text-primary'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
