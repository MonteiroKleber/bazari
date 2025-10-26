import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingBag, Coins, Store, TrendingUp } from 'lucide-react';

/**
 * Página de boas-vindas para usuários não autenticados
 * Usada quando tentam acessar áreas protegidas sem conta
 */
export function GuestWelcomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const targetUrl = location.state?.from || '/app';
  const reason = location.state?.reason;

  console.log('👋 GuestWelcomePage rendered', {
    pathname: location.pathname,
    targetUrl,
    reason,
    locationState: location.state
  });

  const benefits = [
    {
      icon: Coins,
      title: t('guest_welcome.benefit1_title', { defaultValue: 'Comprar e Vender BZR' }),
      description: t('guest_welcome.benefit1_desc', { defaultValue: 'Acesse o mercado P2P' })
    },
    {
      icon: ShoppingBag,
      title: t('guest_welcome.benefit2_title', { defaultValue: 'Fazer Pedidos' }),
      description: t('guest_welcome.benefit2_desc', { defaultValue: 'Compre produtos e serviços' })
    },
    {
      icon: Store,
      title: t('guest_welcome.benefit3_title', { defaultValue: 'Criar sua Loja' }),
      description: t('guest_welcome.benefit3_desc', { defaultValue: 'Venda seus produtos' })
    },
    {
      icon: TrendingUp,
      title: t('guest_welcome.benefit4_title', { defaultValue: 'Investir em Lojas' }),
      description: t('guest_welcome.benefit4_desc', { defaultValue: 'Tokenize seu negócio' })
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="max-w-2xl w-full shadow-xl">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-3xl">👋</span>
            </div>
          </div>
          <CardTitle className="text-2xl md:text-3xl">
            {t('guest_welcome.title', { defaultValue: 'Bem-vindo ao Bazari!' })}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {reason === 'protected_content' && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
              <p className="text-sm font-medium">
                {t('guest_welcome.protected_message', {
                  defaultValue: 'Para acessar esta área, você precisa criar uma conta Bazari.'
                })}
              </p>
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-4 text-center">
              {t('guest_welcome.benefits_title', { defaultValue: 'Com sua conta Bazari você pode:' })}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{benefit.title}</h4>
                      <p className="text-xs text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground"
              onClick={() => navigate('/auth/create', { state: { from: targetUrl } })}
            >
              🆕 {t('guest_welcome.create_account', { defaultValue: 'Criar Nova Conta' })}
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={() => navigate('/auth/import', { state: { from: targetUrl } })}
            >
              📥 {t('guest_welcome.import_account', { defaultValue: 'Já Tenho Conta (Importar)' })}
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                console.log('👋 Back button clicked in GuestWelcomePage');
                navigate('/', { replace: true });
                console.log('👋 Navigate to / called');
              }}
            >
              ← {t('guest_welcome.back_home', { defaultValue: 'Voltar para Início' })}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            {t('guest_welcome.free_message', { defaultValue: '✨ Gratuito • Sem taxas mensais • 100% Descentralizado' })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default GuestWelcomePage;
