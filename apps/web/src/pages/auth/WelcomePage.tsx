import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Download, Check, Shield, User, Unlock } from 'lucide-react';
import { getActiveAccount } from '@/modules/auth';
import { AuthHeader } from '@/components/AuthHeader';

export function WelcomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [account, setAccount] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await getActiveAccount();
        setAccount(stored);
      } catch (error) {
        console.error('Error checking account:', error);
        setAccount(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <>
        <AuthHeader />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-muted/30">
          <div className="animate-pulse text-muted-foreground">
            {t('common.loading', { defaultValue: 'Carregando...' })}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <AuthHeader />
      <div className="container mx-auto px-4 pt-20 pb-12 md:pt-24 md:pb-12">
        <div className="max-w-5xl mx-auto">
          {/* Título e Descrição */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">
              {t('auth.welcome.title', { defaultValue: 'Bem-vindo ao Bazari' })}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('auth.welcome.subtitle', { defaultValue: 'Marketplace descentralizado e seguro. Escolha como deseja começar:' })}
            </p>
          </div>

          {/* Conta Existente - Destaque */}
          {account && (
            <Card className="mb-8 border-primary/50 shadow-lg bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  {t('auth.welcome.existingAccountTitle', { defaultValue: 'Conta Salva Neste Dispositivo' })}
                </CardTitle>
                <CardDescription>
                  {t('auth.welcome.existingAccountDesc', { defaultValue: 'Você já possui uma conta armazenada. Desbloquear ou usar outra conta.' })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-background rounded-lg border">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {account.name ? (
                        <span className="text-lg font-bold text-primary">
                          {account.name.charAt(0).toUpperCase()}
                        </span>
                      ) : (
                        <User className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {account.name || t('auth.welcome.account', { defaultValue: 'Conta' })}
                      </p>
                      <p className="text-xs text-muted-foreground truncate font-mono">
                        {account.address.slice(0, 10)}...{account.address.slice(-8)}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate('/auth/unlock')}
                    className="w-full sm:w-auto gap-2"
                  >
                    <Unlock className="h-4 w-4" />
                    {t('auth.actions.unlock', { defaultValue: 'Desbloquear' })}
                  </Button>
                </div>

                <div className="mt-4 pt-4 border-t text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    {t('auth.welcome.orCreateImportNew', { defaultValue: 'ou crie/importe uma nova conta:' })}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cards de Opções */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Nova Conta */}
            <Card
              className="hover:shadow-xl transition-all cursor-pointer hover:border-primary/50"
              onClick={() => navigate('/auth/create')}
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Plus className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">
                      {t('auth.welcome.newAccount.title', { defaultValue: 'Criar Nova Conta' })}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {t('auth.welcome.newAccount.description', { defaultValue: 'Perfeito para quem está começando' })}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {t('auth.welcome.newAccount.feature1', { defaultValue: 'Gere uma nova seed phrase segura' })}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {t('auth.welcome.newAccount.feature2', { defaultValue: '100% gratuito e sem taxas' })}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {t('auth.welcome.newAccount.feature3', { defaultValue: 'Processo guiado passo a passo' })}
                  </li>
                </ul>
                <Button className="w-full" variant="default">
                  {t('auth.actions.getStarted', { defaultValue: 'Começar' })} →
                </Button>
              </CardContent>
            </Card>

            {/* Importar Conta */}
            <Card
              className="hover:shadow-xl transition-all cursor-pointer hover:border-secondary/50"
              onClick={() => navigate('/auth/import')}
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-secondary/10">
                    <Download className="h-8 w-8 text-secondary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">
                      {t('auth.welcome.importAccount.title', { defaultValue: 'Importar Conta' })}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {t('auth.welcome.importAccount.description', { defaultValue: 'Já tenho uma seed phrase' })}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {t('auth.welcome.importAccount.feature1', { defaultValue: 'Use sua seed phrase existente' })}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {t('auth.welcome.importAccount.feature2', { defaultValue: 'Restaure todas as suas chaves' })}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {t('auth.welcome.importAccount.feature3', { defaultValue: 'Acesso em qualquer dispositivo' })}
                  </li>
                </ul>
                <Button className="w-full" variant="outline">
                  {t('auth.actions.import', { defaultValue: 'Importar' })} →
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Info de Segurança */}
          <Card className="bg-muted/50 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-2">
                    🔐 {t('auth.security.title', { defaultValue: 'Suas chaves, seu controle' })}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('auth.security.description', {
                      defaultValue: 'Suas chaves privadas são armazenadas apenas no seu dispositivo, criptografadas com seu PIN. Nem nós temos acesso a elas. Você tem 100% de controle sobre seus ativos.'
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default WelcomePage;
