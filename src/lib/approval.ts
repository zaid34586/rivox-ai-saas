/**
 * Approval Queue & Workflow Types
 */

export interface ApprovalItem {
  id: string
  type: 'ad' | 'image' | 'video'
  user_id: string
  title: string
  preview_url: string
  status: 'pending' | 'approved' | 'rejected' | 'needs_revision' | 'auto_approved'
  quality_score: number
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  rejection_reason: string | null
  revision_count: number
  metadata: Record<string, any>
}

export interface ApprovalRule {
  id: string
  user_id: string
  name: string
  type: 'quality_threshold' | 'platform_specific' | 'content_type' | 'time_based'
  conditions: {
    min_quality_score?: number
    platforms?: string[]
    content_types?: string[]
    keywords_allowed?: string[]
    keywords_blocked?: string[]
    schedule?: {
      start: string
      end: string
      timezone: string
    }
  }
  action: 'auto_approve' | 'auto_reject' | 'require_review' | 'flag'
  priority: number
  is_active: boolean
  created_at: string
}

export interface ApprovalComment {
  id: string
  item_id: string
  user_id: string
  user_name: string
  user_avatar: string | null
  content: string
  type: 'comment' | 'revision_request' | 'approval_note' | 'system'
  created_at: string
}

export interface ApprovalQueueFilters {
  type?: 'ad' | 'image' | 'video' | 'all'
  status?: ApprovalItem['status'] | 'all'
  quality_min?: number
  quality_max?: number
  date_from?: string
  date_to?: string
  assignee?: string
}

export interface BulkAction {
  action: 'approve' | 'reject' | 'request_revision' | 'assign'
  item_ids: string[]
  comment?: string
  assignee_id?: string
}

const DEFAULT_APPROVAL_RULES_BASE: Omit<ApprovalRule, 'id' | 'user_id' | 'created_at'>[] = [
  {
    name: 'High Quality Auto-Approve',
    type: 'quality_threshold',
    conditions: {
      min_quality_score: 85,
    },
    action: 'auto_approve',
    priority: 1,
    is_active: true,
  },
  {
    name: 'Low Quality Flag',
    type: 'quality_threshold',
    conditions: {
      min_quality_score: 0,
    },
    action: 'flag',
    priority: 2,
    is_active: true,
  },
  {
    name: 'TikTok/Reels Require Review',
    type: 'platform_specific',
    conditions: {
      platforms: ['tiktok', 'instagram'],
    },
    action: 'require_review',
    priority: 3,
    is_active: true,
  },
  {
    name: 'Blocked Keywords Check',
    type: 'content_type',
    conditions: {
      keywords_blocked: ['guaranteed', 'miracle', 'overnight', 'scam', 'fake', '100% risk-free'],
    },
    action: 'auto_reject',
    priority: 1,
    is_active: true,
  },
]

export function getDefaultApprovalRules(userId: string): ApprovalRule[] {
  return DEFAULT_APPROVAL_RULES_BASE.map((rule, index) => ({
    ...rule,
    id: `default_rule_${index}`,
    user_id: userId,
    created_at: new Date().toISOString(),
  }))
}

export function evaluateApprovalRules(
  item: Pick<ApprovalItem, 'type' | 'quality_score' | 'metadata'>,
  rules: ApprovalRule[]
): { action: ApprovalRule['action']; rule: ApprovalRule } | null {
  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority)
  
  for (const rule of sortedRules) {
    if (!rule.is_active) continue
    
    let matches = true
    
    if (rule.conditions.min_quality_score !== undefined) {
      if (item.quality_score < rule.conditions.min_quality_score) {
        matches = false
      }
    }
    
    if (rule.conditions.platforms && rule.conditions.platforms.length > 0) {
      const itemPlatform = item.metadata.platform
      if (!itemPlatform || !rule.conditions.platforms.includes(itemPlatform)) {
        matches = false
      }
    }
    
    if (rule.conditions.keywords_blocked && rule.conditions.keywords_blocked.length > 0) {
      const content = JSON.stringify(item.metadata).toLowerCase()
      for (const keyword of rule.conditions.keywords_blocked) {
        if (content.includes(keyword.toLowerCase())) {
          return { action: rule.action, rule }
        }
      }
    }
    
    if (matches) {
      return { action: rule.action, rule }
    }
  }
  
  return null
}

export function getStatusBadge(status: ApprovalItem['status']) {
  const styles: Record<ApprovalItem['status'], string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    needs_revision: 'bg-blue-100 text-blue-700',
    auto_approved: 'bg-purple-100 text-purple-700',
  }
  return styles[status] || styles.pending
}