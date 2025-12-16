// apps/web/src/components/social/ReactionPicker.tsx

import { useState, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { apiHelpers } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface ReactionPickerRef {
  addLoveReaction: () => Promise<boolean>;
  hasUserReaction: () => boolean;
}

const REACTIONS = [
  { key: 'love', emoji: '❤️', label: 'Curtir' },
  { key: 'laugh', emoji: '😂', label: 'Engraçado' },
  { key: 'wow', emoji: '😮', label: 'Surpreso' },
  { key: 'sad', emoji: '😢', label: 'Triste' },
  { key: 'angry', emoji: '😡', label: 'Revoltado' },
];

interface ReactionPickerProps {
  postId: string;
  initialReactions: {
    love: number;
    laugh: number;
    wow: number;
    sad: number;
    angry: number;
  };
  userReaction?: string;
}

export const ReactionPicker = forwardRef<ReactionPickerRef, ReactionPickerProps>(function ReactionPicker({
  postId,
  initialReactions,
  userReaction: initialUserReaction,
}, ref) {
  const [reactions, setReactions] = useState(initialReactions);
  const [userReaction, setUserReaction] = useState<string | undefined>(initialUserReaction);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0);

  // Expose methods via ref for double-tap integration
  useImperativeHandle(ref, () => ({
    addLoveReaction: async () => {
      // Only add if no reaction exists (double-tap doesn't toggle off)
      if (userReaction) return false;
      await handleReact('love');
      return true;
    },
    hasUserReaction: () => !!userReaction,
  }));

  const handleReact = async (reactionKey: string) => {
    if (loading) return;

    const previousReactions = { ...reactions };
    const previousUserReaction = userReaction;

    // Optimistic update
    if (userReaction === reactionKey) {
      // Remover reação
      setReactions({
        ...reactions,
        [reactionKey]: Math.max(0, reactions[reactionKey as keyof typeof reactions] - 1),
      });
      setUserReaction(undefined);
    } else {
      // Adicionar/trocar reação
      const newReactions = { ...reactions };
      if (userReaction) {
        newReactions[userReaction as keyof typeof newReactions]--;
      }
      newReactions[reactionKey as keyof typeof newReactions]++;
      setReactions(newReactions);
      setUserReaction(reactionKey);
    }

    setLoading(true);
    setOpen(false);

    try {
      if (userReaction === reactionKey) {
        // Remover
        const response: any = await apiHelpers.removeReaction(postId);
        setReactions(response.reactions);
        setUserReaction(undefined);
      } else {
        // Adicionar/trocar
        const response: any = await apiHelpers.reactToPost(postId, { reaction: reactionKey });
        setReactions(response.reactions);
        setUserReaction(response.userReaction);
      }
    } catch (error) {
      // Rollback
      setReactions(previousReactions);
      setUserReaction(previousUserReaction);
      toast.error('Erro ao reagir');
      console.error('Reaction error:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentReactionEmoji = userReaction
    ? REACTIONS.find((r) => r.key === userReaction)?.emoji
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-2",
            userReaction && "text-primary"
          )}
        >
          <span className="text-base">
            {currentReactionEmoji || '🤍'}
          </span>
          {totalReactions > 0 && (
            <span className="text-sm tabular-nums">
              {totalReactions}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-2" align="start">
        <div className="flex gap-1">
          {REACTIONS.map((reaction) => (
            <button
              key={reaction.key}
              onClick={() => handleReact(reaction.key)}
              disabled={loading}
              className={cn(
                "text-2xl p-2 rounded-md hover:bg-accent transition-all hover:scale-125",
                userReaction === reaction.key && "bg-accent"
              )}
              title={reaction.label}
            >
              {reaction.emoji}
            </button>
          ))}
        </div>

        {/* Contadores detalhados (opcional) */}
        <div className="mt-2 pt-2 border-t space-y-1">
          {REACTIONS.map((reaction) => {
            const count = reactions[reaction.key as keyof typeof reactions];
            if (count === 0) return null;

            return (
              <div key={reaction.key} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1">
                  <span>{reaction.emoji}</span>
                  <span className="text-muted-foreground">{reaction.label}</span>
                </span>
                <span className="font-semibold">{count}</span>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
});
