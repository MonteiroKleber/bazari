import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import '../styles.css';

/**
 * FASE 8 - PROMPT 8: Skeleton Loaders
 *
 * Loading states que respeitam o sistema de temas
 */

export interface SkeletonProps {
  className?: string;
}

/**
 * Base Skeleton component
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton', className)}
      role="status"
      aria-label="Loading..."
    />
  );
}

/**
 * Proposal Card Skeleton
 */
export function ProposalCardSkeleton({ className }: SkeletonProps) {
  return (
    <Card className={cn('animate-fade-slide-in', className)}>
      <CardHeader>
        {/* Title */}
        <Skeleton className="h-6 w-3/4 mb-2" />
        {/* Subtitle */}
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Description lines */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />

        {/* Status badges and actions */}
        <div className="flex gap-2 mt-4">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Chart Skeleton
 */
export function ChartSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('skeleton h-[300px] w-full rounded-lg', className)} />
  );
}

/**
 * Stats Widget Skeleton
 */
export function StatsWidgetSkeleton({ className }: SkeletonProps) {
  return (
    <Card className={cn('animate-fade-slide-in', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            {/* Icon */}
            <Skeleton className="h-10 w-10 skeleton-circle mb-3" />
            {/* Title */}
            <Skeleton className="h-4 w-24" />
            {/* Value */}
            <Skeleton className="h-8 w-32" />
            {/* Change indicator */}
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Timeline Event Skeleton
 */
export function TimelineEventSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('flex gap-4', className)}>
      {/* Icon */}
      <Skeleton className="h-10 w-10 skeleton-circle flex-shrink-0" />

      {/* Content */}
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}

/**
 * Filter Skeleton
 */
export function FilterSkeleton({ className }: SkeletonProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

/**
 * Notification Item Skeleton
 */
export function NotificationItemSkeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'flex gap-3 p-4 rounded-lg border border-border',
        className
      )}
    >
      {/* Icon */}
      <Skeleton className="h-10 w-10 skeleton-circle flex-shrink-0" />

      {/* Content */}
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

/**
 * Multi-sig Transaction Skeleton
 */
export function MultisigTransactionSkeleton({ className }: SkeletonProps) {
  return (
    <Card className={cn('animate-fade-slide-in', className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-6 w-20" />
        </div>

        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-4" />

        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Grid of Proposal Card Skeletons
 */
export function ProposalListSkeleton({
  count = 6,
  className,
}: SkeletonProps & { count?: number }) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <ProposalCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Stats Grid Skeleton
 */
export function StatsGridSkeleton({
  count = 4,
  className,
}: SkeletonProps & { count?: number }) {
  return (
    <div
      className={cn(
        'grid gap-4 md:grid-cols-2 lg:grid-cols-4 stagger-container',
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <StatsWidgetSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Timeline Skeleton
 */
export function TimelineSkeleton({
  count = 5,
  className,
}: SkeletonProps & { count?: number }) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <TimelineEventSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Full Page Loading Skeleton for Governance
 */
export function GovernancePageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 mobile-safe-bottom space-y-8">
      {/* Header */}
      <div>
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Stats Grid */}
      <StatsGridSkeleton />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-12 w-12 skeleton-circle mb-3" />
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <TimelineSkeleton count={8} />
        </CardContent>
      </Card>
    </div>
  );
}
