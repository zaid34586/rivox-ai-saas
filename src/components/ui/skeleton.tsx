"use client"

import { cn } from '@/lib/utils'

// Base skeleton component
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
}

export function Skeleton({ 
  className, 
  variant = 'text', 
  width, 
  height, 
  ...props 
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded bg-muted',
        {
          'rounded-full': variant === 'circular',
          'rounded-lg': variant === 'rectangular',
        },
        className
      )}
      style={{
        width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
        height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
        ...props.style,
      }}
      {...props}
    />
  )
}

// Pre-built skeleton components for common UI patterns

// Card skeleton
export function CardSkeleton({ 
  showImage = true, 
  lines = 3,
  showFooter = true 
}: { 
  showImage?: boolean
  lines?: number
  showFooter?: boolean
} = {}) {
  return (
    <div className="card space-y-4 p-4">
      {showImage && (
        <Skeleton variant="rectangular" className="aspect-video w-full" />
      )}
      <div className="space-y-3">
        <Skeleton variant="text" width="40%" height="1.5rem" />
        <Skeleton variant="text" width="60%" height="1rem" />
        {Array.from({ length: lines - 2 }).map((_, i) => (
          <Skeleton key={i} variant="text" width="90%" height="1rem" />
        ))}
      </div>
      {showFooter && (
        <div className="flex gap-2 pt-2 border-t border-border">
          <Skeleton variant="rectangular" width="80px" height="36px" />
          <Skeleton variant="rectangular" width="80px" height="36px" />
        </div>
      )}
    </div>
  )
}

// Table row skeleton
export function TableRowSkeleton({ columns = 5 }: { columns?: number } = {}) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton variant="text" width="80%" height="1rem" />
        </td>
      ))}
    </tr>
  )
}

// Table skeleton with header
export function TableSkeleton({ 
  rows = 5, 
  columns = 5,
  showHeader = true 
}: { 
  rows?: number
  columns?: number
  showHeader?: boolean
} = {}) {
  return (
    <div className="table-container">
      <table className="table">
        {showHeader && (
          <thead>
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="p-4">
                  <Skeleton variant="text" width="80%" height="0.875rem" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({ length: rows }).map((_, row) => (
            <TableRowSkeleton key={row} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Dashboard stat card skeleton
export function StatCardSkeleton() {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" width="80px" height="1rem" />
        <Skeleton variant="circular" width="32px" height="32px" />
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton variant="text" width="80px" height="2rem" />
        <Skeleton variant="text" width="60px" height="1rem" />
      </div>
    </div>
  )
}

// Product card skeleton
export function ProductCardSkeleton() {
  return (
    <div className="card space-y-4 p-4">
      <div className="flex gap-4">
        <Skeleton variant="circular" width="80px" height="80px" />
        <div className="flex-1 space-y-3">
          <Skeleton variant="text" width="60%" height="1.5rem" />
          <Skeleton variant="text" width="80%" height="1rem" />
          <Skeleton variant="text" width="40%" height="1rem" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton variant="rectangular" width="80px" height="28px" />
        <Skeleton variant="text" width="60px" height="1rem" />
      </div>
    </div>
  )
}

// Ad variant card skeleton
export function AdVariantCardSkeleton() {
  return (
    <div className="card space-y-4 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="40%" height="1.5rem" />
          <Skeleton variant="text" width="80%" height="1rem" />
          <Skeleton variant="text" width="60%" height="1rem" />
        </div>
        <Skeleton variant="circular" width="40px" height="40px" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton variant="rectangular" width="80px" height="28px" />
        <Skeleton variant="rectangular" width="80px" height="28px" />
        <Skeleton variant="rectangular" width="80px" height="28px" />
      </div>
      <div className="pt-2 border-t border-border flex gap-2">
        <Skeleton variant="rectangular" width="100px" height="36px" />
        <Skeleton variant="rectangular" width="100px" height="36px" />
      </div>
    </div>
  )
}

// Form skeleton
export function FormSkeleton({ fields = 4 }: { fields?: number } = {}) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton variant="text" width="100px" height="1rem" />
          <Skeleton variant="rectangular" className="h-10 w-full" />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <Skeleton variant="rectangular" width="120px" height="44px" />
        <Skeleton variant="rectangular" width="120px" height="44px" />
      </div>
    </div>
  )
}

// Avatar list skeleton
export function AvatarListSkeleton({ count = 4 }: { count?: number } = {}) {
  return (
    <div className="flex -space-x-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton 
          key={i} 
          variant="circular" 
          width="32px" 
          height="32px" 
          className="border-2 border-background"
        />
      ))}
    </div>
  )
}

// List item skeleton
export function ListItemSkeleton({ 
  showAvatar = true, 
  lines = 2,
  showAction = false 
}: { 
  showAvatar?: boolean
  lines?: number
  showAction?: boolean
} = {}) {
  return (
    <div className="flex items-start gap-4 p-4">
      {showAvatar && <Skeleton variant="circular" width="48px" height="48px" />}
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton variant="text" width="40%" height="1.25rem" />
        {Array.from({ length: lines - 1 }).map((_, i) => (
          <Skeleton key={i} variant="text" width="90%" height="1rem" />
        ))}
      </div>
      {showAction && <Skeleton variant="rectangular" width="100px" height="36px" />}
    </div>
  )
}

// Full page skeleton for dashboard pages
export function PageSkeleton({ 
  title = true,
  stats = 4,
  tableRows = 5,
  tableColumns = 5 
}: { 
  title?: boolean
  stats?: number
  tableRows?: number
  tableColumns?: number
} = {}) {
  return (
    <div className="space-y-6 animate-fade-in">
      {title && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton variant="text" width="200px" height="2rem" />
            <Skeleton variant="text" width="300px" height="1rem" />
          </div>
          <Skeleton variant="rectangular" width="160px" height="44px" />
        </div>
      )}
      
      {stats > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: stats }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      )}
      
      {tableRows > 0 && (
        <div className="card">
          <TableSkeleton rows={tableRows} columns={tableColumns} />
        </div>
      )}
    </div>
  )
}

// Utility: Fade in animation
export const fadeInStyle = {
  animation: 'fade-in 0.5s ease-out',
}