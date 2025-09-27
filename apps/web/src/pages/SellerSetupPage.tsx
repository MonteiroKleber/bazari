import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { sellerApi } from '@/modules/seller/api';
import type { StoreTheme } from '@/modules/store/StoreLayout';

const DEFAULT_THEME: StoreTheme = {
  bg: '#0f172a',
  ink: '#ffffff',
  brand: '#2563eb',
  accent: '#f97316'
};

const THEME_PRESETS: Array<{ id: string; label: string; theme: StoreTheme }> = [
  {
    id: 'midnight',
    label: 'Midnight',
    theme: { bg: '#0f172a', ink: '#eef2ff', brand: '#7c3aed', accent: '#38bdf8' }
  },
  {
    id: 'sunrise',
    label: 'Sunrise',
    theme: { bg: '#fef2f2', ink: '#1f2937', brand: '#f97316', accent: '#14b8a6' }
  },
  {
    id: 'forest',
    label: 'Forest',
    theme: { bg: '#0d1b16', ink: '#ecfdf5', brand: '#10b981', accent: '#fcd34d' }
  }
];

export default function SellerSetupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shopName, setShopName] = useState('');
  const [shopSlug, setShopSlug] = useState('');
  const [about, setAbout] = useState('');
  const [themeEnabled, setThemeEnabled] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [theme, setTheme] = useState<StoreTheme>(DEFAULT_THEME);
  const [categoryInput, setCategoryInput] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [primaryCategories, setPrimaryCategories] = useState<string[][]>([]);

  useEffect(() => { setLoading(false); }, []);

  const themeLabels = useMemo(() => ({
    bg: t('seller.setup.theme.background', { defaultValue: 'Fundo' }),
    ink: t('seller.setup.theme.foreground', { defaultValue: 'Texto' }),
    brand: t('seller.setup.theme.brand', { defaultValue: 'Primária' }),
    accent: t('seller.setup.theme.accent', { defaultValue: 'Acento' })
  }), [t]);

  function handleToggleTheme() {
    setThemeEnabled((prev) => !prev);
  }

  function applyPreset(presetId: string, presetTheme: StoreTheme) {
    setThemeEnabled(true);
    setSelectedPreset(presetId);
    setTheme(presetTheme);
  }

  function handleThemeColorChange(key: keyof StoreTheme, value: string) {
    setTheme((prev) => ({
      ...prev,
      [key]: value
    }));
    setSelectedPreset(null);
  }

  function handleAddCategory() {
    const trimmed = categoryInput.trim().replace(/^\/+|\/+$/g, '');
    if (!trimmed) {
      setCategoryError(t('seller.setup.category.invalid', { defaultValue: 'Informe uma categoria no formato products/slug.' }));
      return;
    }
    const parts = trimmed.split('/').map((part) => part.trim()).filter(Boolean);
    if (parts.length === 0) {
      setCategoryError(t('seller.setup.category.invalid', { defaultValue: 'Informe uma categoria no formato products/slug.' }));
      return;
    }
    const key = parts.join('/');
    setPrimaryCategories((prev) => {
      if (prev.length >= 6) {
        setCategoryError(t('seller.setup.category.limit', { defaultValue: 'Você pode adicionar até 6 categorias principais.' }));
        return prev;
      }
      if (prev.some((existing) => existing.join('/') === key)) {
        setCategoryError(t('seller.setup.category.duplicate', { defaultValue: 'Categoria já adicionada.' }));
        return prev;
      }
      setCategoryError(null);
      return [...prev, parts];
    });
    setCategoryInput('');
  }

  function handleRemoveCategory(index: number) {
    setPrimaryCategories((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const payload = { shopName: shopName.trim(), shopSlug: shopSlug.trim(), about: about.trim() || undefined };
      if (!payload.shopName || !payload.shopSlug) {
        setError(t('seller.form.required'));
        setSaving(false);
        return;
      }
      const policies: Record<string, any> = {};
      if (themeEnabled) {
        policies.storeTheme = theme;
      }
      if (primaryCategories.length > 0) {
        policies.primaryCategories = primaryCategories;
      }
      await sellerApi.createStore({
        ...payload,
        ...(Object.keys(policies).length > 0 ? { policies } : {})
      } as any);
      navigate(`/seller/${encodeURIComponent(payload.shopSlug)}`);
    } catch (e: any) {
      setError(e?.message || t('errors.generic'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{t('seller.setup.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-muted-foreground">{t('common.loading')}</div>
            ) : (
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="shopName">{t('seller.form.shopName')}</Label>
                  <Input id="shopName" value={shopName} onChange={(e) => setShopName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shopSlug">{t('seller.form.shopSlug')}</Label>
                  <Input id="shopSlug" value={shopSlug} onChange={(e) => setShopSlug(e.target.value)} required />
                  <div className="text-xs text-muted-foreground">{t('seller.form.slugHint')}</div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="about">{t('seller.form.about')}</Label>
                  <Textarea id="about" value={about} onChange={(e) => setAbout(e.target.value)} rows={5} />
                </div>

                <div className="space-y-4 rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>{t('seller.setup.themeLabel', { defaultValue: 'Tema da loja' })}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t('seller.setup.themeHint', { defaultValue: 'Ative e personalize as cores principais da vitrine.' })}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={themeEnabled}
                        onChange={handleToggleTheme}
                      />
                      {t('seller.setup.themeToggle', { defaultValue: 'Usar tema personalizado' })}
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {THEME_PRESETS.map((preset) => (
                      <Button
                        key={preset.id}
                        type="button"
                        variant={selectedPreset === preset.id ? 'default' : 'outline'}
                        disabled={!themeEnabled}
                        onClick={() => applyPreset(preset.id, preset.theme)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!themeEnabled}
                      onClick={() => {
                        setSelectedPreset(null);
                        setTheme(DEFAULT_THEME);
                      }}
                    >
                      {t('common.reset', { defaultValue: 'Resetar' })}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {(Object.keys(themeLabels) as Array<keyof StoreTheme>).map((key) => (
                      <div key={key} className="space-y-1">
                        <Label htmlFor={`theme-${key}`}>{themeLabels[key]}</Label>
                        <Input
                          id={`theme-${key}`}
                          type="color"
                          value={theme[key] ?? '#ffffff'}
                          disabled={!themeEnabled}
                          onChange={(event) => handleThemeColorChange(key, event.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 rounded-md border p-4">
                  <Label>{t('seller.setup.primaryCategoriesLabel', { defaultValue: 'Categorias principais' })}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('seller.setup.primaryCategoriesHint', { defaultValue: 'Adicione até 6 caminhos de categorias. Ex: products/tecnologia/eletronicos' })}
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={categoryInput}
                      onChange={(event) => setCategoryInput(event.target.value)}
                      placeholder="products/tecnologia"
                      className="flex-1"
                    />
                    <Button type="button" onClick={handleAddCategory} disabled={!categoryInput.trim()}>
                      {t('common.add', { defaultValue: 'Adicionar' })}
                    </Button>
                  </div>
                  {categoryError && <p className="text-xs text-destructive">{categoryError}</p>}
                  {primaryCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {primaryCategories.map((path, index) => (
                        <div key={path.join('/')} className="flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-sm">
                          <span>{path.join(' / ')}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto px-2 text-xs"
                            onClick={() => handleRemoveCategory(index)}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="text-sm text-destructive" role="alert">{error}</div>
                )}

                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>{saving ? t('common.saving') : t('common.save')}</Button>
                  <Button type="button" variant="outline" onClick={() => navigate(-1)}>{t('common.cancel')}</Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
