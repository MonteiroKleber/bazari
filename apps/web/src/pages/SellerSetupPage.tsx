import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { sellerApi } from '@/modules/seller/api';

export default function SellerSetupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shopName, setShopName] = useState('');
  const [shopSlug, setShopSlug] = useState('');
  const [about, setAbout] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await sellerApi.getMe();
        if (!active) return;
        if (res.sellerProfile) {
          setShopName(res.sellerProfile.shopName || '');
          setShopSlug(res.sellerProfile.shopSlug || '');
          setAbout(res.sellerProfile.about || '');
        }
      } catch (e: any) {
        // ignore
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

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
      await sellerApi.upsertMe(payload);
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

