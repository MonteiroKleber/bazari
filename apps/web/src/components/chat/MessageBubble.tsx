import { ChatMessage, MediaMetadata } from '@bazari/shared-types';
import { format } from 'date-fns';
import { ChatMediaPreview } from './ChatMediaPreview';
import { ProposalCard } from './ProposalCard';
import { MultiStoreProposalCard } from './MultiStoreProposalCard';
import { useChat } from '@/hooks/useChat';
import { useEffect, useState } from 'react';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isMe = message.from === 'me'; // TODO: comparar com profileId real
  const plaintext = (message as any).plaintext || '[Cifrado]';
  const { proposals, loadProposal, acceptProposal } = useChat();
  const [isAccepting, setIsAccepting] = useState(false);

  // Verificar se é uma proposta
  const isProposal = message.type === 'proposal' && message.meta?.proposalId;
  const proposalId = message.meta?.proposalId;
  const proposal = isProposal && proposalId ? proposals.get(proposalId) : null;

  // Carregar proposta se necessário
  useEffect(() => {
    if (isProposal && !proposal && proposalId) {
      loadProposal(proposalId).catch(console.error);
    }
  }, [isProposal, proposal, proposalId, loadProposal]);

  // Verificar se há mídia
  const hasMedia = message.type !== 'text' && message.type !== 'proposal' && message.mediaCid;
  const mediaMetadata: MediaMetadata | null = hasMedia && message.meta
    ? {
        cid: message.mediaCid!,
        encryptionKey: message.meta.encryptionKey,
        mimetype: message.meta.mimetype || 'application/octet-stream',
        filename: message.meta.filename,
        size: message.meta.size,
        width: message.meta.width,
        height: message.meta.height,
        duration: message.meta.duration,
      }
    : null;

  const handleAcceptProposal = async (proposalId: string) => {
    setIsAccepting(true);
    try {
      await acceptProposal(proposalId);
      return { saleId: undefined, receiptCid: undefined };
    } catch (err) {
      console.error('Failed to accept proposal:', err);
      return { saleId: undefined, receiptCid: undefined };
    } finally {
      setIsAccepting(false);
    }
  };

  const handleAcceptMultiStoreProposal = async () => {
    if (!proposalId) return;
    setIsAccepting(true);
    try {
      const result = await acceptProposal(proposalId);
      return result;
    } catch (err) {
      console.error('Failed to accept proposal:', err);
      throw err;
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] rounded-lg overflow-hidden ${
          hasMedia || isProposal ? '' : 'px-4 py-2'
        } ${
          isMe
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        }`}
      >
        {/* Proposta */}
        {isProposal && proposal && (
          <div className="p-2">
            {proposal.isMultiStore ? (
              <MultiStoreProposalCard
                proposal={proposal}
                onAccept={handleAcceptMultiStoreProposal}
                isSender={isMe}
              />
            ) : (
              <ProposalCard
                proposal={proposal}
                onAccept={handleAcceptProposal}
                isLoading={isAccepting}
                isSender={isMe}
              />
            )}
          </div>
        )}

        {/* Mídia */}
        {mediaMetadata && (
          <div className="mb-2">
            <ChatMediaPreview media={mediaMetadata} />
          </div>
        )}

        {/* Texto */}
        {plaintext && plaintext !== '[Cifrado]' && !isProposal && (
          <p className={`whitespace-pre-wrap break-words ${hasMedia ? 'px-4 py-2' : ''}`}>
            {plaintext}
          </p>
        )}

        {/* Timestamp */}
        {!isProposal && (
          <span className={`text-xs opacity-70 mt-1 block ${hasMedia ? 'px-4 pb-2' : ''}`}>
            {format(message.createdAt, 'HH:mm')}
          </span>
        )}
      </div>
    </div>
  );
}
