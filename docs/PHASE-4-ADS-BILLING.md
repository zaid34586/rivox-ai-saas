# 💳 PHASE 4: Ads + Billing (Week 15-18)

**Goal:** Integrate ads accounts, payment gateway, wallet system, and subscription plans.

## 💰 Week 15: Subscription Plans & Billing

### 15.1 Plan Tiers

```text
Free         → Starter ($29/mo) → Pro ($79/mo) → Agency ($299/mo)
  │              │                  │              │
  └─ 50 leads/mo  └─ 500 leads/mo    └─ 2,000 leads/mo └─ Unlimited + white-label
```

### 15.2 Prisma Schema for Billing

```prisma
model Plan {
  id              String   @id @default(uuid())
  name            String   // "Free", "Starter", "Pro", "Agency"
  price           Float    // Monthly price in USD
  priceAnnual     Float?   // Annual price (usually 10-15% discount)
  
  // Feature limits
  maxLeads        Int      @default(50)
  maxSequences    Int      @default(3)
  maxAIExecutions Int    @default(100)
  maxSocialConnects Int @default(1)
  storageGB       Float    @default(1)
  
  // Features enabled
  features        Json     // ["ai-analyst", "ai-copywriter", "social", "ads", etc.]
  apiAccess       Boolean  @default(false)
  whiteLabel      Boolean  @default(false)
  prioritySupport Boolean  @default(false)
  
  trialDays       Int      @default(0) // 0 = no trial
  sortOrder       Int      @default(0) // For display ordering
  
  active          Boolean  @default(true)
  createdAt       DateTime @default(now())
}

model Subscription {
  id               String   @id @default(uuid())
  status           String   // "trialing", "active", "past_due", "canceled", "unpaid"
  planId           Plan     @relation(fields: [planId], references: [Plan])
  organizationId   Organization @relation(fields: [organizationId], references: [Organization])
  
  // Billing
  quantity         Int      @default(1)
  unitAmount       Int      // In cents (Stripe)
  currency         String   @default("usd")
  trialEnd         DateTime?
  cancelAt         DateTime?
  canceledAt       DateTime?
  currentPeriodStart DateTime @default(now)
  currentPeriodEnd DateTime
  
  // Timestamps
  createdAt        DateTime @default(now)
  updatedAt        DateTime @updatedAt
}
```

### 15.3 Payment Provider Integration

```bash
# Install Stripe SDK (for India: Razorpay, for global: Stripe)
npm install stripe

# Create checkout session (app/billing/checkout/route.ts)
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-09-30',
});

export async function POST(request) {
  const { planId, mode = 'monthly', organizationId } = await request.json();
  
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: plan.stripePriceId, // Pre-created in Stripe dashboard
        quantity: 1,
      },
    ],
    mode: mode, // 'payment' for one-time, 'subscription' for recurring
    success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/billing/cancel`,
    client_reference_id: organizationId,
    metadata: { planId, organizationId },
  });
  
  return new Response(JSON.stringify({ url: session.url }), { status: 200 });
}
```

## 🎯 Week 16: Ads Account Connection

### 16.1 Ads Platform OAuth

```typescript
// Ads OAuth providers (from your plan)

export const adsProviders = {
  meta: {
    name: 'Facebook Ads',
    scopes: ['ads_management', 'ads_read'],
    auth: 'https://graph.facebook.com/v13.0/oauth/authorize',
    token: 'https://graph.facebook.com/v13.0/oauth/token',
    api: 'https://graph.facebook.com/v13.0/',
  },
  
  google: {
    name: 'Google Ads',
    scopes: ['https://www.googleapis.com/auth/adwords'],
    auth: 'https://accounts.google.com/o/oauth2/auth',
    token: 'https://oauth2.googleapis.com/token',
    api: 'https://googleads.googleapis.com/v17',
  },
};
```

### 16.2 Ads Account Flow

```text
User clicks "Connect Ads Account"
  ↓
OAuth redirect to Meta/Google
  ✓ User authorizes
  ↓
Callback with authorization code
  ↓
Exchange for access token
  ✓ Store encrypted in DB
  ✓ Test API access (fetch accounts)
  ✓ Show connected status
  ↓
User can now:
  - View ad accounts
  - Create campaigns (if they have fund)
  - View balance/status
  - Platform manages campaigns (if Done-for-you plan)
```

### 16.3 Ads Balance Checking

```typescript
// Check ads account balance

export async function checkAdsBalance(accessToken: string, accountId: string) {
  const response = await fetch(
    `https://graph.facebook.com/v17.0/${accountId}/insights?fields=spend`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  
  const data = await response.json();
  return data.spend || 0; // Total spend
}
```

## 👛 Week 17: Wallet & Payment Gateway

### 17.1 Wallet System (From Your Plan)

```
Plan → Monthly credits → AI usage → Credits deducted
```

### 17.2 Wallet Architecture

```text
User purchases credits → Wallet balance increases
AI usage → Credits deducted per request
Email sending → Credits deducted per email
Social posts → Credits deducted per post
Ads spend → User pays directly + platform service fee
```

### 17.3 Credit System Schema

```prisma
model Wallet {
  id               String   @id @default(uuid())
  organizationId   Organization @relation(fields: [organizationId], references: [Organization])
  
  balance          Float    @default(0) // In platform credits
  currency         String   @default("credits")
  
  // Transaction history
  transactions     Transaction[]
  
  // Meta
  lastTopUp        DateTime?
  totalSpent       Float    @default(0)
  totalEarned      Float    @default(0)
  
  createdAt        DateTime @default(now)
  updatedAt        DateTime @updatedAt
}

model Transaction {
  id               String   @id @default(uuid())
  walletId         String   @relation(fields: [walletId], references: [Wallet])
  
  type             String   // "add", "deduct", "refund", "bonus"
  amount           Float    // Positive number (always)
  description      String   // "AI generation", "Email sent", etc.
  relatedId        String?  // Related lead, project, post ID
  relatedType      String?  // "lead", "project", "ai-generation"
  
  status           String   // "completed", "pending", "failed"
  
  createdAt        DateTime @default(now)
}
```

### 17.4 Credit Deduction Logic

```typescript
// lib/credit-deduction.ts

export async function deductCredits(
  organizationId: string,
  type: 'ai' | 'email' | 'social' | 'ads',
  quantity: number,
  relatedId?: string,
  relatedType?: string
) {
  const wallet = await prisma.wallet.findFirst({
    where: { organizationId },
  });
  
  if (wallet.balance < quantity) {
    throw new Error('Insufficient credits');
  }
  
  // Deduct
  await prisma.wallet.update({
    where: { id: wallet.id },
    data: { balance: { decrement: quantity } },
  });
  
  // Record transaction
  await prisma.transaction.create({
    data: {
      walletId: wallet.id,
      type: 'deduct',
      amount: quantity,
      description: `${type} usage`,
      relatedId,
      relatedType,
    },
  });
  
  return wallet.balance;
}
```

## 📊 Week 18: Usage Metering & Reports

### 18.1 Usage Tracking

```typescript
// Track every AI request, email, social post

export async function trackUsage(organizationId: string, type: string) {
  // Increment usage counter
  await prisma.usageIncrement({
    where: { organizationId },
    data: { [type]: { increment: 1 } },
  });
  
  // Check limits and warn if near
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { subscription: true },
  });
  
  const plan = org.subscription?.plan;
  const limits = plan?.limits || {};
  
  const currentUsage = getCurrentUsage(org.id, type);
  const limit = limits[type];
  
  if (currentUsage >= limit * 0.8) {
    // Send warning: "You've used 80% of your ${type} quota"
    await notifyUsageWarning(organizationId, type, currentUsage, limit);
  }
}
```

### 18.2 Usage Reports

```typescript
// components/billing/usage-reports.tsx

interface UsageReport {
  period: 'this-month' | 'last-month' | 'this-quarter';
  aiRequests: number;
  emailsSent: number;
  socialPosts: number;
  creditsUsed: number;
  creditsRemaining: number;
  costInUSD: number;
  limit: number;
  remaining: number;
}

export function UsageReports({ report }: { report: UsageReport }) {
  const percentageUsed = (report.aiRequests / report.limit) * 100;
  
  return (
    <div className="p-4 border rounded">
      <h4>Usage - {report.period}</h4>
      <div className="mt-4">
        <p>AI Requests: {report.aiRequests}/{report.limit} ({percentageUsed}%)</p>
        <progress value={percentageUsed} max="100" />
        <p>Emails Sent: {report.emailsSent}</p>
        <p>Social Posts: {report.socialPosts}</p>
        <p>Credits Used: {report.creditsUsed}</p>
        <p>Credits Remaining: {report.creditsRemaining}</p>
        <p>Cost: ${report.costInUSD.toFixed(2)}</p>
      </div>
    </div>
  );
}
```

## 🛠 Tech Stack Phase 4
- **Stripe SDK** (or Razorpay for India) - `npm install stripe`
- **Webhooks** (Stripe events → update subscription status)
- **Prisma** (database, extend schema)
- **Redis** (cache usage counters, daily limits)
- **Supabase Storage** (invoices, receipts)

## ✅ Success Criteria Phase 4
- [ ] Four plan tiers (Free, Starter, Pro, Agency) with feature limits
- [ ] Stripe/Razorpay integration for payments
- [ ] Subscription management (upgrade/downgrade/cancel)
- [ ] Ads account connection (Meta, Google) with balance viewing
- [ ] Wallet/credit system working
- [ ] Usage metering (AI requests, emails, social posts)
- [ ] Automatic credit deduction on usage
- [ ] Usage warnings at 80%/100% limits
- [ ] Invoice generation and download
- [ ] Refund processing

## ⚠️ Phase 4 Risks & Mitigations
1. **Payment failures:** Handle gracefully, retry logic, grace period
2. **Ads API changes:** Meta/Google frequently update APIs, build adapters
3. **Credit abuse:** Set hard limits, require top-up to continue
4. **Refund complexity:** Clear policy, handle via Stripe dashboard
5. **Tax compliance:** Consult tax advisor for your jurisdiction

---
*Next: Phase 5 — Scale (Inbox warmup, lead marketplace, mobile API, launch)*