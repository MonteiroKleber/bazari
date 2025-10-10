import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function ProfileCardSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Avatar grande */}
        <Skeleton className="h-24 w-24 rounded-full" />

        {/* Nome */}
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Bio */}
        <div className="space-y-2 w-full">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3 mx-auto" />
        </div>

        {/* Métricas */}
        <div className="flex gap-6">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
        </div>

        {/* Botão */}
        <Skeleton className="h-10 w-32" />
      </div>
    </Card>
  );
}
