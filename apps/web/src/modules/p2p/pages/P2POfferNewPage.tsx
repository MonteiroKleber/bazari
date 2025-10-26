import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { p2pApi } from '../api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function P2POfferNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [side, setSide] = useState<'SELL_BZR' | 'BUY_BZR'>('SELL_BZR');
  const [price, setPrice] = useState('');
  const [minBRL, setMinBRL] = useState('100');
  const [maxBRL, setMaxBRL] = useState('500');
  const [autoReply, setAutoReply] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasPix, setHasPix] = useState<boolean | null>(null);
  const [pixKey, setPixKey] = useState<string | null>(null);
  const savedPixRef = useRef(false);

  useEffect(() => {
    let active = true;
    p2pApi.getPaymentProfile()
      .then((p) => {
        if (!active) return;
        // Se o usuário acabou de salvar PIX, não sobrescreva o estado para false
        if (savedPixRef.current && !p?.pixKey) return;
        setHasPix(!!p?.pixKey);
        setPixKey(p?.pixKey ?? null);
      })
      .catch(() => {
        if (!active) return;
        if (savedPixRef.current) return;
        setHasPix(false);
        setPixKey(null);
      });
    return () => { active = false; };
  }, []);

  const onSave = useCallback(async () => {
    setSaving(true);
    try {
      const priceNum = Number(price);
      const minNum = Number(minBRL);
      const maxNum = Number(maxBRL);
      if (!Number.isFinite(priceNum) || priceNum <= 0) {
        toast.error(t('p2p.offer.toast.invalidPrice', 'Preço inválido'));
        return;
      }
      if (!Number.isFinite(minNum) || !Number.isFinite(maxNum) || minNum <= 0 || maxNum <= 0) {
        toast.error(t('p2p.offer.toast.invalidRange', 'Faixa inválida'));
        return;
      }
      if (maxNum < minNum) {
        toast.error(t('p2p.offer.toast.rangeOrder', 'Máximo deve ser maior ou igual ao mínimo'));
        return;
      }
      const res = await p2pApi.createOffer({
        side,
        priceBRLPerBZR: Number(price),
        minBRL: Number(minBRL),
        maxBRL: Number(maxBRL),
        method: 'PIX',
        autoReply: autoReply || undefined,
      });
      toast.success(t('p2p.offer.toast.published', 'Oferta publicada'));
      navigate('/app/p2p');
    } catch (e) {
      toast.error((e as Error).message || 'Erro');
    } finally {
      setSaving(false);
    }
  }, [side, price, minBRL, maxBRL, autoReply, navigate]);

  const [showPixInput, setShowPixInput] = useState(false);
  const [pixInput, setPixInput] = useState('');
  const goProfile = useCallback(async () => {
    setShowPixInput((v) => !v);
  }, []);
  const handleSavePix = useCallback(async () => {
    if (!pixInput.trim()) return;
    try {
      await p2pApi.upsertPaymentProfile({ pixKey: pixInput.trim() });
      savedPixRef.current = true;
      setHasPix(true);
      setPixKey(pixInput.trim());
      setShowPixInput(false);
      setPixInput('');
      p2pApi.getPaymentProfile().then((p) => {
        if (p?.pixKey) {
          setHasPix(true);
          setPixKey(p.pixKey);
        }
      }).catch(() => {});
      toast.success(t('p2p.offer.toast.pixSaved', 'PIX salvo'));
    } catch (e) {
      toast.error((e as Error).message || 'Erro');
    }
  }, [pixInput, t]);

  return (
    <div className="container mx-auto px-4 py-2 md:py-3">
      <Card>
        <CardHeader>
          <CardTitle>{t('p2p.new.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasPix === false && (
            <div className="p-3 rounded bg-amber-100 text-amber-900 text-sm" role="alert">
              {t('p2p.new.needPix')}
              <Button size="sm" variant="link" className="ml-2" onClick={goProfile}>{t('p2p.new.addPix')}</Button>
            </div>
          )}
          {hasPix && (
            <div className="text-xs text-muted-foreground" aria-live="polite">
              PIX: {pixKey || '—'}
            </div>
          )}
          {showPixInput && (
            <div className="flex items-center gap-2">
              <Input placeholder="Chave PIX" value={pixInput} onChange={(e) => setPixInput(e.target.value)} />
              <Button size="sm" variant="secondary" onClick={handleSavePix}>{t('common.save', 'Salvar')}</Button>
              <Button size="sm" variant="outline" onClick={() => setShowPixInput(false)}>{t('common.cancel', 'Cancelar')}</Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant={side==='SELL_BZR'?'default':'outline'} onClick={() => setSide('SELL_BZR')}>{t('p2p.new.sideSell')}</Button>
            <Button variant={side==='BUY_BZR'?'default':'outline'} onClick={() => setSide('BUY_BZR')}>{t('p2p.new.sideBuy')}</Button>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="price">{t('p2p.new.price')}</Label>
              <Input id="price" inputMode="decimal" placeholder="R$" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="min">{t('p2p.new.minBRL')}</Label>
              <Input id="min" inputMode="decimal" value={minBRL} onChange={(e) => setMinBRL(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="max">{t('p2p.new.maxBRL')}</Label>
              <Input id="max" inputMode="decimal" value={maxBRL} onChange={(e) => setMaxBRL(e.target.value)} />
            </div>
          </div>

          <div>
            <Label htmlFor="auto">{t('p2p.new.autoReply')}</Label>
            <Input id="auto" value={autoReply} onChange={(e) => setAutoReply(e.target.value)} placeholder={t('p2p.new.autoReplyPh') || ''} />
          </div>

          <div className="flex justify-end">
            <Button onClick={onSave} disabled={saving || !price.trim() || !minBRL.trim() || !maxBRL.trim() || hasPix === false}>{saving ? t('common.saving') : t('common.save')}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
