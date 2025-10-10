import { Skeleton } from '@/components/ui/skeleton';

export function NotificationSkeleton() {
  return (
    <div className="flex gap-3 p-3">
      {/* Avatar */}
      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />

      <div className="flex-1 space-y-2">
        {/* Mensagem */}
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />

        {/* Timestamp */}
        <Skeleton className="h-2 w-16" />
      </div>
    </div>
  );
}
