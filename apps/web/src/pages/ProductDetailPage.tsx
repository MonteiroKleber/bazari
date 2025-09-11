// V-1: Página de Detalhe do Anúncio (público) - 2025-09-11
// Implementa visualização completa do produto com galeria, características e CTA
// Usa tokens de tema existentes, i18n completo, sem quebrar funcionalidades

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MessageCircle, Share2, Heart, Camera, Play } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { api } from '../lib/api';

interface ProductMedia {
  id: string;
  url: string;
  mime: string;
  size: number;
}

interface ProductDetail {
  id: string;
  kind: 'product' | 'service';
  title: string;
  description: string;
  priceBzr?: string;
  basePriceBzr?: string;
  categoryPath: string[];
  attributes: Record<string, any>;
  media: ProductMedia[];
  daoId: string;
  createdAt: string;
  updatedAt: string;
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const lang = i18n.language?.split('-')[0] || 'pt';

  useEffect(() => {
    if (!id) return;
    
    const loadProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.get<ProductDetail>(`/products/${id}`);
        setProduct(data);
      } catch (err) {
        console.error('Erro ao carregar produto:', err);
        setError(t('errors.not_found', 'Produto não encontrado'));
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id, t]);

  // Função para traduzir nomes de atributos dinamicamente (reutiliza estratégia do DynamicForm)
  const getAttributeLabel = (key: string, value: any) => {
    // 1) Tentar i18n global
    const i18nKey = `new.dynamicFields.${key}.label`;
    const translated = t(i18nKey, '');
    if (translated && translated !== i18nKey) {
      return translated;
    }
    
    // 2) Fallback humanizado
    return key
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, (m) => m.toUpperCase());
  };

  const getAttributeValue = (key: string, value: any) => {
    // Se é uma opção enum, tentar traduzir
    if (typeof value === 'string') {
      const optionKey = `new.dynamicFields.${key}.options.${value}`;
      const translated = t(optionKey, '');
      if (translated && translated !== optionKey) {
        return translated;
      }
    }
    
    // Para boolean, traduzir sim/não
    if (typeof value === 'boolean') {
      return value ? t('common.yes', 'Sim') : t('common.no', 'Não');
    }
    
    // Para outros tipos, retornar como string
    return String(value);
  };

  const getCategoryBreadcrumb = () => {
    if (!product?.categoryPath) return '';
    
    // Humanizar o breadcrumb da categoria (remover prefixo products/services)
    const pathWithoutPrefix = product.categoryPath.slice(1);
    return pathWithoutPrefix
      .map(segment => 
        segment
          .replace(/-/g, ' ')
          .replace(/\b\w/g, m => m.toUpperCase())
      )
      .join(' → ');
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return new Intl.NumberFormat(lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es-ES' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(num);
  };

  const handleContactSeller = () => {
    // TODO: Implementar integração com sistema de mensagens
    alert(t('product.contact_seller_placeholder', 'Funcionalidade em desenvolvimento'));
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.title,
        text: product?.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      // TODO: Mostrar toast de sucesso
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-background pt-16">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-6xl mx-auto">
              <div className="animate-pulse">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="aspect-square bg-muted rounded-lg"></div>
                  <div className="space-y-4">
                    <div className="h-8 bg-muted rounded w-3/4"></div>
                    <div className="h-6 bg-muted rounded w-1/2"></div>
                    <div className="h-20 bg-muted rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error || !product) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-background pt-16">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto text-center">
              <Alert className="mb-6">
                <AlertDescription>
                  {error || t('errors.not_found', 'Produto não encontrado')}
                </AlertDescription>
              </Alert>
              <Button onClick={() => navigate('/search')} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('common.back_to_search', 'Voltar à busca')}
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const images = product.media.filter(m => m.mime.startsWith('image/'));
  const videos = product.media.filter(m => m.mime.startsWith('video/'));
  const currentPrice = product.priceBzr || product.basePriceBzr || '0';

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background pt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            
            {/* Navegação de volta */}
            <div className="mb-6">
              <Button 
                variant="ghost" 
                onClick={() => navigate(-1)}
                className="hover:bg-muted"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('common.back', 'Voltar')}
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              
              {/* Galeria de Mídia */}
              <div className="space-y-4">
                {images.length > 0 || videos.length > 0 ? (
                  <>
                    {/* Imagem/Video principal */}
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                      {images.length > 0 ? (
                        <img
                          src={images[selectedImageIndex]?.url || images[0]?.url}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      ) : videos.length > 0 ? (
                        <div className="relative w-full h-full flex items-center justify-center bg-muted">
                          <Play className="w-16 h-16 text-muted-foreground" />
                          <span className="absolute bottom-4 left-4 text-sm text-white bg-black/50 px-2 py-1 rounded">
                            {t('product.video', 'Vídeo')}
                          </span>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <Camera className="w-16 h-16 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Miniaturas */}
                    {(images.length > 1 || videos.length > 0) && (
                      <div className="grid grid-cols-4 gap-2">
                        {images.map((img, index) => (
                          <button
                            key={img.id}
                            onClick={() => setSelectedImageIndex(index)}
                            className={`aspect-square rounded border-2 overflow-hidden ${
                              index === selectedImageIndex 
                                ? 'border-primary' 
                                : 'border-muted hover:border-muted-foreground'
                            }`}
                          >
                            <img 
                              src={img.url} 
                              alt={`${product.title} ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                        {videos.map((video, index) => (
                          <div 
                            key={video.id}
                            className="aspect-square rounded border-2 border-muted bg-muted flex items-center justify-center cursor-pointer hover:border-muted-foreground"
                          >
                            <Play className="w-6 h-6 text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Camera className="w-16 h-16 mx-auto mb-2" />
                      <p>{t('product.no_images', 'Sem imagens')}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Informações Principais */}
              <div className="space-y-6">
                
                {/* Título e Categoria */}
                <div>
                  <div className="mb-2">
                    <Badge variant="outline" className="text-xs">
                      {getCategoryBreadcrumb()}
                    </Badge>
                  </div>
                  <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
                  <div className="text-2xl font-semibold text-primary">
                    {formatPrice(currentPrice)} BZR
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {product.kind === 'product' ? 
                      t('product.type_product', 'Produto') : 
                      t('product.type_service', 'Serviço')
                    }
                  </div>
                </div>

                {/* Descrição */}
                {product.description && (
                  <div>
                    <h3 className="font-semibold mb-2">{t('product.description', 'Descrição')}</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {product.description}
                    </p>
                  </div>
                )}

                {/* CTA Principal */}
                <div className="space-y-3">
                  <Button 
                    onClick={handleContactSeller}
                    size="lg"
                    className="w-full"
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    {t('product.contact_seller', 'Falar com vendedor')}
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleShare} className="flex-1">
                      <Share2 className="w-4 h-4 mr-2" />
                      {t('product.share', 'Compartilhar')}
                    </Button>
                    <Button variant="outline" size="icon">
                      <Heart className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Informações do Vendedor */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {t('product.seller_info', 'Informações do Vendedor')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <p><strong>DAO:</strong> {product.daoId}</p>
                      <p><strong>{t('product.published_at', 'Publicado em')}:</strong> {' '}
                        {new Date(product.createdAt).toLocaleDateString(
                          lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es-ES' : 'en-US'
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Características Específicas */}
            {Object.keys(product.attributes || {}).length > 0 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>{t('product.characteristics', 'Características')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {Object.entries(product.attributes).map(([key, value]) => (
                      <div key={key} className="flex justify-between border-b border-muted pb-2">
                        <span className="text-muted-foreground">
                          {getAttributeLabel(key, value)}:
                        </span>
                        <span className="font-medium">
                          {getAttributeValue(key, value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}