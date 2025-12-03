import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { AppCategory } from '@/platform/types';

interface AppCategoryTabsProps {
  selected: AppCategory | 'all';
  onChange: (category: AppCategory | 'all') => void;
  counts?: Partial<Record<AppCategory | 'all', number>>;
  className?: string;
}

const categories: { id: AppCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'Todos', icon: '📱' },
  { id: 'finance', label: 'Finanças', icon: '💰' },
  { id: 'social', label: 'Social', icon: '💬' },
  { id: 'commerce', label: 'Comércio', icon: '🛒' },
  { id: 'tools', label: 'Ferramentas', icon: '🛠️' },
  { id: 'governance', label: 'Governança', icon: '🗳️' },
  { id: 'entertainment', label: 'Entretenimento', icon: '🎮' },
];

export function AppCategoryTabs({
  selected,
  onChange,
  counts,
  className,
}: AppCategoryTabsProps) {
  return (
    <div
      className={cn(
        'flex gap-2 overflow-x-auto pb-2 scrollbar-hide',
        className
      )}
    >
      {categories.map((cat) => (
        <Button
          key={cat.id}
          variant={selected === cat.id ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(cat.id)}
          className="whitespace-nowrap"
        >
          <span className="mr-1">{cat.icon}</span>
          {cat.label}
          {counts && counts[cat.id] !== undefined && (
            <span className="ml-1 text-xs opacity-70">({counts[cat.id]})</span>
          )}
        </Button>
      ))}
    </div>
  );
}
