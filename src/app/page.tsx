'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Zap,
  ShoppingBag,
  Video,
  BarChart3,
  Shield,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Target,
  Smartphone,
  Globe,
  Users,
  Lock,
  TrendingUp,
} from 'lucide-react'

const features = [
  {
    icon: ShoppingBag,
    title: 'Smart Product Finder',
    desc: 'AI scans Amazon, Flipkart, ClickBank + more to find high-commission, low-competition products with real demand.',
  },
  {
    icon: Video,
    title: 'UGC Ad Studio',
    desc: 'Generate 10+ ad variants per product — hooks, scripts, images, videos with voiceovers. All optimized for Reels/Shorts/Pins.',
  },
  {
    icon: Smartphone,
    title: 'Auto-Post to Social',
    desc: 'Schedule and auto-publish to Instagram, YouTube Shorts, Pinterest, X. Best-time AI, warmup limits, compliance built-in.',
  },
  {
    icon: BarChart3,
    title: 'Real Commission Tracking',
    desc: 'Short links with sub-IDs, click tracking, conversion attribution, EPC calculations, payout forecasts — live dashboard.',
  },
  {
    icon: Zap,
    title: 'AI Optimizer',
    desc: 'Auto-pause losers (100 clicks, 0 sales), scale winners with lookalike variants, daily mission briefings, trend jump alerts.',
  },
  {
    icon: Shield,
    title: 'Ban-Proof Autopilot',
    desc: 'Official APIs only, gradual warmup, duplicate detection, account health monitoring, approval gates — sleep peacefully.',
  },
]

const steps = [
  { num: '01', title: 'Connect & Import', desc: 'Link affiliate accounts, import products via CSV or API' },
  { num: '02', title: 'AI Creates Ads', desc: 'Hooks, scripts, images, videos — 10 variants per product' },
  { num: '03', title: 'Approve & Schedule', desc: 'One-click approve, set calendar, best-time AI picks slots' },
  { num: '04', title: 'Autopilot Runs', desc: 'Posts go live, links track clicks, commissions roll in' },
  { num: '05', title: 'Optimize & Scale', desc: 'AI kills losers, scales winners, you watch revenue grow' },
]

const stats = [
  { value: '10x', label: 'Faster ad creation' },
  { value: '50+', label: 'Hook templates' },
  { value: '6', label: 'Social platforms' },
  { value: '24/7', label: 'Autopilot running' },
]

const networks = ['Amazon Associates', 'Flipkart', 'ClickBank', 'ShareASale', 'CJ Affiliate', 'Impact']

export default function Home() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleWaitlistSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) throw new Error(data?.error || 'Could not join the waitlist right now. Please try again.')
      setStatus('success')
      setMessage("You're on the list — we'll email you when your seat opens.")
      setEmail('')
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Could not join the waitlist right now. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Announcement Bar */}
      <div className="border-b border-primary/25 bg-primary/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-2 text-center text-sm">
          <span className="font-medium text-foreground">Early access is open</span>
          <span className="hidden text-muted-foreground sm:inline">— founding-member seats at locked-in pricing.</span>
          <a href="#waitlist" className="font-medium text-gold underline-offset-4 hover:underline">Request access</a>
        </div>
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-5 w-5 text-gold" aria-hidden="true" />
            </span>
            <span className="text-xl font-bold tracking-tight">AffiPilot</span>
          </Link>

          <div className="hidden md:flex md:items-center md:gap-6">
            <a href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">How It Works</a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Pricing</a>
            <a href="#waitlist" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Early Access</a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/auth/login" className="text-sm font-medium transition-colors hover:text-primary">Sign in</Link>
            <Button size="sm" asChild>
              <Link href="/auth/signup">Get started</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          {/* Ambient glows + faint grid (CSS-only) */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute -top-56 left-1/2 h-[520px] w-[860px] max-w-none -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
            <div className="absolute top-1/3 -right-40 h-[420px] w-[420px] rounded-full bg-gold/10 blur-[110px]" />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'linear-gradient(to right, hsl(var(--border) / 0.5) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.5) 1px, transparent 1px)',
                backgroundSize: '56px 56px',
                maskImage: 'radial-gradient(ellipse 70% 55% at 50% 0%, black 20%, transparent 75%)',
                WebkitMaskImage: 'radial-gradient(ellipse 70% 55% at 50% 0%, black 20%, transparent 75%)',
              }}
            />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="eyebrow mb-6 flex items-center justify-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                </span>
                AI Affiliate Autopilot — Now in Early Access
              </p>

              <h1 className="mb-6 text-4xl font-bold tracking-[-0.03em] text-foreground sm:text-5xl lg:text-6xl">
                Affiliate marketing on{' '}
                <span className="relative whitespace-nowrap text-gradient-accent">
                  Autopilot
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-gradient-to-r from-gold via-gold to-gold/30"
                  />
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                Find winning products, generate UGC ads with AI, auto-post to 6 platforms, track every commission —
                all while you sleep. A set-and-forget affiliate workflow.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button size="lg" className="w-full sm:w-auto" asChild>
                  <Link href="/auth/signup">Start free — no credit card</Link>
                </Button>
                <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild>
                  <a href="#how-it-works">See how it works</a>
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-primary" aria-hidden="true" /> No card required</span>
                <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-primary" aria-hidden="true" /> 14-day free trial</span>
                <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-primary" aria-hidden="true" /> Cancel anytime</span>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative mt-16">
              <div className="overflow-hidden rounded-xl border border-border/50 bg-card/60 shadow-2xl">
                <div className="flex items-center gap-2 border-b border-border/50 bg-muted/50 px-4 py-3">
                  <span className="flex gap-1.5" aria-hidden="true">
                    <span className="h-3 w-3 rounded-full bg-red-500/80" />
                    <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
                    <span className="h-3 w-3 rounded-full bg-green-500/80" />
                  </span>
                  <div className="ml-4 flex-1 text-center font-mono text-xs text-muted-foreground">
                    app.affipilot.com/dashboard
                  </div>
                </div>
                <div className="space-y-4 p-4 sm:p-6">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                    {stats.map((stat) => (
                      <div key={stat.label} className="rounded-lg bg-muted/50 p-3 text-center sm:p-4">
                        <div className="num text-2xl font-bold text-primary sm:text-3xl">{stat.value}</div>
                        <div className="text-xs text-muted-foreground">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Today&apos;s Commissions</span>
                      <span className="num font-bold text-foreground">₹12,450</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-gradient-to-r from-gold to-gold/70" style={{ width: '73%' }} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                      {['Clicks: 1,234', 'Sales: 47', 'EPC: ₹10.1', 'CTR: 3.2%'].map((item) => (
                        <div key={item} className="rounded bg-muted/50 p-2 text-center">{item}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Affiliate networks — in-flow strip, wraps on mobile */}
            <div className="mt-14 flex flex-col items-center gap-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Works with the networks you already use
              </p>
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                {networks.map((network) => (
                  <span
                    key={network}
                    className="rounded-lg border border-border/60 bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground sm:px-4 sm:text-sm"
                  >
                    {network}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features — bento */}
        <section id="features" className="scroll-mt-24 border-t border-border/50 py-20 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-16 max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything between product and profit</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Six powerful modules, one seamless workflow. No more juggling 10 tools.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, i) => (
                <Card
                  key={feature.title}
                  className={`group border-border/60 bg-card/40 transition-colors duration-300 hover:border-primary/40 hover:bg-card/70 ${
                    i === 0 || i === 3 ? 'md:col-span-2' : ''
                  }`}
                >
                  <CardHeader className={i === 0 || i === 3 ? 'sm:flex-row sm:items-start sm:gap-5 sm:space-y-0' : ''}>
                    <span className="mb-4 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary sm:mb-0">
                      <feature.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                      <p className="text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
                    </div>
                  </CardHeader>
                </Card>
              ))}

              {/* Bento end-cap: signup */}
              <Card className="flex flex-col items-start justify-center border-primary/40 bg-primary/10 p-6 md:col-span-2 lg:col-span-1">
                <CardContent className="w-full space-y-4 p-0">
                  <p className="text-sm text-muted-foreground">
                    Set up your first autopilot in under 10 minutes.
                  </p>
                  <Button className="w-full" asChild>
                    <Link href="/auth/signup">
                      Start free
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works — centered timeline */}
        <section id="how-it-works" className="scroll-mt-24 border-t border-border/50 py-20 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-16 max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">From zero to autopilot in 5 steps</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Set up once, let AI handle the daily grind. You approve, it executes.
              </p>
            </div>

            <div className="relative mx-auto max-w-4xl">
              {/* Mobile: line on the left. Desktop: line down the center. */}
              <div aria-hidden="true" className="absolute bottom-0 left-4 top-0 w-px bg-gradient-to-b from-transparent via-border to-transparent lg:left-1/2 lg:-translate-x-1/2" />

              <ol className="space-y-10 lg:space-y-12">
                {steps.map((step, index) => (
                  <li key={step.num} className="relative pl-12 lg:grid lg:grid-cols-2 lg:gap-14 lg:pl-0">
                    <span className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-primary text-xs font-bold text-primary-foreground lg:left-1/2 lg:-translate-x-1/2">
                      {step.num}
                    </span>
                    <div className={index % 2 === 0 ? 'lg:pr-4 lg:text-right' : 'lg:col-start-2 lg:pl-4'}>
                      <h3 className="text-lg font-semibold">{step.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:text-base">{step.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Platform Integrations */}
        <section className="border-t border-border/50 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-16 max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Publish everywhere your audience lives</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Official API integrations. No gray methods, no banned accounts.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              {[
                { icon: Globe, name: 'Pinterest', formats: ['Pins', 'Video Pins'], color: '#E60023' },
                { icon: Video, name: 'YouTube Shorts', formats: ['Shorts', 'Community'], color: '#FF0000' },
                { icon: Smartphone, name: 'Instagram', formats: ['Reels', 'Stories', 'Posts'], color: '#C13584' },
                { icon: Target, name: 'X (Twitter)', formats: ['Posts', 'Threads'], color: '#0F1419' },
                { icon: Users, name: 'Facebook', formats: ['Posts', 'Reels', 'Groups'], color: '#1877F2' },
                { icon: TrendingUp, name: 'TikTok', formats: ['Videos', 'Stories'], color: '#111111' },
              ].map((platform) => (
                <Card key={platform.name} className="border-border/60 bg-card/40 p-5 text-center transition-colors duration-300 hover:border-border-hover sm:p-6">
                  <span
                    className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl text-white sm:h-14 sm:w-14"
                    style={{ background: platform.color }}
                    aria-hidden="true"
                  >
                    <platform.icon className="h-6 w-6 sm:h-7 sm:w-7" />
                  </span>
                  <h3 className="font-semibold">{platform.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{platform.formats.join(' · ')}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-24 border-t border-border/50 py-20 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-16 max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Simple, transparent pricing</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Start free. Upgrade when you&apos;re ready to scale. No hidden fees.
              </p>
            </div>

            <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
              {[
                {
                  name: 'Free',
                  price: '₹0',
                  period: '/month',
                  description: 'Perfect for testing the waters',
                  features: ['5 products', '20 AI ads/month', '1 social account', 'Basic analytics', 'Manual posting'],
                  cta: 'Start free',
                  popular: false,
                },
                {
                  name: 'Pro',
                  price: '₹1,999',
                  period: '/month',
                  description: 'For serious affiliates scaling up',
                  features: ['Unlimited products', '500 AI ads/month', '3 social accounts', 'Auto-post + scheduler', 'AI optimizer', 'Email/Telegram alerts', 'Priority support'],
                  cta: 'Start free trial',
                  popular: true,
                },
                {
                  name: 'Agency',
                  price: '₹4,999',
                  period: '/month',
                  description: 'For teams managing multiple clients',
                  features: ['Everything in Pro', '10 social accounts', 'Team collaboration', 'Client dashboards', 'White-label reports', 'API access', 'Custom integrations', 'Dedicated support'],
                  cta: 'Contact sales',
                  popular: false,
                },
              ].map((plan) => (
                <Card
                  key={plan.name}
                  className={`relative flex flex-col ${
                    plan.popular
                      ? 'border-gold/60 shadow-gold lg:-translate-y-2'
                      : 'border-border/60'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-gold to-[#D9A335] px-3 py-1 text-xs font-semibold tracking-wide text-[#1A1206] shadow-md">
                      Most Popular
                    </div>
                  )}
                  <CardHeader className="flex-1">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="num text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-1">
                    <ul className="mb-6 flex-1 space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button className="w-full" variant={plan.popular ? 'default' : 'outline'} asChild>
                      <Link href="/auth/signup">{plan.cta}</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Waitlist / CTA */}
        <section id="waitlist" className="scroll-mt-24 border-t border-border/50 py-20 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-border/50 bg-gradient-to-br from-primary/10 via-background to-gold/15 p-8 shadow-lift md:p-16">
              <div className="mx-auto max-w-2xl text-center">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Early Access Program
                </div>
                <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
                  Be one of the first on the autopilot
                </h2>
                <p className="mb-8 text-lg text-muted-foreground">
                  Join the early-access list and lock in founding-member pricing before public launch.
                </p>

                <form className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row" onSubmit={handleWaitlistSubmit}>
                  <label htmlFor="waitlist-email" className="sr-only">Email address</label>
                  <input
                    id="waitlist-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="your@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={status === 'loading'}
                    className="input min-w-0 flex-1"
                  />
                  <Button type="submit" size="lg" loading={status === 'loading'} disabled={status === 'loading'}>
                    {status === 'loading' ? 'Joining…' : 'Join waitlist'}
                  </Button>
                </form>

                <p className="mt-4 text-sm text-muted-foreground" role="status" aria-live="polite">
                  {status === 'success' && <span className="font-medium text-success">{message}</span>}
                  {status === 'error' && <span className="font-medium text-error">{message}</span>}
                  {(status === 'idle' || status === 'loading') && 'No spam. Unsubscribe anytime. Privacy-first.'}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 grid grid-cols-2 gap-8 md:grid-cols-3">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                  <Zap className="h-5 w-5 text-gold" aria-hidden="true" />
                </span>
                <span className="text-xl font-bold">AffiPilot</span>
              </div>
              <p className="max-w-xs text-sm text-muted-foreground">
                AI autopilot for affiliate marketing. Find, create, post, track, optimize — automatically.
              </p>
            </div>
            <div>
              <h4 className="mb-3 font-semibold">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="transition-colors hover:text-foreground">Features</a></li>
                <li><a href="#how-it-works" className="transition-colors hover:text-foreground">How it works</a></li>
                <li><a href="#pricing" className="transition-colors hover:text-foreground">Pricing</a></li>
                <li><a href="#waitlist" className="transition-colors hover:text-foreground">Early access</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 font-semibold">Account</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/auth/login" className="transition-colors hover:text-foreground">Sign in</Link></li>
                <li><Link href="/auth/signup" className="transition-colors hover:text-foreground">Create account</Link></li>
                <li><Link href="/dashboard" className="transition-colors hover:text-foreground">Dashboard</Link></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-8 sm:flex-row">
            <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} AffiPilot. All rights reserved.</p>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" aria-hidden="true" />
              Your data stays yours.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
