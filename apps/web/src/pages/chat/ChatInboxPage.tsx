import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../hooks/useChat';
import { ThreadItem } from '../../components/chat/ThreadItem';
import { Button } from '../../components/ui/button';
import { MessageSquarePlus, Users, Archive, ChevronDown, ChevronUp, Search, MessageCircle, Phone } from 'lucide-react';
import { CreateGroupDialog } from '../../components/chat/CreateGroupDialog';
import { SearchMessages } from '../../components/chat/SearchMessages';
import { ChatSettings } from '../../components/chat/ChatSettings';
import { NotificationPermissionBanner } from '../../components/chat/NotificationPermissionBanner';
import { PushNotificationInitializer } from '../../components/chat/PushNotificationInitializer';
import { StoriesBar } from '../../components/chat/StoriesBar';
import { StoryViewer } from '../../components/chat/StoryViewer';
import { StoryCreator } from '../../components/chat/StoryCreator';
import { CallHistoryTab } from '../../components/chat/CallHistoryTab';
import { ChatThreadPreference, StoryFeedItem } from '@bazari/shared-types';
import { apiHelpers } from '@/lib/api';
import { cn } from '@/lib/utils';

type InboxTab = 'conversations' | 'calls';

export function ChatInboxPage() {
  const navigate = useNavigate();
  const { threads, loadGroups, connected, loadPresences, currentProfileId } = useChat();
  const [activeTab, setActiveTab] = useState<InboxTab>('conversations');
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [preferences, setPreferences] = useState<Map<string, ChatThreadPreference>>(new Map());
  const [storyCreatorOpen, setStoryCreatorOpen] = useState(false);
  const [viewingStory, setViewingStory] = useState<StoryFeedItem | null>(null);

  // Carregar preferências
  const loadPreferences = useCallback(async () => {
    if (threads.length === 0) return;

    const prefsMap = new Map<string, ChatThreadPreference>();
    await Promise.all(
      threads.map(async (thread) => {
        try {
          const res = await apiHelpers.getThreadPreferences(thread.id);
          if (res.preference) {
            prefsMap.set(thread.id, res.preference);
          }
        } catch {
          // Sem preferências para esta thread
        }
      })
    );
    setPreferences(prefsMap);
  }, [threads]);

  useEffect(() => {
    // loadThreads() já é chamado automaticamente pelo useChat quando conecta
    // Só precisamos carregar os grupos aqui
    if (connected) {
      loadGroups();
    }
  }, [connected, loadGroups]);

  useEffect(() => {
    if (threads.length > 0) {
      loadPreferences();

      // Carregar presenças de todos os participantes DM
      const participantIds: string[] = [];
      for (const thread of threads) {
        if (thread.kind === 'dm') {
          const otherParticipant = thread.participants.find(p => p !== currentProfileId);
          if (otherParticipant && !participantIds.includes(otherParticipant)) {
            participantIds.push(otherParticipant);
          }
        }
      }
      if (participantIds.length > 0) {
        loadPresences(participantIds);
      }
    }
  }, [threads, loadPreferences, currentProfileId, loadPresences]);

  // Separar threads em pinned, regular e archived
  const { pinnedThreads, regularThreads, archivedThreads } = useMemo(() => {
    const pinned: typeof threads = [];
    const regular: typeof threads = [];
    const archived: typeof threads = [];

    for (const thread of threads) {
      const pref = preferences.get(thread.id);
      if (pref?.isArchived) {
        archived.push(thread);
      } else if (pref?.isPinned) {
        pinned.push(thread);
      } else {
        regular.push(thread);
      }
    }

    // Ordenar pinned por pinnedAt (mais recente primeiro)
    pinned.sort((a, b) => {
      const prefA = preferences.get(a.id);
      const prefB = preferences.get(b.id);
      return (prefB?.pinnedAt || 0) - (prefA?.pinnedAt || 0);
    });

    return { pinnedThreads: pinned, regularThreads: regular, archivedThreads: archived };
  }, [threads, preferences]);

  const handlePreferenceChange = () => {
    loadPreferences();
  };

  return (
    <div className="container mx-auto px-0 md:px-4 py-0 md:py-6">
      {/* Stories Bar */}
      <StoriesBar
        onCreateStory={() => setStoryCreatorOpen(true)}
        onViewStories={(_profileId, feedItem) => setViewingStory(feedItem)}
        currentProfileId={currentProfileId}
      />

      {/* Story Modals */}
      {storyCreatorOpen && (
        <StoryCreator onClose={() => setStoryCreatorOpen(false)} />
      )}
      {viewingStory && (
        <StoryViewer
          feedItem={viewingStory}
          onClose={() => setViewingStory(null)}
        />
      )}

      <div className="px-4 mb-4 mt-6">
        {/* Título e botões desktop na mesma linha */}
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold">Chat</h1>

          {/* Botões visíveis apenas no desktop */}
          <div className="hidden md:flex gap-2">
            <ChatSettings />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              title="Buscar mensagens"
            >
              <Search className="h-5 w-5" />
            </Button>

            <Button
              variant="outline"
              onClick={() => setCreateGroupOpen(true)}
            >
              <Users className="mr-2 h-4 w-4" />
              Criar Grupo
            </Button>

            <Button onClick={() => navigate('/app/chat/new')}>
              <MessageSquarePlus className="mr-2 h-4 w-4" />
              Nova conversa
            </Button>
          </div>
        </div>

        {/* Botões em linha própria no mobile */}
        <div className="flex gap-2 md:hidden mb-4">
          <ChatSettings />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(true)}
            title="Buscar mensagens"
          >
            <Search className="h-5 w-5" />
          </Button>

          <Button
            variant="outline"
            onClick={() => setCreateGroupOpen(true)}
            className="flex-1"
          >
            <Users className="mr-2 h-4 w-4" />
            Criar Grupo
          </Button>

          <Button
            onClick={() => navigate('/app/chat/new')}
            className="flex-1"
          >
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            Nova conversa
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('conversations')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'conversations'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
            )}
          >
            <MessageCircle className="h-4 w-4" />
            Conversas
          </button>
          <button
            onClick={() => setActiveTab('calls')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'calls'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
            )}
          >
            <Phone className="h-4 w-4" />
            Chamadas
          </button>
        </div>
      </div>

      {/* Notification Permission Banner */}
      <NotificationPermissionBanner />

      {/* Inicializa push notifications para usuários autenticados */}
      <PushNotificationInitializer />

      {/* Search Modal */}
      <SearchMessages isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      <CreateGroupDialog
        open={createGroupOpen}
        onOpenChange={setCreateGroupOpen}
      />

      {/* Tab Content */}
      {activeTab === 'conversations' && (
        <>
          {!connected && (
            <div className="text-center text-muted-foreground py-8">
              Conectando ao chat...
            </div>
          )}

          {connected && threads.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              Nenhuma conversa ainda
            </div>
          )}

          {/* Threads Fixadas */}
          {pinnedThreads.length > 0 && (
            <div className="mb-4">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
                Fixadas
              </h2>
              <div className="space-y-2">
                {pinnedThreads.map((thread) => (
                  <ThreadItem
                    key={thread.id}
                    thread={thread}
                    onClick={() => navigate(`/app/chat/${thread.id}`)}
                    preference={preferences.get(thread.id)}
                    onPreferenceChange={handlePreferenceChange}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Threads Regulares */}
          {regularThreads.length > 0 && (
            <div className="space-y-2">
              {pinnedThreads.length > 0 && (
                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  Conversas
                </h2>
              )}
              {regularThreads.map((thread) => (
                <ThreadItem
                  key={thread.id}
                  thread={thread}
                  onClick={() => navigate(`/app/chat/${thread.id}`)}
                  preference={preferences.get(thread.id)}
                  onPreferenceChange={handlePreferenceChange}
                />
              ))}
            </div>
          )}

          {/* Seção Arquivadas */}
          {archivedThreads.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <button
                onClick={() => setShowArchived(!showArchived)}
                className="flex items-center gap-2 w-full text-left px-1 py-2 hover:bg-accent rounded-lg transition"
              >
                <Archive className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-sm font-medium text-muted-foreground">
                  Arquivadas ({archivedThreads.length})
                </span>
                {showArchived ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {showArchived && (
                <div className="space-y-2 mt-2">
                  {archivedThreads.map((thread) => (
                    <ThreadItem
                      key={thread.id}
                      thread={thread}
                      onClick={() => navigate(`/app/chat/${thread.id}`)}
                      preference={preferences.get(thread.id)}
                      onPreferenceChange={handlePreferenceChange}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'calls' && <CallHistoryTab />}
    </div>
  );
}
