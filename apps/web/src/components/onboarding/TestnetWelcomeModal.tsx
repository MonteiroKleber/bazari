import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react';

const STORAGE_KEY = 'bazari_testnet_welcome_shown';

export function TestnetWelcomeModal() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Verificar se já mostrou o modal
    const hasShown = localStorage.getItem(STORAGE_KEY);

    if (!hasShown) {
      // Delay de 500ms para garantir que dashboard carregou
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-4xl">👋</span>
            </div>
          </div>

          <DialogTitle className="text-3xl text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {t('testnet.welcome.title', { defaultValue: 'Bem-vindo à Bazari!' })}
          </DialogTitle>

          <p className="text-center text-muted-foreground mt-2">
            {t('testnet.welcome.subtitle', {
              defaultValue: 'Antes de começar, é importante que você saiba...'
            })}
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Alert Principal */}
          <Alert className="border-2 border-primary/30 bg-gradient-to-r from-primary/10 to-secondary/10">
            <AlertTriangle className="h-6 w-6 text-primary" />
            <AlertTitle className="text-lg font-bold text-primary">
              ⚠️ {t('testnet.welcome.alert.title', { defaultValue: 'Você está em um Ambiente de Testes (Testnet)' })}
            </AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p>
                {t('testnet.welcome.alert.description', {
                  defaultValue: 'Esta é uma versão em desenvolvimento, aberta ao público para transparência e validação comunitária.'
                })}
              </p>
              <p className="font-semibold">
                {t('testnet.welcome.alert.emphasis', {
                  defaultValue: 'Alguns fluxos podem apresentar erros, lentidão ou funcionalidades incompletas.'
                })}
              </p>
            </AlertDescription>
          </Alert>

          {/* Grid de Expectativas */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* O que você PODE fazer */}
            <Card className="border-2 border-green-500/30 bg-green-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <h3 className="font-bold text-lg">
                    {t('testnet.welcome.can.title', { defaultValue: '✅ Você Pode' })}
                  </h3>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">•</span>
                    <span>{t('testnet.welcome.can.test', { defaultValue: 'Testar todas as funcionalidades' })}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">•</span>
                    <span>{t('testnet.welcome.can.report', { defaultValue: 'Reportar bugs e problemas' })}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">•</span>
                    <span>{t('testnet.welcome.can.feedback', { defaultValue: 'Dar feedbacks construtivos' })}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">•</span>
                    <span>{t('testnet.welcome.can.explore', { defaultValue: 'Explorar sem riscos' })}</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* O que você NÃO deve esperar */}
            <Card className="border-2 border-red-500/30 bg-red-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <h3 className="font-bold text-lg">
                    {t('testnet.welcome.cannot.title', { defaultValue: '❌ Não Espere' })}
                  </h3>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">•</span>
                    <span>{t('testnet.welcome.cannot.real', { defaultValue: 'Transações ou valores reais' })}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">•</span>
                    <span>{t('testnet.welcome.cannot.persistent', { defaultValue: 'Dados persistentes (podem ser resetados)' })}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">•</span>
                    <span>{t('testnet.welcome.cannot.perfect', { defaultValue: 'Funcionamento perfeito (bugs são esperados)' })}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">•</span>
                    <span>{t('testnet.welcome.cannot.support', { defaultValue: 'Suporte 24/7 (estamos construindo!)' })}</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Info adicional */}
          <Alert className="border-blue-500/30 bg-blue-500/5">
            <Info className="h-5 w-5 text-blue-600" />
            <AlertTitle className="text-blue-600">
              {t('testnet.welcome.transparency.title', { defaultValue: 'Por que estamos compartilhando?' })}
            </AlertTitle>
            <AlertDescription className="text-sm">
              {t('testnet.welcome.transparency.description', {
                defaultValue: 'A Bazari acredita em transparência total. Ao abrir nosso testnet, permitimos que a comunidade acompanhe o desenvolvimento real do projeto e contribua para sua evolução.'
              })}
            </AlertDescription>
          </Alert>

          {/* Indicador visual permanente */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="border-primary text-primary">
                  TESTNET
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {t('testnet.welcome.indicator', {
                    defaultValue: 'Este indicador estará sempre visível enquanto você usar o testnet'
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex flex-col gap-3 pt-4">
            <Button
              size="lg"
              className="w-full"
              onClick={handleClose}
            >
              {t('testnet.welcome.cta.start', { defaultValue: 'Entendi, Começar!' })}
            </Button>
          </div>

          {/* Link para pular (pequeno) */}
          <div className="text-center">
            <button
              onClick={handleClose}
              className="text-xs text-muted-foreground hover:underline"
            >
              {t('testnet.welcome.skip', { defaultValue: 'Já sei disso, continuar sem ler' })}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
