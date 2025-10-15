import { Skeleton } from '../ui/skeleton';

export function ThreadListSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

export function MessageListSkeleton() {
  return (
    <div className="flex-1 p-4 space-y-3">
      {[...Array(6)].map((_, i) => {
        const isOwnMessage = i % 3 === 0;
        return (
          <div
            key={i}
            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
          >
            <div className="space-y-2 max-w-[70%]">
              {!isOwnMessage && <Skeleton className="h-3 w-20" />}
              <Skeleton
                className={`h-16 ${isOwnMessage ? 'w-48' : 'w-56'} rounded-lg`}
              />
              <Skeleton className="h-2 w-12" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ProposalCardSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <Skeleton className="h-5 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="flex justify-between items-center pt-2 border-t">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  );
}

export function MissionCardSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  );
}

export function GroupPollSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-3 rounded-md border">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatComposerSkeleton() {
  return (
    <div className="flex gap-2 p-4 border-t">
      <Skeleton className="h-10 w-10 rounded-md" />
      <Skeleton className="h-10 w-10 rounded-md" />
      <Skeleton className="flex-1 h-10 rounded-md" />
      <Skeleton className="h-10 w-20 rounded-md" />
    </div>
  );
}

export function AiAssistantSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
      <Skeleton className="h-5 w-40" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
      <Skeleton className="h-9 w-full" />
    </div>
  );
}
