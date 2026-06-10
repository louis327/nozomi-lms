export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen flex-col bg-canvas">{children}</main>
}
