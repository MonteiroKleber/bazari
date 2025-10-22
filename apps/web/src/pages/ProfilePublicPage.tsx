import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit } from 'lucide-react';
import { apiHelpers } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useTranslation } from 'react-i18next';
import { SellerCard } from '@/components/pdp/SellerCard';
import { Badge } from '@/components/ui/badge';
import { API_BASE_URL } from '@/config';
import { ReputationBadge } from '@/components/profile/ReputationBadge';
import { BadgesList } from '@/components/profile/BadgesList';
import { PostCard } from '@/components/social/PostCard';
import { ReputationChart } from '@/components/social/ReputationChart';

type PublicProfile = {
  profile: {
    handle: string;
    displayName: string;
    bio?: string | null;
    avatarUrl?: string | null;
    bannerUrl?: string | null;
    externalLinks?: { label: string; url: string }[] | null;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    onChainProfileId?: string | null;
    reputation?: {
      score: number;
      tier: string;
    };
  };
  badges?: Array<{
    code: string;
    label: { pt: string; en: string; es: string };
    issuedBy: string;
    issuedAt: string;
  }>;
  sellerProfile?: { shopName: string; shopSlug: string } | null;
  counts: { followers: number; following: number; posts: number };
};

export default function ProfilePublicPage() {
  const { handle = '' } = useParams();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PublicProfile | null>(null);
  const [tab, setTab] = useState<'posts' | 'store' | 'followers' | 'following' | 'reputation'>('posts');
  const [posts, setPosts] = useState<any[]>([]);
  const [pinnedPost, setPinnedPost] = useState<any | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [storeItems, setStoreItems] = useState<Array<{ id: string; title: string; priceBzr: string; coverUrl?: string }>>([]);
  const [storeNextCursor, setStoreNextCursor] = useState<string | null>(null);
  const [storeLoading, setStoreLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ handle: string } | null>(null);

  useEffect(() => {
    let active = true;

    // Buscar usuário logado
    (async () => {
      try {
        const res = await apiHelpers.getMeProfile();
        if (active) setCurrentUser(res.profile);
      } catch (e) {
        if (active) setCurrentUser(null);
      }
    })();

    // Buscar perfil público
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await apiHelpers.getPublicProfile(handle);
        if (!active) return;
        setData(res);
        setPinnedPost(res.pinnedPost || null);
        setPosts([]);
        setNextCursor(null);
        setIsFollowing(false);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message ?? 'Erro ao carregar perfil');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [handle]);

  const canFollow = useMemo(() => !!data?.profile && true, [data]);

  async function loadMore() {
    const res = await apiHelpers.getProfilePosts(handle, nextCursor ? { cursor: nextCursor } : undefined);
    console.log('[ProfilePublicPage] Posts received from API:', res.items);
    console.log('[ProfilePublicPage] First post data:', res.items[0]);
    setPosts((p) => [...p, ...res.items]);
    setNextCursor(res.nextCursor ?? null);
  }

  function resolveMediaUrl(u?: string) {
    if (!u) return '';
    try { return new URL(u).toString(); } catch {}
    const base = API_BASE_URL || 'http://localhost:3000';
    return new URL(u.startsWith('/') ? u : `/${u}`, base).toString();
  }

  async function loadStore(cursor?: string) {
    if (!data?.sellerProfile?.shopSlug) return;
    setStoreLoading(true);
    try {
      const res = await apiHelpers.getSellerPublic(data.sellerProfile.shopSlug, cursor ? { cursor } : undefined);
      const products = (res as any)?.catalog?.products ?? [];
      setStoreItems((prev) => cursor ? [...prev, ...products] : products);
      setStoreNextCursor((res as any)?.catalog?.page?.nextCursor ?? null);
    } finally {
      setStoreLoading(false);
    }
  }

  useEffect(() => {
    if (tab === 'posts' && data && posts.length === 0) {
      loadMore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, data]);

  useEffect(() => {
    if (tab === 'store' && data?.sellerProfile?.shopSlug && storeItems.length === 0 && !storeLoading) {
      loadStore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, data?.sellerProfile?.shopSlug]);

  async function onFollowToggle() {
    if (!data) return;
    try {
      if (!isFollowing) {
        setIsFollowing(true);
        const r = await apiHelpers.follow(data.profile.handle);
        setData((d) => d ? { ...d, counts: { ...d.counts, followers: r.counts.target.followers } } : d);
      } else {
        setIsFollowing(false);
        const r = await apiHelpers.unfollow(data.profile.handle);
        setData((d) => d ? { ...d, counts: { ...d.counts, followers: r.counts.target.followers } } : d);
      }
    } catch (e) {
      // Reverter em caso de erro
      setIsFollowing((v) => !v);
    }
  }

  if (loading) return <div className="container mx-auto p-6">{t('profile.loading')}</div>;
  if (error) return <div className="container mx-auto p-6 text-red-600">{error}</div>;
  if (!data) return null;

  const p = data.profile;
  const isOwnProfile = currentUser?.handle === p.handle;

  return (
    <div className="container mx-auto px-4 py-0">
      {/* Breadcrumb Navigation */}
      <div className="py-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/app/feed" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar ao Feed</span>
            <span className="sm:hidden">Feed</span>
          </Link>
        </Button>
        {isOwnProfile && (
          <Button variant="outline" size="sm" asChild>
            <Link to="/app/profile/edit" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              <span className="hidden sm:inline">Editar Perfil</span>
              <span className="sm:hidden">Editar</span>
            </Link>
          </Button>
        )}
      </div>

      {/* Banner Section */}
      {p.bannerUrl ? (
        <div className="relative w-full h-48 md:h-64 -mx-4 md:mx-0 md:rounded-lg overflow-hidden bg-muted">
          <img
            src={p.bannerUrl}
            alt={`${p.displayName} banner`}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="relative w-full h-48 md:h-64 -mx-4 md:mx-0 md:rounded-lg bg-gradient-to-br from-primary/20 to-primary/5" />
      )}

      {/* Profile Header - Sobreposto ao banner */}
      <div className="relative -mt-12 md:-mt-16 px-4 md:px-6">
        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
          {/* Avatar com borda branca para destacar sobre o banner */}
          <div className="relative">
            {p.avatarUrl ? (
              <img
                src={p.avatarUrl}
                alt={p.displayName}
                className="h-24 w-24 md:h-32 md:w-32 rounded-full object-cover border-4 border-background shadow-lg"
              />
            ) : (
              <div className="h-24 w-24 md:h-32 md:w-32 rounded-full bg-muted border-4 border-background shadow-lg" />
            )}
          </div>

          {/* Info Section */}
          <div className="flex-1 md:mb-2">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold">{p.displayName}</h1>
                <p className="text-muted-foreground">@{p.handle}</p>
              </div>

              {canFollow && (
                <Button onClick={onFollowToggle} aria-live="polite">
                  {isFollowing ? 'Deixar de seguir' : 'Seguir'}
                </Button>
              )}
            </div>

            {p.bio && <p className="mt-3 max-w-2xl">{p.bio}</p>}

            {Array.isArray(p.externalLinks) && p.externalLinks.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-3">
                {p.externalLinks.map((l, idx) => (
                  <a
                    key={idx}
                    className="text-primary underline underline-offset-4 text-sm"
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Counters */}
      <div className="mb-6 text-sm text-muted-foreground flex gap-6" aria-live="polite">
        <span><strong className="text-foreground">{data.counts.followers}</strong> {t('profile.followers')}</span>
        <span><strong className="text-foreground">{data.counts.following}</strong> {t('profile.following')}</span>
        <span><strong className="text-foreground">{data.counts.posts}</strong> {t('profile.posts')}</span>
      </div>

      {/* Reputação e Badges */}
      {data.profile.onChainProfileId && (
        <Card className="mb-6 bg-muted/30">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  Reputação
                </div>
                <ReputationBadge
                  score={data.profile.reputation?.score ?? 0}
                  tier={data.profile.reputation?.tier ?? 'bronze'}
                  size="lg"
                />
              </div>

              {data.badges && data.badges.length > 0 && (
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-1">
                    Badges
                  </div>
                  <BadgesList badges={data.badges} limit={5} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-3 border-b border-border mb-4">
        {(['posts','reputation','store','followers','following'] as const).map((tabKey) => (
          <button key={tabKey} className={`px-3 py-2 -mb-px border-b-2 ${tab===tabKey? 'border-primary text-foreground':'border-transparent text-muted-foreground'}`} onClick={() => setTab(tabKey)}>
            {tabKey === 'posts' && t('profile.posts')}
            {tabKey === 'reputation' && 'Reputação'}
            {tabKey === 'store' && t('profile.store')}
            {tabKey === 'followers' && t('profile.followers')}
            {tabKey === 'following' && t('profile.following')}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'posts' && (
        <div className="space-y-3">
          {/* Post Fixado */}
          {pinnedPost && (
            <PostCard
              key={`pinned-${pinnedPost.id}`}
              post={{
                id: pinnedPost.id,
                author: {
                  handle: data?.profile.handle || handle,
                  displayName: data?.profile.displayName || handle,
                  avatarUrl: data?.profile.avatarUrl,
                },
                content: pinnedPost.content,
                kind: pinnedPost.kind,
                media: pinnedPost.media,
                createdAt: pinnedPost.createdAt,
                likesCount: pinnedPost.likesCount,
                commentsCount: pinnedPost.commentsCount,
                repostsCount: pinnedPost.repostsCount,
                isLiked: pinnedPost.isLiked || false,
                isReposted: pinnedPost.isReposted || false,
                reactions: pinnedPost.reactions,
                userReaction: pinnedPost.userReaction,
                isPinned: true,
              }}
              currentUserHandle={currentUser?.handle}
              onPinned={(pinned) => {
                if (!pinned) setPinnedPost(null);
              }}
            />
          )}

          {/* Posts normais */}
          {posts.map((post) => {
            const postData = {
              id: post.id,
              author: post.author || {
                handle: data?.profile.handle || handle,
                displayName: data?.profile.displayName || handle,
                avatarUrl: data?.profile.avatarUrl,
              },
              content: post.content,
              kind: (post as any).kind,
              media: post.media,
              createdAt: post.createdAt,
              likesCount: post.likesCount,
              commentsCount: post.commentsCount,
              repostsCount: post.repostsCount,
              isLiked: (post as any).isLiked || false,
              isReposted: (post as any).isReposted || false,
              reactions: (post as any).reactions,
              userReaction: (post as any).userReaction,
              repostedBy: (post as any).repostedBy,
              repostedAt: (post as any).repostedAt,
            };
            console.log(`[ProfilePublicPage] PostCard data for ${post.id}:`, {
              isLiked: postData.isLiked,
              isReposted: postData.isReposted,
              reactions: postData.reactions,
              userReaction: postData.userReaction,
              likesCount: postData.likesCount,
              repostsCount: postData.repostsCount,
            });
            return (
              <PostCard
                key={post.id}
                post={postData}
                currentUserHandle={currentUser?.handle}
                onDeleted={() => {
                  setPosts(prev => prev.filter(p => p.id !== post.id));
                }}
                onUpdated={(updatedPost) => {
                  setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
                }}
                onPinned={(pinned) => {
                  if (pinned) {
                    window.location.reload();
                  }
                }}
              />
            );
          })}
          {nextCursor ? (
            <Button variant="outline" onClick={loadMore}>{t('profile.seeMore')}</Button>
          ) : posts.length === 0 && !pinnedPost ? (
            <div className="text-muted-foreground">{t('profile.noPosts')}</div>
          ) : null}
        </div>
      )}

      {tab === 'reputation' && data?.profile.handle && (
        <ReputationChart handle={data.profile.handle} />
      )}

      {tab === 'store' && (
        <div className="space-y-6">
          {/* Se houver várias lojas, listar todas com link */}
          {Array.isArray((data as any).sellerProfiles) && (data as any).sellerProfiles.length > 1 ? (
            <div className="space-y-4">
              {(data as any).sellerProfiles.map((sp: any) => (
                <div key={sp.shopSlug} className="flex items-center justify-between">
                  <SellerCard name={sp.shopName} profilePath={`/seller/${sp.shopSlug}`} handle={p.handle} />
                  <Link to={`/seller/${sp.shopSlug}`} className="shrink-0"><Button variant="outline">Ver tudo</Button></Link>
                </div>
              ))}
            </div>
          ) : (
            // Caso loja única, exibe card + grid de produtos
            <div className="space-y-4">
              {!data.sellerProfile ? (
                <div className="text-muted-foreground">{t('profile.store')}</div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <SellerCard
                      name={data.sellerProfile.shopName}
                      profilePath={`/seller/${data.sellerProfile.shopSlug}`}
                      handle={p.handle}
                    />
                    <Link to={`/seller/${data.sellerProfile.shopSlug}`} className="shrink-0">
                      <Button variant="outline">Ver tudo</Button>
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {storeItems.map((prod) => (
                      <Card key={prod.id} className="overflow-hidden">
                        <Link to={`/app/product/${prod.id}`} className="block">
                          {prod.coverUrl ? (
                            <img src={resolveMediaUrl(prod.coverUrl)} alt={prod.title} loading="lazy" className="w-full aspect-video object-cover bg-muted" />
                          ) : (
                            <div className="aspect-video bg-muted" />
                          )}
                          <CardContent className="p-4">
                            <h3 className="font-semibold mb-2">{prod.title}</h3>
                            {prod.priceBzr && (<div className="text-sm text-muted-foreground">{prod.priceBzr} BZR</div>)}
                            <div className="mt-2"><Badge variant="outline">PUBLISHED</Badge></div>
                          </CardContent>
                        </Link>
                      </Card>
                    ))}
                  </div>
                  {storeNextCursor && (
                    <div className="mt-2">
                      <Button variant="outline" onClick={() => loadStore(storeNextCursor)} disabled={storeLoading}>
                        {storeLoading ? t('profile.loading') : t('profile.seeMore')}
                      </Button>
                    </div>
                  )}
                  {!storeNextCursor && storeItems.length === 0 && (
                    <div className="text-muted-foreground">Nenhum item na loja.</div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'followers' && (
        <FollowersList handle={handle} mode="followers" />
      )}
      {tab === 'following' && (
        <FollowersList handle={handle} mode="following" />
      )}
    </div>
  );
}

function FollowersList({ handle, mode }: { handle: string; mode: 'followers' | 'following' }) {
  const [items, setItems] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  async function loadMore(reset: boolean = false) {
    setLoading(true);
    try {
      const fn = mode === 'followers' ? apiHelpers.getFollowers : apiHelpers.getFollowing;
      const res = await fn(handle, !reset && nextCursor ? { cursor: nextCursor } : undefined);

      if (reset) {
        setItems(res.items);
      } else {
        setItems((p) => [...p, ...res.items]);
      }

      setNextCursor(res.nextCursor ?? null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMore(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle, mode]);

  return (
    <div className="space-y-3">
      {items.map((u) => (
        <div key={u.handle} className="flex items-center gap-3">
          {u.avatarUrl ? (
            <img src={u.avatarUrl} alt={u.displayName} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-muted" />
          )}
          <div>
            <div className="font-medium">{u.displayName}</div>
            <div className="text-sm text-muted-foreground">@{u.handle}</div>
          </div>
        </div>
      ))}
      {nextCursor && (
        <Button variant="outline" onClick={loadMore} disabled={loading}>{loading ? t('profile.loading') : t('profile.seeMore')}</Button>
      )}
      {!nextCursor && items.length === 0 && (
        <div className="text-muted-foreground">{t('profile.none')}</div>
      )}
    </div>
  );
}
