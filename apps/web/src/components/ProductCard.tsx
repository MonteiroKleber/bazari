// V-1: Card de Produto para listagens - 2025-09-11
// Component reutilizável para exibir produtos em listas de busca
// Usa tokens de tema, i18n, thumbnail, título, preço e categoria

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Package, Briefcase, Camera } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';

interface ProductMedia {
  id: string;
  url: string;
  mime: string;
}

interface ProductCardProps {
  id: string;
  kind: 'product' | 'service';
  title: string;
  description?: string;
  priceBzr?: string;
  basePriceBzr?: string;
  categoryPath: string[];
  media: ProductMedia[];
  className?: string;
  onClick?: () => void;
}

export function ProductCard({
  id,
  kind,
  title,
  description,
  priceBzr,
  basePriceBzr,
  categoryPath,
  media,
  className = '',
  onClick
}: ProductCardProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  
  const lang = i18n.language?.split('-')[0] || 'pt';
  const currentPrice = priceBzr || basePriceBzr || '0';

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/p/${id}`);
    }
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (isNaN(num)) return '0.00';
    
    return new Intl.NumberFormat(lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es-ES' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(num);
  };

  const getCategoryLabel = () => {
    if (!categoryPath || categoryPath.length === 0) return '';
    
    // Pegar o último nível da categoria (mais específico)
    const lastCategory = categoryPath[categoryPath.length - 1];
    
    // Humanizar o nome da categoria
    return lastCategory
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (m) => m.toUpperCase());
  };

  const getThumbnail = () => {
    // Procurar por primeira imagem
    const firstImage = media.find(m => m.mime.startsWith('image/'));
    return firstImage?.url;
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  };

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow duration-200 ${className}`}
      onClick={handleClick}
    >
      <CardContent className="p-0">
        
        {/* Thumbnail */}
        <div className="aspect-square relative overflow-hidden rounded-t-lg bg-muted">
          {getThumbnail() ? (
            <img
              src={getThumbnail()}
              alt={title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              {kind === 'product' ? (
                <Package className="w-12 h-12 text-muted-foreground" />
              ) : (
                <Briefcase className="w-12 h-12 text-muted-foreground" />
              )}
            </div>
          )}
          
          {/* Badge do tipo no canto superior direito */}
          <div className="absolute top-2 right-2">
            <Badge 
              variant={kind === 'product' ? 'default' : 'secondary'}
              className="text-xs shadow-sm"
            >
              {kind === 'product' ? 
                t('new.product', 'Produto') : 
                t('new.service', 'Serviço')
              }
            </Badge>
          </div>

          {/* Indicador de múltiplas fotos */}
          {media.length > 1 && (
            <div className="absolute bottom-2 right-2">
              <Badge variant="outline" className="text-xs bg-black/50 text-white border-white/20">
                <Camera className="w-3 h-3 mr-1" />
                {media.length}
              </Badge>
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div className="p-4 space-y-3">
          
          {/* Categoria */}
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {getCategoryLabel()}
            </Badge>
          </div>

          {/* Título */}
          <div>
            <h3 className="font-semibold text-base leading-tight">
              {truncateText(title, 50)}
            </h3>
          </div>

          {/* Descrição (opcional, só se há espaço) */}
          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {truncateText(description, 80)}
            </p>
          )}

          {/* Preço */}
          <div className="flex items-end justify-between">
            <div>
              <div className="text-lg font-bold text-primary">
                {formatPrice(currentPrice)} BZR
              </div>
              <div className="text-xs text-muted-foreground">
                {kind === 'service' && t('product.base_price', 'Preço base')}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ProductCard;