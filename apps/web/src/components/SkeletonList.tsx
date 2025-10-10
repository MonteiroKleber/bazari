interface SkeletonListProps {
  count: number;
  SkeletonComponent: React.ComponentType;
  className?: string;
}

export function SkeletonList({
  count,
  SkeletonComponent,
  className
}: SkeletonListProps) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonComponent key={`skeleton-${index}`} />
      ))}
    </div>
  );
}
