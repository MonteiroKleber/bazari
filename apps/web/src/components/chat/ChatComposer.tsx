import { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Send, Paperclip, Bot, Plus, ClipboardList, Image as ImageIcon } from 'lucide-react';
import { MediaMetadata } from '@bazari/shared-types';
import { ChatMediaPreview } from './ChatMediaPreview';
import { AiAssistant } from './AiAssistant';
import { apiHelpers } from '../../lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface ChatComposerProps {
  threadId: string;
  messages?: Array<{ plaintext?: string; senderId: string }>;
  currentUserId?: string;
  onSend: (text: string, media?: MediaMetadata) => void;
  onCreateProposal?: () => void;
}

export function ChatComposer({ threadId, messages, currentUserId, onSend, onCreateProposal }: ChatComposerProps) {
  const [text, setText] = useState('');
  const [media, setMedia] = useState<MediaMetadata | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (!text.trim() && !media) return;
    onSend(text, media || undefined);
    setText('');
    setMedia(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    const allowedTypes = ['image/', 'video/', 'audio/', 'application/pdf'];
    const isAllowed = allowedTypes.some(type => file.type.startsWith(type));

    if (!isAllowed) {
      alert('Tipo de arquivo não permitido');
      return;
    }

    // Validar tamanho (50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo: 50MB');
      return;
    }

    try {
      setUploading(true);

      // Upload via API
      const result = await apiHelpers.uploadChatMedia(file);

      // Criar metadata
      const mediaMetadata: MediaMetadata = {
        cid: result.cid,
        encryptionKey: result.encryptionKey,
        mimetype: result.mimetype,
        filename: result.filename,
        size: result.size,
      };

      setMedia(mediaMetadata);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Falha ao fazer upload do arquivo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* AI Assistant Panel */}
      {showAiAssistant && (
        <AiAssistant
          threadId={threadId}
          messages={messages}
          currentUserId={currentUserId}
          onInsertText={(insertedText) => setText(insertedText)}
          onClose={() => setShowAiAssistant(false)}
        />
      )}

      {/* Media Preview */}
      {media && (
        <div className="px-2">
          <ChatMediaPreview
            media={media}
            onRemove={() => setMedia(null)}
            showRemove
          />
        </div>
      )}

      {/* Composer */}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,video/*,audio/*,application/pdf"
          onChange={handleFileSelect}
        />

        {/* Dropdown Menu [+] */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" title="Ações">
              <Plus className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {onCreateProposal && (
              <DropdownMenuItem onClick={onCreateProposal}>
                <ClipboardList className="mr-2 h-4 w-4" />
                Criar Proposta
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <ImageIcon className="mr-2 h-4 w-4" />
              Enviar Mídia
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Anexar arquivo"
        >
          {uploading ? (
            <span className="text-xs">...</span>
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowAiAssistant(!showAiAssistant)}
          title="Assistente IA"
          className={showAiAssistant ? 'bg-accent' : ''}
        >
          <Bot className="h-4 w-4" />
        </Button>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite uma mensagem..."
          className="resize-none"
          rows={1}
        />

        <Button onClick={handleSubmit} disabled={(!text.trim() && !media) || uploading}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
