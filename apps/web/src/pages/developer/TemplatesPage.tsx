import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FileCode,
  Download,
  Star,
  Search,
} from 'lucide-react';
import { DeveloperLayout } from '@/layouts/DeveloperLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Template {
  id: string;
  name: string;
  description: string;
  category: 'loyalty' | 'payment' | 'nft' | 'defi' | 'utility';
  downloads: number;
  rating: number;
  tags: string[];
  complexity: 'beginner' | 'intermediate' | 'advanced';
}

const templates: Template[] = [
  {
    id: 'loyalty-points',
    name: 'Loyalty Points',
    description: 'Sistema completo de pontos de fidelidade com conversão BZR',
    category: 'loyalty',
    downloads: 1250,
    rating: 4.8,
    tags: ['pontos', 'fidelidade', 'conversão'],
    complexity: 'beginner',
  },
  {
    id: 'cashback-program',
    name: 'Cashback Program',
    description: 'Programa de cashback automático com regras customizáveis',
    category: 'loyalty',
    downloads: 890,
    rating: 4.6,
    tags: ['cashback', 'rewards', 'automático'],
    complexity: 'intermediate',
  },
  {
    id: 'subscription',
    name: 'Subscription Service',
    description: 'Serviço de assinatura recorrente com billing automático',
    category: 'payment',
    downloads: 650,
    rating: 4.5,
    tags: ['assinatura', 'recorrente', 'billing'],
    complexity: 'intermediate',
  },
  {
    id: 'nft-collection',
    name: 'NFT Collection',
    description: 'Coleção NFT com minting, royalties e marketplace',
    category: 'nft',
    downloads: 420,
    rating: 4.7,
    tags: ['nft', 'coleção', 'royalties'],
    complexity: 'advanced',
  },
  {
    id: 'token-vesting',
    name: 'Token Vesting',
    description: 'Vesting de tokens com cliff, linear e milestone-based',
    category: 'defi',
    downloads: 380,
    rating: 4.4,
    tags: ['vesting', 'tokens', 'cliff'],
    complexity: 'advanced',
  },
  {
    id: 'escrow',
    name: 'Escrow Service',
    description: 'Serviço de escrow com disputas e liberação automática',
    category: 'utility',
    downloads: 560,
    rating: 4.6,
    tags: ['escrow', 'disputas', 'segurança'],
    complexity: 'intermediate',
  },
];

const categoryLabels: Record<string, string> = {
  loyalty: 'Fidelidade',
  payment: 'Pagamentos',
  nft: 'NFT',
  defi: 'DeFi',
  utility: 'Utilidades',
};

const complexityColors: Record<string, string> = {
  beginner: 'bg-green-500/10 text-green-500',
  intermediate: 'bg-yellow-500/10 text-yellow-500',
  advanced: 'bg-red-500/10 text-red-500',
};

const complexityLabels: Record<string, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

export default function TemplatesPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === null || template.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(templates.map((t) => t.category)));

  return (
    <DeveloperLayout
      title={t('developer.templates.title', 'Templates ink!')}
      description={t('developer.templates.description', 'Smart contracts prontos para uso')}
    >
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('developer.templates.search', 'Buscar templates...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            {t('common.all', 'Todos')}
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
            >
              {categoryLabels[cat]}
            </Button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileCode className="h-5 w-5 text-primary" />
                </div>
                <Badge className={complexityColors[template.complexity]}>
                  {complexityLabels[template.complexity]}
                </Badge>
              </div>
              <CardTitle className="text-lg mt-2">{template.name}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {template.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <Download className="h-4 w-4" />
                  <span>{template.downloads.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>{template.rating}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link to={`/app/developer/templates/${template.id}`}>
                    {t('common.viewDetails', 'Ver Detalhes')}
                  </Link>
                </Button>
                <Button size="sm" className="flex-1">
                  <Download className="h-4 w-4 mr-1" />
                  {t('common.use', 'Usar')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <FileCode className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {t('developer.templates.noResults', 'Nenhum template encontrado')}
          </h3>
          <p className="text-muted-foreground">
            {t('developer.templates.tryDifferentSearch', 'Tente uma busca diferente')}
          </p>
        </div>
      )}
    </DeveloperLayout>
  );
}
