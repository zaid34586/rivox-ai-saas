# 📈 PHASE 2: Convert & Retain (Week 7-10)

**Goal:** Build CRM pipeline, document engine, and retainer agent for full funnel management.

## 📊 Week 7: CRM Pipeline & Team Roles

### 7.1 CRM Pipeline System

```
Pipeline Stages (From Your Plan):
NEW → ENRICHED → SEQUENCED → SENT → OPENED → REPLIED
   → QUALIFIED → MEETING → PROPOSAL → WON
   → ONBOARDED → RETAINED → (churn risk) → WIN-BACK
```

### 7.2 Pipeline Kanban Board

```typescript
// components/pipeline/kanban-board.tsx

interface Column {
  id: 'new' | 'qualified' | 'proposal' | 'won' | 'retained';
  title: string;
  leads: Lead[];
}

export function KanbanBoard({ columns }: { columns: Column[] }) {
  return (
    <div className="space-x-2">
      columns.map(column => (
        <div key={column.id} className="border rounded p-4 h-[500px] overflow-y-auto">
          <h3 className="text-sm font-medium mb-3">{column.title}</h3>
          <LeadList leads={column.leads} />
        </div>
      ))
    </div>
  );
}
```

### 7.3 Drag & Drop Lead Movement

```typescript
// Use react-beautiful-dnd or @hello-pangea/dnd

import { useDroppable, useDraggable } from 'react-beautiful-dnd';

function LeadItem({ lead }: { lead: Lead }) {
  const { provided, draggable } = useDraggable({
    id: `lead-${lead.id}`,
  });

  return (
    <div ref={provided.innerRef} {...provided.draggableProps} {...draggableProps}>
      <span>{lead.name}</span>
    </div>
  );
}
```

### 7.4 Team Roles Implementation

```prisma
// Extend Member model

model Member {
  id          String   @id @default(uuid())
  role        String   // owner, admin, manager, member, viewer
  status      String   // active, inactive
  
  userId      String
  organizationId String @relation(fields: [organizationId], references: [id])
  
  // Permissions matrix
  canManageOrganization Boolean @default(false)
  canManageMembers      Boolean @default(false)
  canManageProjects     Boolean @default(false)
  canViewAnalytics      Boolean @default(false)
  canCreateSequences    Boolean @default(false)
  canSendEmails         Boolean @default(true)
  
  user        User       @relation(fields: [userId], references: [id])
  organization Organization @relation(fields: [organizationId], references: [id])
  
  createdAt   DateTime   @default(now())
}
```

## 📄 Week 8: Document Engine (Offer/Proposal PDF)

### 8.1 Template Library

```typescript
// components/documents/template-library.tsx

interface Template {
  id: string;
  name: string;
  type: 'proposal' | 'offer' | 'letter';
  preview: string;
  mergeFields: string[]; // {name}, {company}, {pain_point}, etc.
}

const templates: Template[] = [
  {
    id: 'proposal-basic',
    name: 'Basic Proposal',
    type: 'proposal',
    preview: '/templates/proposal-basic.png',
    mergeFields: ['{name}', '{company}', '{pain_point}', '{solution}' ],
  },
  // ... more templates
];
```

### 8.2 AI-Powered Document Generation

```typescript
// agents/closer.ts - From your plan

export async function generateProposal(lead: Lead, offer: Offer) {
  const response = await openai.chat.completions.parse({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are AI-5: Closer. Generate a personalized proposal/offer PDF for this lead.
        
        Lead info: ${JSON.stringify(lead)}
        Offer: ${JSON.stringify(offer)}
        
        Create a professional proposal that:
        1. Addresses their specific pain points
        2. Presents your solution clearly
        3. Includes pricing/packages
        4. Has a clear call-to-action
        5. Is formatted as HTML that can be PDF-exported
        
        Return HTML only, no wrapper tags.`
      },
      { role: "user", content: `Generate proposal for lead above` }
    ],
    temperature: 0.2,
  });
  
  return response.choices[0].message.parsed;
}
```

### 8.3 PDF Generation & Tracking

```typescript
// Install PDF dependencies
npm install @react-pdf/renderer pdfjs-dist

// Generate PDF from HTML
import { Document, Page, Text, View } from '@react-pdf/renderer';

const ProposalPDF = () => {
  return (
    <Document>
      <Page size="A4" margin={[40, 40, 40, 40]}>
        <View>
          <Text>{/* Generated content */}</Text>
        </View>
      </Page>
    </Document>
  );
};
```

### 8.4 Document Tracking

```typescript
// Track when lead opens/proposes

model Document {
  id          String   @id @default(uuid())
  title       String
  type        String   // proposal, offer, letter
  
  leadId      String   @relation(fields: [leadId], references: [Lead])
  organizationId String @relation(fields: [organizationId], references: [Organization])
  
  content     Json     // The proposal content/HTML
  version     Int      @default(1)
  
  // Tracking
  timesOpened  Int      @default(0)
  timesDownloaded Int @default(0)
  lastOpened   DateTime?
  
  createdAt   DateTime @default(now())
}
```

## 🔄 Week 9: Retainer Agent & Follow-up Cadence

### 9.1 Retainer Agent (From Your Plan)

```
Agent AI-6: Retainer
- Onboarding mail, periodic check-ins, upsell, win-back campaign, churn risk signal
```

### 9.2 Onboarding Sequence

```
Day 0: Welcome + setup instructions
Day 3: Check-in + value reminder
Day 7: Feature highlight
Day 14: Success story/case study
Day 30: Upsell/cross-sell offer
```

### 9.3 Churn Risk Detection

```typescript
// Detect when engagement drops

export async function checkChurnRisk(lead: Lead, daysSinceLastInteraction: number) {
  if (daysSinceLastInteraction > 14) {
    // Flag as at-risk
    await updateLeadStatus(lead.id, 'at-risk');
    
    // Trigger win-back sequence
    await triggerSequence(lead.id, 'win-back');
  }
  
  if (daysSinceLastInteraction > 30) {
    // Mark as churned
    await updateLeadStatus(lead.id, 'churned');
  }
}
```

### 9.4 Win-Back Campaign

```typescript
// Win-back sequence (from your plan)
const winBackSequence = {
  name: "Win-Back Campaign",
  steps: [
    { day: 0, content: "Miss us? Here's a special offer" },
    { day: 3, content: "New features you might love" },
    { day: 7, content: "Last chance - 20% discount" },
    { day: 14, content: "We'll miss you!" },
  ],
};
```

## 👥 Week 10: Team Collaboration Features

### 10.1 Task Assignment

```typescript
// Assign leads/tasks to team members

model Task {
  id          String   @id @default(uuid())
  title       String
  description String?
  
  status      String   // pending, in-progress, completed, blocked
  
  assigneeId  String?  // Member who owns this task
  organizationId String @relation(fields: [organizationId], references: [Organization])
  
  leadId      String?  // Associated lead (optional)
  projectId   String?  // Associated project (optional)
  
  createdBy   String   // Who created the task
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 10.2 Approval Workflows

```typescript
// For expensive actions or high-value deals

model Approval {
  id               String   @id @default(uuid())
  type             String   // "deal", "sequence", "discount"
  status           String   // pending, approved, rejected
  
  requestedBy      String   // Who requested
  approvedBy       String?  // Who approved
  organizationId   String   @relation(fields: [organizationId], references: [Organization])
  
  relatedId        String   // Related lead, deal, etc.
  amount           Float?   // If financial approval needed
  
  reason           String   // Why approval needed
  createdAt        DateTime @default(now())
}
```

### 10.3 Team Inbox

```typescript
// Shared inbox for team communication

model TeamInbox {
  id          String   @id @default(uuid())
  name        String   // "Sales", "Support", etc.
  organizationId String @relation(fields: [organizationId], references: [Organization])
  
  conversations Conversation[]
  
  createdAt   DateTime @default(now())
}
```

## 🛠 Tech Stack Phase 2
- **React Beautiful DnD** (for kanban board drag-drop)
- **@react-pdf/renderer** (PDF generation)
- **Zod** (form validation)
- **React Hook Form** (form management)
- **Lucide React** (icons)
- **Tailwind CSS** (styling)

## ✅ Success Criteria Phase 2
- [ ] CRM kanban board with drag-drop lead movement
- [ ] Pipeline stages (NEW → WON → RETAINED) working
- [ ] Team roles with different permissions
- [ ] Document templates with merge fields
- [ ] AI generates personalized proposals/offers as HTML/PDF
- [ ] Document tracking (opens, downloads)
- [ ] Retainer agent with onboarding/win-back sequences
- [ ] Task assignment and approval workflows
- [ ] Team inbox for collaboration

## ⚠️ Phase 2 Risks & Mitigations
1. **PDF generation cost:** Cache generated proposals, reuse templates
2. **Drag-drop complexity:** Start simple, add complexity later
3. **Role-based access:** Test thoroughly, use Prisma permissions
4. **AI token costs:** Set limits, use cheaper models for routine tasks

---
*Next: Phase 3 — Social Suite (Account connect, AI content, Scheduler)*