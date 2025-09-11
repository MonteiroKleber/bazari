// V+1: Melhorias na UX pós-cadastro - 2025-09-11
// - Garantir card de sucesso sempre aparece após 201
// - "Cadastrar outro nesta categoria" preserva categoria (prefill)
// - "Adicionar fotos agora" navega para /app/upload/${createdId}
// - Mantém toda lógica existente intacta

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Package, Briefcase, ArrowLeft, ArrowRight, CheckCircle, Upload, X, Camera } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Alert, AlertDescription } from '../components/ui/alert';
import { CategoryPicker } from '../components/CategoryPicker';
import { DynamicForm } from '../components/DynamicForm';
import { useEffectiveSpec } from '../hooks/useEffectiveSpec';
import { api } from '../lib/api';

interface UploadedFile {
  file: File;
  preview: string;
  mediaId?: string;
  uploading?: boolean;
  error?: string;
}

export function NewListingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Estados do wizard
  const [step, setStep] = useState(1);
  const [kind, setKind] = useState<'product' | 'service' | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryPath, setCategoryPath] = useState<string[]>([]);
  const [basicData, setBasicData] = useState({
    title: '',
    description: '',
    price: '',
    daoId: 'dao-demo' // Temporário
  });
  const [attributes, setAttributes] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Novos estados para melhorias
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [successData, setSuccessData] = useState<any>(null);

  // MELHORIA: Verificar se há prefill da categoria via query params
  React.useEffect(() => {
    const prefillKind = searchParams.get('kind') as 'product' | 'service' | null;
    const prefillCategoryPath = searchParams.get('categoryPath');
    const prefillCategoryId = searchParams.get('categoryId');
    
    if (prefillKind && prefillCategoryPath && prefillCategoryId) {
      console.log('🔄 Aplicando prefill de categoria:', {
        kind: prefillKind,
        categoryPath: prefillCategoryPath.split(','),
        categoryId: prefillCategoryId
      });
      
      setKind(prefillKind);
      setCategoryPath(prefillCategoryPath.split(','));
      setCategoryId(prefillCategoryId);
      setStep(3); // Pular para informações básicas
    }
  }, [searchParams]);

  // Carregar spec da categoria selecionada
  const { spec, loading: specLoading } = useEffectiveSpec(categoryId);

  // Step 1: Escolher tipo (produto ou serviço) - CORRIGIDO: limpar categoria anterior
  const handleKindSelect = (selectedKind: 'product' | 'service') => {
    console.log('✅ Tipo selecionado:', selectedKind);
    console.log('🧹 Limpando categoria anterior para começar do zero');
    
    setKind(selectedKind);
    // CORREÇÃO: Limpar categoria anterior para começar navegação do zero
    setCategoryId(null);
    setCategoryPath([]);
    setError(null);
    setStep(2);
  };

  // Step 2: Selecionar categoria - FUNÇÃO COM DEBUG
  const handleCategorySelect = (path: string[], id: string) => {
    console.log('📍 handleCategorySelect chamado:');
    console.log('  - path recebido:', path);
    console.log('  - id recebido:', id);
    console.log('  - tipo (kind):', kind);
    
    setCategoryPath(path);
    setCategoryId(id);
    setStep(3);
    
    console.log('✅ Estados atualizados:');
    console.log('  - categoryPath:', path);
    console.log('  - categoryId:', id);
    console.log('  - próximo step:', 3);
  };

  // NOVA FUNÇÃO: Voltar para step 1 limpando categoria
  const handleBackToKindSelection = () => {
    console.log('⬅️ Voltando para seleção de tipo, limpando categoria');
    setCategoryId(null);
    setCategoryPath([]);
    setError(null);
    setStep(1);
  };

  // Step 3: Informações básicas
  const handleBasicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📋 Informações básicas submetidas:', basicData);
    
    if (!basicData.title || !basicData.price) {
      setError(t('forms.required_fields'));
      return;
    }
    setError(null);
    
    // Se não há spec, pula direto para submissão
    if (!spec || !spec.jsonSchema || Object.keys(spec.jsonSchema.properties || {}).length === 0) {
      console.log('⚠️ Categoria sem spec, pulando para submissão direta');
      handleFinalSubmit({});
    } else {
      console.log('✅ Categoria tem spec, indo para step 4');
      setStep(4);
    }
  };

  // Upload de arquivos
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validação: máximo 10 arquivos
    if (uploadedFiles.length + files.length > 10) {
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

      const response = await api.upload('/media/upload', fileObj.file);
      
      // Atualizar com mediaId
      setUploadedFiles(prev => prev.map(f => 
        f === fileObj ? { ...f, mediaId: response.id, uploading: false } : f
      ));
    } catch (err) {
      // Marcar erro
      setUploadedFiles(prev => prev.map(f => 
        f === fileObj ? { ...f, error: t('new.upload_error', 'Erro no upload'), uploading: false } : f
      ));
    }
  };

  const removeFile = (index: number) => {
    const file = uploadedFiles[index];
    URL.revokeObjectURL(file.preview);
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  // Step 4: Atributos específicos e submissão final - CORRIGIDO APENAS O PAYLOAD
  const handleFinalSubmit = async (formAttributes: any) => {
    console.log('🚀 handleFinalSubmit chamado');
    console.log('  - basicData:', basicData);
    console.log('  - categoryPath:', categoryPath);
    console.log('  - categoryId:', categoryId);
    console.log('  - attributes:', formAttributes);
    console.log('  - kind:', kind);
    
    setSubmitting(true);
    setError(null);

    try {
      // Coletar mediaIds dos uploads bem-sucedidos
      const mediaIds = uploadedFiles
        .filter(f => f.mediaId)
        .map(f => f.mediaId);

      // CORREÇÃO: Construir payload sem campo 'price' duplicado
      const payload = {
        daoId: basicData.daoId,
        title: basicData.title,
        description: basicData.description,
        categoryPath,
        attributes: formAttributes,
        // Usar o campo correto baseado no tipo
        ...(kind === 'product' ? { priceBzr: basicData.price } : { basePriceBzr: basicData.price }),
        ...(mediaIds.length > 0 && { mediaIds })
      };

      console.log('📤 Payload corrigido a ser enviado:', JSON.stringify(payload, null, 2));
      
      const endpoint = kind === 'product' ? '/products' : '/services';
      const response = await api.post(endpoint, payload);
      
      console.log('✅ Resposta da API:', response);
      
      // MELHORIA: Garantir que sempre mostra sucesso após 201
      setSuccessData({
        id: response.id || response.data?.id,
        title: basicData.title,
        kind,
        categoryPath,
        categoryId
      });
      setStep(5); // Ir para step de sucesso
      
    } catch (err: any) {
      console.error('❌ Erro na submissão:', err);
      setError(err.response?.data?.error || err.message || t('errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  // MELHORIA: Funções de ação pós-sucesso
  const handleAddMorePhotos = () => {
    if (successData?.id) {
      navigate(`/app/upload/${successData.id}`);
    }
  };

  const handleAddAnotherInCategory = () => {
    if (successData?.kind && successData?.categoryPath && successData?.categoryId) {
      // Navegar para nova listagem com prefill da categoria
      const params = new URLSearchParams({
        kind: successData.kind,
        categoryPath: successData.categoryPath.join(','),
        categoryId: successData.categoryId
      });
      navigate(`/app/new?${params.toString()}`);
    }
  };

  const handleViewListing = () => {
    if (successData?.id) {
      navigate(`/p/${successData.id}`);
    }
  };

  // Render baseado no step
  if (step === 5 && successData) {
    // MELHORIA: Card de sucesso sempre aparece e com ações melhoradas
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-xl">{t('new.success_title')}</CardTitle>
            <CardDescription>
              {t('new.success_message')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            
            {/* Título do item criado */}
            <div className="text-center p-3 bg-muted rounded">
              <p className="font-medium">{successData.title}</p>
              <p className="text-sm text-muted-foreground">
                {successData.kind === 'product' ? 
                  t('new.product', 'Produto') : 
                  t('new.service', 'Serviço')
                }
              </p>
            </div>

            {/* Ações principais */}
            <div className="space-y-2">
              <Button onClick={handleViewListing} className="w-full">
                {t('new.view_product')}
              </Button>
              
              <Button 
                onClick={handleAddMorePhotos} 
                variant="outline" 
                className="w-full"
              >
                <Camera className="w-4 h-4 mr-2" />
                {t('new.add_photos_now', 'Adicionar fotos agora')}
              </Button>
              
              <Button 
                onClick={handleAddAnotherInCategory} 
                variant="outline" 
                className="w-full"
              >
                {t('new.add_another')}
              </Button>
            </div>

            {/* Ação secundária */}
            <div className="pt-4 border-t">
              <Button 
                onClick={() => navigate('/app/new')} 
                variant="ghost" 
                className="w-full text-muted-foreground"
              >
                {t('new.add_new')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 1: Escolher tipo
  if (step === 1) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>{t('new.what_to_list')}</CardTitle>
            <CardDescription>{t('new.what_to_list_desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleKindSelect('product')}
              >
                <CardContent className="flex flex-col items-center p-6 text-center">
                  <Package className="w-12 h-12 text-primary mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t('new.product')}</h3>
                  <p className="text-sm text-muted-foreground">{t('new.product_desc')}</p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleKindSelect('service')}
              >
                <CardContent className="flex flex-col items-center p-6 text-center">
                  <Briefcase className="w-12 h-12 text-primary mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t('new.service')}</h3>
                  <p className="text-sm text-muted-foreground">{t('new.service_desc')}</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Selecionar categoria
  if (step === 2) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  onClick={handleBackToKindSelection}
                  className="hover:bg-muted"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('common.back')}
                </Button>
                <div>
                  <CardTitle>{t('new.select_category')}</CardTitle>
                  <CardDescription>{t('new.category_desc')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CategoryPicker
                kind={kind!}
                onSelect={handleCategorySelect}
                selectedPath={categoryPath}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Step 3: Informações básicas
  if (step === 3) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setStep(2)}
                  className="hover:bg-muted"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('common.back')}
                </Button>
                <div>
                  <CardTitle>{t('new.basic_info')}</CardTitle>
                  <CardDescription>{t('new.basic_info_desc')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBasicSubmit} className="space-y-4">
                {error && (
                  <Alert>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div>
                  <Label htmlFor="title">{t('new.title')}</Label>
                  <Input
                    id="title"
                    placeholder={t('new.title_placeholder')}
                    value={basicData.title}
                    onChange={(e) => setBasicData({...basicData, title: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">{t('new.description')}</Label>
                  <Textarea
                    id="description"
                    placeholder={t('new.description_placeholder')}
                    value={basicData.description}
                    onChange={(e) => setBasicData({...basicData, description: e.target.value})}
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="price">{t('new.price')} (BZR)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.000000000001"
                    min="0"
                    placeholder="0.00"
                    value={basicData.price}
                    onChange={(e) => setBasicData({...basicData, price: e.target.value})}
                    required
                  />
                </div>

                {/* Upload de Fotos */}
                <div>
                  <Label>{t('new.media')}</Label>
                  <div className="mt-2">
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-muted-foreground/25 rounded-lg hover:border-primary transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      {t('new.click_to_upload')}
                    </label>
                  </div>

                  {/* Preview dos arquivos */}
                  {uploadedFiles.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="relative">
                          <img
                            src={file.preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded border"
                          />
                          
                          {/* Status overlay */}
                          {file.uploading && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded">
                              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          )}
                          
                          {file.mediaId && (
                            <div className="absolute top-1 right-1">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            </div>
                          )}
                          
                          {file.error && (
                            <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center rounded">
                              <X className="w-4 h-4 text-white" />
                            </div>
                          )}

                          {/* Botão remover */}
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button type="submit" className="w-full">
                  {spec && Object.keys(spec.jsonSchema?.properties || {}).length > 0 ? 
                    t('common.continue') : 
                    t('new.finish')
                  }
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Step 4: Atributos específicos
  if (step === 4 && spec) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setStep(3)}
                  className="hover:bg-muted"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('common.back')}
                </Button>
                <div>
                  <CardTitle>{t('new.attributes')}</CardTitle>
                  <CardDescription>{t('new.attributes_desc')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <DynamicForm
                schema={spec.jsonSchema}
                uiSchema={spec.uiSchema}
                onSubmit={handleFinalSubmit}
                loading={submitting}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
}