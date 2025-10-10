import { Skeleton } from '@/components/ui/skeleton';

export function CommentSkeleton() {
  return (
    <div className="flex gap-3 py-3">
      {/* Avatar pequeno */}
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />

      <div className="flex-1 space-y-2">
        {/* Nome + timestamp */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>

        {/* Conteúdo */}
        <div className="space-y-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    </div>
  );
}
