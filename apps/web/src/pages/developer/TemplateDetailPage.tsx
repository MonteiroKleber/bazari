import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FileCode,
  Download,
  Star,
  Copy,
  ExternalLink,
  ArrowLeft,
  Check,
  GitBranch,
  Clock,
  User,
} from 'lucide-react';
import { useState } from 'react';
import { DeveloperLayout } from '@/layouts/DeveloperLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function TemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  // Mock template data
  const template = {
    id: templateId,
    name: 'Loyalty Points',
    description:
      'Sistema completo de pontos de fidelidade com conversão BZR. Inclui funcionalidades para acumular, resgatar e transferir pontos entre usuários.',
    category: 'loyalty',
    downloads: 1250,
    rating: 4.8,
    version: '1.2.0',
    author: 'Bazari Team',
    updatedAt: '2024-11-15',
    tags: ['pontos', 'fidelidade', 'conversão', 'ink!'],
    complexity: 'beginner',
    features: [
      'Acumular pontos por compras',
      'Resgatar pontos por BZR',
      'Transferir pontos entre usuários',
      'Configurar taxas de conversão',
      'Histórico de transações',
      'Admin controls',
    ],
    requirements: ['Rust 1.70+', 'ink! 4.x', 'cargo-contract 3.x'],
  };

  const codeExample = `#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod loyalty_points {
    use ink::storage::Mapping;

    #[ink(storage)]
    pub struct LoyaltyPoints {
        /// Mapping from owner to balance
        balances: Mapping<AccountId, Balance>,
        /// Total supply of points
        total_supply: Balance,
        /// Conversion ratio (points to BZR)
        bzr_ratio: u32,
    }

    impl LoyaltyPoints {
        #[ink(constructor)]
        pub fn new(initial_supply: Balance, bzr_ratio: u32) -> Self {
            let mut balances = Mapping::new();
            let caller = Self::env().caller();
            balances.insert(caller, &initial_supply);
            Self {
                balances,
                total_supply: initial_supply,
                bzr_ratio,
            }
        }

        #[ink(message)]
        pub fn balance_of(&self, owner: AccountId) -> Balance {
            self.balances.get(&owner).unwrap_or_default()
        }

        #[ink(message)]
        pub fn award_points(&mut self, to: AccountId, amount: Balance) {
            let balance = self.balance_of(to);
            self.balances.insert(to, &(balance + amount));
            self.total_supply += amount;
        }

        #[ink(message)]
        pub fn redeem_points(&mut self, amount: Balance) -> Result<(), Error> {
            let caller = self.env().caller();
            let balance = self.balance_of(caller);
            if balance < amount {
                return Err(Error::InsufficientBalance);
            }
            self.balances.insert(caller, &(balance - amount));
            self.total_supply -= amount;
            Ok(())
        }
    }
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(codeExample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DeveloperLayout>
      {/* Back Button */}
      <Button asChild variant="ghost" className="mb-4">
        <Link to="/app/developer/templates">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back', 'Voltar')}
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row gap-6 mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-xl bg-primary/10">
              <FileCode className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{template.name}</h1>
              <p className="text-muted-foreground">v{template.version}</p>
            </div>
          </div>
          <p className="text-muted-foreground mt-4">{template.description}</p>

          <div className="flex flex-wrap gap-2 mt-4">
            {template.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        <Card className="md:w-80 shrink-0">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                  <Download className="h-5 w-5" />
                  {template.downloads.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Downloads</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  {template.rating}
                </div>
                <p className="text-xs text-muted-foreground">Rating</p>
              </div>
            </div>

            <div className="space-y-2 text-sm mb-6">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Autor
                </span>
                <span>{template.author}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Atualizado
                </span>
                <span>{template.updatedAt}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Versão
                </span>
                <span>v{template.version}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Button className="w-full" size="lg">
                <Download className="h-4 w-4 mr-2" />
                {t('developer.templates.useTemplate', 'Usar Template')}
              </Button>
              <Button variant="outline" className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                {t('developer.templates.viewOnGitHub', 'Ver no GitHub')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="code" className="w-full">
        <TabsList>
          <TabsTrigger value="code">{t('developer.templates.code', 'Código')}</TabsTrigger>
          <TabsTrigger value="features">
            {t('developer.templates.features', 'Funcionalidades')}
          </TabsTrigger>
          <TabsTrigger value="requirements">
            {t('developer.templates.requirements', 'Requisitos')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="code" className="mt-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">lib.rs</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                <code>{codeExample}</code>
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('developer.templates.features', 'Funcionalidades')}</CardTitle>
              <CardDescription>
                {t('developer.templates.featuresDesc', 'O que este template inclui')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {template.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requirements" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('developer.templates.requirements', 'Requisitos')}</CardTitle>
              <CardDescription>
                {t('developer.templates.requirementsDesc', 'Dependências necessárias')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {template.requirements.map((req, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DeveloperLayout>
  );
}
