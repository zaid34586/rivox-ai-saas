/**
 * Smart Score Algorithm (0-100)
 * 
 * Weights:
 * - Commission Rate: 25% — higher commission = better
 * - Gravity Score: 25% — popularity/demand indicator
 * - Trend Score: 20% — viral potential
 * - Social Proof: 15% — rating × review count
 * - Price Advantage: 15% — discount depth
 */

export interface ScoreInputs {
  commission_rate: number
  commission_type: 'percentage' | 'fixed'
  gravity_score: number | null
  trend_score: number | null
  rating: number | null
  review_count: number | null
  price: number | null
  original_price: number | null
}

export interface ScoreBreakdown {
  commission: number
  gravity: number
  trend: number
  social_proof: number
  price_advantage: number
  total: number
}

/**
 * Normalize a value to 0-100 scale given min/max bounds
 */
function normalize(value: number, min: number, max: number): number {
  if (value <= min) return 0
  if (value >= max) return 100
  return Math.round(((value - min) / (max - min)) * 100)
}

/**
 * Calculate commission component (0-100)
 * For percentage: 0% → 0, 50%+ → 100
 * For fixed: ₹0 → 0, ₹5000+ → 100
 */
function scoreCommission(rate: number, type: 'percentage' | 'fixed'): number {
  if (type === 'percentage') {
    return normalize(rate, 0, 50)
  }
  return normalize(rate, 0, 5000)
}

/**
 * Calculate gravity component (0-100)
 * Gravity: 0 → 0, 200+ → 100
 */
function scoreGravity(gravity: number | null): number {
  if (gravity === null) return 30 // neutral default
  return normalize(gravity, 0, 200)
}

/**
 * Calculate trend component (0-100)
 * Trend: 0 → 0, 100 → 100
 */
function scoreTrend(trend: number | null): number {
  if (trend === null) return 30
  return normalize(trend, 0, 100)
}

/**
 * Calculate social proof component (0-100)
 * Combines rating (0-5) and review count
 * Rating 4.5+ & 1000+ reviews → 100
 */
function scoreSocialProof(rating: number | null, reviewCount: number | null): number {
  if (rating === null || reviewCount === null) return 20

  const ratingScore = normalize(rating, 1, 5) // 1-5 scale
  const reviewScore = normalize(reviewCount, 0, 5000)

  // Weighted: 60% rating, 40% review count
  return Math.round(ratingScore * 0.6 + reviewScore * 0.4)
}

/**
 * Calculate price advantage component (0-100)
 * Discount %: 0% → 0, 70%+ → 100
 */
function scorePriceAdvantage(price: number | null, originalPrice: number | null): number {
  if (!price || !originalPrice || originalPrice <= price) return 10
  const discountPct = ((originalPrice - price) / originalPrice) * 100
  return normalize(discountPct, 0, 70)
}

/**
 * Main function: Calculate smart score with breakdown
 */
export function calculateSmartScore(inputs: ScoreInputs): ScoreBreakdown {
  const commission = scoreCommission(inputs.commission_rate, inputs.commission_type)
  const gravity = scoreGravity(inputs.gravity_score)
  const trend = scoreTrend(inputs.trend_score)
  const social_proof = scoreSocialProof(inputs.rating, inputs.review_count)
  const price_advantage = scorePriceAdvantage(inputs.price, inputs.original_price)

  const total = Math.round(
    commission * 0.25 +
    gravity * 0.25 +
    trend * 0.20 +
    social_proof * 0.15 +
    price_advantage * 0.15
  )

  return {
    commission,
    gravity,
    trend,
    social_proof,
    price_advantage,
    total: Math.min(100, Math.max(0, total)),
  }
}

/**
 * Get score label for UI
 */
export function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Excellent', color: 'bg-emerald-100 text-emerald-700' }
  if (score >= 60) return { label: 'Good', color: 'bg-blue-100 text-blue-700' }
  if (score >= 40) return { label: 'Average', color: 'bg-amber-100 text-amber-700' }
  return { label: 'Poor', color: 'bg-red-100 text-red-700' }
}

/**
 * Quick score for table display (simplified)
 */
export function quickScore(product: {
  commission_rate: number
  commission_type: string
  gravity_score: number | null
  trend_score: number | null
  rating: number | null
  review_count: number | null
  price: number | null
  original_price: number | null
}): number {
  return calculateSmartScore({
    commission_rate: product.commission_rate,
    commission_type: product.commission_type as 'percentage' | 'fixed',
    gravity_score: product.gravity_score,
    trend_score: product.trend_score,
    rating: product.rating,
    review_count: product.review_count,
    price: product.price,
    original_price: product.original_price,
  }).total
}