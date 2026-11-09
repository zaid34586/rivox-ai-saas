/**
 * Ad Studio — AI Ad Generation Types & Prompts
 */

export interface AdHook {
  id: string
  name: string
  category: 'curiosity' | 'problem' | 'social_proof' | 'before_after' | 'listicle' | 'story' | 'urgency' | 'authority'
  template: string
  example: string
  bestFor: string[]
}

export interface AdScript {
  hook: string
  problem: string
  solution: string
  socialProof: string
  cta: string
  fullScript: string
}

export interface AdVariant {
  id: string
  product_id: string
  hook_id: string
  hook: string
  headline: string
  body: string
  cta: string
  hashtags: string[]
  image_prompt: string
  video_prompt: string
  platform: 'instagram' | 'youtube' | 'pinterest' | 'x' | 'facebook' | 'tiktok'
  format: 'post' | 'reel' | 'short' | 'story' | 'pin' | 'tweet'
  quality_score: number
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'scheduled' | 'published' | 'failed'
  created_at: string
}

export interface ProductForAd {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  affiliateUrl: string
  network: string
  commissionRate: number
  commissionType: string
  category: string | null
  price: number | null
  originalPrice: number | null
  rating: number | null
  reviewCount: number | null
  smartScore: number
}

export const AD_HOOKS: AdHook[] = [
  // Curiosity hooks
  {
    id: 'curiosity_1',
    name: 'Secret Revealed',
    category: 'curiosity',
    template: 'Maine {timeframe} pehle ye secret dhundha jo {benefit} mein badal diya...',
    example: 'Maine 30 din pehle ye secret dhundha jo meri neend ko puri tarah badal diya...',
    bestFor: ['health', 'beauty', 'self-improvement'],
  },
  {
    id: 'curiosity_2',
    name: 'What Nobody Tells You',
    category: 'curiosity',
    template: 'Koi nahi batata ki {product_category} mein asli game {hidden_factor} hai...',
    example: 'Koi nahi batata ki protein powder mein asli game absorption rate hai...',
    bestFor: ['supplements', 'tech', 'finance'],
  },
  {
    id: 'curiosity_3',
    name: 'The Hidden Feature',
    category: 'curiosity',
    template: 'Ye {feature} dekho - 99% log isse miss kar dete hain...',
    example: 'Ye hidden pocket dekho - 99% log isse miss kar dete hain...',
    bestFor: ['fashion', 'bags', 'gadgets'],
  },

  // Problem hooks
  {
    id: 'problem_1',
    name: 'Pain Point Agitation',
    category: 'problem',
    template: 'Thak gaye ho {pain_point} se? Maine bhi {timeframe} tak same face kiya...',
    example: 'Thak gaye ho back pain se? Maine bhi 2 saal tak same face kiya...',
    bestFor: ['health', 'posture', 'pain-relief'],
  },
  {
    id: 'problem_2',
    name: 'Wasted Money',
    category: 'problem',
    template: '{amount} waste kiye {wrong_solution} pe? Ye {product} ne bacha liya...',
    example: '5000 waste kiye cheap headphones pe? Ye Sony WH-1000XM5 ne bacha liya...',
    bestFor: ['electronics', 'courses', 'subscriptions'],
  },
  {
    id: 'problem_3',
    name: 'Common Mistake',
    category: 'problem',
    template: 'Sab {common_mistake} karte hain - main bhi karta tha, tabhi {result}...',
    example: 'Sab galat tarike se protein lete hain - main bhi karta tha, tabhi gains nahi aaye...',
    bestFor: ['fitness', 'nutrition', 'skincare'],
  },

  // Social Proof hooks
  {
    id: 'social_1',
    name: 'Real Results',
    category: 'social_proof',
    template: '{number} log already use kar rahe hain - results dekho...',
    example: '10,000+ log already use kar rahe hain - results dekho...',
    bestFor: ['viral-products', 'apps', 'courses'],
  },
  {
    id: 'social_2',
    name: 'Expert/Influencer',
    category: 'social_proof',
    template: 'Jab {expert_name} ne recommend kiya, toh maine try kiya - ye hua...',
    example: 'Jab Dr. Berg ne recommend kiya, toh maine try kiya - ye hua...',
    bestFor: ['health', 'supplements', 'tech'],
  },
  {
    id: 'social_3',
    name: 'Before/After Crowd',
    category: 'social_proof',
    template: 'Mere {community_size} followers ne try kiya - {percentage}% ko fayda hua...',
    example: 'Mere 50k followers ne try kiya - 87% ko fayda hua...',
    bestFor: ['creator-products', 'courses', 'challenges'],
  },

  // Before/After hooks
  {
    id: 'before_after_1',
    name: 'Dramatic Transformation',
    category: 'before_after',
    template: 'Day 1 vs Day {days} - khud dekho difference...',
    example: 'Day 1 vs Day 30 - khud dekho skin difference...',
    bestFor: ['skincare', 'fitness', 'hair'],
  },
  {
    id: 'before_after_2',
    name: 'Side by Side',
    category: 'before_after',
    template: 'Left: {before_state} | Right: {after_state} - same {timeframe}, alag product...',
    example: 'Left: frizzy hair | Right: smooth hair - same 14 din, alag serum...',
    bestFor: ['hair', 'skin', 'beauty'],
  },

  // Listicle hooks
  {
    id: 'listicle_1',
    name: 'Top N Reasons',
    category: 'listicle',
    template: '{number} reasons why {product} is the best {category} investment...',
    example: '5 reasons why this air fryer is the best kitchen investment...',
    bestFor: ['kitchen', 'gadgets', 'home'],
  },
  {
    id: 'listicle_2',
    name: 'Mistakes to Avoid',
    category: 'listicle',
    template: '{number} mistakes maine {topic} mein kiye - tum mat karna...',
    example: '3 mistakes maine skincare routine mein kiye - tum mat karna...',
    bestFor: ['education', 'skincare', 'fitness'],
  },

  // Story hooks
  {
    id: 'story_1',
    name: 'Personal Journey',
    category: 'story',
    template: '{timeframe} pehle main {starting_state} tha - aaj {ending_state} hoon, kaise?',
    example: '6 mahine pehle main 95kg tha - aaj 72kg hoon, kaise?',
    bestFor: ['weight-loss', 'transformation', 'habits'],
  },
  {
    id: 'story_2',
    name: 'Discovery Story',
    category: 'story',
    template: 'Mujhe {problem} tha, doctor ne bola {advice}, phir maine dhundha {solution}...',
    example: 'Mujhe acidity thi, doctor ne bola lifestyle change karo, phir maine dhundha ye tea...',
    bestFor: ['health', 'medical', 'wellness'],
  },

  // Urgency hooks
  {
    id: 'urgency_1',
    name: 'Limited Stock',
    category: 'urgency',
    template: 'Sirf {count} pieces bache hain - {discount}% off abhi...',
    example: 'Sirf 47 pieces bache hain - 40% off abhi...',
    bestFor: ['deals', 'limited-edition', 'sales'],
  },
  {
    id: 'urgency_2',
    name: 'Price Going Up',
    category: 'urgency',
    template: 'Price {date} se badh raha hai - abhi lock kar lo {current_price} mein...',
    example: 'Price 1st Jan se badh raha hai - abhi lock kar lo ₹2,999 mein...',
    bestFor: ['subscriptions', 'courses', 'early-bird'],
  },

  // Authority hooks
  {
    id: 'authority_1',
    name: 'Science-Backed',
    category: 'authority',
    template: '{study_name} study ne prove kiya - {claim}...',
    example: 'Harvard study ne prove kiya - ye ingredient 40% better absorption deta hai...',
    bestFor: ['supplements', 'skincare', 'tech'],
  },
  {
    id: 'authority_2',
    name: 'Professional Choice',
    category: 'authority',
    template: '{percentage}% {professionals} yehi use karte hain - reason yeh hai...',
    example: '90% dermatologists yehi serum recommend karte hain - reason yeh hai...',
    bestFor: ['professional-tools', 'medical', 'pro-gear'],
  },
]

export function getHooksByCategory(category: AdHook['category']): AdHook[] {
  return AD_HOOKS.filter(h => h.category === category)
}

export function getRandomHooks(count: number = 10): AdHook[] {
  const shuffled = [...AD_HOOKS].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

export function getHookById(id: string): AdHook | undefined {
  return AD_HOOKS.find(h => h.id === id)
}