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

const HANDLE_REGEX = /^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])?$/;
const RESERVED = new Set(['admin','support','bazari','root','system','null','undefined']);

type MeProfile = {
  handle: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  externalLinks?: { label: string; url: string }[] | null;
};

export default function ProfileEditPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<{ handle: string; displayName: string; bio: string; avatarUrl: string; bannerUrl: string }>(
    { handle: '', displayName: '', bio: '', avatarUrl: '', bannerUrl: '' }
  );
  const [handleStatus, setHandleStatus] = useState<'idle'|'checking'|'available'|'taken'|'invalid'>('idle');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiHelpers.getMeProfile();
        if (!active) return;
        const p: MeProfile | null = res?.profile ?? null;
        if (p) {
          setForm({
            handle: p.handle ?? '',
            displayName: p.displayName ?? '',
            bio: (p.bio ?? '') as string,
            avatarUrl: (p.avatarUrl ?? '') as string,
            bannerUrl: (p.bannerUrl ?? '') as string,
          });
          setIsNew(false);
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
              <Label htmlFor="avatarUrl">Avatar URL (opcional)</Label>
              <Input id="avatarUrl" value={form.avatarUrl} onChange={(e) => setForm((p) => ({ ...p, avatarUrl: e.target.value }))} placeholder="https://..." />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="bannerUrl">Banner URL (opcional)</Label>
              <Input id="bannerUrl" value={form.bannerUrl} onChange={(e) => setForm((p) => ({ ...p, bannerUrl: e.target.value }))} placeholder="https://..." />
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
    </section>
  );
}

