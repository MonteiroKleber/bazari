import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  badge?: number;
}

export function QuickActionButton({ icon, label, onClick, badge }: QuickActionButtonProps) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="flex flex-col items-center justify-center h-24 relative"
    >
      {badge !== undefined && badge > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
        >
          {badge}
        </Badge>
      )}
      <div className="text-primary mb-2">{icon}</div>
      <span className="text-xs">{label}</span>
    </Button>
  );
}
