import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { api } from '@/lib/api';
import { DeveloperLayout } from '@/layouts/DeveloperLayout';

const CATEGORIES = [
  { id: 'finance', label: 'Finanças', icon: '💰' },
  { id: 'social', label: 'Social', icon: '💬' },
  { id: 'commerce', label: 'Comércio', icon: '🛒' },
  { id: 'tools', label: 'Ferramentas', icon: '🛠️' },
  { id: 'governance', label: 'Governança', icon: '🗳️' },
  { id: 'entertainment', label: 'Entretenimento', icon: '🎮' },
];

const ICONS = ['📱', '🎯', '📊', '🔧', '💎', '🎨', '📈', '🔐', '🌐', '⚡'];

export default function NewAppPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    appId: '',
    slug: '',
    description: '',
    category: '',
    icon: '📱',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await api.post<{ app: { id: string } }>('/developer/apps', formData);
      toast.success('App criado!', {
        description: 'Seu app foi criado com sucesso.',
      });
      navigate(`/app/developer/apps/${response.app.id}`);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error('Erro ao criar app', {
        description: err.message || 'Tente novamente',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setFormData({
      ...formData,
      name,
      slug,
      appId: slug ? `com.bazari.${slug}` : '',
    });
  };

  return (
    <DeveloperLayout
      title="Criar Novo App"
      description="Preencha os dados básicos do seu app"
    >
      <Card>
        <CardHeader>
          <CardDescription>
            Você poderá editar depois.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do App *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Meu App Incrível"
                required
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                Nome que aparecerá na App Store
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="appId">App ID *</Label>
                <Input
                  id="appId"
                  value={formData.appId}
                  onChange={(e) =>
                    setFormData({ ...formData, appId: e.target.value })
                  }
                  placeholder="com.exemplo.meuapp"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Identificador único
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL) *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value.toLowerCase() })
                  }
                  placeholder="meu-app"
                  required
                  pattern="[a-z0-9-]+"
                />
                <p className="text-xs text-muted-foreground">
                  /store/{formData.slug || 'slug'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descreva o que seu app faz em uma ou duas frases..."
                required
                minLength={10}
                maxLength={500}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/500 caracteres
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) =>
                    setFormData({ ...formData, category: v })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ícone</Label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center border transition-colors ${
                        formData.icon === icon
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-accent'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/app/developer')}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Criando...' : 'Criar App'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DeveloperLayout>
  );
}
