import { Skeleton } from '@/components/ui/skeleton';

export interface FilterSkeletonProps {
  type: 'category' | 'price' | 'attribute';
  count?: number;
}

export function FilterSkeleton({ type, count = 5 }: FilterSkeletonProps) {
  if (type === 'category') {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center space-x-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'price') {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
      </div>
    );
  }

  if (type === 'attribute') {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-24" />
        <div className="space-y-2">
          {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
            <div key={i} className="flex items-center space-x-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

export function ProductCardSkeleton() {
  return (
    <div className="border border-store-ink/10 rounded-lg p-4 space-y-3">
      <Skeleton className="h-48 w-full rounded-md" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-9 w-20" />
      </div>
    </div>
  );
}

export function CatalogSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
