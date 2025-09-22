import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiHelpers } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

type MeProfile = {
  handle: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  bannerUrl?: string | null;
  externalLinks?: { label: string; url: string }[] | null;
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<MeProfile | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await apiHelpers.getMeProfile();
        if (!active) return;
        setProfile(res.profile ?? null);
      } catch (e: any) {
        if (!active) return;
        // 404 → ainda não tem perfil (onboarding opcional)
        setProfile(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleGoToPublicProfile = () => {
    if (profile?.handle) navigate(`/u/${profile.handle}`);
  };

  return (
    <section className="container mx-auto px-4 py-8">
      <header className="mb-6 flex items-center gap-4">
        {profile?.avatarUrl ? (
          <img src={profile.avatarUrl} alt={profile.displayName} className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="h-14 w-14 rounded-full bg-muted" />
        )}
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando seu perfil…</p>
          ) : profile ? (
            <p className="text-sm text-muted-foreground">{profile.displayName} · @{profile.handle}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Você ainda não criou seu perfil.</p>
          )}
        </div>
        <div className="ml-auto flex gap-2">
          {profile?.handle ? (
            <Button variant="outline" onClick={handleGoToPublicProfile}>Ver meu perfil</Button>
          ) : null}
          <Button variant="secondary" onClick={() => navigate('/app/profile/edit')}>Editar Perfil</Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ModuleCard title="Perfil" description="Gerencie suas informações públicas" actionText="Abrir" to={profile?.handle ? `/u/${profile.handle}` : '/app/profile/edit'} />
        <ModuleCard title="Wallet" description="Acesse sua carteira e tokens" actionText="Abrir" to="/app/wallet" />
        <ModuleCard title="Marketplace" description="Anuncie e compre produtos e serviços" actionText="Procurar" to="/search" />
        <ModuleCard title="DAO" description="Governe e participe de decisões" actionText="Abrir" to="/app/dao" disabled />
        <ModuleCard title="SubDAOs" description="Grupos e comunidades" actionText="Abrir" to="/app/subdaos" disabled />
        <ModuleCard title="DEX" description="Negocie ativos do ecossistema" actionText="Abrir" to="/app/dex" disabled />
        <ModuleCard title="Câmbio P2P" description="Troque BZR diretamente com outros" actionText="Abrir" to="/app/p2p" disabled />
      </div>
    </section>
  );
}

function ModuleCard({ title, description, actionText, to, disabled }: { title: string; description: string; actionText: string; to: string; disabled?: boolean }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground max-w-[70%]">{description}</p>
        {disabled ? (
          <Button variant="outline" disabled>Em breve</Button>
        ) : (
          <Link to={to} className="shrink-0">
            <Button>{actionText}</Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

