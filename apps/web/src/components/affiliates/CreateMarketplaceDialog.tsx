/**
 * Dialog para criar novo marketplace de afiliado
 */

import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { apiHelpers } from '@/lib/api';
import { Loader2 } from 'lucide-react';

interface CreateMarketplaceDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (marketplace: any) => void;
}

export default function CreateMarketplaceDialog({
  open,
  onClose,
  onSuccess,
}: CreateMarketplaceDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    logoUrl: '',
    bannerUrl: '',
    primaryColor: '#7C3AED',
    secondaryColor: '#EC4899',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }

    // Auto-generate slug from name
    if (field === 'name' && !formData.slug) {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50);
      setFormData((prev) => ({ ...prev, slug }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug é obrigatório';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug deve conter apenas letras minúsculas, números e hífens';
    } else if (formData.slug.length < 3) {
      newErrors.slug = 'Slug deve ter pelo menos 3 caracteres';
    }

    if (formData.logoUrl && !isValidUrl(formData.logoUrl)) {
      newErrors.logoUrl = 'URL inválida';
    }

    if (formData.bannerUrl && !isValidUrl(formData.bannerUrl)) {
      newErrors.bannerUrl = 'URL inválida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await apiHelpers.post<{ marketplace: any }>(
        '/api/affiliates/marketplaces',
        {
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          description: formData.description.trim() || undefined,
          logoUrl: formData.logoUrl.trim() || undefined,
          bannerUrl: formData.bannerUrl.trim() || undefined,
          primaryColor: formData.primaryColor,
          secondaryColor: formData.secondaryColor,
        }
      );

      onSuccess(response.marketplace);
    } catch (err: any) {
      console.error('Error creating marketplace:', err);
      if (err.message.includes('Slug already taken')) {
        setErrors({ slug: 'Este slug já está em uso' });
      } else {
        alert('Erro ao criar marketplace: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Marketplace</DialogTitle>
          <DialogDescription>
            Configure seu marketplace pessoal para promover produtos e ganhar comissões
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <Label htmlFor="name">Nome do Marketplace *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Meu Marketplace Incrível"
              disabled={loading}
            />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name}</p>
            )}
          </div>

          {/* Slug */}
          <div>
            <Label htmlFor="slug">Slug (URL) *</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">@</span>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => handleChange('slug', e.target.value)}
                placeholder="meu-marketplace"
                disabled={loading}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Seu marketplace ficará em: /m/{formData.slug || 'seu-slug'}
            </p>
            {errors.slug && (
              <p className="text-sm text-destructive mt-1">{errors.slug}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Descreva o que seu marketplace oferece..."
              rows={3}
              disabled={loading}
            />
            {errors.description && (
              <p className="text-sm text-destructive mt-1">{errors.description}</p>
            )}
          </div>

          {/* Logo URL */}
          <div>
            <Label htmlFor="logoUrl">URL do Logo</Label>
            <Input
              id="logoUrl"
              type="url"
              value={formData.logoUrl}
              onChange={(e) => handleChange('logoUrl', e.target.value)}
              placeholder="https://exemplo.com/logo.png"
              disabled={loading}
            />
            {errors.logoUrl && (
              <p className="text-sm text-destructive mt-1">{errors.logoUrl}</p>
            )}
          </div>

          {/* Banner URL */}
          <div>
            <Label htmlFor="bannerUrl">URL do Banner</Label>
            <Input
              id="bannerUrl"
              type="url"
              value={formData.bannerUrl}
              onChange={(e) => handleChange('bannerUrl', e.target.value)}
              placeholder="https://exemplo.com/banner.png"
              disabled={loading}
            />
            {errors.bannerUrl && (
              <p className="text-sm text-destructive mt-1">{errors.bannerUrl}</p>
            )}
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primaryColor">Cor Primária</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => handleChange('primaryColor', e.target.value)}
                  className="w-16 h-10"
                  disabled={loading}
                />
                <Input
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) => handleChange('primaryColor', e.target.value)}
                  className="flex-1"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="secondaryColor">Cor Secundária</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={formData.secondaryColor}
                  onChange={(e) => handleChange('secondaryColor', e.target.value)}
                  className="w-16 h-10"
                  disabled={loading}
                />
                <Input
                  type="text"
                  value={formData.secondaryColor}
                  onChange={(e) => handleChange('secondaryColor', e.target.value)}
                  className="flex-1"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar Marketplace
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
