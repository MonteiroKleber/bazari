import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { StoryFeedItem } from '@bazari/shared-types';

interface StoriesBarProps {
  onCreateStory: () => void;
  onViewStories: (profileId: string, stories: StoryFeedItem) => void;
  currentProfileId?: string;
}

export function StoriesBar({ onCreateStory, onViewStories, currentProfileId }: StoriesBarProps) {
  const { data: feed, isLoading, error } = useQuery<StoryFeedItem[]>({
    queryKey: ['stories', 'feed'],
    queryFn: async () => {
      const data = await api.get<StoryFeedItem[]>('/api/stories/feed');
      console.log('[StoriesBar] Feed data:', data);
      return data;
    },
    refetchInterval: 60000, // Atualizar a cada minuto
    retry: 3,
  });

  // Separar próprio story dos demais
  const myStories = feed?.find(item => item.isOwn);
  const otherStories = feed?.filter(item => !item.isOwn) || [];

  return (
    <div className="flex gap-3 py-4 -mx-4 px-4 overflow-x-auto border-b scrollbar-hide">
      {/* Botão criar story / ver meu story */}
      <button
        onClick={() => myStories ? onViewStories(currentProfileId || '', myStories) : onCreateStory()}
        className="flex flex-col items-center gap-1 flex-shrink-0"
      >
        <div className="relative">
          {myStories && myStories.stories.length > 0 ? (
            // Tem stories - mostrar avatar com borda
            <div className="p-0.5 rounded-full bg-gradient-to-br from-primary to-primary/60">
              <Avatar className="w-14 h-14 border-2 border-background">
                <AvatarImage src={myStories.profile.avatarUrl || undefined} />
                <AvatarFallback className="bg-muted">
                  {myStories.profile.displayName?.charAt(0) || myStories.profile.handle.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </div>
          ) : (
            // Sem stories - mostrar botão de criar
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/50">
              <Plus className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          {/* Ícone de + para adicionar mais */}
          {myStories && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateStory();
              }}
              className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-background"
            >
              <Plus className="w-3 h-3 text-primary-foreground" />
            </button>
          )}
        </div>
        <span className="text-xs text-muted-foreground">Seu status</span>
      </button>

      {/* Loading skeleton */}
      {isLoading && (
        <>
          {[1, 2, 3].map(i => (
            <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0 animate-pulse">
              <div className="w-16 h-16 rounded-full bg-muted" />
              <div className="w-12 h-3 bg-muted rounded" />
            </div>
          ))}
        </>
      )}

      {/* Stories dos contatos */}
      {otherStories.map((item) => (
        <button
          key={item.profile.id}
          onClick={() => onViewStories(item.profile.id, item)}
          className="flex flex-col items-center gap-1 flex-shrink-0"
        >
          <div className={cn(
            'p-0.5 rounded-full',
            item.hasUnviewed
              ? 'bg-gradient-to-br from-primary via-primary/80 to-secondary'
              : 'bg-muted'
          )}>
            <Avatar className="w-14 h-14 border-2 border-background">
              <AvatarImage src={item.profile.avatarUrl || undefined} />
              <AvatarFallback className="bg-muted">
                {item.profile.displayName?.charAt(0) || item.profile.handle.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
          <span className="text-xs truncate max-w-16 text-center">
            {item.profile.displayName || item.profile.handle}
          </span>
        </button>
      ))}

      {/* Mensagem vazia se não houver stories */}
      {!isLoading && otherStories.length === 0 && !myStories && (
        <div className="flex items-center text-sm text-muted-foreground px-4">
          Nenhum status disponível
        </div>
      )}
    </div>
  );
}
