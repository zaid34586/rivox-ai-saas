'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Zap,
  ShoppingBag,
  Video,
  BarChart3,
  Clock,
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
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    icon: Video,
    title: 'UGC Ad Studio',
    desc: 'Generate 10+ ad variants per product — hooks, scripts, images, videos with voiceovers. All optimized for Reels/Shorts/Pins.',
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    icon: Smartphone,
    title: 'Auto-Post to Social',
    desc: 'Schedule and auto-publish to Instagram, YouTube Shorts, Pinterest, X. Best-time AI, warmup limits, compliance built-in.',
    gradient: 'from-blue-500 to-cyan-600',
  },
  {
    icon: BarChart3,
    title: 'Real Commission Tracking',
    desc: 'Short links with sub-IDs, click tracking, conversion attribution, EPC calculations, payout forecasts — live dashboard.',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    icon: Zap,
    title: 'AI Optimizer',
    desc: 'Auto-pause losers (100 clicks, 0 sales), scale winners with lookalike variants, daily mission briefings, trend jump alerts.',
    gradient: 'from-rose-500 to-pink-600',
  },
  {
    icon: Shield,
    title: 'Ban-Proof Autopilot',
    desc: 'Official APIs only, gradual warmup, duplicate detection, account health monitoring, approval gates — sleep peacefully.',
    gradient: 'from-indigo-500 to-blue-600',
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
  { value: '99%', label: 'Uptime SLA' },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Announcement Bar */}
      <div className="bg-primary/10 border-b border-primary/20 text-center text-sm py-2 px-4 text-primary-foreground">
        <span className="font-medium">🚀 Early Access Open</span> — Join 500+ affiliates automating their business.{' '}
        <a href="#waitlist" className="underline hover:no-underline">Get Access →</a>
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="mx-auto max-w-7xl flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">AffiPilot</span>
          </div>

          <div className="hidden md:flex md:items-center md:gap-6">
            <a href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">How It Works</a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Pricing</a>
            <a href="#waitlist" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Early Access</a>
          </div>

          <div className="hidden md:flex md:items-center md:gap-3">
            <a href="/auth/login" className="text-sm font-medium transition-colors hover:text-primary">Sign In</a>
            <Button asChild size="sm">
              <a href="/auth/signup">Get Started Free</a>
            </Button>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 sm:py-32 lg:pb-32 xl:pb-36">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-6">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                </span>
                AI Affiliate Autopilot — Now in Early Access
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6">
                Affiliate Marketing on{' '}
                <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500 bg-clip-text text-transparent">
                  Autopilot
                </span>
              </h1>

              <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Find winning products, generate UGC ads with AI, auto-post to 6 platforms, track every commission —
                all while you sleep. The first true set-and-forget affiliate system.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="w-full sm:w-auto gap-2" asChild>
                  <a href="/auth/signup">Start Free — No Credit Card</a>
                </Button>
                <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild>
                  <a href="#how-it-works">See How It Works</a>
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-emerald-500" /> No card required</span>
                <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-emerald-500" /> 14-day free trial</span>
                <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-emerald-500" /> Cancel anytime</span>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="mt-16 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 h-32 bottom-0 top-auto" />
              <div className="rounded-xl border border-border/50 bg-card/50 shadow-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/50">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                  </div>
                  <div className="ml-4 flex-1 text-center text-xs text-muted-foreground font-mono">
                    affidashboard.vercel.app/dashboard
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    {stats.map((stat) => (
                      <div key={stat.label} className="text-center p-4 rounded-lg bg-muted/50">
                        <div className="text-3xl font-bold text-primary">{stat.value}</div>
                        <div className="text-xs text-muted-foreground">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Today&apos;s Commissions</span>
                      <span className="font-bold text-foreground">₹12,450</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: '73%' }} />
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      {['Clicks: 1,234', 'Sales: 47', 'EPC: ₹10.1', 'CTR: 3.2%'].map((item, i) => (
                        <div key={i} className="text-center p-2 rounded bg-muted/50">{item}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Trust Badges */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 flex items-center gap-8 px-4">
            {['Amazon Associates', 'Flipkart', 'ClickBank', 'ShareASale', 'CJ Affiliate', 'Impact'].map((network) => (
              <div key={network} className="px-4 py-2 rounded-lg bg-background/80 border border-border/50 backdrop-blur text-sm font-medium text-muted-foreground whitespace-nowrap shadow-lg">
                {network}
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20 sm:py-24 lg:py-28 border-t border-border/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Everything between product and profit</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Six powerful modules, one seamless workflow. No more juggling 10 tools.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <Card key={feature.title} className="group hover:shadow-xl transition-all duration-300 border-border/50">
                  <CardHeader>
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white"
                      style={{ background: `linear-gradient(135deg, ${feature.gradient.split(' ')[0]}, ${feature.gradient.split(' ')[2]})` }}
                    >
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20 sm:py-24 lg:py-28 border-t border-border/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">From zero to autopilot in 5 steps</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Set up once, let AI handle the daily grind. You approve, it executes.
              </p>
            </div>

            <div className="relative">
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 via-transparent to-primary/50 -translate-x-1/2 hidden lg:block" />

              <div className="space-y-8">
                {steps.map((step, index) => (
                  <div key={step.num} className="relative flex gap-6 lg:gap-8">
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white font-bold text-lg z-10">
                      {step.num}
                    </div>
                    <div className="flex-1 pt-2">
                      <h3 className="text-xl font-semibold">{step.title}</h3>
                      <p className="mt-1 text-muted-foreground">{step.desc}</p>
                    </div>
                    {index < steps.length - 1 && (
                      <div className="hidden lg:block absolute left-1/2 top-12 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-primary/20 to-transparent -translate-x-1/2" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Platform Integrations */}
        <section className="py-20 sm:py-24 border-t border-border/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Publish everywhere your audience lives</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Official API integrations. No gray methods, no banned accounts.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { icon: Globe, name: 'Pinterest', formats: ['Pins', 'Video Pins'], color: 'from-red-500 to-rose-500' },
                { icon: Video, name: 'YouTube Shorts', formats: ['Shorts', 'Community'], color: 'from-red-600 to-red-500' },
                { icon: Smartphone, name: 'Instagram', formats: ['Reels', 'Stories', 'Posts'], color: 'from-purple-500 via-pink-500 to-orange-500' },
                { icon: Target, name: 'X (Twitter)', formats: ['Posts', 'Threads'], color: 'from-sky-500 to-blue-500' },
                { icon: Users, name: 'Facebook', formats: ['Posts', 'Reels', 'Groups'], color: 'from-blue-600 to-blue-500' },
                { icon: TrendingUp, name: 'TikTok', formats: ['Videos', 'Stories'], color: 'from-pink-500 to-violet-500' },
              ].map((platform) => (
                <Card key={platform.name} className="group hover:shadow-lg transition-all duration-300 text-center p-6 border-border/50">
                  <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl text-white"
                    style={{ background: `linear-gradient(135deg, ${platform.color.split(' ')[0]}, ${platform.color.split(' ')[platform.color.split(' ').length - 1]})` }}
                  >
                    <platform.icon className="h-7 w-7" />
                  </div>
                  <h3 className="font-semibold">{platform.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{platform.formats.join(' • ')}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-20 sm:py-24 lg:py-28 border-t border-border/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Simple, transparent pricing</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Start free. Upgrade when you&apos;re ready to scale. No hidden fees.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                {
                  name: 'Free',
                  price: '₹0',
                  period: '/month',
                  description: 'Perfect for testing the waters',
                  features: ['5 products', '20 AI ads/month', '1 social account', 'Basic analytics', 'Manual posting'],
                  cta: 'Start Free',
                  popular: false,
                },
                {
                  name: 'Pro',
                  price: '₹1,999',
                  period: '/month',
                  description: 'For serious affiliates scaling up',
                  features: ['Unlimited products', '500 AI ads/month', '3 social accounts', 'Auto-post + scheduler', 'AI optimizer', 'Email/Telegram alerts', 'Priority support'],
                  cta: 'Start Free Trial',
                  popular: true,
                },
                {
                  name: 'Agency',
                  price: '₹4,999',
                  period: '/month',
                  description: 'For teams managing multiple clients',
                  features: ['Everything in Pro', '10 social accounts', 'Team collaboration', 'Client dashboards', 'White-label reports', 'API access', 'Custom integrations', 'Dedicated support'],
                  cta: 'Contact Sales',
                  popular: false,
                },
              ].map((plan) => (
                <Card key={plan.name} className={`relative flex flex-col ${plan.popular ? 'border-primary/50 shadow-lg' : 'border-border/50'}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                      Most Popular
                    </div>
                  )}
                  <CardHeader className="flex-1">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-1">
                    <ul className="space-y-3 mb-6 flex-1">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={plan.popular ? 'default' : 'outline'}
                      asChild
                    >
                      <a href="/auth/signup">{plan.cta}</a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Waitlist / CTA */}
        <section id="waitlist" className="py-20 sm:py-24 lg:py-28 border-t border-border/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-gradient-to-br from-primary/20 via-background to-teal-500/20 p-8 md:p-16 text-center">
              <div className="mx-auto max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-6">
                  <Sparkles className="h-4 w-4" />
                  Early Access Program
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                  Join 500+ affiliates getting early access
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Be the first to automate your affiliate business. Limited spots for founding members with lifetime discount.
                </p>
                <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    required
                    className="flex-1 rounded-lg border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button type="submit" size="lg" className="gap-2">
                    Join Waitlist
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
                <p className="mt-4 text-sm text-muted-foreground">No spam. Unsubscribe anytime. Privacy-first.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">AffiPilot</span>
              </div>
              <p className="text-muted-foreground text-sm max-w-xs">
                The first true AI autopilot for affiliate marketing. Find, create, post, track, optimize — automatically.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API Docs</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">© 2025 AffiPilot. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Twitter">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 9.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="GitHub">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="LinkedIn">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}