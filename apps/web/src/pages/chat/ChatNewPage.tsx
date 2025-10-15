import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useChat } from '../../hooks/useChat';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

export function ChatNewPage() {
  const navigate = useNavigate();
  const { createDm } = useChat();
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!handle.trim()) {
      toast.error('Digite um handle');
      return;
    }

    setLoading(true);
    try {
      // Remove @ se tiver
      const cleanHandle = handle.trim().replace(/^@/, '');

      // Buscar perfil pelo handle para pegar o ID
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/api/profiles/${cleanHandle}`);

      if (!response.ok) {
        toast.error('Usuário não encontrado');
        return;
      }

      const profile = await response.json();

      if (!profile?.profile?.id) {
        toast.error('Usuário não encontrado');
        return;
      }

      const threadId = await createDm(profile.profile.id);
      navigate(`/app/chat/${threadId}`);
    } catch (error: any) {
      console.error('Error creating DM:', error);
      toast.error(error?.message || 'Erro ao criar conversa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/app/chat')}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Nova Conversa</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="handle" className="text-sm font-medium">
                Handle do usuário
              </label>
              <Input
                id="handle"
                type="text"
                placeholder="@usuario"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                disabled={loading}
                className="mt-1"
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">
                Digite o handle (com ou sem @) da pessoa com quem deseja conversar
              </p>
            </div>

            <Button type="submit" disabled={loading || !handle.trim()} className="w-full">
              {loading ? 'Criando...' : 'Iniciar Conversa'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
