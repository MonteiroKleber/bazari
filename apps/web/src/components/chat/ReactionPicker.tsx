import { cn } from '@/lib/utils';

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export function ReactionPicker({ onSelect, onClose }: ReactionPickerProps) {
  const handleEmojiClick = (emoji: string) => {
    onSelect(emoji);
    onClose();
  };

  return (
    <div
      className={cn(
        'flex items-center gap-1 p-1.5 bg-popover border rounded-full shadow-lg',
        'animate-in fade-in-0 zoom-in-95 duration-150',
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => handleEmojiClick(emoji)}
          className={cn(
            'text-lg p-1.5 rounded-full transition-transform',
            'hover:bg-muted hover:scale-125',
            'focus:outline-none focus:bg-muted',
          )}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
