# NexaFlow — Rebuild Plan (Phase by Phase)

## Phase 0: Foundation (Current State Check)
- [x] globals.css — NexaFlow tokens (slate base, violet primary, rose accent)
- [x] layout.tsx — Space Grotesk font, NexaFlow metadata
- [x] package.json — Next.js 16, Tailwind v4, Supabase, Lucide
- [x] .env.local — Supabase URL + keys configured

## Phase 1: Landing Page (Public, no auth needed)
**File:** `src/app/page.tsx`
- [ ] Rewrite with NexaFlow branding (not AffiPilot)
- [ ] Left-aligned hero, violet/rose colors, Space Grotesk type
- [ ] Waitlist form posts to `/api/waitlist`
- [ ] No Supabase auth required — public page
- [ ] Build must pass

## Phase 2: Auth Pages (Login/Signup/Callback)
**Files:** `src/app/auth/login/page.tsx`, `src/app/auth/signup/page.tsx`, `src/app/auth/callback/page.tsx`
- [ ] Login: email/password, Supabase signInWithPassword, redirect to /dashboard on success
- [ ] Signup: email/password/confirm, Supabase signUp, redirect to /auth/login?verified=true
- [ ] Callback: handle Supabase OAuth redirect, verify OTP, redirect to /dashboard
- [ ] All use `export const dynamic = 'force-dynamic'` + Suspense for useSearchParams
- [ ] Build must pass

## Phase 3: Dashboard Layout (Auth Required)
**File:** `src/app/dashboard/DashboardLayoutClient.tsx`
- [ ] Check Supabase session on mount
- [ ] If no user → redirect to /auth/login (BEFORE rendering anything)
- [ ] If loading → show spinner
- [ ] If user → render sidebar + main content
- [ ] No redirect loops (check loading first, then user)

## Phase 4: Dashboard Home Page
**File:** `src/app/dashboard/page.tsx`
- [ ] Stats cards, quick actions, earnings overview
- [ ] Only renders if user is authenticated (handled by layout)
- [ ] Build must pass

## Phase 5: Build & Push
- [ ] `npm run build` passes with zero errors
- [ ] `git commit` + `git push origin master`
- [ ] Verify on deployed URL

## Current Blocker
The dashboard redirects to /auth/login when no user, but the login page itself may have runtime issues (Supabase client initialization, cookie handling, etc.). Need to verify each page loads independently.
