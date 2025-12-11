import { useTranslation } from 'react-i18next';
import {
  HelpCircle,
  MessageSquare,
  Mail,
  ExternalLink,
  BookOpen,
  Users,
  Bug,
  Lightbulb,
} from 'lucide-react';
import { DeveloperLayout } from '@/layouts/DeveloperLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const supportChannels = [
  {
    title: 'Documentação',
    description: 'Guias completos e referência da API',
    icon: BookOpen,
    href: '/app/developer/docs',
    action: 'Ver Docs',
    internal: true,
  },
  {
    title: 'GitHub Discussions',
    description: 'Perguntas, ideias e discussões com a comunidade',
    icon: MessageSquare,
    href: 'https://github.com/nicoovillarr/bazari/discussions',
    action: 'Participar',
    internal: false,
  },
  {
    title: 'GitHub Issues',
    description: 'Reportar bugs e solicitar features',
    icon: Bug,
    href: 'https://github.com/nicoovillarr/bazari/issues',
    action: 'Abrir Issue',
    internal: false,
  },
  {
    title: 'Discord',
    description: 'Chat em tempo real com desenvolvedores',
    icon: Users,
    href: 'https://discord.gg/bazari',
    action: 'Entrar',
    internal: false,
  },
];

const faqItems = [
  {
    question: 'Como publico meu primeiro app?',
    answer:
      'Acesse "Criar App" no menu lateral, preencha as informações do app, faça upload do bundle e submeta para revisão. Apps aprovados ficam disponíveis na loja em até 24h.',
  },
  {
    question: 'Quanto custa publicar na Bazari App Store?',
    answer:
      'A publicação é gratuita! Apenas cobramos uma taxa de 15% sobre vendas e compras in-app. Apps gratuitos não têm nenhum custo.',
  },
  {
    question: 'Quais tecnologias posso usar?',
    answer:
      'Apps podem ser desenvolvidos em React, Vue, Svelte ou qualquer framework JavaScript moderno. Smart contracts devem ser escritos em ink! (Rust) para a blockchain Bazari.',
  },
  {
    question: 'Como integro pagamentos com BZR?',
    answer:
      'Use o SDK oficial @bazari.libervia.xyz/app-sdk. A integração é simples: sdk.wallet.requestPayment({ amount, description }) abre o modal de confirmação e processa o pagamento automaticamente.',
  },
  {
    question: 'Quanto tempo leva a revisão?',
    answer:
      'A revisão inicial leva de 1 a 3 dias úteis. Atualizações de apps já aprovados são revisadas em até 24h. Você receberá notificações sobre o status.',
  },
  {
    question: 'Posso monetizar meu app?',
    answer:
      'Sim! Você pode: cobrar pelo download do app, oferecer assinaturas, vender itens in-app, ou usar o modelo freemium. Configure tudo na aba Monetização do seu app.',
  },
];

export default function SupportPage() {
  const { t } = useTranslation();

  return (
    <DeveloperLayout
      title={t('developer.support.title', 'Suporte ao Desenvolvedor')}
      description={t('developer.support.description', 'Ajuda e recursos para desenvolvedores')}
    >
      {/* Support Channels */}
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        {supportChannels.map((channel) => {
          const Icon = channel.icon;
          return (
            <Card key={channel.title} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{channel.title}</CardTitle>
                    <CardDescription>{channel.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {channel.internal ? (
                  <Button asChild variant="outline" className="w-full">
                    <a href={channel.href}>{channel.action}</a>
                  </Button>
                ) : (
                  <Button asChild variant="outline" className="w-full">
                    <a href={channel.href} target="_blank" rel="noopener noreferrer">
                      {channel.action}
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Contact Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t('developer.support.contact', 'Contato Direto')}
          </CardTitle>
          <CardDescription>
            {t(
              'developer.support.contactDesc',
              'Para questões que não podem ser resolvidas nos canais públicos'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild>
              <a href="mailto:developers@bazari.com">
                <Mail className="h-4 w-4 mr-2" />
                developers@bazari.com
              </a>
            </Button>
            <p className="text-sm text-muted-foreground self-center">
              Resposta em até 48h úteis
            </p>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            {t('developer.support.faq', 'Perguntas Frequentes')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {faqItems.map((item, index) => (
              <div key={index}>
                <h4 className="font-medium mb-2 flex items-start gap-2">
                  <span className="text-primary font-bold">Q:</span>
                  {item.question}
                </h4>
                <p className="text-muted-foreground pl-5">{item.answer}</p>
                {index < faqItems.length - 1 && <hr className="mt-4" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            {t('developer.support.tips', 'Dicas Rápidas')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Sempre teste seu app no ambiente sandbox antes de submeter
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Use os templates ink! prontos para acelerar o desenvolvimento
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Mantenha o bundle do app abaixo de 5MB para melhor performance
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Inclua screenshots de qualidade para aumentar downloads
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Responda rapidamente aos feedbacks dos usuários
            </li>
          </ul>
        </CardContent>
      </Card>
    </DeveloperLayout>
  );
}
