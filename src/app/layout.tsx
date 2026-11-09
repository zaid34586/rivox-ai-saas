import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  title: 'AffiPilot — AI Affiliate Marketing Autopilot',
  description: 'Find winning products, create UGC ads with AI, auto-post to social media, and track commissions — all on autopilot.',
  keywords: ['affiliate marketing', 'AI marketing', 'autopilot', 'UGC ads', 'commission tracking'],
  authors: [{ name: 'AffiPilot' }],
  openGraph: {
    title: 'AffiPilot — AI Affiliate Marketing Autopilot',
    description: 'Find winning products, create UGC ads with AI, auto-post to social media, and track commissions — all on autopilot.',
    type: 'website',
    locale: 'en_US',
    siteName: 'AffiPilot',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AffiPilot — AI Affiliate Marketing Autopilot',
    description: 'Find winning products, create UGC ads with AI, auto-post to social media, and track commissions.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen bg-background font-sans">{children}</body>
    </html>
  )
}