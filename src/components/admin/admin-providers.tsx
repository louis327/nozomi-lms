'use client'
import { ToastProvider } from '@/components/ui/toast'
export function AdminProviders({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}
