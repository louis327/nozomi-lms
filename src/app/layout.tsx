import type { Metadata } from 'next'
import { Open_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const openSans = Open_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-open-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Nozomi — Learn with intention',
    template: '%s | Nozomi',
  },
  description: 'A quiet, focused learning platform. Courses built for clarity and progress.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${openSans.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-canvas text-ink font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
