import { Skeleton } from '@/components/ui/skeleton';
import { PostCardSkeleton } from '@/components/social/PostCardSkeleton';

export function ProfileSkeleton() {
  return (
    <div className="container mx-auto px-4 py-0 mobile-safe-bottom">
      {/* Breadcrumb Navigation */}
      <div className="py-2 md:py-3 flex items-center justify-between">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-28" />
      </div>

      {/* Banner Skeleton */}
      <div className="relative w-screen h-48 md:w-full md:h-64 -ml-4 md:ml-0 md:rounded-lg overflow-hidden">
        <Skeleton className="w-full h-full" />
      </div>

      {/* Profile Header - Sobreposto ao banner */}
      <div className="relative -mt-12 md:-mt-16 px-4 md:px-6">
        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
          {/* Avatar */}
          <Skeleton className="h-24 w-24 md:h-32 md:w-32 rounded-full border-4 border-background" />

          {/* Info Section */}
          <div className="flex-1 md:mb-2 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="space-y-2">
                {/* Nome */}
                <Skeleton className="h-8 w-48" />
                {/* Handle */}
                <Skeleton className="h-4 w-32" />
              </div>

              {/* Botão Seguir */}
              <Skeleton className="h-10 w-28" />
            </div>

            {/* Bio */}
            <div className="space-y-2 max-w-2xl">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
      </div>

      {/* Counters */}
      <div className="mb-6 flex gap-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-20" />
      </div>

      {/* Tabs */}
      <div className="relative mb-4">
        <div className="overflow-x-auto border-b border-border pb-2">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-24 flex-shrink-0" />
            ))}
          </div>
        </div>
      </div>

      {/* Posts Skeleton */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
