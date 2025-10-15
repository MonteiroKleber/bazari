import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../hooks/useChat';
import { ThreadItem } from '../../components/chat/ThreadItem';
import { Button } from '../../components/ui/button';
import { MessageSquarePlus, Users } from 'lucide-react';
import { CreateGroupDialog } from '../../components/chat/CreateGroupDialog';

export function ChatInboxPage() {
  const navigate = useNavigate();
  const { threads, loadThreads, loadGroups, connected } = useChat();
  const [createGroupOpen, setCreateGroupOpen] = useState(false);

  useEffect(() => {
    if (connected) {
      loadThreads();
      loadGroups(); // Carregar grupos também
    }
  }, [connected]);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Conversas</h1>

        <div className="flex gap-2">
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

      <CreateGroupDialog
        open={createGroupOpen}
        onOpenChange={setCreateGroupOpen}
      />

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

      <div className="space-y-2">
        {threads.map((thread) => (
          <ThreadItem
            key={thread.id}
            thread={thread}
            onClick={() => navigate(`/app/chat/${thread.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
