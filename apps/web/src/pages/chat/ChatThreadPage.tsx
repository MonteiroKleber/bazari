import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useChat } from '../../hooks/useChat';
import { MessageList } from '../../components/chat/MessageList';
import { ChatComposer } from '../../components/chat/ChatComposer';
import { Button } from '../../components/ui/button';
import { ArrowLeft, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MediaMetadata } from '@bazari/shared-types';
import { CreateProposalDialog } from '../../components/chat/CreateProposalDialog';

export function ChatThreadPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const { messages, threads, setActiveThread, sendMessage, loadMessages, currentProfileId } = useChat();
  const [showProposalDialog, setShowProposalDialog] = useState(false);

  // Encontrar thread atual
  const currentThread = threads.find(t => t.id === threadId);

  const threadMessages = threadId ? messages.get(threadId) || [] : [];

  useEffect(() => {
    if (threadId) {
      setActiveThread(threadId);
      loadMessages(threadId);
    }

    return () => setActiveThread(null);
  }, [threadId]);

  const handleSend = async (text: string, media?: MediaMetadata) => {
    if (!threadId) return;
    await sendMessage(threadId, text, media);
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app/chat')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">
            {currentThread?.kind === 'group' ? 'Grupo' : 'Conversa'}
          </h1>
        </div>

        {/* Botão Administrar (apenas para grupos) */}
        {currentThread?.kind === 'group' && currentThread.groupId && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/app/chat/group/${currentThread.groupId}/admin`)}
            title="Administrar Grupo"
          >
            <Settings className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={threadMessages} />
      </div>

      {/* Composer */}
      <div className="border-t p-4">
        <ChatComposer
          threadId={threadId || ''}
          messages={threadMessages as unknown as Array<{ plaintext?: string; senderId: string }>}
          currentUserId={currentProfileId || undefined}
          onSend={handleSend}
          onCreateProposal={() => setShowProposalDialog(true)}
        />
      </div>

      {/* Proposal Dialog */}
      {threadId && (
        <CreateProposalDialog
          open={showProposalDialog}
          onOpenChange={setShowProposalDialog}
          threadId={threadId}
        />
      )}
    </div>
  );
}
