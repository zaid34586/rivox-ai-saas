import type { ImportedProduct, NetworkId } from './types'
import { NETWORK_META } from './detect'

/**
 * Curated catalog used when a network's official API isn't configured
 * (Amazon PA-API needs an Associates partner tag, ClickBank needs an API key).
 * Search filters this catalog by keyword; results are marked source:'demo'.
 */
interface CatalogEntry {
  name: string
  description: string
  image: string
  url: string
  category: string
  price: number
  original_price: number
  rating: number
  review_count: number
  gravity_score: number
  trend_score: number
  commission_rate: number
}

const CATALOG: Record<Exclude<NetworkId, 'custom'>, CatalogEntry[]> = {
  amazon: [
    {
      name: 'Magnesium Glycinate 500mg - 120 Capsules (High Absorption)',
      description: 'Doctor-recommended magnesium glycinate for sleep quality, muscle recovery and stress support. Non-GMO, third-party tested.',
      image: 'https://picsum.photos/seed/mag-gly/600/600',
      url: 'https://www.amazon.in/dp/B0MAGGLYC?tag=rivox-20',
      category: 'Health & Fitness',
      price: 899, original_price: 1499, rating: 4.5, review_count: 12800, gravity_score: 82, trend_score: 78, commission_rate: 6,
    },
    {
      name: 'boAt Airdopes 141 Bluetooth TWS Earbounds',
      description: '42-hour battery, ENx noise cancellation, low-latency beast mode for gaming.',
      image: 'https://picsum.photos/seed/boat-air/600/600',
      url: 'https://www.amazon.in/dp/B0AIRDOP?tag=rivox-20',
      category: 'Electronics & Gadgets',
      price: 1299, original_price: 4490, rating: 4.2, review_count: 98500, gravity_score: 91, trend_score: 65, commission_rate: 4,
    },
    {
      name: 'Philips Air Fryer HD9200 - 4.1L Rapid Air Technology',
      description: 'Fry with up to 90% less oil. Dishwasher-safe basket, 12 preset menus.',
      image: 'https://picsum.photos/seed/air-fry/600/600',
      url: 'https://www.amazon.in/dp/B0AIRFRY?tag=rivox-20',
      category: 'Home & Kitchen',
      price: 6999, original_price: 9995, rating: 4.4, review_count: 21400, gravity_score: 74, trend_score: 84, commission_rate: 5,
    },
    {
      name: 'Whey Protein Isolate 1kg - 25g Protein Per Serving',
      description: 'Lab-tested whey isolate with digestive enzymes. Chocolate flavour, instant mix.',
      image: 'https://picsum.photos/seed/whey-iso/600/600',
      url: 'https://www.amazon.in/dp/B0WHEYISO?tag=rivox-20',
      category: 'Health & Fitness',
      price: 3499, original_price: 4999, rating: 4.6, review_count: 8900, gravity_score: 88, trend_score: 71, commission_rate: 7,
    },
    {
      name: 'Lenovo IdeaPad Slim 3 Ryzen 5 8GB/512GB SSD',
      description: '15.6" FHD IPS display, 16-hour battery, rapid charge. Windows 11 + Office.',
      image: 'https://picsum.photos/seed/laptop3/600/600',
      url: 'https://www.amazon.in/dp/B0LNVDESK?tag=rivox-20',
      category: 'Electronics & Gadgets',
      price: 42990, original_price: 58990, rating: 4.3, review_count: 4200, gravity_score: 69, trend_score: 62, commission_rate: 3,
    },
    {
      name: 'Organic Ashwagandha Capsules 600mg (KSM-66)',
      description: 'Clinically studied KSM-66 extract for cortisol control, energy and focus.',
      image: 'https://picsum.photos/seed/ashwa/600/600',
      url: 'https://www.amazon.in/dp/B0ASHWA66?tag=rivox-20',
      category: 'Health & Fitness',
      price: 649, original_price: 999, rating: 4.4, review_count: 5600, gravity_score: 77, trend_score: 88, commission_rate: 8,
    },
  ],
  flipkart: [
    {
      name: 'Noise ColorFit Pro 5 Smartwatch 1.85" AMOLED',
      description: 'Bluetooth calling, 100+ sports modes, SpO2 and sleep tracking, 7-day battery.',
      image: 'https://picsum.photos/seed/noise-sw/600/600',
      url: 'https://www.flipkart.com/noise-colorfit-pro-5-smartwatch/p/itmPRO5WAT',
      category: 'Electronics & Gadgets',
      price: 3499, original_price: 7999, rating: 4.3, review_count: 15200, gravity_score: 80, trend_score: 74, commission_rate: 4,
    },
    {
      name: 'Prestige Induction Cooktop 2000W with Timer',
      description: 'Push-button controls, Indian menu presets, automatic voltage regulator.',
      image: 'https://picsum.photos/seed/induct/600/600',
      url: 'https://www.flipkart.com/prestige-induction-cooktop/p/itmIND2000',
      category: 'Home & Kitchen',
      price: 2799, original_price: 4750, rating: 4.2, review_count: 8900, gravity_score: 66, trend_score: 58, commission_rate: 4,
    },
    {
      name: 'Wildcraft Superfit Backpack 45L Water Resistant',
      description: 'Padded laptop sleeve, ergonomic straps, rain cover included.',
      image: 'https://picsum.photos/seed/backpack/600/600',
      url: 'https://www.flipkart.com/wildcraft-superfit-45l-backpack/p/itmBAG45LT',
      category: 'Fashion & Accessories',
      price: 1799, original_price: 3299, rating: 4.4, review_count: 3400, gravity_score: 58, trend_score: 61, commission_rate: 6,
    },
    {
      name: 'Himalayan Pink Salt 1kg (Natural, Unrefined)',
      description: 'Hand-mined, additive-free pink salt for daily cooking and detox routines.',
      image: 'https://picsum.photos/seed/pinksalt/600/600',
      url: 'https://www.flipkart.com/himalayan-pink-salt-1kg/p/itmSALT1KGG',
      category: 'Home & Kitchen',
      price: 299, original_price: 499, rating: 4.5, review_count: 21000, gravity_score: 71, trend_score: 66, commission_rate: 5,
    },
  ],
  clickbank: [
    {
      name: 'Lean Belly Juice - Weight Management Formula',
      description: 'Top-converting weight loss offer with 75% initial commission and strong EPC on cold traffic.',
      image: 'https://picsum.photos/seed/leanbell/600/600',
      url: 'https://hop.clickbank.net/?affiliate=yourname&vendor=leanbellyjuice',
      category: 'Health & Fitness',
      price: 69, original_price: 99, rating: 4.4, review_count: 18500, gravity_score: 94, trend_score: 86, commission_rate: 75,
    },
    {
      name: 'Alpha Survival Prepper Guide (PDF + Video)',
      description: 'Evergreen survival niche offer with upsell ladder. Converts well on list traffic.',
      image: 'https://picsum.photos/seed/survival/600/600',
      url: 'https://hop.clickbank.net/?affiliate=yourname&vendor=alphasurvival',
      category: 'Books & Education',
      price: 37, original_price: 67, rating: 4.2, review_count: 4300, gravity_score: 68, trend_score: 55, commission_rate: 70,
    },
    {
      name: 'Crypto Masterclass 2026 (Recurring Commission)',
      description: 'High-ticket education funnel with recurring billing and 50% ongoing commission.',
      image: 'https://picsum.photos/seed/crypto26/600/600',
      url: 'https://hop.clickbank.net/?affiliate=yourname&vendor=cryptomaster',
      category: 'Finance & Investing',
      price: 147, original_price: 297, rating: 4.1, review_count: 2900, gravity_score: 72, trend_score: 92, commission_rate: 50,
    },
    {
      name: 'Sleep Sync - Deep Sleep Audio Program',
      description: 'Digital sleep audio with 60-day refund window and high initial conversions.',
      image: 'https://picsum.photos/seed/sleepsync/600/600',
      url: 'https://hop.clickbank.net/?affiliate=yourname&vendor=sleepsync',
      category: 'Health & Fitness',
      price: 49, original_price: 89, rating: 4.3, review_count: 6100, gravity_score: 79, trend_score: 70, commission_rate: 75,
    },
  ],
  meesho: [
    {
      name: 'Women\'s Rayon Anarkali Kurta Set (Set of 3)',
      description: 'Trending ethnic wear with 40%+ margins for resellers. Fast-moving catalogue item.',
      image: 'https://picsum.photos/seed/anarkali/600/600',
      url: 'https://www.meesho.com/ankurta-set/p/3kx9yz',
      category: 'Fashion & Accessories',
      price: 799, original_price: 1599, rating: 4.1, review_count: 9800, gravity_score: 75, trend_score: 81, commission_rate: 5,
    },
    {
      name: 'Stainless Steel Storage Jars - Set of 6 (Airtight)',
      description: 'Kitchen organiser bestseller; high repeat purchase rate in home category.',
      image: 'https://picsum.photos/seed/steeljar/600/600',
      url: 'https://www.meesho.com/steel-jars/p/6mn2pq',
      category: 'Home & Kitchen',
      price: 549, original_price: 999, rating: 4.2, review_count: 6400, gravity_score: 63, trend_score: 57, commission_rate: 5,
    },
  ],
  cuelinks: [
    {
      name: 'Myntra Fashion Sale - Up to 80% Off',
      description: 'Coupon + cashback deal from Cuelinks marketplace. Seasonal sale landing page.',
      image: 'https://picsum.photos/seed/myntra/600/600',
      url: 'https://www.cuelinks.com/clink/myntra-sale?u=yourname',
      category: 'Fashion & Accessories',
      price: 399, original_price: 1999, rating: 4.3, review_count: 54000, gravity_score: 85, trend_score: 90, commission_rate: 6,
    },
    {
      name: 'Cult.fit Live Online Membership (3 Months)',
      description: 'Health & fitness subscription deal with flat cashback on first purchase.',
      image: 'https://picsum.photos/seed/cultfit/600/600',
      url: 'https://www.cuelinks.com/clink/cultfit/p/3kx9zz',
      category: 'Sports & Outdoors',
      price: 3599, original_price: 5999, rating: 4.4, review_count: 12000, gravity_score: 70, trend_score: 76, commission_rate: 10,
    },
  ],
}

/** Filter the curated catalog by keyword; empty query returns everything. */
export function searchCatalog(network: Exclude<NetworkId, 'custom'>, query: string, limit = 6): ImportedProduct[] {
  const entries = CATALOG[network] || []
  const q = query.trim().toLowerCase()
  const matched = q
    ? entries.filter(
        e =>
          e.name.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q)
      )
    : entries

  return matched.slice(0, limit).map(e => ({
    name: e.name,
    description: e.description,
    image_url: e.image,
    affiliate_url: e.url,
    network,
    commission_rate: e.commission_rate,
    commission_type: 'percentage' as const,
    category: e.category,
    price: e.price,
    original_price: e.original_price,
    rating: e.rating,
    review_count: e.review_count,
    gravity_score: e.gravity_score,
    trend_score: e.trend_score,
    source: 'demo' as const,
  }))
}
