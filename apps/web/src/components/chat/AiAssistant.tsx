import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, Languages, Mic, Volume2, Sparkles, X } from 'lucide-react';
import api from '@/lib/api';
import { getAccessToken } from '@/modules/auth/session';

interface AiAssistantProps {
  threadId: string;
  messages?: Array<{ plaintext?: string; senderId: string }>;
  currentUserId?: string;
  onInsertText?: (text: string) => void;
  onClose?: () => void;
}

export function AiAssistant({ threadId, messages, currentUserId, onInsertText, onClose }: AiAssistantProps) {
  const [activeFeature, setActiveFeature] = useState<'translate' | 'suggest' | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // Tradução
  const [translateText, setTranslateText] = useState('');
  const [sourceLang, setSourceLang] = useState('pt');
  const [targetLang, setTargetLang] = useState('en');

  // Sugestões
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleTranslate = async () => {
    if (!translateText.trim()) return;

    setLoading(true);
    try {
      const token = getAccessToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/ai/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          text: translateText,
          sourceLang,
          targetLang,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data.translatedText);
      } else {
        setResult('Erro na tradução');
      }
    } catch (error) {
      console.error('Translation error:', error);
      setResult('Erro ao conectar com o serviço de IA');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggest = async () => {
    setLoading(true);
    setSuggestions([]);
    setResult(null);

    try {
      // Validar threadId
      console.log('[AiAssistant] Starting suggest. threadId:', threadId);

      if (!threadId || threadId.trim() === '') {
        console.error('[AiAssistant] ❌ threadId is empty or undefined');
        setResult('Erro: ID da conversa não encontrado');
        setLoading(false);
        return;
      }

      // Pegar as últimas 10 mensagens da conversa real
      const conversationHistory = (messages || [])
        .filter(msg => msg.plaintext) // Apenas mensagens descriptografadas
        .slice(-10) // Últimas 10 mensagens
        .map(msg => msg.plaintext!);

      console.log('[AiAssistant] Conversation history:', conversationHistory);

      // Se não houver mensagens, usar histórico genérico
      if (conversationHistory.length === 0) {
        console.warn('[AiAssistant] No messages in conversation, using generic context');
        conversationHistory.push('Iniciando conversa...');
      }

      const token = getAccessToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const payload = {
        threadId,
        conversationHistory,
      };

      console.log('[AiAssistant] Request details:', {
        url: `${apiUrl}/api/chat/ai/suggest`,
        hasToken: !!token,
        payload,
      });

      const response = await fetch(`${apiUrl}/api/chat/ai/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(payload),
      });

      console.log('[AiAssistant] Response status:', response.status);
      console.log('[AiAssistant] Response headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log('[AiAssistant] Response data:', data);

      if (!response.ok) {
        console.error('[AiAssistant] ❌ Request failed with status:', response.status);
        const errorMsg = data.error || `Erro ${response.status}`;
        const details = data.details ? JSON.stringify(data.details, null, 2) : '';
        setResult(`${errorMsg}\n${details}`);
        return;
      }

      if (data.success && data.data?.suggestions) {
        console.log('[AiAssistant] ✅ Got suggestions:', data.data.suggestions);
        setSuggestions(data.data.suggestions);
        setResult(null);
      } else {
        console.error('[AiAssistant] ❌ Invalid response format:', data);
        setResult(data.error || 'Erro: resposta inválida do servidor');
      }
    } catch (error: any) {
      console.error('[AiAssistant] ❌ Exception:', error);
      setResult(`Erro ao conectar: ${error.message || 'Desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUseSuggestion = (text: string) => {
    onInsertText?.(text);
    setActiveFeature(null);
  };

  const handleUseTranslation = () => {
    if (result) {
      onInsertText?.(result);
      setActiveFeature(null);
    }
  };

  return (
    <div className="border rounded-lg bg-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <h3 className="font-semibold">Assistente IA</h3>
          <span className="text-xs bg-muted px-2 py-0.5 rounded">OSS Local</span>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Feature Selector */}
      {!activeFeature && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-auto py-3 flex-col gap-2"
            onClick={() => setActiveFeature('translate')}
          >
            <Languages className="h-5 w-5" />
            <span className="text-sm">Traduzir</span>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-3 flex-col gap-2"
            onClick={() => {
              setActiveFeature('suggest');
              handleSuggest();
            }}
          >
            <Sparkles className="h-5 w-5" />
            <span className="text-sm">Sugerir Resposta</span>
          </Button>

          <Button variant="outline" className="h-auto py-3 flex-col gap-2" disabled>
            <Mic className="h-5 w-5" />
            <span className="text-sm">Transcrever Áudio</span>
            <span className="text-xs text-muted-foreground">(Em breve)</span>
          </Button>

          <Button variant="outline" className="h-auto py-3 flex-col gap-2" disabled>
            <Volume2 className="h-5 w-5" />
            <span className="text-sm">Texto para Fala</span>
            <span className="text-xs text-muted-foreground">(Em breve)</span>
          </Button>
        </div>
      )}

      {/* Translate Feature */}
      {activeFeature === 'translate' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="pt">Português</option>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
            </select>
            <span className="py-2">→</span>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="en">English</option>
              <option value="pt">Português</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
            </select>
          </div>

          <textarea
            value={translateText}
            onChange={(e) => setTranslateText(e.target.value)}
            placeholder="Digite o texto para traduzir..."
            className="w-full px-3 py-2 border rounded-md min-h-[80px]"
          />

          <Button onClick={handleTranslate} disabled={loading} className="w-full">
            {loading ? 'Traduzindo...' : 'Traduzir'}
          </Button>

          {result && (
            <div className="space-y-2">
              <div className="p-3 bg-muted rounded-md">
                <p>{result}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUseTranslation} size="sm" className="flex-1">
                  Usar tradução
                </Button>
                <Button
                  onClick={() => {
                    setActiveFeature(null);
                    setResult(null);
                  }}
                  size="sm"
                  variant="outline"
                >
                  Voltar
                </Button>
              </div>
            </div>
          )}

          {!result && (
            <Button
              onClick={() => setActiveFeature(null)}
              variant="outline"
              className="w-full"
            >
              Voltar
            </Button>
          )}
        </div>
      )}

      {/* Suggest Feature */}
      {activeFeature === 'suggest' && (
        <div className="space-y-3">
          {loading && <p className="text-center text-sm text-muted-foreground">Gerando sugestões...</p>}

          {!loading && suggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Sugestões de resposta:</p>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleUseSuggestion(suggestion)}
                  className="w-full p-3 text-left border rounded-md hover:bg-muted transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {!loading && suggestions.length === 0 && result && (
            <p className="text-center text-sm text-muted-foreground">{result}</p>
          )}

          <Button onClick={() => setActiveFeature(null)} variant="outline" className="w-full">
            Voltar
          </Button>
        </div>
      )}
    </div>
  );
}
