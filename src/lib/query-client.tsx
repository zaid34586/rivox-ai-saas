"use client"

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, ReactNode } from 'react'

// Create a client outside the component to avoid recreating it on render
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
        retry: 1,
        gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
      },
      mutations: {
        retry: 0,
      },
    },
  })
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

// Query keys factory for consistent key management
export const queryKeys = {
  // Auth
  user: ['user'] as const,
  session: ['session'] as const,
  
  // Products
  products: {
    all: ['products'] as const,
    list: (filters?: Record<string, unknown>) => ['products', 'list', filters] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
    smartScore: (id: string) => ['products', 'smartScore', id] as const,
  },
  
  // Affiliate Links
  links: {
    all: ['links'] as const,
    list: (filters?: Record<string, unknown>) => ['links', 'list', filters] as const,
    detail: (id: string) => ['links', 'detail', id] as const,
    clicks: (id: string) => ['links', 'clicks', id] as const,
  },
  
  // Ad Creatives
  ads: {
    all: ['ads'] as const,
    list: (filters?: Record<string, unknown>) => ['ads', 'list', filters] as const,
    detail: (id: string) => ['ads', 'detail', id] as const,
    variants: (productId: string) => ['ads', 'variants', productId] as const,
  },
  
  // Analytics
  analytics: {
    all: ['analytics'] as const,
    summary: (days: number) => ['analytics', 'summary', days] as const,
    topLinks: (days: number) => ['analytics', 'topLinks', days] as const,
    clicksByDate: (days: number) => ['analytics', 'clicksByDate', days] as const,
    clicksByDevice: (days: number) => ['analytics', 'clicksByDevice', days] as const,
    clicksByCountry: (days: number) => ['analytics', 'clicksByCountry', days] as const,
  },
  
  // Commissions
  commissions: {
    all: ['commissions'] as const,
    list: (filters?: Record<string, unknown>) => ['commissions', 'list', filters] as const,
    detail: (id: string) => ['commissions', 'detail', id] as const,
    earnings: (days: number) => ['commissions', 'earnings', days] as const,
  },
  
  // Optimizer
  optimizer: {
    all: ['optimizer'] as const,
    rules: ['optimizer', 'rules'] as const,
    rule: (id: string) => ['optimizer', 'rules', id] as const,
    actions: ['optimizer', 'actions'] as const,
    briefings: ['optimizer', 'briefings'] as const,
    briefing: (date: string) => ['optimizer', 'briefings', date] as const,
    alerts: ['optimizer', 'alerts'] as const,
    budgets: ['optimizer', 'budgets'] as const,
    budget: (id: string) => ['optimizer', 'budgets', id] as const,
  },
  
  // Social Accounts
  socialAccounts: {
    all: ['socialAccounts'] as const,
    list: ['socialAccounts', 'list'] as const,
    detail: (id: string) => ['socialAccounts', 'detail', id] as const,
  },
  
  // Scheduled Posts
  scheduledPosts: {
    all: ['scheduledPosts'] as const,
    list: (filters?: Record<string, unknown>) => ['scheduledPosts', 'list', filters] as const,
    detail: (id: string) => ['scheduledPosts', 'detail', id] as const,
  },
  
  // Teams
  teams: {
    all: ['teams'] as const,
    list: ['teams', 'list'] as const,
    detail: (id: string) => ['teams', 'detail', id] as const,
    members: (id: string) => ['teams', 'members', id] as const,
  },
  
  // Images
  images: {
    all: ['images'] as const,
    list: (productId: string) => ['images', 'list', productId] as const,
  },
  
  // Videos
  videos: {
    all: ['videos'] as const,
    list: ['videos', 'list'] as const,
  },
  
  // Approval
  approval: {
    all: ['approval'] as const,
    list: (filters?: Record<string, unknown>) => ['approval', 'list', filters] as const,
  },
  
  // Compliance
  compliance: {
    all: ['compliance'] as const,
    check: (contentId: string) => ['compliance', 'check', contentId] as const,
  },
  
  // Product Import
  import: {
    search: (params: Record<string, unknown>) => ['import', 'search', params] as const,
  },
} as const

// Helper for API calls with proper error handling
export async function apiCall<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ 
      error: `HTTP ${response.status}` 
    }))
    throw new Error(error.error || `API error: ${response.status}`)
  }

  return response.json()
}

// Mutation helpers
export function createMutationOptions<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    onSuccess?: (data: TData, variables: TVariables) => void
    onError?: (error: Error, variables: TVariables) => void
    invalidateKeys?: readonly unknown[]
  } = {}
) {
  return {
    mutationFn,
    onSuccess: (data: TData, variables: TVariables) => {
      if (options.invalidateKeys) {
        // Will be handled by useMutation's onSuccess
      }
      options.onSuccess?.(data, variables)
    },
    onError: (error: Error, variables: TVariables) => {
      console.error('Mutation error:', error)
      options.onError?.(error, variables)
    },
  }
}