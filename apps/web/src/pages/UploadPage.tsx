// V-1: Página de Upload (vinculada a produto) - 2025-09-11
// Permite adicionar mídias a um produto existente usando UploadForm
// Integra com API /media/upload, mostra lista anexada, link para ver anúncio

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Eye, Upload, CheckCircle, X, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { UploadForm } from '../components/UploadForm';
import { api } from '../lib/api';

interface ProductMedia {
  id: string;
  url: string;
  mime: string;
  size: number;
}

interface Product {
  id: string;
  title: string;
  kind: 'product' | 'service';
  media: ProductMedia[];
}

interface UploadedFile {
  file: File;
  preview: string;
  mediaId?: string;
  uploading?: boolean;
  error?: string;
}

export function UploadPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!productId) return;
    
    const loadProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.get<Product>(`/products/${productId}`);
        setProduct(data);
      } catch (err) {
        console.error('Erro ao carregar produto:', err);
        setError(t('errors.not_found', 'Produto não encontrado'));
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [productId, t]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (!files.length) return;

    // Validação: máximo 10 arquivos total
    const currentCount = (product?.media?.length || 0) + uploadedFiles.length;
    if (currentCount + files.length > 10) {
      setError(t('new.max_files_error', 'Máximo de 10 arquivos permitidos'));
      return;
    }

    // Criar previews e adicionar à lista
    const newFiles: UploadedFile[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    
    setUploadedFiles([...uploadedFiles, ...newFiles]);
    setError(null);

    // Upload automático em background
    for (const fileObj of newFiles) {
      uploadFile(fileObj);
    }
  };

  const uploadFile = async (fileObj: UploadedFile) => {
    try {
      // Marcar como uploading
      setUploadedFiles(prev => prev.map(f => 
        f === fileObj ? { ...f, uploading: true } : f
      ));

      // Upload com entityType e entityId
      const formData = new FormData();
      formData.append('file', fileObj.file);
      formData.append('entityType', 'product');
      formData.append('entityId', productId!);

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      // Atualizar com mediaId
      setUploadedFiles(prev => prev.map(f => 
        f === fileObj ? { ...f, mediaId: result.id, uploading: false } : f
      ));

      // Recarregar dados do produto para atualizar lista de mídias
      if (productId) {
        const updatedProduct = await api.get<Product>(`/products/${productId}`);
        setProduct(updatedProduct);
      }

    } catch (err) {
      console.error('Erro no upload:', err);
      // Marcar erro
      setUploadedFiles(prev => prev.map(f => 
        f === fileObj ? { 
          ...f, 
          error: t('new.upload_error', 'Erro no upload'), 
          uploading: false 
        } : f
      ));
    }
  };

  const removeFile = (index: number) => {
    const file = uploadedFiles[index];
    URL.revokeObjectURL(file.preview);
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const retryUpload = (index: number) => {
    const file = uploadedFiles[index];
    if (file.error) {
      setUploadedFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, error: undefined } : f
      ));
      uploadFile(file);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-1/3 mb-6"></div>
              <div className="h-40 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background pt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <Alert className="mb-6">
              <AlertDescription>
                {error || t('errors.not_found', 'Produto não encontrado')}
              </AlertDescription>
            </Alert>
            <Button onClick={() => navigate('/app/new')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back', 'Voltar')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const successUploads = uploadedFiles.filter(f => f.mediaId).length;
  const pendingUploads = uploadedFiles.filter(f => f.uploading).length;
  const errorUploads = uploadedFiles.filter(f => f.error).length;

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate(-1)}
                className="hover:bg-muted"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('common.back', 'Voltar')}
              </Button>
              
              <div>
                <h1 className="text-2xl font-bold">
                  {t('upload.page_title', 'Adicionar Fotos')}
                </h1>
                <p className="text-muted-foreground">
                  {product.title}
                </p>
              </div>
            </div>

            {/* Link para ver anúncio */}
            <div className="flex gap-3">
              <Link to={`/p/${product.id}`}>
                <Button variant="outline">
                  <Eye className="w-4 h-4 mr-2" />
                  {t('upload.view_listing', 'Ver anúncio')}
                </Button>
              </Link>
              
              <Badge variant="secondary">
                {product.kind === 'product' ? 
                  t('new.product', 'Produto') : 
                  t('new.service', 'Serviço')
                }
              </Badge>
            </div>
          </div>

          {/* Status das mídias atuais */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">
                {t('upload.current_media', 'Mídias Atuais')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {product.media.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {product.media.map((media, index) => (
                    <div key={media.id} className="relative">
                      {media.mime.startsWith('image/') ? (
                        <img
                          src={media.url}
                          alt={`${product.title} ${index + 1}`}
                          className="w-full aspect-square object-cover rounded border"
                        />
                      ) : (
                        <div className="w-full aspect-square flex items-center justify-center bg-muted rounded border">
                          <Upload className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="text-xs">
                          {formatFileSize(media.size)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Upload className="w-12 h-12 mx-auto mb-3" />
                  <p>{t('upload.no_media', 'Nenhuma mídia anexada ainda')}</p>
                </div>
              )}
              
              <div className="mt-4 text-sm text-muted-foreground">
                {t('upload.media_count', {
                  count: product.media.length,
                  max: 10
                }, '{{count}} de 10 mídias')}
              </div>
            </CardContent>
          </Card>

          {/* Upload Zone */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">
                {t('upload.add_more', 'Adicionar Mais Mídias')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              
              {/* Input de arquivo */}
              <div className="mb-6">
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  disabled={product.media.length >= 10}
                />
                <label
                  htmlFor="file-upload"
                  className={`cursor-pointer flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-lg transition-colors ${
                    product.media.length >= 10 
                      ? 'border-muted bg-muted/30 cursor-not-allowed' 
                      : 'border-muted-foreground/25 hover:border-primary hover:bg-muted/50'
                  }`}
                >
                  <Upload className="w-12 h-12 text-muted-foreground" />
                  <div className="text-center">
                    <p className="font-medium">
                      {product.media.length >= 10 
                        ? t('upload.limit_reached', 'Limite de 10 mídias atingido')
                        : t('new.click_to_upload', 'Clique para enviar arquivos')
                      }
                    </p>
                    {product.media.length < 10 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('upload.supported_formats', 'Suporta: JPG, PNG, GIF, MP4 (máx 10MB cada)')}
                      </p>
                    )}
                  </div>
                </label>
              </div>

              {/* Preview dos novos uploads */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium">
                    {t('upload.new_uploads', 'Novos Uploads')}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                        
                        {/* Preview */}
                        <div className="w-16 h-16 flex-shrink-0">
                          <img
                            src={file.preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover rounded"
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{file.file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(file.file.size)}
                          </p>
                          
                          {/* Status */}
                          {file.uploading && (
                            <div className="flex items-center gap-2 mt-1">
                              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                              <span className="text-sm text-muted-foreground">
                                {t('upload.uploading', 'Enviando...')}
                              </span>
                            </div>
                          )}
                          
                          {file.mediaId && (
                            <div className="flex items-center gap-2 mt-1 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-sm">
                                {t('upload.success', 'Enviado com sucesso')}
                              </span>
                            </div>
                          )}
                          
                          {file.error && (
                            <div className="flex items-center gap-2 mt-1 text-red-600">
                              <X className="w-4 h-4" />
                              <span className="text-sm">{file.error}</span>
                            </div>
                          )}
                        </div>

                        {/* Ações */}
                        <div className="flex gap-2">
                          {file.error && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => retryUpload(index)}
                            >
                              {t('upload.retry', 'Tentar novamente')}
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeFile(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Resumo */}
                  <div className="flex items-center gap-4 text-sm">
                    {successUploads > 0 && (
                      <span className="text-green-600">
                        ✓ {successUploads} {t('upload.success_count', 'enviado(s)')}
                      </span>
                    )}
                    {pendingUploads > 0 && (
                      <span className="text-blue-600">
                        ⏳ {pendingUploads} {t('upload.pending_count', 'enviando...')}
                      </span>
                    )}
                    {errorUploads > 0 && (
                      <span className="text-red-600">
                        ✗ {errorUploads} {t('upload.error_count', 'com erro')}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Mensagem de erro global */}
              {error && (
                <Alert className="mt-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Ações finais */}
          <div className="flex justify-center gap-4">
            <Link to={`/p/${product.id}`}>
              <Button size="lg">
                <Eye className="w-5 h-5 mr-2" />
                {t('upload.view_final_listing', 'Ver anúncio final')}
              </Button>
            </Link>
            
            <Button variant="outline" onClick={() => navigate('/app/new')}>
              {t('upload.create_another', 'Criar outro anúncio')}
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}