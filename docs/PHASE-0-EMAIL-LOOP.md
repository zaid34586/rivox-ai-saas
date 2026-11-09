# 📧 PHASE 0: Email Loop Foundation (Week 1-2)

**Goal:** Get the email send/receive loop working so AI can actually communicate.

## ✅ Week 1: DNS & Infrastructure Setup

### 1.1 Domain Configuration
- [ ] **Domain:** `rivoxcloud.com` (or your chosen domain)
- [ ] Add to **Cloudflare** (orange cloud **OFF** for DNS records)
- [ ] Add DNS records from Resend dashboard:
  - MX records: `mx1.improvmx.com` (priority 10), `mx2.improvmx.com` (priority 20)
  - TXT (SPF): Copy exactly from Resend dashboard
  - CNAME (DKIM): Copy exactly from Resend dashboard
  - TXT (DMARC): `_dmarc` record with `p=none`
- [ ] **Critical:** Verify with `dns.email` tool after ~15 minutes
- [ ] Verify in Resend Dashboard → Domains → `rivoxcloud.com` shows "verified"

### 1.2 ImprovMX Setup
- [ ] Create account at `improvmx.com`
- [ ] Add alias: `hello@rivoxcloud.com`
- [ ] Set forward to: `mz7123272@gmail.com`
- [ ] Enable **webhooks** on the alias (point to your backend endpoint)
- [ ] Test: Send test email to `hello@rivoxcloud.com` → should forward to Gmail

### 1.3 Resend Configuration
- [ ] Create Resend account
- [ ] Verify domain `rivoxcloud.com`
- [ ] Add sending subdomain: `mail.rivoxcloud.com` (separate from root MX)
- [ ] Configure DNS for subdomain (CNAME/records as Resend instructs)

## ✅ Week 2: Send/Receive Endpoints

### 2.1 Send Endpoint (Backend)
```bash
# Install Resend SDK
npm install resend

# Create send endpoint (app/api/email/send/route.ts)
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  const { to, subject, html } = await request.json();
  
  const { data, error } = await resend.emails.send({
    from: 'hello@rivoxcloud.com',
    to: to,
    subject: subject,
    html: html,
  });
  
  if (error) return new Response(JSON.stringify({ error }), { status: 500 });
  return new Response(JSON.stringify({ success: data }), { status: 200 });
}
```

### 2.2 Receive Endpoint (Backend - Webhook Handler)
```bash
# Create webhook route (app/api/email/webhook/route.ts)
import { NextResponse } from 'next/server';

export async function POST(request) {
  const webhookData = await request.json();
  
  // Parse the email reply
  const { type, messageId, from, subject, text } = webhookData;
  
  // Match reply to existing conversation/lead
  // Save to database
  // Trigger AI analysis
  
  return new NextResponse(JSON.stringify({ status: 'received' }), { status: 200 });
}
```

### 2.3 Proof/Test Milestone
- [ ] Send test lead email from platform → Resend → Lead receives it
- [ ] Lead replies → ImprovMX webhook → Platform receives it
- [ ] Platform saves reply to DB → Shows in unified inbox
- [ ] **Gmail also receives forward** (backup path)
- [ ] **Document:** Screenshot test flow + write "Phase 0 Complete"

## 🛠 Tech Stack for Phase 0
- **Resend SDK:** `npm install resend`
- **ImprovMX:** Webhook configuration (no code needed, just UI setup)
- **Backend:** Next.js API routes (app router)
- **Database:** Supabase (store email threads, lead records)
- **Domain:** `rivoxcloud.com` with Cloudflare (orange OFF)

## ⚠️ Critical Notes
1. **SPF/DKIM/DMARC** must all pass or emails will land in spam
2. **Daily sending limits:** Start conservative (50-100/day), warm up gradually
3. **Unsubscribe link** must be in every email (CAN-SPAM compliance)
4. **Physical address** required in email footer

## ✅ Success Criteria for Phase 0
- [ ] Test email sends from `hello@rivoxcloud.com` via Resend
- [ ] Reply to test email forwards to Gmail via ImprovMX
- [ ] Platform receives webhook when reply comes in
- [ ] Reply is saved and linked to lead record
- [ ] Daily limit working (can adjust later)

---
*Next: Phase 1 — MVP SaaS (Auth + Lead Upload + AI Agents)*