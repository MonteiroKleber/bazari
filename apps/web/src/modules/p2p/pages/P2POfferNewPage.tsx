import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, AlertTriangle } from 'lucide-react';
import { p2pApi } from '../api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { WizardStepper } from '../components/WizardStepper';
import { AssetCard } from '../components/AssetCard';
import { ZARIPhaseBadge } from '../components/ZARIPhaseBadge';
import { formatBRL } from '../utils/format';

type WizardStep = 1 | 2 | 3 | 4;

interface WizardState {
  assetType: 'BZR' | 'ZARI';
  side: 'SELL_BZR' | 'BUY_BZR';
  amountZARI: string;
  price: string;
  minBRL: string;
  maxBRL: string;
  autoReply: string;
}

export default function P2POfferNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Wizard state
  const [step, setStep] = useState<WizardStep>(1);
  const [formData, setFormData] = useState<WizardState>({
    assetType: 'BZR',
    side: 'SELL_BZR',
    amountZARI: '',
    price: '',
    minBRL: '100',
    maxBRL: '500',
    autoReply: '',
  });

  // PIX state
  const [hasPix, setHasPix] = useState<boolean | null>(null);
  const [pixKey, setPixKey] = useState<string | null>(null);
  const [showPixInput, setShowPixInput] = useState(false);
  const [pixInput, setPixInput] = useState('');
  const savedPixRef = useRef(false);

  // ZARI phase state
  const [zariPhase, setZariPhase] = useState<{
    phase: string;
    priceBZR: string;
    supplyRemaining: string;
    isActive: boolean;
  } | null>(null);

  // Submission state
  const [saving, setSaving] = useState(false);

  // Load PIX profile
  useEffect(() => {
    let active = true;
    p2pApi.getPaymentProfile()
      .then((p) => {
        if (!active) return;
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

  // Load ZARI phase when asset type changes
  useEffect(() => {
    if (formData.assetType === 'ZARI') {
      p2pApi.getZARIPhase()
        .then(setZariPhase)
        .catch((err) => {
          console.error('Failed to load ZARI phase:', err);
          toast.error(t('p2p.zari.phase.error', 'Erro ao carregar fase ZARI'));
        });
    } else {
      setZariPhase(null);
    }
  }, [formData.assetType, t]);

  // Handle PIX save
  const handleSavePix = useCallback(async () => {
    if (!pixInput.trim()) return;
    try {
      await p2pApi.upsertPaymentProfile({ pixKey: pixInput.trim() });
      savedPixRef.current = true;
      setHasPix(true);
      setPixKey(pixInput.trim());
      setShowPixInput(false);
      setPixInput('');
      toast.success(t('p2p.offer.toast.pixSaved', 'PIX salvo'));
    } catch (e) {
      toast.error((e as Error).message || 'Erro');
    }
  }, [pixInput, t]);

  // Update form data
  const updateForm = (updates: Partial<WizardState>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  // Step validation
  const canProceed = (currentStep: WizardStep): boolean => {
    switch (currentStep) {
      case 1:
        return true; // Asset selection always valid
      case 2:
        if (formData.assetType === 'ZARI') {
          const amount = Number(formData.amountZARI);
          return !!zariPhase?.isActive && amount > 0;
        }
        return true; // Side selection always valid for BZR
      case 3:
        const minNum = Number(formData.minBRL);
        const maxNum = Number(formData.maxBRL);
        if (formData.assetType === 'BZR') {
          const priceNum = Number(formData.price);
          return priceNum > 0 && minNum > 0 && maxNum >= minNum;
        }
        return minNum > 0 && maxNum >= minNum;
      case 4:
        return hasPix === true;
      default:
        return false;
    }
  };

  // Navigation
  const goNext = () => {
    if (step < 4 && canProceed(step)) {
      setStep((s) => (s + 1) as WizardStep);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep((s) => (s - 1) as WizardStep);
    }
  };

  const goToStep = (targetStep: WizardStep) => {
    // Only allow going back to previous steps
    if (targetStep < step) {
      setStep(targetStep);
    }
  };

  // Submit offer
  const handleSubmit = useCallback(async () => {
    if (!canProceed(4)) return;

    setSaving(true);
    try {
      const minNum = Number(formData.minBRL);
      const maxNum = Number(formData.maxBRL);

      if (formData.assetType === 'BZR') {
        const priceNum = Number(formData.price);
        await p2pApi.createOffer({
          side: formData.side,
          priceBRLPerBZR: priceNum,
          minBRL: minNum,
          maxBRL: maxNum,
          method: 'PIX',
          autoReply: formData.autoReply || undefined,
        });
      } else {
        await p2pApi.createOffer({
          assetType: 'ZARI',
          amountZARI: Number(formData.amountZARI),
          minBRL: minNum,
          maxBRL: maxNum,
          method: 'PIX',
          autoReply: formData.autoReply || undefined,
        } as any);
      }

      toast.success(t('p2p.offer.toast.published', 'Oferta publicada'));
      navigate('/app/p2p');
    } catch (e) {
      toast.error((e as Error).message || 'Erro');
    } finally {
      setSaving(false);
    }
  }, [formData, navigate, t]);

  // Wizard steps configuration
  const wizardSteps = [
    { id: '1', label: t('p2p.wizard.step1.label', 'Ativo') },
    { id: '2', label: formData.assetType === 'ZARI'
      ? t('p2p.wizard.step2.labelZari', 'Quantidade')
      : t('p2p.wizard.step2.labelBzr', 'Tipo') },
    { id: '3', label: t('p2p.wizard.step3.label', 'Detalhes') },
    { id: '4', label: t('p2p.wizard.step4.label', 'Confirmar') },
  ];

  // Calculate BRL value for ZARI
  const zariTotalBRL = zariPhase && formData.amountZARI
    ? (Number(formData.amountZARI) * (Number(zariPhase.priceBZR) / 1e12)).toFixed(2)
    : '0';

  return (
    <div className="container mx-auto px-4 py-4 md:py-6 max-w-xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/app/p2p')}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back', 'Voltar')}
        </Button>
        <h1 className="text-2xl font-bold">{t('p2p.new.title', 'Nova Oferta')}</h1>
      </div>

      {/* Wizard Stepper */}
      <WizardStepper
        steps={wizardSteps}
        currentStep={step - 1}
        onStepClick={(s) => goToStep((s + 1) as WizardStep)}
        className="mb-6"
      />

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {/* STEP 1: Asset Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-lg font-medium">
                  {t('p2p.wizard.step1.title', 'Qual ativo você quer negociar?')}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t('p2p.wizard.step1.description', 'Selecione o token que deseja comprar ou vender.')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <AssetCard
                  asset="BZR"
                  selected={formData.assetType === 'BZR'}
                  onClick={() => updateForm({ assetType: 'BZR' })}
                  priceInfo="R$ 5,50"
                />
                <AssetCard
                  asset="ZARI"
                  selected={formData.assetType === 'ZARI'}
                  onClick={() => updateForm({ assetType: 'ZARI' })}
                  priceInfo={zariPhase ? `Fase ${zariPhase.phase}` : 'Carregando...'}
                />
              </div>
            </div>
          )}

          {/* STEP 2: Action Type (BZR) or Amount (ZARI) */}
          {step === 2 && (
            <div className="space-y-4">
              {formData.assetType === 'BZR' ? (
                <>
                  <div className="text-center mb-6">
                    <h2 className="text-lg font-medium">
                      {t('p2p.wizard.step2.bzr.title', 'O que você quer fazer?')}
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant={formData.side === 'SELL_BZR' ? 'default' : 'outline'}
                      className="h-24 flex flex-col gap-2"
                      onClick={() => updateForm({ side: 'SELL_BZR' })}
                    >
                      <span className="text-2xl">💰</span>
                      <span>{t('p2p.new.sideSell', 'Vender BZR')}</span>
                    </Button>
                    <Button
                      variant={formData.side === 'BUY_BZR' ? 'default' : 'outline'}
                      className="h-24 flex flex-col gap-2"
                      onClick={() => updateForm({ side: 'BUY_BZR' })}
                    >
                      <span className="text-2xl">🛒</span>
                      <span>{t('p2p.new.sideBuy', 'Comprar BZR')}</span>
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <h2 className="text-lg font-medium">
                      {t('p2p.wizard.step2.zari.title', 'Quantidade de ZARI')}
                    </h2>
                  </div>

                  {zariPhase && <ZARIPhaseBadge variant="full" />}

                  {!zariPhase?.isActive && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {t('p2p.new.phaseSoldOut', 'Fase atual esgotada. Aguarde a próxima fase.')}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="amountZARI">
                      {t('p2p.wizard.step2.zari.amount', 'Quantidade de ZARI para vender')}
                    </Label>
                    <Input
                      id="amountZARI"
                      inputMode="decimal"
                      placeholder="1000"
                      value={formData.amountZARI}
                      onChange={(e) => updateForm({ amountZARI: e.target.value })}
                      disabled={!zariPhase?.isActive}
                    />
                    {zariPhase && formData.amountZARI && (
                      <p className="text-sm text-muted-foreground">
                        = R$ {zariTotalBRL} BZR
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 3: Price and Limits */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-lg font-medium">
                  {t('p2p.wizard.step3.title', 'Defina preço e limites')}
                </h2>
              </div>

              {formData.assetType === 'BZR' && (
                <div className="space-y-2">
                  <Label htmlFor="price">
                    {t('p2p.wizard.step3.price', 'Preço por BZR (em R$)')}
                  </Label>
                  <Input
                    id="price"
                    inputMode="decimal"
                    placeholder="5.50"
                    value={formData.price}
                    onChange={(e) => updateForm({ price: e.target.value })}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minBRL">
                    {t('p2p.wizard.step3.minBRL', 'Valor mínimo (R$)')}
                  </Label>
                  <Input
                    id="minBRL"
                    inputMode="decimal"
                    value={formData.minBRL}
                    onChange={(e) => updateForm({ minBRL: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxBRL">
                    {t('p2p.wizard.step3.maxBRL', 'Valor máximo (R$)')}
                  </Label>
                  <Input
                    id="maxBRL"
                    inputMode="decimal"
                    value={formData.maxBRL}
                    onChange={(e) => updateForm({ maxBRL: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="autoReply">
                  {t('p2p.wizard.step3.autoReply', 'Resposta automática (opcional)')}
                </Label>
                <Input
                  id="autoReply"
                  value={formData.autoReply}
                  onChange={(e) => updateForm({ autoReply: e.target.value })}
                  placeholder={t('p2p.wizard.step3.autoReplyHint', 'Enviada automaticamente quando alguém aceita sua oferta.')}
                />
              </div>
            </div>
          )}

          {/* STEP 4: Review and Confirm */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-lg font-medium">
                  {t('p2p.wizard.step4.title', 'Revise sua oferta')}
                </h2>
              </div>

              {/* PIX Warning */}
              {hasPix === false && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {t('p2p.new.needPix', 'Você precisa cadastrar sua chave PIX para criar ofertas.')}
                    <Button
                      size="sm"
                      variant="link"
                      className="ml-2 p-0 h-auto"
                      onClick={() => setShowPixInput(true)}
                    >
                      {t('p2p.new.addPix', 'Adicionar PIX')}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* PIX Input */}
              {showPixInput && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Input
                    placeholder="Chave PIX"
                    value={pixInput}
                    onChange={(e) => setPixInput(e.target.value)}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={handleSavePix}>
                    {t('common.save', 'Salvar')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowPixInput(false)}>
                    {t('common.cancel', 'Cancelar')}
                  </Button>
                </div>
              )}

              {/* PIX Status */}
              {hasPix && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                  <Check className="h-4 w-4" />
                  PIX: {pixKey}
                </div>
              )}

              {/* Offer Summary */}
              <div className="border rounded-lg divide-y">
                <div className="flex justify-between p-3">
                  <span className="text-muted-foreground">{t('p2p.review.asset', 'Ativo')}</span>
                  <span className="font-medium">{formData.assetType}</span>
                </div>

                {formData.assetType === 'BZR' && (
                  <>
                    <div className="flex justify-between p-3">
                      <span className="text-muted-foreground">{t('p2p.review.action', 'Ação')}</span>
                      <span className="font-medium">
                        {formData.side === 'SELL_BZR'
                          ? t('p2p.actions.sell', 'Vender')
                          : t('p2p.actions.buy', 'Comprar')}
                      </span>
                    </div>
                    <div className="flex justify-between p-3">
                      <span className="text-muted-foreground">{t('p2p.review.price', 'Preço')}</span>
                      <span className="font-medium">{formatBRL(formData.price)} / BZR</span>
                    </div>
                  </>
                )}

                {formData.assetType === 'ZARI' && (
                  <div className="flex justify-between p-3">
                    <span className="text-muted-foreground">{t('p2p.review.amount', 'Quantidade')}</span>
                    <span className="font-medium">{formData.amountZARI} ZARI</span>
                  </div>
                )}

                <div className="flex justify-between p-3">
                  <span className="text-muted-foreground">{t('p2p.review.range', 'Faixa')}</span>
                  <span className="font-medium">
                    {formatBRL(formData.minBRL)} – {formatBRL(formData.maxBRL)}
                  </span>
                </div>

                {formData.autoReply && (
                  <div className="flex justify-between p-3">
                    <span className="text-muted-foreground">{t('p2p.review.autoReply', 'Auto-resposta')}</span>
                    <span className="font-medium text-right max-w-[200px] truncate">
                      {formData.autoReply}
                    </span>
                  </div>
                )}
              </div>

              {/* PIX Warning */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {t('p2p.wizard.step4.warning', 'Sua chave PIX será visível para compradores após o escrow ser travado.')}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6 pt-4 border-t">
            <Button
              variant="outline"
              onClick={goBack}
              disabled={step === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back', 'Voltar')}
            </Button>

            {step < 4 ? (
              <Button onClick={goNext} disabled={!canProceed(step)}>
                {t('common.next', 'Próximo')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={saving || !canProceed(4)}
              >
                {saving ? t('common.saving', 'Salvando...') : t('p2p.wizard.publish', 'Publicar oferta')}
                <Check className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
