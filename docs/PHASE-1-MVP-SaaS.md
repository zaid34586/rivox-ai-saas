# 🚀 PHASE 1: MVP SaaS Foundation (Week 3-6)

**Goal:** Build the core SaaS system - authentication, organization, lead management, and AI agents.

## 📁 Week 3: Authentication & Organization System

### 3.1 Auth Routes (Next.js App Router)

```bash
# Install auth dependencies
npm install next-auth @next-auth/passwordear bcryptjs

# Create auth options (lib/auth-options.ts)
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Github from 'next-auth/providers/github';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

import { prisma } from './prisma';

export const authOptions = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Github({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'text', placeholder: 'hello@rivoxcloud.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials?.email },
        });
        
        if (!user || !user.password) return null;
        
        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;
        
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    verifyRequest: '/auth/verify',
    error: '/auth/error',
  },
  
  session: {
    strategy: 'jwt',
  },
  
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.organizationId = user.organizationId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role as string;
        session.user.organizationId = token.organizationId as string;
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
```

### 3.2 Organization System

```text
User ── Organization/Workspace ── Teams ── Roles/Permissions

Example Roles:
- Owner (full access, can manage org, billing, members)
- Admin (manage teams, projects, members)
- Manager (manage projects, view analytics)
- Member (create/ edit own projects)
- Viewer (read-only access)
```

### 3.3 Database Schema (Supabase/Prisma)

```prisma
// schema.prisma

model User {
  id          String   @id @default(uuid())
  name        String?
  email       String   @unique
  password    String?  // hashed
  emailVerified DateTime?
  image       String?
  
  organizationId String?  // nullable for now
  organization   Organization? @relation(fields: [organizationId], references: [id])
  
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

model Organization {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  description String?
  ownerId     String
  owner       User       @relation(fields: [ownerId], references: [id])
  
  members     Member[]
  projects    Project[]
  
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

model Member {
  id          String   @id @default(uuid())
  role        String   // owner, admin, manager, member, viewer
  status      String   // active, inactive
  
  userId      String
  organizationId String @relation(fields: [organizationId], references: [id])
  
  user        User       @relation(fields: [userId], references: [id])
  
  createdAt   DateTime   @default(now())
}

model Project {
  id          String   @id @default(uuid())
  name        String
  description String?
  organizationId String @relation(fields: [organizationId], references: [id])
  
  leadCount     Int       @default(0)
  aiGenerations Int      @default(0)
  
  createdAt   DateTime   @default(now())
}
```

## 📊 Week 4: Lead Upload & AI Enrichment

### 4.1 Lead Upload Interface

```html
<!-- components/lead/Upload.tsx -->
<input type="file" accept=".csv,.xlsx" onChange={handleFileChange} />
<div class="preview">
  {/* Show first 5 rows preview */}
  {/* Map columns: name, email, company, notes */}
</div>
```

### 4.2 Validation & Enrichment Pipeline

```typescript
// lib/lead-validation.ts

export async function validateAndEnrichLeads(file: File) {
  // 1. Parse CSV/Excel
  const records = await parseFile(file);
  
  // 2. Deduplication
  const uniqueRecords = dedupe(records);
  
  // 3. AI Enrichment (fill missing fields)
  const enriched = await aiEnrich(uniqueRecords); // Uses AI-1: Analyst from your plan
  
  // 4. Scoring
  const scored = await aiScore(enriched); // Fit score 0-100
  
  return scored;
}
```

### 4.3 AI Analyst Agent (From Your Plan)

```
Agent AI-1: Analyst
- Lead file padhe → industry, company size, need, fit score (0-100)
- Buying signals nikaale
```

```typescript
// agents/analyst.ts

export async function analyzeLead(leadData: any) {
  // Call OpenAI/Anthropic
  const response = await openai.chat.completions.parse({
    model: "gpt-4o-mini",
    messages: [
      { 
        role: "system", 
        content: `You are AI-1: Analyst. Analyze this lead and return:
        1. Industry (e.g., "SaaS", "E-commerce", "Consulting")
        2. Company size (e.g., "1-10 employees", "11-50", "51-200", "200+")
        3. Need/Pain point (brief - what problem they likely have)
        4. Fit score 0-100 (based on how well they match our ideal customer)
        5. Buying signals (any hints of urgency or interest)
        
        Return as JSON only, no explanation.`
      },
      { role: "user", content: `Lead data: ${JSON.stringify(leadData)}` }
    ],
    temperature: 0.3,
  });
  
  return response.choices[0].message.parsed;
}
```

## 🤖 Week 5: AI Sequence Engine

### 5.1 Sequence Builders (From Your Plan)

```
Sequence Build Steps:
1. User says: "meri service X hai, ye document/offer hai"
2. AI plan banaye: Day 0 intro → Day 3 value → Day 7 offer PDF → Day 12 breakup
3. Store sequence in DB
```

### 5.2 Sequence Schema

```prisma
model Sequence {
  id          String   @id @default(uuid())
  name        String
  description String?
  
  organizationId String @relation(fields: [organizationId], references: [id])
  
  steps       SequenceStep[]
  
  createdAt   DateTime @default(now())
}

model SequenceStep {
  id          String   @id @default(uuid())
  dayNumber   Int      // Day 0, 1, 3, 7, etc.
  type        String   // "email", "linkedin", "call", "task"
  content     String   // Email body, message, or task description
  variables   Json     // Merge fields like {name}, {company}, {pain_point}
  
  delay       Int      // Delay in hours/days from previous step
  
  order       Int      // Execution order
}
```

### 5.3 Throttled Sending System

```typescript
// lib/sequence-sender.ts

export async function sendSequence(sequenceId: string, leadId: string) {
  const steps = await getSequenceSteps(sequenceId);
  
  for (const step of steps) {
    // Check daily limit
    const sentToday = await countEmailsSentToday(leadId.organizationId);
    if (sentToday >= DAILY_LIMIT) break;
    
    // Personalize content
    const personalized = personalize(step.content, leadData);
    
    // Send via Resend
    await sendEmail({
      to: leadData.email,
      from: 'hello@rivoxcloud.com',
      subject: personalize(step.variables.subject),
      html: personalize(step.variables.body),
    });
    
    // Wait for delay
    await sleep(step.delay * 60 * 60 * 1000);
    
    // Record sent
    await recordEmailSent(leadId, step.id);
  }
}
```

## 📊 Week 6: Dashboard & Basic Analytics

### 6.1 Campaign Dashboard

```typescript
// components/dashboard/campaign-stats.tsx

interface Stats {
  totalLeads: number;
  leadsSent: number;
  leadsOpened: number;
  leadsReplied: number;
  replyRate: number;
}

export function CampaignStats({ leads }: { leads: any[] }) {
  const total = leads.length;
  const sent = leads.filter(l => l.stage === 'SENT').length;
  const opened = leads.filter(l => l.opened).length;
  const replied = leads.filter(l => l.replied).length;
  
  return (
    <div className="grid grid-cols-2 gap-4">
      <StatCard title="Total Leads" value={total} />
      <StatCard title="Sent" value={sent} />
      <StatCard title="Opened" value={opened} ({ Math.round((opened/total)*100) }%) />
      <StatCard title="Replied" value={replied} ({ Math.round((replied/total)*100) }%) />
    </div>
  );
}
```

### 6.2 Basic Dashboard Layout

```text
┌─────────────────────────────────────┐
│ Logo   Search   Help   Profile       │
├────────────┬────────────────────────────┤
│ Projects   │                          │
│ Campaigns  │      MAIN WORKSPACE      │
│ Files      │  - Lead list with stats  │
│ Reports    │  - Campaign graphs       │
│ History    │  - Reply timeline        │
│ Team       │  - Active sequences      │
│ Billing    │                          │
│ Settings   │                          │
└────────────┴────────────────────────────┘
```

## 🛠 Tech Stack Phase 1
- **Next.js 14** (app router, auth, dashboard)
- **Supabase** (PostgreSQL database, storage)
- **Prisma** (DB ORM - or use Supabase SQL directly)
- **Resend SDK** (email sending)
- **OpenAI/Anthropic** (AI agents)
- **Lucide React** (icons)
- **Tailwind CSS** (styling)

## ✅ Success Criteria Phase 1
- [ ] User can sign up with Google/GitHub or email/password
- [ ] User can create organization/workspace
- [ ] User can upload CSV/XLSX lead file
- [ ] AI analyzes leads and gives fit scores
- [ ] User can build AI-powered email sequences
- [ ] Throttled sending works (respects daily limits)
- [ ] Dashboard shows basic stats (sent, opened, replied)
- [ ] Basic navigation between pages works

## ⚠️ Phase 1 Risks & Mitigations
1. **Email deliverability:** Use Resend free tier (3k/month), warm up slowly
2. **AI cost:** Use gpt-4o-mini for analyst, track token usage
3. **Lead quality:** AI scoring may be wrong initially, add manual review
4. **Compliance:** Always include unsubscribe link in emails

---
*Next: Phase 2 — Convert & Retain (CRM pipeline, Documents, Retainer agent)*