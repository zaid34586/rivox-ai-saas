# AffiPilot — Design Plan (Rebuild v2)

## Subject
AffiPilot — AI Affiliate Marketing Autopilot. A Next.js SaaS that helps affiliate marketers find products, generate UGC ads with AI, auto-post to social platforms, and track commissions — all on autopilot.

## Audience
Affiliate marketers, agency owners, and performance marketers who want to scale without managing 10 tools. Tech-savvy but time-poor. Values speed, trust, and visible earnings.

## Primary Job
Convince a visitor to join the early-access waitlist and log into the dashboard.

---

## Design Direction (Non-Default)

**Concept: "Command Center"** — Not a generic dark SaaS with neon accents. Think military-grade operations dashboard meets financial terminal: deep charcoal/graphite base, sharp angles where needed, precise borders, one accent color used surgically (amber/amber-orange for revenue/money actions), emerald only for success states. No rounded-everything card kit. No generic gradients as decoration.

### Color Tokens (Named Hex Values)

| Token | Hex | Role |
|-------|-----|------|
| `--bg` | `#0B0D0F` | Deep graphite background (primary canvas) |
| `--bg-surface` | `#13171C` | Slightly lighter panels/cards |
| `--bg-elevated` | `#1A2026` | Raised surfaces, modals |
| `--fg` | `#E8EAED` | Primary body text (near-white, not pure #fff) |
| `--fg-muted` | `#8B939E` | Secondary text |
| `--fg-subtle` | `#5C6670` | Tertiary/hint text |
| `--primary` | `#0EA5E9` | Sky blue — primary actions, links, active states |
| `--primary-hover` | `#039BE2` | Primary hover |
| `--primary-soft` | `rgba(14, 165, 230, 0.12)` | Primary tints |
| `--accent` | `#F59E0B` | Amber — revenue, money, CTA primary |
| `--accent-soft` | `rgba(245, 158, 11, 0.12)` | Amber tints |
| `--success` | `#10B981` | Emerald — success, confirmation |
| `--error` | `#EF4444` | Red — destructive |
| `--border` | `#242C34` | Panel borders |
| `--border-hover` | `#374151` | Border on hover/focus |
| `--shadow-lift` | `0 1px 2px rgb(0 0 0 / 0.6), 0 12px 32px -8px rgb(0 0 0 / 0.5)` | Elevation |

### Type

| Role | Family | Weight | Size |
|------|--------|--------|------|
| Display/Headline | **Inter** (or system sans) | 700–800 | clamp(2.25rem, …, 4rem) |
| Body | **Inter** | 400–500 | 1rem (16px) |
| UI / labels | **Inter** | 500–600 | 0.875rem |
| Mono (numbers, codes) | **JetBrains Mono** / ui-monospace | 500 | 0.875rem |

One sans family for everything. No all-caps eyebrow labels. No single-word italic accents in headlines.

### Layout Principles
- **Left-aligned** hero content (not center-everything). Hero takes left 2/3, visual/dashboard mock on right.
- **Bento grid** only where it makes sense (stats + feature chips), not identical rounded cards everywhere.
- **Sharp 6px–8px radius** on panels, 4px on buttons. No 9999px pill buttons except badges.
- **1px borders** in `#242C34` as the primary structural device — borders encode hierarchy, not shadows.
- **One motion moment**: page-load fade-in on hero. Hover transitions only on interactive elements (buttons, links, cards). No entrance animations on every section.

---

## Review Against Generic Defaults

| Generic Default | Our Choice | Why |
|-----------------|-----------|-----|
| Warm cream bg + terracotta accent | Deep graphite + sky/amber | Fits "command center / financial terminal" for affiliate marketers |
| All-caps eyebrow labels | Sentence case labels, no eyebrows | Eyebrows are a templated tell |
| Numbered markers (01/02/03) on everything | Only on the 5-step timeline (it is actually a sequence) | Content is sequential here |
| Identical rounded cards with soft grey shadows | Sharp panels with 1px borders + surgical shadows | Structure, not decoration |
| Gradient washes as decoration | No decorative gradients; amber only on CTA | Restraint |
| Center-aligned hero | Left-aligned hero + dashboard mock right | More editorial, less landing-page-template |

---

## Implementation Targets

1. `globals.css` — Replace Ledger tokens with Command Center tokens (graphite base, sky primary, amber accent).
2. `page.tsx` — Rebuild hero: left-aligned copy, dashboard mock on right, no decorative gradients.
3. `button.tsx` — Sharp radius, border-first variants, amber primary CTA.
4. Dashboard layout — Sidebar with sharp panels, border-based hierarchy.
5. Pricing — Amber highlight on Pro, no emerald glow.

This plan is specific to AffiPilot's audience (performance marketers who want a terminal-like command center) and avoids the clustered AI-generated defaults.
