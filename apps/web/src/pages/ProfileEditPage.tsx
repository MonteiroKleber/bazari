import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiHelpers } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ReputationBadge } from '@/components/profile/ReputationBadge';
import { BadgesList } from '@/components/profile/BadgesList';
import { User, ImageIcon } from 'lucide-react';

const HANDLE_REGEX = /^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])?$/;
const RESERVED = new Set(['admin','support','bazari','root','system','null','undefined']);

type MeProfile = {
  handle: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  externalLinks?: { label: string; url: string }[] | null;
  onChainProfileId?: string | null;
  reputationScore?: number;
  reputationTier?: string;
};

export default function ProfileEditPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [form, setForm] = useState<{ handle: string; displayName: string; bio: string; avatarUrl: string; bannerUrl: string }>(
    { handle: '', displayName: '', bio: '', avatarUrl: '', bannerUrl: '' }
  );
  const [handleStatus, setHandleStatus] = useState<'idle'|'checking'|'available'|'taken'|'invalid'>('idle');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res: any = await apiHelpers.getMeProfile();
        if (!active) return;
        const p: MeProfile | null = res?.profile ?? null;
        if (p) {
          setProfile(p);
          setForm({
            handle: p.handle ?? '',
            displayName: p.displayName ?? '',
            bio: (p.bio ?? '') as string,
            avatarUrl: (p.avatarUrl ?? '') as string,
            bannerUrl: (p.bannerUrl ?? '') as string,
          });
          setIsNew(false);

          // Buscar badges se tem NFT
          if (p.onChainProfileId && p.handle) {
            try {
              const badgesRes: any = await apiHelpers.getProfileBadges(p.handle);
              if (active) setBadges(badgesRes.badges || []);
            } catch (err) {
              console.error('Error loading badges:', err);
            }
          }
        } else {
          setIsNew(true);
        }
      } catch {
        // 404 → novo perfil
        setIsNew(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleIsValid = useMemo(() => {
    const h = form.handle.trim();
    if (!isNew && h.length === 0) return true; // edição pode manter
    if (h.length < 3 || h.length > 30) return false;
    if (!HANDLE_REGEX.test(h)) return false;
    if (RESERVED.has(h)) return false;
    return true;
  }, [form.handle, isNew]);

  async function checkHandleAvailability() {
    if (!isNew) return;
    if (!handleIsValid) { setHandleStatus('invalid'); return; }
    setHandleStatus('checking');
    try {
      const res = await apiHelpers.resolveProfile({ handle: '@' + form.handle.trim() });
      if (res?.exists) setHandleStatus('taken'); else setHandleStatus('available');
    } catch {
      setHandleStatus('idle');
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);

    // Validações
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (!ALLOWED_TYPES.includes(file.type)) {
      setAvatarError('Formato não suportado. Use JPG, PNG, WebP ou GIF.');
      return;
    }

    if (file.size > MAX_SIZE) {
      setAvatarError('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    setUploadingAvatar(true);

    try {
      const response = await apiHelpers.uploadFile(file);
      const uploadedUrl = response?.asset?.url || response?.url;

      if (uploadedUrl) {
        // Converter para URL completa se necessário
        const fullUrl = uploadedUrl.startsWith('http')
          ? uploadedUrl
          : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${uploadedUrl}`;

        setForm(p => ({ ...p, avatarUrl: fullUrl }));
      } else {
        throw new Error('URL não retornada pelo servidor');
      }
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      setAvatarError(err?.message || 'Erro ao fazer upload. Tente novamente.');
    } finally {
      setUploadingAvatar(false);
      // Limpar o input para permitir re-upload do mesmo arquivo
      e.target.value = '';
    }
  }

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBannerError(null);

    // Validações
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    if (!ALLOWED_TYPES.includes(file.type)) {
      setBannerError('Formato não suportado. Use JPG, PNG ou WebP.');
      return;
    }

    if (file.size > MAX_SIZE) {
      setBannerError('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    setUploadingBanner(true);

    try {
      const response = await apiHelpers.uploadFile(file);
      const uploadedUrl = response?.asset?.url || response?.url;

      if (uploadedUrl) {
        // Converter para URL completa se necessário
        const fullUrl = uploadedUrl.startsWith('http')
          ? uploadedUrl
          : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${uploadedUrl}`;

        setForm(p => ({ ...p, bannerUrl: fullUrl }));
      } else {
        throw new Error('URL não retornada pelo servidor');
      }
    } catch (err: any) {
      console.error('Error uploading banner:', err);
      setBannerError(err?.message || 'Erro ao fazer upload. Tente novamente.');
    } finally {
      setUploadingBanner(false);
      // Limpar o input para permitir re-upload do mesmo arquivo
      e.target.value = '';
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (isNew && !handleIsValid) {
      setError('Handle inválido. Use 3–30 caracteres: a–z, 0–9, . _ -');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        displayName: form.displayName.trim(),
        bio: form.bio.trim() || undefined,
        avatarUrl: form.avatarUrl.trim() || undefined,
        bannerUrl: form.bannerUrl.trim() || undefined,
      };
      if (isNew) payload.handle = form.handle.trim();
      const res = await apiHelpers.upsertMeProfile(payload);
      const saved = res?.profile;
      if (saved?.handle) {
        navigate(`/u/${saved.handle}`);
      }
    } catch (err: any) {
      const msg = String(err?.message || 'Erro ao salvar perfil');
      setError(msg.includes('409') ? 'Handle já em uso' : msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="container mx-auto px-4 py-8">Carregando…</div>;

  return (
    <section className="container mx-auto px-4 py-8">
      <Breadcrumbs items={[
        { label: t('nav.dashboard', { defaultValue: 'Dashboard' }), href: '/app' },
        { label: isNew ? t('profile.create', { defaultValue: 'Criar Perfil' }) : t('profile.edit', { defaultValue: 'Editar Perfil' }) }
      ]} />

      <Card>
        <CardHeader>
          <CardTitle>{isNew ? 'Criar Perfil' : 'Editar Perfil'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={onSubmit}>
            {isNew && (
              <div className="grid gap-2">
                <Label htmlFor="handle">Handle (nome de usuário)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">@</span>
                  <Input
                    id="handle"
                    value={form.handle}
                    onChange={(e) => setForm((p) => ({ ...p, handle: e.target.value.toLowerCase() }))}
                    onBlur={checkHandleAvailability}
                    placeholder="seu_handle"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={checkHandleAvailability} disabled={!handleIsValid || handleStatus==='checking'}>
                    {handleStatus==='checking' ? 'Checando…' : 'Checar'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">3–30 caracteres; começa/termina com letra ou número; permite . _ -</p>
                {handleStatus==='invalid' && <p className="text-xs text-red-600" aria-live="polite">Handle inválido</p>}
                {handleStatus==='taken' && <p className="text-xs text-red-600" aria-live="polite">Handle já em uso</p>}
                {handleStatus==='available' && <p className="text-xs text-green-600" aria-live="polite">Disponível</p>}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="displayName">Nome de exibição</Label>
              <Input id="displayName" value={form.displayName} onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))} placeholder="Seu nome" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={form.bio} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} placeholder="Fale um pouco sobre você" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="avatar">Avatar</Label>

              {/* Preview do Avatar */}
              <div className="flex items-start gap-4">
                {form.avatarUrl ? (
                  <img
                    src={form.avatarUrl}
                    alt="Avatar preview"
                    className="h-24 w-24 rounded-full object-cover border-2 border-border"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1 space-y-2">
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                      disabled={uploadingAvatar}
                    >
                      {uploadingAvatar ? 'Enviando...' : 'Upload Avatar'}
                    </Button>

                    {form.avatarUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setForm(p => ({ ...p, avatarUrl: '' }))}
                        disabled={uploadingAvatar}
                      >
                        Remover
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, WebP ou GIF. Máximo 5MB. Recomendado: 400x400px
                  </p>

                  {avatarError && (
                    <p className="text-xs text-destructive">{avatarError}</p>
                  )}
                </div>
              </div>

              {/* Campo opcional de URL manual (avançado) */}
              <details className="mt-2">
                <summary className="text-xs text-muted-foreground cursor-pointer">
                  Ou usar URL externa
                </summary>
                <Input
                  id="avatarUrl"
                  value={form.avatarUrl}
                  onChange={(e) => setForm((p) => ({ ...p, avatarUrl: e.target.value }))}
                  placeholder="https://..."
                  className="mt-2"
                />
              </details>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="banner">Banner / Imagem de Capa</Label>

              {/* Preview do Banner */}
              <div className="space-y-3">
                {form.bannerUrl ? (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden border-2 border-border">
                    <img
                      src={form.bannerUrl}
                      alt="Banner preview"
                      className="w-full h-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => setForm(p => ({ ...p, bannerUrl: '' }))}
                      disabled={uploadingBanner}
                    >
                      Remover
                    </Button>
                  </div>
                ) : (
                  <div className="w-full h-32 rounded-lg bg-muted flex items-center justify-center border-2 border-dashed border-border">
                    <div className="text-center">
                      <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Nenhuma imagem de capa</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <input
                    type="file"
                    id="banner-upload"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleBannerUpload}
                    className="hidden"
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('banner-upload')?.click()}
                    disabled={uploadingBanner}
                  >
                    {uploadingBanner ? 'Enviando...' : 'Upload Banner'}
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    JPG, PNG ou WebP. Máximo 5MB. Recomendado: 1500x500px
                  </p>

                  {bannerError && (
                    <p className="text-xs text-destructive">{bannerError}</p>
                  )}
                </div>

                {/* Campo opcional de URL manual (avançado) */}
                <details className="mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer">
                    Ou usar URL externa
                  </summary>
                  <Input
                    id="bannerUrl"
                    value={form.bannerUrl}
                    onChange={(e) => setForm((p) => ({ ...p, bannerUrl: e.target.value }))}
                    placeholder="https://..."
                    className="mt-2"
                  />
                </details>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600" aria-live="polite">{error}</div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={saving || (isNew && !handleIsValid)}>
                {saving ? 'Salvando…' : (isNew ? 'Criar' : 'Salvar alterações')}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={saving}>Cancelar</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {!isNew && profile?.onChainProfileId && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Identidade Soberana (NFT)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">
                Profile ID (Blockchain)
              </Label>
              <div className="font-mono text-sm mt-1">
                #{profile.onChainProfileId}
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">
                Reputação
              </Label>
              <div className="mt-1">
                <ReputationBadge
                  score={profile.reputationScore ?? 0}
                  tier={profile.reputationTier ?? 'bronze'}
                  size="lg"
                />
              </div>
            </div>

            {badges && badges.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">
                  Badges Conquistados
                </Label>
                <div className="mt-2">
                  <BadgesList badges={badges} />
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              A reputação é calculada automaticamente baseada em suas ações.
              <a href="/docs/reputacao" className="underline ml-1">
                Saiba mais
              </a>
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

