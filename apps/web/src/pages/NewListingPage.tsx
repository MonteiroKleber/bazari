// V-7: Correção da navegação de categorias - limpar categoryPath ao selecionar tipo (2025-01-11)
// Fix: handleKindSelect agora limpa categoryPath e categoryId para começar categoria do zero
// Fix: botão voltar no step 2 também limpa categoria para permitir nova seleção

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Package, Briefcase, ArrowLeft, ArrowRight, CheckCircle, Upload, X } from 'lucide-react';
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
      console.log('📍 Endpoint:', endpoint);
      
      const response = await api.post(endpoint, payload);
      console.log('✅ Resposta do servidor:', response);

      // Sucesso - mostrar card de sucesso
      setSuccessData(response);
      setStep(5);
      setSubmitting(false);
    } catch (err: any) {
      console.error('❌ Erro ao criar produto/serviço:', err);
      console.error('  - Detalhes:', err.response || err.message || err);
      
      const errorMessage = err.response?.data?.error || err.message || t('errors.generic');
      setError(errorMessage);
      setSubmitting(false);
    }
  };

  // Cadastrar outro na mesma categoria
  const handleAddAnother = () => {
    console.log('➕ Cadastrar outro na mesma categoria');
    console.log('  - Mantendo categoryPath:', categoryPath);
    console.log('  - Mantendo categoryId:', categoryId);
    
    // Limpar dados mas manter categoria
    setBasicData({
      title: '',
      description: '',
      price: '',
      daoId: 'dao-demo'
    });
    setAttributes({});
    setUploadedFiles([]);
    setSuccessData(null);
    setError(null);
    // Voltar para step 3 (informações básicas)
    setStep(3);
  };

  // Novo cadastro (reset completo)
  const handleNewListing = () => {
    console.log('🔄 Novo cadastro (reset completo)');
    
    // Reset completo
    setStep(1);
    setKind(null);
    setCategoryId(null);
    setCategoryPath([]);
    setBasicData({
      title: '',
      description: '',
      price: '',
      daoId: 'dao-demo'
    });
    setAttributes({});
    setUploadedFiles([]);
    setSuccessData(null);
    setError(null);
  };

  // Conteúdo por passo
  const renderStepContent = () => {
    switch (step) {
      case 1:
        // Escolher tipo
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">{t('new.what_to_list')}</h2>
              <p className="text-muted-foreground">
                {t('new.what_to_list_desc')}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card 
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleKindSelect('product')}
              >
                <CardHeader>
                  <Package className="w-12 h-12 text-primary mb-2" />
                  <CardTitle>{t('new.product')}</CardTitle>
                  <CardDescription>
                    {t('new.product_desc')}
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card 
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleKindSelect('service')}
              >
                <CardHeader>
                  <Briefcase className="w-12 h-12 text-primary mb-2" />
                  <CardTitle>{t('new.service')}</CardTitle>
                  <CardDescription>
                    {t('new.service_desc')}
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        );

      case 2:
        // Selecionar categoria
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">{t('new.select_category')}</h2>
              <p className="text-muted-foreground">
                {t('new.category_desc')}
              </p>
            </div>

            <CategoryPicker
              kind={kind!}
              onSelect={handleCategorySelect}
              value={categoryPath}
            />

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleBackToKindSelection}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('common.back')}
              </Button>
            </div>
          </div>
        );

      case 3:
        // Informações básicas + Upload
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">{t('new.basic_info')}</h2>
              <p className="text-muted-foreground">
                {t('new.basic_info_desc')}
              </p>
            </div>

            {/* DEBUG INFO */}
            {import.meta.env.DEV && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded text-xs">
                <p className="font-bold">DEBUG INFO:</p>
                <p>categoryPath: {JSON.stringify(categoryPath)}</p>
                <p>categoryId: {categoryId}</p>
                <p>kind: {kind}</p>
              </div>
            )}

            <form onSubmit={handleBasicSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">{t('new.title')}</Label>
                <Input
                  id="title"
                  type="text"
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
                        {file.uploading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          </div>
                        )}
                        {file.error && (
                          <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center rounded">
                            <span className="text-white text-xs">Erro</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {uploadedFiles.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('new.files_uploaded', { count: uploadedFiles.length })}
                  </p>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('common.back')}
                </Button>
                
                <Button type="submit" disabled={submitting}>
                  {submitting ? t('common.saving') : t('common.continue')}
                  {!submitting && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </div>
            </form>
          </div>
        );

      case 4:
        // Atributos específicos
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">{t('new.attributes')}</h2>
              <p className="text-muted-foreground">
                {t('new.attributes_desc')}
              </p>
            </div>

            {!specLoading ? (
              <DynamicForm
                schema={spec.jsonSchema}
                uiSchema={spec.uiSchema}
                onSubmit={handleFinalSubmit}
                loading={submitting}
              />
            ) : (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(3)}
                disabled={submitting}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('common.back')}
              </Button>
            </div>
          </div>
        );

      case 5:
        // Card de Sucesso
        return (
          <div className="space-y-6">
            <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
              <CardHeader className="text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <CardTitle className="text-2xl text-green-700 dark:text-green-400">
                  {t('new.success_title', 
                    kind === 'product' 
                      ? 'Produto cadastrado com sucesso!' 
                      : 'Serviço cadastrado com sucesso!'
                  )}
                </CardTitle>
                <CardDescription className="text-green-600 dark:text-green-400">
                  {t('new.success_message', 
                    kind === 'product'
                      ? 'Seu produto foi publicado no marketplace'
                      : 'Seu serviço foi publicado no marketplace'
                  )}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Button
                    onClick={() => navigate(`/${kind}s/${successData?.id}`)}
                    className="w-full"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {t('new.view_product', 
                      kind === 'product' 
                        ? 'Ver produto' : 'Ver serviço'
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={handleAddAnother}
                    className="w-full"
                  >
                    {t('new.add_another', 'Cadastrar outro nesta categoria')}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    onClick={handleNewListing}
                    className="w-full"
                  >
                    {t('new.add_new', 'Novo cadastro')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  // Indicador de progresso
  const renderProgress = () => {
    // Ajustar steps baseado na existência de spec
    const hasSpec = spec && spec.jsonSchema && Object.keys(spec.jsonSchema.properties || {}).length > 0;
    const totalSteps = step === 5 ? 5 : (hasSpec ? 4 : 3);
    
    const steps = [
      { num: 1, label: t('listing.step1') },
      { num: 2, label: t('listing.step2') },
      { num: 3, label: t('listing.step3') },
      ...(hasSpec ? [{ num: 4, label: t('listing.step4') }] : []),
      ...(step === 5 ? [{ num: 5, label: t('new.success', 'Sucesso') }] : [])
    ];

    return (
      <div className="flex items-center justify-between mb-8">
        {steps.map((s, index) => (
          <React.Fragment key={s.num}>
            <div className="flex items-center">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-semibold
                  ${step >= s.num 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                  }
                `}
              >
                {s.num === 5 ? '✓' : s.num}
              </div>
              <span className={`ml-2 text-sm ${step >= s.num ? 'text-foreground' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div 
                className={`flex-1 h-1 mx-4 ${
                  step > s.num ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {renderProgress()}
      <Card>
        <CardContent className="p-6">
          {renderStepContent()}
        </CardContent>
      </Card>
    </div>
  );
}