# RIVOX AI SaaS — Master Plan
### "Customer Finding & Selling System" for Businesses/Startups
> Status: **PLANNING PHASE** | Date: 2026-11-05 | Language: Hinglish (tech terms English)

---

## 1. Problem Statement (Asli Dikkat)

Koi bhi business/startup chalane ke liye sabse zaruri cheez: **CUSTOMER**.
Customer ke bina product/service ka koi value nahi.

| Problem | Reality |
|---|---|
| Customer kaise aata hai? | Ads, outreach, referrals, SEO — sab me **paisa + time** lagta hai |
| Ads kitna mehnga hai? | Naye business ke paas itna budget nahi hota jo ads par lagaya jaaye |
| Outreach ka issue? | Manual email/DM karna = time bahut zyada, scale nahi hota |
| Reply handling? | Ek se zyada inbox handle karna impossible ho jaata hai |
| Retention? | Ek baar customer aaya toh usko retain karna bhi system maangta hai |

**Core Insight (sabse important line):**
> *Product ya service matter nahi karta — **kaise sell karte ho** matter karta hai.
> Customer ko problem solve dikhana padta hai, aur uske liye pehle customer ko
> **find karna**, phir **reach karna**, phir **convert karna**, phir **retain karna** —
> yeh 4 step ek SYSTEM chahiye. Yahi hum bana rahe hain.*

---

## 2. Product Vision

**Ek AI-powered, Multi-Channel, Multi-AI SaaS Platform** jo:

```
LEAD FILE → AI PROCESS → OUTREACH → REPLY → CONVERT → RETAIN
    ↑                                              ↓
    └──────────── RETENTION LOOP ←─────────────────┘
```

Jo cheezein platform karega:

1. **Lead ko process kare** — AI lead file padhe, samjhe, score kare
2. **Service/Product sell kare** — AI personalization + outreach (email, social, docs)
3. **Reply handle kare** — sawal ka jawab de, objection handle kare, convert kare
4. **Customer retain kare** — follow-up cadence, engagement, upsell, win-back
5. **Ads account manage kare** — user apna account + fund de, platform chalaye
6. **Social media manage kare** — AI content banaye, plan ke hisaab se post kare, engagement lagaye
7. **Documents bheje** — offer PDF, proposal, letter — lead ke hisaab se personalized

**Target User (hamara customer):** Chhote businesses, startups, agencies, freelancers
jinke paas budget nahi hai ads ka aur time nahi hai outreach ka.

---

## 3. 📧 EMAIL INFRASTRUCTURE — Deep Dive (SABSE PEHLA HIGHLIGHT)

Yeh system ka **dil** hai. Do platform milke kaam karte hain:

### 3.1 Architecture — Kaise Kaam Karta Hai

```
                         ┌─────────────────────────────────────────────┐
                         │           RIVOX PLATFORM (Hamara System)    │
                         │                                             │
   ┌──────────┐  API     │  ┌──────────────┐      ┌────────────────┐  │
   │  RESEND  │◄─────────┼──│  SEND ENGINE  │      │ REPLY RECEIVER │  │
   │ (Send)   │  send    │  │  (sequences, │      │  (webhook API) │  │
   └──────────┘          │  │   AI copy)   │      └───────┬────────┘  │
        │                │  └──────────────┘              │           │
        │ SMTP/HTTPS     │        ▲                       │           │
        ▼                │        │                       │           │
   ┌──────────┐          │   Unified Inbox ◄──────────────┘           │
   │ OUTBOUND │          │   (dono ka data ek jagah)                   │
   │   MAIL   │          └─────────────────────────────────────────────┘
   └──────────┘                        ▲
        │                              │ webhook/fan-out
        ▼                              │
   ┌──────────────┐   MX Records   ┌───┴──────────┐     ┌──────────────────┐
   │   RECIPIENT  │───────────────►│  IMPROVMX    │────►│ mz7123272@gmail  │
   │  (Lead ko)   │  (reply aaye)  │  (Forward)   │     │ (Owner Inbox)    │
   └──────────────┘                └──────────────┘     └──────────────────┘
```

### 3.2 Role of Each Platform

| Platform | Kya karta hai | Details |
|---|---|---|
| **Resend** | **SEND** (outgoing mail) | `hello@rivoxcloud.com` se mail jaata hai. API key / SMTP: `smtp.resend.com`, Port **465**, Username: `resend`, Password: **API key**, Connection: **SSL** |
| **ImprovMX** | **RECEIVE + FORWARD** (incoming) | `hello@rivoxcloud.com` par jo reply aaye wo **forward** kare — `mz7123272@gmail.com` par. **`hello@` ka apna inbox NAHI hai** |
| **Gmail** | Owner ka personal inbox + manual send | Gmail me "Send mail as" se `hello@` bhi From dropdown me dikhta hai (screenshot jaisa) — manual ke liye |

### 3.3 Do Operating Modes

**Mode A — Manual (Abhi jo chal raha hai):**
```
Gmail (From: hello@) ──SMTP/SSL──► Resend ──► Lead
Lead reply ──MX──► ImprovMX ──forward──► mz7123272@gmail.com
```
- Gmail me "Send mail as" configured hai (smtp.resend.com:465)
- Reply automatically Gmail aa jaata hai (ImprovMX forward se)
- **Limitation:** Platform ko reply nahi milta, AI reply nahi kar sakta

**Mode B — Platform-Automated (Jo hum build karenge):**
```
Platform ──Resend API──► Lead (personalized, sequence, tracking)
Lead reply ──MX──► ImprovMX ──► WEBHOOK ──► Platform API ──► Unified Inbox
                                         └─fan-out─► Owner Gmail (optional, backup)
```
- **ImprovMX webhook** (ImprovMX webhooks support karta hai) — reply hamare API endpoint par aayega
- Platform `Message-ID` / `In-Reply-To` / `References` headers se reply ko **original thread se match** karega
- Lead record se match → conversation history me save → **AI reply ka intent samjhega**
- Owner ko bhi forward ho sakta hai (dual-path — kuch na kho jaye)

### 3.4 DNS Setup (rivoxcloud.com)

| Type | Host/Value | Purpose |
|---|---|---|
| **MX** | `mx1.improvmx.com`, `mx2.improvmx.com` (priority 10/20) | Inbound mail → ImprovMX (receive/forward) |
| **TXT (SPF)** | Resend dashboard se **exact copy** | Resend ko send ki permission |
| **CNAME (DKIM)** | Resend dashboard se **exact copy** | Mail signature/verification |
| **TXT (DMARC)** | `_dmarc` record (p=none se start) | Anti-spoofing, trust |
| ⚠️ Note | Cloudflare par **orange cloud OFF** (proxy) rakhna DNS records ka | Proxy se verification fail hoti hai |
| ⚠️ Note | Agar Resend MX maangta hai toh **sending subdomain** (`mail.rivoxcloud.com`) alag rakho — root MX sirf ImprovMX ka | Dono ko bina conflict ke chalane ka standard tareeka |

**Verification flow:** Resend Dashboard → Domains → Add `rivoxcloud.com` → records copy → DNS me paste → ~15 min me verify (kabhi 72 hr) → `dns.email` tool se check.

### 3.5 Unified Inbox (Platform feature)

Ek screen me **dono email accounts** with different labels:
- **OUTBOX** — Resend se bheje gaye (status: sent/opened/clicked/bounced)
- **INBOX** — ImprovMX webhook se aaye replies (matched to threads)
- Har conversation → linked lead → stage → AI draft reply button

### 3.6 Why this combo works
- **Resend** = developer-friendly email API, deliverability, webhooks (open/click/bounce events), broadcast + transactional
- **ImprovMX** = cheap/reliable forwarding, no inbox needed, alias rules, catch-all, webhook support, API bhi hai
- **Gmail** = owner ko familiar manual control
- Result: **ek professional address (`hello@`), teeno worlds ke fayde**

---

## 4. 🧠 AI "Think Process" — Multi-AI Pipeline

Ek AI nahi — **specialized AI agents** ek orchestrator ke under:

| Agent | Kaam |
|---|---|
| **AI-1: Analyst** | Lead file padhe → industry, company size, need, fit score (0-100), buying signals nikaale |
| **AI-2: Strategist** | Kaunsi service/offer fit hai → channel choose (email/LinkedIn/WhatsApp) → timing decide → sequence plan |
| **AI-3: Copywriter** | Personalized message likhe (merge fields + research-based personalization) → subject lines → follow-ups |
| **AI-4: Reply Handler** | Reply ka **intent classify**: Interested / Question / Objection / Not Interested / OOO → context jawab draft kare |
| **AI-5: Closer** | Objection handling, meeting slot propose, personalized proposal/offer PDF generate |
| **AI-6: Retainer** | Onboarding mail, periodic check-ins, upsell, win-back campaign, churn risk signal |

**Orchestrator** decide karta hai kaunsa agent kab chalega, aur **human approval gate**
(copy send se pehle approve) optional hota hai per campaign.

### Lead Pipeline Stages (CRM)
```
NEW → ENRICHED → SEQUENCED → SENT → OPENED → REPLIED
     → QUALIFIED → MEETING → PROPOSAL → WON
     → ONBOARDED → RETAINED → (churn risk) → WIN-BACK
```

---

## 5. 📥 Lead File → Outreach Flow (Core Workflow)

1. **Lead Upload** — CSV/XLSX upload (columns: name, email, phone, LinkedIn, company, notes)
2. **Validation** — email verify (bounce check), dedupe, format cleanup
3. **AI Enrichment** — missing fields fill (company research, industry detect)
4. **AI Scoring** — fit score + segment (hot/warm/cold)
5. **Offer Mapping** — user batata hai: *"meri service X hai, ye document/offer hai"*
6. **Sequence Build** — AI plan banaye: Day 0 intro → Day 3 value → Day 7 offer PDF → Day 12 breakup
7. **Send** — throttled (per day limit, warmup curve), Resend se
8. **Reply Capture** — webhook → AI classify → draft jawab → (approve) → send
9. **Convert** — meeting/proposal → WON stage
10. **Retain** — onboarding + recurring engagement plan

### Documents (Offer/Proposal/Letter)
- Template library (HTML/PDF) + merge fields ({name}, {company}, {pain_point})
- AI lead ke hisaab se content bhare
- Send + **open tracking** (Resend events) + link click tracking

---

## 6. 🔌 Multi-Tenant Connect Hub (User Onboarding)

User signup ke baad connections:

| Connect | Kaise | Kya milega |
|---|---|---|
| **Domain/Email** | DNS instructions (Resend + ImprovMX setup wizard) | Sending identity |
| **Gmail** | OAuth | Owner inbox sync (backup + manual) |
| **Social Media** | OAuth (Meta/Instagram, LinkedIn Page, X, YouTube) | Content post + analytics |
| **Ads Account** | OAuth (Meta Marketing API, Google Ads API) | Campaign manage + balance |
| **Wallet/Fund** | Payment gateway (Razorpay/Stripe) | Platform credits |

**Security:** har credential encrypted (AES-256), scoped tokens, per-org isolation.

---

## 7. 💰 Business Model (Paise Kahan Se)

| Revenue Stream | Explanation |
|---|---|
| **Subscription (SaaS)** | Free tier → Starter → Pro → Agency (feature + volume limits) |
| **Usage-based** | Per email sent, per AI token, per post — wallet se deduct |
| **Ad Spend Passthrough** | User ads ka fund de + platform markup/service fee |
| **Done-for-you Service** | Agency plan: hum hi manage karein (high margin) |

**Platform ka apna CAC bhi isi system se kam hoga** — yehi system pehle hamare
customers ke liye chalega (dogfooding).

---

## 8. 🛠 Tech Stack (Recommended)

| Layer | Choice |
|---|---|
| Frontend | **Next.js (React + TypeScript)** — dashboard, inbox, calendar |
| Backend | Next.js API routes + background workers |
| Database | **PostgreSQL (Supabase)** — leads, threads, orgs, billing |
| Queue/Jobs | **BullMQ (Redis)** — send sequences, schedulers, webhooks |
| File Storage | S3/R2 — lead files, generated PDFs |
| AI | OpenAI/Anthropic API (multi-model routing per agent) |
| Email | **Resend SDK** (send) + **ImprovMX webhook** (receive) |
| Social | Meta Graph API, LinkedIn Page API, X API |
| Ads | Meta Marketing API, Google Ads API |
| Payments | Razorpay (India) / Stripe (global) |
| Hosting | Vercel (app) + Supabase (db) + Upstash (redis) |

---

## 9. 🗺 Phased Roadmap

### ✅ Phase 0 — Email Loop (Week 1–2) ← **SHURU YAHIN SE**
- [ ] `rivoxcloud.com` → Resend me domain verify (SPF/DKIM/DMARC)
- [ ] ImprovMX setup: `hello@` → webhook (hamara endpoint) + fan-out → Gmail
- [ ] Receiving endpoint: parse reply → thread match → DB save
- [ ] Send endpoint: Resend API se test mail
- [ ] **Proof:** ek test lead ko bheja → uska reply aaya → platform me dikha → Gmail me bhi dikha

### Phase 1 — MVP SaaS (Week 3–6)
- [ ] Auth + Organization (multi-tenant base)
- [ ] Lead upload (CSV/XLSX) + validation + lead DB
- [ ] AI Analyst + Copywriter (personalized sequence)
- [ ] Sequence engine + throttled sending + limits
- [ ] Reply capture + AI Reply Handler + draft/approve
- [ ] Basic dashboard (campaign stats: sent/opened/replied)

### Phase 2 — Convert & Retain (Week 7–10)
- [ ] CRM pipeline (stages, drag-drop)
- [ ] Document engine (offer/proposal PDF + tracking)
- [ ] Retainer agent (follow-up cadence, win-back)
- [ ] LinkedIn/WhatsApp assisted channels
- [ ] Team roles + approval workflows

### Phase 3 — Social Suite (Week 11–14)
- [ ] Account connect (Meta, LinkedIn, X, YouTube)
- [ ] AI content generation + content calendar
- [ ] Scheduler (plan ke hisaab se auto-post)
- [ ] Engagement plan (original reach ke liye) + analytics

### Phase 4 — Ads + Billing (Week 15–18)
- [ ] Ads account connect (Meta, Google) + balance view
- [ ] Campaign create/manage (user fund de tabhi)
- [ ] Wallet + payment gateway + subscription plans
- [ ] Usage metering (email/AI/post ke rate)

### Phase 5 — Scale (Week 19+)
- [ ] Inbox warmup tooling + deliverability monitor
- [ ] Lead marketplace / enrichment integrations
- [ ] Mobile-responsive + public API
- [ ] GA launch + own customer acquisition using this same platform 🚀

---

## 10. 💲 Indicative Running Costs (MVP)

| Item | Approx (check current pricing) |
|---|---|
| Domain | ~$10/yr |
| Resend | Free tier (3k emails/mo) → paid ~$20/mo |
| ImprovMX | Free tier se start (premium jab scale ho) |
| Supabase | Free → $25/mo |
| Vercel | Free → $20/mo |
| Upstash Redis | Free tier |
| LLM API | ~$20–100/mo (usage based) |
| **Total MVP** | **≈ $50–150/month** |

---

## 11. ⚠️ Risks & Compliance

| Risk | Mitigation |
|---|---|
| Spam/CAN-SPAM/GDARC | Unsubscribe link, physical address, honest from-name |
| Deliverability | Warmup, daily limits, bounce <2%, spam rate <0.1%, dedicated subdomain |
| LinkedIn automation ToS | Human-in-loop (AI draft, human send) for LinkedIn/WhatsApp |
| Meta/Google Ads ToS | Official APIs only, no gray tactics |
| GDPR | Opt-out honor, data delete on request, ImprovMX "no-read" pledge leverage |
| Reply ka galat jawab | Human approval gate (default ON for first campaigns) |

---

## 12. ✅ Success Metrics

- **Reply rate:** 5–15% (good outreach)
- **Bounce rate:** < 2%
- **Spam complaints:** < 0.1%
- **Lead → Customer conversion:** track per campaign
- **Time saved:** hours/week vs manual
- **Own CAC:** platform apne customers isi se layega

---

## 13. 🔑 Open Decisions (User se confirm karne hain)

1. **Phase 0 se start karein?** (Email loop — recommended) ✅ recommended
2. **Tech stack** Next.js + Supabase theek hai ya koi pasand?
3. **Pehla brand** Rivox (rivoxcloud.com) ya koi alag naam?
4. **Budget** infra ke liye monthly kitna fix karein?

---

*Plan v1.0 — Next step: Phase 0 build start.*
