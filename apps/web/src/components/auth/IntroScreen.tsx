import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Clock, Check, AlertCircle } from 'lucide-react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

interface IntroScreenProps {
  onStart: () => void;
  onGoogleSuccess?: (credential: string) => void;
  onGoogleError?: () => void;
}

export function IntroScreen({ onStart, onGoogleSuccess, onGoogleError }: IntroScreenProps) {
  const { t } = useTranslation();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold">
          🎉 {t('auth.create.intro.title', { defaultValue: 'Vamos Criar Sua Conta!' })}
        </h1>
        <p className="text-muted-foreground text-lg">
          {t('auth.create.intro.subtitle', { defaultValue: 'Um processo rápido e seguro para começar no Bazari' })}
        </p>
      </div>

      {/* Google Login Option (if available) */}
      {googleClientId && onGoogleSuccess && (
        <GoogleOAuthProvider clientId={googleClientId}>
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="pt-6 space-y-4">
              <div className="text-center">
                <h3 className="font-semibold text-lg mb-2">
                  {t('auth.create.intro.social.title', { defaultValue: '✨ Login Social - Rápido e Fácil' })}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('auth.create.intro.social.desc', { defaultValue: 'Crie sua conta com Google em segundos. Sem precisar guardar 12 palavras!' })}
                </p>
              </div>

              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={(credentialResponse) => {
                    if (credentialResponse.credential) {
                      onGoogleSuccess(credentialResponse.credential);
                    }
                  }}
                  onError={onGoogleError}
                  theme="outline"
                  size="large"
                  text="continue_with"
                  locale="pt-BR"
                />
              </div>

              <p className="text-xs text-center text-muted-foreground">
                {t('auth.create.intro.social.info', {
                  defaultValue: '💡 Recupere sua conta fazendo login novamente com Google em qualquer dispositivo'
                })}
              </p>
            </CardContent>
          </Card>

          {/* Separator */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t('auth.create.intro.or', { defaultValue: 'ou' })}
              </span>
            </div>
          </div>
        </GoogleOAuthProvider>
      )}

      {/* Informações Chave */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start gap-3">
            <Shield className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1">
                {t('auth.create.intro.security.title', { defaultValue: 'Você vai receber 12 palavras secretas' })}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('auth.create.intro.security.desc', { defaultValue: 'Elas são a CHAVE MESTRA da sua conta' })}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1">
                {t('auth.create.intro.time.title', { defaultValue: 'Processo rápido: ~3 minutos' })}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('auth.create.intro.time.desc', { defaultValue: 'Alguns passos simples para proteger sua conta' })}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Check className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1">
                {t('auth.create.intro.privacy.title', { defaultValue: 'Seus dados são 100% locais e seguros' })}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('auth.create.intro.privacy.desc', { defaultValue: 'Tudo é criptografado e armazenado apenas no seu dispositivo' })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* O que vamos fazer */}
      <div className="space-y-3">
        <h2 className="font-semibold text-lg">
          {t('auth.create.intro.stepsTitle', { defaultValue: 'O que vamos fazer:' })}
        </h2>
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">1</span>
              </div>
              <p className="text-sm">
                {t('auth.create.intro.step1', { defaultValue: 'Gerar suas 12 palavras secretas' })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">2</span>
              </div>
              <p className="text-sm">
                {t('auth.create.intro.step2', { defaultValue: 'Você vai salvar em local seguro' })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">3</span>
              </div>
              <p className="text-sm">
                {t('auth.create.intro.step3', { defaultValue: 'Verificar que salvou corretamente' })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">4</span>
              </div>
              <p className="text-sm">
                {t('auth.create.intro.step4', { defaultValue: 'Criar um PIN de proteção' })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aviso Importante */}
      <Card className="border-orange-500/50 bg-orange-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-500 mb-1">
                {t('auth.create.intro.warning.title', { defaultValue: 'IMPORTANTE' })}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('auth.create.intro.warning.desc', {
                  defaultValue: 'Ninguém pode recuperar suas palavras se você perder. Nem nós! Guarde-as com segurança.'
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botão Seed Phrase (Advanced) */}
      <Button onClick={onStart} className="w-full h-12 text-base" size="lg" variant="outline">
        {t('auth.create.intro.startButton', { defaultValue: 'Criar com Seed Phrase (Avançado)' })} →
      </Button>
    </div>
  );
}
