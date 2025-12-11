import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, Palette, Code, Eye, ExternalLink } from 'lucide-react';
import { DeveloperLayout } from '@/layouts/DeveloperLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

interface ComponentExample {
  id: string;
  name: string;
  description: string;
  category: 'inputs' | 'display' | 'feedback' | 'layout' | 'navigation';
  preview: React.ReactNode;
  code: string;
}

const components: ComponentExample[] = [
  {
    id: 'button',
    name: 'Button',
    description: 'Botão com variantes e estados',
    category: 'inputs',
    preview: (
      <div className="flex flex-wrap gap-2">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
      </div>
    ),
    code: `import { Button } from '@bazari/ui-kit';

<Button>Default</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Destructive</Button>`,
  },
  {
    id: 'input',
    name: 'Input',
    description: 'Campo de entrada de texto',
    category: 'inputs',
    preview: (
      <div className="space-y-2 max-w-xs">
        <Input placeholder="Digite algo..." />
        <Input placeholder="Desabilitado" disabled />
      </div>
    ),
    code: `import { Input } from '@bazari/ui-kit';

<Input placeholder="Digite algo..." />
<Input placeholder="Desabilitado" disabled />`,
  },
  {
    id: 'badge',
    name: 'Badge',
    description: 'Badges e etiquetas de status',
    category: 'display',
    preview: (
      <div className="flex flex-wrap gap-2">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="destructive">Destructive</Badge>
      </div>
    ),
    code: `import { Badge } from '@bazari/ui-kit';

<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="destructive">Destructive</Badge>`,
  },
  {
    id: 'card',
    name: 'Card',
    description: 'Container para conteúdo agrupado',
    category: 'layout',
    preview: (
      <Card className="max-w-xs">
        <CardHeader>
          <CardTitle>Título do Card</CardTitle>
          <CardDescription>Descrição do card aqui</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Conteúdo do card...</p>
        </CardContent>
      </Card>
    ),
    code: `import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@bazari/ui-kit';

<Card>
  <CardHeader>
    <CardTitle>Título do Card</CardTitle>
    <CardDescription>Descrição do card aqui</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Conteúdo do card...</p>
  </CardContent>
</Card>`,
  },
];

const categoryLabels: Record<string, string> = {
  inputs: 'Entradas',
  display: 'Exibição',
  feedback: 'Feedback',
  layout: 'Layout',
  navigation: 'Navegação',
};

export default function ComponentsPage() {
  const { t } = useTranslation();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleCopy = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredComponents = selectedCategory
    ? components.filter((c) => c.category === selectedCategory)
    : components;

  const categories = Array.from(new Set(components.map((c) => c.category)));

  return (
    <DeveloperLayout
      title={t('developer.components.title', 'Design System')}
      description={t(
        'developer.components.description',
        'Componentes UI do @bazari/ui-kit'
      )}
      actions={
        <Button variant="outline" asChild>
          <a
            href="https://github.com/nicoovillarr/bazari/tree/main/packages/bazari-ui-kit"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            GitHub
          </a>
        </Button>
      }
    >
      {/* Installation */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            {t('developer.components.installation', 'Instalação')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg font-mono text-sm flex items-center justify-between">
            <code>pnpm add @bazari/ui-kit</code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy('install', 'pnpm add @bazari/ui-kit')}
            >
              {copiedId === 'install' ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap mb-6">
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

      {/* Components Grid */}
      <div className="space-y-6">
        {filteredComponents.map((component) => (
          <Card key={component.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{component.name}</CardTitle>
                  <CardDescription>{component.description}</CardDescription>
                </div>
                <Badge variant="secondary">{categoryLabels[component.category]}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="preview">
                <TabsList className="mb-4">
                  <TabsTrigger value="preview" className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Preview
                  </TabsTrigger>
                  <TabsTrigger value="code" className="flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Código
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="preview">
                  <div className="p-6 border rounded-lg bg-background">
                    {component.preview}
                  </div>
                </TabsContent>

                <TabsContent value="code">
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => handleCopy(component.id, component.code)}
                    >
                      {copiedId === component.id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{component.code}</code>
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ))}
      </div>
    </DeveloperLayout>
  );
}
