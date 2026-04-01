import type { Metadata } from 'next'
import { DM_Sans, Sora, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Nozomi Learn | Web3 Founder Education',
    template: '%s | Nozomi Learn',
  },
  description: 'Master Web3 fundraising with structured courses from battle-tested operators. Advisory. Capital. Network. Resources.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${sora.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-nz-bg-secondary text-nz-text-primary font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
