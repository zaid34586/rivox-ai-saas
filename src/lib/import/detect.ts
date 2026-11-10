import type { NetworkId } from './types'

/**
 * Detect the affiliate network from a product URL.
 * Returns null when the host isn't recognized.
 */
export function detectNetwork(url: string): NetworkId | null {
  let host: string
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }

  if (/(^|\.)amazon\./.test(host)) return 'amazon'
  if (/(^|\.)flipkart\.com$/.test(host)) return 'flipkart'
  if (/(^|\.)clickbank\.(net|com)$/.test(host)) return 'clickbank'
  if (/(^|\.)meesho\.com$/.test(host)) return 'meesho'
  if (/(^|\.)cuelinks\.com$/.test(host)) return 'cuelinks'

  return null
}

/** Network display metadata shared by adapters + UI. */
export const NETWORK_META: Record<NetworkId, { label: string; defaultCommission: number }> = {
  amazon: { label: 'Amazon Associates', defaultCommission: 5 },
  flipkart: { label: 'Flipkart Affiliate', defaultCommission: 4 },
  clickbank: { label: 'ClickBank', defaultCommission: 50 },
  meesho: { label: 'Meesho', defaultCommission: 5 },
  cuelinks: { label: 'Cuelinks', defaultCommission: 6 },
  custom: { label: 'Custom / Other', defaultCommission: 5 },
}
