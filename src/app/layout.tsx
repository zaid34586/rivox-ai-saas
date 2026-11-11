import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, Geist_Mono } from 'next/font/google'
import { QueryProvider } from '@/lib/query-client'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  weight: ['400', '500', '600', '700'],
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  title: 'NexaFlow — Automate the repeat. Ship the new.',
  description: 'AI workflow builder for creators — connect apps, generate content, publish across platforms from one canvas.',
  keywords: ['AI workflow', 'automation', 'creator tools', 'content generation', 'NexaFlow'],
  authors: [{ name: 'NexaFlow' }],
  openGraph: {
    title: 'NexaFlow — Automate the repeat. Ship the new.',
    description: 'AI workflow builder for creators — connect apps, generate content, publish across platforms from one canvas.',
    type: 'website',
    locale: 'en_US',
    siteName: 'NexaFlow',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NexaFlow — Automate the repeat. Ship the new.',
    description: 'AI workflow builder for creators — connect apps, generate content, publish across platforms from one canvas.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0c' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen bg-background font-sans">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}