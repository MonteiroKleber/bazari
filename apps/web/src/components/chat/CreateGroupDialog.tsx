import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useChat } from '@/hooks/useChat';
import { toast } from 'sonner';
import { Users } from 'lucide-react';

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGroupDialog({ open, onOpenChange }: CreateGroupDialogProps) {
  const navigate = useNavigate();
  const { createGroup, loadThreads } = useChat();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    kind: 'community' as 'community' | 'channel' | 'private',
    isPublic: true,
    maxMembers: 500,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Nome do grupo é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const groupId = await createGroup({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        kind: formData.kind,
        isPublic: formData.isPublic,
        maxMembers: formData.maxMembers,
      });

      toast.success('Grupo criado com sucesso!');
      onOpenChange(false);

      // Reset form
      setFormData({
        name: '',
        description: '',
        kind: 'community',
        isPublic: true,
        maxMembers: 500,
      });

      // Recarregar threads para ver o novo grupo
      await loadThreads();

      toast.info('Grupo criado! Carregando...');
    } catch (error: any) {
      console.error('Error creating group:', error);
      toast.error(error?.message || 'Erro ao criar grupo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Criar Novo Grupo
          </DialogTitle>
          <DialogDescription>
            Crie um grupo para conversar com várias pessoas ao mesmo tempo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome do Grupo */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Grupo *</Label>
            <Input
              id="name"
              placeholder="Ex: Equipe de Desenvolvimento"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={loading}
              maxLength={100}
              autoFocus
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descreva o propósito do grupo..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={loading}
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Tipo de Grupo */}
          <div className="space-y-2">
            <Label htmlFor="kind">Tipo de Grupo</Label>
            <Select
              value={formData.kind}
              onValueChange={(value: any) => setFormData({ ...formData, kind: value })}
              disabled={loading}
            >
              <SelectTrigger id="kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="community">
                  <div>
                    <div className="font-medium">Comunidade</div>
                    <div className="text-xs text-muted-foreground">
                      Grupo aberto para conversas em geral
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="channel">
                  <div>
                    <div className="font-medium">Canal</div>
                    <div className="text-xs text-muted-foreground">
                      Para anúncios e comunicados
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="private">
                  <div>
                    <div className="font-medium">Privado</div>
                    <div className="text-xs text-muted-foreground">
                      Apenas por convite
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Público/Privado */}
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="isPublic">Grupo Público</Label>
              <div className="text-xs text-muted-foreground">
                Qualquer pessoa pode encontrar e entrar
              </div>
            </div>
            <Switch
              id="isPublic"
              checked={formData.isPublic}
              onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
              disabled={loading}
            />
          </div>

          {/* Limite de Membros */}
          <div className="space-y-2">
            <Label htmlFor="maxMembers">Limite de Membros</Label>
            <Input
              id="maxMembers"
              type="number"
              min={2}
              max={10000}
              value={formData.maxMembers}
              onChange={(e) => setFormData({ ...formData, maxMembers: parseInt(e.target.value) || 500 })}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Número máximo de pessoas no grupo (2-10000)
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.name.trim()}>
              {loading ? 'Criando...' : 'Criar Grupo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
