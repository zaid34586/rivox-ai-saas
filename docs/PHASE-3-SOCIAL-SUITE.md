# 📱 PHASE 3: Social Suite (Week 11-14)

**Goal:** Integrate social media accounts, AI content generation, and scheduling system.

## 🔌 Week 11: Account Connection & OAuth

### 11.1 Social Media OAuth Providers

```typescript
// lib/oauth-providers.ts

export const oauthProviders = {
  google: {
    name: 'Google',
    clientId: process.env.GOOGLE_OAUTH_ID,
    clientSecret: process.env.GOOGLE_OAUTH_SECRET,
    scopes: ['profile', 'email'],
    authUrl: 'https://accounts.google.com/o/oauth2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://people.googleapis.com/v1/people/me',
  },
  
  linkedin: {
    name: 'LinkedIn',
    clientId: process.env.LINKEDIN_OAUTH_ID,
    clientSecret: process.env.LINKEDIN_OAUTH_SECRET,
    scopes: ['r_liteprofile', 'w_organization_social'],
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    apiBase: 'https://api.linkedin.com/v2',
  },
  
  x: {
    name: 'X (Twitter)',
    clientId: process.env.X_OAUTH_ID,
    clientSecret: process.env.X_OAUTH_SECRET,
    scopes: ['tweet.read', 'tweet.write', 'users.read'],
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.x.com/2/oauth2/token',
    apiBase: 'https://api.x.com/2',
  },
  
  meta: {
    name: 'Facebook/Instagram',
    clientId: process.env.META_OAUTH_ID,
    clientSecret: process.env.META_OAUTH_SECRET,
    scopes: ['pages_read_engagement', 'pages_manage_posts'],
    authUrl: 'https://graph.facebook.com/v13.0/oauth/authorize',
    tokenUrl: 'https://graph.facebook.com/v13.0/oauth/token',
    apiBase: 'https://graph.facebook.com',
  },
};
```

### 11.2 Connection Flow

```text
User clicks "Connect Account"
  ↓
OAuth redirect to provider
  ↓
User authorizes
  ↓
Callback with code
  ↓
Exchange code for access token
  ↓
Store token (encrypted) in DB
  ↓
Test connection (API call)
  ↓
Show connected status
```

### 11.3 Token Storage (Secure)

```prisma
// Extend integration model

model Integration {
  id               String   @id @default(uuid())
  name             String   // "LinkedIn", "X", "Meta", "Gmail"
  type             String   // "oauth", "api-key"
  
  organizationId   String   @relation(fields: [organizationId], references: [Organization])
  
  // Platform specific
  provider         String   // "linkedin", "x", "meta", "google"
  providerUserId   String   // User ID on the platform
  accessToken      String   // Encrypted
  refreshToken     String?  // If refresh needed
  expiresAt        DateTime?
  
  // Metadata
  pageId           String?  // Facebook page ID, LinkedIn page ID, etc.
  accountName      String?  // @username, @page-name
  
  status           String   // "connected", "error", "revoked"
  
  lastUsed         DateTime?
  lastError        String?
  errorCount       Int      @default(0)
  
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

## 🤖 Week 12: AI Content Generation

### 12.1 AI Content Agent (From Your Plan)

```
Agents from your plan:
- AI-3: Copywriter - Personalized messages, subject lines, follow-ups
- AI-4: Reply Handler - Intent classification, draft replies
- AI-5: Closer - Objection handling, proposals
- AI-6: Retainer - Onboarding, upsell, win-back
```

### 12.2 Content Generation Interface

```typescript
// components/social/content-generator.tsx

interface GenerateContentParams {
  platform: 'linkedin' | 'x' | 'meta' | 'email';
  tone: 'professional' | 'casual' | 'friendly' | 'authoritative';
  topic: string;
  personalization?: {
    name: string;
    company: string;
    painPoint: string;
  };
  length: 'short' | 'medium' | 'long';
}

export async function generateSocialContent(params: GenerateContentParams) {
  const systemPrompt = getSystemPrompt(params.platform, params.tone);
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Create ${params.length} content about: ${params.topic}\n\nPersonalization: ${JSON.stringify(params.personalization)}` }
    ],
    temperature: 0.7,
  });
  
  return response.choices[0].message.content;
}

function getSystemPrompt(platform: string, tone: string) {
  const base = `You are AI-3: Copywriter. Create ${platform} content with ${tone} tone.`;
  
  const platformPrompts = {
    linkedin: `LinkedIn post: Professional, value-driven, 1300 character max,
               include hook, value, and call-to-action.`,
    x: `X/Tweet: Concise, engaging, 280 characters max,
        include hook and engagement prompt.`,
    meta: `Facebook/Instagram post: Engaging, visual-friendly,
           include emojis where appropriate, hashtags.`,
    email: `Email sequence: Personalized, direct, clear CTA,
            merge fields for name/company.`,
  };
  
  return `${base} ${platformPrompts[platform]}`;
}
```

### 12.3 Content Calendar

```typescript
// components/social/content-calendar.tsx

interface ContentSlot {
  id: string;
  date: Date;
  platform: string;
  content: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  leadId?: string; // If personalized for specific lead
}

export function ContentCalendar({ slots }: { slots: ContentSlot[] }) {
  return (
    <div>
      {/* Calendar grid showing each day */}
      {/* Drag to reschedule */}
      {/* Publish button for scheduled content */}
    </div>
  );
}
```

## 📅 Week 13: Scheduler & Auto-Post

### 13.1 Publishing Schedule

```typescript
// lib/scheduler.ts

interface Schedule {
  contentId: string;
  postId?: string; // Generated post ID on platform
  scheduledFor: Date;
  status: 'scheduled' | 'published' | 'failed';
  leadId?: string;
}

export async function schedulePost(content: string, platform: string, forDate: Date, lead?: any) {
  // Create the post scheduled
  const now = new Date();
  const delay = forDate.getTime() - now.getTime();
  
  // If scheduling for future
  if (delay > 0) {
    // Add to queue
    await addToJobQueue({
      type: 'schedule-post',
      payload: { content, platform, lead },
      runAt: forDate,
    });
  } else {
    // Post immediately
    await postDirect(content, platform, lead);
  }
}
```

### 13.2 Auto-Post Logic

```typescript
// Job queue worker (BullMQ or similar)

async function processSchedulePost(job) {
  const { content, platform, lead } = job.data;
  
  try {
    let postedContent = content;
    
    // Personalize if lead provided
    if (lead) {
      postedContent = personalize(content, lead);
    }
    
    // Post to platform
    const result = await postToPlatform(postedContent, platform);
    
    // Save post ID
    await savePost(result.id, result.url);
    
    // Notify user
    await notify('post-scheduled', { postId: result.id });
  } catch (error) {
    // Handle error, retry
    await job.fail(error);
  }
}
```

### 13.3 Post Tracking & Analytics

```typescript
// Track post performance

model SocialPost {
  id               String   @id @default(uuid())
  content          String
  platform         String   // linkedin, x, meta
  leadId           String?  // If personalized
  organizationId   String   @relation(fields: [organizationId], references: [Organization])
  
  // Timing
  scheduledFor     DateTime
  postedAt         DateTime?
  
  // Engagement
  likes            Int      @default(0)
  comments         Int      @default(0)
  shares           Int      @default(0)
  clicks           Int      @default(0)
  
  // Tracking
  viewCount        Int      @default(0)
  engagementRate   Float    @default(0)
  
  createdAt        DateTime @default(now())
}
```

## 📊 Week 14: Engagement Analytics

### 14.1 Engagement Metrics

```typescript
// components/social/engagement-analytics.tsx

interface EngagementMetrics {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalClicks: number;
  avgEngagementRate: number;
  topPerformingContent: SocialPost[];
  platformBreakdown: Record<string, number>;
}

export function EngagementAnalytics({ metrics }: { metrics: EngagementMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <MetricCard title="Total Posts" value={metrics.totalPosts} />
      <MetricCard title="Total Engagement" value={metrics.totalLikes} />
      <MetricCard title="Engagement Rate" value={Math.round(metrics.avgEngagementRate)} "%>" />
      <MetricCard title="Top Platform" value={getTopPlatform(metrics.platformBreakdown)} />
    </div>
  );
}
```

### 14.2 Content Performance Insights

```typescript
// AI analysis of what works

export async function analyzeContentPerformance(posts: SocialPost[]) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are analyzing social media content performance. 
        
        Given these posts with engagement data, identify:
        1. Best performing content types/topics
        2. Optimal posting times
        3. Most effective hooks/opening lines
        4. Content patterns that get most engagement
        5. Recommendations for future content
        
        Return actionable insights in JSON format.`
      },
      { role: "user", content: `Posts data: ${JSON.stringify(posts.slice(0, 20))}` }
    ],
    temperature: 0.3,
  });
  
  return response.choices[0].message.content;
}
```

## 🛠 Tech Stack Phase 3
- **OAuth 2.0** (next-auth integrations or custom)
- **BullMQ** (job queue for scheduling)
- **Redis** (cache post data, engagement metrics)
- **OpenAI/Anthropic** (AI content generation)
- **Meta Graph API** (Facebook/Instagram)
- **LinkedIn Page API** (organic posts)
- **X API** (Twitter posts)
- **Supabase Storage** (media attachments)

## ✅ Success Criteria Phase 3
- [ ] User can connect LinkedIn, X, Facebook/Instagram accounts
- [ ] OAuth tokens stored securely, auto-refresh
- [ ] AI generates platform-specific content (LinkedIn posts, tweets, emails)
- [ ] Content calendar with drag-schedule interface
- [ ] Auto-post to scheduled times
- [ ] Post tracking (likes, comments, shares, clicks)
- [ ] Engagement analytics dashboard
- [ ] AI insights on what content performs best

## ⚠️ Phase 3 Risks & Mitigations
1. **API rate limits:** Implement caching, respect platform limits (LinkedIn ~1000/month organic)
2. **OAuth complexity:** Use next-auth packages, handle token refresh gracefully
3. **Content quality:** Human review before posting, add disclaimer
4. **Platform policy changes:** Monitor API changes, build adapters for each platform

---
*Next: Phase 4 — Ads + Billing (Ads account connect, wallet, subscriptions)*