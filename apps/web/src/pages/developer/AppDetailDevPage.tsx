import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  Download,
  Star,
  Clock,
  Upload,
  Settings,
  BarChart3,
  MessageSquare,
  Layers,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AppVersion {
  id: string;
  version: string;
  changelog: string | null;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
}

interface AppReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: {
    handle: string;
    avatar: string | null;
  };
}

interface DeveloperApp {
  id: string;
  appId: string;
  name: string;
  slug: string;
  description: string;
  longDescription: string | null;
  category: string;
  tags: string[];
  icon: string;
  color: string;
  screenshots: string[];
  currentVersion: string;
  sdkVersion: string;
  bundleUrl: string;
  bundleHash: string;
  permissions: Array<{ id: string; reason: string; optional?: boolean }>;
  status: string;
  featured: boolean;
  installCount: number;
  rating: number | null;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  versions: AppVersion[];
  reviews: AppReview[];
}

interface Analytics {
  installs?: {
    total: number;
    last7Days: number;
    last30Days: number;
  };
  rating?: {
    average: number;
    count: number;
  };
  retention?: {
    day1: number;
    day7: number;
    day30: number;
  };
}

const CATEGORIES = [
  { id: 'finance', label: 'Finanças', icon: '💰' },
  { id: 'social', label: 'Social', icon: '💬' },
  { id: 'commerce', label: 'Comércio', icon: '🛒' },
  { id: 'tools', label: 'Ferramentas', icon: '🛠️' },
  { id: 'governance', label: 'Governança', icon: '🗳️' },
  { id: 'entertainment', label: 'Entretenimento', icon: '🎮' },
];

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  DRAFT: { label: 'Rascunho', variant: 'outline' },
  PENDING_REVIEW: { label: 'Em Revisão', variant: 'secondary' },
  APPROVED: { label: 'Aprovado', variant: 'default' },
  PUBLISHED: { label: 'Publicado', variant: 'default' },
  REJECTED: { label: 'Rejeitado', variant: 'destructive' },
  SUSPENDED: { label: 'Suspenso', variant: 'destructive' },
  DEPRECATED: { label: 'Descontinuado', variant: 'outline' },
};

export default function AppDetailDevPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('overview');
  const [copied, setCopied] = useState(false);
  const [app, setApp] = useState<DeveloperApp | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchApp = useCallback(async () => {
    if (!id) return;
    try {
      const response = await api.get(`/developer/apps/${id}`);
      setApp(response.data.app);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar app');
      console.error('Error fetching app:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchApp();
  }, [fetchApp]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!id || activeTab !== 'analytics') return;
      try {
        const response = await api.get(`/developer/apps/${id}/analytics`);
        setAnalytics(response.data.analytics);
      } catch (err) {
        console.error('Error fetching analytics:', err);
      }
    };
    fetchAnalytics();
  }, [id, activeTab]);

  const handleUpdateApp = async (updateData: Partial<DeveloperApp>) => {
    setIsSaving(true);
    try {
      await api.put(`/developer/apps/${id}`, updateData);
      toast.success('App atualizado!', {
        description: 'As alterações foram salvas.',
      });
      fetchApp();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error('Erro ao atualizar', {
        description: error.response?.data?.error || 'Tente novamente',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitVersion = async (data: { version: string; changelog: string; bundleUrl: string; bundleHash: string; notes?: string }) => {
    setIsSubmitting(true);
    try {
      await api.post(`/developer/apps/${id}/submit`, data);
      toast.success('Versão submetida!', {
        description: 'Sua versão foi enviada para revisão.',
      });
      fetchApp();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error('Erro ao submeter', {
        description: error.response?.data?.error || 'Tente novamente',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyAppId = () => {
    if (app) {
      navigator.clipboard.writeText(app.appId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">App não encontrado</h3>
            <p className="text-muted-foreground mb-4">
              O app que você procura não existe ou você não tem acesso.
            </p>
            <Button asChild>
              <Link to="/app/developer">Voltar ao Portal</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[app.status] || STATUS_LABELS.DRAFT;

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/app/developer">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Portal
          </Link>
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl">
              {app.icon}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{app.name}</h1>
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <code className="bg-muted px-2 py-0.5 rounded">{app.appId}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={copyAppId}
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {app.status === 'PUBLISHED' && (
            <Button variant="outline" asChild>
              <Link to={`/store/${app.slug}`}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver na Store
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Download className="w-4 h-4" />
              Instalações
            </div>
            <div className="text-2xl font-bold">{app.installCount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Star className="w-4 h-4" />
              Rating
            </div>
            <div className="text-2xl font-bold">
              {app.rating ? app.rating.toFixed(1) : '-'}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                ({app.ratingCount})
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Layers className="w-4 h-4" />
              Versão
            </div>
            <div className="text-2xl font-bold">{app.currentVersion}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Clock className="w-4 h-4" />
              Atualizado
            </div>
            <div className="text-lg font-medium">
              {formatDistanceToNow(new Date(app.updatedAt), {
                addSuffix: true,
                locale: ptBR,
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">
            <Package className="w-4 h-4 mr-2" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="versions">
            <Layers className="w-4 h-4 mr-2" />
            Versões
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="reviews">
            <MessageSquare className="w-4 h-4 mr-2" />
            Reviews
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Descrição</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{app.description}</p>
                  {app.longDescription && (
                    <p className="mt-4 whitespace-pre-wrap">{app.longDescription}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Permissões</CardTitle>
                  <CardDescription>
                    Permissões que seu app solicita aos usuários
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {app.permissions.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Nenhuma permissão configurada
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {app.permissions.map((perm, index) => (
                        <div
                          key={index}
                          className="flex items-start justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div>
                            <code className="text-sm font-medium">{perm.id}</code>
                            <p className="text-sm text-muted-foreground mt-1">
                              {perm.reason}
                            </p>
                          </div>
                          {perm.optional && (
                            <Badge variant="outline">Opcional</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Categoria</div>
                    <div className="font-medium">
                      {CATEGORIES.find((c) => c.id === app.category)?.icon}{' '}
                      {CATEGORIES.find((c) => c.id === app.category)?.label || app.category}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">SDK Version</div>
                    <div className="font-medium">{app.sdkVersion}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Criado em</div>
                    <div className="font-medium">
                      {new Date(app.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  {app.publishedAt && (
                    <div>
                      <div className="text-sm text-muted-foreground">Publicado em</div>
                      <div className="font-medium">
                        {new Date(app.publishedAt).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {app.tags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {app.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {app.status === 'DRAFT' && (
                <Card className="border-dashed">
                  <CardContent className="pt-6 text-center">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
                    <h4 className="font-semibold mb-2">Pronto para publicar?</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Submeta seu app para revisão
                    </p>
                    <Button onClick={() => setActiveTab('versions')}>
                      Submeter Versão
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Versions Tab */}
        <TabsContent value="versions">
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Versões</CardTitle>
                  <CardDescription>
                    Todas as versões do seu app
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {app.versions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma versão submetida ainda</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {app.versions.map((version) => (
                        <div
                          key={version.id}
                          className="flex items-start justify-between p-4 rounded-lg border"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold">
                                v{version.version}
                              </span>
                              <Badge
                                variant={
                                  version.status === 'APPROVED'
                                    ? 'default'
                                    : version.status === 'REJECTED'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                              >
                                {version.status}
                              </Badge>
                            </div>
                            {version.changelog && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {version.changelog}
                              </p>
                            )}
                            {version.reviewNotes && (
                              <div className="mt-2 p-2 rounded bg-yellow-500/10 text-sm">
                                <strong>Notas do revisor:</strong> {version.reviewNotes}
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(version.createdAt), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div>
              <SubmitVersionCard
                currentVersion={app.currentVersion}
                onSubmit={handleSubmitVersion}
                isSubmitting={isSubmitting}
              />
            </div>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Instalações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold mb-4">
                  {analytics?.installs?.total || 0}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Últimos 7 dias</span>
                    <span className="font-medium">
                      +{analytics?.installs?.last7Days || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Últimos 30 dias</span>
                    <span className="font-medium">
                      +{analytics?.installs?.last30Days || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Avaliações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-4xl font-bold">
                    {analytics?.rating?.average?.toFixed(1) || '-'}
                  </span>
                  <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {analytics?.rating?.count || 0} avaliações
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Retenção</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Dia 1</span>
                      <span>{((analytics?.retention?.day1 || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(analytics?.retention?.day1 || 0) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Dia 7</span>
                      <span>{((analytics?.retention?.day7 || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(analytics?.retention?.day7 || 0) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Dia 30</span>
                      <span>{((analytics?.retention?.day30 || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(analytics?.retention?.day30 || 0) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Instalações por Período</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <BarChart3 className="w-12 h-12 opacity-50 mr-4" />
                <span>Gráfico de instalações em breve</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle>Reviews dos Usuários</CardTitle>
              <CardDescription>
                O que os usuários estão dizendo sobre seu app
              </CardDescription>
            </CardHeader>
            <CardContent>
              {app.reviews.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma review ainda</p>
                  <p className="text-sm mt-2">
                    Reviews aparecerão aqui quando usuários avaliarem seu app
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {app.reviews.map((review) => (
                    <div
                      key={review.id}
                      className="p-4 rounded-lg border"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            {review.user.avatar ? (
                              <img
                                src={review.user.avatar}
                                alt={review.user.handle}
                                className="w-8 h-8 rounded-full"
                              />
                            ) : (
                              <span className="text-sm font-medium">
                                {review.user.handle[0].toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="font-medium">@{review.user.handle}</span>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < review.rating
                                      ? 'text-yellow-500 fill-yellow-500'
                                      : 'text-muted'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(review.createdAt), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-muted-foreground">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <SettingsForm app={app} onSave={handleUpdateApp} isSaving={isSaving} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Submit Version Card Component
function SubmitVersionCard({
  currentVersion,
  onSubmit,
  isSubmitting,
}: {
  currentVersion: string;
  onSubmit: (data: { version: string; changelog: string; bundleUrl: string; bundleHash: string; notes?: string }) => void;
  isSubmitting: boolean;
}) {
  const [version, setVersion] = useState('');
  const [changelog, setChangelog] = useState('');
  const [bundleUrl, setBundleUrl] = useState('');
  const [bundleHash, setBundleHash] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ version, changelog, bundleUrl, bundleHash, notes: notes || undefined });
  };

  // Suggest next version
  const suggestVersion = () => {
    const parts = currentVersion.split('.').map(Number);
    if (parts.length === 3) {
      parts[2] += 1;
      return parts.join('.');
    }
    return '0.1.1';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submeter Nova Versão</CardTitle>
        <CardDescription>
          Versão atual: {currentVersion}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="version">Versão *</Label>
            <div className="flex gap-2">
              <Input
                id="version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder={suggestVersion()}
                required
                pattern="[0-9]+\.[0-9]+\.[0-9]+"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setVersion(suggestVersion())}
              >
                Auto
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="changelog">Changelog</Label>
            <Textarea
              id="changelog"
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              placeholder="O que há de novo nesta versão..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bundleUrl">Bundle URL (IPFS) *</Label>
            <Input
              id="bundleUrl"
              value={bundleUrl}
              onChange={(e) => setBundleUrl(e.target.value)}
              placeholder="ipfs://..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bundleHash">Bundle Hash *</Label>
            <Input
              id="bundleHash"
              value={bundleHash}
              onChange={(e) => setBundleHash(e.target.value)}
              placeholder="sha256:..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas para Revisores</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informações adicionais para os revisores..."
              rows={2}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            <Upload className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Submetendo...' : 'Submeter para Revisão'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Settings Form Component
function SettingsForm({
  app,
  onSave,
  isSaving,
}: {
  app: DeveloperApp;
  onSave: (data: Partial<DeveloperApp>) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState({
    name: app.name,
    description: app.description,
    longDescription: app.longDescription || '',
    category: app.category,
    icon: app.icon,
    tags: app.tags.join(', '),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do App</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  maxLength={50}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição Curta</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  maxLength={500}
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.description.length}/500 caracteres
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="longDescription">Descrição Completa</Label>
                <Textarea
                  id="longDescription"
                  value={formData.longDescription}
                  onChange={(e) => setFormData({ ...formData, longDescription: e.target.value })}
                  rows={6}
                  placeholder="Descrição detalhada do seu app, recursos, como usar..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Categorização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData({ ...formData, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.icon} {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="icon">Ícone</Label>
                  <Input
                    id="icon"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    maxLength={4}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="defi, trading, crypto (separados por vírgula)"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 p-4 rounded-lg border">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl">
                  {formData.icon}
                </div>
                <div>
                  <h4 className="font-semibold">{formData.name || 'Nome do App'}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {formData.description || 'Descrição do app...'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full" type="button" disabled>
                Deprecar App
              </Button>
              <Button variant="destructive" className="w-full" type="button" disabled>
                Excluir App
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Em breve
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>
    </form>
  );
}
