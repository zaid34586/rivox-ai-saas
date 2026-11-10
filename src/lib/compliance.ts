/**
 * Compliance Auto — FTC/Platform Policy Compliance Engine
 */

export interface ComplianceRule {
  id: string
  name: string
  type: 'disclosure' | 'banned_claim' | 'platform_policy' | 'content_format'
  severity: 'error' | 'warning' | 'info'
  platforms: string[] // empty = all platforms
  check: (content: ComplianceContent) => ComplianceResult
  autoFix?: (content: ComplianceContent) => ComplianceContent
  message: string
}

export interface ComplianceContent {
  text: string
  platform: string
  format: string
  productCategory?: string
  network?: string
  hasAffiliateLink: boolean
  mediaUrls: string[]
}

export interface ComplianceResult {
  passed: boolean
  violations: ComplianceViolation[]
  fixedContent?: ComplianceContent
}

export interface ComplianceViolation {
  ruleId: string
  ruleName: string
  severity: 'error' | 'warning' | 'info'
  message: string
  location?: string
  suggestion?: string
}

export interface ComplianceReport {
  contentId: string
  contentType: 'ad' | 'image' | 'video'
  platform: string
  overallPassed: boolean
  violations: ComplianceViolation[]
  fixedContent?: ComplianceContent
  checkedAt: string
}

// ============================================================
// FTC Disclosure Rules
// ============================================================

function hasDisclosure(text: string): boolean {
  const disclosurePatterns = [
    /#ad\b/i,
    /#affiliate\b/i,
    /#sponsored\b/i,
    /#paid\b/i,
    /#partner\b/i,
    /\b(ad|sponsored|affiliate|paid partnership)\b/i,
  ]
  return disclosurePatterns.some(pattern => pattern.test(text))
}

function addDisclosure(text: string, platform: string): string {
  if (hasDisclosure(text)) return text
  
  const disclosure = platform === 'twitter' || platform === 'x' 
    ? '#ad ' 
    : '#ad '
  
  return disclosure + text
}

// ============================================================
// Banned Claims Detection
// ============================================================

const BANNED_CLAIMS = [
  // Health/Medical
  { pattern: /\b(cure|cures|cured)\b/i, category: 'medical', message: 'Claims to cure medical conditions are prohibited' },
  { pattern: /\b(miracle|magic)\b/i, category: 'medical', message: 'Miracle claims are not allowed' },
  { pattern: /\b(guaranteed|guarantee)\b/i, category: 'general', message: 'Guaranteed results claims are prohibited' },
  { pattern: /\b(overnight|instant|immediate)\s+(results?|weight loss|cure)\b/i, category: 'general', message: 'Instant/overnight results claims are prohibited' },
  { pattern: /\b(lose\s+\d+\s*(lbs|pounds|kg)\s+in\s+\d+\s*(days|weeks))\b/i, category: 'weight_loss', message: 'Specific weight loss in timeframe claims are prohibited' },
  { pattern: /\b(100%\s*(risk.?free|safe|natural|effective))\b/i, category: 'general', message: '100% claims are prohibited' },
  { pattern: /\b(fda\s+approved)\b/i, category: 'medical', message: 'FDA approval claims require verification' },
  { pattern: /\b(clinically\s+proven)\b/i, category: 'medical', message: 'Clinically proven claims require substantiation' },
  { pattern: /\b(doctor\s+recommended)\b/i, category: 'medical', message: 'Doctor recommended claims require verification' },
  { pattern: /\b(scientifically\s+proven)\b/i, category: 'medical', message: 'Scientifically proven claims require substantiation' },
  { pattern: /\b(no\s+side\s+effects?)\b/i, category: 'medical', message: 'No side effects claims are prohibited' },
  { pattern: /\b(permanent|forever)\s+(results?|solution|fix)\b/i, category: 'general', message: 'Permanent results claims are prohibited' },
  { pattern: /\b(secret|hidden)\b.*(formula|ingredient|method)\b/i, category: 'general', message: 'Secret ingredient claims may be misleading' },
  { pattern: /\b(best|#1|number\s+one)\s*(in|for)\b/i, category: 'general', message: 'Superlative claims require substantiation' },
]

function checkBannedClaims(text: string): ComplianceViolation[] {
  const violations: ComplianceViolation[] = []
  
  for (const claim of BANNED_CLAIMS) {
    if (claim.pattern.test(text)) {
      violations.push({
        ruleId: 'banned_claim',
        ruleName: 'Banned Claim Detection',
        severity: 'error',
        message: claim.message,
        location: text.match(claim.pattern)?.[0],
        suggestion: 'Remove or substantiate this claim with evidence',
      })
    }
  }
  
  return violations
}

// ============================================================
// Platform-Specific Policies
// ============================================================

const PLATFORM_POLICIES: Record<string, { 
  maxLength?: number
  bannedPatterns?: RegExp[]
  requiredPatterns?: RegExp[]
  beforeAfterAllowed?: boolean
  requiresDisclosure?: boolean
}> = {
  instagram: {
    maxLength: 2200,
    bannedPatterns: [
      /#(follow|like|comment|share|tag)\b/gi, // engagement bait
    ],
    beforeAfterAllowed: false, // Meta policy
    requiresDisclosure: true,
  },
  facebook: {
    maxLength: 63206,
    bannedPatterns: [
      /#(follow|like|comment|share|tag)\b/gi,
    ],
    beforeAfterAllowed: false,
    requiresDisclosure: true,
  },
  youtube: {
    maxLength: 5000,
    bannedPatterns: [
      /(subscribe|smash\s+that\s+like)\b/gi, // engagement bait in description
    ],
    beforeAfterAllowed: true,
    requiresDisclosure: true,
  },
  tiktok: {
    maxLength: 2200,
    bannedPatterns: [
      /(follow\s+for\s+more|link\s+in\s+bio)\b/gi, // TikTok specific
    ],
    beforeAfterAllowed: true,
    requiresDisclosure: true,
  },
  x: {
    maxLength: 280,
    bannedPatterns: [],
    beforeAfterAllowed: true,
    requiresDisclosure: true,
  },
  pinterest: {
    maxLength: 500,
    bannedPatterns: [],
    beforeAfterAllowed: true,
    requiresDisclosure: true,
  },
}

function checkPlatformPolicy(content: ComplianceContent): ComplianceViolation[] {
  const violations: ComplianceViolation[] = []
  const policy = PLATFORM_POLICIES[content.platform]
  
  if (!policy) return violations
  
  // Check length
  if (policy.maxLength && content.text.length > policy.maxLength) {
    violations.push({
      ruleId: 'platform_length',
      ruleName: 'Platform Length Limit',
      severity: 'error',
      message: `Content exceeds ${content.platform} max length of ${policy.maxLength} characters`,
      suggestion: `Shorten to ${policy.maxLength} characters or less`,
    })
  }
  
  // Check banned patterns
  if (policy.bannedPatterns) {
    for (const pattern of policy.bannedPatterns) {
      if (pattern.test(content.text)) {
        violations.push({
          ruleId: 'platform_banned_pattern',
          ruleName: 'Platform Banned Pattern',
          severity: 'warning',
          message: `Content contains pattern not allowed on ${content.platform}`,
          suggestion: 'Remove engagement bait or prohibited patterns',
        })
      }
    }
  }
  
  // Check before/after policy
  if (!policy.beforeAfterAllowed && /\b(before|after)\b/i.test(content.text) && content.format !== 'carousel') {
    violations.push({
      ruleId: 'platform_before_after',
      ruleName: 'Before/After Content Policy',
      severity: 'error',
      message: `${content.platform} prohibits before/after comparisons in ${content.format}`,
      suggestion: 'Remove before/after language or use carousel format',
    })
  }
  
  // Check disclosure requirement
  if (policy.requiresDisclosure && content.hasAffiliateLink && !hasDisclosure(content.text)) {
    violations.push({
      ruleId: 'platform_disclosure',
      ruleName: 'Platform Disclosure Requirement',
      severity: 'error',
      message: `${content.platform} requires clear disclosure for affiliate content`,
      suggestion: 'Add #ad or #affiliate disclosure',
    })
  }
  
  return violations
}

// ============================================================
// Network-Specific Policies (Affiliate Networks)
// ============================================================

const NETWORK_POLICIES: Record<string, {
  bannedClaims?: string[]
  requiresDisclosure?: boolean
  allowedPromotionalMethods?: string[]
}> = {
  amazon: {
    bannedClaims: ['price', 'discount', 'sale', 'cheap', 'deal'],
    requiresDisclosure: true,
    allowedPromotionalMethods: ['native_ads', 'product_links', 'banners'],
  },
  flipkart: {
    bannedClaims: ['lowest price', 'best price'],
    requiresDisclosure: true,
  },
  clickbank: {
    bannedClaims: ['guaranteed income', 'easy money', 'get rich'],
    requiresDisclosure: true,
  },
  cuelinks: {
    requiresDisclosure: true,
  },
}

function checkNetworkPolicy(content: ComplianceContent): ComplianceViolation[] {
  const violations: ComplianceViolation[] = []
  const policy = NETWORK_POLICIES[content.network?.toLowerCase() || '']
  
  if (!policy) return violations
  
  if (policy.bannedClaims) {
    for (const claim of policy.bannedClaims) {
      if (new RegExp(claim, 'i').test(content.text)) {
        violations.push({
          ruleId: 'network_banned_claim',
          ruleName: 'Network Banned Claim',
          severity: 'error',
          message: `${content.network} prohibits "${claim}" claims`,
          suggestion: `Remove "${claim}" or use approved language`,
        })
      }
    }
  }
  
  return violations
}

// ============================================================
// Category-Specific Policies
// ============================================================

const CATEGORY_POLICIES: Record<string, {
  requiresDisclaimer?: string
  bannedClaims?: string[]
}> = {
  health: {
    requiresDisclaimer: 'This product is not intended to diagnose, treat, cure, or prevent any disease.',
    bannedClaims: ['cure', 'treat', 'heal', 'prevent disease', 'medical', 'therapy'],
  },
  fitness: {
    bannedClaims: ['guaranteed results', 'spot reduce', 'instant muscle'],
  },
  finance: {
    requiresDisclaimer: 'Not financial advice. Past performance does not guarantee future results.',
    bannedClaims: ['guaranteed returns', 'risk-free', 'get rich quick', 'passive income guaranteed'],
  },
  skincare: {
    bannedClaims: ['cure acne', 'remove wrinkles permanently', 'reverse aging'],
  },
  supplements: {
    requiresDisclaimer: 'These statements have not been evaluated by the FDA. This product is not intended to diagnose, treat, cure, or prevent any disease.',
    bannedClaims: ['fda approved', 'clinically proven', 'doctor recommended'],
  },
}

function checkCategoryPolicy(content: ComplianceContent): ComplianceViolation[] {
  const violations: ComplianceViolation[] = []
  const category = content.productCategory?.toLowerCase()
  const policy = category ? CATEGORY_POLICIES[category] : null
  
  if (!policy) return violations
  
  if (policy.bannedClaims) {
    for (const claim of policy.bannedClaims) {
      if (new RegExp(claim, 'i').test(content.text)) {
        violations.push({
          ruleId: 'category_banned_claim',
          ruleName: 'Category Banned Claim',
          severity: 'error',
          message: `${content.productCategory} category prohibits "${claim}" claims`,
          suggestion: `Remove "${claim}" or add required disclaimer`,
        })
      }
    }
  }
  
  // Check for required disclaimer
  if (policy.requiresDisclaimer && !new RegExp(policy.requiresDisclaimer, 'i').test(content.text)) {
    violations.push({
      ruleId: 'category_disclaimer',
      ruleName: 'Required Disclaimer Missing',
      severity: 'warning',
      message: `${content.productCategory} content requires disclaimer: "${policy.requiresDisclaimer}"`,
      suggestion: `Add disclaimer: ${policy.requiresDisclaimer}`,
    })
  }
  
  return violations
}

// ============================================================
// Main Compliance Check Function
// ============================================================

export function checkCompliance(content: ComplianceContent): ComplianceReport {
  const allViolations: ComplianceViolation[] = []
  
  // 1. FTC Disclosure
  if (content.hasAffiliateLink && !hasDisclosure(content.text)) {
    allViolations.push({
      ruleId: 'ftc_disclosure',
      ruleName: 'FTC Disclosure Required',
      severity: 'error',
      message: 'FTC requires clear disclosure for affiliate/paid content',
      suggestion: 'Add #ad or #affiliate at the beginning of your content',
    })
  }
  
  // 2. Banned Claims
  allViolations.push(...checkBannedClaims(content.text))
  
  // 3. Platform Policies
  allViolations.push(...checkPlatformPolicy(content))
  
  // 4. Network Policies
  allViolations.push(...checkNetworkPolicy(content))
  
  // 5. Category Policies
  allViolations.push(...checkCategoryPolicy(content))
  
  // 6. Character limits per platform
  if (content.text.length > 2200 && ['instagram', 'tiktok'].includes(content.platform)) {
    allViolations.push({
      ruleId: 'platform_length',
      ruleName: 'Platform Length Limit',
      severity: 'error',
      message: `${content.platform} caption exceeds 2200 character limit`,
      suggestion: 'Shorten caption to under 2200 characters',
    })
  }
  
  const errors = allViolations.filter(v => v.severity === 'error')
  const warnings = allViolations.filter(v => v.severity === 'warning')
  
  return {
    contentId: '',
    contentType: 'ad',
    platform: content.platform,
    overallPassed: errors.length === 0,
    violations: allViolations,
    fixedContent: undefined,
    checkedAt: new Date().toISOString(),
  }
}

// ============================================================
// Auto-Fix Function
// ============================================================

export function autoFixCompliance(content: ComplianceContent): ComplianceContent {
  let fixedText = content.text
  let fixedHasAffiliateLink = content.hasAffiliateLink
  let fixedMediaUrls = [...content.mediaUrls]
  
  // Auto-add disclosure
  if (fixedHasAffiliateLink && !hasDisclosure(fixedText)) {
    fixedText = addDisclosure(fixedText, content.platform)
  }
  
  // Truncate to platform limits
  const policy = PLATFORM_POLICIES[content.platform]
  if (policy?.maxLength && fixedText.length > policy.maxLength) {
    fixedText = fixedText.slice(0, policy.maxLength - 3) + '...'
  }
  
  return {
    ...content,
    text: fixedText,
    hasAffiliateLink: fixedHasAffiliateLink,
    mediaUrls: fixedMediaUrls,
  }
}

// ============================================================
// Batch Compliance Check
// ============================================================

export interface BatchComplianceResult {
  total: number
  passed: number
  failed: number
  warnings: number
  reports: ComplianceReport[]
}

export function batchCheckCompliance(contents: ComplianceContent[]): BatchComplianceResult {
  const reports: ComplianceReport[] = []
  let passed = 0
  let failed = 0
  let warnings = 0
  
  for (const content of contents) {
    const report = checkCompliance(content)
    reports.push(report)
    
    const errors = report.violations.filter(v => v.severity === 'error').length
    const warningsCount = report.violations.filter(v => v.severity === 'warning').length
    
    if (errors > 0) failed++
    else passed++
    warnings += warningsCount
  }
  
  return {
    total: contents.length,
    passed,
    failed,
    warnings,
    reports,
  }
}