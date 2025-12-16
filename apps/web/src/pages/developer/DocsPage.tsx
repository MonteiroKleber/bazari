import { Link } from 'react-router-dom';
import {
  Book,
  Terminal,
  Code,
  Rocket,
  DollarSign,
  Gift,
  Wallet,
  Database,
  Bell,
  FileCode,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DeveloperLayout } from '@/layouts/DeveloperLayout';

// Base path for docs
const DOCS_BASE = '/app/developer/docs';

const DOCS_SECTIONS = [
  {
    title: 'Getting Started',
    description: 'Comece a desenvolver para Bazari',
    icon: Rocket,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    links: [
      { title: 'Seu primeiro app em 10 min', href: `${DOCS_BASE}/quick-start` },
      { title: 'Instalação do CLI', href: `${DOCS_BASE}/installation` },
      { title: 'Conceitos básicos', href: `${DOCS_BASE}/concepts` },
    ],
  },
  {
    title: 'SDK Reference',
    description: 'API completa do @bazari.libervia.xyz/app-sdk',
    icon: Code,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    links: [
      { title: 'Visão geral', href: `${DOCS_BASE}/sdk/overview` },
      { title: 'Autenticação', href: `${DOCS_BASE}/sdk/auth` },
      { title: 'Wallet', href: `${DOCS_BASE}/sdk/wallet` },
      { title: 'Storage', href: `${DOCS_BASE}/sdk/storage` },
      { title: 'UI', href: `${DOCS_BASE}/sdk/ui` },
      { title: 'Contratos', href: `${DOCS_BASE}/sdk/contracts` },
    ],
  },
  {
    title: 'CLI',
    description: 'Comandos do @bazari.libervia.xyz/cli',
    icon: Terminal,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    links: [
      { title: 'bazari create', href: `${DOCS_BASE}/cli/create` },
      { title: 'bazari dev', href: `${DOCS_BASE}/cli/dev` },
      { title: 'bazari build', href: `${DOCS_BASE}/cli/build` },
      { title: 'bazari publish', href: `${DOCS_BASE}/cli/publish` },
      { title: 'bazari keys', href: `${DOCS_BASE}/cli/keys` },
      { title: 'bazari studio', href: `${DOCS_BASE}/cli/studio` },
    ],
  },
  {
    title: 'Guias',
    description: 'Tutoriais passo a passo',
    icon: Book,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    links: [
      { title: 'Integrar pagamentos BZR', href: `${DOCS_BASE}/guides/payments` },
      { title: 'Criar programa de fidelidade', href: `${DOCS_BASE}/guides/loyalty` },
      { title: 'Criar serviço de escrow', href: `${DOCS_BASE}/guides/escrow` },
      { title: 'Monetizar seu app', href: `${DOCS_BASE}/guides/monetization` },
    ],
  },
  {
    title: 'Monetização',
    description: 'Ganhe dinheiro com seus apps',
    icon: DollarSign,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    links: [
      { title: 'Modelos de monetização', href: `${DOCS_BASE}/monetization/models` },
      { title: 'In-App Purchases', href: `${DOCS_BASE}/monetization/iap` },
      { title: 'Revenue Share', href: `${DOCS_BASE}/monetization/revenue-share` },
    ],
  },
  {
    title: 'Exemplos',
    description: 'Apps de exemplo para estudar',
    icon: Gift,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    links: [
      { title: 'App de saldo', href: `${DOCS_BASE}/examples/balance` },
      { title: 'Lista de tarefas', href: `${DOCS_BASE}/examples/todo` },
      { title: 'App de fidelidade', href: `${DOCS_BASE}/examples/loyalty` },
    ],
  },
];

const QUICK_LINKS = [
  {
    icon: Wallet,
    title: 'API de Wallet',
    description: 'Integre pagamentos BZR',
    href: `${DOCS_BASE}/sdk/wallet`,
  },
  {
    icon: FileCode,
    title: 'Smart Contracts',
    description: 'Contratos ink! prontos',
    href: `${DOCS_BASE}/sdk/contracts`,
  },
  {
    icon: Database,
    title: 'Storage',
    description: 'Dados persistentes',
    href: `${DOCS_BASE}/sdk/storage`,
  },
  {
    icon: Bell,
    title: 'UI Components',
    description: 'Toasts, modais, etc',
    href: `${DOCS_BASE}/sdk/ui`,
  },
];

export default function DocsPage() {
  return (
    <DeveloperLayout
      title="Documentação"
      description="Tudo que você precisa para desenvolver apps para o Bazari"
    >

      {/* Quick Start Banner */}
      <Card className="mb-8 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold mb-1">Novo no Bazari?</h2>
              <p className="text-muted-foreground">
                Crie seu primeiro app em apenas 10 minutos
              </p>
            </div>
            <Link
              to={`${DOCS_BASE}/quick-start`}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium"
            >
              Começar agora
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {QUICK_LINKS.map((link) => (
          <Link key={link.href} to={link.href}>
            <Card className="h-full hover:shadow-md hover:border-primary/30 transition-all cursor-pointer">
              <CardContent className="pt-6">
                <link.icon className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-semibold mb-1">{link.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {link.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {DOCS_SECTIONS.map((section) => (
          <Card
            key={section.title}
            className="hover:shadow-md transition-shadow"
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${section.bgColor}`}>
                  <section.icon className={`w-5 h-5 ${section.color}`} />
                </div>
                <div>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Support Card */}
      <Card className="mt-8 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-none">
        <CardContent className="py-8 text-center">
          <h2 className="text-xl font-bold mb-2">Precisa de ajuda?</h2>
          <p className="text-muted-foreground mb-4">
            Entre na nossa comunidade de desenvolvedores
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="https://discord.gg/bazari"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
            >
              Discord
            </a>
            <a
              href="https://github.com/bazari/bazari"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90"
            >
              GitHub
            </a>
          </div>
        </CardContent>
      </Card>

      {/* CLI Installation */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Instalação Rápida
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-4 font-mono text-sm">
            <span className="text-muted-foreground">$</span> npm install -g
            @bazari.libervia.xyz/cli
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Depois, crie seu app com:{' '}
            <code className="bg-muted px-1 rounded">bazari create meu-app</code>
          </p>
        </CardContent>
      </Card>
    </DeveloperLayout>
  );
}
