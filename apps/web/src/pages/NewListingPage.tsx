// path: apps/web/src/pages/NewListingPage.tsx

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Package, Briefcase, Upload } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Alert, AlertDescription } from '../components/ui/alert';
import { CategoryPicker } from '../components/CategoryPicker';
import { DynamicForm } from '../components/DynamicForm';
import { useEffectiveSpec } from '../hooks/useEffectiveSpec';
import { API_BASE_URL } from '../config';

export function NewListingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [kind, setKind] = useState<'product' | 'service' | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryPath, setCategoryPath] = useState<string[]>([]);
  const [basicData, setBasicData] = useState({
    title: '',
    description: '',
    price: '',
    daoId: 'dao-1' // Placeholder - seria obtido do contexto do usuário
  });
  const [media, setMedia] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { spec, loading: specLoading } = useEffectiveSpec(categoryId);

  const handleKindSelect = (selectedKind: 'product' | 'service') => {
    setKind(selectedKind);
    setStep(2);
  };

  const handleCategorySelect = (catId: string, catPath: string[]) => {
    setCategoryId(catId);
    setCategoryPath(catPath);
    setStep(3);
  };

  const handleBasicDataSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!basicData.title || !basicData.price) {
      setError(t('forms.required_fields'));
      return;
    }
    setError(null);
    setStep(4);
  };

  const handleAttributesSubmit = async (attributes: any) => {
    setSubmitting(true);
    setError(null);

    try {
      // Preparar dados
      const payload = {
        ...basicData,
        categoryId,
        categoryPath,
        attributes,
        priceBzr: basicData.price,
        basePriceBzr: kind === 'service' ? basicData.price : undefined,
        attributesSpecVersion: spec?.version || '1.0.0'
      };

      // Upload de mídia se houver
      const mediaUrls = [];
      if (media.length > 0) {
        for (const file of media) {
          const formData = new FormData();
          formData.append('file', file);
          
          const uploadRes = await fetch(`${API_BASE_URL}/media/upload`, {
            method: 'POST',
            body: formData
          });
          
          if (uploadRes.ok) {
            const { url } = await uploadRes.json();
            mediaUrls.push({ url, mime: file.type });
          }
        }
      }

      // Criar produto ou serviço
      const endpoint = kind === 'product' ? '/products' : '/services';
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...payload,
          media: mediaUrls
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create listing');
      }

      const result = await response.json();
      
      // Redirecionar para página do item ou lista
      navigate(`/${kind}s/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setMedia(Array.from(e.target.files));
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`flex items-center ${s < 4 ? 'flex-1' : ''}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  s <= step ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                {s}
              </div>
              {s < 4 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    s < step ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs">{t('listing.step1')}</span>
          <span className="text-xs">{t('listing.step2')}</span>
          <span className="text-xs">{t('listing.step3')}</span>
          <span className="text-xs">{t('listing.step4')}</span>
        </div>
      </div>

      {/* Step 1: Choose Kind */}
      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleKindSelect('product')}
          >
            <CardHeader>
              <Package className="h-12 w-12 text-primary mb-2" />
              <CardTitle>{t('listing.product')}</CardTitle>
              <CardDescription>{t('listing.product_desc')}</CardDescription>
            </CardHeader>
          </Card>
          
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleKindSelect('service')}
          >
            <CardHeader>
              <Briefcase className="h-12 w-12 text-primary mb-2" />
              <CardTitle>{t('listing.service')}</CardTitle>
              <CardDescription>{t('listing.service_desc')}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Step 2: Choose Category */}
      {step === 2 && kind && (
        <Card>
          <CardHeader>
            <CardTitle>{t('listing.choose_category')}</CardTitle>
            <CardDescription>
              {t('listing.category_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryPicker
              kind={kind}
              onSelect={handleCategorySelect}
            />
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setStep(1)}
            >
              {t('common.back')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Basic Information */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('listing.basic_info')}</CardTitle>
            <CardDescription>
              {t('listing.basic_info_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBasicDataSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">
                  {t('listing.title')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={basicData.title}
                  onChange={(e) => setBasicData({ ...basicData, title: e.target.value })}
                  placeholder={t('listing.title_placeholder')}
                />
              </div>

              <div>
                <Label htmlFor="description">
                  {t('listing.description')}
                </Label>
                <Textarea
                  id="description"
                  value={basicData.description}
                  onChange={(e) => setBasicData({ ...basicData, description: e.target.value })}
                  placeholder={t('listing.description_placeholder')}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="price">
                  {t('listing.price')} (BZR) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.000000000001"
                  value={basicData.price}
                  onChange={(e) => setBasicData({ ...basicData, price: e.target.value })}
                  placeholder="0.000000000000"
                />
              </div>

              <div>
                <Label htmlFor="media">
                  {t('listing.media')}
                </Label>
                <Input
                  id="media"
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleMediaChange}
                />
                {media.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('listing.files_selected', { count: media.length })}
                  </p>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                >
                  {t('common.back')}
                </Button>
                <Button type="submit">
                  {t('common.continue')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Dynamic Attributes */}
      {step === 4 && spec && (
        <Card>
          <CardHeader>
            <CardTitle>{t('listing.attributes')}</CardTitle>
            <CardDescription>
              {t('listing.attributes_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {specLoading ? (
              <div className="text-center py-8">{t('common.loading')}</div>
            ) : (
              <>
                <DynamicForm
                  jsonSchema={spec.jsonSchema}
                  uiSchema={spec.uiSchema}
                  onSubmit={handleAttributesSubmit}
                  loading={submitting}
                />
                
                {error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setStep(3)}
                  disabled={submitting}
                >
                  {t('common.back')}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}