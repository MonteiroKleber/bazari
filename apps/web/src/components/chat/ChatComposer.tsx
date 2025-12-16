import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Send, Bot, Plus, ClipboardList, Image as ImageIcon, Smile, X, Check } from 'lucide-react';
import { MediaMetadata } from '@bazari/shared-types';
import { ChatMediaPreview } from './ChatMediaPreview';
import { ReplyPreview } from './ReplyPreview';
import { AiAssistant } from './AiAssistant';
import { FormattingToolbar, applyFormatting, getFormattingShortcut, FormatType } from './FormattingToolbar';
import { GifPicker } from './GifPicker';
import { VoiceRecorder } from './VoiceRecorder';
import { apiHelpers } from '../../lib/api';
import { useChat } from '@/hooks/useChat';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { TooltipProvider } from '../ui/tooltip';

interface ReplyingToMessage {
  id: string;
  from: string;
  senderName: string;
  plaintext?: string;
  type: string;
}

interface EditingMessage {
  id: string;
  plaintext: string;
}

interface ChatComposerProps {
  threadId: string;
  messages?: Array<{ plaintext?: string; senderId: string }>;
  currentUserId?: string;
  onSend: (text: string, media?: MediaMetadata, replyToId?: string) => void;
  onCreateProposal?: () => void;
  replyingTo?: ReplyingToMessage | null;
  onCancelReply?: () => void;
  editingMessage?: EditingMessage | null;
  onCancelEdit?: () => void;
  onSaveEdit?: (messageId: string, newText: string) => void;
}

export function ChatComposer({ threadId, messages, currentUserId, onSend, onCreateProposal, replyingTo, onCancelReply, editingMessage, onCancelEdit, onSaveEdit }: ChatComposerProps) {
  const [text, setText] = useState('');
  const [media, setMedia] = useState<MediaMetadata | null>(null);
  const isEditing = !!editingMessage;
  const [uploading, setUploading] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [showFormatting, setShowFormatting] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [voiceRecorderKey, setVoiceRecorderKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { sendTypingStart, sendTypingStop } = useChat();

  // Quando entra em modo de edição, carrega o texto original
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.plaintext);
      // Focar no textarea
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(
          editingMessage.plaintext.length,
          editingMessage.plaintext.length
        );
      }, 0);
    }
  }, [editingMessage]);

  const handleSubmit = () => {
    // Se está editando, salva a edição
    if (isEditing && editingMessage && onSaveEdit) {
      if (!text.trim()) return;
      onSaveEdit(editingMessage.id, text.trim());
      setText('');
      return;
    }

    // Envio normal
    if (!text.trim() && !media) return;
    sendTypingStop(threadId);
    onSend(text, media || undefined, replyingTo?.id);
    setText('');
    setMedia(null);
    onCancelReply?.();
  };

  const handleCancelEditing = () => {
    setText('');
    onCancelEdit?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Escape cancela edição
    if (e.key === 'Escape' && isEditing) {
      e.preventDefault();
      handleCancelEditing();
      return;
    }

    // Verificar atalhos de formatação
    const formatType = getFormattingShortcut(e);
    if (formatType) {
      e.preventDefault();
      handleFormat(formatType);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Handler para aplicar formatação
  const handleFormat = useCallback((type: FormatType) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    const { newText, newCursorStart, newCursorEnd } = applyFormatting(
      text,
      selectionStart,
      selectionEnd,
      type
    );

    setText(newText);

    // Restaurar foco e posição do cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorStart, newCursorEnd);
    }, 0);
  }, [text]);

  // Enviar typing indicator quando o usuário digita
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setText(newValue);

    // Enviar typing:start se há texto
    if (newValue.trim()) {
      sendTypingStart(threadId);
    } else {
      sendTypingStop(threadId);
    }
  }, [threadId, sendTypingStart, sendTypingStop]);

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

  // Handler para selecionar GIF
  const handleGifSelect = (gif: { id: string; full: { url: string; width: number; height: number } }) => {
    // Enviar GIF como mensagem de imagem
    const gifMedia: MediaMetadata = {
      cid: gif.full.url, // URL do GIF (não IPFS)
      encryptionKey: '', // GIFs não são criptografados
      mimetype: 'image/gif',
      filename: `gif-${gif.id}.gif`,
      width: gif.full.width,
      height: gif.full.height,
    };

    // Enviar diretamente
    onSend('', gifMedia, replyingTo?.id);
    onCancelReply?.();
    setShowGifPicker(false);
  };

  // Handler para gravação de áudio completada
  const handleVoiceRecordingComplete = async (audioBlob: Blob, duration: number) => {
    try {
      setUploading(true);

      // Criar File a partir do Blob
      const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, {
        type: 'audio/webm',
      });

      // Upload via API
      const result = await apiHelpers.uploadChatMedia(audioFile);

      // Criar metadata com duração
      const audioMedia: MediaMetadata = {
        cid: result.cid,
        encryptionKey: result.encryptionKey,
        mimetype: result.mimetype || 'audio/webm',
        filename: result.filename,
        size: result.size,
        duration: duration,
      };

      // Enviar diretamente
      onSend('', audioMedia, replyingTo?.id);
      onCancelReply?.();
      // Reset VoiceRecorder após envio
      setVoiceRecorderKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to upload voice message:', error);
      alert('Falha ao enviar mensagem de voz');
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

      {/* Reply Preview */}
      {replyingTo && onCancelReply && !isEditing && (
        <ReplyPreview
          senderName={replyingTo.senderName}
          plaintext={replyingTo.plaintext}
          type={replyingTo.type}
          onCancel={onCancelReply}
        />
      )}

      {/* Edit Mode Banner */}
      {isEditing && editingMessage && (
        <div className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded-lg border-l-4 border-yellow-500 animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400 truncate">
              Editando mensagem
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {editingMessage.plaintext.length > 50
                ? editingMessage.plaintext.slice(0, 50) + '...'
                : editingMessage.plaintext}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={handleCancelEditing}
            title="Cancelar edição (Esc)"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
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
      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,video/*,audio/*,application/pdf"
          onChange={handleFileSelect}
        />

        {/* Linha de botões de ação (esconder no modo edição) */}
        {!isEditing && (
          <div className="flex items-center gap-1 relative">
            {/* Dropdown Menu [+] */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Ações">
                  <Plus className="h-4 w-4" />
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
              className={`h-8 w-8 ${showAiAssistant ? 'bg-accent' : ''}`}
              onClick={() => setShowAiAssistant(!showAiAssistant)}
              title="Assistente IA"
            >
              <Bot className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${showGifPicker ? 'bg-accent' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowGifPicker(!showGifPicker);
              }}
              title="Enviar GIF"
            >
              <Smile className="h-4 w-4" />
            </Button>

            {/* GIF Picker - posicionado fixo na tela */}
            <GifPicker
              isOpen={showGifPicker}
              onClose={() => setShowGifPicker(false)}
              onSelect={handleGifSelect}
            />

            {/* Barra de formatação (ao lado dos botões) */}
            {showFormatting && (
              <div className="ml-2 border-l pl-2">
                <TooltipProvider>
                  <FormattingToolbar
                    onFormat={handleFormat}
                    compact
                  />
                </TooltipProvider>
              </div>
            )}
          </div>
        )}

        {/* Linha do textarea + botão enviar */}
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowFormatting(true)}
            onBlur={() => setTimeout(() => setShowFormatting(false), 200)}
            placeholder={isEditing ? "Edite sua mensagem..." : "Digite uma mensagem..."}
            className="resize-none flex-1 min-h-[40px]"
            rows={1}
          />

          {/* Mostrar botão Send/Save ou VoiceRecorder baseado no conteúdo e modo */}
          {isEditing ? (
            <Button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="h-10 bg-yellow-600 hover:bg-yellow-700"
              title="Salvar edição"
            >
              <Check className="h-4 w-4" />
            </Button>
          ) : text.trim() || media ? (
            <Button onClick={handleSubmit} disabled={uploading} className="h-10">
              <Send className="h-4 w-4" />
            </Button>
          ) : (
            <VoiceRecorder
              key={voiceRecorderKey}
              onRecordingComplete={handleVoiceRecordingComplete}
              onCancel={() => {}}
              maxDuration={120}
            />
          )}
        </div>
      </div>
    </div>
  );
}
