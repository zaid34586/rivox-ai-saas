import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Class name helper: clsx for conditionals + tailwind-merge so a later
 * class (usually a caller override) reliably beats an earlier default.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateShortCode(length = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

export function calculateEPC(clicks: number, commission: number): number {
  if (clicks === 0) return 0
  return commission / clicks
}

export function calculateCTR(impressions: number, clicks: number): number {
  if (impressions === 0) return 0
  return (clicks / impressions) * 100
}

export function calculateConversionRate(clicks: number, conversions: number): number {
  if (clicks === 0) return 0
  return (conversions / clicks) * 100
}