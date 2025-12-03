// V-8 (2025-09-12): UX melhorias sem alterar layout e sem quebrar navegação de categorias.
//  - Logs só em DEV (helper log/logError).
//  - Drag & drop de arquivos na área de upload (mesma UI).
//  - Cleanup de URLs de preview via useRef+useEffect (sem hooks em helpers).
//  - Botão "Continuar" desabilitado até ter título e preço válidos.
//  - Mensagem de erro de upload via i18n consistente (fallback).
// V-7: Correção da navegação de categorias - limpar categoryPath ao selecionar tipo (2025-01-11)
// Fix: handleKindSelect agora limpa categoryPath e categoryId para começar categoria do zero
// Fix: botão voltar no step 2 também limpa categoria para permitir nova seleção

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Package, Briefcase, ArrowLeft, ArrowRight, CheckCircle, Upload, X, Truck } from 'lucide-react';
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
import { sellerApi } from '@/modules/seller/api';
import { getSessionUser } from '@/modules/auth';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ShippingOptionsEditor, type ShippingOption } from '@/components/shipping';

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

  // Helpers de log somente em DEV
  const log = (...args: any[]) => { if (import.meta.env.DEV) console.log(...args); };
  const logError = (...args: any[]) => { if (import.meta.env.DEV) console.error(...args); };

  // Shipping methods (PROPOSAL-000)
  const SHIPPING_METHODS = [
    'SEDEX',
    'PAC',
    'TRANSPORTADORA',
    'MINI_ENVIOS',
    'RETIRADA',
    'INTERNACIONAL',
    'OUTRO'
  ] as const;
  
  // Estados do wizard
  const [step, setStep] = useState(1);
  const [kind, setKind] = useState<'product' | 'service' | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryPath, setCategoryPath] = useState<string[]>([]);
  const [basicData, setBasicData] = useState({
    title: '',
    description: '',
    price: '',
    daoId: ''
  });

  // Shipping data (PROPOSAL-000 - legacy fields)
  const [shippingData, setShippingData] = useState({
    estimatedDeliveryDays: '',
    shippingMethod: '',
    weight: '',
    dimensions: { length: '', width: '', height: '' }
  });

  // Shipping options (PROPOSAL-002 - multiple options)
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [attributes, setAttributes] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stores, setStores] = useState<Array<{ shopSlug: string; shopName: string }>>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  
  // Novos estados para melhorias
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [successData, setSuccessData] = useState<any>(null);

  // Referência para gerenciar cleanup de URLs de preview criadas com createObjectURL
  const previewsRef = useRef<string[]>([]);

  useEffect(() => {
    // Preencher daoId automaticamente com o address do usuário logado (fallback preservado depois)
    try {
      const user = getSessionUser();
      if (user?.address) {
        setBasicData((prev) => ({ ...prev, daoId: user.address }));
      }
    } catch {}

    // Cleanup global de previews ao desmontar a página
    (async () => {
      try {
        const res = await sellerApi.listMyStores();
        const list = res.items || [];
        setStores(list.map((s: any) => ({ shopSlug: s.shopSlug, shopName: s.shopName })));
        if (list.length === 1) setSelectedStore(list[0].shopSlug);
      } catch {}
    })();
    return () => {
      try {
        for (const url of previewsRef.current) {
          URL.revokeObjectURL(url);
        }
        previewsRef.current = [];
      } catch {}
    };
  }, []);

  // Carregar spec da categoria selecionada
  const { spec, loading: specLoading } = useEffectiveSpec(categoryId);

  // Step 1: Escolher tipo (produto ou serviço) - CORRIGIDO: limpar categoria anterior
  const handleKindSelect = (selectedKind: 'product' | 'service') => {
    log('✅ Tipo selecionado:', selectedKind);
    log('🧹 Limpando categoria anterior para começar do zero');
    
    setKind(selectedKind);
    // CORREÇÃO: Limpar categoria anterior para começar navegação do zero
    setCategoryId(null);
    setCategoryPath([]);
    setError(null);
    setStep(2);
  };

  // Step 2: Selecionar categoria - FUNÇÃO COM DEBUG
  const handleCategorySelect = (path: string[], id: string) => {
    log('📍 handleCategorySelect chamado:');
    log('  - path recebido:', path);
    log('  - id recebido:', id);
    log('  - tipo (kind):', kind);
    
    setCategoryPath(path);
    setCategoryId(id);
    setStep(3);
    
    log('✅ Estados atualizados:');
    log('  - categoryPath:', path);
    log('  - categoryId:', id);
    log('  - próximo step:', 3);
  };

  // NOVA FUNÇÃO: Voltar para step 1 limpando categoria
  const handleBackToKindSelection = () => {
    log('⬅️ Voltando para seleção de tipo, limpando categoria');
    setCategoryId(null);
    setCategoryPath([]);
    setError(null);
    setStep(1);
  };

  // Validação básica para habilitar o botão "Continuar" no passo 3
  const isBasicValid =
    (basicData.title || '').trim().length > 0 &&
    (basicData.price || '').trim().length > 0 &&
    !isNaN(Number(basicData.price)) &&
    Number(basicData.price) >= 0;

  // Step 3: Informações básicas
  const handleBasicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    log('📋 Informações básicas submetidas:', basicData);
    
    if (!basicData.title || !basicData.price) {
      setError(t('forms.required_fields'));
      return;
    }
    setError(null);
    
    // Se não há spec, pula direto para submissão
    if (!spec || !spec.jsonSchema || Object.keys(spec.jsonSchema.properties || {}).length === 0) {
      log('⚠️ Categoria sem spec, pulando para submissão direta');
      handleFinalSubmit({});
    } else {
      log('✅ Categoria tem spec, indo para step 4');
      setStep(4);
    }
  };

  // --- Upload de arquivos ---

  function processFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);

    // Validação: máximo 10 arquivos
    if (uploadedFiles.length + files.length > 10) {
      setError(t('new.max_files_error', { defaultValue: 'Máximo de 10 arquivos permitidos' }));
      return;
    }

    // (1) criar previews e entrar no estado com uploading=true
    const next: UploadedFile[] = files.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      previewsRef.current.push(previewUrl);
      return {
        file,
        preview: previewUrl,
        uploading: true,
        error: null,
      };
    });

    setUploadedFiles((prev) => [...prev, ...next]);
    setError(null);

    // (2) fazer upload de cada arquivo
    next.forEach(async (entry, idx) => {
      try {
        const res = await api.upload('/media/upload', entry.file);
        setUploadedFiles((prev) => {
          const copy = [...prev];
          // índice relativo ao bloco recém-adicionado
          const i = prev.length - next.length + idx;
          copy[i] = { ...copy[i], uploading: false, mediaId: res.id, error: null };
          return copy;
        });
        log('⬆️ Upload concluído:', res);
      } catch (e) {
        setUploadedFiles((prev) => {
          const copy = [...prev];
          const i = prev.length - next.length + idx;
          copy[i] = { ...copy[i], uploading: false, error: t('errors.upload_failed', { defaultValue: 'Falha no upload' }) };
          return copy;
        });
        logError('❌ Upload falhou:', e);
      }
    });
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files || []);
  };

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (e.dataTransfer?.files?.length) {
      processFiles(e.dataTransfer.files);
    }
  }
  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => {
      const copy = [...prev];
      const file = copy[index];
      try {
        if (file?.preview) {
          URL.revokeObjectURL(file.preview);
          previewsRef.current = previewsRef.current.filter((u) => u !== file.preview);
        }
      } catch {}
      copy.splice(index, 1);
      return copy;
    });
  };

  // Step 4: Atributos específicos e submissão final - CORRIGIDO APENAS O PAYLOAD
  const handleFinalSubmit = async (formAttributes: any) => {
    log('🚀 handleFinalSubmit chamado');
    log('  - basicData:', basicData);
    log('  - categoryPath:', categoryPath);
    log('  - categoryId:', categoryId);
    log('  - attributes:', formAttributes);
    log('  - kind:', kind);
    
    setSubmitting(true);
    setError(null);

    try {
      // Coletar mediaIds dos uploads bem-sucedidos
      const mediaIds = uploadedFiles
        .filter(f => f.mediaId)
        .map(f => f.mediaId as string);

      // CORREÇÃO: Construir payload sem campo 'price' duplicado
      // Resolver daoId do seller/loja corretamente (nunca usar 'dao-demo')
      const resolvedDaoId = basicData.daoId || getSessionUser()?.address || '';
      if (!resolvedDaoId) {
        setSubmitting(false);
        setError(t('errors.missing_seller', { defaultValue: 'Não foi possível identificar sua loja/conta. Faça login novamente ou conclua a configuração do vendedor.' }));
        return;
      }

      // Build shipping data for payload (only for products)
      const shippingPayload: Record<string, any> = {};
      if (kind === 'product') {
        if (shippingData.estimatedDeliveryDays) {
          shippingPayload.estimatedDeliveryDays = parseInt(shippingData.estimatedDeliveryDays, 10);
        }
        if (shippingData.shippingMethod) {
          shippingPayload.shippingMethod = shippingData.shippingMethod;
        }
        if (shippingData.weight) {
          shippingPayload.weight = parseFloat(shippingData.weight);
        }
        const { length, width, height } = shippingData.dimensions;
        if (length && width && height) {
          shippingPayload.dimensions = {
            length: parseFloat(length),
            width: parseFloat(width),
            height: parseFloat(height)
          };
        }
      }

      const payload = {
        daoId: resolvedDaoId,
        title: basicData.title,
        description: basicData.description,
        categoryPath,
        attributes: formAttributes,
        ...(kind === 'product' ? { priceBzr: basicData.price } : { basePriceBzr: basicData.price }),
        ...(mediaIds.length > 0 ? { mediaIds } : {}),
        ...(selectedStore ? { sellerStoreSlug: selectedStore } : {}),
        ...shippingPayload,
      } as any;

      log('📤 Payload corrigido a ser enviado:', JSON.stringify(payload, null, 2));

      const endpoint = kind === 'product' ? '/products' : '/services';
      log('📍 Endpoint:', endpoint);

      const response = await api.post(endpoint, payload);
      log('✅ Resposta do servidor:', response);

      // PROPOSAL-002: Criar shipping options após criar o produto
      if (kind === 'product' && shippingOptions.length > 0 && response.id) {
        log('📦 Criando opções de envio para o produto:', response.id);
        for (const option of shippingOptions) {
          try {
            await api.post(`/products/${response.id}/shipping-options`, {
              method: option.method,
              label: option.label,
              pricingType: option.pricingType,
              priceBzr: option.priceBzr,
              freeAboveBzr: option.freeAboveBzr,
              estimatedDeliveryDays: option.estimatedDeliveryDays,
              pickupAddressType: option.pickupAddressType,
              pickupAddress: option.pickupAddress,
              isDefault: option.isDefault,
              sortOrder: option.sortOrder ?? 0,
            });
            log('✅ Opção de envio criada:', option.method);
          } catch (optErr) {
            logError('⚠️ Erro ao criar opção de envio:', optErr);
            // Continua mesmo se uma opção falhar
          }
        }
      }

      // Sucesso - mostrar card de sucesso
      setSuccessData(response);
      setStep(5);
      setSubmitting(false);
    } catch (err: any) {
      logError('❌ Erro ao criar produto/serviço:', err);
      logError('  - Detalhes:', err.response || err.message || err);
      
      const errorMessage = err.response?.data?.error || err.message || t('errors.generic');
      setError(errorMessage);
      setSubmitting(false);
    }
  };

  // Cadastrar outro na mesma categoria
  const handleAddAnother = () => {
    log('➕ Cadastrar outro na mesma categoria');
    log('  - Mantendo categoryPath:', categoryPath);
    log('  - Mantendo categoryId:', categoryId);

    // Limpar dados mas manter categoria
    setBasicData((prev) => ({
      title: '',
      description: '',
      price: '',
      daoId: prev.daoId || getSessionUser()?.address || ''
    }));
    setShippingData({
      estimatedDeliveryDays: '',
      shippingMethod: '',
      weight: '',
      dimensions: { length: '', width: '', height: '' }
    });
    setShippingOptions([]); // PROPOSAL-002: limpar opções de envio
    setAttributes({});
    setUploadedFiles([]);
    setSuccessData(null);
    setError(null);
    // Voltar para step 3 (informações básicas)
    setStep(3);
  };

  // Novo cadastro (reset completo)
  const handleNewListing = () => {
    log('🔄 Novo cadastro (reset completo)');

    // Reset completo
    setStep(1);
    setKind(null);
    setCategoryId(null);
    setCategoryPath([]);
    setBasicData((prev) => ({
      title: '',
      description: '',
      price: '',
      daoId: prev.daoId || getSessionUser()?.address || ''
    }));
    setShippingData({
      estimatedDeliveryDays: '',
      shippingMethod: '',
      weight: '',
      dimensions: { length: '', width: '', height: '' }
    });
    setShippingOptions([]); // PROPOSAL-002: limpar opções de envio
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

            {/* Seleção de Loja (obrigatória quando houver múltiplas) */}
            <div className="grid gap-2">
              <Label htmlFor="store">Loja</Label>
              {stores.length === 0 ? (
                <div className="text-sm text-muted-foreground">Você ainda não tem lojas. <a className="underline" href="/app/seller/setup">Crie uma loja</a> para anunciar.</div>
              ) : (
                <select id="store" className="border rounded px-3 py-2" value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)} required>
                  <option value="" disabled>Selecione a loja</option>
                  {stores.map((s) => (
                    <option key={s.shopSlug} value={s.shopSlug}>@{s.shopSlug} — {s.shopName}</option>
                  ))}
                </select>
              )}
            </div>

            {/* DEBUG INFO (apenas em DEV) */}
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

              {/* Shipping Section (only for products) - PROPOSAL-002 */}
              {kind === 'product' && (
                <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">{t('shipping.section.title')}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('shipping.section.description')}
                  </p>

                  {/* PROPOSAL-002: Multiple shipping options editor */}
                  <ShippingOptionsEditor
                    options={shippingOptions}
                    onChange={setShippingOptions}
                  />

                  {/* Weight and Dimensions (collapsed) */}
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                      {t('shipping.weightDimensions', { defaultValue: 'Peso e Dimensões (opcional)' })}
                    </summary>
                    <div className="mt-3 space-y-3">
                      {/* Weight */}
                      <div>
                        <Label htmlFor="weight">{t('shipping.weight')}</Label>
                        <Input
                          id="weight"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={t('shipping.weightPlaceholder') as string}
                          value={shippingData.weight}
                          onChange={(e) => setShippingData({...shippingData, weight: e.target.value})}
                          className="mt-1"
                        />
                      </div>

                      {/* Dimensions */}
                      <div>
                        <Label>{t('shipping.dimensions')}</Label>
                        <div className="grid grid-cols-3 gap-2 mt-1">
                          <div>
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              placeholder={t('shipping.length') as string}
                              value={shippingData.dimensions.length}
                              onChange={(e) => setShippingData({
                                ...shippingData,
                                dimensions: {...shippingData.dimensions, length: e.target.value}
                              })}
                            />
                            <span className="text-xs text-muted-foreground">{t('shipping.length')}</span>
                          </div>
                          <div>
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              placeholder={t('shipping.width') as string}
                              value={shippingData.dimensions.width}
                              onChange={(e) => setShippingData({
                                ...shippingData,
                                dimensions: {...shippingData.dimensions, width: e.target.value}
                              })}
                            />
                            <span className="text-xs text-muted-foreground">{t('shipping.width')}</span>
                          </div>
                          <div>
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              placeholder={t('shipping.height') as string}
                              value={shippingData.dimensions.height}
                              onChange={(e) => setShippingData({
                                ...shippingData,
                                dimensions: {...shippingData.dimensions, height: e.target.value}
                              })}
                            />
                            <span className="text-xs text-muted-foreground">{t('shipping.height')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </details>
                </div>
              )}

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
                  <div onDrop={onDrop} onDragOver={onDragOver}>
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-muted-foreground/25 rounded-lg hover:border-primary transition-colors w-full"
                      aria-label={t('new.click_to_upload') as string}
                      title={t('new.click_to_upload') as string}
                    >
                      <Upload className="w-4 h-4" />
                      {t('new.click_to_upload')}
                    </label>
                  </div>
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
                            <span className="text-white text-xs">{t('errors.upload_failed', { defaultValue: 'Falha no upload' })}</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          aria-label={t('common.remove') as string}
                          title={t('common.remove') as string}
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
                
                <Button type="submit" disabled={submitting || !isBasicValid} aria-disabled={submitting || !isBasicValid}>
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

                  {selectedStore && (
                    <Button
                      variant="secondary"
                      onClick={() => navigate(`/app/sellers/${selectedStore}?tab=products`)}
                      className="w-full"
                    >
                      {t('new.view_store_products', { defaultValue: 'Ver todos os produtos da loja' })}
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={handleAddAnother}
                    className="w-full"
                  >
                    {t('new.add_another', { defaultValue: 'Cadastrar outro nesta categoria' })}
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={handleNewListing}
                    className="w-full"
                  >
                    {t('new.add_new', { defaultValue: 'Novo cadastro' })}
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
    <div className="container mx-auto px-4 py-2 md:py-3 max-w-4xl">
      <Breadcrumbs items={[
        { label: t('nav.dashboard', { defaultValue: 'Dashboard' }), href: '/app' },
        { label: t('new.title', { defaultValue: 'Novo Anúncio' }) }
      ]} />

      {renderProgress()}
      <Card>
        <CardContent className="p-6">
          {renderStepContent()}
        </CardContent>
      </Card>
    </div>
  );
}
