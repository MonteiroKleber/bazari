import { cn } from '@/lib/utils';
import { ReactionSummary } from '@bazari/shared-types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ReactionBarProps {
  reactions: ReactionSummary[];
  currentProfileId: string;
  onToggle: (emoji: string) => void;
  isOwn: boolean;
}

export function ReactionBar({ reactions, currentProfileId, onToggle, isOwn }: ReactionBarProps) {
  if (!reactions || reactions.length === 0) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap gap-1 mt-1',
        isOwn ? 'justify-end' : 'justify-start',
      )}
    >
      <TooltipProvider delayDuration={300}>
        {reactions.map((reaction) => {
          const hasCurrentUser = reaction.profileIds.includes(currentProfileId);

          return (
            <Tooltip key={reaction.emoji}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onToggle(reaction.emoji)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all',
                    'border hover:scale-105 active:scale-95',
                    hasCurrentUser
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-muted border-transparent text-muted-foreground hover:border-border',
                  )}
                >
                  <span className="text-sm">{reaction.emoji}</span>
                  {reaction.count > 1 && (
                    <span className="font-medium">{reaction.count}</span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px]">
                <p className="text-xs">
                  {hasCurrentUser && reaction.count === 1
                    ? 'Você'
                    : hasCurrentUser && reaction.count > 1
                    ? `Você e mais ${reaction.count - 1}`
                    : `${reaction.count} ${reaction.count === 1 ? 'pessoa' : 'pessoas'}`}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
}
