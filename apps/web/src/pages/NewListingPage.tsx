// V-3: i18n alinhado às chaves existentes + adição de 2 chaves novas nos JSONs (2025-09-10)
// - Progress usa listing.step1..step4
// - Títulos/labels usam chaves já existentes em "new" (title, description, price, ...)
// - Removidas chaves inexistentes (forms.title, forms.description, new.step_*)
// - Mantida UX atual; sem mudar estilos/temas

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Package, Briefcase, ArrowLeft, ArrowRight } from 'lucide-react';
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

  // Carregar spec da categoria selecionada
  const { spec, loading: specLoading } = useEffectiveSpec(categoryId);

  // Step 1: Escolher tipo (produto ou serviço)
  const handleKindSelect = (selectedKind: 'product' | 'service') => {
    setKind(selectedKind);
    setStep(2);
  };

  // Step 2: Selecionar categoria
  const handleCategorySelect = (path: string[], id: string) => {
    setCategoryPath(path);
    setCategoryId(id);
    setStep(3);
  };

  // Step 3: Informações básicas
  const handleBasicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!basicData.title || !basicData.price) {
      setError(t('forms.required_fields'));
      return;
    }
    setError(null);
    setStep(4);
  };

  // Step 4: Atributos específicos e submissão final
  const handleFinalSubmit = async (formAttributes: any) => {
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...basicData,
        categoryPath,
        attributes: formAttributes,
        priceBzr: basicData.price,
        basePriceBzr: kind === 'service' ? basicData.price : undefined
      };

      const endpoint = kind === 'product' ? '/products' : '/services';
      const response = await api.post(endpoint, payload);

      // Sucesso - redirecionar
      navigate(`/${kind}s/${response.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
      setSubmitting(false);
    }
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

            {kind && (
              <CategoryPicker
                kind={kind}
                onSelect={handleCategorySelect}
              />
            )}
          </div>
        );

      case 3:
        // Informações básicas
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">{t('new.basic_info')}</h2>
              <p className="text-muted-foreground">
                {t('new.basic_info_desc')}
              </p>
            </div>

            <form onSubmit={handleBasicSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">{t('new.title')} *</Label>
                <Input
                  id="title"
                  value={basicData.title}
                  onChange={(e) => setBasicData({...basicData, title: e.target.value})}
                  placeholder={t('new.title_placeholder')}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">{t('new.description')}</Label>
                <Textarea
                  id="description"
                  value={basicData.description}
                  onChange={(e) => setBasicData({...basicData, description: e.target.value})}
                  placeholder={t('new.description_placeholder')}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="price">
                  {t('new.price')} (BZR) *
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={basicData.price}
                  onChange={(e) => setBasicData({...basicData, price: e.target.value})}
                  placeholder="0.00"
                  required
                />
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
                <Button type="submit">
                  {t('common.continue')}
                  <ArrowRight className="w-4 h-4 ml-2" />
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

            {spec && !specLoading ? (
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

      default:
        return null;
    }
  };

  // Indicador de progresso
  const renderProgress = () => {
    const steps = [
      { num: 1, label: t('listing.step1') },
      { num: 2, label: t('listing.step2') },
      { num: 3, label: t('listing.step3') },
      { num: 4, label: t('listing.step4') }
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
                {s.num}
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
